---
id: CHANGELOG
type: changelog
title: 变更日志
status: active
created: 2026-10-10
updated: 2026-10-23
---

# 变更日志

> 格式：日期 + 类型（docs/design/feat/fix/refactor）+ 摘要。产品级发布记录（REL-xxx）待首个功能里程碑交付时创建 `07_release/release-records/`。

## 2026-10-22 ~ 10-24（V0.8 重建收尾 + V0.9 CI 真相轮）

- **feat（V0.8 全轮 18 卡）**：upgrade 分支重建收官——依赖安全（next 16.4.2 修 RCE、sharp/vitest 升级、审计门禁 `check:audit`）、测试补强（撤 3 条过期 skip、SSE 契约、lint 0 warning 锁死、全路由 withApi、e2e 撤 skip 修复知识库上传 404）、视觉基线（确定性 seed 数据集 + Linux visual CI job）、管理端五态补齐（7 页 ErrorState + 5 页骨架）、微信/SMTP/Coze 冒烟脚本（dry-run 默认）、Docker 部署件。证据 `evidence/V8/**`（15 卡 execution + 全部 verify.md）。
- **fix（V0.9 / CI-01）**：CI 门禁三重修复——gate 构建前 migrate（ci-build.db 无表致静态导出炸）、visual job `npm ci --include=dev`（NODE_ENV=production 跳过 devDeps）、Dockerfile builder 加一次性已迁移库 + `.dockerignore` 取消 scripts 排除；**新增 docker job：镜像构建+探活全绿，V8-REL-01 解除阻塞**。
- **fix（V0.9 / VIS-03）**：visual 参照基线重生成收口——CI 分诊 41 fail 全部归因为数据差/数据面缺口（0 样式回归，REQ-F-014 结构一致性证实）；seed 数据集补 ServiceGuide(6)/HotMajor(10)；41 张基线在 Linux CI 重生成并逐张记录理由；**`continue-on-error=false`，visual 正式成为阻断性门禁**。
- **fix（V0.9 / T-05）**：单测顺序耦合自包含化（9 文件）——shuffle 序与默认序同样 1712/1712（V8-SEC-03 验收返工）。
- **fix（V0.9 / E2E-01）**：E2E 首跑三例修复——通知行选择器按事件名收窄、确认框按 testid 定位 + 上传内容唯一化、**`GET /api/knowledge-files` 补 `trash=1` 视图（生产缺陷：回收站页恒为空，e2e 门禁首次抓出）**。本地 73/73 全绿。
- **docs（V0.9）**：规划包 `docs/V0.9-20261023/`（CI 真相轮 + 收尾轮，7 卡全部关闭）；独立验收 verify.md 全覆盖（V8 16 卡 + V9 各卡）。

## 2026-10-21（V0.7 收尾阶段）

- **feat（V0.7 / B-07）**：公众号图文发布闭环——`uploadimg` 正文外链图转存、`freepublish/get` 回写 `externalUrl`、60s 跨进程节流、多渠道一次发布、渠道级状态 DTO 组装。
- **feat（V0.7 / V7-SEC-01/02/03）**：写入越权收口分三批完成——角色写入（防自升超管/越权授权）、用户写入（防非超管删超管/改超管密码/自改角色/删最后一名超管）、黑盒回归套件（独立编写防自证）；证据 `evidence/V7/V7-SEC-0*`、`V7-V-SEC`。
- **feat（V0.7 / B-02~B-06）**：全部后台路由迁移 `withApi`；公开/认证路由补齐；通知可靠性（静默时段生效、跨进程原子去重、邮件脱敏）；`notify.scan` 接入 `flushDeferred`。
- **feat（V0.7 / D-03~D-15）**：env 集中校验、设置键对等、DATA_DIR 存储、备份含 uploads/kb、媒体删除清理（含缩略图）+ 孤儿扫描、CollectParser 注册表、GitHub Actions、Docker 部署件 + 恢复手册、文章 JSON-LD。
- **feat（V0.7 / W2-02）**：全路由契约测试自动发现——865 用例覆盖 `src/app/api` 全部 221 个 route×method（401/403/400/200 四场景），inventory 100% 有规则，`--sequence.shuffle` 下稳定通过。
- **feat（V0.7 / W2-08）**：ESLint 边界规则升为 **error**——`src/lib` 禁依赖 `src/app`、路由内禁定义请求体 zod（DTO 唯一源）；同步 `13-响应设计.md` 历史坑复核。
- **docs（V0.7 / W2-06）**：`parity-matrix` 从 P01 快照重算为终态（present 50 / replaced 7 / **partial 0 / missing 0**，57 行缺口清零）；`current-plan` / `roadmap` 补 V0.7 终态章节；口径上将「视觉与 main 不一致」从 parity 移出，改由 `npm run test:visual` 独立门禁守护。
- **fix（V0.7 / 根目录治理）**：清理 16 个调试重定向日志（`w*.out`）；AI 工具运行时档案（`.openclaw`/`IDENTITY.md`/`USER.md`）登记入 `check-root` 白名单；`node scripts/check-root.mjs` 恢复 PASS。

**本阶段未闭环（如实登记）**：

