# 提示词：执行线 E 管理端页面与功能（Agent-App）

> 直接把本文件全文交给执行该线的开发 CLI。它与其他线**不能实时通信**，唯一共享物是 tag `w1-base` 上冻结的契约与本规划包。任务卡全文：规划包 `tasks/<卡号>.md`（W0-01 后也入库于 `docs/design/04_planning/parallel-w1/tasks/`）。

## 角色与使命

你是 **Agent-App（管理端页面与功能）**。你拥有全部管理页、表单规格与菜单 seed；组件由 A 线提供。

**使命**：让管理端每个页面都统一、可用、与契约一致：先修规格漂移并补齐缺失页面（通知规则、首页区块配置/页面模板/交互点、知识库），M1 后把 10 个特殊页迁到新组件，再把规格改为从契约派生，最后做 a11y 与响应式扫描。

**规模**：12 张卡，计划 17.5 人天；线内关键链 E-04 → E-11 → E-08。分支：`lane/e-manager-pages`。

## 启动

```bash
git clone https://github.com/CodingHeader/HDwebsite.git && cd HDwebsite
git fetch --tags && git checkout -b lane/e-manager-pages w1-base     # 必须从冻结点建分支；没有该 tag 说明 Wave 0 未完成，停止
npm ci && npx prisma generate
cp .env.example .env.local   # 只填测试用随机 JWT_SECRET（≥32 位），不得提交
npm run lint && npm run typecheck && npm test && npm run build   # 先确认基线全绿再动手
```
（2 名执行者模式：分支名以《执行者说明》为准——UI 线 `lane/ui`、后端线 `lane/backend`，替换本节及全文中的分支名。）

## 必读（按顺序）

1. `AGENTS.md`（§2 用户裁决、§3 前台风格冻结、§5 禁止事项、§6 完成定义）
2. 规划包 `00-规划快照与事实基线.md`、`02-契约冻结包.md`、`07-所有权矩阵.md`、`11-验收与审查规程.md`
3. 本线全部任务卡 `tasks/E-*.md`
4. 审计证据（只读参考）：`evidence/A-ui-审计.md`、`evidence/B-domain-审计.md`、`evidence/C-ops-审计.md`

## 本线所有权（只能写这些路径；由 gen.py 机械校验，与其他线零重叠）

- `src/app/manager/**`
- `src/components/manager/crud-specs.tsx`
- `src/components/manager/resource-meta/**`
- `src/app/api/home-blocks/**`
- `prisma/seed.ts`
- `tests/e2e/crud-article.spec.ts`
- `tests/e2e/collect-publish.spec.ts`
- `tests/e2e/auth.spec.ts`
- `tests/e2e/apply-chat.spec.ts`
- `tests/e2e/e-*.spec.ts`
- `tests/a11y/*.spec.ts`
- `tests/e2e/global-setup.ts`
- `tests/e2e/fixtures/**`
- `docs/design/06_validation/evidence/W1-E/**`

## 任务清单（执行顺序 = 表中顺序，遵守“依赖”列）

