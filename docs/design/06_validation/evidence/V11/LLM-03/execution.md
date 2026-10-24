# V11-LLM-03 执行证据：兜底可达性 + 公众号客服安全模式 + 默认场景/风控频率核对

## 5W1H 简版

- What：①限频/配额命中不短路兜底链（回归固化）；②公众号安全/兼容模式 AES 解密助手；③默认场景与
  风控频率与需求文档核对。
- Where：`src/lib/llm-gateway.ts`（不改——见现状盘点）、`src/lib/llm/wechat-crypto.ts`（新增）、
  `src/lib/__tests__/v11-llm-03-fallback-aes.test.ts`（新增 12 例）。

## 现状盘点（读真实代码核实审计声明）

### §LLM.3 限频/配额命中时兜底不被尝试 —— 与现状不符（以代码为准）

`gatewayChat`/`gatewayChatStream`（commit 43a555e 起）为**逐供应商**闸门：
`quotaSkipReason(provider)` / 熔断判断命中仅 `continue` 当前供应商，循环继续到后续供应商；
兜底（isFallback）供应商免熔断（`&& !provider.isFallback`），且排在路由序末位必达。
**主模型限频/配额满时兜底仍被调用**——新增 3 个 mock 回归用例固化（限频跳过→兜底、配额满跳过→兜底、
上游失败→兜底），防未来回归。审计声明按现状闭环，未改网关逻辑。

### §LLM.4 公众号客服安全模式 AES —— 缺失属实，按授权落位 llm/ 侧

`src/lib/wechat.ts` `parseIncomingXml` 只解析 `<Content>`，无 `<Encrypt>` 节点处理——加密模式
（安全/兼容）回调全部落空，属实。因 `wechat.ts` 本轮所有权在 WX lane（本 lane 禁碰），按执行指令
改为在 llm/ 侧新建 `src/lib/llm/wechat-crypto.ts`（**越界报备**：该文件是执行指令明示的落位路径）：

- `resolveAesKey`（43 位 EncodingAESKey → 32B key；IV=key[0:16]）
- `decryptWechatSafeMessage`（random16+msg_len4B 大端+msg+receiveId 口径；PKCS#7(32) 手工去填充，
  `setAutoPadding(false)`——微信块 32 口径与 OpenSSL 默认 16 不兼容，必须手工去填充）
- `encryptWechatSafeMessage` / `encryptWechatSafeReplyXml`（安全模式被动回复完整 XML：Encrypt+MsgSignature+TimeStamp+Nonce）
- `verifyWechatSafeSignature`（sha1 sort([token,timestamp,nonce,encrypt])，区别于旧明文三元组）
- `extractEncryptNode` / `decryptWechatCallbackPayload`（配置驱动 strict=安全模式：解密失败不回落明文；
  非 strict=兼容模式：可按 fallback 回落；无 Encrypt=明文直通）

**接线缺口（WX lane 落位即可，改动点 2 处）**：
1. `wechat/callback/route.ts` POST：body 含 `<Encrypt>` 时先 `decryptWechatCallbackPayload`，用解密出的
   XML 调 `handleCallback`（GET 验签在安全模式下需用四元组 `verifyWechatSafeSignature`）；
2. `wechat.ts` 安全模式被动回复：`handleCallback` 返回值改走 `encryptWechatSafeReplyXml`。
   密钥来源 `WechatAccount.encodingAESKey`（schema 已有列）；strict 开关建议随微信后台实际配置（无独立列）。

### §LLM.5 默认场景与风控频率核对 —— 核对完成，两处偏差登记（不替用户裁决）

| 项 | 需求（REQ-F-009） | 现状代码 | 处置 |
| --- | --- | --- | --- |
| 客服限频默认值 | "每用户限频（**默认 10 次/分钟**）" | `chatGuardRateLimitPerMin` 默认 "20"（settings-registry.ts:157）+ `GUARD_DEFAULT_RATE_LIMIT=20`（llm/guard.ts），且被 ADR-034 §2.3 采纳为固定默认值、由 `settings-registry.test.ts:49`（`toBe("20")`）钉住 | **UNKNOWN（MUST 冲突）**：改默认值将与已采纳 ADR-034 及其钉住测试直接冲突，按代理规则不替用户裁决；功能层面管理员可在后台把该键配为 10（设置运行时可改）。需主代理裁决（二选一：改默认+同步 ADR/测试，或维持 20 并修订 REQ-F-009 口径） |
| 公众号默认场景 | "绑定 ChatScene（**默认 faq 场景**）" | `wechat.ts:136` 回落链 = account.sceneId → code:"wechat"（种子无此场景，永不命中）→ code:"float"；无 "faq" 回落 | **UNKNOWN（所有权禁碰）**：一行修复（"float"→"faq"）位于 `wechat.ts`，本轮该文件在 WX lane 名下禁碰；修复点已在上面"接线缺口"后登记，请编排方转 WX lane 或主代理裁决 |

## 验收逐条

| 验收标准 | 结果 | 证据 |
| --- | --- | --- |
| 主模型限频时兜底仍被调用（mock） | PASS | 3 个回归用例（限频跳过→兜底、配额满→兜底、上游失败→兜底），providerName 均为兜底供应商 |
| AES 密文消息可解密回复（mock） | PASS | 12 例：裸 crypto 交叉构造密文解密、receiveId 防重放、坏密钥/坏填充类型化报错、加解密 round-trip、四元组签名、CDATA 提取、兼容/安全/明文三模式、加密回复 XML 签名可验 |
| 默认场景/频率与需求一致 | UNKNOWN | 见 §LLM.5 表：两处偏差已核实、已登记，均非本 lane 可裁决/可触碰范围 |

## 命令输出摘录

```
npx vitest run src/lib/__tests__/v11-llm-03-fallback-aes.test.ts
 Test Files  1 passed (1)
      Tests  12 passed (12)
```

## UNKNOWN 汇总

1. `chatGuardRateLimitPerMin` 默认值 REQ（10）vs ADR-034 冻结（20）——报请裁决。
2. 公众号默认场景 faq 回落——`wechat.ts` 所有权在 WX lane，修复点已登记待落位。
3. 安全模式 strict 开关的配置化——WechatAccount 无 encryptMode 列（schema 冻结），按"微信后台配置+
   调用方传 strict"口径实现；真实联调随微信凭证后补（既有 UNKNOWN 口径）。
