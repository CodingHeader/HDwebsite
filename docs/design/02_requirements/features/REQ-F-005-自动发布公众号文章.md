---
id: REQ-F-005
type: requirement-feature
title: 自动发布公众号文章
status: approved
owner: 产品所有者
created: 2026-10-10
updated: 2026-10-10
---

# REQ-F-005：自动发布公众号文章

## 1. 基本信息

| 项 | 值 |
| --- | --- |
| 类型 / 状态 | functional / approved |
| 来源 Inbox | REQ-INBOX-20261010-001（新增设计第 5 条） |
| 对应原编号 | N5 |
| 优先级 | P1（M4） |

## 2. 背景

公众号发文本依赖人工在公众平台排版操作，与官网内容两套流程，重复劳动且易脱节。

## 3. 目标

系统内排期后自动将内容发布到公众号（草稿箱 → 发布），失败可重试、有告警，无需人工登录公众平台排版。

### 用户故事

作为运营，我想让系统自动把稿件发布到公众号（草稿→发布），以便省去公众平台手动排版与发布。

## 4. 需求描述

PublishJob(wechat) 到点后：取 accessToken（WechatAccount 缓存，过期前 5 分钟刷新）→ 正文图片上传替换为微信域 URL → 封面转永久素材 media_id → `draft/add` 建草稿 → 按配置开关决定是否 `freepublish/submit` 发布 → 回写 ContentChannel（externalId/externalUrl/status）；失败重试（指数退避 ≤3 次）+ 邮件告警；频控：发布间隔 ≥60s、每日上限可配（默认 20 篇）。

## 5. 范围

### In Scope

- 微信 API 封装（token/草稿/发布/素材上传）
- 发布队列管理页（待发/已发/失败 + 重试）
- 发布开关（自动 freepublish 或人工在公众平台点发布）

### Out of Scope

- 群发接口（订阅号每日 1 次群发的模板消息群发不在本期）
- 公众平台菜单/自动回复配置

## 6. 约束与依赖

- REQ-C-002：认证服务号 + IP 白名单；DEP-001 凭证后补（开发不阻塞，联调启用阻塞）
- 依赖 SOL-005 发布队列与 SOL-001 渲染基座

## 7. 验收条件

- [ ] 草稿创建成功并可在公众平台后台可见（title/content/thumb 正确）
- [x] freepublish 开关生效：开启自动发布、关闭仅入草稿箱（证据：src/lib/__tests__/v11-wx-hub.test.ts）
- [x] access_token 缓存与过期刷新正确（无频繁获取，缓存 ≥ 有效期-5min）（证据：src/lib/__tests__/v11-wx-hub.test.ts）
- [ ] 正文外链图片自动上传替换为微信域 URL
- [x] 失败自动重试 ≤3 次（指数退避）并触发告警邮件（证据：src/lib/__tests__/v11-wx-hub.test.ts）
- [x] 频控生效：间隔 ≥60s、每日上限默认 20 篇（证据：src/lib/__tests__/v11-wx-hub.test.ts）
- [ ] （凭证就绪后）端到端真实发布成功并回写发布链接

## 8. 影响分析

- 微信 API 依赖单点封装（RISK-002 应对）；发布历史全留痕（ContentChannel）

## 9. 关联文档

- Solution：SOL-006
- Decision：ADR-002
- 设计提取：16-新增设计 §5
- Plan：M4（S6）
