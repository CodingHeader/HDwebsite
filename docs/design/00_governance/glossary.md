---
id: GLOSS-001
type: project
title: 术语表
status: active
owner: AI Agent
created: 2026-10-10
updated: 2026-10-10
---

# Glossary（术语表）

## 1. 业务域

| 术语 | 定义 |
| --- | --- |
| 弘道教育 | 本项目业务主体（学历提升机构：自学考试/成人高考/开放大学/职业证书），站点 www.hd1994.com |
| 学历提升 | 业务核心：自考（zikao）、成考（chengkao）、开放大学（kaifang）三大通道 |
| 报名线索 | 前台在线报名产生的 Student 记录（status=pending 起步），运营跟进转化 |
| 采集 | 按配置源自动抓取各大学校/部门政策、新闻（N2），产物经审核入知识库与发布链 |
| 内容中枢 | To-Be 的 ContentItem 模型：一稿多渠道（官网/公众号/知识库）分发的统一内容源 |
| 渠道（channel） | 双义：① Article 中区分新闻（news）与资讯（info）的字段（C1/ADR-001 后）；② 分发通道（官网/公众号） |

## 2. 系统架构域

| 术语 | 定义 |
| --- | --- |
| 前台（web） | `src/app/(web)/` 路由组：13 类页面 + 全局悬浮咨询 |
| 后台（manager） | `src/app/manager/`：25 个管理页 + login，ManagerMenu 表驱动 |
| API 层 | `src/app/api/`：40+ 路由，统一 ApiResponse 契约 |
| standalone | Next.js `output: "standalone"` 产物，经 scripts/start-next.mjs 启动于 6789 |
| 宝塔 | 部署面板，80 端口反代 → 内部 6789 |
| 调度基座 | To-Be 公共服务：Job 表 + 每分钟扫描 worker，承载采集/发布/通知/备份定时任务 |
| llm-gateway | To-Be 统一大模型调用网关：多模型路由/降级/用量统计单点 |
| 通知网关 | To-Be 统一邮件提醒单点：NotifyRecipient/Rule/Record + 异步队列 |
| Registry（注册中心） | settings-registry / block-registry：配置唯一真相源，驱动动态表单与区块渲染 |
| CronJob | 调度基座任务表（name/cron/enabled/lastRunAt/lockedAt），每分钟扫描驱动，PM2 重启自动恢复 |
| PublishJob | 发布队列任务：状态机 draft→pending_review→approved→scheduled→publishing→published/failed/cancelled（无审批门，ADR-008） |
| ContentChannel | 内容在某渠道的发布记录（externalId/externalUrl/status/errMsg/publishedAt） |

## 3. AI 与知识库域

| 术语 | 定义 |
| --- | --- |
| ChatScene | AI 场景配置模型：各入口独立的欢迎语/提示词/知识 tag/页面文案 |
| Knowledge（As-Is） | 单表知识条目（title/content/tags/priority），contains 检索 take 6 注入 system |
| 知识库三级模型（To-Be） | KnowledgeBase（库）→ KnowledgeFile（文件）→ KnowledgeChunk（切片） |
| Modelscope | 当前大模型供应商（OpenAI 兼容端点） |
| OpenAI 兼容端点 | 任意实现 `/v1/chat/completions` 协议的服务，多 Provider 记录接入 |
| 默认模型 / 兜底模型 | isDefault（新会话首选，唯一）/ isFallback（全部失败后必试，唯一） |
| 优先级（priority） | LLMProvider 对话优先级，小值优先；失败按 priority 升序逐个尝试 |
| 余额人工填报 | C5 决策：供应商余额不支持自动查询时人工录入，低于阈值邮件提醒 |
| 被动回复 | 微信 5 秒限制内同步应答；长答案走客服消息接口 48h 窗口异步补发（C6） |
| LLMProvider | 大模型供应商配置记录（endpoint/apiKey 加密/priority/isDefault/isFallback/balance） |
| ChatWidget | To-Be 官网 AI 客服组件：全局挂载、SSE 流式输出、会话续传（localStorage sessionId） |
| 检索测试 | 知识库管理工具：输入问题 → 预览命中 chunk 及归属（库名/文件/标签） |
| 试抓预览 | 采集源保存前的实测预览：返回解析条目样例，不入库（ADR-003） |

## 4. 流程与文档治理域

| 术语 | 定义 |
| --- | --- |
| SSOT | Single Source of Truth：同一种事实只有一个权威来源，其他文档只引用不复制 |
| ADR | Architecture Decision Record：记录决策背景/选项/结论/影响（ADR-001~008） |
| SOL | Solution：需求的执行方案（SOL-001~006，对应落地顺序 S1~S6） |
| REQ-F / REQ-NF / REQ-C | 功能 / 非功能 / 约束三类需求（分类存储，管理方式不同） |
| Inbox | 新需求统一原始入口，保留原始表述，经分析归档为 REQ |
| 原子任务（TASK） | 最小可独立执行且可独立验证的工作单元（模板见 task-template.md） |
| VAL / EVD | 验证记录 / 完成证据目录 |
| C1~C8 | 决策编号（README §4）：已全部确认并正式化为 ADR-001~008 |
| S1~S6 | 落地顺序编号（16-新增设计 §11）：基座→知识库→LLM→采集→发布→公众号 |
| P/K/R 编号 | 提取文档内的风险/局限/复用不足编号（P1~P7 性能、K1~K5 知识库、R1~R7 复用、S1~S5 存储） |

## 5. 技术细节域

| 术语 | 定义 |
| --- | --- |
| JSON-in-String | SQLite 无原生 JSON，灵活结构以 String 存 JSON，读取侧 try/catch 容错 |
| 埋点三件套 | ElementConfig（设计期蓝图，零引用）/ data-interaction-id（静态标记，无监听）/ UserAction（死管道）——重构期接线或移除 |
| TipTap | 富文本编辑器（存量 html 内容来源）；markdown 为新增 contentType |
| GFM | GitHub Flavored Markdown：表格/任务列表/删除线等扩展 |
| sharp | 图片处理：三级缩略图（100/300/800）+ progressive jpeg |
| libsql | Prisma SQLite 适配器（@prisma/adapter-libsql 单例连接） |
| BUILD_ID | start-next.mjs 校验 standalone 与 static 同步性的标识文件 |
| /uploads rewrite | `/uploads/:path*` → `/api/file/:path*`：standalone 下运行时上传文件经 API 读取 |
| SSE | Server-Sent Events：官网端 AI 流式输出协议（原生 ReadableStream 实现，响应头 X-Accel-Buffering: no 防反代缓冲） |
| instrumentation.ts | Next 16 启动钩子文件：调度基座循环的进程内初始化点（dev 热重载需 globalThis 锁防重入） |
| 新增依赖族 | react-markdown/remark-gfm/rehype-highlight/cron-parser（SOL-001）、mammoth（SOL-002）、rss-parser/cheerio（SOL-004）、nodemailer（SOL-005）、fast-xml-parser（SOL-006）；均按 REQ-C-001 在各 SOL §3.6 声明 |
| 平行新仓 | 重构形态（ADR-011）：新仓库按 docs/get 设计重写，现仓降级为设计事实源，切换归 M4 部署切换方案 |
| KBAdapter | 外部知识库适配层（ADR-020）：search/push/upsert/remove 抽象接口，选型未定先抽象；本地 Knowledge 表兜底双轨 |
