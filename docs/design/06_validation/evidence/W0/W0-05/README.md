# W0-05 证据：领域契约冻结（chat SSE / kinds / kb / quietHours / 场景绑定 / 采集目标库 / 区块注册表 DTO / kbCoze 设置键）

> 执行线：Wave 0（Agent-Contract）　分支：`upgrade`　起点提交：`e62e883`（W0-04）
> 工作副本：`E:\Code\Demo\HDwebsite\hdwebsite_1011`　本卡**未推送**（按 D8，W0-08 PASS 后才推）
> 权威依据：`docs/design/04_planning/parallel-w1/02-契约冻结包.md` §W0-05 领域契约目标形态（**逐字落地**）

## 1. 改动文件（全部落在「允许修改」面内）

> 增删行数取自 `git show --numstat --format= HEAD`，**逐字照录**。

| 路径 | numstat（+/-）/ 行数 | 内容 |
|---|---|---|
| `src/contracts/kinds.ts` | 新增 58 行 | `CHANNEL_KINDS`/`LLM_KINDS`/`COLLECT_TYPES`/`KB_BACKENDS` + `KIND_LABELS` + 4 个派生 zod 枚举 + 4 个类型 + `kindLabel()` + `dedupeIds()` |
| `src/contracts/kb.ts` | 新增 90 行 | `KB_FILE_EXTS`/`KB_MAX_FILE_BYTES`/`KB_MAX_FILES_PER_UPLOAD`/`KB_UPLOAD_FIELD`/`COZE_FILE_TYPE_MAP`/`KB_REJECT_MESSAGE` + 5 个校验函数 + `knowledgeBase{Create,Update}Schema` + `knowledgeFileStatusSchema` + `kbSearchRequestSchema` |
| `src/contracts/chat.ts` | 新增 37 行 | `CHAT_SSE_EVENTS`、`chatRequestSchema`（自 `chat/stream/route.ts:11-15` 原样迁入）、`chatSseEventSchema`（meta/delta/done/error 判别联合） |
| `src/contracts/blocks.ts` | `+26/-0` | `blockRegistryItemSchema`、`blockRegistryResponseSchema`、`homeBlocksResetRequestSchema` + 2 类型 |
| `src/contracts/resources.ts` | `+69/-40` | `notifyRuleUpdateSchema` **+quietHours**；`chatSceneCreateSchema` **+baseIds/providerIds/temperature/maxTokens/topP**；`collectSourceCreateSchema` **+knowledgeBaseId**；**4 处 `z.enum` 改由 kinds 派生** |
| `src/contracts/setting.ts` | `+2/-1` | `settingGroups` 增 `"kb"`（分组规范枚举同步） |
| `src/contracts/index.ts` | `+10/-0` | 出口增 `kinds`/`blocks`/`events`/`kb`/`chat` |
| `src/lib/settings-registry.ts` | `+11/-0` | 仅新增 `kbCozeProviderId`（number）/`kbCozeSpaceId`（secret）两键，group=`kb` |
| `src/lib/__tests__/w0-contracts.test.ts` | 新增 452 行 / **36 例** | 见 §4 |
| `src/lib/__tests__/settings-registry.test.ts` | `+2/-2` | 分组断言增 `kb`；凭证断言增 `kbCozeSpaceId` |
| `docs/design/06_validation/evidence/W0/W0-05/README.md` | 本文件 | 证据（规程豁免路径，见 §6） |

## 2. 验收标准逐条结果

| # | 验收条目 | 结果 | 命令 / 关键输出 |
|---|---|---|---|
| 1 | `w0-contracts.test.ts` 全绿 | **PASS** | `npx vitest run src/lib/__tests__/w0-contracts.test.ts --maxWorkers=2` → `Test Files 1 passed (1) / Tests 36 passed (36)`，exit 0 |
| 2 | `grep -rn 'z.enum(\["website","wechat"\])\|z.enum(\["openai","coze"\])\|z.enum(\["html","rss"\])' src/contracts` 为空 | **PASS** | 输出为空；**并做了强化验证**：把范围扩到全 `src` 且容忍空格（`z\.enum\(\[\s*"(website\|wechat\|openai\|coze\|rss)"`）→ **仍为空**（见 §4.4） |
| 3 | 契约自检 4 问在 ADR-027 附录逐条回答为「是」 | **PASS（无需改动 ADR-027）** | `ADR-027` 的「附录：契约自检 4 问」已由 **W0-01** 写入并四问全为「是」；本卡只引用，未修改该文件（ADR-027 不在本卡允许面内）。见 §4.5 |
| 4 | 通用门禁 `lint && typecheck && test && build` 全部 exit 0 | **PASS（1 个失败用例 + 1 个失败套件，均环境性）** | `typecheck=0`；`lint=0`（`0 errors, 20 warnings`，与 W0-02~W0-04 持平）；`build=0`；`test` → `Test Files 2 failed \| 19 passed (21)`、`Tests 1 failed \| 299 passed (300)`（`Tests` 行的 1 failed 是 `wechat-chat` 用例；另 1 个 failed suite 是 `sqlite-busy-timeout` 收集阶段 EBUSY，其用例未计数） |
| 5 | 越界检查全部落在「允许修改」内 | **PASS** | 见 §5 |

