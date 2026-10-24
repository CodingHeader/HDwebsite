# V11-SEC-04 执行证据（2026-10-24）

## 5W1H 简版

- **What**：① chat 会话由服务端签发并校验签名（原 stream 裸信 body.sessionId，可读写他人会话历史——`chat-service.ts:85` loadHistory 直查）；② 采集出网统一过 SSRF 黑名单（原 fetch 无任何目标校验，源/RSS 图片地址可指向内网）。
- **Why**：会话劫持（隐私+污染）与 SSRF（内网探测/云元数据 169.254.169.254）均为可直接利用面。
- **Where**：`src/lib/chat-service.ts`（+签发/校验助手）、`src/app/api/chat/session/route.ts`（新）、`src/app/api/chat/stream/route.ts`、`src/components/web/ChatWidget.tsx`、`src/lib/collect-engine.ts`（assertPublicHttpUrl + fetchWithSignalResponse 咽喉点）。
- **How**：HMAC-SHA256(JWT_SECRET) 签名 cookie（HttpOnly/SameSite=Lax）；stream 只认有效签名、body.sessionId 与 cookie 不一致即 400；SSRF fail-closed（私网/环回/链路本地/CGNAT/内网主机名/非 http(s) 全拒，DNS 解析失败拒发）。

## 现状盘点

- 审计声明属实（chat-service.ts:86、user-actions 之外的采集 fetch 均无校验）。
- 契约 `chatRequestSchema` 已限 sessionId 8-64 字符，但低熵字符串（"12345678"）仍可碰撞/抢占——服务端签发后该面关闭。

## 验收逐条结果

| 条目 | 结果 | 证据 |
|---|---|---|
| 未签名/他人 sessionId 无法读写会话 | **PASS** | v11-sec04 测试 7/7：篡改签名 null、无 cookie 400、body≠cookie 400、一致放行 |
| SSRF 目标黑名单生效 | **PASS** | 127/10/192.168/172.16-31/169.254/0./CGNAT/::1/fe80/fc00/localhost/.internal/非 http(s) 全拒；公网字面量放行；解析失败 fail-closed |
| 正常流程不回归 | **PASS** | 契约 SSE 测试 4/4（更新为签名 cookie 模式，vi.mock 改 importOriginal 部分模拟）；ChatWidget 改服务端签发（本地缓存 id 与 cookie 成对）；tsc 0 错（本人文件） |
| 公众号通道不受影响 | **PASS** | openId 为 identifier 的路径不经 cookie 校验（wechat-chat.test 不触 stream 路由） |

## 已知边界（记录）

- DNS rebinding TOCTOU 窗口存在（fetch 内部二次解析）；与本项目"无代理出网/无无头浏览器"部署形态匹配的前置校验层级，注释已写明。
- stream 对无 cookie 的直接 POST 返回 400——旧版直接 POST 的集成方需先取会话（ChatWidget 已同步改造）。

## 改动文件

- src/lib/chat-service.ts、src/app/api/chat/session/route.ts（新）、src/app/api/chat/stream/route.ts、src/components/web/ChatWidget.tsx、src/lib/collect-engine.ts
- src/lib/__tests__/v11-sec04-session-ssrf.test.ts（新 7 断言）、tests/contract/chat-stream-sse.test.ts（适配）
