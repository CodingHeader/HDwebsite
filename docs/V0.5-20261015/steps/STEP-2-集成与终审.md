# STEP-2-集成与终审

- 执行线：Wave 2 集成与终审　分支：`upgrade（集成者）`　所有者：Agent-Guard/集成者
- 下发提示词：`prompts/提示词-W2-集成与终审.md`
- 并行关系：必须最后执行，串行
- 计划：9 张卡 / 7.0 人天

## 进入条件
五线全部 PASS（A 线含 M1 与 A-08）

## 退出条件（全部满足才算本步骤完成）
final-verify.md = PASS；upgrade 已推送；remote URL 无凭据；规划包与证据已打包

## 任务
| 序 | 卡号 | 任务 | 依赖 | 档位 | 人天 |
|---|---|---|---|---|---|
| 1 | [W2-01](../tasks/W2-01.md) | 按 D → B → C → A → E 顺序合并五线分支，逐次跑门禁 | A-05, A-08, B-03, B-05, B-06, C-06, C-08, C-09, D-05, D-06, D-07, D-08, D-10, D-11, D-12, D-13, E-01, E-02, E-04, E-12 | opus | 1.0 |
| 2 | [W2-02](../tasks/W2-02.md) | 全路由契约测试自动发现（tests/contract），覆盖合并后全部路由（守卫角色执行） | W2-01 | sonnect | 2.0 |
| 3 | [W2-08](../tasks/W2-08.md) | ESLint 边界规则（直接 error）+ 13-响应设计文档同步 + CCR 积压收尾（含 notify.scan 调用 flushDeferred） | W2-01 | sonnect | 0.5 |
| 4 | [W2-09](../tasks/W2-09.md) | check-assets + check-root + 删除 .tmp-pa.html + 接入 npm run check | W2-03 | sonnect | 0.75 |
| 5 | [W2-03](../tasks/W2-03.md) | 依赖删除与归类（D 线负责人执行） | W2-01 | haiku | 0.25 |
| 6 | [W2-04](../tasks/W2-04.md) | after.json 复测与目标判定（D 线负责人执行） | W2-03 | sonnect | 0.5 |
| 7 | [W2-05](../tasks/W2-05.md) | 全量回归：e2e（含 e-knowledge、e-home-blocks、e-notify-rules、e-components、e-responsive、a-richtext、d-cache）、visual、a11y、responsive、contract | W2-02, W2-04, W2-08, W2-09 | sonnect | 1.0 |
| 8 | [W2-06](../tasks/W2-06.md) | parity-matrix 终态、current-plan/roadmap/changelog 同步、MUST 逐条结论 | W2-05 | haiku | 0.5 |
| 9 | [W2-07](../tasks/W2-07.md) | 独立终审 → 推送 upgrade → 打包 | W2-06 | opus | 0.5 |

## 本步骤的审查方式
1. 每个工作包结束：执行者提交汇报（格式见提示词）→ 独立验证者用 `prompts/提示词-独立验证者.md` 输出 PASS/FAIL/UNKNOWN。
2. 本步骤结束：集成者（主审）抽查 3 张卡的证据能否在干净克隆上复现；任一不能复现 → 该卡 FAIL。
3. 连续 2 次 FAIL 的卡熔断，回到规划重写任务卡。

## 风险提示
见 `10-风险·未决·待裁决.md` 中归属为 集成者 的条目。
