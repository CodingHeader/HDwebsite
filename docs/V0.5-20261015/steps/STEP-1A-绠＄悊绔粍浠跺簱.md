# STEP-1A-管理端组件库

- 执行线：执行线 A 管理端组件库　分支：`lane/a-manager-ui`　所有者：Agent-UI
- 下发提示词：`prompts/提示词-A-管理端组件库.md`
- 并行关系：可与其他四条执行线同时进行（07-所有权矩阵.md：零重叠）
- 计划：8 张卡 / 6.5 人天；线内关键链 A-01 → A-03 → A-04 → A-07 → A-06 → A-08（4.5 人天）

## 进入条件
tag w1-base

## 退出条件（全部满足才算本步骤完成）
A 线全部卡 PASS；M1（w1-ui-kit）已合入 upgrade；A-08 关闭 E-08 清单

## 任务
| 序 | 卡号 | 任务 | 依赖 | 档位 | 人天 |
|---|---|---|---|---|---|
| 1 | [A-01](../tasks/A-01.md) | 管理端基础件（新目录，不动前台在用的 ui 文件） | W0-08 | sonnect | 1.0 |
| 2 | [A-02](../tasks/A-02.md) | DataTable：排序/筛选 chips/列显隐/密度/行选择+批量/每页条数/URL 同步/窄屏卡片 | A-01 | sonnect | 1.0 |
| 3 | [A-03](../tasks/A-03.md) | ResourceForm + 字段件（Json/Secret/Relation/Tags/Image+MediaPicker/DateTime）+ 服务端 fieldErrors 标红 | A-01 | sonnect | 1.5 |
| 4 | [A-04](../tasks/A-04.md) | CrudPage 重写为 PageHeader + DataTable + ResourceForm（25 个规格页零改文件迁移） | A-02, A-03 | sonnect | 0.5 |
| 5 | [A-05](../tasks/A-05.md) | RichTextField（TipTap，动态导入）+ MarkdownField（编辑/预览）（V0.4：返工——TipTap 改动态导入） | A-03 | sonnect | 1.0 |
| 6 | [A-06](../tasks/A-06.md) | 移除 @radix-ui 的代码引用（依赖删除在 W2-03） | A-07 | sonnect | 0.25 |
| 7 | [A-07](../tasks/A-07.md) | 组件发布点 M1（V0.4 改写为回溯式）：以 bb2c0e5..lane/a 全量 diff（含 827646b）独立校验 A-01~A-06 后打 tag w1-ui-kit | A-04 | opus | 0.25 |
| 8 | [A-08](../tasks/A-08.md) | 组件层 a11y/响应式修复（响应 E-08 的“交 A-08”清单） | A-06, E-08 | sonnect | 1.0 |

## 本步骤的审查方式
1. 每个工作包结束：执行者提交汇报（格式见提示词）→ 独立验证者用 `prompts/提示词-独立验证者.md` 输出 PASS/FAIL/UNKNOWN。
2. 本步骤结束：集成者（主审）抽查 3 张卡的证据能否在干净克隆上复现；任一不能复现 → 该卡 FAIL。
3. 连续 2 次 FAIL 的卡熔断，回到规划重写任务卡。

## 风险提示
见 `10-风险·未决·待裁决.md` 中归属为 A 的条目。
