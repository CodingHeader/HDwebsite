# 提示词：执行线 C AI 与知识库（Agent-AI）

> 直接把本文件全文交给执行该线的开发 CLI。它与其他线**不能实时通信**，唯一共享物是 tag `w1-base` 上冻结的契约与本规划包。任务卡全文：规划包 `tasks/<卡号>.md`（W0-01 后也入库于 `docs/design/04_planning/parallel-w1/tasks/`）。

## 角色与使命

你是 **Agent-AI（AI 与知识库）**。你负责 LLM/知识库适配器、Coze 知识库集成、文件管线、本地检索、知识库 API、场景装配与 SSE、模型配额。

**使命**：让知识库真正可用（库/文件/条目/检索，Word/Markdown/TXT 进、PDF/图片拒），把 Coze 作为可注册的后端，让官网与公众号客服按场景使用多模型优先级、参数与知识库，并让模型配额/限频生效。

**规模**：9 张卡，计划 10.0 人天；线内关键链 C-01 → C-02 → C-04 → C-06。分支：`lane/c-ai-kb`。

## 启动

```bash
git clone https://github.com/CodingHeader/HDwebsite.git && cd HDwebsite
git fetch --tags && git checkout -b lane/c-ai-kb w1-base     # 必须从冻结点建分支；没有该 tag 说明 Wave 0 未完成，停止
npm ci && npx prisma generate
cp .env.example .env.local   # 只填测试用随机 JWT_SECRET（≥32 位），不得提交
npm run lint && npm run typecheck && npm test && npm run build   # 先确认基线全绿再动手
```
（2 名执行者模式：分支名以《执行者说明》为准——UI 线 `lane/ui`、后端线 `lane/backend`，替换本节及全文中的分支名。）

## 必读（按顺序）

1. `AGENTS.md`（§2 用户裁决、§3 前台风格冻结、§5 禁止事项、§6 完成定义）
2. 规划包 `00-规划快照与事实基线.md`、`02-契约冻结包.md`、`07-所有权矩阵.md`、`11-验收与审查规程.md`
3. 本线全部任务卡 `tasks/C-*.md`
4. 审计证据（只读参考）：`evidence/A-ui-审计.md`、`evidence/B-domain-审计.md`、`evidence/C-ops-审计.md`

## 本线所有权（只能写这些路径；由 gen.py 机械校验，与其他线零重叠）

- `src/lib/llm/**`
- `src/lib/llm-gateway.ts`
- `src/lib/coze.ts`
- `src/lib/kb/**`
- `src/lib/kb-adapter.ts`
- `src/lib/kb-sync.ts`
- `src/lib/chat-service.ts`
- `src/app/api/llm/**`
- `src/app/api/kb/**`
- `src/app/api/knowledge/**`
- `src/app/api/knowledge-bases/**`
- `src/app/api/knowledge-files/**`
- `src/app/api/chat-scenes/**`
- `src/app/api/chat/**`
- `src/app/api/chat-history/**`
- `src/components/web/ChatWidget.tsx`
- `src/lib/crud-resources/kb-ai.ts`
- `src/lib/__tests__/lane-c/**`
- `src/lib/__tests__/collect-autokb.test.ts`
- `src/lib/__tests__/p06-followups.test.ts`
- `tests/e2e/c-*.spec.ts`
- `docs/design/06_validation/evidence/W1-C/**`
- `docs/design/03_solution/decisions/ADR-029-*.md`

## 任务清单（执行顺序 = 表中顺序，遵守“依赖”列）

