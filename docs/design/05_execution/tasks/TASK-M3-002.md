---
id: TASK-M3-002
type: task
title: M3b 发布中枢与邮箱提醒（PublishJob 状态机 + Notify 网关，SMTP 降级运行）
status: done
plan-ref: master-plan.md §6 M3；SOL-005
milestone: M3
requires: [REQ-F-003, REQ-F-011, ADR-004, ADR-008, ADR-017]
created: 2026-10-11
updated: 2026-10-11
---

# TASK-M3-002：发布中枢与邮箱提醒

## 目标
ContentItem → PublishJob 状态机 → website 执行器写 Article / wechat 执行器委托 SOL-006；发布前邮件提醒 + 五类事件通知（SMTP 未配置时 skipped(smtp_not_configured) 降级留痕）。

## 输出
- src/lib/publish-executor.ts（publish/update/offline 三动作、指数退避 ≤3 次、失败 job_failed 事件、wechat 失败渠道行复用防堆积）
- src/lib/notify-gateway.ts（规则→组→模板渲染→异步投递；dead 终态防风暴；聚合限频；notifyRetryScan/publishRemindScan/llmBalanceCheck）
- 调度任务：publish.scan / notify.scan / retry.failed / llm.balance-check 全部注册
- API：publish-jobs（工厂+retry/cancel）、notify-rules、notify-recipients/templates/records（工厂）、settings/email/test
- 管理页：内容中枢（一键发官网/公众号）、发布任务（Tab+重试/取消）、通知三页

## 验收标准
- [x] SMTP 未配置 → NotifyRecord 状态 skipped(smtp_not_configured)，不阻塞发布主流程
- [x] 通知风暴修复：聚合含未成功记录 + dead 终态 + system_error 不派生
- [x] npm run check 绿；冒烟通过（创建任务/重试/取消 + 频控）

## 验证命令
```bash
npm run check
```

## 证据路径
docs/design/06_validation/evidence/EVD-M3/

## 允许修改 / 禁止修改
- 允许：src/lib/{publish-executor,notify-gateway}.ts、src/app/api/{publish-jobs,notify-*,content-items}/**、src/app/manager/{publish-jobs,content-hub,notify-*}/**
- 禁止：src/contracts/**

## 依赖与阻塞
- Depends on：TASK-M3-001、TASK-M2-001
- Blocks：S6 联调
- 阻塞条件：DEP-003 SMTP 凭证（用户暂不提供 → 降级运行，真实投递后补即通）

## 建议执行档位
sonnet。
## 预估规模
大。已完成。
