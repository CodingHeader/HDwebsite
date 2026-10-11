# 新增设计方案（N1–N11）

> 提取基准：用户 2026-10-11 确认的 11 项新增设计需求 + `16-新增设计.md` To-Be 方案 + ADR-009~020 决策。
> 文档体系关联：N1~N11 ↔ REQ-F-001~011 ｜ S1~S6 ↔ SOL-001~006 ｜ C1~C8 ↔ ADR-001~008 ｜ C9 及提问轮 ↔ ADR-009~020（12 件）｜总索引：README.md §0

---

## 0. 总体架构

```
┌─────────────────────────────────────────────────────────┐
│                   内容中枢 ContentItem                    │
│         （采集产物 / 人工撰写 / 导入 markdown）              │
└─────┬──────────────┬──────────────┬──────────────┬──────┘
      │              │              │              │
┌─────▼─────┐ ┌─────▼─────┐ ┌─────▼─────┐ ┌─────▼─────┐
│ 官网渠道   │ │ 公众号渠道  │ │ 知识库渠道  │ │ AI 客服   │
│ (Article) │ │ (草稿/发布)│ │ (KB 平台)  │ │ (双端)    │
└─────┬─────┘ └─────┬─────┘ └─────┬─────┘ └─────┬─────┘
      │              │              │              │
      └──────────────┴──────────────┴──────────────┘
                             │
              ┌──────────────▼──────────────┐
              │      调度基座（Job + Cron）   │
              │  采集 / 发布 / 通知 / 备份    │
              └──────────────┬──────────────┘
                             │
              ┌──────────────▼──────────────┐
              │   通知网关（SMTP 邮箱提醒）    │
              │   多人 / 多事件 / 异步队列    │
              └─────────────────────────────┘
```

---

## 1. N1：官网和官方公众号统一管理

### 1.1 设计目标
一处创作/采集，官网与公众号两渠道分发，状态可视。

### 1.2 渠道模型

```
WechatAccount（公众号账号）
  id / name / type(service|subscription) / appid / appSecret(encrypted)
  verifyToken / encodingAESKey(encrypted)
  tokenCache(accessToken, expiresAt)
  status / createdAt

ContentItem（内容中枢）
  id / title / contentType(markdown|html) / content / excerpt / coverImage
  authorId / tags / status(draft|pending_review|approved|published|offline)
  createdAt / updatedAt

ContentChannel（渠道分发记录）
  itemId → ContentItem / channel(website|wechat) / accountId?
  externalId / externalUrl
  status(unsent|scheduled|publishing|published|failed) / errMsg / publishedAt
```

### 1.3 统一管理页
- 内容中枢列表：一稿多渠道状态列（官网已发布 / 公众号待发布）。
- 编辑器：markdown 为主，右侧"渠道预览"Tab（官网样式 / 公众号样式）。
- 操作：发布到官网 / 发布到公众号 / 同时发布 / 定时发布。

---

## 2. N2：自定义自动采集各大学校、部门的政策、新闻

### 2.1 设计目标
采集源/任务可配置，定时执行，产物自动入库知识库。

### 2.2 数据模型

```
CollectSource（采集源）
  id / name / type(rss|html|wechat_mp|api) / url
  parser(选择器/规则 JSON)
  targetBaseId → KnowledgeBase
  autoTags / schedule(cron) / enabled
  lastRunAt / lastStatus / errMsg

CollectTask（运行记录）
  id / sourceId / startedAt / finishedAt
  stat(fetched/created/duplicated/failed) / status(running|done|failed)

CollectItem（采集条目）
  id / sourceId / url(唯一 hash 去重) / urlHash
  title / rawContent / contentMd / images JSON
  publishTime / status(new|dedup|reviewed|rejected|converted)
  knowledgeFileId?
```

### 2.3 采集流程
```
调度器(cron) → CollectTask → 拉取源(rss/html)
  → 解析器抽条目 → 清洗正文为 markdown
  → 去重（urlHash 主 + 标题相似度阈值 0.9 辅）
  → CollectItem(status=new) → 自动生成 KnowledgeFile(status=pending)
  → 后台审核 → 通过→active / 拒绝→rejected
```

### 2.4 管理页
- 采集源管理：源 CRUD + 立即执行 + 运行历史。
- 采集条目：审核队列（通过/拒绝/编辑后入库）。

---

## 3. N3：自动更新和发布官网信息和新闻

### 3.1 设计目标
采集→审核→定时/自动发布闭环，发布前邮件提醒。

### 3.2 发布任务模型

