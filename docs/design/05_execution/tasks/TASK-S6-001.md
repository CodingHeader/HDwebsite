---
id: TASK-S6-001
type: task
title: M4a 公众号对接层（凭证后补即插桩，ADR-002）
status: done
plan-ref: master-plan.md §6 S6；SOL-006
milestone: M4
requires: [REQ-F-001, REQ-F-005, REQ-F-009（公众号端）, ADR-002, ADR-006, ADR-013, ADR-023]
created: 2026-10-11
updated: 2026-10-11
---

# TASK-S6-001：公众号对接层

## 目标
按官方 API 全量实现对接层；凭证未配置时明确报错，凭证录入后台即插桩生效；真实端到端发布留待 DEP-001 凭证到位后联调。

## 输出
- src/lib/wechat.ts（token 缓存 7200s 提前 5min 刷新、sha1 排序验签、XML 事件分发、被动回复+48h 客服消息补发（答案走 llm-gateway/Coze）、图片转永久素材→draft/add→freepublish/submit、每日上限与频控、md→公众号 HTML）
- API：wechat/callback（GET echostr / POST 分发，验签 403）、wechat/accounts（加密 CRUD + 掩码 + tokenCache/AESKey 不出接口）、[id]/test
- 管理页：公众号账号（加密凭证 + 测试）

## 验收标准
- [x] 回调验签失败 403；tokenCache 不出接口；appSecret 加密+脱敏
- [x] 无凭证时测试端点返回明确 errMsg（不抛裸错）
- [x] npm run check 绿

## 验证命令
```bash
npm run check && curl -s "localhost:6789/api/wechat/callback?signature=x&timestamp=1&nonce=1&echostr=e" | head -c 40
```

## 证据路径
docs/design/06_validation/evidence/EVD-S6/

## 允许修改 / 禁止修改
- 允许：src/lib/wechat.ts、src/app/api/wechat/**、src/app/manager/wechat-accounts/**
- 禁止：群发接口（MUST NOT）；订阅号客服接口承诺

## 依赖与阻塞
- Depends on：TASK-M2-001（网关）、TASK-M3-002（发布队列）
- Blocks：M4 部署切换演练
- 阻塞条件：DEP-001 微信凭证（用户暂不提供 → 即插桩口径）

## 建议执行档位
opus（官方协议封装与风控）。
## 预估规模
大。已完成（除 DEP-001 真实联调）。
