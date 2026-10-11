---
id: CHANGELOG
type: changelog
title: 变更日志
status: active
created: 2026-10-10
updated: 2026-10-10
---

# 变更日志

> 格式：日期 + 类型（docs/design/feat/fix/refactor）+ 摘要。产品级发布记录（REL-xxx）待首个功能里程碑交付时创建 `07_release/release-records/`。

## 2026-10-10

- **docs**：完成全套设计提取，建立 docs/get/ 中文文档体系（README + 01~16 提取文档 + talk.md）。
- **docs**：确认 8 项决策（C1~C8）：News 并入 Article；公众号官方 API 凭证后补；采集源后台配置；SMTP 后补；OpenAI 兼容端点+人工余额；公众号 AI 客服两段式；删除英文草稿；发布前提醒仅通知。
- **docs**：修订提取文档实证错误——FloatingContact 无埋点（05-交互 §4 改为死管道证据表）、后台页面计数 19→25+login、埋点链路/ElementConfig/starters 死字段澄清。
- **docs**：落地项目文档管理体系（项目完整文档体系.txt v1.1 规范）：00_governance ~ 08_knowledge 全域 55 件文档、需求/方案/决策/规划/验证五链路 ID 体系。

## 待办（下一条目预计）

- M1 基础基座交付记录（S1，见 04_planning/current-plan.md）

## 2026-10-10（第五轮）：全文件补充优化
- 根级 03/04/05/06/07/09/10/11/12/13/14/15 共 12 份提取文档追加"第二轮实测"补充节（数据源：seed.ts 全量、settings-registry 全量 40 项、block-registry 8 区块、三场景种子、知识种子 tag 体系、六宫格 slug、/api/settings 实测、public 实际结构、21 脚本清单）。
- 新增冲突 **C9（Setting key 双体系）** 登记：01/04/11/16/README 五处同步，状态 ⏳ 待确认（建议 ADR-009：统一 Registry 体系 + 存量迁移）。
- 安全缺口登记：POST /api/settings 无 setting:* 权限点（03 §8.1、13 §7、16 §13.2）。
- 并发异常：已删除的英文草稿 00_requirements.md 于 22:53 被再次重建（内容勾选状态被伪造为已完成），按 ADR-007 既有决策再次删除；若再次出现需排查并发写入源。

## 2026-10-10（第六轮）：提问收敛，决策全落定（ADR-009~020）
- 14 问 4 批全部回答：C9 统一 Registry（009）、品牌弘道（010）、**平行新仓重写**（011）、闲置资产裁剪（012）、已认证服务号（013）、LLM 沿用 Modelscope（014）、采集 HTML 优先（015）、向量二期（016）、SuperAdmin 独享审核（017）、AI 客服双入口（018）、SQLite 保持（019）、**外部知识库对接/项目内不部署**（020，关键转向）。
- 同步修订：16-新增设计 §13.3、12-知识库设计 §5（转向）、SOL-002、REQ-F-006/007、current-plan、milestones、document-index、README。
- 并发写入源确认已全部关闭（Q13）；下一轮开工 M1（新仓初始化 + 基础基座）。

## 2026-10-11（第七轮）：Q7 提问轮（8 问）+ 治理/产品域增补收口

- **decision**：8 问大白话卡片全部回答——推断内容可写须标注；UserAction 最小接通（表单提交+关键页浏览，ASM-008 落定）；指标目标值 M1 验收时定；M1 先建任务卡再开工；git 本轮单次存档；采集源清单 M3 前给；剩余增补一次干完；M1 起验收加自动 UI 走查。
- **docs**：治理登记册增列——risks 增触发信号列（RISK-002/005/009 同步 ADR-013/017/011 口径）、assumptions 增证伪影响列（ASM-002/006/008 更新）、glossary 增平行新仓/KBAdapter/SSE/instrumentation 等术语、stakeholders 增核心诉求列与 ADR-017 审核权注记、dependencies 完善变更监控。
- **docs**：产品域——product-definition 增 §3.1 用户画像/§3.2 核心旅程/重构形态（ADR-011）；success-metrics 增 §6 度量节奏、§5 落定埋点走向与目标值时点；product-requirements 增 §6 可追溯性矩阵（原 §6/§7 顺延为 §7/§8）。
- **docs**：执行域——backlog S1-基建/S1-埋点/S2/S3/MET-确认 对齐 ADR-009/011/018/020 与 Q7 决策；validation-plan 通过标准增自动 UI 走查；current-plan 下一轮对齐 ADR-011 新仓口径并记 Q7 更新。
- **docs**：知识域——technical-notes 增 TN-009~014；lessons-learned 增 LL-007（规范裁剪）/LL-008（计划 done 须文件实态核验）。
- **docs**：导航一致性——document-index/project-map 描述更新（Q1~Q7、ADR-001~020、可追溯性矩阵、SOL 状态 proposed 口径）；README §0 增编号对照与可追溯性入口。
- **docs**：talk.md 增 Q7/A7（逐字）。

