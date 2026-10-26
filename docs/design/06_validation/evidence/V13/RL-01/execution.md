# V13-RL-01 执行证据：限流单源化 + 设置驱动（用户裁决 10 次/分钟）

> 执行时间：2026-10-27
> 执行者：main-agent
> 起点：`upgrade@772dea8`
> 裁决依据：用户 2026-10-26 明确裁决「每分钟 10 次」

## 5W1H 简版

- **What**：消除 `/api/chat/stream` 硬编码限频与 `llm/guard.ts` 设置驱动限频"双源并存"，把限流收敛为单一数值来源，并把默认值锁定为用户裁决的 10 次/分钟。
- **Why**：双源导致 ①后台「客服限流」设置对官网通道完全无效（配置失真）②阈值/粒度两套口径，实际生效阈值取决于谁先触发 ③`REQ-F-009:38`（10）与 `ADR-034`（20）MUST 冲突未决。
- **Where**：`src/app/api/chat/stream/route.ts`、`src/lib/llm/guard.ts`、`src/lib/settings-registry.ts`、`src/lib/__tests__/settings-registry.test.ts`。
- **Who**：main-agent（限流架构收敛属核心项）。
- **How**：删除硬编码常量，IP 兜底改为读取同一设置键；默认值三处同步为 10；新增 6 条契约测试钉住"单一来源 + 设置真实生效"。
- **What if**：若保留双源，用户改后台设置仍不生效，且裁决后要改两处逻辑而非一个数字。

## 一、修改前（缺陷）

| 通道 | 位置 | 阈值 | 粒度 | 可配置 |
|---|---|---|---|---|
| A | `stream/route.ts:22`、`:74-78` | 硬编码 `10` | 按 IP（查 `AIChatHistory`） | ❌ |
| B | `guard.ts:27`、`:149-153` | 默认 `20` | `scene:identifier` 滑窗 | ✅ |

- `settings-registry.ts:162` 默认 `"20"`，被 `settings-registry.test.ts:49` 钉住 → 与 `REQ-F-009:38`（10）冲突。

## 二、修改内容

### 2.1 `src/lib/llm/guard.ts`

```diff
-export const GUARD_DEFAULT_RATE_LIMIT = 20;
+export const GUARD_DEFAULT_RATE_LIMIT = 10;   // 用户裁决 10 次/分钟
```

新增（IP 兜底**复用同一设置值**，不引入独立阈值）：

```ts
export function ipCapFor(rateLimitPerMin: number): number {
  return rateLimitPerMin > 0 ? rateLimitPerMin : 0;
}
export function isIpCapped(count: number, rateLimitPerMin: number): boolean { ... }
export async function checkIpCap(input: { countInWindow: number; settings?: ChatGuardSettings }) { ... }
```

### 2.2 `src/app/api/chat/stream/route.ts`

- 删除 `const RATE_LIMIT_PER_MINUTE = 10;`
- IP 计数段改为读设置 + `checkIpCap`，**且仅在能取到 IP 时启用**：

```ts
if (ip) {
  const guardSettings = await loadChatGuardSettings();
  if (guardSettings.rateLimitPerMin > 0) {
    const recentIpHits = await prisma.aIChatHistory.count({ ... });
    const ipVerdict = await checkIpCap({ countInWindow: recentIpHits, settings: guardSettings });
    if (ipVerdict.type === "rate") return tooManyRequests();
  }
}
```

**为什么加 `if (ip)` 守卫（本轮实测踩到并修正）**：`clientIp()` 在无 `x-forwarded-for` / `x-real-ip` 时返回 `null`。
不守卫会有两个真实缺陷：①所有访客挤进同一个空桶 → 变成全站共享配额；②`ipAddress: null` 会命中所有历史空 IP 记录，跨时间累积误判。
该守卫在首轮实现时遗漏，导致 `chat-stream-sse` 与 `chat-guard` 共 5 个用例失败（见 §四），已修正。

### 2.3 `src/lib/settings-registry.ts` / `settings-registry.test.ts`

```diff
-  def("chatGuardRateLimitPerMin", ..., "20", ...)
+  def("chatGuardRateLimitPerMin", ..., "10", ...)   // 附裁决注释

-  expect(rateLimit?.defaultValue).toBe("20");
+  expect(rateLimit?.defaultValue).toBe("10");       // V13-Q2-01：用户裁决 10
```

## 三、验收结果

| 验收条目 | 结果 | 证据 |
|---|---|---|
| 全仓仅一处限流判定（无硬编码常量） | **PASS** | `grep -rn "RATE_LIMIT_PER_MINUTE" src/` → 仅剩 2 处注释，无代码常量 |
| 默认值三处一致为 10 | **PASS** | `guard.ts:30` / `settings-registry.ts:164` / `settings-registry.test.ts:49` |
| 改设置 → IP 通道真实生效 | **PASS** | `v13-rl-01.test.ts`「设置 2 次/分 → 第 3 次 429」 |
| 会话级限频仍由同一键驱动 | **PASS** | `v13-rl-01.test.ts`「同一会话超阈值 → 429，网关调用 2 次」 |
| 不同 IP 互不影响 | **PASS** | `v13-rl-01.test.ts`「不同 IP 隔离」 |
| 单测全绿 | **PASS** | **91 文件 / 1859 用例**（基线 90/1853 + 本卡 1 文件 6 用例） |
| lint（--max-warnings 0） | **PASS** | exit 0 |
| typecheck | **PASS** | exit 0 |
| build | **PASS** | BUILD_ID 00:06:36 |
| e2e | **PASS 79/79** | `npm run test:e2e`（新构建，2.3m） |

## 四、过程中的真实回归（已修正，如实记录）

首版实现未加 `if (ip)` 守卫，全量单测出现 **5 个失败**：

| 失败用例 | 现象 | 根因 |
|---|---|---|
| `chat-stream-sse.test.ts` 正常流 / 上游失败 / 流中途失败（3 例） | `expected 500 to be 200/502` | 契约测试只 mock 了 `prisma.aIChatHistory`，未 mock `prisma.setting`；新增的 `loadChatGuardSettings()` 抛错 → 500 |
| `chat-guard.test.ts` 敏感词 / 限频（2 例） | `expected 429 to be 200` | 请求无 IP 头 → `ip=null` → 所有用例挤进同一空桶，累计超限 |

修正方式：IP 兜底仅在 `ip` 非空时启用（语义正确，而非改测试绕过）。
修正后该 3 文件 **23/23 PASS**，全量 **1859 PASS**。

> 这一节保留的原因：它是"测试通过 ≠ 实现正确"的反例——若当时选择放宽测试 mock 或调大阈值，会把真实的全站共享配额缺陷带进生产。

## 五、影响与边界

- 后台「客服限流（次/分钟）」现在对**官网 + 公众号两侧同时生效**（此前对官网无效）。
- 严格程度与旧实现一致（IP 也是 10 次/分），未放宽。
- 无 IP 环境（本地直连、部分反向代理未透传）退化为"仅会话级限频"，属可接受降级，已在代码注释说明。
- 未改契约、未改迁移、未改依赖。

## 六、UNKNOWN

| 项 | 原因 |
|---|---|
| 多实例部署下限频是否跨进程一致 | 现状为进程内滑窗（`guard.ts` 注释已明示），水平扩展需共享存储；`REQ-C-003` 禁止引入 Redis，故本轮不处理 |
| 真实 NAT 环境下的误伤程度 | 无真实现网流量可测；阈值与旧实现一致，不会比之前更严 |