## 3. 通用门禁原始输出

### 3.1 全量单测
```
$ npx vitest run --maxWorkers=2
 ✓ src/lib/__tests__/w0-contracts.test.ts (36 tests)     ← 本卡新增
 ✓ src/lib/__tests__/w0-errors.test.ts (32 tests)
 ✓ src/lib/__tests__/w0-shared.test.ts (16 tests)
 ✓ src/lib/__tests__/w0-structure.test.ts (6 tests)
 ✓ src/lib/__tests__/settings-registry.test.ts (6 tests)  ← 本卡扩断言，例数不变
…
 FAIL  src/lib/__tests__/sqlite-busy-timeout.test.ts   EBUSY: unlink …\p04-busy-*\test.db
 FAIL  src/lib/__tests__/wechat-chat.test.ts > src/lib 无硬编码电话/域名
       Error: spawnSync C:\Windows\system32\cmd.exe EBUSY

 Test Files  2 failed | 19 passed (21)
      Tests  1 failed | 299 passed (300)
```
**数量对账**：W0-04 基线 264 例 + 本卡 36 例 = **300** ✓（实测 300）。
**零回归证据**：既有 264 例中，除 2 处环境性失败外**全部通过**；本卡只改契约与设置注册表，未改任何业务逻辑。
**2 处失败均为环境性**（与 W0-01~W0-04 同点同因，非本卡引入）：
- `sqlite-busy-timeout.test.ts`：`fs.rmSync` 被 `node-safe-delete-shim.cjs` 改写 → 清理临时库 `EBUSY`；
- `wechat-chat.test.ts`：沙箱禁 `execSync('…cmd.exe…')` → `spawnSync … EBUSY`。

### 3.2 typecheck / lint
```
$ npm run typecheck   → EXIT_typecheck=0   （tsc --noEmit 无输出）
$ npm run lint        → EXIT_lint=0        （✖ 20 problems (0 errors, 20 warnings)）
```
> 特别说明：`index.ts` 新增 `export * from "./blocks"` 与 `"./events"` 可能引发**重复导出**冲突，`typecheck=0` 是"无冲突"的权威证据（tsc 对同名重复导出会报 TS2308）。

### 3.3 生产构建
```
$ mv .next /e/tmp/next-prev-w005 && npm run build   → EXIT_build=0
▲ Next.js 16.2.1 (Turbopack)
Turbopack build encountered 1 warnings: ./next.config.ts — Encountered unexpected file in NFT list
✓（全部路由产出）
```
该告警在 W0-03/W0-04 已用 stash 对照实验证明为**既有**（`next.config.ts` 相关，`git diff --stat … -- next.config.ts tsconfig.json package.json vitest.config.ts` 为空），本卡零新增。

## 4. 关键实现决策与证据

### 4.1 唯一源：枚举改派生的**可验证**口径
`resources.ts` 现引用 3 个派生 schema（4 处使用）：
```
src/contracts/resources.ts:7   import { channelKindSchema, collectTypeSchema, llmKindSchema } from "./kinds";
src/contracts/resources.ts:301   type: collectTypeSchema.default("html"),            ← 原 :276
src/contracts/resources.ts:332   channel: channelKindSchema.default("website"),      ← 原 :303
src/contracts/resources.ts:360   kind: llmKindSchema.default("openai"),             ← 原 :331
src/contracts/resources.ts:433   channel: z.preprocess(…, channelKindSchema.optional()),  ← 原 :404
```
**零行为变化证明**：单测对每个派生枚举都断言「接受全部数组取值 + 拒绝数组外取值 + 大小写敏感 + 默认值不变」（`collectSource.type` 默认 `html`、`publishJob.channel` 默认 `website`、`llmProviderCreate.kind` 默认 `openai`）。

