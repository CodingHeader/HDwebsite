---
id: MASTER-PLAN
type: plan
title: 任务分配与执行规划总纲（Master Plan）
status: active
owner: 产品所有者
created: 2026-10-11
updated: 2026-10-11
requires: [ADR-011, ADR-022, SOL-001, SOL-002, SOL-003, SOL-004, SOL-005, SOL-006]
---

# 任务分配与执行规划总纲（Master Plan）

> 本文件是「任务分配与完整规划指令」的落地产物：把既有 88 件设计文档收敛为可执行的规划包。
> 详细事实源在根级 01~16 与 02_requirements/03_solution 各文件，本文只做规划级汇总并补齐缺口
> （契约冻结、DAG、所有权矩阵、档位预算、自检）。**阅读顺序：先 README §0，再本文。**

---

## 1. 规划快照

```yaml
规划日期: 2026-10-11
新仓路径: E:\Code\Demo\HDwebsite\hdwebsite_1011（平行新仓，ADR-011）
参考仓: 04292309/（main，d079d60，文档基线）/ hdwebsite_0429/（main，c6ff40b，功能增强分支）
文档基线: docs/design 88 件（提取 18 + 体系 67 + README/new-features/talk）
代码基线: 新仓 M1 步行骨架已落地（详见 §16）
工作区状态: 新仓 git 尚未 init（本规划批准后随首个提交建立）
测试命令: npm run check（lint+typecheck+build）/ npm run test（vitest 30 用例）
工具链: node v24.12.0 / npm 11.7.0 / git 2.52.0 / registry npmmirror
```

## 2. 事实基线（含文档与代码不一致清单）

**已确认事实（有代码证据）**
- 原项目 A（04292309）：Next 16.2.1 + React 19.2.4 + Prisma 7.7(libsql) + SQLite + Tailwind v4 + zod 4 + zustand 5；schema 32 模型；manager 26 页；前台 17 路由；API ~70 端点；无 middleware/instrumentation（有 src/proxy.ts 空放行）；无接线测试。
- 原项目 B（hdwebsite_0429）：与 A 同构，schema 35 模型（+Major/+EnrollmentOffering），API +3（majors/enrollment-offerings/media/batch），manager 27 页（+enrollment-offerings），lib +7（enrollment-pricing/enrollment-sync/media-assets/media-management/showcase/chat-history-view/operation-log-query），2 个未接线测试文件；Windows 下 next.config 不生成 standalone。
- 原两仓均无 middleware.ts/instrumentation.ts；JWT_SECRET 缺失即 FATAL；默认账号 admin/admin123。

**文档与代码不一致清单（逐条，以代码为准并已在实施中消解）**
1. 文档口径 31 模型 vs 实测 A schema 32（差 ArticleTag 关联表）→ 以实测为准。
2. 调度表双口径（SOL-001 CronJob vs 16-新增 §10 Job）→ 统一 CronJob（name/cron/enabled/lastRunAt/lockedAt）。
3. ContentItem 字段双口径（16-新增 §1.1 vs SOL-005 §4）→ 统一前者 + source/collectItemId 回链。
4. CollectItem.status 双口径 → 统一 new/approved/rejected/imported（去重由 urlHash 唯一约束承担）。
5. KnowledgeFile.status 双口径 → 知识库走 ADR-020 外部对接，三级模型仅留档不建表。
6. **设计文档提取自 A 仓，未覆盖 B 仓新增业务域（Major/EnrollmentOffering 等）**→ 已补录 REQ-F-012 + ADR-022，schema 已含（本次最重要缺口）。
7. 用户模板中「Aidean 3000 / AideanBot 3333 端口」为其他项目口径，本项目端口统一 **6789**（宝塔 80 反代 → 127.0.0.1:6789）。

**读取失败/不可访问**：04292309/website_error/.token.txt 与 hdwebsite/.token.txt 为凭据文件，按安全铁律不读不引。

## 3. 需求基线复核

**复述**：为学历提升机构（弘道教育）重写官网 + 后台 + AI 咨询系统，原分支功能全保留，并在采集、知识库、多模型网关、自动发布、公众号、邮件提醒八个方向拓展，最终平行替换现网（灰度，ADR-021）。

