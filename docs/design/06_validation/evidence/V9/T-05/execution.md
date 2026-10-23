# V9-T-05 执行证据（2026-10-24）

## 5W1H 简版

- **What**：全量单测的文件内顺序耦合自包含化，使默认序与 `--sequence.shuffle` 同样全绿（V8-SEC-03 验收"shuffle 结果一致"返工）。
- **Why**：V9-V-01 B 组验证者独立复现 shuffle 失败（两次运行失败集合不同；`npx vitest@3.2.7` 对照证明先于 V8 存在）；执行者在 V8-SEC-03 时声称的"shuffle 一致"实际只覆盖契约套件，未覆盖全量套件。
- **Where**：`src/lib/__tests__/**` 共 9 文件（content-review 由主代理修复，其余 8 文件由修复子代理完成）。
- **Who**：主代理 + 测试修复子代理；B 组验证者复核。
- **When**：2026-10-23 深夜 ~ 10-24。
- **How**：每文件定位"前例建状态、后例断言"的共享可变夹具 → 用例内自建唯一夹具 + 查询按本源 id 收窄；不改断言强度、不删用例、不加 skip、不动 vitest.config.ts（冻结面）。

## 改动文件（9）

1. `content-review.test.ts`（主代理）：守门用例自建 pending 稿；切换用例自建 draft 稿；再审用例自建 approved 稿；审批日志断言改增量式（before+1）。
2. `collect-autokb.test.ts`：C-08 落位断言按本用例 items 收窄；mock Coze 用例自建双库源并重注册适配器（前例 `registerKbRemoteAdapter(null)` 会注销）；远端适配器用例自建 failed/pending 组。
3. `block-registry.test.ts`：resolveHomeBlocks 4 用例各自保证模板前置（upsert home 模板 + 清空 TemplateBlock / deleteMany）；停用用例 try/finally 复位。
4. `api-contract/p03-endpoints.test.ts`：chat-history 用例 seedChatHistory 自建；media/batch 自建媒体行；campus 跨校区 404 自建图片（parseId 拒 0）。
5. `lane-b/notify.test.ts`：静默时段 3 用例 + 脱敏用例显式设置 quietHours/注入时钟，finally 复位；补发用例自建 deferred 记录（根因：午夜真实时刻落在前例遗留静默窗内）。
6. `lane-b/routes-admin.test.ts`：3 个 DELETE + 1 个 PUT 改操作自建行，共享行不被删改。
7. `lane-b/publish-throttle.test.ts`：beforeEach 复位共享 contentItem 为 approved。
8. `lane-d/collect.test.ts`：fetchHtmlDetails 的 fetchText 注入 fixture，消除对共享 HTTP server handler 的依赖。
9. `notify-before-publish.test.ts`：preNotify=false 用例改前后差值断言。

## 验收逐条结果

| 条目 | 结果 | 证据 |
|---|---|---|
| 默认序 1712 passed | **PASS** | `npx vitest run`：72 files / 1712 tests 全 passed（执行者与验证者各自独立重跑一致） |
| shuffle 连续 3 次 1712 passed | **PASS** | 修复过程累计 9 轮 shuffle；最后连续 3 轮全绿；验证者复审另跑 4 轮全绿 |
| 无新增 skip、无测试删除 | **PASS** | 验证者逐文件核对 it() 数改前=改后（1712 不变）；grep 无新增 skip |
| 不触冻结面 | **PASS** | diff 全部 ⊆ src/lib/__tests__/**；vitest.config.ts / src 业务代码零改动 |

## 复现命令

```bash
npx vitest run && npx vitest run --sequence.shuffle && npx vitest run --sequence.shuffle && npx vitest run --sequence.shuffle
git show bf5afc9 --stat
```

## 备注

- 观察清单中的 `sqlite-busy-timeout.test.ts` 在所有 shuffle 轮次中未复现失败（疑似时序 flake 而非顺序耦合），未改动；如后续复现再单独立卡。
- 验证报告：`evidence/V9/T-05/verify.md`（PASS，含 4 轮 shuffle 记录）。
