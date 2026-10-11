---
id: REQ-F-001
type: requirement-feature
title: 官网和官方公众号统一管理
status: approved
owner: 产品所有者
created: 2026-10-10
updated: 2026-10-10
---

# REQ-F-001：官网和官方公众号统一管理

## 1. 基本信息

| 项 | 值 |
| --- | --- |
| 类型 / 状态 | functional / approved |
| 来源 Inbox | REQ-INBOX-20261010-001（新增设计第 1 条） |
| 对应原编号 | N1 |
| 优先级 | P1（M4） |

## 2. 背景

官网（Article 体系）与公众号目前互不相通：内容需分别在两处编辑排版，同一稿件双写，状态不可视，效率低且易漏发。

## 3. 目标

一处创作/采集，官网与公众号两渠道分发，渠道状态可视、可控。

### 用户故事

作为运营，我想在一处撰写内容并实时看到官网/公众号双渠道发布状态，以便告别双平台重复排版与状态盲区。

## 4. 需求描述

建立内容中枢（ContentItem）与渠道分发记录（ContentChannel）模型；统一管理页提供一稿多渠道状态列表、双渠道预览（官网样式 / 公众号样式）、发布操作（官网 / 公众号 / 同时 / 定时）；公众号账号（WechatAccount）独立管理，支持多账号录入与 token 缓存。

## 5. 范围

### In Scope

- ContentItem / ContentChannel / WechatAccount 数据模型
- 内容中枢管理页（列表 + 编辑器 + 渠道预览 Tab）
- 渠道状态列（官网/公众号各自 ✓/⏳/✗）

### Out of Scope

- 公众号菜单管理、自动回复规则配置（微信后台操作）
- 公众号数据统计（阅读/分享）回拉（二期评估）

## 6. 约束与依赖

- REQ-C-002（微信平台约束）、DEP-001（凭证后补，不阻塞开发）
- 渠道预览组件与 N4 Markdown 管线共用渲染器（08-复用 §3）

## 7. 验收条件

- [ ] 内容中枢列表页展示每篇内容在官网/公众号两渠道的发布状态列
- [ ] 编辑器右侧提供"渠道预览"Tab（官网样式 / 公众号样式）
- [ ] 支持发布到官网 / 发布到公众号 / 同时发布 / 定时发布四类操作入口
- [ ] WechatAccount 支持 appid/secret 加密录入与 token 状态测试
- [ ] ContentChannel 记录 externalId / externalUrl / status / errMsg 全链路可查

## 8. 影响分析

- 新增管理页 2 个（内容中枢、公众号账号）；ManagerMenu 增配
- 与 REQ-F-003/005（发布链路）、REQ-F-004（markdown 编辑）强耦合，编排进 SOL-005/SOL-006

## 9. 关联文档

- Solution：SOL-005（官网渠道）、SOL-006（公众号渠道与账号）
- Decision：ADR-002（凭证后补）
- 设计提取：16-新增设计 §1、§5
- Plan：M4（S6）

---

## 2026-10-11 决策更新（Q10 轮）

ContentItem 为**新建**内容中枢模型，不改造现有 Article；Article 保留为官网渠道渲染存储，发布时由渠道执行器自 ContentItem 写入/更新（SOL-005 §3.1），ContentChannel 记录分发状态。
