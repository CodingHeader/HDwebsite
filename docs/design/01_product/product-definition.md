---
id: PRD-DEF-001
type: product
title: 产品定义
status: active
owner: 产品所有者
created: 2026-10-10
updated: 2026-10-10
---

# Product Definition（产品定义）

## 1. 产品愿景

为弘道教育（学历提升机构）提供一套**自主可控的数字化经营中枢**：官网获客、公众号运营、AI 智能咨询、政策资讯自动化四位一体，让内容与线索的"采集 → 生产 → 发布 → 转化"全链路在一套系统内闭环。

## 2. 产品目标

| # | 目标 | 说明 |
| --- | --- | --- |
| G1 | 招生获客 | 在线报名、电话/微信触点、AI 咨询承接并转化意向学员 |
| G2 | 内容运营 | 政策/新闻/文章高效发布，官网与公众号一稿多发 |
| G3 | 智能服务 | AI 客服 7×24 解答（政策/专业/流程），知识库驱动、多模型兜底 |
| G4 | 自动化降本 | 自动采集与知识入库、定时发布、异常与余额邮件提醒，减少人工值守 |

## 3. 用户与场景

| 用户 | 核心场景 |
| --- | --- |
| 潜在学员（C 端） | 浏览专业/院校/政策 → 在线咨询或报名 → 留下线索 |
| 运营人员 | 维护采集源 → 审核采集内容 → 发布官网/公众号内容 → 维护知识库与提醒配置 |
| 管理员 | 后台全量管理（RBAC）、AI/模型配置、系统设置、日志审计 |

### 3.1 用户画像（含推断，Q7 轮确认可写入并标注）

| 画像 | 特征（推断） | 核心诉求 | 系统回应 |
| --- | --- | --- | --- |
| 潜在学员 | 22~35 岁在职/待业提升学历人群；手机访问为主；决策周期长、对政策敏感 | 快速弄清能报什么、怎么报、靠不靠谱；咨询怕被骚扰 | 政策聚合、AI 客服即时答（float + apply 双入口，ADR-018）、在线报名低门槛留资 |
| 运营专员 | 1~2 人非技术背景，兼职多平台运营 | 少手工、不漏发、不出错 | 采集 → 审核（SuperAdmin 独享，ADR-017）→ 定时发布 → 五类邮件提醒 |
| 管理员/机构负责人 | 机构决策人，不常驻后台 | 状态可视、异常有感知 | 渠道状态回写、余额阈值提醒、报错邮件、指标看板（M3 起进后台） |

### 3.2 核心用户旅程（To-Be，含推断）

1. **访客咨询**：搜索/公众号 → 落地页 → 悬浮 AI 客服流式问答（外部知识库/本地双轨命中，ADR-020）→ 报名表单留资 → 运营跟进转化。
2. **运营发稿**：审核队列发现新政 → 通过 → 内容中枢排期 → 定时发布（提前 30 分钟邮件提醒，ADR-008）→ 官网/公众号自动发布 → 渠道状态回写。
3. **管理员运维**：余额不足邮件 → 后台填报余额/切换默认模型（Modelscope 起步，ADR-014）；报错邮件 → 发布队列重试；M4 执行新仓部署切换（ADR-011）。

> 画像与旅程为设计推断，供方案与验收参照；与实际运营数据冲突时以实际为准并修订。

## 4. 产品范围

### 4.1 In Scope（现状已实现，重构保留）

- 前台 13 类页面 + 全局悬浮咨询（见 [01-需求设计.md](../01-需求设计.md) §2）
- 后台 25 个管理页 + login（ManagerMenu 表驱动，RBAC 三角色）
- AI 咨询：ChatScene 场景化 + Knowledge 检索 + OpenAI 兼容代理
- 部署：宝塔 80 → standalone:6789；SQLite 持久化

### 4.2 In Scope（重构新增，N1~N11 → REQ-F-001~011）

官网/公众号统一管理、自动采集、自动发布、Markdown 管线、知识库三级模型、LLM 多模型网关、双端 AI 客服、邮箱提醒（详见 [product-requirements.md](../02_requirements/product-requirements.md)）。

### 4.3 Out of Scope（本期明确不做）

