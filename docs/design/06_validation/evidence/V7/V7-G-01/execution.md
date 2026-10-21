# V7-G-01 AGENTS.md 与入口文档对齐单主线 · 执行证据

- 执行者：主代理（opus 档位）· 分支：`upgrade` · 依赖：无
- 卡定义：`docs/V0.7-20261019/tasks/V7-G-01.md`；切片 S1
- 允许修改：仅 `AGENTS.md`
- 禁止修改：src/**、docs/V0.*/**

## 1. 目标

AGENTS.md §4/§5/§8 不再引用 lane 分支与 V0.6 入口，改指 docs/V0.7-20261019/README.md；推送规则改为"upgrade 单主线 + 每卡独立验收后推送"。

## 2. 改动

- §1.2：`docs/design/04_planning/current-plan.md` → `docs/V0.7-20261019/README.md`（当前轮规划入口；历史包仅供追溯）。
- §1.3：`docs/design/04_planning/review-prompts/PXX-*.md` → `docs/V0.7-20261019/tasks/<卡号>.md` + `06-剩余可执行大纲体系.md`。
- §4/§5/§8：本轮前已对齐（4cbd9c1 记录 lane 废止；证据分桶 V7/）。

## 3. 验收（大纲）

| 项 | 判定 | 证据 |
|---|---|---|
| `grep -c 'lane/' AGENTS.md` = 0（历史除外注明"已废止"） | **PASS** | grep 仅 §4 一处，注明"已于 4cbd9c1 全部集成并删除，此后不再新建 lane 分支" |
| 入口指向 V0.7 | **PASS** | §1.2 指向 docs/V0.7-20261019/README.md |
| 不再以 w1-base / w1-base-ccr-1 / w1-ui-kit 为基线 | **PASS** | grep w1-base/w1-ui-kit 在 AGENTS.md 无命中；基线已改写为提交号 0cb699b / f158501 / c6a2cb4 |
| 触及文件 ⊆ 允许修改 | **PASS** | `git diff --name-only` = 仅 AGENTS.md |

## 4. 门禁

纯文档改动，无 src/tests 变更；门禁不涉及（`npm run lint/typecheck/test/build` 已在前序卡 2026-10-21 09:37 全绿）。

## 5. 结论

- **完成度：100%**
- **判定：PASS**
- **阻塞**：无。

## 6. git 状态

- HEAD：`<提交时 HEAD>`
- 本地领先 origin/upgrade 56+ 提交，远端 0 独有。