**MUST（每条可验证）**
- M-1 原分支 A 的 17 条前台路由、26 个后台页面、70+ API 在新仓全部重建且行为对齐（RISK-009 清单核验）。
- M-2 B 分支的专业/招生计划域（Major/EnrollmentOffering/招生管理页）在新仓可用（ADR-022）。
- M-3 全部管理端实体具备增删改查 + 分页 + 权限拦截（越权请求返回 401/403）。
- M-4 采集→审核→入库→发布（官网/公众号）→邮件提醒全链路可运行（M3/M4 验收）。
- M-5 LLM 多模型路由（default→priority→fallback）+ 知识库检索（KBAdapter 双轨）可配置。
- M-6 前端全部动态数据（Server 直查 + API），无硬编码假数据；风格统一（Tailwind + 设计规范）。
- M-7 敏感字段（apiKey/appSecret/SMTP password）加密落库、回显脱敏、密钥走环境变量。

**SHOULD**：SEO 三件套与 sitemap/robots（M1 已建基线）；性能预算（REQ-NF-001）；备份与恢复（M1 已建）。
**COULD**：向量检索（ADR-016 二期）；埋点全量接线（ASM-008 已最小接通）。
**MUST NOT**：不引入 Redis/MQ/独立 worker/BullMQ/无头浏览器（REQ-C-003）；不做群发接口；订阅号不承诺客服接口；不预置采集源。

**冲突清单**：无未解冲突（C1~C8、Q1~Q10 已全部落定，见 README §4；分支命名 upgrade（GitHub 侧）与目录名 hdwebsite_1011 并存不冲突，见 §15 适配说明）。

**未知登记册**
- BLOCKING（外部输入，均有条件方案不阻塞开发）：微信凭证（DEP-001，M4 前补）；SMTP 凭证（DEP-003，M3 前补）；采集源清单（DEP-004，运营录入）；外部知识库选型（Q10-2 维持 ADR-020，M2 对接前定）。
- NON_BLOCKING：success-metrics 目标值（M1 验收时确认）；publish.remindAheadMinutes=30（推断参数，后台可改）；灰度 10%（推断默认）。

**隐含要求**：上线改默认密码；CRON_SECRET 保护定时触发；切换前新旧功能清单逐项核验；seed 幂等不覆盖手工数据。

## 4. 契约冻结包（六份，唯一源 = `src/contracts/` zod）

**唯一源声明**：全部请求/响应 Schema、错误码、权限点定义于 `src/contracts/`（common/auth/article/setting/user-action），机器可校验，前后端同源导入；禁止任何路由/组件重复定义 DTO。落盘路径适配：模板的 `packages/contracts/**` → `src/contracts/**`（单应用形态，理由见 §15）。

**① API 契约**：信封 `ApiResponse<T> = { code, data, message }`；分页 `{ list, pagination:{page,limit,total,totalPages} }`；列表查询 `page/limit/keyword` + 各资源过滤器；时间 ISO 8601；幂等：PUT 幂等、POST 非幂等、采集去重靠 urlHash 唯一。已冻结端点族：auth(4)、articles(2)、settings(2)、user-actions(1)、manager-menus(1)、manager/dashboard(1)、health(2)；良性额外端点：`/api` 根探活、`POST /api/auth/logout`（仅审计，无状态登出）。待实现端点族按 SOL-002~006 §3.5 清单（知识库/LLM/采集/发布/通知/公众号），实现时先补 contracts 再写路由。公开读面纪律：未登录文章接口仅见 status=published；settings 接口非 `setting:list` 权限仅见 isPublic 且加密字段脱敏回显。

**② Errors 契约**：code ∈ {200,400,401,403,404,500}；HTTP 与业务 code 并行；data 失败为 null；zod 失败返回首条中文 issue；401「未提供认证令牌/认证无效或已过期」；403「权限不足：需要 xxx」；未捕获 500 不泄堆栈。前端统一由 manager-fetch 解包（401 清会话跳登录）。

**③ Identity 契约**：用户 Int 自增 ID；角色 SuperAdmin/Editor/Viewer；JWT HS256 7d claims `{uid,username,roleId,isSuper,permissions[]}`；权限点 `module:action`（catalog 在 contracts/auth.ts）；**review:edit 仅 SuperAdmin（ADR-017）**；管理端越权路径明确禁止：所有 /api 管理端点必经 requireAuth(permission)，前台仅读；公开写仅 user-actions POST 与 chat（M2+）。

**④ Resources 契约**：/uploads/:path* rewrite → /api/file/:path*（R0 实现文件服务时加路径白名单）；上传鉴权 = 登录 + 权限；图片域名白名单（next.config remotePatterns：mmbiz.qpic.cn / www.hd1994.com / localhost）；Media 记录生命周期与 thumbnails JSON；远期 OSS 可插拔（S2）。

