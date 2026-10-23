# V8-PERF-01 独立验证报告（V9-V-01）
- 验证者：子代理（与执行者上下文隔离；仅依据 diff + 可重跑命令）
- 验证日期：2026-10-23；代码基线：upgrade@f78cc1d
- **结论：PASS**

## 验证对象
- 卡定义：`docs/V0.8-20261022/tasks/V8-PERF-01.md`；提交 `079ada2`（零代码改动卡）
- 改动文件（git show --stat）：`docs/V0.8-20261022/state.json`(+3/−2)、`evidence/V8/PERF-01/execution.md`(+107)。**无任何代码改动**，与执行证据「本卡未做任何代码改动」一致。

## 逐条验收
| 验收条目（引自卡定义） | 结果 | 证据（命令输出摘录/文件路径） |
| --- | --- | --- |
| V8-Q3=B：/manager/articles ≤372,724 B | PASS | **验证者独立复测**（非引用执行者数字）：用 execution.md §3.1 的静态产物法在 HEAD=f78cc1d 的 `.next` 构建产物上重算 → chunks=14，articlesGzipTotal=**284,125 B** ≤ 372,724。执行者三次静态法 + 实际 HTTP 法交叉均为 284,100；二者差 25 B（0.009%，源于构建时点不同——我的复测额外覆盖了其后 UI-01 对 articles/page.tsx 的改动，即 SEC-01 verify.md 提出的漂移疑点），不改变结论 |
| 共享 chunk 较基线 −10%（W2-04 同口径） | PASS | 基线 372,724 B 为 W2-04 独立复算值（`evidence/V7/W2-04/bundle-reduction.md:10,143`），且 V8-Q3 裁决（`08-风险与待裁决.md:9`）明文「改为『不高于 372,724 B，且共享 chunk −10%』，测量口径沿用 W2-04」→ −10% 针对 372,724 口径成立。实测 (372,724−284,125)/372,724 = **−23.8%** ≥ 10% |
| 门禁 + e2e 全绿 | PASS | 门禁：本机重跑 lint exit 0 / check:root PASS / check:assets PASS；tsc、1712 单测、build 引用 2026-10-23 HEAD=f78cc1d 全量结果（未单独重跑）。e2e：卡验证命令不含 test:e2e；仓库口径中 e2e 由 CI gate job 每次 push 强制执行（`.github/workflows/ci.yml:102` `npm run test:e2e`）；本卡零代码改动未触碰任何被测路径，未单独复跑（见受限项） |
| sanitizeRichContent 仍被默认调用（grep + 单测） | PASS | grep 复核：`src/components/manager/form-utils.ts:111` `sanitize: (html: string) => string = sanitizeRichContent`（默认参数即默认注入）；`src/components/manager/SchemaForm.tsx:285` 显式传入 `sanitizeRichContent`。单测：`npx vitest run src/lib/__tests__/markdown.test.ts` 重跑 → **10 passed**。本卡零改动，安全层未动 |

## 收益归因核对（零改动卡的成立前提）
- execution.md 归因：收益全部来自前置卡 V8-SEC-01（`next` 16.2.1→16.4.2 + 移除 `cssChunking:false` 恢复按需 chunking）。核对其前提：SEC-01 确为 PERF-01 的依赖卡（卡定义 Depends on：V8-SEC-01）且先期完成；我的复测在含 SEC-01 改动的 HEAD 上得到同量级数字（284,125 vs 284,100），归因链自洽。
- 卡定义的验证命令 `node scripts/measure-baseline.mjs --route /manager/articles --runs 3` 中 `--route/--runs` 参数确实不存在（`scripts/measure-baseline.mjs:16` 用法仅 `--out <path.json>`）——执行证据已如实登记该卡定义缺陷并改用等价自建测量（静态产物法 + HTTP 法），复现命令已给出，我按其命令成功复现。
- 「每个手段单独提交并测量 3 次」步骤：因无代码改动而不适用；测量仍做了 3 次静态法 + 1 次 HTTP 交叉。

## 允许修改路径核对
- 卡允许：`next.config.ts`、`src/components/manager/**`、`src/app/manager/**`、`evidence/V8/PERF-01/**`。本卡未改任何代码路径（放弃改动本身在允许范围内）。
- **越界披露**：`state.json`（status done + note）——同 G-01 报告的判定：协议 §1 步骤 7 / §3 授权，最小、不触冻结面；未并入单独 chore(state) 提交，过程瑕疵已登记。
- 禁止修改（prisma/migrations、schema、contracts、docs/V0.7-20261019/**、他卡路径）：未触碰。

## 未重跑/受限项
- `npm run typecheck` / `npm test` / `npm run build` 未单独重跑（引用 HEAD=f78cc1d 全量结果；`.next` 产物即该次 build 留存，我的复测基于它）。
- e2e 未复跑：以 CI gate（ci.yml:102）为准；本卡零代码改动，e2e 行为面不变。
- 实际 HTTP 法（起服务抓真实 chunk）未复现，静态产物法与执行者的 HTTP 法在同基线上已互证一致。

## 备注
- 卡标题目标「/manager 共享 chunk 再减」在 V8-Q3=B 口径下已达成且余量大（−23.8% vs −10%，绝对余量约 88.6 KB）；execution.md §4 的剩余体积构成（最大块为 React DOM 框架下限）与「不为改而改」的零改动决策合理。
- 遗留「SEC-01 移除 cssChunking:false 后 CSS 顺序未在 Linux 验证」已正确指向 VIS-02/VIS-03，不属本卡验收范围。
