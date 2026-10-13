# STEP-1C-AI与知识库

- 执行线：执行线 C AI 与知识库　分支：`lane/c-ai-kb`　所有者：Agent-AI
- 下发提示词：`prompts/提示词-C-AI与知识库.md`
- 并行关系：可与其他四条执行线同时进行（07-所有权矩阵.md：零重叠）
- 计划：9 张卡 / 10.0 人天；线内关键链 C-01 → C-02 → C-04 → C-06（5.5 人天）

## 进入条件
tag w1-base

## 退出条件（全部满足才算本步骤完成）
C 线全部卡 PASS；知识库上传 PDF/图片 400 用例在列且通过

## 任务
| 序 | 卡号 | 任务 | 依赖 | 档位 | 人天 |
|---|---|---|---|---|---|
| 1 | [C-01](../tasks/C-01.md) | LLMProviderAdapter 注册表（openai/coze）+ providers 路由 withApi + 测试端点复用适配器 | W0-08 | opus | 1.0 |
| 2 | [C-02](../tasks/C-02.md) | KnowledgeBackend 接口与注册表，合并 P06 的 KbRemoteAdapter | C-01 | sonnect | 1.0 |
| 3 | [C-03](../tasks/C-03.md) | 知识库文件管线纯函数：类型三重校验、docx 解析、切分 | W0-08 | sonnect | 1.0 |
| 4 | [C-04](../tasks/C-04.md) | Coze 知识库客户端：建库/推文档(≤10/批)/进度/删除 + 错误映射 + 自注册 | C-02, C-03 | sonnect | 1.5 |
| 5 | [C-05](../tasks/C-05.md) | 本地检索：按库过滤 + bigram/关键词/标题加权打分 + LIKE 预筛 ≤500 + 命中率基线 | C-02 | sonnect | 1.0 |
| 6 | [C-06](../tasks/C-06.md) | 知识库 API：库 CRUD+同步、文件上传(≤10MB 三重校验)/列表/删除/重解析/进度、kb/test 扩 baseIds/topK | C-04, C-05 | sonnect | 2.0 |
| 7 | [C-07](../tasks/C-07.md) | 场景绑定 providerIds/参数/baseIds；chat/stream 用 SSE 契约与 429；ChatWidget 仅解析改 safeParse | C-01, C-05 | sonnect | 1.0 |
| 8 | [C-08](../tasks/C-08.md) | 采集→目标库：ingestCollectItem 读取 CollectSource.knowledgeBaseId（默认“采集资讯”）并推送 Coze(txt) | C-04 | sonnect | 0.5 |
| 9 | [C-09](../tasks/C-09.md) | LLM dailyQuota / rateLimit 生效，全部超限返回 503 | C-07 | sonnect | 1.0 |

## 本步骤的审查方式
1. 每个工作包结束：执行者提交汇报（格式见提示词）→ 独立验证者用 `prompts/提示词-独立验证者.md` 输出 PASS/FAIL/UNKNOWN。
2. 本步骤结束：集成者（主审）抽查 3 张卡的证据能否在干净克隆上复现；任一不能复现 → 该卡 FAIL。
3. 连续 2 次 FAIL 的卡熔断，回到规划重写任务卡。

## 风险提示
见 `10-风险·未决·待裁决.md` 中归属为 C 的条目。
