# V11-SEC-04 回归修复（e2e 首跑暴露，2026-10-25）
ApplyClient（/apply 招生页 AI 咨询）自造 localStorage sessionId 直连 stream → 会话签名校验后必 400（apply-chat e2e 失败暴露）。修复：改服务端签发同口径（fetchOrReuseSessionId + 400 时 reissueSessionId 重签重试一次）。chat-scene/llm-limits/chat-guard/routes 四个既有测试同步签名 cookie 适配。
