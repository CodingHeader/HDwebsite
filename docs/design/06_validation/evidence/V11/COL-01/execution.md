# V11-COL-01 执行证据（2026-10-24）

## 5W1H 简版

- **What**：① 调度锁从「一次性硬 TTL」改为「持锁心跳续期」；② `runSource` 增加同源运行互斥（手动连点 / 手动与调度并发）；③ 手动「立即执行」失败接入 collect_failed 告警。
- **Why**：V1.1 审计 §采集.1/2——锁 TTL 10 分钟 < 单批上限 30 分钟，长批次执行中锁被当作僵死释放，扫描窗口内重复并发启动；手动执行入口零互斥；手动失败无告警（调度路径有）。
- **Where**：`src/lib/scheduler.ts`、`src/lib/collect-engine.ts`、`src/app/api/collect-sources/[id]/run/route.ts`、`src/lib/jobs/index.ts`（越界 1 处，见下）、`src/lib/__tests__/v11-col-01.test.ts`（新）、`src/lib/__tests__/lane-d/collect.test.ts`（mock 适配）。
- **How**：心跳每 `LOCK_HEARTBEAT_MS=60s` 续写 `lockedAt`（updateMany 带 `lockedAt not null` 守卫，放锁后的迟到心跳不会重新上锁）；`LOCK_STALE_MINUTES=10` 语义由「硬 TTL」变为「10 分钟无心跳视为僵死」——与 schema 注释「心跳锁：超 10 分钟视为僵死自动释放」对齐（原实现从未真正心跳）。互斥以 DB 为准：`collectTask` 中存在未过「批次上限 30min + 宽限 5min」的 running 任务即抛 `SourceBusyError`。

## 现状盘点（代码为准）

- `src/lib/scheduler.ts`：`LOCK_STALE_MINUTES=10` 硬 TTL；抢锁时一次性写 `lockedAt`，运行期无任何续期；`scanOnce` 每轮先 `releaseStaleLocks`。
- `src/lib/collect-engine.ts:29`：`COLLECT_BATCH_TIMEOUT_MS=30min`；且 collect.run 批内多源串行，总时长可远超 30 分钟——10 分钟锁必然中途「过期」。
- 手动执行入口 `/api/collect-sources/[id]/run` 直接调 `runSource`，无任何互斥；`scheduler.execute()` 无 UI/API 调用者（仅 notify-gateway 内部使用）。
- run 路由 catch 仅返回 502，不触发告警；`notifyCollectFailed(sourceName, errMsg)` 在 notify-gateway.ts:460 已存在（只读复用，未改 notify-gateway）。
- 调度路径（jobs/index.ts collect.run handler）失败即 `notifyCollectFailed`；手动与调度并发时若不处理 busy，调度侧将误报采集失败。

## 改动清单

| 文件 | 改动 |
|---|---|
| src/lib/scheduler.ts | +`LOCK_HEARTBEAT_MS=60s`、`withHeartbeat()`（心跳续期，finally 清理）；`execute`/`scanOnce` 的 handler 调用包进心跳；注释更新（本卡允许路径 `src/lib/scheduler*`） |
| src/lib/collect-engine.ts | +`SourceBusyError`、`COLLECT_RUN_MUTEX_GRACE_MS=5min`；`runSource` 第一动作查同源未过期 running 任务，命中即抛 busy（不创建新批次） |
| src/app/api/collect-sources/[id]/run/route.ts | busy → 409（不告警）；其他失败 → 动态 import `notifyCollectFailed`（与调度路径同口径）+ 502 |
| src/lib/jobs/index.ts | **越界说明**：catch 中 `if (err instanceof SourceBusyError) continue;`——该文件是 runSource 的调度调用方，同源被手动占用时应跳过而非误报 collect_failed；改动 2 行（import + continue），属「手动执行并发保护」目标的组成部分 |
| src/lib/__tests__/lane-d/collect.test.ts | prisma mock 增加 `collectTask.findFirst`（默认 null 放行）；无断言放松 |
| src/lib/__tests__/v11-col-01.test.ts | 新增 11 断言（见下） |

**互斥残余竞态（记录）**：findFirst 与 create 之间非原子（schema 冻结无法加约束），窗口为毫秒级；单进程部署 + SQLite 写串行下可接受。崩溃遗留 running 任务由 35 分钟宽限期兜底自动放行。

## 验收逐条结果

| 条目 | 结果 | 证据 |
|---|---|---|
| 单批 30 分钟内不会被重复调度 | **PASS** | 测试「扫描启动的长任务 25 分钟」：fake timers 推进 25min（> 旧 TTL 10min），心跳将 lockedAt 保持在 start+23min 之后，第二轮 `scanOnce` 不再拉起 handler（调用数=1）；结束后放锁、lastRunAt 推进 |
| 手动连点不产生并发执行 | **PASS** | 测试「同源已有未过宽限期的 running 任务 → SourceBusyError」且 `collectTask.create` 未被调用；路由 busy → 409；调度路径 busy → continue 不告警 |
| 失败有告警记录 | **PASS** | 测试「执行失败 → collect_failed 告警 + 502」：`notifyCollectFailed("告警源","HTTP 503")` 恰好 1 次；busy/成功用例不告警 |
| 崩溃遗留锁仍能自动释放（回归） | **PASS** | lockedAt 置 11 分钟前 → scanOnce 回收并正常执行 |
| 手动入口互斥（CronJob 级）回归 | **PASS** | lockedAt 非空时 `execute` 仍抛「正在执行中」 |

## 验证命令输出摘录

```
$ npx vitest run src/lib/__tests__/v11-col-01.test.ts
 Test Files  1 passed (1)
      Tests  11 passed (11)

$ npx vitest run src/lib/__tests__   （卡面门禁）
 Test Files  78 passed (78)
      Tests  855 passed (855)
```

回归：lane-d/collect、collect-autokb、scheduler-cron、v11-sec04 共 4 文件 29 断言全绿（含 D-12 批次超时 31 分钟用例，mock 适配后无回归）。

## 已知边界 / UNKNOWN

- 满载抖动（与本卡无关的预存量）：`npx vitest run`（含 tests/contract）在本机高并发 worker 下，lane-b/publish-throttle、lane-c/kb-api 偶发超时失败；已用 stash 对照在**不含本卡任何改动**的工作树上复现同类失败（llm-03/sec03 亦有），确认非本卡引入。卡面门禁命令 `npx vitest run src/lib/__tests__` 干净环境两次全绿。
- 并发残余竞态如上（毫秒级窗口，无 schema 变更前提下不可消除）。