```
PublishJob（发布任务）
  id / itemId → ContentItem / channel(website|wechat) / accountId?
  action(publish|update|offline)
  scheduledAt / startedAt / finishedAt
  status(pending|reviewing|scheduled|publishing|published|failed|cancelled)
  preNotify(true) / result JSON / errMsg
```

### 3.3 状态机
```
draft → pending_review → approved → scheduled
  → [到点 / 手动立即] → publishing
  → 发布前 N 分钟 → 邮箱提醒（N11）
  → website: 写入 Article(status=published, contentType=markdown)
    wechat: 草稿箱 → freepublish
  → published | failed(→邮件告警→可重试)
```

---

## 4. N4：官网信息发布支持 markdown，自动转网页

### 4.1 存储与渲染

| 层 | 设计 |
| --- | --- |
| 存储 | Article/ContentItem 增加 `contentType`（html/markdown）；markdown 原文入 content 字段 |
| 渲染 | `MarkdownRenderer` 组件：markdown → HTML（GFM/代码高亮/图片懒加载/锚点目录） |
| 摘要 | 入库时自动截取纯文本前 200 字为 excerpt（可覆盖） |
| 封面 | 正文首图自动提取为 coverImage（可覆盖） |
| 兼容 | 存量内容零迁移（contentType=html 原样渲染）；编辑器双模切换 |

---

## 5. N5：自动发布公众号文章

### 5.1 依赖与前提
- 已认证服务号 + IP 白名单 + appid/secret（ADR-013）。
- 接口：`/cgi-bin/token`、`/cgi-bin/draft/add`、`/cgi-bin/freepublish/submit`、素材上传。

### 5.2 发布流程
```
PublishJob(wechat, scheduledAt 到点)
  1. 取 accessToken（缓存，过期前 5 分钟刷新）
  2. 正文内图片上传 → url 替换（微信域）
  3. coverImage → 永久素材 media_id
  4. draft/add（title/content/thumb_media_id/author/digest）
  5. 可选：立即 freepublish 或人工在公众平台点发布
  6. 回写 ContentChannel.externalId/externalUrl/status
  7. 失败 → 邮件告警 + 任务可重试（指数退避，最多 3 次）
```

### 5.3 管理页
- 公众号账号管理（appid/secret 加密录入、token 状态测试）。
- 发布队列：待发/已发/失败列表 + 重试按钮。
- 频控：发布间隔 ≥60s、每日上限可配（默认 20 篇）。

---

## 6. N6：采集的信息、新闻默认作为知识库文件

### 6.1 设计目标
采集产物自动入库知识库，审核后激活。

### 6.2 默认链路
```
CollectItem(去重通过) → 自动创建 KnowledgeFile(status=pending, source=collect)
  → 归属规则: 采集源配置 targetBaseId + 自动 tags
  → 后台审核 → active → 可被 AI 检索
```

---

## 7. N7：知识库管理

### 7.1 知识库模型管理
- KnowledgeBase CRUD、默认库指定、向量模型配置（预留）。
- 库统计：文件数、chunk 数、存储占用。

### 7.2 知识库文件管理
- 文件树/列表、markdown 在线编辑。
- 导入（md/txt/docx）、导出、批量启停。
- 审核采集产物（通过/拒绝/编辑后入库）。

### 7.3 其他管理
- 标签管理。
- 切片重建（重新切片任务）。
- 检索测试（输入问题 → 预览命中 chunk）。
- 回收站。

### 7.4 三级模型（备选方案，ADR-020 转向外部知识库对接）
```
KnowledgeBase → KnowledgeFile → KnowledgeChunk
  (库)           (文件/条目)      (切片)
```

### 7.5 外部知识库对接（ADR-020 决策）
```
应用（AI 客服 / 采集 / 发布）
  └─ KBAdapter 适配层（统一接口）
       ├─ search(query, topK)
       ├─ pushFile / upsertFile / remove
       ├─ 实现A: DifyClient（后补）
       ├─ 实现B: FastGPTClient（后补）
       └─ 实现C: LocalFallback（本地 Knowledge 表 contains 检索兜底）
```

---

## 8. N8：配置和使用大模型

### 8.1 设计目标
模型与应用解耦，可用知识库、配置提示词及其他参数。

### 8.2 大模型配置
- LLMProvider 多模型管理（endpoint/key/model/temperature/maxTokens/systemPrompt）。
- ChatScene 可绑定"知识库"（baseId 列表）+ 注入 token 上限。
- 管理页：模型列表 + 连通性测试 + 用量统计。