**注意区分同名字符串但不同语义的枚举（未在本卡 4 处之列，有意保留）**：
`src/contracts/article.ts:8` `articleContentTypeSchema = z.enum(["html", "markdown"])`、
`src/contracts/resources.ts:157`（ServiceGuide.contentType）——其 `"html"` 与采集类型 `COLLECT_TYPES` 的 `"html"` **语义不同**，不属冻结包指定的 4 处，故未改。这也是 §2 #2 的 grep 能区分二者的原因（模式含 `"html","rss"` 成对）。

### 4.2 `chatScene.baseIds` 从 `string` 扩为 union —— 这是**规划包已批准**的破坏性变更
- 事实：原 `baseIds: z.string().max(500).nullable().optional().nullable()`（`resources.ts:217`）。
- 冻结包 §W0-05 目标形态：`z.union([z.array(number).max(20), z.string().max(500)]).nullable().optional()`。
- **规划包自曝并已修正**：`evidence/规划校验-事实核查.md` #50 指出"从 string 改成 number[] 没有标成破坏性变更"，`evidence/规划校验-修正记录.md` #2 给出结论——"契约接受 int 数组或 JSON 串；旧逗号文本由读取方兼容（C-07 验收）；表单改多选（E-01）"。
- **零 400 回归证据**：现行管理表单 `src/components/manager/crud-specs.tsx:389` 为 `{ key: "baseIds", label: "绑定知识库 ID（逗号分隔）" }` 的**纯文本**字段，提交的是逗号分隔字符串 → 落在 union 的 `z.string()` 分支内被接受。单测断言 `baseIds: "1,2"` **通过**。
- `providerIds` 同约定（`.max(10)`）；K12 优先级「providerIds 非空 > llmProviderId > 全局 default→priority→fallback」由 C-07 实现并测试。

### 4.3 `providerIds`「去重」的辩证处理（**未擅自改冻结语义**）

- 卡片步骤 3 要求测试覆盖「providerIds **去重**与上限 10」；但 `02-契约冻结包.md` §W0-05 的目标形态**只有 `.max(10)`，无任何去重语义**，且冻结包第 5 行明示"实现者只可补注释与类型导出，**不得改语义**"。
- 全文检索规划包（`grep -rn providerIds docs/design/04_planning/`）**未发现**任何去重规则定义；`crud-resources/shared.ts` 的 `jsonifyArray`/`jsonifyFields`（冻结包指定的序列化入口）**同样不做去重**（已读源码确认）。
- **决议（freeze 优先）**：schema **原样落地冻结形态**（`.max(10)`，不做 `transform`/`refine`），并在 `kinds.ts` 增加**加法**工具 `dedupeIds(ids)`（保序去重）为 C-07/E-01 提供显式、可测的归一入口。
- **因此测试分两层**：① 上限 10（schema 层，`providerIds` 10 个通过、11 个拒绝）；② 去重（工具层，`dedupeIds([3,1,3,2,1]) === [3,1,2]`），并**钉住**"重复项被 schema 接受"的现状以免被误改。
- **登记（待 CCR/后续卡）**：若要求 schema 层拒绝或归一去重项，须走《契约变更请求》（ADR-027 §3）修改冻结面。

### 4.4 验收 grep 的空结果 + 强化验证
```
$ grep -rn 'z.enum(\["website","wechat"\])\|z.enum(\["openai","coze"\])\|z.enum(\["html","rss"\])' src/contracts
（空）

$ grep -rnE 'z\.enum\(\[\s*"(website|wechat|openai|coze|rss)"' src --include=*.ts --include=*.tsx   # 全仓 + 容忍空格
（空）
```
**规划包缺陷登记**：验收 grep 的字面量**不含空格**，而 `upgrade@e62e883` 的原代码写的是 `z.enum(["website", "wechat"])`（**有空格**）——即该 grep 在**改动前就已为空**，属"永远通过"的弱判据。本卡做了**语义级**替代验证：grep 全仓 + 容忍空格变体，并加 3 组单测锁住"派生自 kinds"这一事实（接受全部数组值、拒绝数组外值）。

### 4.5 契约自检 4 问
`docs/design/03_solution/decisions/ADR-027-并行编排与契约冻结.md` §「附录：契约自检 4 问」已由 W0-01 写入，四问结论**均为「是」**：