## 2026-10-11（第八轮）：Q9 提问轮（3 问）+ 基础目标纳入验收门

- **decision**：3 问全按推荐项——①REQ-F-004 Markdown 发布保留（用户贴文清单缺该条，确认系遗漏，M1 照旧）；②BG1~BG5 基础目标纳入验收（validation-plan 通用项新增 G5，每里程碑逐条核验、不达标不通过）；③talk.md 卡片记法维持决策总表（用户三遍强调"原封不动"后确认现状合规）。
- **docs**：validation-plan 增 G5 基础目标门与通过标准说明；product-definition §5 增验收挂接注记；README §0 体系计数修正（55+12=67）；technical-notes 增 TN-015（新仓 Next.js 版本必读本地文档）；document-index/project-map talk 描述更新至 Q1~Q9；current-plan 增 Q9 更新节。
- **docs**：talk.md 增 Q8/A8（置信度问询）、Q9/A9（逐字+决策总表）。
- **docs**（第八轮补）：注册并发出现的 new-features.md（N1~N11 综合设计，内容核验与 ADR-001~020 一致，映射行 2 处笔误修正；README §1/document-index §10/project-map §1·§3 登记）；LL-009（git add 前核验增量清单）；A9 补记入 talk.md。

## 2026-10-11（第九轮）：Q10 提问轮（10 项决策）落盘

- **decision**：10 项决策——①采集默认每天 1 次凌晨执行、管理端可配（默认 04:00 为推断参数）；②邮件模板可配置（新增 NotifyTemplate 模型）；③单级审核（SuperAdmin 一审终审）；④新建 ContentItem 中枢、Article 保留为官网渠道存储；⑤采集图片默认转存本地（**反转 SOL-004 §3.4 原口径**，失败降级留原链）；⑥统一 CrudPage；⑦Server Component 直查；⑧SchemaForm 字段=基础+高级；⑨错误处理=全局错误边界+统一响应包/toast 组合；⑩M4 部署切换=灰度发布。
- **docs**：SOL-004（cron 默认凌晨/流程增图片转存步骤/§3.4 反转/§4 cron 字段）、SOL-005（NotifyTemplate 模型/邮件模板管理页/API 增 templates/单级审核注/ContentItem 行注）、REQ-F-001（+2026-10-11 决策更新节）、REQ-F-002（§4/§5/§7）、REQ-F-011（模型四件套/模板可配置/验收）、ADR-011/ADR-017（+Q10 补充）、**ADR-021 新建（部署切换灰度发布）**。
- **docs**：milestones M4 灰度注记、validation-plan 增 M4-7（灰度切流与回滚演练）、product-requirements 矩阵 NF 行挂 ADR-021、product-definition §5 增 Q10 确认注（BG3/BG4/BG5）、new-features.md 增 §15 决策表、README（ADR-021/计数 68 件/编号对照/LL·TN 计数/new-features 行）、document-index（ADR-021 链接/talk Q1~Q10）、project-map（decisions 021/talk Q1~Q10）。
- **docs**：current-plan 增 Q10 更新节；talk.md 增 Q10/A10（逐字）；A10 含 14 问中未答 4 项（Q10-1~4）处置说明（维持现状口径，可下轮修订）。

## 2026-10-11（第十轮）：执行轮 E1——M1 步行骨架与 S1 基座落地

