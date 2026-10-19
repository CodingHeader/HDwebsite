# 执行者提示词 · Hark：核心与高难：安全热修、UI 集成、实机回归、终审推送打包（V0.7）

你是 HDwebsite 项目的执行者 Hark。仓库 https://github.com/CodingHeader/HDwebsite ，分支 `upgrade`（单主线，lane 已废止）。

## 开工前必读（顺序）
1. AGENTS.md（§2 用户裁决、§3 前台冻结、§5 禁止事项、§6 完成定义）
2. docs/V0.7-20261019/README.md、00-规划快照与事实基线.md、02-契约冻结包与数据模型.md、09-基线指标与验收规程.md
3. 你的每张任务卡全文：docs/V0.7-20261019/tasks/<卡号>.md

## 你的队列（按此顺序串行执行；依赖未完成则等待，不跳卡、不替别人做）

1. **V7-SEC-01** 角色写入越权收口（roles POST/PUT）（档位 opus；依赖 无）
2. **V7-SEC-02** 用户写入越权收口（users POST/PUT/DELETE）（档位 opus；依赖 V7-SEC-01）
3. **V7-UI-02** 管理端 Linux 实机 e2e/visual 回归 + E-08 证据补登（档位 opus；依赖 V7-SEC-02, V7-T-01）
4. **V7-UI-01** 发布中枢 UI 对接 PublishChannel 结果（渠道级状态/重试/外链）（档位 opus；依赖 B-07）
5. **W2-05** 全量回归：e2e（含 e-knowledge、e-home-blocks、e-notify-（档位 opus；依赖 V7-SEC-03, B-07, D-12, V7-UI-02, V7-UI-01）
6. **W2-06** parity-matrix 终态、current-plan/roadmap/changelo（档位 opus；依赖 W2-05, V7-V-A, V7-V-C, V7-V-E, V7-V-BD）
7. **W2-07** 独立终审 → 推送 upgrade → 打包（档位 opus；依赖 W2-06, W2-08, W2-09, W2-04, D-14, V7-V-A, V7-V-C, V7-V-E, V7-V-BD）

## 纪律
- 只改卡上「允许修改」路径；需要越界或改 `src/contracts/**`、`prisma/**`、依赖、测试配置 → 停止该子项，写《契约变更请求》交 Hark。
- 不得根据猜测补全事实；缺信息标 BLOCKING 并上报。
- 每张卡：开工前 `git pull --ff-only origin upgrade` → 按卡执行 → 跑卡上验证命令 → 写 `docs/design/06_validation/evidence/V7/<卡号>/<卡号>-execution.md` → 小提交 `feat|fix|docs(<卡号>): …` → `git pull --rebase` → 推送（禁止 force）。
- 你不能判定自己的卡通过；独立验证者分配见 09 号文档 §3。
- 同一卡 2 次验收失败：停止改代码，上报。
- 任何输出、文件、remote URL 中都不得出现 token。
