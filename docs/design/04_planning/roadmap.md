---
id: ROADMAP
type: roadmap
title: 项目路线图
status: active
owner: 产品所有者
created: 2026-10-10
updated: 2026-10-21
---

# 项目路线图

> **2026-10-21（W2-06）状态校准**：本文件原为 2026-10-10 的初始规划（全部 planned）。经 P0~P15、Wave 0~2、V0.7 单主线三轮推进，下表的里程碑状态已按**真实代码与证据**更新。
> 当前规划入口：`docs/V0.7-20261019/README.md`；进度详情见 `04_planning/current-plan.md` §2026-10-21 终态；功能对等见 `02_requirements/parity-matrix.md`。

## Phase 1：设计提取与决策（✅ 已完成，2026-10-10）

- 全套设计提取（docs/get/ 01~16 + README + talk.md）
- 11 项新增设计成稿（N1~N11）
- 冲突澄清 8 项决策确认（C1~C8 → ADR-001~008）
- 文档管理体系落地（00_governance ~ 08_knowledge）

## Phase 2：基础基座 + 知识库 + AI（✅ 已完成）

- S1 基础基座：调度循环、Markdown 管线、净化统一、lang/SEO 基线、News→Article 迁移（SOL-001）
- S2 知识库三级模型与三类管理（SOL-002）
- S3 LLM 网关、多模型路由降级、官网端流式客服（SOL-003）
- 退出标准：M1+M2 验收通过（06_validation/validation-plan.md）

## Phase 3：自动化闭环（✅ 已完成）

- S4 采集引擎 + 默认入知识库（SOL-004）
- S5 发布中枢 + 邮箱提醒（SOL-005）
- 退出标准：采集→审核→发布→提醒 全链路演练通过
- 证据：`evidence/V7/B-05`、`B-06`、`D-11`、`D-12`；E2E `collect-publish` 通过

## Phase 4：公众号对接（✅ 已实现，真实联调 UNKNOWN）

- S6 公众号账号/发文/AI 客服（SOL-006，凭证就绪后联调）
- **已实现**：B-07 完成图文发布闭环（正文外链图 `uploadimg` 转存、`freepublish/get` 回写 externalUrl、60s 跨进程节流、多渠道一次发布、渠道级状态 DTO）
- **UNKNOWN**：微信 API / SMTP / Coze 真实凭证缺失，全部以 mock 验证（AGENTS.md §2 口径）
- 展望（Icebox，不承诺）：向量检索（ICE-VEC）、PostgreSQL 迁移（ICE-PG）、OSS 对象存储（ICE-OSS）、埋点链路复活（ASM-008 落地后）、Setting 变更单定时生效、场景级模型路由

## 里程碑速览

| 里程碑 | 内容 | 状态 |
| --- | --- | --- |
| M1 | S1 基础基座 | **done**（Wave 0 收口） |
| M2 | S2 + S3 | **done**（Wave 1 C 线 + B 线） |
| M3 | S4 + S5 | **done**（Wave 1 B/C/E 线） |
| M4 | S6 公众号 | **done（实现）/ UNKNOWN（真实联调）** |

## V0.7 收尾阶段（当前）

| 阶段 | 内容 | 状态 |
| --- | --- | --- |
| Wave 0 | 契约冻结 + 基础基座（W0-01~W0-13） | ✅ done |
| Wave 1 | 五线并行（A/B/C/D/E，lane 分支，已合入并删除） | ✅ done |
| Wave 2 | 集成与终审（W2-01~W2-09、V7-V-*、V7-SEC-*、V7-UI-*） | 🔄 进行中：W2-08 ✅、W2-02 ✅、W2-06 ✅；W2-04 BLOCKED、W2-07 待开工 |
| 交付 | W2-07 独立终审 → 推送 `upgrade` → 打包 | ⏳ 待开工 |

详见 milestones.md 与 backlog.md。