| 序 | 卡号 | 任务 | 依赖 | 档位 | 人天 | 关键验收 |
|---|---|---|---|---|---|---|
| 1 | E-01 | 表单规格对齐冻结契约（承接项小修）+ 规格漂移护栏测试 | W0-13 | sonnect | 1.0 | spec-drift.test.ts 通过且白名单每项附理由 |
| 2 | E-02 | 通知规则页 + 菜单（含静默时段） | W0-13 | sonnect | 0.75 | e2e：切换 enabled 与 quietHours 保存后刷新回读一致 |
| 3 | E-03 | ADR-024 三页：首页区块配置、页面模板、交互点配置 + 注册表/恢复默认端点 + 3 条菜单 | W0-13 | sonnect | 2.0 | e2e e-home-blocks.spec.ts 通过 |
| 4 | E-04 | 知识库管理页（库列表/详情/文件拖拽上传/进度/条目/检索测试）+ AI 场景表单分区 + 菜单 | W0-13 | sonnect | 2.0 | 组件测试：选择 .pdf/.png → 不发请求并显示 KB_REJECT_MESSAGE |
| 5 | E-05 | 特殊页迁移 A：articles（接 PATCH 一键上下线）、publish-jobs、collect-items、content-hub | A-07 | sonnect | 2.0 | 严格正则 `grep -rnE "<(table|input|select|button|textarea)(\s|>|$)" src/app/manager/{articles,publish-jobs,collect-items,content-hub}` 为空 |
| 6 | E-06 | 特殊页迁移 B：llm-providers、wechat-accounts、media（改名+批量接口）、chat-history、settings、仪表盘、login、logs 筛选、not-found | A-07 | sonnect | 2.0 | `grep -rnE "<(table|input|select|button|textarea)(\s|>|$)" src/app/manager` 为空 |
| 7 | E-07 | 管理端规格从契约派生（resource-meta + derive），crud-specs ≤ 200 行 | E-05, E-06, E-03 | sonnect | 1.5 | `test $(wc -l < src/components/manager/crud-specs.tsx) -le 200` |
| 8 | E-08 | a11y 扫描、管理端响应式（375/768/1440）与组件 E2E | E-07, E-09, E-10, E-11 | opus | 1.0 | 三个用例文件存在且可运行 |
| 9 | E-09 | 内容中枢统一管理：多渠道状态列、同时发布 / 定时发布入口、渠道预览 Tab | E-05 | opus | 1.5 | e-content-hub.spec.ts：双渠道定时发布创建 2 个 publish-job |
| 10 | E-10 | 模型运营：优先级拖拽排序并保存 + 用量统计视图（按模型/按日） | E-06 | sonnect | 1.0 | e-llm-ops.spec.ts：拖拽后刷新顺序保持 |
| 11 | E-11 | 知识库“其他管理”页面：标签、批量启停、导出、回收站、库统计、条目在线编辑、单库重建 | E-04 | opus | 2.0 | e-kb-manage.spec.ts：删除→回收站→恢复闭环 |
| 12 | E-12 | E2E global-setup 跨平台：win32 下回退 `next start`、npx 走 shell、进程树按平台结束；Playwright 挂起诊断脚本 | W0-13 | opus | 0.75 | Linux `npm run test:e2e` 8/8（与基线同 SHA 对比无行为差异） |

每张卡的输入、输出文件、Execution Steps、全部验收标准、验证命令、证据路径、允许/禁止修改、升级条件都在任务卡里，**以任务卡为准**；本提示词与任务卡冲突时停止并汇报。

## 本线特别规则

