---
id: PLAN-CURRENT
type: plan
title: 当前轮计划
status: active
owner: 产品所有者
created: 2026-10-10
updated: 2026-10-10
---

# 当前轮计划

## 本轮（已完成）：文档体系全量补充与优化

| 事项 | 状态 |
| --- | --- |
| 根级 01~16 提取文档增"文档体系关联"桥接 | done |
| REQ-F×11 补用户故事与优先级 | done |
| ADR×8 补备选方案 | done |
| SOL×6 补 API/页面/技术选型/风险与数据模型字段表；architecture 增模块-目录映射 | done |
| 治理登记册（术语/干系人/风险/假设/依赖）字段扩充 | done |
| 产品域增强（画像/旅程/指标测量方案）+ 需求可追溯性矩阵 | done |
| milestones 进入/退出标准；validation 用例记录格式与证据目录规范 | done |
| TN-009~014、LL-007、changelog、README 编号对照、talk.md Q4/A4 | done |

## 上轮（已完成）：文档体系落地（55 件，见 talk.md Q3/A3）

## 下一轮：M1 启动（新仓初始化 + S1 基础基座，ADR-011 口径）

先按 05_execution/task-template.md 建任务卡（Q7 轮定：先建卡再开工，不逐卡确认），随后实施：

1. TASK：新仓初始化（脚手架 / env 规范 / CI，ADR-011）
2. TASK：调度基座（CronJob 表 + 循环 + 锁，instrumentation.ts 启动）
3. TASK：Setting 键体系统一 + 加密 + 存量迁移脚本（ADR-009）
4. TASK：Markdown 管线（contentType + MarkdownRenderer + sanitize 统一，REQ-F-004 / REQ-NF-002）
5. TASK：UserAction 最小埋点接通（表单提交 + 关键页浏览，ASM-008，Q7 轮定）
6. TASK：News→Article 数据迁移（ADR-001，dry-run + 回滚）
7. VAL：M1 验收（validation-plan §M1 + 自动 UI 走查留证，Q7 轮定）

## 待用户输入清单

- 微信凭证（appid/secret/白名单 IP）→ M4 联调前
- SMTP 凭证（host/端口/授权码）→ M3 邮件验收前
- 采集目标源清单（首批院校/部门 URL）→ M3 试运行前
- success-metrics 目标值确认 → M1 验收时（埋点走向已定：UserAction 最小接通，Q7 轮）

---

## 更新（2026-10-10 23:15）：提问轮收敛，决策全落定

14 问全部回答，新增 ADR-009~020（详见 03_solution/decisions/）。关键变化：
1. **重构形态 = 平行新仓重写**（ADR-011）→ **M1 重定义：新仓初始化（脚手架/env 规范/CI）+ S1 基础基座（调度/加密/Markdown 管线/Setting 键迁移脚本）**；新增"部署切换方案"任务归 M4。
2. **知识库转向外部平台**（ADR-020）→ M2 缩减为 KBAdapter + 对接 + 双轨兜底。
3. 其余落定：品牌弘道（010）、闲置资产裁剪（012）、服务号（013）、Modelscope 起步（014）、HTML 采集优先（015）、向量二期（016）、SuperAdmin 独享审核（017）、AI 客服双入口（018）、SQLite 保持（019）。
4. 并发写入源已确认全部关闭（Q13），docs/get 后续单写入方。

**待用户输入清单（更新）**：微信凭证（M4）、SMTP 凭证（M3）、首批采集源 URL 清单（M3 试运行）、**外部知识库选型与凭证**（M2 对接前，新增）、success-metrics 指标确认（ASM-008）。

**下一轮**：开工 M1（新仓初始化 + 基础基座）。

## 更新（2026-10-11）：Q7 轮（8 问大白话卡片）收敛

全部按推荐项选定（验收证据方式选加自动 UI 走查）：

1. 推断内容可写入文档，但须标注（推断/依据）——画像、触发信号、证伪影响等按此执行。
2. ASM-008 落定：UserAction 最小接通（表单提交 + 关键页浏览），S1-埋点任务范围明确。
3. success-metrics 目标值 M1 验收时确认（保持 draft 至彼时）。
4. M1 开工方式：先建任务卡（05_execution/tasks/）再实施，不逐卡确认。
5. git 存档：本轮完成后 docs/get 单次提交。
6. 采集源清单：暂无，M3 前提供（维持 DEP-004 登记）。
7. 剩余增补一次干完统一汇报（本轮已按此执行完毕）。
8. M1 起验收加自动 UI 走查留证（validation-plan 通过标准已增补）。

同步收口：risks 增触发信号列、assumptions 增证伪影响列（ASM-002/006/008 更新）、glossary 增平行新仓/KBAdapter/SSE 等术语、stakeholders 增核心诉求列、product-definition 增画像/旅程、product-requirements 增 §6 可追溯性矩阵、TN-009~014、LL-007/008、README §0 编号对照、document-index/project-map 导航一致性、changelog 第七轮、talk.md Q7/A7。

**待用户输入清单（不变）**：微信凭证（M4）、SMTP 凭证（M3）、首批采集源 URL（M3 试运行）、外部知识库选型与凭证（M2 对接前）。

