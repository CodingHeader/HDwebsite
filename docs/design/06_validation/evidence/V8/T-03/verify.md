# V8-T-03 独立验证报告（V9-V-01）

- 验证者：子代理（与执行者上下文隔离；仅依据 diff + 可重跑命令）
- 验证日期：2026-10-23；代码基线：upgrade@fad1924
- 被验提交：6d4c53a（fix(V8-T-03): lint warning 58→0 并锁死 --max-warnings 0）
- **结论：PASS**（附 findings：3 个文件在卡允许路径之外，见路径核对）

## 逐条验收

| 验收条目（引自卡定义） | 结果 | 证据 |
| --- | --- | --- |
| npm run lint exit 0 且输出无 warning | PASS | 验证者亲跑：`npm run lint` → `eslint --max-warnings 0`，**exit 0、零输出**；`grep -n "max-warnings" package.json` → 第 12 行 `"lint": "eslint --max-warnings 0"` |
| 门禁全绿 | PASS | 验证者亲跑：lint exit 0；`npm test` → **1712 passed / 72 files**（与执行证据一致）。tsc/build 未重跑，引用今日 HEAD=fad1924 门禁记录（tsc 0 / build 0） |
| diff 中无业务逻辑变化（独立验证者抽查） | PASS | 验证者逐文件抽查 diff：`src/app/(web)/*` 5 个前台文件均为死代码删除（未用 import/局部函数 `resolveSceneCode`、`schoolShortName`）或类型内联（HOME_BLOCK_ORDER 常量→联合类型，语义等价、无 JSX/className 变化）；api routes 为未用 import/解构参数删除；`manager-fetch.ts` 仅加注释+定点 eslint-disable；`collect-engine.ts`/`wechat.ts` 为 import 删除与失效 disable 注释删除；`scripts/*.mjs` 为未用 import 删除。**未发现任何行为变化** |

## 允许修改路径核对

卡允许：`eslint.config.mjs`、`package.json#scripts.lint`、`src/**/*.ts`、`src/**/*.tsx`。实改 33 文件中：

| 文件 | 判定 |
| --- | --- |
| eslint.config.mjs（+35：no-unused-vars `_` 前缀约定、ArticleContent.tsx 单文件豁免） | 允许 |
| package.json（仅 scripts.lint 一行） | 允许（且为卡输出明确授权项；冻结面对 package.json 的 CCR 要求由卡定义本身满足） |
| src/**/*.ts(x) 共 24 个 | 允许 |
| docs/V0.8-20261022/state.json | 协议状态文件，按协议口径豁免 |
| docs/design/06_validation/evidence/V8/T-03/** | 允许（卡 §证据路径） |
| **scripts/check-root.mjs（删未用 import `join`）** | **越界 ①**：不在允许路径；执行证据未点名该文件。改动为 1 行未用 import 删除，inert，无冻结面/他卡所有权冲突 |
| **scripts/measure-baseline.mjs（删未用 import `os`）** | **越界 ②**：同上，1 行 inert |
| **tests/e2e/e-kb-manage.spec.ts（+115：3 个空壳测试改写为真实断言）** | **越界 ③**：不在允许路径；但执行证据 §3.1 已写明文件与理由（空壳测试=变相 skip），属 AGENTS.md「越界须在证据中写明文件与理由」的合规越界；test-only，无冻结面冲突（T-01 所有权为 e-knowledge/e-notify-rules.spec，不含本文件） |

3 项越界均不触碰冻结面（contracts/schema/迁移/依赖/vitest/playwright 配置零改动——已用 `git show --stat` 核对），不落入任何他卡所有权路径，判定为 findings 而非 FAIL（依据 V7-UI-01 verify 先例：登记并说明理由的越界可判定通过；①② 未在证据中点名，记为流程瑕疵）。

## 未重跑/受限项

- `npm run build`、`npx tsc --noEmit`、`check:audit` 未由验证者重跑（build 耗时超预算）；引用今日 HEAD=fad1924 门禁记录（全过）。lint 与全量单测为验证者独立重跑。
- e-kb-manage 3 个改写后的 e2e 用例未重跑（需起服务，属全量 e2e 范围）；其断言逻辑经 diff 审阅确认非空壳。

## 备注

1. 顺带修复的 3 个空壳测试超出卡范围但是净收益（与 V8-T-01 撤 skip 同性质问题的收尾）；建议后续同类收尾放独立卡或提前在卡定义中扩权。
2. 两处定点豁免（`ArticleContent.tsx` 原生 `<img>`、`manager-fetch.ts` 整页跳转）diff 中均带理由注释，审阅认可。
3. 执行证据与重跑结果无冲突。