**⑤ Events 契约（进程内调度）**：CronJob 行即事件源，任务名：collect.run / publish.scan / notify.scan / retry.failed / llm.balance-check / backup；载荷 = jobName + lastRunAt（增量窗口）；幂等键 = lockedAt 抢锁 + urlHash；触发时机由 cron 表达式（管理端可改）；执行留痕 = 各表状态字段 + OperationLog。无 MQ、无跨进程事件。

**⑥ UX States 契约**：每页面五态齐备——空态（如「暂无内容」）、加载态（loading.tsx/骨架）、错误态（error.tsx + toast）、无权限态（401 跳登录/403 提示）、成功态（操作反馈）。管理端骨架页已实现列表空态/错误态；R0 逐页对齐。

**契约自检**：前端可只凭 contracts 写调用层（manager-fetch + zod 类型）✅；后端可只凭 contracts 实现路由 ✅；数据端 schema 与 contracts 同步演进（迁移串行）✅；错误码覆盖已知失败路径（含 502/503 AI 上游，M2 补）✅；越权路径已在 Identity 契约禁止并有代码守卫 ✅。

## 5. 数据模型基线（迁移编排）

- 基线 = `prisma/migrations/20261011052216_init`（42 模型，一次成型）：A 的 26 存留 + B 的 2 补录 + 新增 14（CronJob/ContentItem/ContentChannel/CollectSource/CollectTask/CollectItem/PublishJob/LLMProvider/LLMUsage/WechatAccount/NotifyRecipient/NotifyRule/NotifyTemplate/NotifyRecord）。
- 裁剪：News（并入 Article，channel=news）/PageTemplate/ContentBlock/TemplateBlock/ElementConfig/AIConfig（ADR-012/SOL-003）。
- 保留 Knowledge（ADR-020 本地兜底双轨）；KBAdapter 对接 M2，不建三级模型表。
- 迁移策略：**版本号串行**（每切片至多一个迁移，按 M1→M4 顺序合并，禁止并行改同一张表）；schema 保持 PG 可迁移（无 SQLite 特有 SQL）。
- 建模约定：JSON-in-String + try/catch；枚举即字符串；无软删除（审计靠 OperationLog）；高频过滤列已建 @@index；seed 幂等（update 分支空 {}）。
- 存量数据迁移（M4 切换前执行）：`scripts/migrate-news-to-article.mjs`（dry-run 默认/apply 自动备份/rollback 报告制）+ `scripts/migrate-setting-keys.mjs`（旧点分键 → Registry 扁平键，已对旧库 dry-run 验证：5 条 News、9 个可映射键）。

## 6. 垂直切片清单（排序与理由）

| 切片 | 内容 | 依赖 | 排序理由 |
| --- | --- | --- | --- |
| **S1+骨架（M1）✅** | 新仓初始化 + 契约源 + 42 模型基线 + auth/权限 + 调度基座 + Setting Registry/加密 + Markdown 管线 + SEO 基线 + 最小埋点 + 迁移脚本 + 步行骨架页面 | 无 | 步行骨架必须第一刀；解锁全部后续切片 |
| **R0 基线重建（补缺口）** | 前台 13 页 + 后台 25 页 + 全实体 CRUD（CrudPage/SchemaForm）+ upload/file + B 域管理页 | S1 | 需求 M-1/M-2 的载体；与 M2 可并行（不同所有权） |
| **S2+S3（M2）** | KBAdapter 知识库 + LLM 网关 + SSE 客服 ChatWidget | S1 | 先解不确定性最高项（外部库选型、模型路由） |
| **S4（M3a）** | 采集引擎（rss/html/试抓/审核/图片转存） | S1、S2 | 依赖调度与知识库入库位 |
| **S5（M3b）** | 发布中枢 + 邮箱提醒（Notify 五类事件 + 模板） | S1、S4 | 发布队列消费采集产物 |
| **S6（M4）** | 公众号对接（账号/发文/AI 客服/被动+补发）+ 部署灰度切换 | S3、S5 + DEP-001 | 凭证阻塞项最后 |

每刀验收：`npm run check` 绿 + 对应 validation-plan 小节通过 + UI 走查留证（06_validation/evidence/EVD-M*/）。

## 7. 原子任务卡全集

