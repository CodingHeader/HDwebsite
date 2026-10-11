---
id: ARCH
type: architecture
title: 系统架构（As-Is / To-Be）
status: active
owner: 产品所有者
created: 2026-10-10
updated: 2026-10-10
---

# 系统架构

## 1. As-Is（现状）

```
┌─ 前台 (web) ──────────────┐   ┌─ 后台 (manager) ───────────┐
│ 首页/文章/服务/apply       │   │ 25 模块 + login（JWT 双token）│
│ AI 咨询（apply 内嵌，非流式）│   │ Article/Setting/知识/场景…  │
└────────────┬──────────────┘   └──────────────┬─────────────┘
             │ Next API Routes (/api/*)         │
┌────────────▼──────────────────────────────────▼─────────────┐
│ 服务层: ArticleService / SiteService / chat/completion        │
│ 认证: JWT    数据: Prisma + SQLite(libsql)   上传: /uploads  │
└───────┬───────────────────────────────────────────┬─────────┘
        │                                           │
   Modelscope AI（单供应商，88s 超时）          无调度/无队列/无通知
```

现状特征：全部能力请求内同步完成；AI 单点内联调用；知识库单表；无自动化（采集/定时/发布/提醒均无）；埋点链路死管道（05-交互 §4）。

## 2. To-Be（目标）

```
┌─ 接入层 ────────────────────────────────────────────────────┐
│ 前台(web)  后台(manager)  微信回调(/api/wechat/callback)     │
│   ChatWidget(流式,全局)     内容中枢/知识库/采集/发布/提醒管理  │
└──────┬────────────────────────┬───────────────────┬────────┘
       │                        │                   │
┌──────▼──────┐  ┌──────────────▼────────────┐  ┌───▼─────────────┐
│ llm-gateway │  │ 内容中枢 ContentItem/      │  │ 微信接入层       │
│ 路由/降级/   │  │ ContentChannel/WechatAcct │  │ 验签/被动回复/   │
│ 统计/超时    │  │ PublishJob 发布队列        │  │ token/草稿/发布  │
└──────┬──────┘  └──────────────┬────────────┘  └───┬─────────────┘
       │                        │                   │
┌──────▼────────────────────────▼───────────────────▼─────────────┐
│ 服务基座（进程内）                                               │
│ ├ 调度基座: 每分钟循环 → cron 表驱动(采集/发布/提醒/重试)          │
│ ├ 知识库服务: Base→File→Chunk 检索注入（三级模型）                │
│ ├ 通知网关: NotifyRecipient/Rule/Record → SMTP 异步队列          │
│ └ 净化入口: html/markdown 统一 sanitize                          │
├──────────────────────────────────────────────────────────────────┤
│ 数据: Prisma + SQLite（事务内单写者） 加密: KEY 字段级            │
└──────────────────────────────────────────────────────────────────┘
       外部: OpenAI 兼容端点(多Provider)  采集目标站  SMTP  微信API
```

## 3. 演进要点（As-Is → To-Be 差异）

| # | 变化 | 依据 |
| --- | --- | --- |
| 1 | 新增进程内调度基座（轮询 cron 表），一切自动化能力的底座 | SOL-001 |
| 2 | AI 调用收敛为 llm-gateway 单点（多 Provider 路由降级） | SOL-003 / REQ-F-010 |
| 3 | 内容模型引入 ContentItem/ContentChannel 分离"内容"与"渠道" | SOL-005/006 / REQ-F-001 |
| 4 | 知识库单表 → 三级模型（Base→File→Chunk） | SOL-002 / REQ-F-007 |
| 5 | 新增微信接入层（回调/主动下发分离） | SOL-006 / REQ-F-009 |
| 6 | 新增通知网关（异步邮件留痕） | SOL-005 / REQ-F-011 |
| 7 | News→Article 合并（channel 区分），模型域收敛 | ADR-001 |

## 4. 边界与不做

- 不引入：Redis/MQ/Docker/独立 worker/向量库（ICE-VEC 预留 embedding 字段）
- 前台访客侧不引入新鉴权；apply 转化流程交互保持现状（05-交互 §2）

## 5. 模块与目录映射（To-Be）

| 模块 | 规划目录 | 职责 |
| --- | --- | --- |
| 调度基座 | src/lib/scheduler/ | 每分钟循环、CronJob 注册表、锁与恢复 |
| llm-gateway | src/lib/llm-gateway/ | 模型路由/降级/超时/用量统计 |
| 通知网关 | src/lib/notify/ | 事件邮件、模板、队列重试 |
| 采集引擎 | src/lib/collect/ | 抓取、清洗、去重、入库钩子 |
| 微信接入 | src/lib/wechat/ | token 缓存、draft/freepublish、客服消息、验签 |
| 发布服务 | src/lib/publish/ | PublishJob 执行器、渠道抽象（website/wechat） |
| 净化入口 | src/lib/sanitize/ | html/markdown 统一白名单净化 |
| 前台组件 | src/components/web/ | ChatWidget、MarkdownRenderer |
| 管理页 | src/app/manager/<module>/ | 按各 SOL §3.5 页面清单落位 |

## 6. 关联文档

- 00_governance/project-map.md（全图索引）
- Solutions：SOL-001 ~ SOL-006（分域详设）