| 序 | 卡号 | 任务 | 依赖 | 档位 | 人天 | 关键验收 |
|---|---|---|---|---|---|---|
| 1 | C-01 | LLMProviderAdapter 注册表（openai/coze）+ providers 路由 withApi + 测试端点复用适配器 | W0-08 | opus | 1.0 | `grep -rn 'kind === "coze"' src/lib src/app/api` 为空 |
| 2 | C-02 | KnowledgeBackend 接口与注册表，合并 P06 的 KbRemoteAdapter | C-01 | sonnect | 1.0 | collect-autokb.test.ts 不改断言即通过 |
| 3 | C-03 | 知识库文件管线纯函数：类型三重校验、docx 解析、切分 | W0-08 | sonnect | 1.0 | kb-file.test.ts：伪装文件全部被拒且返回 KB_REJECT_MESSAGE；docx 抽出预期文本；切分边界与重叠正确 |
| 4 | C-04 | Coze 知识库客户端：建库/推文档(≤10/批)/进度/删除 + 错误映射 + 自注册 | C-02, C-03 | sonnect | 1.5 | kb-coze.test.ts：URL/Header/body 正确；11 个文件分 2 批；md→txt；4013 → 权限中文提示 |
| 5 | C-05 | 本地检索：按库过滤 + bigram/关键词/标题加权打分 + LIKE 预筛 ≤500 + 命中率基线 | C-02 | sonnect | 1.0 | kb-search.test.ts 通过且断言新命中率 ≥ 旧命中率 |
| 6 | C-06 | 知识库 API：库 CRUD+同步、文件上传(≤10MB 三重校验)/列表/删除/重解析/进度、kb/test 扩 baseIds/topK | C-04, C-05 | sonnect | 2.0 | kb-api.test.ts：上述 400/200/级联/401/403 用例全绿 |
| 7 | C-07 | 场景绑定 providerIds/参数/baseIds；chat/stream 用 SSE 契约与 429；ChatWidget 仅解析改 safeParse | C-01, C-05 | sonnect | 1.0 | chat-scene.test.ts 全绿（优先级、回落、两渠道 messages 全等、第 11 次请求 429、baseIds/providerIds 的 JSON 数组串与旧逗号文本都能解析） |
| 8 | C-08 | 采集→目标库：ingestCollectItem 读取 CollectSource.knowledgeBaseId（默认“采集资讯”）并推送 Coze(txt) | C-04 | sonnect | 0.5 | collect-autokb.test.ts：条目 baseId = 源指定库或默认库；mock Coze 收到 file_type=txt |
| 9 | C-09 | LLM dailyQuota / rateLimit 生效，全部超限返回 503 | C-07 | sonnect | 1.0 | llm-limits.test.ts：配额满跳到下一个；滑窗第 N+1 次跳过；全部超限 503；北京时间 00:00 重置 |

每张卡的输入、输出文件、Execution Steps、全部验收标准、验证命令、证据路径、允许/禁止修改、升级条件都在任务卡里，**以任务卡为准**；本提示词与任务卡冲突时停止并汇报。

## 本线特别规则

- 知识库上传白名单只有 `.docx/.doc/.md/.markdown/.txt`；扩展名 + MIME + 文件头三重校验；**严禁**引入任何 PDF/图片解析或 OCR 依赖，严禁放宽白名单（ADR-025，用户裁决 D3）。
- 只有一个知识库注册表：P06 的 `registerKbRemoteAdapter` 保留导出名，作为新注册表的薄包装；Coze 后端在模块加载时自注册，**不改 `src/instrumentation.ts`**（D 线所有）。
- 采集入库不改 `collect-engine.ts`（D 线所有）：`ingestCollectItem` 内部读取 `CollectSource.knowledgeBaseId`。
- `ChatWidget.tsx` 只允许替换 SSE 解析逻辑（约 :89-131），JSX 与 className 不动，visual 46/46。
- 场景模型顺序：`providerIds` 非空 → 否则 `llmProviderId` → 否则全局 default→priority→fallback（K12），测试要覆盖回落。
- 日界一律 Asia/Shanghai；Coze 真实联调无凭证 → mock 测试，验收记 UNKNOWN。实现 Coze 接口前先核对 docs.coze.cn 当前文档，把 URL 与访问日期写入证据。

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
- 证据目录完整：`docs/design/06_validation/evidence/W1-C/`（analysis.md、每卡命令输出摘要、截图/日志路径、CCR）。

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