- 向量语义检索（二期预留 embedding 字段，见 12-知识库 §3.3）
- PostgreSQL / 对象存储迁移（预留可切换，不主动实施，见 14-存储 S5/S1）
- 多语言站点、付费/电商能力
- App / 小程序端
- 知识库服务本体部署（外部平台对接，KBAdapter 适配，ADR-020）

## 5. 基础目标（2026-10-11 用户确认）

| # | 目标 | 说明 | 落地约束 |
| --- | --- | --- | --- |
| BG1 | 确保风格统一 | 前台/后台视觉风格一致，遵循品牌规范 | Tailwind v4 + shadcn/ui + oklch 令牌；品牌色经 Setting 配置 |
| BG2 | 使用规范组件 | 统一 UI 组件库，禁止重复造轮子 | shadcn/ui 基础件 + 项目内业务组件（components/web、components/manager） |
| BG3 | 增删改查功能全面 | 后台所有管理模块具备完整 CRUD + 搜索 + 分页 + 筛选 | CrudPage + SchemaForm 配置驱动，消除手写样板 |
| BG4 | 全部使用动态数据 | 前台页面数据直查 DB，后台数据走 API，无硬编码内容 | Server Component 直查 + 客户端 fetch；Setting/Registry SSOT |
| BG5 | 交互正常 | 表单校验、错误提示、加载态、空态、toast 反馈完备 | zod schema + 统一响应包 + 路由级 error/loading/not-found |

> 验收挂接（Q9 轮定）：BG1~BG5 纳入 [validation-plan.md](../06_validation/validation-plan.md) 通用项 **G5**，每个里程碑验收逐条核验，任一不达标不通过。

> Q10 轮确认（2026-10-11）：BG3 = 统一 CrudPage + SchemaForm 配置驱动，字段范围 = 基础（text/textarea/number/switch/select/date）+ 高级（upload/richText/markdown/relation/tags）；BG4 = 前台 Server Component 直查 DB；BG5 = 全局错误边界 + API 统一响应包/toast 组合。

## 6. 基础设计（2026-10-11 用户确认，11 项）

| # | 设计 | 对应需求 | 核心要点 |
| --- | --- | --- | --- |
| BD1 | 官网和官方公众号统一管理 | N1 | 内容中枢 ContentItem + 渠道分发（官网/公众号），一稿多发 |
| BD2 | 自定义自动采集各大学校、部门的政策、新闻 | N2 | CollectSource/Task/Item 三表，URL hash+标题相似度去重，定时执行 |
| BD3 | 自动更新和发布官网信息和新闻 | N3 | PublishJob 状态机：审核→定时/自动发布→渠道回写 |
| BD4 | 自动发布公众号文章 | N5 | token 缓存→草稿箱→freepublish，频控与重试 |
| BD5 | 采集的信息、新闻默认作为知识库文件 | N6 | CollectItem→KnowledgeFile(pending)→审核→active |
| BD6 | 知识库管理：模型管理、文件管理、其他管理 | N7 | KnowledgeBase→File→Chunk 三级；库/文件/其他三类管理页 |
| BD7 | 配置和使用大模型 | N8 | LLMProvider 多模型 + ChatScene 知识库绑定 + 提示词参数 |
| BD8 | 允许配置官网和公众号的 AI 客服 | N9 | 官网 SSE 流式 + 公众号被动回复 48h 补发 |
| BD9 | 多模型配置、对话优先级、默认和兜底模型 | N10 | priority 排序 + isDefault + isFallback + 余额阈值 |
| BD10 | 邮箱提醒（多人/多事件） | N11 | Recipient/Rule/Record 三表，SMTP 异步队列+重试 |
| BD11 | 官网信息发布支持 markdown，自动转网页 | N4 | contentType 双模 + MarkdownRenderer + 自动摘要/封面 |

## 7. 产品形态与技术底座

- 形态：单体 Next.js 应用（前台 + 后台 + API 三层）+ SQLite（本期保持，ADR-019）
- 底座约束：见 [REQ-C-001](../02_requirements/constraints/REQ-C-001-技术栈约束.md)（沿用现有栈）
- 重构形态：平行新仓重写（ADR-011）——现仓降级为设计事实源，docs/get 为新仓唯一输入；部署切换归 M4 方案