M1 任务卡已建（`05_execution/tasks/TASK-M1-001~011.md`，16 字段齐全，验证命令可执行）。R0~S6 任务卡在对应切片开工前按 task-template 建卡（Q7 轮既定流程：先建卡再开工）。任务索引见 `05_execution/task-index.md`。

## 8. 依赖 DAG

```
M1(已完成) ──┬──> R0 基线重建（可与 M2 并行：所有权不相交，见 §9）
             └──> M2 (S2 KBAdapter → S3 LLM网关) ──┬──> M4 (S6 公众号 + 灰度切换)
             └──> M3 (S4 采集 → S5 发布+提醒) ─────┘
串行链（关键路径）：M1 → M2 → {M3 → M4 切换演练}；M4 严格依赖 M2+S3 网关与 DEP-001 凭证。
环检测：无环（DEP-009~014 线性：001←无；002←001；003←002；004←001+002；005←001+004；006←003+005）。
可并行组：{R0, M2}（R0 只动 src/app 页面层与组件，M2 动 src/lib/llm、kb、M2 迁移）；{M3a 采集, M3b 发布准备}（不同表族）。
```

## 9. 所有权矩阵（路径 × Agent，无重叠）

| 路径 | Agent-Contract | Agent-App | Agent-API | Agent-Data | Agent-Guard |
| --- | --- | --- | --- | --- | --- |
| `src/contracts/**` | **写** | 读 | 读 | 读 | 查 |
| `prisma/schema.prisma + migrations` | 读 | 读 | 读（经 prisma 客户端） | **写** | 查 |
| `src/lib/**`（api-response/auth/scheduler/settings/markdown） | 读 | 读 | **写** | 写（scheduler/jobs） | 查 |
| `src/app/api/**` | 读 | 读 | **写** | 读 | 查 |
| `src/app/(web)/** src/app/manager/** src/components/** src/store/**` | 读 | **写** | 读 | — | 查 |
| `scripts/ Makefile CI eslint/vitest/next.config` | 读 | 读 | 读 | 读 | **写** |
| `docs/design/**` | 规划轮所有 Agent 追加，禁止改历史件（07_release/changelog 记录轮次） | | | | |

重叠处置：`src/lib` 双写主体（API 与 Data）→ 约定调度域（scheduler/jobs/backup）归 Data，其余归 API；单人执行期无实际冲突，多代理并行期按此表执行。跨所有权 = blocked，先补 ADR。

## 10. 档位分配与成本预算表

| 切片 | 任务数 | haiku | sonnet(主力) | opus | fable |
| --- | --- | --- | --- | --- | --- |
| M1（已完成） | 11 | 1（文档索引） | 8 | 2（契约冻结审、M1 高风险 review） | 0 |
| R0 | ~14 | 2 | 11 | 1（CrudPage 抽象仲裁） | 0 |
| M2 | ~10 | 1 | 8 | 1（KBAdapter 选型对接审） | 0（选型需用户输入） |
| M3 | ~12 | 2 | 9 | 1（采集合规与发布状态机审） | 0 |
| M4 | ~9 | 1 | 7 | 1（灰度切换演练审） | 0 |
| 规则 | — | 格式化/索引类 | 原子实现/单测/E2E | ADR/跨模块仲裁/安全 review | 仅需求或契约推翻时，≤1 次/切片 |

熔断：同一任务连续 2 次验收失败 → 停止改代码，改为重写任务书或升级档位或标 blocked。

## 11. 基线指标（首次测量值待 M1 验收记录，当前全部标注「尚无基线」）

| 指标 | 定义 | 目标 | 基线 |
| --- | --- | --- | --- |
| 首页 TTFB | 生产模式 `/` 首字节 | ≤ 300ms（本机） | 尚无基线（M1 验收时测量留证） |
| 列表 API 延迟 | /api/articles?page=1 | ≤ 100ms | 尚无基线 |
| 首页 JS 传输量 | 首页 route bundle | ≤ 200KB gzip | 尚无基线 |
| chat 首包 | SSE 首 token | ≤ 3s（M2 验收） | — |
| 构建时长 | npm run build | ≤ 3min | 当前 ≈ 40s（参考值，非优化目标） |

纪律：无基线前禁止任何「优化」任务立项；指标降了但用户可感耗时未降的指标下线。

## 12. 风险清单 / 未决问题 / 待裁决清单

