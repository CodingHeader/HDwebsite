---
id: TASK-M1-004
type: task
title: 认证与权限基座（JWT/RBAC/requireAuth）
status: done
plan-ref: master-plan.md §4 契约③
milestone: M1
requires: [REQ-NF-002, ADR-017]
created: 2026-10-11
updated: 2026-10-11
---

# TASK-M1-004：认证与权限基座

## 归属
- 所属切片：S1
- 来源需求：基础目标「增删改查 + 交互正常」的安全前提
- 来源方案：SOL-001 / 契约③ Identity

## 目标
登录签发 JWT、会话解析、权限判定（isSuper→精确→module:*→*）、路由守卫单点化（R1 收敛）。

## 输入
- 文档：03-后端设计.md 认证授权链路
- 契约：contracts/auth.ts
- 前置任务：TASK-M1-002/003

## 输出
- src/lib/jwt.ts、auth.ts、api-auth.ts（requireAuth(request, permission?)）
- src/lib/crypto.ts（AES-256-GCM 字段加密）、src/lib/slug.ts、src/lib/log.ts（logOperation/clientIp）
- API：/api/auth/login|logout|me|refresh

## Execution Steps
1. [x] JWT HS256 7d + claims 校验；JWT_SECRET 缺失 FATAL
2. [x] requireAuth 守卫：401/403 分支 + superAdminOnlyPermissions（review:edit）
3. [x] 登录更新 lastLoginAt/IP/loginCount + OperationLog 留痕

## 验收标准
- [x] 无 token 写接口 → 401「未提供认证令牌」（冒烟已验证）
- [x] 错误密码 → 400「用户名或密码错误」
- [x] 权限匹配顺序有单测覆盖（auth-permission.test.ts 4 用例）

## 验证命令
```bash
npx vitest run src/lib/__tests__/auth-permission.test.ts && curl -s -X POST localhost:6789/api/auth/login -H "Content-Type: application/json" -d '{"username":"admin","password":"admin123"}' | head -c 80
```

## 证据路径
docs/design/06_validation/evidence/EVD-M1/

## 允许修改
- src/lib/{jwt,auth,api-auth,crypto,slug,log}.ts、src/app/api/auth/**

## 禁止修改
- src/contracts/**

## 依赖与阻塞
- Depends on：TASK-M1-002/003
- Blocks：全部管理端 API 卡
- 阻塞条件：无

## 建议执行档位
sonnet（实现）；安全语义已由契约定死。

## 升级条件
鉴权设计需变更（如 refresh token 轮换）→ opus。

## 预估规模
中。已完成。
