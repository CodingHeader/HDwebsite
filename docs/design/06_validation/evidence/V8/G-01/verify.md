# V8-G-01 独立验证报告（V9-V-01）
- 验证者：子代理（与执行者上下文隔离；仅依据 diff + 可重跑命令）
- 验证日期：2026-10-23；代码基线：upgrade@f78cc1d
- **结论：PASS**

## 验证对象
- 卡定义：`docs/V0.8-20261022/tasks/V8-G-01.md`；提交 `fb8f039`（docs(V8-G-01)）
- 改动文件（git show --stat）：`AGENTS.md`(+4/−1)、`CLAUDE.md`(+8/−11)、`docs/V0.8-20261022/state.json`(+3/−2)、`docs/design/04_planning/current-plan.md`(+6)、`evidence/V8/G-01/execution.md`(+84)

## 逐条验收
| 验收条目（引自卡定义） | 结果 | 证据（命令输出摘录/文件路径） |
| --- | --- | --- |
| `grep -c 'V0.8-20261022' AGENTS.md ≥ 1` | PASS | 重跑 grep -c：AGENTS.md=**3**、CLAUDE.md=**2**、current-plan.md=**1**（三处均 ≥1） |
| CLAUDE.md 不再含与 AGENTS.md 不同的分支/端口规则 | PASS | 重读 CLAUDE.md 全文（23 行）：仅声明 AGENTS.md 唯一权威 + 「不得在此另立分支/端口/门禁规则」+ V0.8 入口指向 + `@AGENTS.md`；grep 分支/端口仅命中上述禁止性表述与「upgrade 分支上的入口指引」描述句，无任何自立规则。原 5 条「使用说明」（含 V7 证据路径冲突条）已删除（见 fb8f039 diff −11 行） |
| 门禁全绿 | PASS | 本机重跑：`npm run lint` exit 0（--max-warnings 0）、`npm run check:root` PASS（根目录 51 条全白名单）、`npm run check:assets` PASS；typecheck/test/build 引用 2026-10-23 HEAD=f78cc1d 全量结果（tsc 通过、1712 单测、build 通过），未单独重跑 |

## Execution Steps 核对
| 步骤 | 结果 | 证据 |
| --- | --- | --- |
| 1. AGENTS.md 读取顺序换 V0.8 + 新增连续执行协议行 | 完成 | fb8f039 diff：§1 第 2/3 条改指 `docs/V0.8-20261022/`；新增 3.1「执行者按 04-连续执行协议.md 循环取卡…同卡连续 2 次 FAIL 熔断…仅剩外部条件卡才允许停」；V0.7/V0.6/current-plan 保留为「仅供追溯」 |
| 2. CLAUDE.md 冲突段删除，只留指向 AGENTS.md | 完成 | diff：删 5 条「使用说明」，改为薄壳 + `@AGENTS.md` |
| 3. current-plan.md 顶部追加 V0.8 入口小节 | 完成 | diff：新增「### 2026-10-22 V0.8 入口（V8-G-01，有约束力）」3 行，并声明下方 V0.7 终态与 P0~P15 章节仅为历史追溯 |

## 允许修改路径核对
- 卡允许：`AGENTS.md`、`CLAUDE.md`、`docs/design/04_planning/current-plan.md` —— 三文件改动均在范围内。
- `evidence/V8/G-01/execution.md`：卡「证据路径」条目指定目录，合规。
- **越界披露**：`docs/V0.8-20261022/state.json`（status ready→done + note，+3/−2）。判定为合理越界：① 最小改动且不触冻结面（冻结面=contracts/prisma/package/lock/vitest/Playwright 配置）；② 连续执行协议 §1 步骤 7 明确要求通过后写 `status=done`，§3 授权认领者改自己卡的 status；③ 卡片「允许修改」清单未含此文件、execution.md 亦未单列说明 —— 已在本报告登记。另注意协议 §3 建议 state 修改「单独提交（chore(state)）」，本卡将其并入卡提交，属过程瑕疵，不影响验收内容。
- 禁止修改（docs/V0.7-20261019/**、他卡路径）：未触碰。

## 未重跑/受限项
- `npm run typecheck` / `npm test` / `npm run build` 未单独重跑，引用 2026-10-23 HEAD=f78cc1d 全量门禁结果（本卡仅改 3 个 markdown 文档，不触代码路径）。

## 备注
- execution.md 自述的两条遗留（AGENTS §4 编排/冻结面段仍引用 V0.7 路径作历史归档位置；CLAUDE.md 极简化）与 diff 一致，属有意保留，不构成验收冲突。
- 三处入口现均指向 V0.8，`state.json` 被执行者读写链路（协议 §1 步骤 2/4/7）已在 3.1 条落实，卡目标「state.json 可被执行者读写」成立。