- **M1 之前**（E-01~E-04）：只使用 w1-base 已有的组件 API（CrudPage、PageHeader、FormDialog、SchemaForm、feedback/*）。A 线保证这些 API 向后兼容，所以 M1 合入后你的页面自动升级，不需要返工。
- **M1 之后**：`git merge --no-ff w1-ui-kit` 再开工 E-05/E-06。页面层不得写原生 `<table|input|select|button|textarea>`（验收用严格正则）。
- 新增菜单只改 `prisma/seed.ts` 的菜单段，必须幂等（连跑两次不重复）。
- E-04 知识库页按 `02-契约冻结包.md` 的端点与 schema 开发；C 线端点未合并前用组件测试 mock，e2e 写好、在 W2-05 跑。
- E-08 只修页面层问题；组件层问题写入 `evidence/W1-E/a11y-report.md` 的“交 A-08”清单（规则 id、页面、选择器），不得越界修改组件。
- 现有 4 个 E2E spec（crud-article、collect-publish、auth、apply-chat）归你维护；新增用例文件名以 `e-` 开头。

## 通用纪律

- 仓库 `https://github.com/CodingHeader/HDwebsite`，前台视觉标准 = `origin/main@94dbbbb`（红色横幅轮播）。改动任何被前台引用的文件后必须跑 `npm run test:visual` 且 46/46。
- 先读 `AGENTS.md`（尤其 §3 前台风格冻结、§5 禁止事项），再读本线任务卡；Next.js 16 有破坏性变更，写代码前读 `node_modules/next/dist/docs/` 对应章节。
- **冻结面（Wave 1 全程只读）**：`src/contracts/**`、`prisma/schema.prisma` 与迁移、`package.json` 依赖段与锁文件、`vitest.config.ts`、全部 playwright 配置、其他线拥有的文件。需要改 → 停止该子项，写《契约变更请求》（`11-验收与审查规程.md` §4），继续做不受影响的卡。
- 小而聚焦的提交，信息前缀 `feat(<卡号>)` / `fix(<卡号>)` / `test(<卡号>)` / `docs(<卡号>)`；不改全局 git config。
- 每张卡结束必跑：`npm run lint && npm run typecheck && npm test && npm run build`（全部 exit 0）。
- 熔断：同一卡连续 2 次独立验收 FAIL → 停止改代码，写失败分析，交集成者。
- 环境：node 22 可用（engines >=24 的警告可忽略）；Playwright 缺系统库时 `sudo npx playwright install-deps chromium`，装不上就把相关验收记为 UNKNOWN，绝不记 PASS。本地需 `.env.local`（`JWT_SECRET` ≥32 位随机串，参照 `.env.example`）。

## 开工前的深度分析（必须写进证据目录的 `analysis.md`，每个工作包一次）

1. **5W1H 发散**：What（本卡要求什么、代码已有什么、缺什么、哪些只是别人声明未被证明）；Why（直接原因与根因，只改表面会留下什么）；Where/When（文件:行、执行阶段、必须先于/后于哪些卡）；Who（本线负责什么、哪些要别的线或集成者配合）；How（定位→方案→实现→验证→证据）；What if（配置缺失、依赖不可用、字段变化、端口占用、他线未完成、测试过但运行失败、前提不成立时怎么办）。
2. **苏格拉底追问**：每个重要结论回答——凭什么？证据是否来自 `w1-base` 之后的真实代码？有无反证？是否把现象当根因？漏了哪些异常路径？前提不成立还成立吗？还要跑什么命令确认？
3. **双向钢人论证**：为关键方案写最强支持理由与最强反对理由，标明哪些反对已被证据排除、哪些仍成立、哪些转交后续卡。
4. **终稿**：结论 + 代码证据 + 命令证据 + 前提 + 局限 + 未验证项 + 风险 + 下一步；无法确认的写 `已确认 / 部分确认 / 证据不足 / 待其他员工完成 / 存在缺陷 / 需要返工 / 暂不执行` 之一。
禁止根据猜测补全关键事实；禁止“最佳实践”“行业惯例”代替本项目证据；禁止“绝对正确”“一定成功”。

## 验收条件（本线整体）

- 本线每张卡的 `<卡号>-verify.md` 由独立验证者给出 PASS（UNKNOWN 只允许出现在无凭证/无 docker 的条目，并写明原因）。
- `git log --first-parent --no-merges --name-only --format= w1-base..HEAD | sort -u` 全部落在本线所有权内（越界一处即整线 FAIL；`--first-parent` 排除合并带入的 M1/CCR 提交，因此合入他线时必须 `git merge --no-ff`）。
- 通用门禁全绿；涉及前台引用文件时 visual 46/46；涉及页面/接口时 e2e 全绿。
- 证据目录完整：`docs/design/06_validation/evidence/W1-E/`（analysis.md、每卡命令输出摘要、截图/日志路径、CCR）。

## 安全铁律（不可违反）

1. 不在聊天、日志、文件名、计划、证据、提交信息中明文出现私钥、token、密码、API key 的值；提到时只写“推送凭据”“访问令牌”等泛称。
2. **推送凭据由用户在本机配置**（credential helper 或权限 600 的 `~/.git-credentials`）；你不接触、不搜索、不打印凭据，也不要求用户把凭据发给你。没有可用凭据就不推送，在汇报里写明。推送后若使用了临时凭据文件立即删除；remote URL 不得含凭据：`git remote get-url origin | grep -qE 'https://[^/]*@' && echo 含凭据 || echo 干净`（SSH 地址 git@github.com 属正常）。
3. 不提交 `.env*`、`prisma/*.db`、`backups/`、`data/`、运行时上传、任何密钥；本地 `.env.local` 只放测试用随机值。
4. 不读取、不迁移凭据类文件（如 main 的 `website_error/.token.txt`）。

## 交付与汇报格式（每个工作包结束、全线结束各一次）

```text
线 <X> / 工作包 <WP> 汇报
- 起点..终点：<w1-base 或上次汇报的 commit>..<HEAD commit>
- 完成的卡：<卡号列表>
- 逐条验收：| 卡号 | 验收条目 | 命令 | exit | 结果 PASS/FAIL/UNKNOWN | 证据路径 |
- 越界检查：git log --first-parent --no-merges --name-only --format= <起点>..HEAD 是否全部在本线所有权内：是/否（否则列出）
- 契约变更请求：<CCR 编号或“无”>
- 未验证项与原因：
- 风险与给其他线的事项：
```
汇报只陈述可复现的事实；判定 PASS 的是独立验证者，不是你。
