---
id: REQ-F-011
type: requirement-feature
title: 邮箱提醒（多人、五类事件）
status: approved
owner: 产品所有者
created: 2026-10-10
updated: 2026-10-10
---

# REQ-F-011：邮箱提醒

## 1. 基本信息

| 项 | 值 |
| --- | --- |
| 类型 / 状态 | functional / approved |
| 来源 Inbox | REQ-INBOX-20261010-001（新增设计第 11 条） |
| 对应原编号 | N11 |
| 优先级 | P0（M3） |

## 2. 背景

发布动作、模型余额、系统异常目前均无主动通知，运营与负责人只能事后发现问题，缺少统一提醒通道。

## 3. 目标

SMTP 邮箱提醒支持多收件人、按事件分组，覆盖发布前提醒、余额不足、报错三类场景五类事件。

### 用户故事

作为机构负责人，我想在发布前、余额不足、系统报错时收到邮件提醒，以便及时掌握与纠错。

## 4. 需求描述

模型四件套：NotifyRecipient（提醒人：name/email/groups/enabled）、NotifyRule（规则：event/enabled/收件组/静默时段/templateId?）、NotifyTemplate（邮件模板：name/subject/body，变量 {title,time,detail,link}，未绑规则走事件默认模板；Q10 轮定可配置）、NotifyRecord（发送留痕：status/retries/errMsg）。
事件枚举（五类）：`before_publish_news` / `before_publish_info` / `before_publish_wechat`（发布前三类，仅通知语义：默认提前 30 分钟可配，立即发布即时通知）、`llm_balance_low`（余额低于阈值）、`system_error`（报错，含 job_failed/collect_failed 聚合，同类错误 10 分钟内只发 1 封）。
SMTP 配置走 Setting email 分组（host/port/secure/username/password 加密/from）+ 连接测试按钮。发送：异步队列不阻塞主流程、失败重试 3 次（指数退避）、全留痕可查。

## 5. 范围

### In Scope

- 三模型 + SMTP 配置 + 提醒人/规则管理页 + 发送记录页
- 五类事件接线（发布前三类挂 PublishJob、余额挂填报检查、报错挂全局错误边界与调度失败钩子）

### Out of Scope

- 短信/微信通知渠道（网关抽象预留，仅邮件实现）
- 邮件营销群发（仅事务性提醒）
- 收件人订阅自助管理（后台维护）

## 6. 约束与依赖

- ADR-004（SMTP 后台配置后补，DEP-003 联调依赖）、ADR-008（仅通知非审批门）
- 邮件模板变量：{title, time, detail, link}；模板可配置（Q10 轮定），内置简洁 HTML 默认模板

## 7. 验收条件

- [ ] SMTP 配置 + 连接测试通过（凭证就绪后）
- [ ] 多收件人（≥2）分组生效：发布组收发布提醒、运维组收报错/余额提醒
- [ ] 定时发布前按提前量发出通知（默认 30 分钟，可配）
- [ ] 立即发布场景发出"即将发布"即时通知
- [ ] 余额低于阈值触发 llm_balance_low 邮件
- [ ] 报错聚合限频生效（同类 10 分钟 1 封）
- [ ] 邮件模板可配置：新建/编辑模板并可绑定规则，未绑规则走默认模板（Q10 轮定）
- [ ] 发送失败自动重试 ≤3 次且 NotifyRecord 全留痕
- [ ] 邮件发送不阻塞发布/请求主流程（异步）

## 8. 影响分析

- 全局 error 边界与 API catch 钩子接入通知网关；调度基座任务失败统一接 job_failed

## 9. 关联文档

- Solution：SOL-005
- Decision：ADR-004、ADR-008
- 设计提取：16-新增设计 §9
- Plan：M3（S5）
