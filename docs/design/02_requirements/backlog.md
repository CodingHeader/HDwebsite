---
id: BACKLOG-001
type: requirement
title: 需求/工作待办池（Backlog）
status: active
owner: AI Agent
created: 2026-10-10
updated: 2026-10-12
---

# Product Backlog（待办池）

> 状态定义（规范 §9）：Proposed（已入 Inbox 待评估）/ Backlog（已评估待排期）/ Ready（已排期条件齐全可执行）/ In Progress / Done / Icebox（暂缓）/ Rejected。
> 排期参照落地顺序 S1~S6（[16-新增设计.md](../16-新增设计.md) §11）；执行从 [current-plan.md](../04_planning/current-plan.md) 进入。

| ID | 标题 | 类型 | 优先级 | 状态 | 来源/方案 |
| --- | --- | --- | --- | --- | --- |
| S1-基建 | 调度基座 + Setting 加密 + Setting 键体系统一迁移（ADR-009）+ Markdown 管线 | Infra | High | **Ready** | SOL-001 / REQ-F-004 / ADR-009 |
| S1-迁移 | C1：News 数据迁入 Article（channel 区分） | Task | High | **Ready** | ADR-001 / DEP-014 |
| S1-安全 | 修复 services/[slug] XSS 净化缺口 | Tech-Debt | High | **Ready** | REQ-NF-002 |
| S1-SEO | 补 sitemap.ts/robots.ts + lang=zh-CN | Tech-Debt | High | **Ready** | REQ-NF-003 |
| S1-埋点 | UserAction 最小埋点接通（表单提交 + 关键页浏览；Q7 轮定，ASM-008） | Tech-Debt | High | **Ready** | 05-交互 §4 / ASM-008 |
| S2 | KBAdapter 外部知识库适配 + 对接 + 本地兜底双轨（ADR-020） | Feature | High | Backlog | SOL-002 / REQ-F-007 / ADR-020 |
| S3 | LLM 多模型网关 + 模型管理页 | Feature | High | Backlog | SOL-003 / REQ-F-008、010 |
| S3 | 官网端 AI 客服升级（SSE 流式；float + apply 双入口，ADR-018） | Feature | High | Backlog | SOL-003 / REQ-F-009 |
| S4 | 采集引擎 + 采集源管理 + 审核队列 | Feature | Medium | Backlog | SOL-004 / REQ-F-002 |
| S4 | 采集默认入知识库（pending 审核） | Feature | Medium | Backlog | SOL-004 / REQ-F-006 |
| S5 | 发布中枢：官网定时/自动发布 | Feature | High | Backlog | SOL-005 / REQ-F-003 |
| S5 | 邮箱提醒（SMTP + 五类事件 + 多收件人） | Feature | High | Backlog | SOL-005 / REQ-F-011 |
| S6 | 公众号账号管理 + 文章发布 | Feature | Medium | Backlog（凭证依赖 DEP-001） | SOL-006 / REQ-F-001、005 |
| S6 | 公众号 AI 客服（被动回复+异步补发） | Feature | Medium | Backlog（凭证依赖 DEP-001） | SOL-006 / REQ-F-009 |
| TD-CRUD | CrudPage 通用组件收敛 25 管理页样板 | Tech-Debt | Medium | Backlog（新页面先行使用） | 08-复用 R2 |
| TD-R1~R7 | 复用不足收敛（requirePermission/集中 zod/日志工具等） | Tech-Debt | Medium | Backlog（随 SOL 就近） | 08-复用 §2 |
| ICE-VEC | 向量语义检索（embedding + 混合检索） | Feature | Low | Icebox | 12-知识库 §3.3 二期 |
| ICE-PG | PostgreSQL 迁移 | Infra | Low | Icebox | 14-存储 S5（P1 触发时评估） |
| ICE-OSS | 上传迁对象存储 | Infra | Low | Icebox | 14-存储 S1 远期 |
| MET-确认 | 成功指标目标值确认（success-metrics.md；M1 验收时，Q7 轮定时点） | Decision | High | Proposed（时点已定） | MET-001 |

## 触发条件备注

- S4 预置数据、S5 联调、S6 启用分别依赖 DEP-004（采集源）、DEP-003（SMTP）、DEP-001（微信凭证）就绪（见 dependencies.md）。
- 任一 Backlog 项进入执行前：确认 current-plan → 创建 TASK → 更新本表状态。

---

## 本轮（2026-10-12，P01~P15）：main 对等缺口与新增需求待办（按方向）

> 来源：[parity-matrix.md](./parity-matrix.md)（行号如 A18）、current-plan §3.2 M-1~M-14、2026-10-12 用户裁决（ADR-024、ADR-025）。状态初值均为 **Ready**（方向提示词即任务卡）；各方向完成并经独立验证后改为 Done，并同步 parity-matrix 状态。