| 项 | 状态 | 原因 |
| --- | --- | --- |
| W2-04 性能基线复测 | BLOCKED | 跨所有权：D-03 env 强校验使 D-01 测量脚本启动即退出 |
| W2-07 独立终审 + 打包 | 待开工 | 依赖 W2-04 关闭 |
| K10（next 16.4.2） | 待用户裁决 | 修复 1 条 critical RCE，涉依赖冻结面 |
| 视觉像素回归 | UNKNOWN | 需 Linux 实机（CI/Docker） |
| 微信/SMTP/Coze 真实联调 | UNKNOWN | 凭证缺失，已按 AGENTS.md §2 用 mock 验证 |

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

## 2026-10-11（第十一轮）：执行轮 E2——R0+M2+M3+S6 全模块落地

- **feat（R0）**：CRUD 工厂（crud.ts + 26 资源规格 SSOT）+ 52 个路由文件 + 全资源契约（contracts/resources.ts）；CrudPage/SchemaForm 驱动 26 个管理页；前台 13 类页面重建（导航表驱动 Header/首页 8 分区/栏目页/报名表单+api/apply 双层频控/FloatingContact）；upload（sharp 缩略图+白名单）与 file 直读（双重路径穿越防护）；ManagerMenu 11+28 全量 seed；Partner/EnrollmentOffering 主键改 Int、Course+sort、LLMProvider+kind/botId 迁移。
- **feat（M2）**：Coze 客户端（v3/chat SSE+轮询，ADR-023）；llm-gateway（default→priority→fallback 路由、熔断、用量统计、双适配器）；KBAdapter 双轨（本地兜底+Coze）；/api/chat/stream（限频+敏感词+历史收敛+SSE）；ChatWidget 悬浮客服；llm/providers 管理（加密+脱敏+测试+余额填报）。
- **feat（M3）**：采集引擎（html/rss、限速、urlHash+标题相似度去重、sharp 图片转存、审核事务化入库）；5 个真实采集源 seed（用户指定+补选，逐一核实可达；川大继教 JS 渲染站限制登记）；发布中枢（PublishJob 状态机 publish/update/offline、指数退避≤3、渠道行复用）；通知网关（五类事件+模板+重试+dead 终态防风暴；SMTP 未配置 skipped 降级）。
- **feat（S6）**：公众号对接层（token 缓存、验签、XML 分发、被动回复+48h 客服补发走 Coze、素材→草稿→freepublish、每日上限）；凭证后补即插桩（ADR-002）。
- **联调**：Coze 真实调用打通至 API 层（请求格式/加密/错误透传正确）；参考项目 PAT 已过期（4101）→ 登记为外部输入失效，新 PAT 后台粘贴即生效。
- **review→fix**：独立审查报告 1×P0+7×P1+17×P2 → P0/P1 全修 + 择要 P2（登录防爆破、审核幂等事务、wechat 凭证不出接口、slug/日期/URL 基址边界、action 语义补全、Editor content:list、effect 规则合规）。
- **test**：vitest 33/33；npm run check 全绿；冒烟（菜单树 11+28、采集源 5、报名落库、发布/内容/公众号 API、前台 9 页 200、chat 降级链路）。
- **待用户输入（更新）**：①微信凭证（M4 联调）；②SMTP 凭证（真实邮件投递）；③**Coze 新 PAT**（旧 PAT 已过期，coze.cn 重新生成后填入「模型供应商→编辑→API Key」即恢复 AI 客服全能力）。

## 2026-10-11（第十二轮）：执行轮 E3——浏览器端到端测试与修复

按 verify-plan.md 八阶段（V1 前台浏览 / V2 互动 / V3 认证 / V4 后台 CRUD / V5 采集 / V6 发布闭环 / V7 通知 / V8 安全）以真实浏览器 + API 探针完成全量测试。

- **fix（P1）埋点断流**：R0 CRUD 生成器覆盖了 M1 公开 POST /api/user-actions → 405；恢复公开 POST 并保留管理 GET（浏览器报名后 submit+page_view 双落库复测通过）。
- **fix（P1）表单校验三连**：select 空值未拦截 + resources.ts 92 处 optional 字段不可收 null + number 默认 0 → normalizeFormValues 删键策略 + 全量 nullable 化 + 默认值空串；zod 英文消息统一转中文"参数校验失败：字段"（契约②）。
- **fix（P1）slug 契约对齐**：resources.ts 7 处 slug regex 补中文集（上轮漏网），中文 slug 资源编辑恢复。
- **fix（数据）**：admin nickname 乱码为测试工具（Git Bash curl GBK）污染，非系统缺陷；已修数据并登记测试纪律。
- **验证亮点**：调度器启动补跑自动完成教育厅源采集（REQ-NF-004 补跑语义实证）；urlHash 去重（重复执行跳过 8/8）；审核事务化双写（ContentItem+Knowledge）；**采集→审核→发布→前台展示端到端闭环**（真实政府公告）；权限矩阵（无 token 401×5、Editor 403×4+200×1）；上传白名单（txt 拒/png 过+文件可访问）。
- 证据：06_validation/evidence/EVD-VERIFY/（issues.md 台账 + 7 张浏览器截图）。
- 回归：npm run check 全绿；vitest 33/33。
