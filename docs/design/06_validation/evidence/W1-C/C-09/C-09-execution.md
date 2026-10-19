# C-09-execution.md —— LLM dailyQuota / rateLimit 生效，全部超限返回 503

> 执行线 C · 分支 `lane/c-ai-kb` · 起点 `736bc56`（C-07 完成）
> 状态：**已实现 + 本卡门禁 PASS**（子智能体独立验收见 §3；命令级证据见 §4）

## 1. 交付内容

新增/修改（全部落在 C-09 允许修改路径内 + 任务卡 Execution Step 1 明确要求写入的 ADR）：

| 文件 | 说明 |
|---|---|
| `src/lib/llm/limits.ts` | **新增**（纯函数，不 import prisma / 适配器）：`usageDate`（Asia/Shanghai 日界）、`isDailyQuotaExceeded`、`isRateLimited`/`recentRateCalls`/`recordRateCall`（进程内 60 秒滑动窗口）、`__setClock`/`__now`（可注入时钟） |
| `src/lib/llm-gateway.ts` | 新增 `quotaSkipReason`；`gatewayChat`/`gatewayChatStream` 调度前检查；`GatewayResult` 与流式返回增 `status?: 502 \| 503`；`recordUsage`/`failureCount`/`dailyCalls` 日期改用 `usageDate()`（D4 日界修正） |
| `src/app/api/chat/stream/route.ts` | `routed.status === 503 → serviceUnavailable(errMsg)`；否则维持 502 `error(...)` |
| `src/lib/__tests__/lane-c/llm-limits.test.ts` | **新增** 16 例（见 §2） |
| `docs/design/03_solution/decisions/ADR-029-*.md` | Execution Step 1 明示"日界口径写入 ADR-029"：新增 §1.5（配额/限频与日界口径）+ §2 D4 偏差（UTC → Asia/Shanghai） |

**未修改**（保持 B 线/他线所有权）：`chat-service.ts`、`wechat.ts`、`prisma/schema.prisma`、`src/contracts/**`、`package.json`、`vitest.config.ts`、前台冻结面。

### 1.1 独立验证整改（第一轮 UNKNOWN → 修复项）

独立验证子智能体指出 3 项可改进，已整改并补测试：

| # | 问题 | 整改 |
|---|---|---|
| R1 | `isDailyQuotaExceeded` 导入未使用（lint/typecheck 风险） | 删除导入，`quotaSkipReason` 直接 `dailyCalls(provider.id) >= quota` |
| R2 | `providers.length === 0` 误返回 503（与"全部超配额"混淆） | 改为 `502`；503 专指配额/限频用尽 |
| R3 | `recordRateCall` 在熔断判断**之前**调用 → 被熔断跳过的供应商也占滑窗名额 | 熔断先判，放行才 `recordRateCall`；新增用例断言 `recentRateCalls === 0` |

同时补充测试：默认路由（不传 `preferredProviderIds`）下全部 active 供应商被跳过 → 503；空供应商表 → 502。

## 2. 关键设计决策与测试

### 2.1 日界口径：Asia/Shanghai（UTC+8）

原实现 `llm-gateway.ts:79/95` 用 `new Date().toISOString().slice(0,10)` —— UTC 日期。运维后台按"今天"看用量时，UTC 16:00 后（北京次日）会被算到前一天，配额在跨日时不准确。C-09 统一为 Asia/Shanghai：

```ts
export function usageDate(nowMs: number = __now()): string {
  const d = new Date(nowMs + 8 * 3_600_000);
  return d.toISOString().slice(0, 10);
}
```

- UTC 15:59 = 北京 23:59 → 当日；UTC 16:00 = 北京次日 00:00 → 次日（**测试**：`usageDate(Date.UTC(2026,9,17,15,59,59)) === "2026-10-17"`；`usageDate(Date.UTC(2026,9,17,16,0,0)) === "2026-10-18"`）。
- 影响既有熔断统计：`recordUsage`/`failureCount`/`dailyCalls` 全部走 `usageDate()`，与配额同口径（任务卡升级条件要求"两者同口径并在 ADR 记录"）。登记为 ADR-029 §2 D4。

