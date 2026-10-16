# STEP-1E-管理端页面与功能

- 执行线：执行线 E 管理端页面与功能　分支：`lane/e-manager-pages`　所有者：Agent-App
- 下发提示词：`prompts/提示词-E-管理端页面与功能.md`
- 并行关系：可与其他四条执行线同时进行（07-所有权矩阵.md：零重叠）
- 计划：12 张卡 / 17.5 人天；线内关键链 E-04 → E-11 → E-08（5.0 人天）

## 进入条件
tag w1-base（E-05/E-06 另需 w1-ui-kit）

## 退出条件（全部满足才算本步骤完成）
E 线全部卡 PASS；交 A-08 清单已移交

## 任务
| 序 | 卡号 | 任务 | 依赖 | 档位 | 人天 |
|---|---|---|---|---|---|
| 1 | [E-01](../tasks/E-01.md) | 表单规格对齐冻结契约（承接项小修）+ 规格漂移护栏测试 | W0-13 | sonnect | 1.0 |
| 2 | [E-02](../tasks/E-02.md) | 通知规则页 + 菜单（含静默时段） | W0-13 | sonnect | 0.75 |
| 3 | [E-03](../tasks/E-03.md) | ADR-024 三页：首页区块配置、页面模板、交互点配置 + 注册表/恢复默认端点 + 3 条菜单 | W0-13 | sonnect | 2.0 |
| 4 | [E-04](../tasks/E-04.md) | 知识库管理页（库列表/详情/文件拖拽上传/进度/条目/检索测试）+ AI 场景表单分区 + 菜单 | W0-13 | sonnect | 2.0 |
| 5 | [E-05](../tasks/E-05.md) | 特殊页迁移 A：articles（接 PATCH 一键上下线）、publish-jobs、collect-items、content-hub | A-07 | sonnect | 2.0 |
| 6 | [E-06](../tasks/E-06.md) | 特殊页迁移 B：llm-providers、wechat-accounts、media（改名+批量接口）、chat-history、settings、仪表盘、login、logs 筛选、not-found | A-07 | sonnect | 2.0 |
| 7 | [E-07](../tasks/E-07.md) | 管理端规格从契约派生（resource-meta + derive），crud-specs ≤ 200 行 | E-05, E-06, E-03 | sonnect | 1.5 |
| 8 | [E-08](../tasks/E-08.md) | a11y 扫描、管理端响应式（375/768/1440）与组件 E2E | E-07, E-09, E-10, E-11 | opus | 1.0 |
| 9 | [E-09](../tasks/E-09.md) | 内容中枢统一管理：多渠道状态列、同时发布 / 定时发布入口、渠道预览 Tab | E-05 | opus | 1.5 |
| 10 | [E-10](../tasks/E-10.md) | 模型运营：优先级拖拽排序并保存 + 用量统计视图（按模型/按日） | E-06 | sonnect | 1.0 |
| 11 | [E-11](../tasks/E-11.md) | 知识库“其他管理”页面：标签、批量启停、导出、回收站、库统计、条目在线编辑、单库重建 | E-04 | opus | 2.0 |
| 12 | [E-12](../tasks/E-12.md) | E2E global-setup 跨平台：win32 下回退 `next start`、npx 走 shell、进程树按平台结束；Playwright 挂起诊断脚本 | W0-13 | opus | 0.75 |

## 本步骤的审查方式
1. 每个工作包结束：执行者提交汇报（格式见提示词）→ 独立验证者用 `prompts/提示词-独立验证者.md` 输出 PASS/FAIL/UNKNOWN。
2. 本步骤结束：集成者（主审）抽查 3 张卡的证据能否在干净克隆上复现；任一不能复现 → 该卡 FAIL。
3. 连续 2 次 FAIL 的卡熔断，回到规划重写任务卡。

## 风险提示
见 `10-风险·未决·待裁决.md` 中归属为 E 的条目。