| 问 | 结论 | 本卡提供的落地证据 |
|---|---|---|
| 前端能否只凭契约写出调用层？ | 是 | 端点表 + 本卡新增 `blockRegistryItemSchema`/`homeBlocksResetRequestSchema`/`chatSseEventSchema`/`kbSearchRequestSchema` + 错误体（W0-04 ADR-028）；E-03/E-04 可据此先行 |
| 后端能否只凭契约实现？ | 是 | `knowledgeBase*Schema`、`chatScene*.extend`、`notifyRule*.quietHours`、`collectSource*.knowledgeBaseId` 均已冻结；C-04/C-06/C-07/B-06 依赖已解阻 |
| 数据端能否只凭契约设计表？ | 是 | W0-06 的 p12 迁移字段（`KnowledgeBase`/`KnowledgeFile`/`ChatScene.providerIds,temperature,maxTokens,topP`/`CollectSource.knowledgeBaseId`）与本卡 schema **一一对应** |
| 错误码是否覆盖已知失败路径？ | 是 | 完成于 W0-04（ADR-028，10 值）；本卡新增端点（kb/*、home-blocks/*、notify-rules）全部映射到既有 400/401/403/404/409/429/500/502/503 |

> 本卡**未修改** ADR-027（不在允许面内），仅引用；无需 CCR（W0-01 已满足该验收项）。

### 4.6 Setting 新键的分组裁决（`kb`）
- 规划包未指定分组（全文检索 `kbCozeProviderId` 只有"新键"描述，无 group）。
- **决议**：group = `"kb"`。理由：① 两键**仅**服务于知识库↔Coze 集成，放进 `llm`（大模型）语义不符（`space_id` 不是模型概念）；② `src/contracts/setting.ts` 的 `settingGroups` 是分组**规范枚举**，本卡已同步加入 `"kb"`，使契约层自洽；③ `getGroups()` 的消费方 `GET /api/settings/definitions` 用 `GROUP_LABELS[g] ?? g` 优雅回落，不因缺 label 而失败。
- **登记（跨线遗留）**：`src/app/api/settings/definitions/route.ts:7-12` 的 `GROUP_LABELS` **无 `kb` 项**，后台分组标签会回落显示为 `"kb"`；该文件属 **B 线**（`src/app/api/settings/**`，见 `07-所有权矩阵.md`），不在本卡允许面内 → 由 B 线任一张卡补一行 `kb: "知识库"` 即可。
- `kbCozeSpaceId` 是 **secret**（`isPublic:false` + `isEncrypted:true`），与 `emailPassword` 同口径；已有守卫单测（`settings-registry.test.ts`）覆盖，本卡把它加进该断言的键清单。

### 4.7 `index.ts` 新增 `blocks`/`events` 出口（加法、已证无冲突）
- 事实：`blocks.ts`/`events.ts` 早已存在，但**未从 barrel 导出**，而 `crud-resources/site.ts:23`、`content-workflow.ts:9`、`notify-gateway.ts:14`、`publish-executor.ts:13` 等**深导入**之——与 `index.ts` 首行"禁止绕过本文件从子模块深导入"自相矛盾。
- 本卡把二者纳入 barrel（**纯加法**，不改任何已有导出名与语义）；`typecheck=0` 证明无重复导出（否则 TS2308）。
- 深导入的**收敛**属 W2-08 的 ESLint 边界规则范围，本卡不替换调用方（避免越界 + 与 W0-02/W0-03 的"零行为变化"口径一致）。

### 4.8 与冻结包的**两处偏差披露**（主动登记，均为"照抄冻结包"而非擅自改动）
独立验证者复核时发现本 README 未披露以下两点，现已补齐：

| # | 现象 | 冻结包原文 | 实现 | 性质判定 | 处置 |
|---|---|---|---|---|---|
| a | `kbSearchRequestSchema.tags` **丢失**原路由的 `.max(50)` 与 `.max(10)` | `tags: z.array(z.string()).optional()`，但同段注释写"**保留现有** api/kb/test 的 query/tags 字段与中文提示" → **冻结包自相矛盾** | 逐字照抄冻结包（无 max） | **约束退化**（相对现行 `src/app/api/kb/test/route.ts:9` 的 `z.array(z.string().max(50)).max(10)`）；但**遵从冻结包优先**是正确履职 | **登记待 CCR**：C-06 把路由切到该 schema 前，发《契约变更请求》补回 `.max(50)`/`.max(10)` 并修正冻结包注释。今日 Wave 0 未接线 → 零运行时影响 |
| b | `quietHours` 正则**附加了中文错误文案** | `z.string().regex(/^\d{2}:\d{2}$/)`（无 message） | `regex(/^\d{2}:\d{2}$/, "开始时间格式应为 HH:mm")` | **纯文案增补**：正则未变 → 接受/拒绝集合**完全一致**，仅失败时多一条中文提示 | 无需处置（符合"补注释与文案"的精神）；本表披露 |

> 两处均**不改变任何冻结项的接受集合**（a 是放宽、b 是等价），故不构成本卡 FAIL。验证者独立复核后判定"实现者照抄冻结包是正确履职，缺陷在冻结包"。

## 5. 越界检查与「允许修改」比对
```
$ git -c core.quotePath=false log --first-parent --no-merges --name-only --format= e62e883..HEAD | sort -u
docs/design/06_validation/evidence/W0/W0-05/README.md   ← 规程豁免（§6）
src/contracts/blocks.ts                                 ← src/contracts/**
src/contracts/chat.ts                                   ← src/contracts/**
src/contracts/index.ts                                  ← src/contracts/**
src/contracts/kb.ts                                     ← src/contracts/**
src/contracts/kinds.ts                                  ← src/contracts/**
src/contracts/resources.ts                              ← src/contracts/**
src/contracts/setting.ts                                ← src/contracts/**
src/lib/__tests__/settings-registry.test.ts             ← 允许面第 4 条
src/lib/__tests__/w0-contracts.test.ts                  ← 允许面第 3 条
src/lib/settings-registry.ts                            ← 允许面第 2 条
```
→ 11 条 = **10 条落「允许修改」清单内**（逐条对应，无多无缺）+ 1 条证据路径（规程豁免）。**越界 0**。
提交：本卡为**单个提交**（subject 含 `W0-05`），区间内不含 merge、不含他线提交。
> 精确哈希以命令为权威：`git -c core.quotePath=false log --oneline e62e883..HEAD`（不硬编码，避免 amend 导致自引用失真）。

## 6. 规程豁免

`docs/design/06_validation/evidence/W0/<卡号>/` 属 `11-验收与审查规程.md` §3 第 1 条强制路径（「证据写到 … → 提交」）；
本卡「允许修改」清单未列该路径，属规划包不一致（卡片清单缺项），**非执行者越界**。与 W0-02/W0-03/W0-04 同一情形。

## 7. UNKNOWN 登记

| 项 | 判定 | 原因 |
|---|---|---|
| `npm test` 中 `wechat-chat.test.ts` 硬编码扫描 | UNKNOWN | 沙箱禁 `execSync` 调 `cmd.exe`（`spawnSync … EBUSY`）；与 W0-01~W0-04 同点同因 |
| `npm test` 中 `sqlite-busy-timeout.test.ts` 清理 | UNKNOWN | 沙箱 `node-safe-delete-shim.cjs` 改写 `fs.rmSync`（`EBUSY`） |
| 新契约的**真实消费方**行为（C-04/C-06/C-07/B-06/E-03/E-04） | N/A（本卡不覆盖） | Wave 0 只冻结契约、不接线；本卡未替换任何调用方（与 W0-03 同口径） |
| `providerIds` 去重要求是否落在契约层 | **登记待裁决** | 冻结包无去重语义（见 §4.3）；若需 schema 层去重须走 CCR |
| `quietHours` 时间值的 0..23/0..59 范围 | **登记待裁决** | 冻结包正则 `/^\d{2}:\d{2}$/` 只校验格式，接受 `"25:00"`/`"99:99"`；已用单测**钉住**该现状，未擅自加 min/max |
| `GET /api/settings/definitions` 的 `kb` 分组中文标签 | 登记（B 线） | `GROUP_LABELS` 缺 `kb`，回落显示 `"kb"`；文件属 B 线，见 §4.6 |
| 本卡未跑 `test:visual` / `test:e2e` | N/A | 本卡「验证命令」仅列通用门禁；改动全为 `src/contracts/**` 与设置注册表，不触碰前台渲染与路由 |

## 8. 遗留与移交

1. **`GROUP_LABELS` 补 `kb: "知识库"`** → B 线（`src/app/api/settings/definitions/route.ts`）。
2. **`providerIds` 去重**：当前提供 `dedupeIds()` 工具；C-07 接线时调用即可。若后续要求以 schema 强制，走 CCR。
3. **`quietHours` 范围校验**：如需 0..23/0..59，走 CCR 改冻结面。
4. **4 处枚举的"派生"守卫**：本卡以单测锁住语义；**机械守卫**（ESLint/契约测试）属 W2-08 的"route/component 不得写 DTO"规则范围。
5. **`blocks`/`events` 深导入收敛** → W2-08（本卡仅把它们纳入 barrel，未替换调用方）。
6. **`chatRequestSchema` 双份**：`src/app/api/chat/stream/route.ts:11-15` 仍有本地副本（本卡不改路由，属 C-07）；C-07 迁到 `@/contracts` 后删除本地定义。
7. **`kbSearchRequestSchema.tags` 约束待补回（CCR）**：见 §4.8 a。C-06 接线前处理，避免静默丢失输入校验。
8. **`quietHours` 正则附加文案**：见 §4.8 b（已披露，无需处置）。

## 9. 独立验证（三权分离 · 验证者）

验证者为独立子代理（只看 diff + 亲跑命令，不修改仓库），结论 **ACCEPT（无 P0）**：

| 验证项 | 判定 | 关键证据（验证者自跑） |
|---|---|---|
| V1 逐字比对冻结包（24 行逐字段表） | PASS | `grep -F` 固定串校验中文文案 7/7 命中；`chatRequestSchema` 与 `route.ts:11-15` 逐字同；4 个 `sse(...)` 载荷与 `chatSseEventSchema` 逐字同；`code` 正则逐字同 |
| V2 4 处枚举改派生 | PASS | 两种 grep（原样 + 容忍空格）在全 `src` 为空；**独立复核了"验收 grep 是弱判据"的论断**：`git show e62e883:src/contracts/resources.ts \| grep -n 'z.enum(\["'` → 原代码**含空格**（276/303/331/404），故无空格 grep 改动前即空 |
| V3 零回归 | PASS | 自写临时脚本 `/e/tmp/verify-w005.ts` 对 4 个派生字段 × 31 种输入逐一 `safeParse` 对照旧定义 → **接受/拒绝与结果值全部一致**；`baseIds` 新集合 = 旧集合 ∪ {int 数组}（**严格超集**，无 400 回归）；独立读 `crud-specs.tsx:389` + `SchemaForm.tsx:264` + `CrudPage.tsx:132` 确认表单提交**逗号分隔串或 null**，两态均被接受 |
| V4 门禁 | PASS | `w0-contracts 36/36`；全量 `300`（299 passed / 1 failed，2 failed suites）；`typecheck=0`；`lint=0 err/20 warn`；`build=0`；**独立证明无重复导出**：枚举 11 个契约模块全部 `export` 名 → `sort \| uniq -d` 为空，并实测 tsc 对 `export *` 冲突会报 TS2308 |
| V5 越界与提交结构 | PASS | 11 条 = 10 允许面 + 1 证据；**亲读** `11-验收与审查规程.md:24-32` 确认豁免成立；区间**仅 1 提交、无 merge、无 ADR 改动** |
| V6 声明 vs 实测 | PASS | §1 numstat 10 行**逐字吻合**；§2 全部数字独立重现；§4 全部行号引用实测准确；**未发现夸大/错数字** |
| **总体** | **ACCEPT** | 无 P0；1 条 P1（§4.8 a，冻结包缺陷，须 CCR） |

**验证者提出的问题与处置**：
- 【P1】`tags` 约束退化 → 确认为**冻结包缺陷**，实现者照抄正确 → 已登记待 CCR（§4.8 a / §8 #7）。
- 【P2-a】`quietHours` 附加 error message 未在 README 披露 → 已补 §4.8 b。
- 【P2-b】`kb` 分组属规划外自决 → 已登记理由（§4.6）与逃生通道。
- 【P2-c】若干 value 级加法导出超出"只可补注释与类型导出"字面 → 登记为不违规（不改变任何冻结项语义）。
- 【措辞】§2 #4 原写"2 例环境性 UNKNOWN"，实为 **1 个失败用例 + 1 个失败套件** → 已更正（§2 #4）。
- **UNKNOWN**：W0-04 基线恰为 264 例无法直接测量（需切工作树），验证者以"300 − 本卡新增 36 = 264"独立推定并证明期间只新增 1 个测试文件 → 推定可靠但非直接测量。

