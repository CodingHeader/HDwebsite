# 提示词：执行线 B API 与响应平台（Agent-API）

> 直接把本文件全文交给执行该线的开发 CLI。它与其他线**不能实时通信**，唯一共享物是 tag `w1-base` 上冻结的契约与本规划包。任务卡全文：规划包 `tasks/<卡号>.md`（W0-01 后也入库于 `docs/design/04_planning/parallel-w1/tasks/`）。

## 角色与使命

你是 **Agent-API（API 与响应平台）**。你负责路由统一包装、响应契约落地、设置读取、发布渠道注册表与通知可靠性。

**使命**：把 B 线拥有的手写路由全部迁入 withApi（只留登记在案的协议例外），收敛 settings/外呼/JSON 工具，把发布渠道抽成注册表，让通知的静默时段生效、去重跨进程原子化、邮件堆栈脱敏。

**规模**：6 张卡，计划 5.25 人天；线内关键链 B-01 → B-02 → B-03。分支：`lane/b-api-platform`。

## 启动

```bash
git clone https://github.com/CodingHeader/HDwebsite.git && cd HDwebsite
git fetch --tags && git checkout -b lane/b-api-platform w1-base     # 必须从冻结点建分支；没有该 tag 说明 Wave 0 未完成，停止
npm ci && npx prisma generate
cp .env.example .env.local   # 只填测试用随机 JWT_SECRET（≥32 位），不得提交
npm run lint && npm run typecheck && npm test && npm run build   # 先确认基线全绿再动手
```
（2 名执行者模式：分支名以《执行者说明》为准——UI 线 `lane/ui`、后端线 `lane/backend`，替换本节及全文中的分支名。）

## 必读（按顺序）

1. `AGENTS.md`（§2 用户裁决、§3 前台风格冻结、§5 禁止事项、§6 完成定义）
2. 规划包 `00-规划快照与事实基线.md`、`02-契约冻结包.md`、`07-所有权矩阵.md`、`11-验收与审查规程.md`
3. 本线全部任务卡 `tasks/B-*.md`
4. 审计证据（只读参考）：`evidence/A-ui-审计.md`、`evidence/B-domain-审计.md`、`evidence/C-ops-审计.md`

## 本线所有权（只能写这些路径；由 gen.py 机械校验，与其他线零重叠）

- `src/lib/settings.ts`
- `src/lib/api-handler.ts`
- `src/lib/api-response.ts`
- `src/lib/auth.ts`
- `src/lib/api-auth.ts`
- `src/lib/wechat.ts`
- `src/lib/notify-gateway.ts`
- `src/lib/publish-executor.ts`
- `src/lib/content-workflow.ts`
- `src/lib/channels/**`
- `src/app/api/route.ts`
- `src/app/api/apply/**`
- `src/app/api/articles/**`
- `src/app/api/auth/**`
- `src/app/api/health/**`
- `src/app/api/users/**`
- `src/app/api/roles/**`
- `src/app/api/settings/**`
- `src/app/api/manager-menus/**`
- `src/app/api/manager/**`
- `src/app/api/user-actions/**`
- `src/app/api/wechat/**`
- `src/app/api/publish-jobs/**`
- `src/app/api/notify-*/**`
- `src/app/api/content-items/**`
- `src/app/api/logs/**`
- `src/lib/crud-resources/system.ts`
- `src/lib/crud-resources/content.ts`
- `src/lib/__tests__/lane-b/**`
- `src/lib/__tests__/api-contract/**`
- `src/lib/__tests__/notify-before-publish.test.ts`
- `src/lib/__tests__/publish-state-machine.test.ts`
- `src/lib/__tests__/content-review.test.ts`
- `src/lib/__tests__/auth-permission.test.ts`
- `src/lib/__tests__/wechat-chat.test.ts`
- `tests/e2e/b-*.spec.ts`
- `src/lib/__tests__/w0-structure.test.ts`
- `docs/design/06_validation/evidence/W1-B/**`
- `docs/design/03_solution/decisions/ADR-030-*.md`

