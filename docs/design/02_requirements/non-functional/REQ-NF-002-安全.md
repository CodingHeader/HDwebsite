---
id: REQ-NF-002
type: requirement-nonfunctional
title: 安全（净化、凭据、权限、传输）
status: approved
owner: 产品所有者
created: 2026-10-10
updated: 2026-10-10
---

# REQ-NF-002：安全

## 1. 基本信息

| 项 | 值 |
| --- | --- |
| 类型 / 状态 | non-functional / approved |
| 适用范围 | 全站 |

## 2. 目标

封堵已知缺口（02-前端 §9 提出的 XSS/凭据/埋点三大关注），不引入新面。

## 3. 需求描述

| 项 | 要求 |
| --- | --- |
| 富文本净化 | **统一净化入口**：html（TipTap 存量、ServiceGuide）与 markdown 渲染输出同走一套 sanitize 白名单；修复 services/[slug] 直写 dangerouslySetInnerHTML 不净化缺口（src/app/(web)/services/[slug]/page.tsx:81） |
| 图片外链 | markdown/富文本图片域名白名单（本站 uploads + 采集源域 + 微信域），非白名单默认拦截 |
| 凭据加密 | apiKey/appSecret/SMTP 密码/微信 secret 落库加密（KEY 加密层），后台回显脱敏 |
| 会话 | 现状 JWT/双 token 机制保留；新增接口默认 manager 鉴权，微信回调除外（验签替代） |
| 限流 | AI 接口限频（IP+用户维度）；登录接口防爆破（沿用现状） |
| 传输 | 全站 HTTPS（现状已具备）；微信回调强制验签 |
| 依赖 | npm audit 无 High 级以上未处理项 |

## 4. 验收条件

- [ ] services/[slug] 注入向量闭合（`<script>` 注入被净化）
- [ ] markdown 渲染输出经同一净化入口（单测覆盖 2 类输入）
- [ ] 新增凭据字段全部加密落库，API 回显脱敏
- [ ] AI 限频生效（超限 429）
- [ ] 微信回调验签失败返回 403

## 5. 关联文档

- 06-安全设计（现状清单）、02-前端设计 §9（缺口提出）
- Solution：SOL-001（净化统一）、SOL-003/005/006（凭据加密）
