# V12-E2E-01 执行证据：apply-chat 会话签发竞态修复

> 执行时间：2026-10-26（Linux 容器）
> 执行者：main-agent
> 基线：upgrade@6af5fff（V12-G-01 后）

## 5W1H 简版

- **What**：访客在 /apply 发送消息收到 AI 流式回复（apply-chat.spec.ts 单跑稳定绿），消除多签发源竞态导致的 POST 400。
- **Why**：SEC-04 服务端会话改造后，ApplyClient 与 ChatWidget 各自调用会话签发；页面加载实测 4 次并发 GET /api/chat/session，各自 Set-Cookie（同键 chat_sid）互相覆盖，POST /api/chat/stream 校验 cookieSession === body.sessionId 失败 → 400 → 无 MOCK_REPLY。
- **Where/When**：src/app/api/chat/session/route.ts（服务端）、src/lib/chat-service.ts（签名工具）、src/components/web/ChatWidget.tsx + src/app/(web)/apply/ApplyClient.tsx（客户端）、新增 src/lib/chat-session.ts（共享单例 helper）。
- **Who**：main-agent 执行；独立验证者后续出 verify.md。
- **How**：复现→服务端幂等签发→客户端单签发点→400 重试收紧→回归。

## 复现（G-01 基线）

- apply-chat.spec.ts 单跑：**FAIL**（MOCK_REPLY 30s 超时，trace 实证 4 次并发 GET /api/chat/session 同键覆盖 + POST 400）。
- 证据：docs/V1.2-20261026/00-事实基线.md §3；.cache/e2e trace。

## 修复（三步 + 附带 bug 修复）

### 1. 服务端幂等签发（src/app/api/chat/session/route.ts）

GET 时若请求已带有效签名 cookie → 复用该 sessionId（响应 200，不覆盖 cookie）；仅无有效 cookie 才签发新 id。

**附带修复**：原 route 用 `NextResponse.json(success(...))` 嵌套，success() 已返回 Response，再套 NextResponse.json 导致 body 为 `{}`——客户端永远拿不到 sessionId。改为直接 `return success(...)`。这是 apply-chat 400 的直接根因之一（客户端拿不到 id → body.sessionId 为空 → 与 cookie 不匹配 → 400）。

### 2. 客户端收敛签发点（新增 src/lib/chat-session.ts）

- 模块级单例 promise：同页并发调用共享同一签发结果，只触发一次 GET。
- ApplyClient.fetchOrReuseSessionId 与 ChatWidget.ensureSessionId 收敛为同一 helper。
- 共享 hd_chat_session_id 键（兼容旧键 hd_session_id）。

### 3. 400 重试语义收紧

- ApplyClient 与 ChatWidget 均：仅当 res.status === 400 时重签一次，且重签与发送串行化（await 重签完成再发第二次）。
- 防止重试自指竞态。

## 新增单测（src/lib/__tests__/v12-e2e-01-session-idempotent.test.ts）

7 例全绿：
1. 无 cookie → 签发新 sessionId + Set-Cookie
2. 带有效签名 cookie → 复用同一 sessionId，不覆盖 cookie
3. 篡改签名 cookie → 视为无效，重新签发新 id
4. 并发无 cookie 签发 → 各自独立新 id
5. 客户端单例：无缓存 → 并发只触发一次 GET
6. 客户端单例：有缓存 → 直接返回，不发起 GET
7. reissueSessionId → 清缓存重签（新 id）

## 回归

| 命令 | 结果 |
|---|---|
| apply-chat.spec.ts 单跑 | **PASS**（1.2m，6.4s 测试） |
| SEC-04 单测（v11-sec04-session-ssrf + chat-guard + llm-limits） | 36/36 PASS |
| npm run lint | PASS（0 警告） |
| npx tsc --noEmit | PASS |
| npm test 全量 | 1850/1853（3 例 flaky：v11-col-01 ×2 + v11-mail-01 ×1，重跑 15/15 全绿，非本次改动回归） |
| 幂等单测 v12-e2e-01 | 7/7 PASS |

## 验收条目

- [x] apply-chat.spec.ts 单跑 PASS（MOCK_REPLY 可见，会话落库）
- [x] 服务端幂等：有效 cookie 复用 id（单测覆盖）
- [x] 客户端单例：并发只一次 GET（单测覆盖）
- [x] SEC-04 会话校验单测不回归（篡改/过期/不匹配仍 400）
- [x] lint/typecheck/单测全绿（flaky 已登记）

## 改动文件

- src/app/api/chat/session/route.ts（幂等签发 + 修复嵌套 bug）
- src/lib/chat-session.ts（新增，共享单例 helper）
- src/components/web/ChatWidget.tsx（收敛 + 400 重试）
- src/app/(web)/apply/ApplyClient.tsx（收敛到共享 helper）
- src/lib/__tests__/v12-e2e-01-session-idempotent.test.ts（新增 7 例）

## 后续

- V12-E2E-02：mobile-375 断言修正
- V12-E2E-03：全量 e2e 复跑
