# V9-T-05 独立验证报告（V9-V-01）

- 验证者：子代理（与执行者上下文隔离；依据 diff 全量审查 + 本机可重跑命令 + CI 日志交叉佐证）
- 验证日期：2026-10-24；代码基线：upgrade@ab1d1e0（验证时 HEAD，含被验提交 bf5afc9）
- 被验提交：bf5afc9（9 文件，+194/−58，全部位于 src/lib/__tests__/**）
- **结论：PASS**

## 逐条验收

| 条目 | 结果 | 证据 |
|---|---|---|
| `npx vitest run` 默认序 1712 passed | PASS | 验证者本机重跑（2026-10-24 01:14）：`Test Files 72 passed (72)`、`Tests 1712 passed (1712)`，exit 0 |
| `npx vitest run --sequence.shuffle` 连续 3 次 1712 passed | PASS | 验证者本机连跑 **4 次**（超出卡要求的 3 次）：run1 `Tests 1712 passed (1712)`；run2 计数行滚出 `tail -4` 窗口但整链 exit 0（vitest 失败必非零退出）；run3 `1712 passed (1712)`；run4 `Test Files 72 passed / Tests 1712 passed` |
| 无新增 skip、无测试删除 | PASS | diff 全量审查：无 `.skip/.only/.todo`；9 文件 `it()` 计数改前=改后（10/8/6/28/9/11/40/10/6），总用例数 1712 前后一致 |

## 允许修改路径核对（含越界披露评估）

- 提交 bf5afc9 的 9 个文件全部 ⊆ 卡允许路径 `src/lib/__tests__/**`，**无越界**。
- 冻结面未触碰：`vitest.config.ts` 不在提交内；`src/` 非 `__tests__` 路径未改；未触契约/迁移/依赖。
- 范围偏差披露（均不越界、不构成 FAIL）：
  - 卡"输入"清单中的 `sqlite-busy-timeout` 未被改动（执行者 shuffle 复跑中该文件未复现失败；验收以三条标准为准，输入清单是诊断性并集）。
  - 卡清单外另改 4 文件（lane-b/notify、lane-b/routes-admin、lane-d/collect、notify-before-publish），均在允许路径 `src/lib/__tests__/**` 内，属 shuffle 下暴露的同类顺序耦合。

## diff 审查（断言强度专项）

逐文件确认全部改动为"用例自包含化"，无断言放松：

1. **content-review.test.ts**（主代理先改后并入本提交）：3 例改为自建稿（`prisma.contentItem.create`），不再共享 `itemId`；操作日志断言 `toBe(1)` → `toBe(before + 1)`（增量式，等价且更抗序）。
2. **block-registry.test.ts**：`upsert` home 模板 + `templateBlock.deleteMany` 自清状态；回落用例改 try/finally 复位。
3. **collect-autokb.test.ts**：反查与队列断言限定在本源 items 的 id 范围内（每范围内仍 `toBe(2)`/`toEqual` 精确断言）；C-08 与"远端适配器"两例自建源/库并预清队列状态（pending/failed → synced），显式重注册 coze backend。
4. **api-contract/p03-endpoints.test.ts**：新增 `seedChatHistory()`/`seedMedia()` 自包含 arrange（含用例前 `deleteMany`），campus 图片用例自建图片再 PUT/DELETE；28 例计数不变。
5. **lane-b/notify.test.ts**：静默窗 + 时钟改 try/finally 清理；"补发"用例自建 deferred 记录；"脱敏"用例显式清 quietHours。
6. **lane-b/publish-throttle.test.ts**：`beforeEach` 复位共享 item 为 approved（原依赖前序用例复位）。
7. **lane-b/routes-admin.test.ts**：users/wechat/articles 三处 DELETE/PUT 改为操作本用例自建行，保护共享 fixture。
8. **lane-d/collect.test.ts**：`fetchText` 改注入 fixture（与同文件 getParser 用例同模式），不再依赖共享 server handler。
9. **notify-before-publish.test.ts**：`toBe(1)` → 差值断言 `toBe(before)`（"不新增记录"，语义等价更强）。

## 命令输出摘录

```text
$ npx vitest run                        # 默认序
 Test Files  72 passed (72)
      Tests  1712 passed (1712)         Duration 16.09s   exit 0

$ npx vitest run --sequence.shuffle     # ×4 连跑
run1: Tests  1712 passed (1712)  (17.08s)
run2: (整链 exit 0)
run3: Tests  1712 passed (1712)  (16.14s)
run4: Test Files 72 passed (72) / Tests 1712 passed (1712)

$ git show bf5afc9 | grep -E "^\+.*\.(skip|only|todo)\(|^-.*it\("   # 空
$ 各文件 it() 计数 before=after（详见上表）
```

## 备注

- **执行证据缺失（待执行者补）**：验证开始时 `evidence/V9/T-05/` 目录不存在，bf5afc9 亦未包含 execution.md（卡"输出"要求该路径）。本 verify.md 为该目录首个文件；建议执行者按 AGENTS §8 补 execution.md（5W1H + 改动清单）。验收三条标准已由验证者独立复现，技术结论不受影响。
- 关联的 V8-SEC-03 verify.md 复审（PASS）由另一验证者负责，不在本报告范围。
- 交叉佐证：CI run 39990249476（head a455143）gate job（Linux）Unit tests 步 `Tests 1712 passed (1712)`——修复在 Linux 下同样成立。
- bf5afc9 与 a455143 均为 HEAD（ab1d1e0）祖先，验证针对现行代码有效。
