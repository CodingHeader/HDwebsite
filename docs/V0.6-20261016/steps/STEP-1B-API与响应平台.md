# STEP-1B-API与响应平台

- 执行线：执行线 B API 与响应平台　分支：`lane/b-api-platform`　所有者：Agent-API
- 下发提示词：`prompts/提示词-B-API与响应平台.md`
- 并行关系：可与其他四条执行线同时进行（07-所有权矩阵.md：零重叠）
- 计划：7 张卡 / 7.25 人天；线内关键链 B-01 → B-04 → B-05 → B-07（3.75 人天）

## 进入条件
tag w1-base

## 退出条件（全部满足才算本步骤完成）
B 线全部卡 PASS；B 线拥有的手写路由只剩登记在案的协议例外

## 任务
| 序 | 卡号 | 任务 | 依赖 | 档位 | 人天 |
|---|---|---|---|---|---|
| 1 | [B-01](../tasks/B-01.md) | settings 读取分为 getPublicSettings / getAllSettings（getSettings 保留为已弃用别名） | W0-13 | sonnect | 0.25 |
| 2 | [B-02](../tasks/B-02.md) | withApi 迁移 A：后台路由（users×2、roles×2、settings×3、manager-menus、wechat/accounts×2、articles/[id] 的 GET/PUT/DELETE） | B-01 | sonnect | 1.5 |
| 3 | [B-03](../tasks/B-03.md) | withApi 迁移 B：apply、articles 列表、auth×4、user-actions、api 根；非 JSON 例外清单 | B-02 | sonnect | 1.0 |
| 4 | [B-04](../tasks/B-04.md) | B 线自有文件改用 http-client 与 json-field（wechat、notify-gateway、auth） | B-01 | sonnect | 0.5 |
| 5 | [B-05](../tasks/B-05.md) | PublishChannel 注册表（website/wechat）+ 发布后写失效 | B-04 | opus | 1.0 |
| 6 | [B-06](../tasks/B-06.md) | 通知：静默时段生效、去重跨进程原子化并细化键、邮件堆栈脱敏、notify-rules PATCH 接收 quietHours | B-04 | sonnect | 1.0 |
| 7 | [B-07](../tasks/B-07.md) | 公众号图文发布闭环：正文外链图转存微信（uploadimg）、发布结果回写 externalUrl（freepublish/get）、发布间隔 ≥60s；内容中枢后端：渠道状态 DTO 与多渠道一次发布（G1） | B-05 | sonnect | 2.0 |

## 本步骤的审查方式
1. 每个工作包结束：执行者提交汇报（格式见提示词）→ 独立验证者用 `prompts/提示词-独立验证者.md` 输出 PASS/FAIL/UNKNOWN。
2. 本步骤结束：集成者（主审）抽查 3 张卡的证据能否在干净克隆上复现；任一不能复现 → 该卡 FAIL。
3. 连续 2 次 FAIL 的卡熔断，回到规划重写任务卡。

## 风险提示
见 `10-风险·未决·待裁决.md` 中归属为 B 的条目。