---

## 9. N9：官网和公众号的 AI 客服

### 9.1 官网端
- 复用 `/api/chat/completion` → 升级走 llm-gateway。
- ChatWidget 组件：全局悬浮/页面嵌入两种挂载。
- 升级点：SSE 流式输出；会话续传（sessionId 存 localStorage）。

### 9.2 公众号端
```
微信服务器 → /api/wechat/callback（GET 验签 / POST 消息）
  → 被动回复"正在为您查询…"（5 秒限制）
  → 异步调 llm-gateway（含知识检索）
  → 客服消息接口补发答案（48h 窗口内）
  → 超长答案截断 + 引导官网
```
- AI 客服开关：WechatAccount.aiEnabled + 绑定 ChatScene。
- 风控：每用户限频、黑名单、敏感词过滤。

---

## 10. N10：多模型配置、对话优先级、默认和兜底模型

### 10.1 多模型模型

```
LLMProvider（替代/升级 AIConfig）
  id / name / endpoint / apiKey(encrypted) / model
  temperature / maxTokens / topP?
  priority Int          # 对话优先级，小值优先（1 最高）
  isDefault Boolean     # 默认模型（唯一）
  isFallback Boolean    # 兜底模型（唯一）
  status(active|inactive)
  balance Float? / balanceThreshold Float?
  dailyQuota / rateLimit / metadata JSON
```

### 10.2 路由策略（llm-gateway 单点）
```
chat(messages, scene)
  1. 取 isDefault 且 active → 调用（超时可配，默认 30s）
  2. 失败(网络/5xx/超时/429) → 按 priority asc 逐个尝试其余 active
  3. 全部失败 → isFallback 必试
  4. 每次：记录 tokensUsed/耗时/成败 → 汇总到统计
  5. 余额检查 → 低于阈值 → 邮件（N11）
```

### 10.3 管理页
- 模型列表（拖拽调 priority、设默认/兜底）。
- 连通性测试（一键发测试消息，返回延迟与回复）。
- 对话优先级可视化 + 用量统计（按模型/日）。

---

## 11. N11：邮箱提醒功能

### 11.1 设计目标
支持多人提醒，覆盖发布前/余额不足/报错等场景。

### 11.2 数据模型

```
NotifyRecipient（提醒人）
  id / name / email / groups JSON(["publish","ops"]) / enabled

NotifyRule（提醒规则）
  id / event / enabled / templateId? / recipients组 / 静默时段?
  # event 枚举：
  #   before_publish_news      发布新闻前
  #   before_publish_info      发布信息前
  #   before_publish_wechat    发布公众号文章前
  #   llm_balance_low          大模型余额不足
  #   job_failed               任务失败
  #   system_error             报错
  #   collect_failed           采集失败

NotifyRecord（发送记录）
  id / ruleId / event / toEmails / subject / content / status(sent|failed)
  retries / errMsg / sentAt
```

### 11.3 SMTP 配置（Setting 分组 email）
host/port/secure/username/password(encrypted)/from；连接测试按钮。

### 11.4 触发点接线

| 事件 | 触发位置 |
| --- | --- |
| 发布前三类 | PublishJob 进入 publishing 前提醒（提前量可配，默认提前 30 分钟；立即发布则为"即将发布"即时邮件） |
| 余额不足 | 余额检查定时任务 |
| 报错 | 全局 error 边界 + API catch 钩子（聚合限频：同类错误 10 分钟内只发 1 封） |
| 任务失败 | 调度基座任务 failed |

### 11.5 发送机制
- 异步队列（不阻塞主流程）、失败重试 3 次（指数退避）、NotifyRecord 全留痕。
- 邮件模板：变量 {title, time, detail, link}，默认简洁 HTML 模板。

---

## 12. 调度基座（公共服务）

```
Job 表: type(collect|publish|notify|balance_check|backup)
        payload JSON / cron? / status(idle|running|done|failed)
        lastRunAt / nextRunAt / retries
Worker: setInterval 每分钟扫描 nextRunAt ≤ now 的任务
        执行 → 写回状态 → 失败告警（N11）
```
- 附带 `backup` 内置任务：每日 03:00 备份 dev.db + uploads 到 `backups/yyyymmdd/`，保留 14 份。

---

## 13. 落地顺序