- **风险**：RISK-001 迁移一致性（计数核对 + 报告制已建）；RISK-007 调度/请求写并发（短事务 + busy_timeout）；RISK-009 新旧功能清单核验（M-1 验收表）；**新增 RISK-022：B 仓功能域此前未被设计文档覆盖 → 已补录 REQ-F-012/ADR-022，R0 重建时逐项对照 B 仓 lib+API+页面清单**。
- **未决（NON_BLOCKING，带假设推进）**：外部知识库选型（Dify/FastGPT，M2 前定）；success-metrics 目标值；灰度比例 10% 起步（推断）。
- **待用户裁决（BLOCKING 外部输入）**：微信凭证（M4 前）；SMTP 凭证（M3 前）；首批采集源 URL（M3 试运行前）；外部知识库账号与凭证（M2 对接前）。

## 13. 落盘清单（本规划轮写入）

| 文件 | 用途 |
| --- | --- |
| `docs/design/04_planning/master-plan.md` | 本文件（规划总纲/契约冻结/DAG/所有权/预算） |
| `docs/design/05_execution/tasks/TASK-M1-001~011.md` | M1 任务卡（11 张，16 字段） |
| `docs/design/05_execution/task-index.md` | 任务索引更新 |
| `docs/design/04_planning/current-plan.md` | 本轮计划更新 |
| `docs/design/07_release/changelog.md` | 第十轮记录 |
| `docs/design/talk.md` | 执行轮记录 |
| `docs/design/02_requirements/features/REQ-F-012-专业与招生计划管理.md` | B 仓缺口补录 |
| `docs/design/03_solution/decisions/ADR-022-B仓业务域补录.md` | 补录决策 |
| 新仓代码（M1 范围） | 见 TASK 卡与 §16 |

## 14. 自检结果（对照规划指令 §12）

需求：每条 MUST 可验证 ✅；冲突已列（无未解）✅；BLOCKING 均为外部输入且给条件方案 ✅；未伪造需求 ✅。
契约：六份齐全且机器可校验（zod 单源）✅；无多源并存 ✅；三方均可凭契约开工 ✅；错误码覆盖已知路径 ✅；越权路径已禁止并有守卫代码 ✅。
切片与任务：垂直切片 ✅；每刀独立验收 ✅；第一刀步行骨架 ✅（health+鉴权写接口+42 表迁移+前台打真 API+统一错误包）；M1 卡 16 字段齐全 ✅；每卡有验证命令 ✅；允许/禁止路径明确 ✅；任务可溯源（卡内 requires 链接 REQ/SOL/ADR）✅。
依赖与并行：DAG 无环 ✅；并行结论附机械依据（所有权不相交 + 契约冻结 + 无共享迁移）✅；关键路径已标 ✅；所有权矩阵无未处置重叠 ✅。
资源与风险：档位/预算已给 ✅；基线指标明确「尚无基线」未伪造数字 ✅；风险/未决/待裁决分列 ✅。
纪律：本规划轮未修改任何已冻结契约语义（契约随切片实现是新增而非变更）✅；无绝对化结论 ✅；未验证项全部显式标注 ✅。

## 15. 本次规划的前提与局限

1. **落盘路径适配**：模板 `packages/contracts/**` → `src/contracts/**`、`database/migrations/001_init.sql` → `prisma/migrations/20261011052216_init`（单 Next.js 应用形态，ADR-011 口径；monorepo 化是 COULD 不做）。
2. **分支命名**：目录/项目名 `hdwebsite_1011`；GitHub 侧按任务书推为 `upgrade` 分支（无快进要求，独立历史）。
3. 单执行者模式：并行纪律（最多 3 写入 Agent 等）为多代理/多人期生效的约束，当前由「子代理只读验证」落实防自证循环。
4. 本机为 Windows：构建不产 standalone（与 B 仓同口径）；生产 Linux 侧由 start-next.mjs 走 standalone 链路。
5. 尚未验证项：灰度/切换演练（M4）、外部库真实对接（M2）、SMTP/微信真实凭证联调（依赖用户输入）、生产性能基线（验收时测量）。

## 16. 建议的第一刀与启动顺序（已执行）

第一刀（M1 步行骨架）**已于本规划轮内完成并验证**：42 模型基线迁移 → contracts/auth/scheduler/settings/markdown 基座 → health/auth/articles/settings/user-actions/manager-menus API → 前台/后台骨架页 → seed → vitest 30 用例 → `npm run check` 绿 → 启动冒烟（登录/CRUD/越权 401/埋点/sitemap）。启动顺序延续：R0 基线重建 ‖ M2（S2→S3）→ M3（S4→S5）→ M4（S6+灰度切换）。
