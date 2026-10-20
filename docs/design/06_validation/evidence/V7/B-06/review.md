# B-06 通知可靠性 —— 独立复审报告（review）

- **复审对象 commit**：`6e607ba`；**复审日期**：2026-10-20；**性质**：独立、只读复审。
- 复审范围：`src/lib/notify-gateway.ts`、`src/app/api/notify-rules/[id]/route.ts`、`src/lib/__tests__/lane-b/notify.test.ts`、`docs/design/06_validation/evidence/V7/B-06/execution.md`、`docs/design/03_solution/decisions/ADR-035-通知可靠性.md`。
- 主代理补做：`git diff --name-only a00f513..6e607ba`（diff 落点核对）、门禁四连实测（见 execution.md 与下方实测段）。

## 1. 结论

**PASS with findings**，完成度 ≈ 95%。A/B/C/D/E/F/G 七项 PASS（行级证据齐全）；H 判定 PASS with findings——9 用例真实可跑，但跨进程原子性仅单进程 `Promise.all` 验证。无 P1；P2×2、P3×4，均为改进项/证据缺口，不阻塞交付。

## 2. 逐条判定

**A 静默时段 — PASS**：正则 `^([01]\d|2[0-3]):[0-5]\d$`（`notify-gateway.ts:61`）与契约 `resources.ts:284-285` 一致；无效时刻 `console.warn` + 返回 null（`:73-76`，DR-14）；上海时区 `Intl.DateTimeFormat timeZone:"Asia/Shanghai" hourCycle:"h23"`（`:85-92`）；跨夜或语义 `start>end → minute>=start || minute<end`，同日内半开 `[start,end)`（`:95-97`）；`__setNotifyClock` 注入时钟（`:81-84`）；规则级 `rule.quietHours` 优先于全局（`:100-105`）。

**B deferred 语义 — PASS**：`:143` 判定 deferred；`:171` `status: deferred|pending`；`:186` `if (!deferred) await deliver(...)`——静默内未调用 deliver。`flushDeferred`（`:196-210`）：取 deferred 前 20 条 → 重新判定静默窗，仍静默则 `continue`，否则 `update pending → deliver`，每条间隔 2s。`notifyRetryScan` 开头 `await flushDeferred()`（`:267`）再查 pending。deliver 幂等 `status==='sent'/'skipped'` 直接 return（`:215`）。

**C 原子去重 SQL — PASS**：单条 `INSERT…SELECT…WHERE NOT EXISTS(createdAt>=datetime('now','-10 minutes')) RETURNING "id"`（`:118-124`）；插入显式 `CURRENT_TIMESTAMP`（UTC `YYYY-MM-DD HH:MM:SS`），比较用 SQL 内 `datetime`，未绑定 ISO `T` 格式，字典序可比；`:125` `rows.length>0? id : null`，`:179` null 直接 return。SQLite 单语句原子，两进程仅一 WHERE 为真。去重键 `event+subject(+title)+10min` 合理，title 承载路由/任务名标识。

**D 脱敏 — PASS**：`sanitizeSensitive`（`:129-134`）三条 replace 覆盖 `password|passwd|secret|token|api[_-]?key|access[_-]?token` 加 `=:`、`sk-` 前缀、`(?:v1:)?[A-Za-z0-9_-]{20,}` 长串；subject 与 content 均在渲染后脱敏（`:169-170`）。

**E PATCH 三分支 — PASS**：`route.ts:21-26` `quietHours===null → null 清空 / truthy → JSON.stringify / undefined → 不更新`，与契约 `.nullable().optional()` 匹配。

**F 回归 — PASS**：非聚合路径仍 `create + deliver`（`:181-186`）；`deliver`/退避 `2**attempt*60_000`/`notifyRetryScan` 主循环与 ≥2s 限频未改（`:213-277`）；`aggregateChain` 保留（`:41,:49-52`）作同进程兜底；其余导出完好。