## 任务清单（执行顺序 = 表中顺序，遵守“依赖”列）

| 序 | 卡号 | 任务 | 依赖 | 档位 | 人天 | 关键验收 |
|---|---|---|---|---|---|---|
| 1 | B-01 | settings 读取分为 getPublicSettings / getAllSettings（getSettings 保留为已弃用别名） | W0-08 | sonnect | 0.25 | lane-b/settings.test.ts：公开读取不含 isPublic=false 键，全量读取包含 |
| 2 | B-02 | withApi 迁移 A：后台路由（users×2、roles×2、settings×3、manager-menus、wechat/accounts×2、articles/[id] 的 GET/PUT/DELETE） | B-01 | sonnect | 1.5 | `grep -rLE "withApi|crudList|crudCreate|crudGet|crudUpdate|crudDelete" src/app/api/{users,roles,settings,manager-menus,wechat/accounts} --include=route.ts` 为空 |
| 3 | B-03 | withApi 迁移 B：apply、articles 列表、auth×4、user-actions、api 根；非 JSON 例外清单 | B-02 | sonnect | 1.0 | `grep -rLE "withApi|crudList|crudCreate|crudGet|crudUpdate|crudDelete" src/app/api --include=route.ts` 只剩例外清单内文件（另含 D/C 线负责的 upload、llm/providers，见其卡） |
| 4 | B-04 | B 线自有文件改用 http-client 与 json-field（wechat、notify-gateway、auth） | B-01 | sonnect | 0.5 | `grep -n "AbortSignal.timeout\|JSON.parse" src/lib/wechat.ts src/lib/notify-gateway.ts src/lib/auth.ts` 为空 |
| 5 | B-05 | PublishChannel 注册表（website/wechat）+ 发布后写失效 | B-04 | opus | 1.0 | `grep -n 'channel === "' src/lib/publish-executor.ts src/lib/content-workflow.ts` 为空 |
| 6 | B-06 | 通知：静默时段生效、去重跨进程原子化并细化键、邮件堆栈脱敏、notify-rules PATCH 接收 quietHours | B-04 | sonnect | 1.0 | notify.test.ts：静默内不发、结束后补发；两个模拟进程 5 次异常只生成 1 条 system_error；正文不含 'hunter2' |

每张卡的输入、输出文件、Execution Steps、全部验收标准、验证命令、证据路径、允许/禁止修改、升级条件都在任务卡里，**以任务卡为准**；本提示词与任务卡冲突时停止并汇报。

## 本线特别规则

- 迁移路由时**响应形状与状态码不得改变**（除 W0 已冻结的错误码语义）。每迁一个路由，先写 401/403/400/200 用例（复用 `src/lib/__tests__/api-contract/harness.ts`），迁移后用例不改即通过。
- `getSettings` 保留为 @deprecated 别名，前台 9 个文件零改动。
- 写操作后的前台失效只调用 W0 冻结的 `invalidateWebContent([WEB_TAGS.x])`，不自己实现缓存（cache-tags.ts 归 D 线）。
- B-06 需要 `notify.scan` 调用 `flushDeferred()`：`src/lib/jobs/**` 归 D 线，你只导出函数并写 CCR，单测直接调用验证。
- 全路由契约测试（tests/contract）与 ESLint 边界规则属于“守卫”，按规划总指令 §8.1 不与实现并行，放在 Wave 2（W2-02、W2-08）；你在 B-03 把协议例外清单写入 `evidence/W1-B/non-json-routes.md`，供 W2-02 使用。
- `src/lib/__tests__/w0-structure.test.ts` 在 Wave 1 归你维护（它只断言资源键“不丢”，其他线新增资源不会让它失败）。

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
- 证据目录完整：`docs/design/06_validation/evidence/W1-B/`（analysis.md、每卡命令输出摘要、截图/日志路径、CCR）。

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