- **feat**：新仓 hdwebsite_1011 初始化（Next 16.2.1/React 19.2.4/Prisma 7.7+libsql/SQLite/Tailwind v4/zod 4/vitest；Windows 不产 standalone）。
- **feat**：契约源 src/contracts（zod 单一源：信封/分页/错误码/权限点/登录/文章/设置/埋点），统一响应包 + manager-fetch 解包（401 自动登出）。
- **feat**：数据模型基线 42 模型（裁剪 News/PageTemplate/ContentBlock/TemplateBlock/ElementConfig/AIConfig；保留 Knowledge 兜底），迁移 20261011052216_init。
- **feat**：B 仓业务域补录（Major/EnrollmentOffering + Course/HotMajor/Category/Partner 扩展字段）——新增 REQ-F-012 与 ADR-022（修复设计文档提取口径缺口，RISK-022）。
- **feat**：认证与权限基座（JWT HS256 7d/RBAC 四级匹配/requireAuth 单点/review:edit SuperAdmin 独享）+ AES-256-GCM 字段加密（ENCRYPTION_KEY 派生）。
- **feat**：Setting Registry 统一（60 键/16 组，ADR-009 扁平 camelCase；新增 email/collect/llm/notify/publish/wechat-mp 分组）；GET /api/settings 收紧单一对象形态；PUT 补 setting:edit 权限（闭合原越权缺口）。
- **feat**：调度基座（CronJob 表驱动 + 每分钟扫描 + lockedAt 心跳锁 10min 僵死释放 + 任务注册表 SSOT + backup 每日 03:00 保留 14 份；cron-parser v5 CronExpressionParser 接线）。
- **feat**：Markdown 管线（contentType 双模 + excerpt/首图入库钩子 + MarkdownRenderer GFM/高亮/懒加载 + html 出口统一净化）。
- **feat**：SEO 基线（lang=zh-CN + sitemap 动态单源 + robots 禁爬后台）；UserAction 最小埋点接通（page_view + __hdTrack.submit，ASM-008）。
- **feat**：迁移脚本：News→Article（dry-run/apply 备份/rollback 报告制）与 Setting 键迁移（旧库 dry-run 验证：5 News/25 Article、9 键映射）。
- **feat**：前台/后台骨架页（首页/文章列表/详情/登录/仪表盘/文章管理）+ seed 幂等基线（角色/admin/菜单/设置/示例/场景/CronJob/通知默认）。
- **test**：vitest 30 用例全绿（markdown 7/crypto 4/slug 3/权限 4/registry 6/cron 6）；npm run check（lint+typecheck+build）全绿；启动冒烟通过（health/登录/CRUD/越权 401/埋点/sitemap）。
- **docs**：master-plan.md（16 节规划总纲：契约冻结/DAG/所有权矩阵/档位预算/基线指标/自检）；M1 任务卡 TASK-M1-001~011（done）；task-index/current-plan/talk 同步。
- **流程偏差登记**：本轮任务卡为验证后补录（同轮实现）；后续切片恢复先卡后码（Q7 轮口径）。

### 2026-10-11（第十轮补）：独立审查与修复

- **review**：双子代理独立审查（代码 + 文档）——代码 PASS-WITH-ISSUES（1×P0/5×P1/15×P2），文档 PASS-WITH-ISSUES（1×P1/4×P2）；报告全文见 EVD-M1/verification.log 附录与任务卡。
- **fix（P0）**：xss-filter isSafeUrl 实体编码绕过——改为"实体解码 + scheme 白名单"，3 个回归用例（P0 由具备 article:create 权限者对前台访客构成存储型 XSS，REQ-NF-002 硬要求）。
- **fix（P1）**：公开文章列表/详情草稿泄露；settings 解密值越权读取（非 setting:list 仅 isPublic + 加密键脱敏回显）；OperationLog 泄密（加密键掩码）；文章编辑覆盖手工摘要/封面（存量兜底）；净化器空白压平破坏 <pre> 排版。
- **fix（P2 择要）**：JWT algorithms 显式化、P2002/P2003→400、slug 契约与 slugify 对齐（中文合法）、调度 execute 抢锁 + 失败推进 lastRunAt、backup 改 VACUUM INTO 快照、键迁移脚本 apply 前备份、uploads rewrite 标注预留。
- **docs**：document-index/project-map/README(83 件)/product-requirements 追溯矩阵同步执行轮；任务卡证据路径修正。
- **test**：修复后 vitest 33/33（新增 XSS 回归 3 例）；npm run check 全绿。
- **遗留（登记不阻塞）**：埋点/登录频控（R0）、列表响应瘦身为 articleSummarySchema（R0）、viewCount 显式路由化（R0）、seed/scripts 纳入 typecheck（R0）、busy_timeout 适配器评估（RISK-007 观察）。