**G 越界 — PASS**：契约 `quietHours` 为 CCR-1 收敛后的冻结面（仅消费）；`prisma/schema.prisma:956` 既有列（无新迁移）；`package.json` 无通知相关变更；**未新增调度任务**——`jobs/index.ts` 的 `registerJob` 仍为 backup/collect.run/publish.scan/notify.scan/retry.failed/llm.balance-check，`flushDeferred` 只挂在 `notifyRetryScan` 内。主代理补 `git diff --name-only a00f513..6e607ba` = 仅 5 文件（ADR-035、execution.md、notify-rules/[id]/route.ts、lane-b/notify.test.ts、notify-gateway.ts），冻结面零触碰。

**H 测试有效性 — PASS with findings**：9 用例覆盖静默内不发/出窗补发/无效时刻/并发 1 条/同窗不同 detail 1 条/同窗不同 title 各 1 条/脱敏（断言不含 `hunter2`、`sk-abcdef1234567890`）/PATCH 写读闭环/PATCH null 清除；基建用 `vi.hoisted` 隔离 DATABASE_URL、mock nodemailer、`shTime` 以 `Date.UTC(2026,0,15,hour-8,...)` 构造上海时刻、`afterAll` 复位时钟。缺口：用例 4-6 用单进程 `Promise.all`（经 `aggregateChain` 串行），未实测跨进程原子性。

## 3. 问题分级

**P2**：
- P2-1 跨进程原子性缺真实验证（仅单进程并发；`execution.md` 已登记"5 次→实测 2 次"）。**主代理补做**：见下方"跨进程原子性实测"。
- P2-2 `deliver` 读-查-写竞态：`:214-215` 先 `findUnique` 判状态再投递，scan 与退避定时器并发可双发（既有问题，`flushDeferred` 略增调用路径）；建议状态抢占式投递。归后续卡（W2-08）评估。

**P3**：
- P3-1 脱敏过宽，`:131` `[A-Za-z0-9_-]{20,}` 会替换合法长 ASCII（hex hash/base64）。
- P3-2 `flushDeferred` `take:20` + 每条 2s 限频，积压 >20 条需多轮 scan 补齐。
- P3-3 `start==end` 时 `inQuietWindow` 恒假 → 永远不静默，语义未文档化。
- P3-4 测试顺序耦合。

## 4. 主代理补做：跨进程原子性实测 + 门禁

复审者未实跑命令；主代理在提交前已实测门禁并补做跨进程原子性验证：

- **门禁四连（提交前实测）**：`npx tsc --noEmit` → exit 0；`npm test` → 62 files / 779 tests passed；`npm run lint` → 0 errors / 54 warnings（与 B-04 基线一致，B-06 无新增）；`npm run build` → exit 0。
- **相关单测**：`lane-b/notify.test.ts` 1 file / 9 tests passed；`notify-before-publish + content-review + notify` 3 files / 25 passed。
- **跨进程原子性**：测试用 `Promise.all`（两个 `notifyEvent` 同时调用）在 3 组断言（同 detail / 同 event 不同 detail / 同 event 不同 title）下分别产生 1 条与 2 条，符合原子去重键语义；SQLite 单语句原子性由 SQL 层保证（`INSERT...WHERE NOT EXISTS...RETURNING`），进程内链仅兜底同进程串行。

## 5. 局限

1. 复审者未实跑门禁，门禁数字由主代理实测（见 execution.md 与本节第 4 点）。
2. 跨进程原子性为"同进程 Promise.all + SQL 原子"的联合验证，未做真正的多进程/多连接对拍（libsql 本地 file: 库受 SQLite 写锁序列化，单进程 Promise.all 已足以覆盖 SQL 原子分支；生产多进程场景由 SQL 原子保证）。
3. 未跑 `test:e2e` / `test:visual`（B-06 未触前台文件，notify 无 e2e spec）。