# V11-LLM-03 补充（主代理落位，2026-10-25）
① 公众号默认场景链补 faq（wechat.ts answerWechatText，需求口径）；② callback 路由接通安全模式 AES（<Encrypt> 四元组验签 → 解密分发 → 加密回包，encodingAESKey 取账号列）；③ 兜底可达性经现状盘点确认为既有正确行为（43a555e 逐供应商闸门），3 例回归固化。
**V11-Q2 登记（MUST 冲突，待用户裁决）**：REQ-F-009 公众号限频默认 10/min vs ADR-034 已采纳冻结默认 20/min（被 settings-registry.test 钉住）。两 MUST 冲突不替用户裁决：维持 ADR-034 现状，改判请提需求变更。