| ID | 方向 | 待办 | parity 行 / MUST | 状态 |
| --- | --- | --- | --- | --- |
| BL-P01-1 | P01 | 需求基线定稿：REQ-F-013/014/015、追溯矩阵、ADR-024/025、AGENTS.md | E2（AGENTS.md）；M-1~M-14 追溯 | In Progress |
| BL-P02-1 | P02 | 前台按 main 原样恢复（红色横幅轮播、11 区块、多级导航、Footer、FloatingContact、各页面区块与筛选） | A1、A2、A4、A5、A7~A16 | Ready |
| BL-P02-2 | P02 | 恢复 main web 设计令牌（品牌红、Geist）与 `<html lang="zh-CN">` | A3 | Ready |
| BL-P02-3 | P02 | 原样恢复 `public/**`（150 个静态资源） | A19 | Ready |
| BL-P02-4 | P02 | 首页各区块加 `data-block` 锚点（为 ADR-024 区块配置铺路，不改样式） | C9 | Ready |
| BL-P02-5 | P02 | 管理端令牌（`[data-theme="manager"]`）+ AppShell + 登录页 | REQ-F-015 / M-3 | Ready |
| BL-P02-6 | P02 | 截图对比门禁 `npm run test:visual` | REQ-F-014 / M-2 | Ready |
| BL-P03-1 | P03 | 文章状态 PATCH（publish/archive） | B3 | Ready |
| BL-P03-2 | P03 | 媒体 PATCH（改名/分类）+ `media/batch` | B7、B8 | Ready |
| BL-P03-3 | P03 | chat-history API + 管理页；logs API + 管理页 | B11、B12、C4、C5 | Ready |
| BL-P03-4 | P03 | 校区图片路径契约：保持扁平 `/api/campus-images` 或补 main 嵌套路由兼容，二选一写入证据 | B6 | Ready |
| BL-P03-5 | P03 | 权限目录补齐 `*:list`（I4） | M-4 | Ready |
| BL-P04-1 | P04 | 迁移 p04：恢复 PageTemplate/ContentBlock/TemplateBlock/ElementConfig + Navigation.templateId；索引；seed 写入 main 原数据与首页默认区块 | C9、C10（ADR-024） | Ready |
| BL-P04-2 | P04 | ViewStats 处置 ADR-026 | D4 | Ready |
| BL-P05-1 | P05 | 报名页 AI 咨询交互与 main 对等；全后台五态与反馈 | A6；M-3/M-6 | Ready |
| BL-P06-1 | P06 | 恢复 block-registry + blocks 契约 + CRUD API；首页按区块配置开关/排序（默认复现 main，visual 门禁） | C9、C10（ADR-024） | Ready |
| BL-P06-2 | P06 | 审核门、采集默认入库（autoToKb）、错误提醒、公众号场景化客服 | F5、F9、F11；M-8/M-12/M-13 | Ready |
| BL-P07-1 | P07 | 组件库 + 全部管理页迁移；TipTap 富文本恢复 | C6、C4/C5（UI）；M-3 | Ready |
| BL-P07-2 | P07 | 管理页：首页区块配置、页面模板、交互点配置（ElementConfig）；通知规则页 | C9、C10；F11（I8） | Ready |
| BL-P11-1 | P11 | 二级菜单重定向 29 条对等 | A18 | Ready |
| BL-P11-2 | P11 | 设置键 68 键对等（advantage1~4、banner*、card*、siteLogoIcon、statsLabel、homeCards…） | A22 | Ready |
| BL-P11-3 | P11 | Dockerfile/docker-compose/.dockerignore 恢复；start-next 生产读 env、不重复构建 | E1、E3 | Ready |
| BL-P11-4 | P11 | 根目录 `CLAUDE.md`（内容 `@AGENTS.md`，与 main 一致） | E2 | Ready |
| BL-P12-1 | P12 | 知识库 Coze 集成：库↔dataset、文件↔document、上传白名单 Word/MD/TXT（拒 PDF/图片）、本地兜底、场景绑定库+模型+提示词+参数 | F6、F7、F9；M-10/M-11/M-12（ADR-025） | Ready |
| BL-P15-1 | P15 | 资源引用完整性；parity 最终收口（missing=partial=dropped=0） | A19；M-1 | Ready |

阻塞/外部依赖：微信凭证（U-B1）与 SMTP 凭证（U-B4）本轮不提供 → 完整实现 + mock 测试，真实联调记 UNKNOWN；Coze dataset 凭证本仓未配置 → 同上。
