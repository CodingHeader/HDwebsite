---
id: TASK-INDEX
type: execution
title: 任务索引
status: active
created: 2026-10-10
updated: 2026-10-10
---

# 任务索引

> 任务文件存放于 `05_execution/tasks/`。规划总纲见 `04_planning/master-plan.md`（DAG/所有权/档位）。

## 任务列表

| ID | 任务 | 里程碑 | 状态 | 关联 |
| --- | --- | --- | --- | --- |
| TASK-M1-001 | 新仓初始化（脚手架/env/启动链路） | M1 | done | ADR-011 |
| TASK-M1-002 | 契约源冻结（src/contracts zod） | M1 | done | master-plan §4 |
| TASK-M1-003 | 数据模型基线（42 模型 + init 迁移） | M1 | done | ADR-022/REQ-F-012 |
| TASK-M1-004 | 认证与权限基座 | M1 | done | 契约③ |
| TASK-M1-005 | 统一响应包与后台 fetch | M1 | done | 契约② |
| TASK-M1-006 | Setting Registry 统一 + 加密 + 键迁移 | M1 | done | ADR-009 |
| TASK-M1-007 | 调度基座（CronJob/锁/backup） | M1 | done | SOL-001 |
| TASK-M1-008 | Markdown 管线（钩子/渲染/净化） | M1 | done | REQ-F-004 |
| TASK-M1-009 | SEO/lang 基线 | M1 | done | REQ-NF-003 |
| TASK-M1-010 | UserAction 最小埋点 | M1 | done | ASM-008 |
| TASK-M1-011 | 迁移脚本 + seed + M1 端到端验证 | M1 | done | ADR-001 |

| TASK-R0-001 | 站点基线重建（CRUD 工厂+全资源+前后台页面+媒体） | R0 | done | ADR-022 |
| TASK-M2-001 | 知识与智能（KBAdapter+Coze+LLM 网关+SSE 客服） | M2 | done | ADR-023 |
| TASK-M3-001 | 采集引擎（5 源+审核+图片转存） | M3 | done | SOL-004 |
| TASK-M3-002 | 发布中枢与邮箱提醒（SMTP 降级运行） | M3 | done | SOL-005 |
| TASK-S6-001 | 公众号对接层（凭证后补即插桩） | M4 | done | SOL-006 |

## R0 / 后续切片（开工前建卡）

- ~~R0 基线重建 / M2 / M3 / S6 对接层~~ → 已完成（见上表；真实联调项见待用户输入清单）
- M4 剩余：部署灰度切换演练（ADR-021，待 DEP-001/003 凭证与生产环境）

## 登记规则

- 新建任务：复制 task-template.md → 改 id/内容 → 在上表插行（ID 升序）
- 完成任务：状态改 done，DoD 证据链接填入备注