**下一轮**：开工 M1（先建任务卡，再新仓初始化 + 基础基座）。

## 更新（2026-10-11）：Q9 轮（3 问卡片）收敛

1. REQ-F-004（Markdown 发布）保留：用户贴文清单缺少该条，确认仍算数（M1 照旧）。
2. BG1~BG5 基础目标纳入验收门：validation-plan 通用项新增 G5，每个里程碑验收逐条核验，任一不达标不通过。
3. talk.md 记录规则维持：Q/A 逐字 + 卡片记决策总表（用户三遍强调后确认现状合规）。

同步：README §0 计数修正（55+12 ADR=67）、TN-015（新仓 Next.js 版本 breaking changes，开工前必读 node_modules/next/dist/docs/）、document-index/project-map talk 描述更新至 Q1~Q9、changelog 第八轮、talk.md Q8/A8 与 Q9/A9。

**待用户输入清单（不变）**：微信凭证（M4）、SMTP 凭证（M3）、首批采集源 URL（M3 试运行）、外部知识库选型与凭证（M2 对接前）。

**下一轮**：开工 M1（先建任务卡，再新仓初始化 + S1 基础基座，ADR-011 口径）。

## 更新（2026-10-11）：Q10 轮（10 项决策）收敛

1. 采集频率：默认每天 1 次、凌晨执行（默认 04:00 避开 03:00 备份错峰，推断参数），管理端可配置可更改。
2. 邮箱模板：可配置（NotifyTemplate 模型 + 邮件模板管理页 + 规则绑定 templateId，未绑定走默认）。
3. 审核流程：单级审核（SuperAdmin 一审终审，ADR-017 补充）。
4. 内容模型：新建 ContentItem 中枢；Article 保留为官网渠道存储。
5. 采集图片：默认转存本地（反转原"默认不转存"口径；失败降级留原链）。
6. 后台 CRUD：统一 CrudPage（维持）；前台数据：Server Component 直查（维持）。
7. SchemaForm 字段：基础 + 高级；错误处理：全局错误边界 + 统一响应包/toast 组合。
8. 部署切换（M4）：灰度发布（ADR-021 新建；validation-plan 增 M4-7 演练验收）。
9. 14 问未答 4 项处置（维持现状，可下轮修订）：解析规则=每源可配 CSS 选择器（SOL-004 现状）；知识库选型=维持 ADR-020 暂不选定（M2 前定）；余额查询=维持 ADR-005 人工填报；公众号→官网同步=维持一稿多发（BD1/REQ-F-001）。

同步：ADR-021 新建；SOL-004/005、REQ-F-001/002/011、milestones、validation-plan（M4-7）、product-requirements、product-definition §5、new-features §15、README/document-index/project-map 导航、changelog 第九轮、talk.md Q10/A10。

**待用户输入清单（不变）**：微信凭证（M4）、SMTP 凭证（M3）、首批采集源 URL（M3 试运行）、外部知识库选型与凭证（M2 对接前）。

## 更新（2026-10-11）：执行轮 1——M1 落地（步行骨架 + S1 基座）

按既有 Q7 轮流程开工 M1，本轮由自动化执行会话完成（卡在验证后补录，见 talk.md E1/E2）：

1. **新仓初始化**：hdwebsite_1011 独立仓（Next 16.2.1/React 19.2.4/Prisma 7.7+libsql/SQLite/Tailwind v4/zod 4/vitest），Windows 不产 standalone（与 B 仓同口径），start-next.mjs 沿用。
2. **契约冻结落地**：src/contracts（zod 单一源，六份契约见 master-plan §4）；统一响应包 + manager-fetch 解包。
3. **数据模型基线**：42 模型一次成型（含 B 仓补录 Major/EnrollmentOffering，REQ-F-012/ADR-022；裁剪 6 废弃模型），迁移 20261011052216_init。
4. **S1 基座**：auth/RBAC/requireAuth（review:edit 独享）、AES 字段加密、Setting Registry（60 键 16 组，修复 settings 写接口越权缺口）、调度基座（CronJob+锁+backup）、Markdown 管线（双模渲染+入库钩子+净化单点）、SEO 基线、UserAction 最小埋点。
5. **迁移脚本**：News→Article（dry-run 对旧库验证：5 News/25 Article）+ Setting 键迁移（9 键映射）。
6. **验证**：vitest 30/30；npm run check（lint+typecheck+build）全绿；启动冒烟（health/登录/CRUD/401 拦截/埋点/sitemap）通过。
7. **规划包**：master-plan.md（16 节）落盘；M1 任务卡 11 张（done）。

**流程偏差登记**：本轮任务卡为验证后补录（同轮实现），后续切片恢复先卡后码。

**下一轮**：R0 基线重建（前台 13 页 + 后台 25 页 + CrudPage + upload/file + B 域管理页）与 M2（S2 KBAdapter → S3 LLM 网关）按 master-plan §8 并行推进；开工前先建卡。

**待用户输入清单（不变）**：微信凭证（M4）、SMTP 凭证（M3）、首批采集源 URL（M3 试运行）、外部知识库选型与凭证（M2 对接前）。