| 阶段 | 内容 | 依赖 |
| --- | --- | --- |
| S1 | 调度基座 + Setting 加密 + Markdown 管线（N4） | 无 |
| S2 | 知识库平台（N7）+ 外部知识库对接 | S1 |
| S3 | LLM 多模型网关 + AI 客服升级（N8/N9/N10） | S2 |
| S4 | 采集引擎 + 默认入库（N2/N6） | S1/S2 |
| S5 | 发布中枢：官网自动发布（N3）+ 邮箱提醒（N11） | S1/S4 |
| S6 | 公众号对接：文章发布 + AI 客服（N1/N5/N9） | S3/S5 + 微信凭证 |

---

## 14. 决策清单（全部 ✅）

| # | 决策点 | 决策 | ADR |
| --- | --- | --- | --- |
| C1 | News 并入 Article | channel 字段区分 | 001 |
| C2 | 公众号凭证 | 按官方 API 设计，后补启用 | 002 |
| C3 | 采集源清单 | 后台可配置，不预置 | 003 |
| C4 | SMTP 配置 | 后台可配置 | 004 |
| C5 | 大模型供应商 | 任意 OpenAI 兼容端点 | 005 |
| C6 | 公众号 AI 客服 | 被动回复 + 48h 异步补发 | 006 |
| C7 | 英文草稿 | 已删除 | 007 |
| C8 | 发布前提醒语义 | 仅通知，非审批门 | 008 |
| C9 | Setting 键双体系 | 统一 Registry + 迁移脚本 | 009 |
| — | 品牌基准 | 弘道教育 | 010 |
| — | 重构形态 | 平行新仓重写 | 011 |
| — | 闲置资产 | 裁剪 4 模型（31→26） | 012 |
| — | 公众号类型 | 已认证服务号 | 013 |
| — | LLM 初始 | Modelscope 兼容端点 | 014 |
| — | 采集器顺序 | HTML → RSS → 公众号 | 015 |
| — | 向量检索 | 二期后置 | 016 |
| — | 审核权 | SuperAdmin 独享 | 017 |
| — | AI 客服挂载 | 悬浮 + 报名页双入口 | 018 |
| — | 数据库 | 本期 SQLite，PG 可迁移 | 019 |
| — | 知识库 | 外部对接，项目内不部署 | 020 |

---

## 15. Q10 轮补充决策（2026-10-11）

| # | 决策点 | 决策 | 落点 |
| --- | --- | --- | --- |
| D1 | 采集频率默认值 | 默认每天 1 次、凌晨执行（默认 04:00 避开 03:00 备份错峰，推断参数），管理端可配置可更改 | SOL-004 §3.1/§3.2/§4、REQ-F-002 |
| D2 | 邮箱模板格式 | 可配置模板（新增 NotifyTemplate：新建/编辑/绑定规则，未绑定走默认模板） | SOL-005 §3.3/§3.4/§3.5/§4、REQ-F-011 |
| D3 | 审核流程 | 单级审核（SuperAdmin 一审终审） | ADR-017 补充、SOL-005 §3.1 |
| D4 | 内容中枢与 Article | 新建 ContentItem 中枢，Article 保留为官网渠道存储 | REQ-F-001 决策更新节、SOL-005 §4 |
| D5 | 采集图片处理 | 默认转存本地（upload-service 管线，失败降级留原链；反转原"默认不转存"口径） | SOL-004 §3.2/§3.4、REQ-F-002 |
| D6 | 后台 CRUD 组件 | 统一 CrudPage（维持既有设计） | product-definition §5 Q10 注（BG3） |
| D7 | 前台数据加载 | Server Component 直查（维持既有设计） | product-definition §5 Q10 注（BG4） |
| D8 | SchemaForm 字段类型 | 基础 + 高级（基础 text/textarea/number/switch/select/date；高级 upload/richText/markdown/relation/tags） | product-definition §5 Q10 注 |
| D9 | 错误处理策略 | 全局错误边界 + API 统一响应包/toast 组合 | product-definition §5 Q10 注（BG5） |
| D10 | 部署切换（M4） | 灰度发布（独立端口并行、按比例分流 10% 起步、观察 ≥3 天、分钟级回滚、全量后热备 ≥2 周；详见 ADR-021） | ADR-021（新建）、milestones M4、validation-plan M4-7 |

> 14 问中未答 4 项处置（维持现状口径，可下轮修订）：Q10-1 解析规则 = 每源可配 CSS 选择器组 + 试抓预览（SOL-004 现状，XPath/正则扩展 M3 按需）；Q10-2 知识库选型 = 维持 ADR-020（M2 前定）；Q10-3 余额查询 = 维持 ADR-005 人工填报；Q10-4 公众号→官网同步 = 维持一稿多发（BD1/REQ-F-001）。