### 2.2 配额满跳过（DB 口径，跨进程一致）

`dailyCalls(providerId)` 查 `LLMUsage.calls`（当日，`date = usageDate()`）；`isDailyQuotaExceeded(calls, dailyQuota)` 判定。`quotaSkipReason` 返回中文原因；跳过不记失败、不计费（`LLMUsage.calls` 不因跳过而增加）。**测试**：配额满的 A 被跳过、落到 B；`errMsg` 含 `已达上限`；A 的 calls 保持 5（未 +1）。

### 2.3 进程内 60 秒滑动窗口 rateLimit

`recordRateCall(providerId, at)` 入窗；`isRateLimited` 在 `recentRateCalls >= rateLimit` 时命中。**测试**：连续 3 次后第 4 次调用被跳过（503）；60 秒后窗口滑出（重新放行）。**边界**：`rateLimit ≤ 0` 视为不限制（防御契约 `min(1)` 被绕过）；`dailyQuota ≤ 0` 同理。

### 2.4 全部超限 → 503；尝试过但失败 → 502

`gatewayChat`/`gatewayChatStream` 用 `attemptedAny` 区分：
- 所有供应商都被配额/限频跳过（`attemptedAny === false`）→ `status: 503`
- 至少尝试了一个供应商但上游失败（或熔断跳过）→ `status: 502`

`/api/chat/stream/route.ts` 据此返回 `serviceUnavailable(errMsg)`（HTTP 503 + code 503，ADR-028）或 `error(..., 502)`。**测试**（端点级）：`res.status === 503`、`json.code === 503`、`message` 含 `已达上限`。

### 2.5 北京时间 00:00 重置

**测试**：今日满额 → 503；`advanceMs` 越过北京午夜（UTC 16:00）→ `usageDate()` 切到次日 → 该供应商 `calls` 归零口径 → 放行 → 因无真实 API Key 返回 502（而非 503），`errMsg` 不含 `已达上限`。

### 2.6 DR-23 契约

`/api/chat/stream/route.ts` 维持 `chatRequestSchema` 引用，未新增内联 `z.object`（**测试**：源码不含 `z.object`）。

## 3. 子智能体独立验收

（由执行线在提交后调独立验证子智能体，只看 diff + 运行结果给出 PASS/FAIL/UNKNOWN。结果见独立验证输出。）

## 4. 门禁与命令证据

```bash
# 本卡验证命令（exit 0）
npx vitest run src/lib/__tests__/lane-c/llm-limits.test.ts     # 16 passed
# 通用门禁 4 项（全部 exit 0）
npm run lint        # 0 errors（24 warnings 为基线噪音，未新增 error）
npm run typecheck   # tsc --noEmit 无输出
npm test            # 31 files / 447 tests passed
npm run build       # 产物含 /api/chat/stream
```

## 5. UNKNOWN / 待办

- **进程内滑窗的局限**：任务卡明示"进程内"，跨进程（多实例/无状态容器）时各实例独立计数，配额仍由 DB `LLMUsage.calls` 兜底（跨进程一致）。生产多实例部署需在 W2 评估是否引入共享计数（Redis 被 REQ-C-003 禁止，需单独 ADR）。
- **test:e2e / test:visual**：Windows 本机 `next.config.ts:7` 有意关闭 standalone（D16 裁决），e2e/visual 需 Linux/Docker 容器，标 UNKNOWN（与 C-07/A 线同口径）。
- **真实联调**：无外网环境，适配器 stub 覆盖逻辑；真实供应商返回 429 时 `rateLimit` 的"供应商侧限频"与本地滑窗的关系需真实联调确认（本地滑窗先拦截，供应商 429 记入 `recordUsage(failure)` 但不额外加重本地窗口）。

## 6. 提交

- `feat(C-09): ...` 实现 + `docs(C-09): ...` 执行证据；`git push lane/c-ai-kb`。