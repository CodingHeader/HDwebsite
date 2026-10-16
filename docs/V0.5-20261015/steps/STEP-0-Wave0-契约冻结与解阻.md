# STEP-0-Wave0-契约冻结与解阻

- 执行线：Wave 0 契约与解阻　分支：`upgrade（直接提交）`　所有者：Agent-Contract
- 下发提示词：`prompts/提示词-W0-契约员.md`
- 并行关系：必须最先完成，其余线全部等待本步骤
- 计划：10 张卡 / 6.25 人天

## 进入条件
upgrade@bb2c0e5 门禁全绿；用户已答复 D8（或接受默认）

## 退出条件（全部满足才算本步骤完成）
W0-verify.md = PASS；tag w1-base 存在；`git diff --name-only bb2c0e5..w1-base` 不含前台路径；visual 46/46、e2e 8/8

## 任务
| 序 | 卡号 | 任务 | 依赖 | 档位 | 人天 |
|---|---|---|---|---|---|
| 1 | [W0-01](../tasks/W0-01.md) | 并行编排规则落盘（AGENTS.md §4 修订、P07~P15 提示词标注被取代、计划包入库） | — | haiku | 0.25 |
| 2 | [W0-02](../tasks/W0-02.md) | 切分 crud-resources.ts 为按域文件、拆出客户端安全的 block-defs | W0-01 | sonnect | 0.5 |
| 3 | [W0-03](../tasks/W0-03.md) | 新增 json-field / http-client / cache-tags / storage 接口模块（默认实现=现有行为） | W0-02 | sonnect | 0.5 |
| 4 | [W0-R0](../tasks/W0-R0.md) | 基线重校准：本地 W0-01~03 变基到 827646b、合并 block-defs 双份、复跑全量门禁并定位 crud-article e2e 失败、AGENTS.md 增加“禁止跨线大提交直进 upgrade” | W0-03 | opus | 1.0 |
| 5 | [W0-04](../tasks/W0-04.md) | 契约②错误码与错误体冻结 + manager-fetch 透传 fieldErrors | W0-R0 | opus | 1.0 |
| 6 | [W0-05](../tasks/W0-05.md) | 领域契约冻结：chat SSE、kinds、kb、notify quietHours、场景绑定、采集目标库、区块注册表 DTO、kbCoze 设置键 | W0-04 | opus | 1.0 |
| 7 | [W0-06](../tasks/W0-06.md) | 迁移 p12_knowledge_base + 回滚脚本 + 默认库种子 | W0-05 | opus | 1.0 |
| 8 | [W0-07](../tasks/W0-07.md) | 一次性加入 W1 全部新依赖并配置测试收集 | W0-06 | sonnect | 0.25 |
| 9 | [W0-09](../tasks/W0-09.md) | 跨平台测试可移植性：去掉 shell grep 依赖、修复 Windows 下临时库删除 EPERM（DEF-X-01a/b） | W0-07 | sonnect | 0.25 |
| 10 | [W0-08](../tasks/W0-08.md) | Wave 0 门禁（V0.5：双环境矩阵——visual@参照机 Windows、e2e@Linux）、独立校验、打冻结标签并分发 | W0-07, W0-09 | opus | 0.5 |

## 本步骤的审查方式
1. 每个工作包结束：执行者提交汇报（格式见提示词）→ 独立验证者用 `prompts/提示词-独立验证者.md` 输出 PASS/FAIL/UNKNOWN。
2. 本步骤结束：集成者（主审）抽查 3 张卡的证据能否在干净克隆上复现；任一不能复现 → 该卡 FAIL。
3. 连续 2 次 FAIL 的卡熔断，回到规划重写任务卡。

## 风险提示
见 `10-风险·未决·待裁决.md` 中归属为 W0 的条目。
