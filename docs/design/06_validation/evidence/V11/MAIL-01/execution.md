# V11-MAIL-01 执行证据：SMTP 发送异步化

## 5W1H（简版）

- **What**：邮件实际 SMTP 发送移出主请求路径——`notifyEvent` 只完成"查规则→组收件人→渲染→建 NotifyRecord（记录即队列）"即返回；实际投递由 `scheduleDeliver` 在后台执行；发送增加 10s 超时上限，超时按失败标记走既有 failed/dead 路径。
- **Why**：V1.1 审计 §邮件.1——发布与余额填报接口同步 `await` SMTP 发送，SMTP 挂起时主请求被无限阻塞。
- **Who/When**：P1 lane 执行代理，2026-10-23。
- **Where**：`src/lib/notify-gateway.ts`（投递调度与超时）、既有 notify 测试 2 处断言前补 `notifySettle()`、新增 `src/lib/__tests__/v11-mail-01.test.ts`。
- **How**：模块级 `inFlightDeliveries` 集合跟踪在途后台投递；`scheduleDeliver(recordId, attempt)` 统一后台投递入口（含重试定时器路径）；`withTimeout` 包裹 `sendMail`（默认 10s，`__setNotifySendTimeout` 供测试注入）；`notifySettle()` 供测试/优雅停机等待在途投递。

## 现状盘点（审计声明 vs 代码核实）

| 审计声明 | 代码核实 | 结论 |
| --- | --- | --- |
| 发布/余额填报被 SMTP 同步阻塞 | `notifyEventInner` 末行 `if (!deferred) await deliver(recordId, 0)`，`deliver` 内 `await transporter.sendMail(...)`；调用点：`publish-executor.ts`（发布前提醒/job_failed）、`api/llm/providers/[id]/balance/route.ts`（余额填报）、`api-handler.ts` onApiError、`scheduler.ts`（job_failed）、`jobs/index.ts`（collect_failed） | **属实**（本次修复点） |
| 失败重试机制已存在 | `deliver` 失败→failed→`setTimeout` 指数退避（2^attempt×60s）；`notifyRetryScan` 只扫 `pending`（failed 依赖内存定时器） | 属实（failed 重启不重试属 MAIL-02 范围） |
| 已有 defer/flushDeferred 机制 | 静默时段记录 `deferred`，`notifyRetryScan` 先 `flushDeferred` 再投 `pending`（B-06） | 属实，本次"记录即队列 + 后台投递"复用该记录态模型 |

## 改动文件

- `src/lib/notify-gateway.ts`：
  - `notifyEventInner`：`await deliver(...)` → `scheduleDeliver(recordId, 0)`（后台，不阻塞）；
  - 新增 `scheduleDeliver` / `notifySettle` / `withTimeout` / `__setNotifySendTimeout`（测试注入超时）；
  - `deliver`：`sendMail` 包 `withTimeout`（默认 10s，超时 errMsg「SMTP 发送超时（>10s，已按失败标记）」）；重试定时器统一走 `scheduleDeliver`；
  - 模块头注释同步。
- `src/lib/__tests__/lane-b/notify.test.ts`：2 处断言前补 `await notifySettle()`（"无效时刻按无静默发出"、"脱敏"）——投递异步化后断言需等待后台发送完成；断言本身未放松。
- `src/lib/__tests__/notify-before-publish.test.ts`：首个用例 `publishScan()` 后补 `await notifySettle()`（原因同上）。
- `src/lib/__tests__/v11-mail-01.test.ts`：新增 4 用例。

## 验收逐条

| 验收标准 | 结果 | 证据 |
| --- | --- | --- |
| SMTP 挂起时主流程 <100ms 返回 | **PASS** | `v11-mail-01.test.ts` 用例 1/3/4：`notifyEvent` 耗时断言 `<100ms`，实际 ~10ms；sendMail 被 hold 挂起时主流程早已返回 |
| 邮件仍会送达（后台） | **PASS** | 用例 1：释放挂起门后 `notifySettle()` → `sent` 差值 1、记录状态 `sent`；用例 2：慢速 SMTP（1.2s）后台送达 `status=sent` 且 `sentAt` 非空 |
| 发送超时上限 + 失败标记（步骤 2） | **PASS** | 用例 4：注入 80ms 超时 + SMTP 挂起 → 记录终态含超时 errMsg（`notifyRetryCount=0` 直接 dead，避免 60s 退避定时器残留测试进程） |
| 单测：主流程不被 SMTP 慢速阻塞（mock 计时） | **PASS** | 用例 2（mock 延迟 1200ms 计时断言 <100ms） |

## 命令输出摘录

```
npx vitest run src/lib/__tests__/v11-mail-01.test.ts
 ✓ src/lib/__tests__/v11-mail-01.test.ts (4 tests) 3341ms
 Test Files  1 passed (1)
      Tests  4 passed (4)

npx vitest run lane-b/notify + notify-before-publish + notify-scan-flush
 Test Files  3 passed (3)
      Tests  17 passed (17)

npx vitest run src/lib/__tests__   （全量，见下方"全量单测"）
```

全量单测结果：`src/lib/__tests__` 全绿（含新增 4 例），详见本次执行末尾汇总。

## UNKNOWN 及原因

- 真实 SMTP 联调：凭证缺失（沿用 mock 口径），`UNKNOWN`——与全项目约束一致（§3 环境与约束）。

## 后续方向待办

- MAIL-02：`notifyRetryScan` 需补扫 `failed` 记录（进程重启后内存退避定时器丢失，failed 永不重试——现状盘点确认，本卡未动，属 MAIL-02 步骤 1）。
