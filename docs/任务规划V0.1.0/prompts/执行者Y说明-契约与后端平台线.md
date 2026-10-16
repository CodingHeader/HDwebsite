# 执行者 Y 说明：契约与后端平台线（2 名执行者模式，2026-10-13 用户裁决 D11=2）

> 把本文件与下面列出的提示词一起交给执行者 Y。本文件只规定**顺序、分支、交叉验证职责**；具体内容、验收与禁止事项以对应提示词和任务卡为准。

## 你负责什么

| 阶段 | 你做什么 | 依据 |
| --- | --- | --- |
| Wave 0（约 5 人天） | 担任**契约员**，在 upgrade 上串行完成 W0-01~W0-08；每张卡交 X 独立验证；W0-08 由 X 判 PASS 后打 tag `w1-base` 并**推送 upgrade 与 tag**（D8 已裁决） | `prompts/提示词-W0-契约员.md` |
| Wave 1 第一段 | B 线（API 与响应平台）B-01 → B-02/B-04 → B-03/B-05/B-06 | `prompts/提示词-B-API与响应平台.md` |
| Wave 1 第二段 | C 线（AI 与知识库）C-01 → C-02/C-03 → C-04/C-05 → C-06/C-07/C-08 → C-09 | `prompts/提示词-C-AI与知识库.md` |
| Wave 1 第三段 | D 线（运维）D-01 → D-02 → D-03 → D-04/D-05/D-06/D-07/D-08 → D-09 → D-10/D-11/D-12 | `prompts/提示词-D-运维性能配置存储资源.md` |
| 交叉验证 | X 每完成一个工作包，你按《提示词-独立验证者》验收（你不验收自己的）；W2-07 终审由你做独立验证 | `prompts/提示词-独立验证者.md` |
| Wave 2 | 执行 X 派发给“D 线负责人”的 W2-03（依赖收口）、W2-04（性能复测），以及 X 委派的 W2-09 | `tasks/W2-0*.md` |

## 分支与提交

```bash
git fetch --tags && git checkout -b lane/backend w1-base   # B、C、D 都在这一条分支上，按顺序提交
```
- 提示词里的 `lane/b-api-platform`、`lane/c-ai-kb`、`lane/d-ops` 一律换成 `lane/backend`。
- **D-01 的基线必须在 w1-base 上测**：执行 D-01 时先 `git stash`/新开 worktree 检出 `w1-base` 测 before.json，避免 B、C 的改动混进基线。
- 只推送 `lane/backend`。
- 越界检查口径：`git log --first-parent --no-merges --name-only --format= w1-base..HEAD | sort -u` 必须全部落在 **B 线 ∪ C 线 ∪ D 线** 所有权内（`07-所有权矩阵.md`）。

## 计划（gen.py 资源约束调度，计划人天）

Wave 0 第 0~5 天 → Wave 1 约第 5~29.5 天完成 B+C+D（24.5 人天）→ Wave 2 配合 X。整个项目计划约 **36.5 人天**。

## 不变的纪律

前台视觉门禁 46/46、冻结面只读（Wave 0 结束后你对 `src/contracts/**`、迁移、依赖的写权限收回）、契约变更请求、熔断、安全铁律（凭据由用户在本机配置，你不接触、不搜索、不打印）——全部以各提示词为准。
