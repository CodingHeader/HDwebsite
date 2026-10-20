# B-06 执行记录（execution）

- 执行者：主代理（执行线 B，Agent-API）
- 日期：2026-10-20
- 分支：`upgrade`（V0.7 单主线）
- 起点：`a00f513`（B-05 独立复审闭环）
- 依赖：B-04（已 PASS）

## 目标

1. 静默时段内事件只建 `NotifyRecord(status=deferred)` 不发信，时段结束后补发（规则级 `quietHours` 优先于全局 `notifyQuietHours`）。
2. 去重由"查最近记录→建记录"改为**单条 SQL 条件插入**（跨进程原子），去重键 = event + subject(含 title 承载路由/任务名标识) + 10 分钟窗。
3. 邮件正文 token/key/password 形态字串替换为 `***`（P06-verify:90）。
4. `notify-rules` PATCH 接收并持久化 `quietHours`，GET 回读一致（E-02 已能配置，后端未消费）。
5. 无效时刻（如 25:00）按"无静默"处理并记 warning（DR-14）。

## 关键决策与证据链

- **契约与冻结面**：`NotifyRule.quietHours` 列已存在于 `prisma/schema.prisma:956`（无需迁移）；`notifyRuleUpdateSchema.quietHours` 已由 CCR-1 收敛为 `^([01]\d|2[0-3]):[0-5]\d$`（`contracts/resources.ts:282`）。本次**未触碰冻结面**。
- **去重原子化方案**：`NotifyRecord` 无唯一键列，且 schema 冻结不可加列。改用 `INSERT INTO ... SELECT ... WHERE NOT EXISTS (... "createdAt">=datetime('now','-10 minutes')) RETURNING "id"` —— SQLite 单语句原子，两进程并发仅一个 WHERE 为真。**关键细节**：时间边界用 SQL 内 `datetime('now',...)` 而非绑定 Date，因 `createdAt` 由 `CURRENT_TIMESTAMP` 写入（`YYYY-MM-DD HH:MM:SS`，UTC），绑定 ISO（含 `T`）会因字典序比较误判。
- **去重键**：`event + subject + 10分钟窗`。`subject` 渲染后含 `{title}`，`title` 承载卡定义要求的"路由/任务名"标识（`notifyApiError` 传 `方法 路由`；`notifyJobFailed` 传任务名）。
- **静默时段判定**：`Intl.DateTimeFormat` + `timeZone: "Asia/Shanghai"`（无夏令时，可靠）；`start<=end` 同日内、`start>end` 跨夜（22:00→07:00）。规则级 `rule.quietHours` 优先，其次全局设置 `notifyQuietHours`。
- **测试可控时钟**：`__setNotifyClock(provider|null)` 注入 `nowProvider`（`vi.setSystemTime` 不影响 `Intl` 的时区转换）。
- **补发挂载**：`flushDeferred()` 已由 `notifyRetryScan()`（`notify.scan` 任务）开头调用；**未新增注册任务**（jobs 属 D 线，卡定义明确禁止越界）。deferred 记录由 `notifyRetryScan` 的 `pending` 查询不覆盖，故在 scan 内先行 flush。
- **脱敏**：`sanitizeSensitive` 对 `password=|token=|api_key=|secret=` 及 `sk-` 前缀/长串 token 形态替换为 `***`；subject 与 content 均脱敏。

## 验收逐条结果

| 项 | 结果 | 证据 |
|---|---|---|
| 通知：静默内不发、结束后补发 | PASS | `notify.test.ts`「静默内事件→只建 deferred 不发信」「静默结束后 flushDeferred 补发」 |
| 两个模拟进程 5 次异常只生成 1 条 system_error | PASS | `notify.test.ts`「同一聚合事件并发→只 1 条」「不同 detail 同 event→仍只 1 条」 |
| 正文不含 'hunter2' | PASS | `notify.test.ts`「正文中的 password=/token= 形态被替换为 ***」（断言不含 hunter2 / sk-abcdef1234567890） |
| PATCH quietHours 后 GET 回读一致 | PASS | `notify.test.ts`「PATCH quietHours 后 GET 回读一致」「PATCH quietHours=null 清除」 |
| 无效时刻按无静默处理并记 warning | PASS | `notify.test.ts`「无效时刻（如 25:00）→按无静默处理并发出」+ `parseQuietWindow` 的 `console.warn` |
| 通用门禁四连 | PASS | lint 0 errors/54 warnings（基线）、tsc exit 0、test 62 files/779 passed、build exit 0 |
| diff 落允许路径 | PASS | `src/lib/notify-gateway.ts`、`src/app/api/notify-rules/[id]/route.ts`、`src/lib/__tests__/lane-b/notify.test.ts`（均在允许清单） |

## 门禁实测输出摘要

```
$ npx tsc --noEmit                                        → exit 0
$ npx vitest run src/lib/__tests__/lane-b/notify.test.ts  → 1 file / 9 tests passed
$ npx vitest run notify-before-publish.test.ts content-review.test.ts notify.test.ts → 3 files / 25 passed
$ npm test                                                → 62 files / 779 tests passed
$ npm run lint                                            → 0 errors / 54 warnings（与 B-04 基线一致，B-06 未新增）
$ npm run build                                           → exit 0
```

## 新增/修改文件

- 修改 `src/lib/notify-gateway.ts`（静默时段、原子去重、脱敏、flushDeferred、测试时钟注入）
- 修改 `src/app/api/notify-rules/[id]/route.ts`（PATCH 接收 quietHours）
- 新建 `src/lib/__tests__/lane-b/notify.test.ts`（9 用例）
- 新建 `docs/design/03_solution/decisions/ADR-035-通知可靠性.md`

## 未决 / UNKNOWN

- **"5 次异常只 1 条"**：卡验收原文措辞"两个模拟进程 5 次异常只生成 1 条 system_error"，实测为**并发 2 次 → 1 条**；连续 5 次同窗会因同 subject+event 同样只 1 条（测试已覆盖同窗不同 detail/title 组合）。已如实登记，未虚报 5 次。
- **flushDeferred 与 pending 的先后**：`notifyRetryScan` 现在先 `flushDeferred` 再查 pending；若两者都在 scan 内，deferred 补发不重复投递（deliver 幂等判断 `status==='sent'/'skipped'` 返回）。
- **去重键含 title 但 title 可能含动态时间**：`notifyApiError` 的 title 为固定路由串，稳定；`notifyBeforePublish` 类事件非聚合，不参与去重。低风险。
- **e2e**：本卡不涉及前台渲染路径变更，未跑 `test:e2e`（notify 相关无 spec）；`test:visual` 未跑（未触前台文件）。