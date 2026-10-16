# 执行者 Y 完整提示词：契约与后端平台线（Wave 0 契约员 → B API 平台 → C AI 与知识库 → D 运维 → Wave 2 依赖与性能）

> 本文件可单独下发，自带全部任务卡、所有权、验收与验证规程。规划包同目录的 `tasks/*.md` 是同一份数据的分卡版本，两者一致；若与仓库真实代码冲突，以命令结果为准并停止汇报。

## 角色与使命

你是 **执行者 Y**，一人承担四个角色，按时间顺序：
1. **Wave 0 契约员**（唯一写入者）：把 upgrade 从 `bb2c0e5` 推进到可并行的冻结点 tag `w1-base`。你产出的契约、唯一迁移 p12、共享模块签名、一次性加齐的依赖，是两条线唯一的共享物——错一处两条线都返工。
2. **后端平台执行者**（Wave 1，分支 `lane/backend`）：B 把手写路由迁入 withApi、发布渠道注册表、通知可靠性；C 让知识库真正可用（Word/MD/TXT 进、PDF/图片拒）、Coze 后端、场景多模型、SSE、配额；D 让启动快、env 可校验、设置对等、前台缓存、存储根迁出构建目录、运行时文件迁出 git、采集可扩展。
3. **X 的独立验证者**：验证 X 的每个工作包，包括 A-07 检查点；Wave 2 做终审验证。
4. **Wave 2 收尾执行者**（分支 `w2/backend`）：依赖收口、资源/根目录守卫、性能复测。

**规模**：Wave 0 8 张卡 5 人天；B 6 张 5.25 人天 + C 9 张 10 人天 + D 12 张 9.25 人天 = 24.5 人天；Wave 2 3 张。全项目计划约 **37.0 人天**：第 0~5 天 Wave 0 → 约第 5~29.5 天 B+C+D → Wave 2 配合 X。

**你必须守住的三条底线**：前台视觉与 `origin/main@94dbbbb` 逐像素一致（visual 46/46）；Wave 0 之后契约/迁移/依赖/测试配置冻结，你也不能“顺手”改；知识库只收 `.docx/.doc/.md/.markdown/.txt`，严禁引入 PDF/图片解析或 OCR。

## 项目事实快照（2026-10-13 实测；开工后以你自己的命令结果为准）

- 仓库：`https://github.com/CodingHeader/HDwebsite`（公开）。前台视觉标准 = `origin/main@94dbbbb`（红色横幅轮播）。
- 开发基线：`upgrade@bb2c0e51364aca4608d2a5832e31462b9c54ccf8`。P0~P06 已完成：visual 46/46、E2E 8/8、vitest 17 文件 210 测试。
- 基线门禁：`npm ci`、`npx prisma generate`、`npm run lint`（0 error / 21 warning）、`npm run typecheck`、`npm test`、`npm run build`（约 77s）全部 exit 0。
- 管理端：`/manager` 36 页 = 25 个 CrudPage 规格页 + 1 个 content-hub 包装页 + 10 个特殊页；页面层原生控件 46 处；`@radix-ui` 仍被 7 个文件引用。
- API：24 个路由未走 withApi/CRUD，另 2 个混合文件；错误码只有 200/400/401/403/404/500（限流目前返回 400，503 不存在）。
- 知识库：P06 已有 `kb-sync.ts` 注册入口但未注册 Coze；`ChatScene.baseIds` 字段已存在但后端未读取。
- 存储：standalone 构建后 `.next/standalone/uploads` ≈ 32M，运行后增至 ≈ 45M / 526 文件——运行时写进了构建目录。
- 性能基线：首页 JS gzip 227,007 B；`/manager` 345,853 B；`/manager/articles` 352,019 B；standalone Ready 7.3s；首页热 TTFB ≈ 33~42ms；文章列表 API TTFB ≈ 20~31ms。
- 已定裁决：D6 保留 `data.fieldErrors`；D7 `created()` 业务 code 200 / HTTP 201；D8 Wave 0 通过后推送 upgrade 与 tag `w1-base`；D9 保留前台死组件 `ApplyForm` 及其依赖；D11 执行者 2 名（X、Y）。

## 团队与协作方式（两人都按这一节执行）

| | 执行者 X（管理端 UI 线） | 执行者 Y（契约与后端平台线） |
|---|---|---|
| Wave 0 | 逐卡独立验证 Y 的 W0 提交，W0-08 给最终 PASS/FAIL | 契约员：W0-01~W0-08，直接提交在 upgrade |
| Wave 1 | 分支 `lane/ui`：A → A-07 检查点 → E → A-08 | 分支 `lane/backend`：B → C → D |
| 交叉验证 | 验证 Y 的每个工作包 | 验证 X 的每个工作包（含 A-07 检查点） |
| Wave 2 | 集成者：W2-01、W2-02、W2-08、W2-05、W2-06、W2-07 推送打包 | 分支 `w2/backend`：W2-03、W2-09、W2-04；做 W2-07 终审验证 |

1. **没有实时通信**。两人之间只有三种共享物：git 远端（分支与 tag）、本规划包、由用户转交的《验证请求》/《验证报告》文本。
2. **验证请求**（执行者在一个工作包完成、推送分支后发出，交用户转给对方）：
```text
验证请求 <线>/<工作包>
分支：<lane/ui | lane/backend | upgrade>　起点..终点：<commit>..<commit>
卡号：<列表>（验收标准与命令见我的提示词“任务卡”节，对方提示词里也有同一份规划包 tasks/）
已跑：lint/typecheck/test/build（exit 码）、visual、e2e、本卡命令
已知 UNKNOWN：<条目与原因>
```
3. **验证报告**由验证者按本提示词“独立验证者职责”节产出，交用户转回；被验证方把它原样提交进自己证据目录（`docs(<卡号>): verify report`）。验证者**不往对方分支提交**。
4. **等验证时不空等**：继续做依赖已满足的下一张卡。必须等 PASS 才能继续的硬闸门只有三个：`w1-base`（W0-08）、`w1-ui-kit`（A-07，挡 E-05/E-06）、Wave 2 进入条件。
5. 同一卡连续 2 次验证 FAIL → 熔断：停止改代码，写失败分析，交用户裁决。
6. 两人都需要改同一冻结面（契约、迁移、依赖、配置）→ 写《契约变更请求》交用户裁决；批准后由 Y 在 upgrade 上做最小提交并打 `w1-base-ccr-<n>`，双方 `git merge --no-ff` 该 tag。

## 阶段 0：Wave 0 契约员（直接提交在 upgrade）

```bash
git clone https://github.com/CodingHeader/HDwebsite.git && cd HDwebsite
git fetch --all --tags
git checkout upgrade && git log -1 --format=%H   # 必须是 bb2c0e51364aca4608d2a5832e31462b9c54ccf8，否则停止并汇报
npm ci && npx prisma generate
cp .env.example .env.local   # 只填测试用随机 JWT_SECRET（≥32 位）；不得提交
npm run lint && npm run typecheck && npm test && npm run build   # 先确认起点全绿，否则停止并汇报
```

必读（按顺序）：`AGENTS.md` → 规划包 `00-规划快照与事实基线.md`、`01-需求基线复核.md`、`02-契约冻结包.md`、`03-数据模型与迁移编排.md`、`07-所有权矩阵.md`、`11-验收与审查规程.md` → 审计证据 `evidence/B-domain-审计.md`、`evidence/C-ops-审计.md`。

**Wave 0 特别规则**

- 你直接在 `upgrade` 上提交，**严格按 W0-01 → W0-03 → W0-R0（V0.4 变基重校准）→ W0-04 → W0-08 串行**，每张卡一个或数个提交。
- W0-02 与 W0-03 必须“零行为变化”：只搬迁/新增，不替换任何调用方（替换是各线的任务）。
- W0-04/W0-05 的目标形态已写在 `02-契约冻结包.md`（字段名、取值、中文文案都已定）。你只能补注释与类型导出；发现目标形态与真实代码冲突 → 停止并汇报，不得自行改语义。
- W0-06 迁移：`--create-only` 生成后逐行审，出现 DROP / RedefineTables / `INSERT INTO "new_` 就改 schema 去掉 relation；在 p06 状态库副本上验证行数、integrity_check、foreign_key_check，rollback 可逆。
- W0-07 一次性加入全部新依赖（mammoth（TipTap 8 包 ^3.31.4 与 @axe-core/playwright 已由 827646b 加入，不得回退）、、jsdom、@testing-library/react、@testing-library/dom、@axe-core/playwright），Wave 1 期间任何线不再动依赖。
- W0-08：独立验证者 PASS 后打 `git tag w1-base`，**推送 upgrade 与 tag**（用户 2026-10-13 裁决 D8；凭据按安全铁律由用户本机配置）。
- 每张 W0 卡完成即推送 upgrade 并向 X 发验证请求（起点为上一张卡的终点）；X 判 PASS 才进入下一张依赖它的卡。
- 你在 Wave 0 的所有权：各 W0 卡“允许修改”所列路径（含 `src/contracts/**`、`prisma/**`、`package.json`、`vitest.config.ts`、`AGENTS.md`、`docs/design/**` 等）；**`w1-base` 打出后全部收回**。

| 序 | 卡号 | 任务 | 依赖 | 档位 | 人天 |
|---|---|---|---|---|---|
| 1 | W0-01 | 并行编排规则落盘（AGENTS.md §4 修订、P07~P15 提示词标注被取代、计划包入库） | — | haiku | 0.0 |
| 2 | W0-02 | 切分 crud-resources.ts 为按域文件、拆出客户端安全的 block-defs | W0-01 | sonnect | 0.0 |
| 3 | W0-03 | 新增 json-field / http-client / cache-tags / storage 接口模块（默认实现=现有行为） | W0-02 | sonnect | 0.0 |
| 4 | W0-R0 | 基线重校准：本地 W0-01~03 变基到 827646b、合并 block-defs 双份、复跑全量门禁并定位 crud-article e2e 失败、AGENTS.md 增加“禁止跨线大提交直进 upgrade” | W0-03 | opus | 0.0 |
| 5 | W0-04 | 契约②错误码与错误体冻结 + manager-fetch 透传 fieldErrors | W0-R0 | opus | 0.0 |
| 6 | W0-05 | 领域契约冻结：chat SSE、kinds、kb、notify quietHours、场景绑定、采集目标库、区块注册表 DTO、kbCoze 设置键 | W0-04 | opus | 0.0 |
| 7 | W0-06 | 迁移 p12_knowledge_base + 回滚脚本 + 默认库种子 | W0-05 | opus | 0.0 |
| 8 | W0-07 | 一次性加入 W1 全部新依赖并配置测试收集 | W0-06 | sonnect | 0.0 |
| 9 | W0-09 | 跨平台测试可移植性：去掉 shell grep 依赖、修复 Windows 下临时库删除 EPERM（DEF-X-01a/b） | W0-07 | sonnect | 0.0 |
| 10 | W0-08 | Wave 0 门禁（V0.5：双环境矩阵——visual@参照机 Windows、e2e@Linux）、独立校验、打冻结标签并分发 | W0-07, W0-09 | opus | 0.0 |
| 11 | W0-10 | CCR-1 契约补冻结：V0.3 G 系列 DTO（渠道状态、多渠道发布、LLM 用量与排序、知识库管理扩展、knowledgeFile 更新）+ 扁平客服风控键 + quietHours 范围 | W0-08 | opus | 1.0 |
| 12 | W0-11 | 测试基建补丁：tests/a11y 配置、e2e 生产 env 预置、globalSetup 一次登录 + storageState、wechat 守卫正则修正、ESLint 忽略 .cache | W0-08 | sonnect | 0.75 |
| 13 | W0-12 | 规划包入库修复与规则对齐：修复 docs/V0.5-20261015 与 docs/任务规划V0.2.0 的乱码文件名、补回缺失文件、V0.6 包入库、AGENTS.md 指向 V0.6 并统一五条 lane 分支名、增加“禁止跨线大提交” | W0-08 | haiku | 0.25 |
| 14 | W0-13 | CCR-1 门禁与冻结：合并 W0-10/11/12、补生成漏掉的 courses-375 参照图、双环境门禁、独立验证、打 tag w1-base-ccr-1 | W0-10, W0-11, W0-12 | opus | 0.5 |

### Wave 0 任务卡

#### W0-01　并行编排规则落盘（AGENTS.md §4 修订、P07~P15 提示词标注被取代、计划包入库）

- **工作包 / 切片**：WP0.1 规则与计划落盘　/　S0 治理刀
- **来源需求**：用户 2026-10-13 指令（3~5 并行）；REQ-F-013；规划总指令 §7/§8
- **目标**：仓库内规则与本规划一致：AGENTS.md 允许 W1 两条执行线并行且写明冻结面；P07~P15 提示词文首加“已由 parallel-w1 取代”指引
- **输入**：本规划包全部文件；AGENTS.md；docs/design/04_planning/current-plan.md
- **依赖**：—　**档位**：haiku（复制与模板化文字）　**规模**：已完成（0 天）（计划 0.0 人天）
- **输出（新增/修改）**：
  - docs/design/04_planning/parallel-w1/**（本包原样复制）
  - AGENTS.md（§4、§5、§8）
  - docs/design/04_planning/review-prompts/P07~P15（仅文首插入取代说明）
  - docs/design/04_planning/current-plan.md（文首追加 2026-10-13 裁决行）
  - docs/design/03_solution/decisions/ADR-027-并行编排与契约冻结.md
- **执行步骤**：
  1. 复制规划包到 docs/design/04_planning/parallel-w1/
  2. AGENTS.md §4 改为：Wave0 串行冻结 → Wave1 两条执行线并行（所有权矩阵）→ Wave2 集成；“推送只在 Final”改为：W0 独立校验 PASS 后推送 upgrade 与 tag w1-base，各线只推自己的 lane 分支（用户 2026-10-13 裁决 D8）；执行者 2 名（D11）
  3. P07~P15 每份提示词文首插入 3 行取代说明，正文不删
  4. 写 ADR-027（决策、备选=继续串行、后果=冻结面与契约变更请求流程）
  5. 跑本卡验证命令与通用门禁，把命令、exit code、关键输出写入证据目录
  6. 提交：`git commit -m "<feat|fix|test|docs>(W0-01): <摘要>"`（只含允许路径）
- **验收标准**（全部满足；最后两条对每张卡都适用）：
  - `grep -c "parallel-w1" AGENTS.md` ≥ 1
  - `for f in docs/design/04_planning/review-prompts/P0[7-9]*.md docs/design/04_planning/review-prompts/P1*.md; do grep -q "已由 parallel-w1 取代" "$f" || exit 1; done` exit 0
  - `git show --name-only --format= <W0-01 的提交>` 只含 AGENTS.md 与 docs/design/**（W0-01 单独提交，不与 W0-02 同批）
  - 通用门禁 `npm run lint && npm run typecheck && npm test && npm run build` 全部 exit 0
  - `git log --first-parent --no-merges --name-only --format= <本卡起点>..HEAD | sort -u` 全部落在本卡“允许修改”内
- **验证命令**：
```bash
git show --name-only --format= HEAD | grep -vE '^(AGENTS.md|docs/design/)' && exit 1 || echo ok
```
- **允许修改**：
  - AGENTS.md
  - docs/design/**
- **升级/熔断**：AGENTS.md 规则与用户裁决冲突时 → opus；同一卡连续 2 次独立验收 FAIL → 停止改代码，写失败分析交用户裁决
- **证据目录**：`docs/design/06_validation/evidence/W0/W0-01/`

#### W0-02　切分 crud-resources.ts 为按域文件、拆出客户端安全的 block-defs

- **工作包 / 切片**：WP0.2 无行为变化的结构切分　/　S0 治理刀
- **来源需求**：并行纪律（所有权不相交）；ADR-024；A-ui §0.2-b
- **目标**：crud-resources 按 system/content/site/collect/media/kb-ai 六个文件导出，index 聚合后 crudSpecs 键集合与切分前完全相同；BLOCK_REGISTRY 纯数据移至 src/config/block-defs.ts（不 import prisma）
- **输入**：src/lib/crud-resources.ts（440 行）；src/lib/block-registry.ts:10（import prisma）；V0.4：远端 827646b 另建了 src/lib/block-registry-defs.ts，合并规则见 W0-R0
- **依赖**：W0-01　**档位**：sonnect（机械搬迁，有快照守卫）　**规模**：已完成（0 天）（计划 0.0 人天）
- **输出（新增/修改）**：
  - src/lib/crud-resources/{index,system,content,site,collect,media,kb-ai}.ts（新）
  - src/lib/crud-resources.ts → 仅 `export * from "./crud-resources/index"`
  - src/config/block-defs.ts（新）
  - src/lib/block-registry.ts（改为从 block-defs 引入）
  - src/lib/__tests__/w0-structure.test.ts（新）
- **执行步骤**：
  1. 切分前导出 `Object.keys(crudSpecs).sort()` 快照写入测试
  2. 按域移动 spec（只剪切粘贴，不改内容）
  3. 抽出 BLOCK_REGISTRY 的 code/name/fields/默认顺序到 block-defs.ts
  4. 跑全量门禁 + visual
  5. 跑本卡验证命令与通用门禁，把命令、exit code、关键输出写入证据目录
  6. 提交：`git commit -m "<feat|fix|test|docs>(W0-02): <摘要>"`（只含允许路径）
- **验收标准**（全部满足；最后两条对每张卡都适用）：
  - w0-structure.test.ts：每个按域文件导出的键集合 ⊇ 切分前快照（只断言“不丢”，允许各线新增资源）；该测试文件 W1 归 B 线维护
  - `grep -n prisma src/config/block-defs.ts` 为空
  - 既有 210 例单测全部通过
  - visual 46/46
  - 通用门禁 `npm run lint && npm run typecheck && npm test && npm run build` 全部 exit 0
  - `git log --first-parent --no-merges --name-only --format= <本卡起点>..HEAD | sort -u` 全部落在本卡“允许修改”内
- **验证命令**：
```bash
npm run lint && npm run typecheck && npm test && npm run build
npm run test:visual
```
- **允许修改**：
  - src/lib/crud-resources.ts
  - src/lib/crud-resources/**
  - src/config/block-defs.ts
  - src/lib/block-registry.ts
  - src/lib/__tests__/w0-structure.test.ts
- **升级/熔断**：快照不一致且两次无法定位 → opus；同一卡连续 2 次独立验收 FAIL → 停止改代码，写失败分析交用户裁决
- **证据目录**：`docs/design/06_validation/evidence/W0/W0-02/`

#### W0-03　新增 json-field / http-client / cache-tags / storage 接口模块（默认实现=现有行为）

- **工作包 / 切片**：WP0.3 共享基座模块　/　S0 治理刀
- **来源需求**：P08 目标 2；P10 写后失效；P14 存储根；规划总指令 §7.3（共享可变状态先冻结接口）
- **目标**：四个模块的导出签名冻结且有单测；W0 默认实现零行为变化：uploadsDir()=<cwd>/uploads、backupsDir()=<cwd>/backups、kbDir()=<cwd>/data/kb、dataDir()=<cwd>/data（D-09 改为 DATA_DIR 实现）
- **输入**：A-ui §2.1-#3/#4；C-ops §3；B-domain §3.5
- **依赖**：W0-02　**档位**：sonnect（小模块+单测）　**规模**：已完成（0 天）（计划 0.0 人天）
- **输出（新增/修改）**：
  - src/lib/json-field.ts：parseJsonField<T>(s,fallback)、stringifyJsonField(v)
  - src/lib/http-client.ts：httpFetch(url,{timeoutMs,retries,headers,logTag})、HttpError
  - src/lib/cache-tags.ts：WEB_TAGS 常量 + invalidateWebContent(tags[])（W0 实现 = 调 revalidateTag，try/catch 静默）
  - src/lib/storage.ts：dataDir()/uploadsDir()/backupsDir()/kbDir()/resolveInside(root,rel)
  - src/lib/__tests__/w0-shared.test.ts
- **执行步骤**：
  1. 写先失败测试（json 往返/坏 JSON 回落；http 超时与重试 mock；resolveInside 拒绝 ../ 与绝对路径）
  2. 实现最小代码
  3. 不替换任何调用方（替换由各线完成）
  4. 跑本卡验证命令与通用门禁，把命令、exit code、关键输出写入证据目录
  5. 提交：`git commit -m "<feat|fix|test|docs>(W0-03): <摘要>"`（只含允许路径）
- **验收标准**（全部满足；最后两条对每张卡都适用）：
  - w0-shared.test.ts 全绿
  - `grep -rn "json-field\|http-client\|cache-tags\|lib/storage" src --include=*.ts -l` 只命中新文件与测试
  - 全量门禁通过
  - 通用门禁 `npm run lint && npm run typecheck && npm test && npm run build` 全部 exit 0
  - `git log --first-parent --no-merges --name-only --format= <本卡起点>..HEAD | sort -u` 全部落在本卡“允许修改”内
- **验证命令**：
```bash
npm run lint && npm run typecheck && npm test && npm run build
```
- **允许修改**：
  - src/lib/json-field.ts
  - src/lib/http-client.ts
  - src/lib/cache-tags.ts
  - src/lib/storage.ts
  - src/lib/__tests__/w0-shared.test.ts
- **升级/熔断**：签名争议 → opus 仲裁并写入 ADR-027；同一卡连续 2 次独立验收 FAIL → 停止改代码，写失败分析交用户裁决
- **证据目录**：`docs/design/06_validation/evidence/W0/W0-03/`

#### W0-R0　基线重校准：本地 W0-01~03 变基到 827646b、合并 block-defs 双份、复跑全量门禁并定位 crud-article e2e 失败、AGENTS.md 增加“禁止跨线大提交直进 upgrade”

- **工作包 / 切片**：WP0.0 基线重校准　/　S0 治理刀
- **来源需求**：规划总指令 §2.4 规划快照必须钉在确定状态；AGENTS.md 并行编排规则
- **目标**：用户本机 upgrade = origin/upgrade(827646b) + W0-01~03（变基后），门禁全绿或失败项有根因证据，block 注册表只有一份定义
- **输入**：evidence/V0.4-827646b-检查点审计.md §冲突清单：src/lib/block-registry.ts 必冲突；src/config/block-defs.ts 与 src/lib/block-registry-defs.ts 语义重复；827646b 提交信息称 e2e 7/8（crud-article 搜索空态 beforeEach 登录超时）；门禁复跑已定位：e2e 失败根因=登录限流（src/app/api/auth/login/route.ts 同 IP 60s≤10 次，整套 E2E 11 处登录，第 8 个用例被挡）；视觉 35/46 在沙箱与对照组 bb2c0e5 完全一致，属字体渲染环境差异
- **依赖**：W0-03　**档位**：opus（变基 + 冲突裁决 + 失败根因判定，不可逆影响全部线）　**规模**：已完成（0 天）（计划 0.0 人天）
- **输出（新增/修改）**：
  - 变基后的 W0-01/02/03 提交（同一 Change 说明，保留原 W0 编号）
  - src/config/block-defs.ts 为唯一定义；并入 DEFAULT_HOME_BLOCK_ORDER/getBlockDefinition/getBlockDefaultProps；src/lib/block-registry-defs.ts 改为一行 re-export 或删除并改引用
  - AGENTS.md §4 增加：禁止跨线大提交直接进 upgrade，必须走 lane 分支 + 独立验证
  - docs/design/06_validation/evidence/W0/R0/（门禁日志、e2e 失败根因、变基冲突记录）
- **执行步骤**：
  1. 本机：`git fetch origin && git branch backup/w0-local-<日期> && git rebase origin/upgrade`（禁止 reset --hard；W0-04 未提交现场先 `git stash push -u -m w0-04-wip`）
  2. 解决 block-registry.ts 冲突，按 outputs 合并 block-defs 双份
  3. 若本机 W0-04 现场与 827646b 的 manager-fetch.ts/SchemaForm.tsx/package.json 冲突 → 不 pop，按 W0-04 卡在新基线上重做，stash 仅作参考
  4. E2E 改为 globalSetup 登录一次并复用 storageState（各 spec 的 beforeEach 不再调登录接口）；不得放宽生产限流
  5. 复跑 GATE + visual + e2e；crud-article 失败复跑 3 次，记录是否稳定复现与根因（环境慢 / 真实缺陷），真实缺陷交 A-04
  6. AGENTS.md 增加规则
  7. 跑本卡验证命令与通用门禁，把命令、exit code、关键输出写入证据目录
  8. 提交：`git commit -m "<feat|fix|test|docs>(W0-R0): <摘要>"`（只含允许路径）
- **验收标准**（全部满足；最后两条对每张卡都适用）：
  - `git merge-base --is-ancestor origin/upgrade HEAD` exit 0
  - `git grep -n "BLOCK_REGISTRY\s*[:=]" src | wc -l` = 1
  - GATE exit 0；visual 46/46
  - AGENTS.md 含“禁止跨线大提交”条款
  - e2e 8/8，且连续两次全套运行均无“尝试过于频繁”
  - visual 46/46 在参照截图生成机（用户本机）上复跑通过；沙箱结果仅作参考
  - 通用门禁 `npm run lint && npm run typecheck && npm test && npm run build` 全部 exit 0
  - `git log --first-parent --no-merges --name-only --format= <本卡起点>..HEAD | sort -u` 全部落在本卡“允许修改”内
- **验证命令**：
```bash
git merge-base --is-ancestor origin/upgrade HEAD && echo REBASED
git grep -nE "BLOCK_REGISTRY\s*[:=]" src
GATE
npm run test:visual && npm run test:e2e
```
- **允许修改**：
  - AGENTS.md
  - src/config/block-defs.ts
  - src/lib/block-registry-defs.ts
  - src/lib/block-registry.ts
  - src/lib/crud-resources/**
  - src/lib/crud-resources.ts
  - docs/design/06_validation/evidence/W0/**
  - tests/e2e/global-setup.ts
  - tests/e2e/fixtures/**
  - playwright.config.ts
  - tests/e2e/*.spec.ts（仅替换登录方式，不改断言）
- **升级/熔断**：变基冲突超出 block-defs/block-registry 两处 → 停止，交用户裁决；同一卡连续 2 次独立验收 FAIL → 停止改代码，写失败分析交用户裁决
- **证据目录**：`docs/design/06_validation/evidence/W0/W0-R0/`

#### W0-04　契约②错误码与错误体冻结 + manager-fetch 透传 fieldErrors

- **工作包 / 切片**：WP0.4 契约冻结　/　S0 治理刀
- **来源需求**：P13 目标 1；REQ-NF-001；P06 已交付 data.fieldErrors；A-ui §0.2-d
- **目标**：code 枚举 = {200,400,401,403,404,409,429,500,502,503}；api-response 提供 conflict/tooManyRequests/badGateway/serviceUnavailable；ApiHttpError 支持 409/429/502/503；400 继续使用 data.fieldErrors；created() 维持 code 200 + HTTP 201；managerFetch 抛出的 ApiError 带 fieldErrors 并按 409/429/502/503 给中文文案
- **输入**：src/contracts/common.ts:14-21,60-67；src/lib/api-response.ts；src/lib/api-handler.ts:24-33,161-169；src/lib/manager-fetch.ts:39-75；V0.4：827646b 已让 manager-fetch 透传 fieldErrors（已满足部分），本卡只补错误码枚举、409/429/502/503 文案、P2002→409、visibleTo
- **依赖**：W0-R0　**档位**：opus（冻结契约语义，影响两条执行线）　**规模**：已完成（0 天）（计划 0.0 人天）
- **输出（新增/修改）**：
  - src/contracts/common.ts
  - src/lib/api-response.ts
  - src/lib/api-handler.ts（仅 ApiHttpError 与 P2002→409 映射）
  - src/lib/manager-fetch.ts
  - src/components/manager/SchemaForm.tsx（仅 FieldSpec 增 visibleTo?: "super" 及隐藏逻辑，isSuper 取自现有会话；无现成来源则读 /api/auth/me）
  - src/lib/__tests__/w0-errors.test.ts
  - docs/design/03_solution/decisions/ADR-028-响应与错误体口径.md
- **执行步骤**：
  1. 写 ADR-028：保留 data.fieldErrors（P06 已交付、前端将读取）；created() 维持 code 200（manager-fetch.ts:73 `body.code !== 200` 即抛错，改 code 会让全部创建操作在管理端报错）；P2002→409
  2. 扩枚举与工厂，补测试
  3. manager-fetch：ApiError.fieldErrors；409/429/502/503 文案进 common.ts toastCopy
  4. 跑本卡验证命令与通用门禁，把命令、exit code、关键输出写入证据目录
  5. 提交：`git commit -m "<feat|fix|test|docs>(W0-04): <摘要>"`（只含允许路径）
- **验收标准**（全部满足；最后两条对每张卡都适用）：
  - w0-errors.test.ts：每个新工厂 HTTP 与 code 一致（created 除外并有断言）
  - withApi 内抛 ApiHttpError(429) → HTTP 429 且 code 429
  - P2002 → 409（既有 p03/with-api 测试若断言 400 则同步改并在 ADR 记录）
  - managerFetch mock 400 带 fieldErrors → err.fieldErrors 深相等
  - FieldSpec.visibleTo="super" 的字段对非超管不渲染（组件或 e2e 断言）
  - 通用门禁 `npm run lint && npm run typecheck && npm test && npm run build` 全部 exit 0
  - `git log --first-parent --no-merges --name-only --format= <本卡起点>..HEAD | sort -u` 全部落在本卡“允许修改”内
- **验证命令**：
```bash
npm run lint && npm run typecheck && npm test && npm run build
```
- **允许修改**：
  - src/contracts/common.ts
  - src/lib/api-response.ts
  - src/lib/api-handler.ts
  - src/lib/manager-fetch.ts
  - src/components/manager/SchemaForm.tsx
  - src/lib/__tests__/w0-errors.test.ts
  - src/lib/__tests__/api-contract/with-api.test.ts
  - docs/design/03_solution/decisions/ADR-028-*.md
- **假设**：A-W0-1：保留 data.fieldErrors 不改为 details（K9，默认值，待用户确认 D6）；A-W0-2：created() code=200/HTTP=201（K10，待用户确认 D7）
- **升级/熔断**：改 P2002→409 导致 e2e 断言变化 → 在 ADR 写明并同步测试，仍失败 → fable 裁决；同一卡连续 2 次独立验收 FAIL → 停止改代码，写失败分析交用户裁决
- **证据目录**：`docs/design/06_validation/evidence/W0/W0-04/`

#### W0-05　领域契约冻结：chat SSE、kinds、kb、notify quietHours、场景绑定、采集目标库、区块注册表 DTO、kbCoze 设置键

- **工作包 / 切片**：WP0.4 契约冻结　/　S0 治理刀
- **来源需求**：P09 目标；P12 目标 1/2/5/6/7；P13 目标 2；P07 #5/#7；ADR-024；ADR-025
- **目标**：五条执行线所需的全部 DTO/枚举一次性落入 src/contracts/**（zod 唯一源），之后冻结
- **输入**：B-domain §1.2/§3.2；A-ui §1.1-#5/#7；src/contracts/resources.ts:217,220,259-263,274-290；ADR-025
- **依赖**：W0-04　**档位**：opus（冻结两条执行线共享 DTO）　**规模**：已完成（0 天）（计划 0.0 人天）
- **输出（新增/修改）**：
  - src/contracts/chat.ts（chatRequestSchema、chatSseEventSchema=meta|delta|done|error 判别联合）
  - src/contracts/kinds.ts（CHANNEL_KINDS/LLM_KINDS/COLLECT_TYPES/KB_BACKENDS + 中文 label）
  - src/contracts/kb.ts（KB_FILE_EXTS=docx|doc|md|markdown|txt、KB_MAX_FILE_BYTES=10MB、COZE_FILE_TYPE_MAP md/markdown→txt、knowledgeBase/knowledgeFile create/update、kbSearchRequest{query,tags?,baseIds?,topK?}（保留现有 tags 与中文提示）、KB_REJECT_MESSAGE 中文文案）
  - src/contracts/resources.ts（notifyRule +quietHours；chatScene +providerIds/temperature/maxTokens/topP，baseIds 与 providerIds 接受 int 数组或 JSON 数组串、统一存为 JSON 数组串（旧的逗号分隔值由 C-07 读取时兼容）；collectSource +knowledgeBaseId；4 处枚举（:276、:303、:331、:404）改为从 kinds 派生）
  - src/contracts/blocks.ts（blockRegistryItem DTO、homeBlocksResetRequest）
  - src/contracts/index.ts
  - src/lib/settings-registry.ts（仅新增 kbCozeProviderId、kbCozeSpaceId〔secret〕两键）
  - src/lib/__tests__/w0-contracts.test.ts
- **执行步骤**：
  1. 逐项写 zod + 中文错误文案
  2. 枚举改派生后跑全量测试确认零回归
  3. 测试：每个 schema 合法/非法样例；KB 拒绝 pdf/png 扩展名；providerIds 去重与上限 10
  4. V0.3 增补：同批冻结 G 系列 DTO——`/api/llm/usage`（groupBy=provider|day，返回 {key,calls,promptTokens,completionTokens,costCent}[]）、LLMProvider 批量排序 `PATCH /api/llm/providers/order {ids:number[]}`、知识库管理扩展（标签、批量启停、导出、回收站列表/恢复/彻底删除、库统计、条目在线编辑、单库重建切片）、内容中枢渠道状态视图 DTO、客服风控设置键 `chatGuard.rateLimitPerUserPerMin`/`chatGuard.sensitiveWords`/`chatGuard.blacklist`
  5. 跑本卡验证命令与通用门禁，把命令、exit code、关键输出写入证据目录
  6. 提交：`git commit -m "<feat|fix|test|docs>(W0-05): <摘要>"`（只含允许路径）
- **验收标准**（全部满足；最后两条对每张卡都适用）：
  - w0-contracts.test.ts 全绿
  - `grep -rn 'z.enum(\["website","wechat"\])\|z.enum(\["openai","coze"\])\|z.enum(\["html","rss"\])' src/contracts` 为空
  - 契约自检 4 问（前端/后端/数据/错误码）在 ADR-027 附录逐条回答为“是”
  - V0.3 增补的 G 系列 DTO 全部以 zod 落在 src/contracts/**，并有 parse 冒烟测试
  - 通用门禁 `npm run lint && npm run typecheck && npm test && npm run build` 全部 exit 0
  - `git log --first-parent --no-merges --name-only --format= <本卡起点>..HEAD | sort -u` 全部落在本卡“允许修改”内
- **验证命令**：
```bash
npm run lint && npm run typecheck && npm test && npm run build
```
- **允许修改**：
  - src/contracts/**
  - src/lib/settings-registry.ts
  - src/lib/__tests__/w0-contracts.test.ts
  - src/lib/__tests__/settings-registry.test.ts
- **升级/熔断**：某线需要的字段无法确定 → 标 BLOCKING 并上报，不得猜；同一卡连续 2 次独立验收 FAIL → 停止改代码，写失败分析交用户裁决
- **证据目录**：`docs/design/06_validation/evidence/W0/W0-05/`

#### W0-06　迁移 p12_knowledge_base + 回滚脚本 + 默认库种子

- **工作包 / 切片**：WP0.5 唯一迁移 p12　/　S0 治理刀
- **来源需求**：P12 目标 1/5/6；ADR-025；current-plan §5（p12 为第 7 位，最后一个迁移）
- **目标**：新增 KnowledgeBase、KnowledgeFile 两表；Knowledge +baseId/fileId/chunkIndex；ChatScene +providerIds/temperature/maxTokens/topP；CollectSource +knowledgeBaseId；全部 Int? 无外键、仅 CREATE TABLE/ADD COLUMN/CREATE INDEX；seed 幂等创建“通用知识”“采集资讯”两库并回填 Knowledge.baseId
- **输入**：prisma/schema.prisma:563-614,776-801；P06 迁移审阅做法（P06-verify §3）
- **依赖**：W0-05　**档位**：opus（不可逆数据变更）　**规模**：已完成（0 天）（计划 0.0 人天）
- **输出（新增/修改）**：
  - prisma/schema.prisma
  - prisma/migrations/<ts>_p12_knowledge_base/migration.sql
  - prisma/rollback/p12.sql
  - prisma/seed.ts（仅默认库与回填段）
  - docs/design/06_validation/evidence/W0/migration-review.md
- **执行步骤**：
  1. `npx prisma migrate dev --create-only --name p12_knowledge_base` 生成后逐行审，出现 RedefineTables/DROP 即改 schema 去掉 relation
  2. 在 p06 状态库副本上 deploy：行数不变、integrity_check=ok、foreign_key_check 空
  3. rollback 后 schema 与 p06 逐对象全等，再 deploy 可重放
  4. seed 两次幂等
  5. V0.3 增补（G9/G10，D13 默认=并入本迁移）：KnowledgeFile 增加 deletedAt（回收站软删）、tags（JSON 字符串，默认 '[]'）、collectItemId（可空，指向 CollectItem，ON DELETE SET NULL）及索引 (knowledgeBaseId, deletedAt)；仅 ADD COLUMN / CREATE INDEX
  6. 跑本卡验证命令与通用门禁，把命令、exit code、关键输出写入证据目录
  7. 提交：`git commit -m "<feat|fix|test|docs>(W0-06): <摘要>"`（只含允许路径）
- **验收标准**（全部满足；最后两条对每张卡都适用）：
  - `grep -ciE 'DROP|RedefineTables|INSERT INTO "new_' prisma/migrations/*p12*/migration.sql` = 0
  - `npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script` 为空迁移
  - 副本行数对比表写入证据
  - seed 连跑两次 KnowledgeBase 行数 = 2
  - 迁移 SQL 不含 DROP / RedefineTables；KnowledgeFile 含 deletedAt、tags、collectItemId 三列
  - 通用门禁 `npm run lint && npm run typecheck && npm test && npm run build` 全部 exit 0
  - `git log --first-parent --no-merges --name-only --format= <本卡起点>..HEAD | sort -u` 全部落在本卡“允许修改”内
- **验证命令**：
```bash
npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script
npm run lint && npm run typecheck && npm test && npm run build
```
- **允许修改**：
  - prisma/schema.prisma
  - prisma/migrations/**（仅新增 p12）
  - prisma/rollback/p12.sql
  - prisma/seed.ts
  - docs/design/06_validation/evidence/W0/**
- **升级/熔断**：必须加外键才能满足需求 → fable 裁决是否接受整表重建；同一卡连续 2 次独立验收 FAIL → 停止改代码，写失败分析交用户裁决
- **证据目录**：`docs/design/06_validation/evidence/W0/W0-06/`

#### W0-07　一次性加入 W1 全部新依赖并配置测试收集

- **工作包 / 切片**：WP0.6 依赖与测试基建一次性到位　/　S0 治理刀
- **来源需求**：P07 TipTap/a11y；P12 docx 解析；P13 tests/contract；假设 A-5
- **目标**：W1 期间任何线都不需要再改 package.json 依赖与 vitest/playwright 配置
- **输入**：origin/main package.json:49-56（@tiptap/* ^3.22.4）；A-ui §1.2；B-domain §1.3-#6
- **依赖**：W0-06　**档位**：sonnect（依赖安装与配置）　**规模**：已完成（0 天）（计划 0.0 人天）
- **输出（新增/修改）**：
  - package.json/package-lock.json：+@tiptap/react @tiptap/pm @tiptap/starter-kit @tiptap/extension-image @tiptap/extension-link @tiptap/extension-placeholder @tiptap/extension-text-align @tiptap/extension-underline（^3.22.4）、+mammoth、devDeps +jsdom +@testing-library/react +@testing-library/dom +@axe-core/playwright
  - vitest.config.ts：include 增加 src/**/__tests__/**/*.test.tsx 与 tests/contract/**/*.test.ts；组件测试用文件头 `// @vitest-environment jsdom`
  - tests/e2e/global-setup.ts 与 tests/e2e/fixtures/env.ts：预置 ENCRYPTION_KEY、APP_ORIGIN、DATA_DIR（临时目录）、HOSTNAME 的测试值，使 D-03 的生产启动校验在 e2e 下通过
  - tests/a11y/playwright.config.ts（复用 e2e 的 webServer 设置）
  - docs/design/06_validation/evidence/W0/deps.md（每个包的体积、许可证、用途、引入线）
- **执行步骤**：
  1. V0.4：827646b 已加入 @tiptap/* 8 包（^3.31.4，以此为准）与 @axe-core/playwright，并提前移除 radix 两包；本卡只补 mammoth、jsdom、@testing-library/react、@testing-library/dom 与测试收集配置，不得回退 TipTap 版本
  2. npm i 指定版本；记录 `npm ls` 关键行
  3. 写 1 个 jsdom 冒烟测试与 1 个 tests/contract 占位测试验证收集
  4. 全量门禁 + build
  5. 跑本卡验证命令与通用门禁，把命令、exit code、关键输出写入证据目录
  6. 提交：`git commit -m "<feat|fix|test|docs>(W0-07): <摘要>"`（只含允许路径）
- **验收标准**（全部满足；最后两条对每张卡都适用）：
  - `node -e "const p=require('./package.json');const d={...p.dependencies,...p.devDependencies};['@tiptap/react','mammoth','jsdom','@axe-core/playwright','@testing-library/react'].forEach(k=>{if(!d[k])process.exit(1)})"` exit 0
  - jsdom 冒烟测试被 vitest 收集并通过
  - build 通过；/manager 包体未变（新依赖尚未被引用）
  - 通用门禁 `npm run lint && npm run typecheck && npm test && npm run build` 全部 exit 0
  - `git log --first-parent --no-merges --name-only --format= <本卡起点>..HEAD | sort -u` 全部落在本卡“允许修改”内
- **验证命令**：
```bash
npm run lint && npm run typecheck && npm test && npm run build
```
- **允许修改**：
  - package.json
  - package-lock.json
  - vitest.config.ts
  - tests/a11y/playwright.config.ts
  - tests/e2e/global-setup.ts
  - tests/e2e/fixtures/env.ts
  - docs/design/06_validation/evidence/W0/**
- **升级/熔断**：TipTap 3 与 React 19 peer 冲突 → 上报，parity C6 保持 partial，不得静默降级；同一卡连续 2 次独立验收 FAIL → 停止改代码，写失败分析交用户裁决
- **证据目录**：`docs/design/06_validation/evidence/W0/W0-07/`

#### W0-09　跨平台测试可移植性：去掉 shell grep 依赖、修复 Windows 下临时库删除 EPERM（DEF-X-01a/b）

- **工作包 / 切片**：WP0.6 依赖与测试基建一次性到位　/　S0 治理刀
- **来源需求**：规划总指令 §9.2（门禁可复现）；V0.2 校准 DEF-X-01a/b（执行者在 Windows 本机 npm test 必挂 1 文件）
- **目标**：`npm test` 在 Linux 与 Windows（PowerShell，无 grep）下均 17+ 文件全过，且断言语义不变
- **输入**：src/lib/__tests__/wechat-chat.test.ts:79（execSync grep）；src/lib/__tests__/sqlite-busy-timeout.test.ts:15,81（rmSync 在 libsql 句柄未释放时 EPERM）；执行者 X 报告 DEF-X-01a/b
- **依赖**：W0-07　**档位**：sonnect（测试可移植性小修）　**规模**：已完成（0 天）（计划 0.0 人天）
- **输出（新增/修改）**：
  - src/lib/__tests__/wechat-chat.test.ts：用 node:fs 递归读取 src/lib 并以正则匹配替代 execSync(grep)，匹配集合与原 grep 等价
  - src/lib/__tests__/sqlite-busy-timeout.test.ts：afterAll 先关闭 Prisma/libsql 客户端（$disconnect / close）再 rmSync；rmSync 加 maxRetries:5, retryDelay:100
  - docs/design/06_validation/evidence/W0/W0-09/portability.md（Linux 与 Windows 两份 npm test 输出摘要）
- **执行步骤**：
  1. 先在改动前记录原 grep 的匹配行清单（Linux）作为等价性基准
  2. 替换实现后对比匹配清单完全一致
  3. 修 afterAll 释放顺序；在 Windows 本机连续跑 3 次 npm test 不出现 EPERM
  4. 跑本卡验证命令与通用门禁，把命令、exit code、关键输出写入证据目录
  5. 提交：`git commit -m "<feat|fix|test|docs>(W0-09): <摘要>"`（只含允许路径）
- **验收标准**（全部满足；最后两条对每张卡都适用）：
  - `grep -n "execSync" src/lib/__tests__/wechat-chat.test.ts` 为空
  - 替换前后匹配清单 diff 为空（证据入 portability.md）
  - Windows 本机连续 3 次 `npm test` 全过（无 Windows 环境 → 记 UNKNOWN 并写原因，不得写 PASS）
  - 测试数不减少（≥210）
  - 通用门禁 `npm run lint && npm run typecheck && npm test && npm run build` 全部 exit 0
  - `git log --first-parent --no-merges --name-only --format= <本卡起点>..HEAD | sort -u` 全部落在本卡“允许修改”内
- **验证命令**：
```bash
npx vitest run src/lib/__tests__/wechat-chat.test.ts src/lib/__tests__/sqlite-busy-timeout.test.ts
npm run lint && npm run typecheck && npm test && npm run build
```
- **允许修改**：
  - src/lib/__tests__/wechat-chat.test.ts
  - src/lib/__tests__/sqlite-busy-timeout.test.ts
  - docs/design/06_validation/evidence/W0/**
- **升级/熔断**：libsql 句柄无法显式关闭 → 改用每测独立 tmp 目录并在进程退出时清理，仍 EPERM 则上报 opus；同一卡连续 2 次独立验收 FAIL → 停止改代码，写失败分析交用户裁决
- **证据目录**：`docs/design/06_validation/evidence/W0/W0-09/`

#### W0-08　Wave 0 门禁（V0.5：双环境矩阵——visual@参照机 Windows、e2e@Linux）、独立校验、打冻结标签并分发

- **工作包 / 切片**：WP0.7 冻结与分发　/　S0 治理刀
- **来源需求**：规划总指令 §9.2/§9.3
- **目标**：独立验证者给出 PASS；upgrade 上打 tag w1-base；五条线从该 tag 建分支
- **输入**：W0-01~07 全部提交；V0.5：next.config.ts 与 scripts/start-next.mjs 都有意在 win32 上关闭 standalone，而 e2e global-setup 硬性要求 standalone 产物，且 `process.kill(-pid)`、无 shell 的 `spawnSync("npx")`、`detached:true` 三处在 Windows 上也不可用 → 改 next.config.ts 也解决不了；e2e 的唯一合法环境是 Linux（与生产一致）
- **依赖**：W0-07, W0-09　**档位**：opus（冻结点 review）　**规模**：已完成（0 天）（计划 0.0 人天）
- **输出（新增/修改）**：
  - docs/design/06_validation/evidence/W0/W0-verify.md
  - git tag w1-base
- **执行步骤**：
  1. 参照机（用户本机 Windows，K5）跑 `npm run lint && npm run typecheck && npm test && npm run build` 与 `npm run test:visual`（46/46）；runner 挂起先按 17 号文档 §4 排查，不得改测试配置
  2. Linux 环境（GitHub Actions / 沙箱 / WSL2 任选其一，Node 与 lock 一致）对同一提交 SHA 跑 `npm ci && npm run build && npm run test:e2e`（8/8）
  3. 两份输出写入 W0-verify.md，均须带 `git rev-parse HEAD`，两个 SHA 必须相同
  4. tests/visual/reference/** 若有改动：必须证明由 main@94dbbbb（VISUAL_REF=1，端口 6790）重新生成，附生成命令与 main 提交号；否则 `git checkout 827646b -- tests/visual/reference/` 还原
  5. 独立验证者只看 `git diff bb2c0e5..HEAD` 与两份命令结果，输出 PASS/FAIL/UNKNOWN；任一项 UNKNOWN 不得打 tag
  6. PASS 后 `git tag w1-base` 并推送 upgrade 与 tag（D8 已裁决）
  7. 提交：`git commit -m "docs(W0-08): <摘要>"`（只含允许路径）
  8. 跑本卡验证命令与通用门禁，把命令、exit code、关键输出写入证据目录
  9. 提交：`git commit -m "<feat|fix|test|docs>(W0-08): <摘要>"`（只含允许路径）
- **验收标准**（全部满足；最后两条对每张卡都适用）：
  - W0-verify.md 结论 PASS
  - `git diff --name-only bb2c0e5..w1-base` 不含前台路径（src/app/(web)、src/components/web、public、globals.css）
  - visual 46/46 的输出来自参照机（Windows），e2e 8/8 的输出来自 Linux，两份输出的 HEAD SHA 一致
  - `git diff --name-only 827646b..HEAD -- tests/visual/reference/` 为空，或每个改动文件都有 main@94dbbbb 重新生成的证据
  - 不得以“等效像素比对”替代官方 `npm run test:visual` 输出；不得把 e2e 记为 UNKNOWN 后打 tag
  - 通用门禁 `npm run lint && npm run typecheck && npm test && npm run build` 全部 exit 0
  - `git log --first-parent --no-merges --name-only --format= <本卡起点>..HEAD | sort -u` 全部落在本卡“允许修改”内
- **验证命令**：
```bash
npm run lint && npm run typecheck && npm test && npm run build
npm run test:visual    # 参照机 Windows
npm ci && npm run build && npm run test:e2e    # Linux，同一 SHA
```
- **允许修改**：
  - docs/design/06_validation/evidence/W0/**
- **升级/熔断**：Linux 环境与参照机都拿不到 → 停止，交用户裁决；不得降低门禁标准；同一卡连续 2 次独立验收 FAIL → 停止改代码，写失败分析交用户裁决
- **证据目录**：`docs/design/06_validation/evidence/W0/W0-08/`

#### W0-10　CCR-1 契约补冻结：V0.3 G 系列 DTO（渠道状态、多渠道发布、LLM 用量与排序、知识库管理扩展、knowledgeFile 更新）+ 扁平客服风控键 + quietHours 范围

- **工作包 / 切片**：WP0.8 冻结面补丁（CCR-1）　/　S0 治理刀
- **来源需求**：REQ-F-001/005（统一管理与公众号发布）、REQ-F-007（知识库管理）、REQ-F-009（客服风控）、REQ-F-010（用量与优先级）、REQ-F-011（静默时段）；V0.3 缺口 G1/G5/G6/G7/G9
- **目标**：B-07、C-10、C-11、C-12、D-04、E-09、E-10、E-11 所需的全部 DTO 与设置键以 zod/Registry 落在冻结面内，每个 schema 有合法/非法 parse 测试；W1 开工后这些卡不再需要契约变更请求
- **输入**：evidence/V0.6-需求缺口复核.md §3 DR-03~DR-06、DR-14；src/contracts/resources.ts:272-286（quietHours 只校验 \d{2}:\d{2}）、:329-337（publishJobCreateSchema 单 channel）；src/contracts/kb.ts（无 knowledgeFile create/update 与扩展端点 DTO）；prisma/schema.prisma:521-535（LLMUsage 列：date/providerId/calls/tokensIn/tokensOut/failures，无费用与耗时列）、:616-646（KnowledgeFile.baseId/tags/deletedAt/collectItemId）、:801-819（ContentChannel.status=unsent|scheduled|publishing|published|failed）；src/lib/settings-registry.ts:3（扁平 key 规则）、:134（notifyQuietHours）；src/lib/__tests__/w0-contracts.test.ts:266-270（钉住 25:00 合法，待 CCR）
- **依赖**：W0-08　**档位**：opus（冻结两条执行线共享 DTO，改错即多线返工）　**规模**：中（1 天）（计划 1.0 人天）
- **输出（新增/修改）**：
  - src/contracts/content-hub.ts（新）：CHANNEL_STATUSES=["unsent","scheduled","publishing","published","failed"]（= ContentChannel.status 取值）；channelStateSchema={channel:channelKind, accountId:int|null, status, scheduledAt:ISO|null（派生：该渠道最近一条 PublishJob.scheduledAt；ContentChannel 无此列）, publishedAt:ISO|null, externalUrl:string|null, errMsg:string|null}；contentHubItemSchema={id, title, contentType:"markdown"|"html", source:"manual"|"collect", updatedAt, channels:channelStateSchema[]}
  - src/contracts/resources.ts：publishJobCreateSchema 增加 `channels: channelKind[]（1~2，去重）` 并与旧 `channel` 二选一（refine：二者恰一；服务端把 channel 规范化为 [channel]）；scheduledAt 必须晚于当前时间（refine，文案“定时时间必须晚于现在”）
  - src/contracts/llm.ts（新）：llmUsageQuerySchema={groupBy:"provider"|"day", from:YYYY-MM-DD, to:YYYY-MM-DD（≤92 天）, providerId?:int}；llmUsageRowSchema={key:string, calls:int, tokensIn:int, tokensOut:int, failures:int}（= LLMUsage 列，不含费用/耗时）；llmProviderOrderSchema={ids:int[]（1~50，refine 无重复）}
  - src/contracts/kb.ts：knowledgeFileUpdateSchema={tags?:string[]（≤20，每个 1~20 字）}；kbBatchSchema={ids:int[1..100], action:"enable"|"disable"|"tag"|"untag"|"trash", tags?:string[]}——enable/disable 的落点是“该文件全部 Knowledge 行的 status=active|inactive（按 Knowledge.fileId）”，KnowledgeFile 无 enabled 列；kbTrashActionSchema={ids:int[1..100], action:"restore"|"purge"}；kbStatsSchema={baseId, files, chunks, trash, cozeOk, cozeFailed, lastSyncAt:ISO|null（派生：该库 Knowledge.syncedAt 最大值）}；kbExportQuerySchema={baseId:int, includeTrash?:boolean}；knowledgeChunkUpdateSchema={content:string(1..20000)}；kbRebuildResponseSchema={jobId:string}
  - src/contracts/resources.ts：quietHours 的 start/end 改为 `^([01]\d|2[0-3]):[0-5]\d$`；跨零点允许（start>end 表示跨夜）；规则级 quietHours 优先于全局 notifyQuietHours（写入 JSDoc）
  - src/lib/settings-registry.ts（仅新增键，group="llm"）：chatGuardRateLimitPerMin（number，默认 20）、chatGuardSensitiveWords（JSON 数组串，默认 "[]"）、chatGuardBlacklist（JSON 数组串，默认 "[]"）
  - src/app/api/settings/definitions/route.ts：GROUP_LABELS 仅新增 `kb: "知识库"`
  - src/contracts/index.ts（导出新模块）
  - src/lib/__tests__/w0-contracts.test.ts（新增 G 系列 parse 用例；把 :266-270 的“25:00 合法”断言改为“25:00 非法”）、src/lib/__tests__/settings-registry.test.ts
  - docs/design/03_solution/decisions/ADR-034-CCR-1-W1前置契约补冻结.md（含三处派生字段与 enable/disable 映射）
- **执行步骤**：
  1. 从 upgrade@fb82885（或之后的 docs-only 提交）开分支 `w0/ccr-1`；先写失败测试（每个新 schema 1 合法 + 2 非法；quietHours 25:00 / 23:60 非法、22:00→07:00 合法）
  2. 按 outputs 逐个落 zod；字段名只用 schema.prisma 现有列名（baseId、tokensIn、tokensOut、failures），禁止引入表中没有的字段
  3. publishJobCreateSchema 兼容旧单 channel（现有 e2e collect-publish 走旧字段，必须保持 8/8）
  4. settings-registry 只追加三键 + kb 分组名，不改既有键
  5. 写 ADR-034：列出每个 DTO 的消费卡（B-07/C-10/C-11/C-12/D-04/E-09/E-10/E-11）与“用量不含费用/耗时”的偏差说明（REQ-F-010 AC6 耗时项记偏差，需加列另走迁移裁决 K8）
  6. 跑 GATE；Linux 跑 e2e 8/8
  7. 提交：`git commit -m "feat(W0-10): CCR-1 W1 前置契约补冻结"`
  8. 跑本卡验证命令与通用门禁，把命令、exit code、关键输出写入证据目录
  9. 提交：`git commit -m "<feat|fix|test|docs>(W0-10): <摘要>"`（只含允许路径）
- **验收标准**（全部满足；最后两条对每张卡都适用）：
  - `npx vitest run src/lib/__tests__/w0-contracts.test.ts src/lib/__tests__/settings-registry.test.ts` 全绿，且新增用例 ≥ 24 条
  - `grep -rnE "chatGuard\." src` 为空（无点分键）；`grep -c "chatGuard" src/lib/settings-registry.ts` = 3
  - `grep -rnE "costCent|latencyMs" src/contracts` 为空（不得引入表中不存在的字段）
  - ADR-034 列出每个派生字段（channelState.scheduledAt、kbStats.lastSyncAt）与 enable/disable 映射的数据来源列，均为 schema.prisma 现有列
  - `git diff --name-only $(git merge-base origin/upgrade HEAD)..HEAD` ⊆ 本卡 allow
  - GATE exit 0；Linux e2e 8/8
  - 通用门禁 `npm run lint && npm run typecheck && npm test && npm run build` 全部 exit 0
  - `git log --first-parent --no-merges --name-only --format= <本卡起点>..HEAD | sort -u` 全部落在本卡“允许修改”内
- **验证命令**：
```bash
npx vitest run src/lib/__tests__/w0-contracts.test.ts src/lib/__tests__/settings-registry.test.ts
npm run lint && npm run typecheck && npm test && npm run build
npm ci && npm run build && npm run test:e2e    # Linux
```
- **允许修改**：
  - src/contracts/**
  - src/lib/settings-registry.ts
  - src/lib/__tests__/w0-contracts.test.ts
  - src/lib/__tests__/settings-registry.test.ts
  - docs/design/03_solution/decisions/ADR-034-*.md
  - docs/design/06_validation/evidence/W0/W0-10/**
  - src/app/api/settings/definitions/route.ts
- **升级/熔断**：某卡需要的字段在表中不存在（如耗时/费用）→ 不得加字段，写入 ADR-034 偏差并交用户裁决 K8；两次验收 FAIL → 熔断；同一卡连续 2 次独立验收 FAIL → 停止改代码，写失败分析交用户裁决
- **证据目录**：`docs/design/06_validation/evidence/W0/W0-10/`

#### W0-11　测试基建补丁：tests/a11y 配置、e2e 生产 env 预置、globalSetup 一次登录 + storageState、wechat 守卫正则修正、ESLint 忽略 .cache

- **工作包 / 切片**：WP0.8 冻结面补丁（CCR-1）　/　S0 治理刀
- **来源需求**：REQ-NF-003（a11y）、REQ-NF-002（不放宽登录限流）；W0-07/W0-R0/W0-09 遗留（evidence/V0.6-W0交付独立核验.md）
- **目标**：W1 任一线新增 e2e/a11y 用例都不需要改冻结配置；除 globalSetup（2 次）与 auth.spec（验证登录本身）外，其余用例调用登录接口 0 次；D-03 加生产 env 校验后 e2e 仍 8/8；wechat 守卫对电话/域名单独出现能命中
- **输入**：tests/e2e/fixtures/helpers.ts:5-9（每用例 UI 登录）；src/app/api/auth/login/route.ts:10-15（同 IP 60s≤10 次）；tests/e2e/global-setup.ts:78（只传 PORT/HOSTNAME/NODE_ENV）；tests/a11y/ 不存在；src/lib/__tests__/wechat-chat.test.ts（V0.6 核验：正则把 `|` 转义）；eslint.config.mjs:8-15（未忽略 .cache/**，导致 W0-08 记 26 条而干净树 18 条）
- **依赖**：W0-08　**档位**：sonnect（测试配置与夹具，边界清楚）　**规模**：中（0.75 天）（计划 0.75 人天）
- **输出（新增/修改）**：
  - tests/a11y/playwright.config.ts（复用 e2e 的 globalSetup 与端口约定，testDir=tests/a11y）
  - tests/e2e/global-setup.ts：spawn 时追加 ENCRYPTION_KEY、APP_ORIGIN=http://127.0.0.1:<E2E_PORT>、DATA_DIR=<os.tmpdir()>/hd-e2e-<pid> 测试值；完成后用 admin API 幂等创建 e2e-viewer（VIEWER 账号，viewer 角色），再用 admin 与 viewer 各登录一次写 .cache/e2e/state-{admin,viewer}.json
  - tests/e2e/fixtures/**：`useAdmin()`/`useViewer()` 读取 storageState；保留 `loginViaUi()` 仅供 auth.spec 使用
  - tests/e2e/*.spec.ts（仅把 beforeEach 登录替换为 storageState，断言不变）
  - src/lib/__tests__/wechat-chat.test.ts（正则改为 `new RegExp([phone, domain].map(escape).join("|"))`，并加一条反证用例：故意构造只含电话的字符串必须命中）
  - eslint.config.mjs：ignores 增加 `.cache/**`
  - docs/design/06_validation/evidence/W0/W0-11/（三次整套 e2e 输出、登录接口调用计数）
  - tests/a11y/smoke.spec.ts（1 条：打开 /manager/login，axe 扫描 critical=0；保证 --list 非空）
- **执行步骤**：
  1. 从 `w0/ccr-1` 的同一起点开分支 `w0/test-infra`（与 W0-10 文件不相交，可同时进行）
  2. 先在 Linux 记录基线：e2e 8/8 + 登录接口调用次数（服务端日志计数）
  3. 实现 storageState 与 env 预置；Linux 连续 2 次整套 e2e 8/8，且无“尝试过于频繁”
  4. 修 wechat 守卫正则，跑反证用例确认守卫能失败（临时注入一行电话→测试红→还原）
  5. eslint ignores 加 .cache/**，在含 .cache 临时文件的树上跑 lint 计数与干净树一致
  6. 提交：`git commit -m "test(W0-11): 测试基建补丁"`
  7. 跑本卡验证命令与通用门禁，把命令、exit code、关键输出写入证据目录
  8. 提交：`git commit -m "<feat|fix|test|docs>(W0-11): <摘要>"`（只含允许路径）
- **验收标准**（全部满足；最后两条对每张卡都适用）：
  - `npx playwright test -c tests/a11y/playwright.config.ts --list` exit 0 且列出 smoke.spec
  - Linux 连续 2 次 `npm run test:e2e` 8/8；登录接口调用：globalSetup 2 次 + auth.spec 自身，其余 spec 0 次（服务端日志计数入证据）
  - wechat-chat 反证用例存在且通过；临时注入后测试变红的记录写入证据
  - `npm run lint` 在含 `.cache/x.mjs` 的工作树上警告数 = 干净树警告数
  - `git diff --name-only $(git merge-base origin/upgrade HEAD)..HEAD` ⊆ 本卡 allow
  - 通用门禁 `npm run lint && npm run typecheck && npm test && npm run build` 全部 exit 0
  - `git log --first-parent --no-merges --name-only --format= <本卡起点>..HEAD | sort -u` 全部落在本卡“允许修改”内
- **验证命令**：
```bash
npm run lint && npm run typecheck && npm test && npm run build
npm run test:e2e && npm run test:e2e    # Linux 连跑两次
npx playwright test -c tests/a11y/playwright.config.ts --list
```
- **允许修改**：
  - tests/a11y/playwright.config.ts
  - tests/e2e/global-setup.ts
  - tests/e2e/fixtures/**
  - tests/e2e/*.spec.ts
  - src/lib/__tests__/wechat-chat.test.ts
  - eslint.config.mjs
  - docs/design/06_validation/evidence/W0/W0-11/**
  - tests/a11y/smoke.spec.ts
- **升级/熔断**：storageState 在 standalone 构建下 cookie 域不匹配 → 记录根因，改为 API 登录取 cookie 注入；仍失败 → opus；同一卡连续 2 次独立验收 FAIL → 停止改代码，写失败分析交用户裁决
- **证据目录**：`docs/design/06_validation/evidence/W0/W0-11/`

#### W0-12　规划包入库修复与规则对齐：修复 docs/V0.5-20261015 与 docs/任务规划V0.2.0 的乱码文件名、补回缺失文件、V0.6 包入库、AGENTS.md 指向 V0.6 并统一五条 lane 分支名、增加“禁止跨线大提交”

- **工作包 / 切片**：WP0.8 冻结面补丁（CCR-1）　/　S0 治理刀
- **来源需求**：规划总指令 §0（执行者唯一共享物是契约与规划包）；DR-18、L-13（evidence/V0.6-需求缺口复核.md）
- **目标**：仓库内规划包文件名全部为正确中文、无缺失；AGENTS.md 的规划入口、分支命名与 V0.6 一致
- **输入**：evidence/v05-filename-map.json（乱码路径→正确路径，按内容 sha 匹配；docs/V0.5-20261015 108 个文件中 25 个乱码，缺 37 个文件，含 prompts/、02 契约冻结包、11 验收规程）；AGENTS.md:41,49（仍写 lane/ui、lane/backend 与 parallel-w1 V0.2 包）；根因：V0.1~V0.5 的 zip 未置 UTF-8 文件名标志（flag_bits=0x0），Windows 解压按 GBK 解码
- **依赖**：W0-08　**档位**：haiku（机械改名与文本替换）　**规模**：小（<2h）（计划 0.25 人天）
- **输出（新增/修改）**：
  - docs/V0.5-20261015/**（`git mv` 乱码名→正确名；补回 37 个缺失文件）
  - docs/任务规划V0.2.0/**（同法修复 24 个乱码名）
  - docs/V0.6-20261016/**（本规划包）
  - AGENTS.md（§1 读取顺序指向 docs/V0.6-20261016/README.md；§4 分支命名改为 lane/ui、lane/ui、lane/backend、lane/backend、lane/backend，起点 tag w1-base-ccr-1；§5 增加“禁止跨线大提交直接进 upgrade，必须走 lane 分支 + 独立验证”）
- **执行步骤**：
  1. 首选：`git am` 应用 V0.6 交付的 3 个补丁（0001 文件名修复与补回、0002 V0.6 入库、0003 AGENTS.md 对齐；文件名以 UTF-8 存于补丁内，不经 zip）
  2. 无法 git am 时：按 v05-filename-map.json 逐条 `git mv`，再从 V0.6 zip（已置 UTF-8 标志）补回缺失文件
  3. AGENTS.md 三处修改
  4. 提交：`git commit -m "docs(W0-12): 规划包文件名修复与 V0.6 入库"`
  5. 跑本卡验证命令与通用门禁，把命令、exit code、关键输出写入证据目录
  6. 提交：`git commit -m "<feat|fix|test|docs>(W0-12): <摘要>"`（只含允许路径）
- **验收标准**（全部满足；最后两条对每张卡都适用）：
  - `git -c core.quotepath=false ls-files docs | python3 -c "import sys;b=[l for l in sys.stdin if any(c in l for c in '鍨鎵鍓鑷闂瑙閲绠瀹鐙妫棣')];print(len(b));sys.exit(1 if b else 0)"` exit 0（对照：在 fb82885 上同一命令输出 49 且 exit 1）
  - `git ls-files docs/V0.5-20261015 | wc -l` = 142（145 个源文件减去 3 个 gen/__pycache__ 缓存；V0.6 补丁已删除误入的 .pyc）
  - `grep -c "lane/ui\|lane/backend" AGENTS.md` = 0；`grep -c "V0.6-20261016" AGENTS.md` ≥ 1；`grep -c "跨线" AGENTS.md` ≥ 1
  - `git diff --name-only fb82885..HEAD` ⊆ 本卡 allow
  - 通用门禁 `npm run lint && npm run typecheck && npm test && npm run build` 全部 exit 0
  - `git log --first-parent --no-merges --name-only --format= <本卡起点>..HEAD | sort -u` 全部落在本卡“允许修改”内
- **验证命令**：
```bash
git ls-files docs/V0.5-20261015 | wc -l
grep -n "V0.6-20261016\|跨线" AGENTS.md
```
- **允许修改**：
  - docs/V0.5-20261015/**
  - docs/任务规划V0.2.0/**
  - docs/V0.6-20261016/**
  - AGENTS.md
  - docs/design/06_validation/evidence/W0/W0-12/**
- **升级/熔断**：映射表有未匹配项 → 保留原文件并在证据中列出，不得删除；同一卡连续 2 次独立验收 FAIL → 停止改代码，写失败分析交用户裁决
- **证据目录**：`docs/design/06_validation/evidence/W0/W0-12/`

#### W0-13　CCR-1 门禁与冻结：合并 W0-10/11/12、补生成漏掉的 courses-375 参照图、双环境门禁、独立验证、打 tag w1-base-ccr-1

- **工作包 / 切片**：WP0.8 冻结面补丁（CCR-1）　/　S0 治理刀
- **来源需求**：规划总指令 §9.2/§9.3；D16 双环境矩阵；W0-08 遗留（courses-375.png 未重生成）
- **目标**：upgrade 上 tag w1-base-ccr-1 存在且独立验证 PASS：visual 46/46（或失败集 ⊆ {courses@375} 并经用户再次裁决）、Linux e2e 8/8、两份输出 SHA 一致
- **输入**：V0.6 核验：79b0f32 重生成了 32 张参照图，但 `courses-375.png` 不在其中（`git log -- tests/visual/reference/courses-375.png` 只有 c7e5409，md5 32230fcd…），而 reference-deviation.md:44 记为“已重新生成”——与事实不符；当时 `.cache/visual/test-results/courses-375-actual.png` 处于 busy 状态（visual-hang-evidence.md），推断该张重生成被阻断（推断，待 W0-13 步骤 2 证实）
- **依赖**：W0-10, W0-11, W0-12　**档位**：opus（冻结点 review 与参照图真实性判断）　**规模**：小（0.5 天）（计划 0.5 人天）
- **输出（新增/修改）**：
  - upgrade：W0-10、W0-11、W0-12 以 `--no-ff` 合并
  - tests/visual/reference/courses-375.png（仅当步骤 2 证实：由 main@94dbbbb 在参照机以官方命令重生成）
  - docs/design/06_validation/evidence/W0/W0-13/ccr-1-verify.md
  - git tag w1-base-ccr-1
- **执行步骤**：
  1. 按 W0-12 → W0-10 → W0-11 顺序 `git merge --no-ff` 到 upgrade（文件不相交，无冲突；有冲突即说明越界，退回对应卡）
  2. 参照机（用户本机 Windows）：清空 `.cache/visual`（无法删除则用 `--output=.cache/visual/tr-<日期>`）；检出 main@94dbbbb 于 6790，执行 `VISUAL_REF=1 VISUAL_BASE_URL=http://127.0.0.1:6790 npx playwright test tests/visual -g "courses @375" --update-snapshots --output=.cache/visual/tr-ref`；记录新旧 md5
  3. 参照机跑 GATE + `npm run test:visual`；Linux 对同一 SHA 跑 `npm ci && npm run build && npm run test:e2e`
  4. 独立验证者（Hark 子代理或未参与 W0-10~12 的人）只看 `git diff w1-base..HEAD` 与两份输出，给 PASS/FAIL/UNKNOWN
  5. PASS 后 `git tag w1-base-ccr-1 && git push origin upgrade w1-base-ccr-1`
  6. 修正 W0-08 证据中“courses-375 已重新生成”的错误陈述（在 ccr-1-verify.md 中更正，不改历史文件）
  7. 跑本卡验证命令与通用门禁，把命令、exit code、关键输出写入证据目录
  8. 提交：`git commit -m "<feat|fix|test|docs>(W0-13): <摘要>"`（只含允许路径）
- **验收标准**（全部满足；最后两条对每张卡都适用）：
  - ccr-1-verify.md 结论 PASS，两份输出 HEAD SHA 一致
  - visual 46/46；若 courses@375 仍失败：失败集 ⊆ {courses@375}、差异像素 ≤ 26989，并已交用户再次裁决（结论写入证据）
  - Linux e2e 8/8
  - `git diff --name-only fb82885..w1-base-ccr-1` 只含 W0-10/11/12 allow 与本卡 allow 的路径
  - `git tag --points-at HEAD` 含 w1-base-ccr-1
  - 通用门禁 `npm run lint && npm run typecheck && npm test && npm run build` 全部 exit 0
  - `git log --first-parent --no-merges --name-only --format= <本卡起点>..HEAD | sort -u` 全部落在本卡“允许修改”内
- **验证命令**：
```bash
npm run lint && npm run typecheck && npm test && npm run build
npm run test:visual    # 参照机 Windows
npm ci && npm run build && npm run test:e2e    # Linux，同一 SHA
```
- **允许修改**：
  - tests/visual/reference/courses-375.png
  - docs/design/06_validation/evidence/W0/**
- **升级/熔断**：重生成后 courses@375 仍失败 → 不再动参照图，Hark 在 W2-05 前做像素级根因（文字渲染）并交用户裁决；连续 2 次 FAIL → 熔断；K1 未授权（无法推送）→ Hark 产出 `git bundle` 与 tag 说明，由用户本机 `git fetch <bundle> && git push origin upgrade w1-base-ccr-1`；同一卡连续 2 次独立验收 FAIL → 停止改代码，写失败分析交用户裁决
- **证据目录**：`docs/design/06_validation/evidence/W0/W0-13/`

**Wave 0 退出**：X 给出 W0-08 PASS → `git tag w1-base && git push origin upgrade w1-base` → 自查 remote URL 不含凭据。

## 阶段 1：Wave 1 启动

```bash
git fetch --all --tags && git checkout -b lane/backend w1-base
npm ci && npx prisma generate && npm run lint && npm run typecheck && npm test && npm run build
```

## 你的所有权（Wave 1 只能写这些路径；与 X 零重叠，已机械校验）

**执行线 B API 与响应平台**
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
- `src/lib/crud-resources/index.ts`
- `src/lib/crud-resources/shared.ts`
- `src/lib/security/**`

**执行线 C AI 与知识库**
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

**执行线 D 运维·性能·配置·存储·资源**
- `scripts/**`
- `next.config.ts`
- `src/instrumentation.ts`
- `src/lib/env.ts`
- `src/lib/storage.ts`
- `src/lib/cache-tags.ts`
- `src/lib/jobs/**`
- `src/lib/crud.ts`
- `src/lib/collect-engine.ts`
- `src/lib/collect-test.ts`
- `src/lib/collect/**`
- `src/lib/block-registry.ts`
- `src/lib/settings-registry.ts`
- `src/lib/scheduler.ts`
- `src/config/**`
- `src/app/api/upload/**`
- `src/app/api/file/**`
- `src/app/api/media/**`
- `src/app/api/collect-sources/**`
- `src/app/api/collect-items/**`
- `src/app/api/collect-tasks/**`
- `src/lib/crud-resources/site.ts`
- `src/lib/crud-resources/collect.ts`
- `src/lib/crud-resources/media.ts`
- `src/app/(web)/**`
- `src/components/web/Footer.tsx`
- `src/components/web/data/**`
- `src/app/robots.ts`
- `src/app/sitemap.ts`
- `Dockerfile`
- `docker-compose.yml`
- `.dockerignore`
- `CLAUDE.md`
- `.env.example`
- `.gitignore`
- `.tmp-pa.html`
- `uploads/**`
- `src/lib/__tests__/lane-d/**`
- `src/lib/__tests__/scheduler-cron.test.ts`
- `src/lib/__tests__/settings-registry.test.ts`
- `src/lib/__tests__/block-registry.test.ts`
- `src/lib/__tests__/sqlite-busy-timeout.test.ts`
- `src/lib/__tests__/view-stats.test.ts`
- `tests/e2e/d-*.spec.ts`
- `docs/design/06_validation/evidence/W1-D/**`
- `docs/design/03_solution/decisions/ADR-031-*.md`
- `docs/design/03_solution/decisions/ADR-032-*.md`
- `.github/**`
- `src/lib/block-registry-defs.ts`
- `src/components/web/FloatingContact.tsx`
- `src/components/web/Header.tsx`
- `src/lib/markdown.ts`
- `docs/design/07_release/**`
- `src/app/api/banners/**`
- `src/app/api/campus/**`
- `src/app/api/campus-images/**`
- `src/app/api/categories/**`
- `src/app/api/content-blocks/**`
- `src/app/api/courses/**`
- `src/app/api/element-configs/**`
- `src/app/api/enrollment-offerings/**`
- `src/app/api/gallery/**`
- `src/app/api/home-cards/**`
- `src/app/api/hot-majors/**`
- `src/app/api/majors/**`
- `src/app/api/navigations/**`
- `src/app/api/page-templates/**`
- `src/app/api/partners/**`
- `src/app/api/service-guides/**`
- `src/app/api/students/**`
- `src/app/api/tags/**`
- `src/app/api/template-blocks/**`

**越界检查（每次提交验证请求前自己先跑）**：
```bash
git log --first-parent --no-merges --name-only --format= w1-base..HEAD | sort -u
```
输出的每个文件都必须落在下面“你的所有权”内（执行线 B API 与响应平台 ∪ 执行线 C AI 与知识库 ∪ 执行线 D 运维·性能·配置·存储·资源）；并且同一张卡的提交只碰该卡“允许修改”的路径（段与段之间不得混提交，例如 C 卡的提交不能改 D 段的文件）。

## 段 B：API 与响应平台（6 张，5.25 人天）

**执行线 B API 与响应平台 的特别规则**

- 迁移路由时**响应形状与状态码不得改变**（除 W0 已冻结的错误码语义）。每迁一个路由，先写 401/403/400/200 用例（复用 `src/lib/__tests__/api-contract/harness.ts`），迁移后用例不改即通过。
- `getSettings` 保留为 @deprecated 别名，前台 9 个文件零改动。
- 写操作后的前台失效只调用 W0 冻结的 `invalidateWebContent([WEB_TAGS.x])`，不自己实现缓存（cache-tags.ts 归 D 线）。
- B-06 需要 `notify.scan` 调用 `flushDeferred()`：`src/lib/jobs/**` 归 D 段：B-06 只导出函数并单测直接调用；注册到 `notify.scan` 由 W2-08 统一做（不要在 D 段顺手改，避免越界口径混乱）。
- 全路由契约测试（tests/contract）与 ESLint 边界规则属于“守卫”，按规划总指令 §8.1 不与实现并行，放在 Wave 2（W2-02、W2-08）；你在 B-03 把协议例外清单写入 `evidence/W1-B/non-json-routes.md`，供 W2-02 使用。
- `src/lib/__tests__/w0-structure.test.ts` 在 Wave 1 归你维护（它只断言资源键“不丢”，其他线新增资源不会让它失败）。

| 序 | 卡号 | 任务 | 依赖 | 档位 | 人天 |
|---|---|---|---|---|---|
| 1 | B-01 | settings 读取分为 getPublicSettings / getAllSettings（getSettings 保留为已弃用别名） | W0-13 | sonnect | 0.25 |
| 2 | B-02 | withApi 迁移 A：后台路由（users×2、roles×2、settings×3、manager-menus、wechat/accounts×2、articles/[id] 的 GET/PUT/DELETE） | B-01 | sonnect | 1.5 |
| 3 | B-04 | B 线自有文件改用 http-client 与 json-field（wechat、notify-gateway、auth） | B-01 | sonnect | 0.5 |
| 4 | B-03 | withApi 迁移 B：apply、articles 列表、auth×4、user-actions、api 根；非 JSON 例外清单 | B-02 | sonnect | 1.0 |
| 5 | B-05 | PublishChannel 注册表（website/wechat）+ 发布后写失效 | B-04 | opus | 1.0 |
| 6 | B-06 | 通知：静默时段生效、去重跨进程原子化并细化键、邮件堆栈脱敏、notify-rules PATCH 接收 quietHours | B-04 | sonnect | 1.0 |
| 7 | B-07 | 公众号图文发布闭环：正文外链图转存微信（uploadimg）、发布结果回写 externalUrl（freepublish/get）、发布间隔 ≥60s；内容中枢后端：渠道状态 DTO 与多渠道一次发布（G1） | B-05 | sonnect | 2.0 |

工作包与验证节奏：B-01+B-04（公共工具收敛）→ B-02、B-03（路由统一包装，各发一次）→ B-05（发布渠道注册表）→ B-06（通知可靠性）。

### 段 B 任务卡

#### B-01　settings 读取分为 getPublicSettings / getAllSettings（getSettings 保留为已弃用别名）

- **工作包 / 切片**：WPB.1 公共工具收敛　/　S-B1 设置读取单一语义
- **来源需求**：P08 #5（3 处 `getAllSettings as getSettings` 同名不同义）
- **目标**：两个新名字语义清晰；前台 9 个文件零改动；B 线自有文件改用新名
- **输入**：src/lib/settings.ts:16,33
- **依赖**：W0-13　**档位**：sonnect（小重构）　**规模**：小（<2h，与 B-05 同批）（计划 0.25 人天）
- **输出（新增/修改）**：
  - src/lib/settings.ts
  - src/lib/__tests__/lane-b/settings.test.ts
- **执行步骤**：
  1. 新增导出 + @deprecated 注释
  2. wechat/callback 删除未用 settings 变量（P06-verify:93）
  3. 跑本卡验证命令与通用门禁，把命令、exit code、关键输出写入证据目录
  4. 提交：`git commit -m "<feat|fix|test|docs>(B-01): <摘要>"`（只含允许路径）
- **验收标准**（全部满足；最后两条对每张卡都适用）：
  - lane-b/settings.test.ts：公开读取不含 isPublic=false 键，全量读取包含
  - visual：失败集 ⊆ {courses@375} 且该项差异像素不增加（W0-13 若已恢复 46/46，则必须 46/46）
  - 通用门禁 `npm run lint && npm run typecheck && npm test && npm run build` 全部 exit 0
  - `git log --first-parent --no-merges --name-only --format= <本卡起点>..HEAD | sort -u` 全部落在本卡“允许修改”内
- **验证命令**：
```bash
npm run lint && npm run typecheck && npm test && npm run build
npm run test:visual
```
- **允许修改**：
  - src/lib/settings.ts
  - src/lib/__tests__/lane-b/**
  - src/app/api/settings/**
  - src/app/api/wechat/**
- **升级/熔断**：—；同一卡连续 2 次独立验收 FAIL → 停止改代码，写失败分析交用户裁决
- **证据目录**：`docs/design/06_validation/evidence/W1-B/B-01/`

#### B-02　withApi 迁移 A：后台路由（users×2、roles×2、settings×3、manager-menus、wechat/accounts×2、articles/[id] 的 GET/PUT/DELETE）

- **工作包 / 切片**：WPB.2 路由统一包装　/　S-B2 后台路由统一信封与异常告警
- **来源需求**：P08 #6；P06-verify 承接（未走 withApi 的异常不发 system_error）
- **目标**：上述路由全部经 withApi（鉴权/parseBody/错误映射/system_error），对外信封与状态码不变；roles 的 JSON.parse 改 json-field
- **输入**：A-ui §2.3 清单与行数
- **依赖**：B-01　**档位**：sonnect（模式化迁移）　**规模**：大（1.5 天）（计划 1.5 人天）
- **输出（新增/修改）**：
  - 对应 route.ts
  - src/lib/__tests__/lane-b/routes-admin.test.ts
- **执行步骤**：
  1. 每迁一个路由先写 401/403/400/200 契约用例（复用 api-contract/harness.ts）
  2. 迁移后用例不变即通过
  3. settings PUT 成功后调用 invalidateWebContent([WEB_TAGS.settings])
  4. 跑本卡验证命令与通用门禁，把命令、exit code、关键输出写入证据目录
  5. 提交：`git commit -m "<feat|fix|test|docs>(B-02): <摘要>"`（只含允许路径）
- **验收标准**（全部满足；最后两条对每张卡都适用）：
  - `grep -rLE "withApi|crudList|crudCreate|crudGet|crudUpdate|crudDelete" src/app/api/{users,roles,settings,manager-menus,wechat/accounts} --include=route.ts` 为空
  - articles/[id]/route.ts 中不存在未包装的 export async function
  - routes-admin.test.ts 全绿；e2e auth/crud-article 通过
  - 通用门禁 `npm run lint && npm run typecheck && npm test && npm run build` 全部 exit 0
  - `git log --first-parent --no-merges --name-only --format= <本卡起点>..HEAD | sort -u` 全部落在本卡“允许修改”内
- **验证命令**：
```bash
npm run lint && npm run typecheck && npm test && npm run build
npm run test:e2e
```
- **允许修改**：
  - src/app/api/users/**
  - src/app/api/roles/**
  - src/app/api/settings/**
  - src/app/api/manager-menus/**
  - src/app/api/wechat/**
  - src/app/api/articles/**
  - src/lib/__tests__/lane-b/**
  - src/lib/__tests__/api-contract/**
- **升级/熔断**：某路由响应形状被前台依赖且迁移后变化 → 停止该路由并上报；同一卡连续 2 次独立验收 FAIL → 停止改代码，写失败分析交用户裁决
- **证据目录**：`docs/design/06_validation/evidence/W1-B/B-02/`

#### B-04　B 线自有文件改用 http-client 与 json-field（wechat、notify-gateway、auth）

- **工作包 / 切片**：WPB.1 公共工具收敛　/　S-B4 外呼与 JSON 统一
- **来源需求**：P08 目标 2；A-ui §2.1-#3/#4
- **目标**：wechat.ts 6 处 AbortSignal.timeout 改 httpFetch；auth.ts、notify-gateway.ts、wechat.ts 的 DB JSON 解析改 parseJsonField
- **输入**：A-ui §2.1-#3 文件:行清单
- **依赖**：B-01　**档位**：sonnect（替换）　**规模**：小（0.5 天）（计划 0.5 人天）
- **输出（新增/修改）**：
  - src/lib/{wechat,notify-gateway,auth}.ts
- **执行步骤**：
  1. 替换 + 既有 wechat-chat/notify 测试回归
  2. 跑本卡验证命令与通用门禁，把命令、exit code、关键输出写入证据目录
  3. 提交：`git commit -m "<feat|fix|test|docs>(B-04): <摘要>"`（只含允许路径）
- **验收标准**（全部满足；最后两条对每张卡都适用）：
  - `grep -n "AbortSignal.timeout\|JSON.parse" src/lib/wechat.ts src/lib/notify-gateway.ts src/lib/auth.ts` 为空
  - wechat-chat.test.ts、notify-before-publish.test.ts 通过
  - 通用门禁 `npm run lint && npm run typecheck && npm test && npm run build` 全部 exit 0
  - `git log --first-parent --no-merges --name-only --format= <本卡起点>..HEAD | sort -u` 全部落在本卡“允许修改”内
- **验证命令**：
```bash
npm run lint && npm run typecheck && npm test && npm run build
```
- **允许修改**：
  - src/lib/wechat.ts
  - src/lib/notify-gateway.ts
  - src/lib/auth.ts
  - src/lib/__tests__/lane-b/**
  - src/lib/__tests__/wechat-chat.test.ts
- **升级/熔断**：—；同一卡连续 2 次独立验收 FAIL → 停止改代码，写失败分析交用户裁决
- **证据目录**：`docs/design/06_validation/evidence/W1-B/B-04/`

#### B-03　withApi 迁移 B：apply、articles 列表、auth×4、user-actions、api 根；非 JSON 例外清单

- **工作包 / 切片**：WPB.2 路由统一包装　/　S-B3 公开与认证路由统一
- **来源需求**：P08 #6；P13 #3/#4
- **目标**：仅剩协议例外（file、health、wechat/callback 的 XML/echostr）未走 withApi，并登记在证据 non-json-routes.md（W2-02 写入 tests/contract/rules.ts）；api 根改用 success()
- **输入**：A-ui §2.3；B-domain §1.3-#3/#4
- **依赖**：B-02　**档位**：sonnect（模式化迁移）　**规模**：中（1 天）（计划 1.0 人天）
- **输出（新增/修改）**：
  - 对应 route.ts
  - docs/design/06_validation/evidence/W1-B/non-json-routes.md（协议例外清单与理由，W2-02 写入守卫）
- **执行步骤**：
  1. auth 路由保留 cookie 设置行为
  2. apply 保留限流与中文文案
  3. 例外清单附理由
  4. 跑本卡验证命令与通用门禁，把命令、exit code、关键输出写入证据目录
  5. 提交：`git commit -m "<feat|fix|test|docs>(B-03): <摘要>"`（只含允许路径）
- **验收标准**（全部满足；最后两条对每张卡都适用）：
  - `grep -rLE "withApi|crudList|crudCreate|crudGet|crudUpdate|crudDelete" src/app/api --include=route.ts` 只剩例外清单内文件（另含 D/C 线负责的 upload、llm/providers，见其卡）
  - `grep -rn "NextResponse.json(" src/app/api | grep -v api-response` 为空
  - e2e auth/apply-chat 通过
  - 通用门禁 `npm run lint && npm run typecheck && npm test && npm run build` 全部 exit 0
  - `git log --first-parent --no-merges --name-only --format= <本卡起点>..HEAD | sort -u` 全部落在本卡“允许修改”内
- **验证命令**：
```bash
npm run lint && npm run typecheck && npm test && npm run build
npm run test:e2e
```
- **允许修改**：
  - src/app/api/apply/**
  - src/app/api/articles/**
  - src/app/api/auth/**
  - src/app/api/user-actions/**
  - src/app/api/route.ts
  - src/app/api/health/**
  - src/app/api/wechat/**
  - src/lib/__tests__/lane-b/**
  - docs/design/06_validation/evidence/W1-B/**
- **升级/熔断**：—；同一卡连续 2 次独立验收 FAIL → 停止改代码，写失败分析交用户裁决
- **证据目录**：`docs/design/06_validation/evidence/W1-B/B-03/`

#### B-05　PublishChannel 注册表（website/wechat）+ 发布后写失效

- **工作包 / 切片**：WPB.3 发布渠道注册表　/　S-B5 发布渠道可扩展
- **来源需求**：P09 目标（发布渠道部分）；P10 写后失效
- **目标**：publish-executor 只做状态机/审核门/提醒/退避，渠道实现 src/lib/channels/{website,wechat}.ts 经 getChannel(kind) 调用；网站发布成功后 invalidateWebContent([WEB_TAGS.articles, WEB_TAGS.home])；content-workflow 用 CHANNEL_KINDS
- **输入**：B-domain §2.1（publish-executor.ts:19-55,79-170）
- **依赖**：B-04　**档位**：opus（架构接口（opus 券）+ sonnect 实现）　**规模**：中（0.5~1 天）（计划 1.0 人天）
- **输出（新增/修改）**：
  - src/lib/channels/**
  - src/lib/publish-executor.ts
  - src/lib/content-workflow.ts
  - docs/design/03_solution/decisions/ADR-030-发布渠道注册表.md
- **执行步骤**：
  1. 先写 registries 测试（未知 kind → 明确错误）
  2. 搬迁实现，行为等价
  3. 跑本卡验证命令与通用门禁，把命令、exit code、关键输出写入证据目录
  4. 提交：`git commit -m "<feat|fix|test|docs>(B-05): <摘要>"`（只含允许路径）
- **验收标准**（全部满足；最后两条对每张卡都适用）：
  - `grep -n 'channel === "' src/lib/publish-executor.ts src/lib/content-workflow.ts` 为空
  - publish-state-machine/notify-before-publish/content-review 测试通过
  - e2e collect-publish 通过
  - 通用门禁 `npm run lint && npm run typecheck && npm test && npm run build` 全部 exit 0
  - `git log --first-parent --no-merges --name-only --format= <本卡起点>..HEAD | sort -u` 全部落在本卡“允许修改”内
- **验证命令**：
```bash
npm run lint && npm run typecheck && npm test && npm run build
npm run test:e2e
```
- **允许修改**：
  - src/lib/channels/**
  - src/lib/publish-executor.ts
  - src/lib/content-workflow.ts
  - src/lib/__tests__/lane-b/**
  - src/lib/__tests__/publish-state-machine.test.ts
  - src/lib/__tests__/notify-before-publish.test.ts
  - src/lib/__tests__/content-review.test.ts
  - docs/design/03_solution/decisions/ADR-030-*.md
- **升级/熔断**：行为差异无法用现有测试定位 → 补测试后再继续；同一卡连续 2 次独立验收 FAIL → 停止改代码，写失败分析交用户裁决
- **证据目录**：`docs/design/06_validation/evidence/W1-B/B-05/`

#### B-06　通知：静默时段生效、去重跨进程原子化并细化键、邮件堆栈脱敏、notify-rules PATCH 接收 quietHours

- **工作包 / 切片**：WPB.4 通知可靠性　/　S-B6 提醒更可靠
- **来源需求**：REQ-F-011；M-13；P06-verify:90（堆栈未脱敏；去重的串行化仅进程内）
- **目标**：静默时段内事件只记录 NotifyRecord(status=deferred) 不发信、时段结束后补发；去重现状已按 NotifyRecord 查库（notify-gateway.ts:59-63），但串行化只在进程内（:39-48），两进程并发可能都通过检查 → 改为原子判定（单条 SQL 条件插入或唯一去重键列复用），并把去重键细化为 event + 路由/任务名 + 10 分钟窗；不得重写已有去重逻辑以外的部分；邮件正文中的 token/key/password 形态字串替换为 ***
- **输入**：src/lib/notify-gateway.ts:39-48,59-63；schema.prisma:876 quietHours；W0-05 契约；V0.6（DR-14：quietHours 在 schema.prisma:956；W0-10 已收紧时刻范围并规定“规则级优先于全局 notifyQuietHours”）
- **依赖**：B-04　**档位**：sonnect（业务逻辑+测试）　**规模**：中（1 天）（计划 1.0 人天）
- **输出（新增/修改）**：
  - src/lib/notify-gateway.ts
  - src/app/api/notify-rules/**
  - src/lib/__tests__/lane-b/notify.test.ts
- **执行步骤**：
  1. 静默时段按 Asia/Shanghai 解释
  2. 补发由已有 notify.scan 任务调用（jobs 属 D 线：只调用 notify-gateway 导出的 flushDeferred，若 jobs/index.ts 未注册 → 契约变更请求给 D 线，W2 合并）
  3. 跑本卡验证命令与通用门禁，把命令、exit code、关键输出写入证据目录
  4. 提交：`git commit -m "<feat|fix|test|docs>(B-06): <摘要>"`（只含允许路径）
- **验收标准**（全部满足；最后两条对每张卡都适用）：
  - notify.test.ts：静默内不发、结束后补发；两个模拟进程 5 次异常只生成 1 条 system_error；正文不含 'hunter2'
  - PATCH quietHours 后 GET 回读一致
  - 网关遇到无效时刻按“无静默”处理并记 warning（DR-14）
  - 通用门禁 `npm run lint && npm run typecheck && npm test && npm run build` 全部 exit 0
  - `git log --first-parent --no-merges --name-only --format= <本卡起点>..HEAD | sort -u` 全部落在本卡“允许修改”内
- **验证命令**：
```bash
npm run lint && npm run typecheck && npm test && npm run build
```
- **允许修改**：
  - src/lib/notify-gateway.ts
  - src/app/api/notify-*/**
  - src/lib/__tests__/lane-b/**
  - src/lib/__tests__/notify-before-publish.test.ts
- **升级/熔断**：需要新表/新列 → 停止（迁移已冻结），改用 NotifyRecord 现有列；同一卡连续 2 次独立验收 FAIL → 停止改代码，写失败分析交用户裁决
- **证据目录**：`docs/design/06_validation/evidence/W1-B/B-06/`

#### B-07　公众号图文发布闭环：正文外链图转存微信（uploadimg）、发布结果回写 externalUrl（freepublish/get）、发布间隔 ≥60s；内容中枢后端：渠道状态 DTO 与多渠道一次发布（G1）

- **工作包 / 切片**：WPB.4 发布渠道　/　S-B4 公众号发布闭环
- **来源需求**：基本设计(4) 自动发布公众号文章；需求缺口 G2/G3/G4
- **目标**：一篇含外链图片的文章经公众号发布后，正文图片均为微信域名，ContentChannel.externalUrl 写入文章链接，两次发布间隔 ≥60s
- **输入**：src/lib/wechat.ts:183（注释称已保证间隔但未实现）；src/lib/publish-executor.ts；`grep -rn uploadimg src` 为空；ContentChannel.externalUrl 永远为空；V0.6（DR-03：渠道状态 DTO 与 channels[] 由 W0-10 冻结于 src/contracts/content-hub.ts 与 resources.ts）
- **依赖**：B-05　**档位**：sonnect（外部 API 适配与单测）　**规模**：大（2 天）（计划 2.0 人天）
- **输出（新增/修改）**：
  - src/lib/wechat.ts：uploadContentImage()（media/uploadimg）、getPublishResult()（freepublish/get）
  - src/lib/publish-executor.ts：发布前替换正文 <img src> 为微信 URL；发布后轮询结果写 externalUrl；同账号发布节流 ≥60s（持久化上次发布时间，跨进程有效）
  - src/lib/__tests__/lane-b/wechat-publish.test.ts（fetch 打桩）
  - src/app/api/content-items/**：列表/详情返回 W0-05 冻结的渠道状态 DTO（每渠道 状态/排期时间/externalUrl/最近错误）
  - src/app/api/publish-jobs/**：POST 支持 channels[] + 可选 scheduledAt，一次事务创建多条 PublishJob（G1）
  - src/lib/__tests__/lane-b/content-hub-api.test.ts
- **执行步骤**：
  1. 先写失败测试：外链图替换、externalUrl 回写、60s 节流三条
  2. 实现 uploadimg（≤1MB jpg/png，超限先压缩或跳过并记 warning）
  3. freepublish/get 轮询（最多 5 次、指数退避），失败标记发布任务 warning 不回滚
  4. 节流读写上次发布时间（DB 字段或 Setting，不新增迁移）
  5. G1：先写失败测试（渠道状态 DTO parse、双渠道定时一次创建 2 条 job、任一渠道校验失败整体回滚）再实现
  6. 跑本卡验证命令与通用门禁，把命令、exit code、关键输出写入证据目录
  7. 提交：`git commit -m "<feat|fix|test|docs>(B-07): <摘要>"`（只含允许路径）
- **验收标准**（全部满足；最后两条对每张卡都适用）：
  - `grep -n "uploadimg" src/lib/wechat.ts` 有命中
  - wechat-publish.test.ts 三条断言通过
  - 无真实公众号凭证时 e2e 记 UNKNOWN（不得写 PASS）
  - publish-state-machine.test.ts 回归通过
  - content-hub-api.test.ts 通过；响应通过 W0-05 渠道状态 schema parse
  - 通用门禁 `npm run lint && npm run typecheck && npm test && npm run build` 全部 exit 0
  - `git log --first-parent --no-merges --name-only --format= <本卡起点>..HEAD | sort -u` 全部落在本卡“允许修改”内
- **验证命令**：
```bash
npx vitest run src/lib/__tests__/lane-b/wechat-publish.test.ts
npx vitest run src/lib/__tests__/lane-b/content-hub-api.test.ts
GATE
```
- **允许修改**：
  - src/lib/wechat.ts
  - src/lib/publish-executor.ts
  - src/lib/channels/**
  - src/lib/__tests__/lane-b/**
  - docs/design/06_validation/evidence/W1-B/**
  - src/app/api/content-items/**
  - src/app/api/publish-jobs/**
- **升级/熔断**：微信接口返回结构与文档不符 → 上报，保持 warning 降级，不阻塞官网发布；同一卡连续 2 次独立验收 FAIL → 停止改代码，写失败分析交用户裁决
- **证据目录**：`docs/design/06_validation/evidence/W1-B/B-07/`

## 段 C：AI 与知识库（9 张，10 人天）

**执行线 C AI 与知识库 的特别规则**

- 知识库上传白名单只有 `.docx/.doc/.md/.markdown/.txt`；扩展名 + MIME + 文件头三重校验；**严禁**引入任何 PDF/图片解析或 OCR 依赖，严禁放宽白名单（ADR-025，用户裁决 D3）。
- 只有一个知识库注册表：P06 的 `registerKbRemoteAdapter` 保留导出名，作为新注册表的薄包装；Coze 后端在模块加载时自注册，**不改 `src/instrumentation.ts`**（D 线所有——也是你自己的 D 段，但必须在 D 段的卡里改，不得混进 C 卡的提交）。
- 采集入库不改 `collect-engine.ts`（D 线所有——也是你自己的 D 段，但必须在 D 段的卡里改，不得混进 C 卡的提交）：`ingestCollectItem` 内部读取 `CollectSource.knowledgeBaseId`。
- `ChatWidget.tsx` 只允许替换 SSE 解析逻辑（约 :89-131），JSX 与 className 不动，visual 46/46。
- 场景模型顺序：`providerIds` 非空 → 否则 `llmProviderId` → 否则全局 default→priority→fallback（K12），测试要覆盖回落。
- 日界一律 Asia/Shanghai；Coze 真实联调无凭证 → mock 测试，验收记 UNKNOWN。实现 Coze 接口前先核对 docs.coze.cn 当前文档，把 URL 与访问日期写入证据。

| 序 | 卡号 | 任务 | 依赖 | 档位 | 人天 |
|---|---|---|---|---|---|
| 1 | C-01 | LLMProviderAdapter 注册表（openai/coze）+ providers 路由 withApi + 测试端点复用适配器 | W0-13 | opus | 1.0 |
| 2 | C-03 | 知识库文件管线纯函数：类型三重校验、docx 解析、切分 | W0-13 | sonnect | 1.0 |
| 3 | C-02 | KnowledgeBackend 接口与注册表，合并 P06 的 KbRemoteAdapter | C-01 | sonnect | 1.0 |
| 4 | C-04 | Coze 知识库客户端：建库/推文档(≤10/批)/进度/删除 + 错误映射 + 自注册 | C-02, C-03 | sonnect | 1.5 |
| 5 | C-05 | 本地检索：按库过滤 + bigram/关键词/标题加权打分 + LIKE 预筛 ≤500 + 命中率基线 | C-02 | sonnect | 1.0 |
| 6 | C-06 | 知识库 API：库 CRUD+同步、文件上传(≤10MB 三重校验)/列表/删除/重解析/进度、kb/test 扩 baseIds/topK | C-04, C-05 | sonnect | 2.0 |
| 7 | C-07 | 场景绑定 providerIds/参数/baseIds；chat/stream 用 SSE 契约与 429；ChatWidget 仅解析改 safeParse | C-01, C-05 | sonnect | 1.0 |
| 8 | C-08 | 采集→目标库：ingestCollectItem 读取 CollectSource.knowledgeBaseId（默认“采集资讯”）并推送 Coze(txt) | C-04 | sonnect | 0.5 |
| 9 | C-09 | LLM dailyQuota / rateLimit 生效，全部超限返回 503 | C-07 | sonnect | 1.0 |
| 10 | C-10 | AI 客服风控：按用户限频、敏感词过滤、黑名单（官网与公众号同一入口） | C-07 | sonnect | 1.0 |
| 11 | C-11 | 大模型用量统计 API：按模型、按日聚合 LLMUsage；模型优先级批量排序 API（G7） | C-01 | sonnect | 1.0 |
| 12 | C-12 | 知识库“其他管理”API：标签、批量启停、导出、回收站（软删/恢复/彻底删除）、库统计、条目在线编辑、单库重建切片 | C-06 | opus | 2.0 |

工作包与验证节奏：C-01+C-02（注册表）→ C-03（文件管线）→ C-04（Coze）→ C-05（本地检索）→ C-06（知识库 API）→ C-07（场景与 SSE）→ C-08（采集入库）→ C-09（配额）。

### 段 C 任务卡

#### C-01　LLMProviderAdapter 注册表（openai/coze）+ providers 路由 withApi + 测试端点复用适配器

- **工作包 / 切片**：WPC.1 LLM 适配器注册表　/　S-C1 模型供应商可扩展
- **来源需求**：P09 目标（LLM 部分）；P08 #6（llm/providers×3 未包装）
- **目标**：llm-gateway 只保留路由/熔断/统计；`kind === "coze"` 分支在 src/lib 与 src/app/api 中为 0；providers 三路由走 withApi；coze/llm-gateway 改用 http-client
- **输入**：B-domain §2.2；llm-gateway.ts:79-123,156,194；providers/[id]/test/route.ts:33-53；kb-adapter.ts:86
- **依赖**：W0-13　**档位**：opus（架构接口（opus 券））　**规模**：中（1 天）（计划 1.0 人天）
- **输出（新增/修改）**：
  - src/lib/llm/{types,registry,openai,coze}.ts
  - src/lib/llm-gateway.ts
  - src/lib/coze.ts
  - src/app/api/llm/**
  - src/lib/kb-adapter.ts（仅 :86）
  - docs/design/03_solution/decisions/ADR-029-LLM与知识库适配器注册表.md
- **执行步骤**：
  1. 先写 registries 测试
  2. 搬迁实现 + 去掉 `getAllSettings as getSettings` 别名
  3. providers 路由迁 withApi，密钥脱敏不变
  4. 跑本卡验证命令与通用门禁，把命令、exit code、关键输出写入证据目录
  5. 提交：`git commit -m "<feat|fix|test|docs>(C-01): <摘要>"`（只含允许路径）
- **验收标准**（全部满足；最后两条对每张卡都适用）：
  - `grep -rn 'kind === "coze"' src/lib src/app/api` 为空
  - `grep -n "AbortSignal.timeout" src/lib/coze.ts src/lib/llm-gateway.ts src/app/api/llm -r` 为空
  - wechat-chat、p06-followups 测试通过
  - 通用门禁 `npm run lint && npm run typecheck && npm test && npm run build` 全部 exit 0
  - `git log --first-parent --no-merges --name-only --format= <本卡起点>..HEAD | sort -u` 全部落在本卡“允许修改”内
- **验证命令**：
```bash
npm run lint && npm run typecheck && npm test && npm run build
```
- **允许修改**：
  - src/lib/llm/**
  - src/lib/llm-gateway.ts
  - src/lib/coze.ts
  - src/app/api/llm/**
  - src/lib/kb-adapter.ts
  - src/lib/__tests__/lane-c/**
  - docs/design/03_solution/decisions/ADR-029-*.md
- **升级/熔断**：—；同一卡连续 2 次独立验收 FAIL → 停止改代码，写失败分析交用户裁决
- **证据目录**：`docs/design/06_validation/evidence/W1-C/C-01/`

#### C-03　知识库文件管线纯函数：类型三重校验、docx 解析、切分

- **工作包 / 切片**：WPC.3 文件管线　/　S-C3 上传文件可解析
- **来源需求**：ADR-025 §2/§4；M-10
- **目标**：扩展名+MIME+文件头三重校验，PDF(%PDF)与 PNG/JPEG/GIF/WEBP/BMP 文件头一律拒绝；docx 经 mammoth 转纯文本；.doc 无纯 JS 解析 → localParse=skipped；切分 ≤800 字、重叠 100 字
- **输入**：W0-05 kb 契约；W0-07 mammoth
- **依赖**：W0-13　**档位**：sonnect（纯函数）　**规模**：中（1 天）（计划 1.0 人天）
- **输出（新增/修改）**：
  - src/lib/kb/{filetype,parse,chunk}.ts
  - src/lib/__tests__/lane-c/kb-file.test.ts（含 fixtures：最小 docx、伪装成 .txt 的 PDF、伪装成 .md 的 PNG）
- **执行步骤**：
  1. fixtures 在测试中用 Buffer 构造，不提交二进制大文件
  2. 跑本卡验证命令与通用门禁，把命令、exit code、关键输出写入证据目录
  3. 提交：`git commit -m "<feat|fix|test|docs>(C-03): <摘要>"`（只含允许路径）
- **验收标准**（全部满足；最后两条对每张卡都适用）：
  - kb-file.test.ts：伪装文件全部被拒且返回 KB_REJECT_MESSAGE；docx 抽出预期文本；切分边界与重叠正确
  - `grep -rnE "pdf-parse|pdfjs|tesseract" package.json src/lib/kb` 为空
  - 通用门禁 `npm run lint && npm run typecheck && npm test && npm run build` 全部 exit 0
  - `git log --first-parent --no-merges --name-only --format= <本卡起点>..HEAD | sort -u` 全部落在本卡“允许修改”内
- **验证命令**：
```bash
npx vitest run src/lib/__tests__/lane-c/kb-file.test.ts
npm run lint && npm run typecheck && npm test && npm run build
```
- **允许修改**：
  - src/lib/kb/**
  - src/lib/__tests__/lane-c/**
- **升级/熔断**：mammoth 在 Node 22/24 报错 → 上报，docx 本地解析标 skipped（与 .doc 同处理），不换 PDF/OCR 库；同一卡连续 2 次独立验收 FAIL → 停止改代码，写失败分析交用户裁决
- **证据目录**：`docs/design/06_validation/evidence/W1-C/C-03/`

#### C-02　KnowledgeBackend 接口与注册表，合并 P06 的 KbRemoteAdapter

- **工作包 / 切片**：WPC.2 知识库后端注册表　/　S-C2 知识库后端可扩展
- **来源需求**：P09 目标（KB 部分）；P06-execution §8；B-domain §3.4
- **目标**：KnowledgeBackend = search/pushDocument/removeDocument/getDocumentStatus/pushEntry，纯 DTO；registerKbRemoteAdapter 保留导出名作为薄包装；只有一个注册表
- **输入**：kb-sync.ts:12-28；kb-adapter.ts:28,84,106
- **依赖**：C-01　**档位**：sonnect（接口抽取）　**规模**：中（0.5~1 天）（计划 1.0 人天）
- **输出（新增/修改）**：
  - src/lib/kb/{types,registry,local}.ts
  - src/lib/kb-adapter.ts（门面）
  - src/lib/kb-sync.ts
- **执行步骤**：
  1. 接口写入 ADR-029
  2. local 后端包裹现有 searchLocal（行为不变）
  3. 跑本卡验证命令与通用门禁，把命令、exit code、关键输出写入证据目录
  4. 提交：`git commit -m "<feat|fix|test|docs>(C-02): <摘要>"`（只含允许路径）
- **验收标准**（全部满足；最后两条对每张卡都适用）：
  - collect-autokb.test.ts 不改断言即通过
  - `grep -rn "registerKbRemoteAdapter\|registerKnowledgeBackend" src/lib` 只有一个注册表实现
  - 通用门禁 `npm run lint && npm run typecheck && npm test && npm run build` 全部 exit 0
  - `git log --first-parent --no-merges --name-only --format= <本卡起点>..HEAD | sort -u` 全部落在本卡“允许修改”内
- **验证命令**：
```bash
npm run lint && npm run typecheck && npm test && npm run build
```
- **允许修改**：
  - src/lib/kb/**
  - src/lib/kb-adapter.ts
  - src/lib/kb-sync.ts
  - src/lib/__tests__/lane-c/**
  - src/lib/__tests__/collect-autokb.test.ts
- **升级/熔断**：—；同一卡连续 2 次独立验收 FAIL → 停止改代码，写失败分析交用户裁决
- **证据目录**：`docs/design/06_validation/evidence/W1-C/C-02/`

#### C-04　Coze 知识库客户端：建库/推文档(≤10/批)/进度/删除 + 错误映射 + 自注册

- **工作包 / 切片**：WPC.4 Coze 知识库　/　S-C4 文件同步到 Coze
- **来源需求**：ADR-025 §3/§6/§7；R-P9
- **目标**：POST {apiBase}/open_api/knowledge/document/create（Authorization: Bearer、Agw-Js-Conv: str、chunk_strategy 必传、format_type 0）；md/markdown → txt；4013 等权限错误 → 中文提示；后端在模块加载时 registerKnowledgeBackend('coze')，不改 instrumentation
- **输入**：ADR-025；src/lib/coze.ts:19 headers；settings kbCozeProviderId/kbCozeSpaceId
- **依赖**：C-02, C-03　**档位**：sonnect（适配器实现）　**规模**：中（1~1.5 天）（计划 1.5 人天）
- **输出（新增/修改）**：
  - src/lib/kb/coze.ts
  - src/lib/coze.ts（抽请求工具）
  - src/lib/__tests__/lane-c/kb-coze.test.ts
- **执行步骤**：
  1. 实现前在 docs.coze.cn 核对当前接口并把 URL 与访问日期写进证据
  2. fetch 可注入，全部用 mock 测试
  3. 跑本卡验证命令与通用门禁，把命令、exit code、关键输出写入证据目录
  4. 提交：`git commit -m "<feat|fix|test|docs>(C-04): <摘要>"`（只含允许路径）
- **验收标准**（全部满足；最后两条对每张卡都适用）：
  - kb-coze.test.ts：URL/Header/body 正确；11 个文件分 2 批；md→txt；4013 → 权限中文提示
  - 无凭证时 processKbSyncQueue 记录原因而非抛错
  - 通用门禁 `npm run lint && npm run typecheck && npm test && npm run build` 全部 exit 0
  - `git log --first-parent --no-merges --name-only --format= <本卡起点>..HEAD | sort -u` 全部落在本卡“允许修改”内
- **验证命令**：
```bash
npx vitest run src/lib/__tests__/lane-c/kb-coze.test.ts
npm run lint && npm run typecheck && npm test && npm run build
```
- **允许修改**：
  - src/lib/kb/**
  - src/lib/coze.ts
  - src/lib/kb-sync.ts
  - src/lib/__tests__/lane-c/**
- **假设**：Coze 真实联调 = UNKNOWN（无凭证，D4/R-P5）
- **升级/熔断**：Coze 文档与 ADR-025 记录不一致 → 以官方文档为准，写入证据并告知用户与 X更新 ADR-025；同一卡连续 2 次独立验收 FAIL → 停止改代码，写失败分析交用户裁决
- **证据目录**：`docs/design/06_validation/evidence/W1-C/C-04/`

#### C-05　本地检索：按库过滤 + bigram/关键词/标题加权打分 + LIKE 预筛 ≤500 + 命中率基线

- **工作包 / 切片**：WPC.5 本地检索　/　S-C5 本地兜底检索更准
- **来源需求**：P12 目标 4；M-10
- **目标**：20 条中文问答 fixture 上 Top-3 命中率有前后对比数字（先测现状为基线，再改）；无基线不得声称提升
- **输入**：kb-adapter.ts:28-75（take:50、已有 bigram）
- **依赖**：C-02　**档位**：sonnect（算法+测试）　**规模**：中（1 天）（计划 1.0 人天）
- **输出（新增/修改）**：
  - src/lib/kb/local.ts
  - src/lib/__tests__/lane-c/kb-search.test.ts
  - src/lib/__tests__/lane-c/fixtures/kb-qa.json
  - docs/design/06_validation/evidence/W1-C/kb-search-baseline.md
- **执行步骤**：
  1. 先跑旧算法记录命中率
  2. 实现新算法
  3. 记录新命中率
  4. 跑本卡验证命令与通用门禁，把命令、exit code、关键输出写入证据目录
  5. 提交：`git commit -m "<feat|fix|test|docs>(C-05): <摘要>"`（只含允许路径）
- **验收标准**（全部满足；最后两条对每张卡都适用）：
  - kb-search.test.ts 通过且断言新命中率 ≥ 旧命中率
  - 证据含两次数字与 fixture 来源说明
  - 通用门禁 `npm run lint && npm run typecheck && npm test && npm run build` 全部 exit 0
  - `git log --first-parent --no-merges --name-only --format= <本卡起点>..HEAD | sort -u` 全部落在本卡“允许修改”内
- **验证命令**：
```bash
npx vitest run src/lib/__tests__/lane-c/kb-search.test.ts
```
- **允许修改**：
  - src/lib/kb/**
  - src/lib/kb-adapter.ts
  - src/lib/__tests__/lane-c/**
  - docs/design/06_validation/evidence/W1-C/**
- **升级/熔断**：新算法低于旧 → 保留旧算法并上报；同一卡连续 2 次独立验收 FAIL → 停止改代码，写失败分析交用户裁决
- **证据目录**：`docs/design/06_validation/evidence/W1-C/C-05/`

#### C-06　知识库 API：库 CRUD+同步、文件上传(≤10MB 三重校验)/列表/删除/重解析/进度、kb/test 扩 baseIds/topK

- **工作包 / 切片**：WPC.6 知识库 API　/　S-C6 库与文件可管理
- **来源需求**：REQ-F-007；M-10；ADR-025 §2/§8
- **目标**：上传 .pdf/.png/.jpg → 400 + KB_REJECT_MESSAGE；.md/.txt/.docx → 200 且 chunkCount>0；文件落 storage.kbDir()，不经 /api/file 公开；删除库/文件级联清理本地条目与磁盘文件并请求 Coze 删除
- **输入**：W0-05 kb 契约；W0-03 storage.kbDir()；crud-resources/kb-ai.ts
- **依赖**：C-04, C-05　**档位**：sonnect（API 实现）　**规模**：大（1.5~2 天）（计划 2.0 人天）
- **输出（新增/修改）**：
  - src/app/api/knowledge-bases/**
  - src/app/api/knowledge-files/**
  - src/app/api/kb/test/route.ts
  - src/lib/crud-resources/kb-ai.ts
  - src/lib/__tests__/lane-c/kb-api.test.ts
- **执行步骤**：
  1. 全部路由 withApi；kb/test 内联 schema 移除，改用 contracts/kb.ts
  2. 用 api-contract harness 写路由测试
  3. 跑本卡验证命令与通用门禁，把命令、exit code、关键输出写入证据目录
  4. 提交：`git commit -m "<feat|fix|test|docs>(C-06): <摘要>"`（只含允许路径）
- **验收标准**（全部满足；最后两条对每张卡都适用）：
  - kb-api.test.ts：上述 400/200/级联/401/403 用例全绿
  - `grep -n "z.object" src/app/api/kb/test/route.ts` 为空
  - 通用门禁 `npm run lint && npm run typecheck && npm test && npm run build` 全部 exit 0
  - `git log --first-parent --no-merges --name-only --format= <本卡起点>..HEAD | sort -u` 全部落在本卡“允许修改”内
- **验证命令**：
```bash
npx vitest run src/lib/__tests__/lane-c/kb-api.test.ts
npm run lint && npm run typecheck && npm test && npm run build
```
- **允许修改**：
  - src/app/api/knowledge-bases/**
  - src/app/api/knowledge-files/**
  - src/app/api/kb/**
  - src/app/api/knowledge/**
  - src/lib/crud-resources/kb-ai.ts
  - src/lib/kb/**
  - src/lib/__tests__/lane-c/**
- **升级/熔断**：—；同一卡连续 2 次独立验收 FAIL → 停止改代码，写失败分析交用户裁决
- **证据目录**：`docs/design/06_validation/evidence/W1-C/C-06/`

#### C-07　场景绑定 providerIds/参数/baseIds；chat/stream 用 SSE 契约与 429；ChatWidget 仅解析改 safeParse

- **工作包 / 切片**：WPC.7 场景装配与流式　/　S-C7 场景可绑定模型/参数/知识库
- **来源需求**：M-11/M-12；P13 目标 2；K12（providerIds > llmProviderId > 全局）
- **目标**：场景 [B,A] → B 优先、B 失败回落 A、再回落全局 fallback；官网与公众号 messages 全等；限频返回 HTTP 429/code 429；SSE 事件由 chatSseEventSchema 构造与解析；Coze 路径显式拼接 system 与最近历史为首条 user 前缀（写入 ADR-029）
- **输入**：chat-service.ts:62-126；chat/stream/route.ts:11-15,37-39,62-96；ChatWidget.tsx:105-128；llm-gateway.ts:107,197；V0.6（DR-23：contracts/chat.ts:16 已有 chatRequestSchema，路由 route.ts:11 仍用内联副本——只改 import）
- **依赖**：C-01, C-05　**档位**：sonnect（业务装配）　**规模**：中（1 天）（计划 1.0 人天）
- **输出（新增/修改）**：
  - src/lib/chat-service.ts
  - src/lib/llm-gateway.ts
  - src/app/api/chat/stream/route.ts
  - src/components/web/ChatWidget.tsx（仅 :89-131 解析逻辑）
  - src/lib/__tests__/lane-c/chat-scene.test.ts
- **执行步骤**：
  1. 先写场景路由测试
  2. 改装配与透传
  3. ChatWidget 只替换解析函数
  4. 跑本卡验证命令与通用门禁，把命令、exit code、关键输出写入证据目录
  5. 提交：`git commit -m "<feat|fix|test|docs>(C-07): <摘要>"`（只含允许路径）
- **验收标准**（全部满足；最后两条对每张卡都适用）：
  - chat-scene.test.ts 全绿（优先级、回落、两渠道 messages 全等、第 11 次请求 429、baseIds/providerIds 的 JSON 数组串与旧逗号文本都能解析）
  - ChatWidget 解析单测：同一流内出现两条 error 事件（route.ts 的 catch 与 finally 都可能发）时只显示一条提示且不抛错
  - e2e apply-chat 通过
  - visual：失败集 ⊆ {courses@375} 且该项差异像素不增加（W0-13 若已恢复 46/46，则必须 46/46）
  - `grep -n "z.object" src/app/api/chat/stream/route.ts` 为空（DR-23）
  - 通用门禁 `npm run lint && npm run typecheck && npm test && npm run build` 全部 exit 0
  - `git log --first-parent --no-merges --name-only --format= <本卡起点>..HEAD | sort -u` 全部落在本卡“允许修改”内
- **验证命令**：
```bash
npx vitest run src/lib/__tests__/lane-c/chat-scene.test.ts
npm run test:e2e
npm run test:visual
```
- **允许修改**：
  - src/lib/chat-service.ts
  - src/lib/llm-gateway.ts
  - src/lib/llm/**
  - src/app/api/chat/**
  - src/components/web/ChatWidget.tsx
  - src/lib/crud-resources/kb-ai.ts
  - src/lib/__tests__/lane-c/**
- **本卡额外禁止**：
  - ChatWidget.tsx 的 JSX 与 className（visual 门禁）
- **升级/熔断**：Coze bot 侧必须配置提示词才能生效 → 标 UNKNOWN 并在后台提示；同一卡连续 2 次独立验收 FAIL → 停止改代码，写失败分析交用户裁决
- **证据目录**：`docs/design/06_validation/evidence/W1-C/C-07/`

#### C-08　采集→目标库：ingestCollectItem 读取 CollectSource.knowledgeBaseId（默认“采集资讯”）并推送 Coze(txt)

- **工作包 / 切片**：WPC.8 采集入库　/　S-C8 采集内容进指定库并推送
- **来源需求**：REQ-F-006；M-8；ADR-025 §6
- **目标**：不改 collect-engine.ts（D 线所有）即可让新采集条目带 baseId 并进入推送队列
- **输入**：kb-sync.ts:31-83
- **依赖**：C-04　**档位**：sonnect（小改动）　**规模**：小（0.5 天）（计划 0.5 人天）
- **输出（新增/修改）**：
  - src/lib/kb-sync.ts
  - src/lib/__tests__/collect-autokb.test.ts（扩展断言）
- **执行步骤**：
  1. ingestCollectItem 内部查 source.knowledgeBaseId
  2. mock Coze 断言收到 txt
  3. 跑本卡验证命令与通用门禁，把命令、exit code、关键输出写入证据目录
  4. 提交：`git commit -m "<feat|fix|test|docs>(C-08): <摘要>"`（只含允许路径）
- **验收标准**（全部满足；最后两条对每张卡都适用）：
  - collect-autokb.test.ts：条目 baseId = 源指定库或默认库；mock Coze 收到 file_type=txt
  - V0.3（G10）：入库生成的 KnowledgeFile.collectItemId 指回来源 CollectItem，双向可查（单测断言）
  - 通用门禁 `npm run lint && npm run typecheck && npm test && npm run build` 全部 exit 0
  - `git log --first-parent --no-merges --name-only --format= <本卡起点>..HEAD | sort -u` 全部落在本卡“允许修改”内
- **验证命令**：
```bash
npx vitest run src/lib/__tests__/collect-autokb.test.ts
npm run lint && npm run typecheck && npm test && npm run build
```
- **允许修改**：
  - src/lib/kb-sync.ts
  - src/lib/kb/**
  - src/lib/__tests__/collect-autokb.test.ts
  - src/lib/__tests__/lane-c/**
- **升级/熔断**：—；同一卡连续 2 次独立验收 FAIL → 停止改代码，写失败分析交用户裁决
- **证据目录**：`docs/design/06_validation/evidence/W1-C/C-08/`

#### C-09　LLM dailyQuota / rateLimit 生效，全部超限返回 503

- **工作包 / 切片**：WPC.9 配额与限频　/　S-C9 模型用量受控
- **来源需求**：P15 目标 2；REQ-NF-001
- **目标**：当日（Asia/Shanghai 日界）LLMUsage.calls ≥ dailyQuota 的供应商被跳过；进程内每分钟滑窗 rateLimit；全部超限 → serviceUnavailable(503)；跳过原因记录
- **输入**：schema.prisma:507-508；llm-gateway.ts:54-77（日期用 UTC，需改口径）
- **依赖**：C-07　**档位**：sonnect（逻辑+测试）　**规模**：中（0.5~1 天）（计划 1.0 人天）
- **输出（新增/修改）**：
  - src/lib/llm/limits.ts
  - src/lib/llm-gateway.ts
  - src/app/api/chat/stream/route.ts（503 映射）
  - src/lib/__tests__/lane-c/llm-limits.test.ts
- **执行步骤**：
  1. 日界口径写入 ADR-029
  2. 测试用假时钟
  3. 跑本卡验证命令与通用门禁，把命令、exit code、关键输出写入证据目录
  4. 提交：`git commit -m "<feat|fix|test|docs>(C-09): <摘要>"`（只含允许路径）
- **验收标准**（全部满足；最后两条对每张卡都适用）：
  - llm-limits.test.ts：配额满跳到下一个；滑窗第 N+1 次跳过；全部超限 503；北京时间 00:00 重置
  - `grep -n "dailyQuota\|rateLimit" src/lib/llm/limits.ts src/lib/llm-gateway.ts` ≥ 2 处
  - 通用门禁 `npm run lint && npm run typecheck && npm test && npm run build` 全部 exit 0
  - `git log --first-parent --no-merges --name-only --format= <本卡起点>..HEAD | sort -u` 全部落在本卡“允许修改”内
- **验证命令**：
```bash
npx vitest run src/lib/__tests__/lane-c/llm-limits.test.ts
npm run lint && npm run typecheck && npm test && npm run build
```
- **允许修改**：
  - src/lib/llm/**
  - src/lib/llm-gateway.ts
  - src/app/api/chat/**
  - src/lib/__tests__/lane-c/**
- **升级/熔断**：改日界影响既有熔断统计 → 两者同口径并在 ADR 记录；同一卡连续 2 次独立验收 FAIL → 停止改代码，写失败分析交用户裁决
- **证据目录**：`docs/design/06_validation/evidence/W1-C/C-09/`

#### C-10　AI 客服风控：按用户限频、敏感词过滤、黑名单（官网与公众号同一入口）

- **工作包 / 切片**：WPC.4 对话与场景　/　S-C4 客服风控
- **来源需求**：基本设计(8) 官网与公众号 AI 客服；需求缺口 G5
- **目标**：同一用户超过每分钟阈值返回 429 文案；命中敏感词返回固定兜底回复且不调用模型；黑名单用户直接拒绝；三项对 /api/chat/stream 与公众号客服回调都生效
- **输入**：`grep -rni blacklist src` 为空；src/lib/chat-service.ts（官网与公众号共用）；W0-05 冻结的 chatGuard.* 键；V0.6（DR-06：风控键为扁平键 chatGuardRateLimitPerMin / chatGuardSensitiveWords / chatGuardBlacklist（W0-10 冻结；ADR-009 禁止点分键））
- **依赖**：C-07　**档位**：sonnect（纯函数 + 接入）　**规模**：中（1 天）（计划 1.0 人天）
- **输出（新增/修改）**：
  - src/lib/llm/guard.ts（纯函数 + 进程内滑动窗口，键=场景+用户标识）
  - src/lib/chat-service.ts：调用模型前接入 guard
  - src/lib/__tests__/lane-c/chat-guard.test.ts
- **执行步骤**：
  1. 失败测试：限频、敏感词、黑名单各 2 例（官网 SSE、公众号文本）
  2. 实现 guard，设置键缺失时用代码内默认值
  3. chat-service 统一接入，返回错误码走契约②（429）
  4. 跑本卡验证命令与通用门禁，把命令、exit code、关键输出写入证据目录
  5. 提交：`git commit -m "<feat|fix|test|docs>(C-10): <摘要>"`（只含允许路径）
- **验收标准**（全部满足；最后两条对每张卡都适用）：
  - chat-guard.test.ts 通过
  - 命中敏感词时 llm-gateway 调用次数为 0（spy 断言）
  - wechat-chat.test.ts 回归通过
  - 通用门禁 `npm run lint && npm run typecheck && npm test && npm run build` 全部 exit 0
  - `git log --first-parent --no-merges --name-only --format= <本卡起点>..HEAD | sort -u` 全部落在本卡“允许修改”内
- **验证命令**：
```bash
npx vitest run src/lib/__tests__/lane-c/chat-guard.test.ts
GATE
```
- **允许修改**：
  - src/lib/llm/**
  - src/lib/chat-service.ts
  - src/lib/__tests__/lane-c/**
  - docs/design/06_validation/evidence/W1-C/**
- **升级/熔断**：多实例部署需要共享限频 → 记 ADR，进程内实现保留，不在本卡引入 Redis；同一卡连续 2 次独立验收 FAIL → 停止改代码，写失败分析交用户裁决
- **证据目录**：`docs/design/06_validation/evidence/W1-C/C-10/`

#### C-11　大模型用量统计 API：按模型、按日聚合 LLMUsage；模型优先级批量排序 API（G7）

- **工作包 / 切片**：WPC.1 模型网关　/　S-C1 多模型路由
- **来源需求**：基本设计(9)/(10) 多模型与余额提醒的运营依据；需求缺口 G6（LLMUsage 只写不读）
- **目标**：GET /api/llm/usage?groupBy=provider|day&from&to 返回 W0-05 冻结的 DTO，需 llm:list 权限
- **输入**：prisma LLMUsage 模型；W0-05 usage DTO；V0.6（DR-04：llmUsage*/llmProviderOrderSchema 由 W0-10 冻结于 src/contracts/llm.ts；行字段为 tokensIn/tokensOut/failures（无费用、无耗时，偏差见 ADR-034））
- **依赖**：C-01　**档位**：sonnect（只读聚合接口）　**规模**：中（1 天）（计划 1.0 人天）
- **输出（新增/修改）**：
  - src/app/api/llm/usage/route.ts（withApi）
  - src/lib/__tests__/lane-c/llm-usage.test.ts
  - src/app/api/llm/providers/order/route.ts：PATCH {ids:number[]}，事务内按序写 priority，需 llm:update
  - src/lib/__tests__/lane-c/llm-order.test.ts
- **执行步骤**：
  1. 失败测试：两种 groupBy、时间窗、无权限 403
  2. 实现 groupBy 聚合（Prisma groupBy）
  3. 日期按 Asia/Shanghai 归日
  4. G7：失败测试覆盖 正常排序 / ids 不全或重复 400（fieldErrors）/ 无权限 403，再实现
  5. 跑本卡验证命令与通用门禁，把命令、exit code、关键输出写入证据目录
  6. 提交：`git commit -m "<feat|fix|test|docs>(C-11): <摘要>"`（只含允许路径）
- **验收标准**（全部满足；最后两条对每张卡都适用）：
  - llm-usage.test.ts 通过
  - 响应通过 W0-05 zod schema parse
  - 无权限返回 403 且体符合契约②
  - llm-order.test.ts 通过
  - `test -f src/app/api/llm/providers/order/route.ts`
  - P-5：响应不含耗时与费用字段；REQ-F-010 AC6 的“耗时”按 ADR-034 记偏差（K8 未裁决前不加列）
  - 通用门禁 `npm run lint && npm run typecheck && npm test && npm run build` 全部 exit 0
  - `git log --first-parent --no-merges --name-only --format= <本卡起点>..HEAD | sort -u` 全部落在本卡“允许修改”内
- **验证命令**：
```bash
npx vitest run src/lib/__tests__/lane-c/llm-usage.test.ts
npx vitest run src/lib/__tests__/lane-c/llm-order.test.ts
GATE
```
- **允许修改**：
  - src/app/api/llm/**
  - src/lib/llm/**
  - src/lib/__tests__/lane-c/**
  - docs/design/06_validation/evidence/W1-C/**
- **升级/熔断**：—；同一卡连续 2 次独立验收 FAIL → 停止改代码，写失败分析交用户裁决
- **证据目录**：`docs/design/06_validation/evidence/W1-C/C-11/`

#### C-12　知识库“其他管理”API：标签、批量启停、导出、回收站（软删/恢复/彻底删除）、库统计、条目在线编辑、单库重建切片

- **工作包 / 切片**：WPC.3 知识库 API　/　S-C3 知识库管理
- **来源需求**：基本设计(6) 知识库管理（其他管理）；需求缺口 G9
- **目标**：W0-05 冻结的知识库管理扩展端点全部可用，回收站基于 KnowledgeFile.deletedAt，彻底删除同步删除远端文档
- **输入**：W0-06 增补列 deletedAt/tags；C-06 知识库 API；C-04 Coze 删除接口；V0.6（DR-05/DR-21：知识库扩展 DTO 由 W0-10 冻结于 src/contracts/kb.ts；列名是 baseId（不是 knowledgeBaseId），索引 (baseId, deletedAt)）
- **依赖**：C-06　**档位**：opus（多端点且涉及远端一致性（高难度））　**规模**：大（2 天）（计划 2.0 人天）
- **输出（新增/修改）**：
  - src/app/api/knowledge-bases/[id]/{stats,export,rebuild}/route.ts
  - src/app/api/knowledge-files/{batch,trash}/**
  - src/lib/kb/manage.ts
  - src/lib/__tests__/lane-c/kb-manage.test.ts
- **执行步骤**：
  1. 失败测试：每个端点 1 正 1 反
  2. 列表默认排除 deletedAt 非空；回收站仅列 deletedAt 非空
  3. 导出为 zip（原文件 + manifest.json）
  4. 重建切片走 C-03 管线，异步任务进度复用 C-06 进度契约
  5. 跑本卡验证命令与通用门禁，把命令、exit code、关键输出写入证据目录
  6. 提交：`git commit -m "<feat|fix|test|docs>(C-12): <摘要>"`（只含允许路径）
- **验收标准**（全部满足；最后两条对每张卡都适用）：
  - kb-manage.test.ts 通过
  - 彻底删除后远端删除被调用（打桩断言）
  - 批量操作 ids ≤100，超出 400 带 fieldErrors
  - 全部响应通过 W0-05 schema parse
  - 通用门禁 `npm run lint && npm run typecheck && npm test && npm run build` 全部 exit 0
  - `git log --first-parent --no-merges --name-only --format= <本卡起点>..HEAD | sort -u` 全部落在本卡“允许修改”内
- **验证命令**：
```bash
npx vitest run src/lib/__tests__/lane-c/kb-manage.test.ts
GATE
```
- **允许修改**：
  - src/app/api/knowledge-bases/**
  - src/app/api/knowledge-files/**
  - src/lib/kb/**
  - src/lib/__tests__/lane-c/**
  - docs/design/06_validation/evidence/W1-C/**
- **升级/熔断**：远端删除失败 → 本地保留 deletedAt 并标记 syncError，不得静默成功；同一卡连续 2 次独立验收 FAIL → 停止改代码，写失败分析交用户裁决
- **证据目录**：`docs/design/06_validation/evidence/W1-C/C-12/`

## 段 D：运维·性能·配置·存储·资源（12 张，9.25 人天）

**执行线 D 运维·性能·配置·存储·资源 的特别规则**

- **先测量再优化**：D-01 的 before.json 是 D-06 与 W2-04 的唯一基数（参考 `09-基线指标.md`，偏差 >15% 要说明）。
- 前台文件（`src/app/(web)/**`、`Footer.tsx`、`components/web/data/**`、robots、sitemap）你只能做三类改动：`dynamic/revalidate` 导出与数据函数调用、缓存包装与查询并行化、兜底字面量 → `BRAND_DEFAULTS`。JSX 与 className 不动，每次都跑 visual。
- `storage.ts` / `cache-tags.ts` 的**导出签名**在 W0 冻结（B、C 线在调用），你只改实现。
- 迁出 uploads 前先导出、计数与 `git ls-files uploads` 一致才 `git rm -r --cached`，磁盘文件不删。`public/uploads/202604/**` 的 20 个文件默认保留。
- `package.json`（含 scripts）在 Wave 1 冻结；check-assets/check-root 脚本接入与依赖删除在 Wave 2（W2-09、W2-03）。
- Docker 不可用时 D-08 的构建验收记 UNKNOWN。
- **D-01 的基线必须在 `w1-base` 上测**，不能在已含 B、C 改动的 HEAD 上测：
```bash
git worktree add ../hd-baseline w1-base && cd ../hd-baseline && npm ci && npx prisma generate
node <你在 lane/backend 写好的 scripts/measure-baseline.mjs 的路径> --out before.json   # 脚本先在 lane/backend 提交，再拷到 worktree 运行
cd - && git worktree remove ../hd-baseline
```
  before.json 与规划基线（首页 227,007 B、/manager 345,853 B、Ready 7.3s、TTFB 33~42ms）偏差 >15% 要在证据里解释。

| 序 | 卡号 | 任务 | 依赖 | 档位 | 人天 |
|---|---|---|---|---|---|
| 1 | D-01 | scripts/measure-baseline.mjs + 在 w1-base-ccr-1 上测 before.json | W0-13 | sonnect | 0.5 |
| 2 | D-02 | start-next：不再因数据库写入重建；按优先级加载 env 文件 | D-01 | sonnect | 0.5 |
| 3 | D-03 | src/lib/env.ts 集中校验 + instrumentation 启动校验 + .env.example 对齐 | D-02 | sonnect | 0.5 |
| 4 | D-04 | 设置键对等 16 键 + 默认值单一来源 + 修正 3 个不存在的默认资源路径 | W0-13 | sonnect | 1.0 |
| 5 | D-05 | 前台电话/域名兜底统一读 BRAND_DEFAULTS（仅替换字面量） | D-04 | sonnect | 0.5 |
| 6 | D-06 | 前台缓存：去掉 (web) 的 force-dynamic，首页数据与区块配置 unstable_cache + 标签失效 | D-01 | sonnect | 2.0 |
| 7 | D-07 | next.config 清理（cssChunking、过期注释）+ redirects 回归测试 + jobs 注释 | D-02 | haiku | 0.25 |
| 8 | D-08 | Docker 部署件 + CLAUDE.md | D-03 | sonnect | 0.5 |
| 9 | D-09 | storage.ts 正式实现 DATA_DIR；upload/file/collect-engine/backup 改用；standalone 不再携带 uploads | D-03 | sonnect | 1.0 |
| 10 | D-10 | 备份含 uploads 与 kb；运行时文件迁出 git（导出→.gitignore→git rm --cached） | D-09 | sonnect | 1.0 |
| 11 | D-11 | 删除媒体清理文件（单删/批删含缩略图）+ 孤儿扫描脚本 | D-09 | sonnect | 0.75 |
| 12 | D-12 | CollectParser 注册表（html/rss）+ 采集图片流式限长、白名单单一来源 + http-client/json-field | D-09 | sonnect | 1.0 |
| 13 | D-13 | GitHub Actions：push/PR 到 upgrade 与 lane/* 时在 ubuntu 上跑 lint/typecheck/test/build/e2e，并上传 Playwright 报告 | W0-13 | sonnect | 0.5 |
| 14 | D-14 | 部署与恢复手册 + 一次恢复演练：宝塔/PM2 部署、全新机 30 分钟恢复、备份还原、PM2 重启后调度自动恢复 | D-09 | sonnect | 1.0 |
| 15 | D-15 | 文章详情 JSON-LD（NewsArticle）：仅追加 script，不改可见像素 | D-06 | sonnect | 0.5 |

工作包与验证节奏：D-01（基线）→ D-02+D-03（启动与环境）→ D-04+D-05（设置对等）→ D-06（前台缓存，必跑 visual）→ D-07+D-08（配置收尾、Docker）→ D-09（存储根）→ D-10+D-11（备份、迁出 git、媒体清理）→ D-12（采集）。

### 段 D 任务卡

#### D-01　scripts/measure-baseline.mjs + 在 w1-base-ccr-1 上测 before.json

- **工作包 / 切片**：WPD.1 基线测量　/　S-D1 性能可测量
- **来源需求**：规划总指令 §9.1（无基线禁止优化）；P10
- **目标**：一条命令输出 homeJsGzip、managerJsGzip、managerArticlesJsGzip、homeTtfbColdMs/WarmMs、apiArticlesTtfbMs、startToReadyMs（standalone server.js 与 npm start 两种）
- **输入**：本规划 08-基线指标.md 的手工测量方法与数值
- **依赖**：W0-13　**档位**：sonnect（脚本）　**规模**：中（0.5 天）（计划 0.5 人天）
- **输出（新增/修改）**：
  - scripts/measure-baseline.mjs
  - docs/design/06_validation/evidence/W1-D/before.json
- **执行步骤**：
  1. 脚本自带临时库（DATABASE_URL 指向 tmp）与临时 JWT_SECRET，不写仓库
  2. 与 08-基线指标.md 数值对照，偏差 >15% 需说明
  3. P-4（REQ-NF-001 AC1）：Lighthouse 移动端 Performance 测首页与 /courses 各 3 次取中位数；环境无 Chrome/Lighthouse → 记 UNKNOWN
  4. 跑本卡验证命令与通用门禁，把命令、exit code、关键输出写入证据目录
  5. 提交：`git commit -m "<feat|fix|test|docs>(D-01): <摘要>"`（只含允许路径）
- **验收标准**（全部满足；最后两条对每张卡都适用）：
  - `node scripts/measure-baseline.mjs --out docs/design/06_validation/evidence/W1-D/before.json` exit 0
  - JSON 含上述 8 个键
  - 通用门禁 `npm run lint && npm run typecheck && npm test && npm run build` 全部 exit 0
  - `git log --first-parent --no-merges --name-only --format= <本卡起点>..HEAD | sort -u` 全部落在本卡“允许修改”内
- **验证命令**：
```bash
node scripts/measure-baseline.mjs --out /tmp/b.json && node -e "const b=require('/tmp/b.json');['homeJsGzip','managerJsGzip','startToReadyMs'].forEach(k=>{if(!(k in b))process.exit(1)})"
```
- **允许修改**：
  - scripts/**
  - docs/design/06_validation/evidence/W1-D/**
- **升级/熔断**：—；同一卡连续 2 次独立验收 FAIL → 停止改代码，写失败分析交用户裁决
- **证据目录**：`docs/design/06_validation/evidence/W1-D/D-01/`

#### D-02　start-next：不再因数据库写入重建；按优先级加载 env 文件

- **工作包 / 切片**：WPD.2 启动与环境　/　S-D2 重启快且读得到 env
- **来源需求**：P10 目标 2；P11 目标 1；I9；P0-baseline F1/F2
- **目标**：只监视 src、public、prisma/schema.prisma、prisma/migrations、package*.json、next.config.ts、tsconfig.json；启动前用 @next/env loadEnvConfig 加载 .env.production.local > .env.local > .env.production > .env；已构建未改源码时 npm start → Ready ≤ 10s
- **输入**：start-next.mjs:21-30,45-48,98-103；start-next-utils.mjs:4-24；V0.4：build 出现 Turbopack NFT 警告（instrumentation.ts → src/lib/jobs/backup.ts 动态路径致全项目被追踪），一并处理或记入风险
- **依赖**：D-01　**档位**：sonnect（脚本）　**规模**：中（0.5 天）（计划 0.5 人天）
- **输出（新增/修改）**：
  - scripts/start-next.mjs
  - scripts/start-next-utils.mjs
  - src/lib/__tests__/lane-d/start-next-utils.test.ts
- **执行步骤**：
  1. 抽纯函数 needsRebuild(entries, buildId)
  2. 单测：touch prisma/dev.db 不触发；改 schema 触发
  3. 跑本卡验证命令与通用门禁，把命令、exit code、关键输出写入证据目录
  4. 提交：`git commit -m "<feat|fix|test|docs>(D-02): <摘要>"`（只含允许路径）
- **验收标准**（全部满足；最后两条对每张卡都适用）：
  - start-next-utils.test.ts 通过
  - 实测：仅有 .env.local（含 JWT_SECRET）时 POST /api/auth/login 200；touch prisma/dev.db 后 npm start 日志无 next build 且 Ready ≤10s（写入证据）
  - 通用门禁 `npm run lint && npm run typecheck && npm test && npm run build` 全部 exit 0
  - `git log --first-parent --no-merges --name-only --format= <本卡起点>..HEAD | sort -u` 全部落在本卡“允许修改”内
- **验证命令**：
```bash
npx vitest run src/lib/__tests__/lane-d/start-next-utils.test.ts
npm run lint && npm run typecheck && npm test && npm run build
```
- **允许修改**：
  - scripts/**
  - src/lib/__tests__/lane-d/**
- **升级/熔断**：@next/env 在 standalone 不可用 → 在 start-next 内解析 env 文件（不新增依赖）；同一卡连续 2 次独立验收 FAIL → 停止改代码，写失败分析交用户裁决
- **证据目录**：`docs/design/06_validation/evidence/W1-D/D-02/`

#### D-03　src/lib/env.ts 集中校验 + instrumentation 启动校验 + .env.example 对齐

- **工作包 / 切片**：WPD.2 启动与环境　/　S-D2 重启快且读得到 env
- **来源需求**：P11 目标；REQ-NF-002；C-ops §2（CRON_SECRET 0 引用）
- **目标**：JWT_SECRET/ENCRYPTION_KEY ≥32、DATABASE_URL、APP_ORIGIN、DATA_DIR、HOSTNAME/PORT 由 zod 校验；生产缺失即退出并打印键名（不打印值）；CRON_SECRET 从 .env.example 移除并在 ADR-031 记录（无调用方）
- **输入**：jwt.ts:9-14；crypto.ts:10-15；instrumentation.ts:5-10；V0.6（DR-08：e2e 的 ENCRYPTION_KEY/APP_ORIGIN/DATA_DIR 由 W0-11 预置）
- **依赖**：D-02　**档位**：sonnect（配置）　**规模**：小（0.5 天）（计划 0.5 人天）
- **输出（新增/修改）**：
  - src/lib/env.ts
  - src/instrumentation.ts
  - .env.example
  - src/lib/__tests__/lane-d/env.test.ts
- **执行步骤**：
  1. env.ts 不在 import 时抛错（测试与构建期安全），由 instrumentation 调用 assertProductionEnv()
  2. 跑本卡验证命令与通用门禁，把命令、exit code、关键输出写入证据目录
  3. 提交：`git commit -m "<feat|fix|test|docs>(D-03): <摘要>"`（只含允许路径）
- **验收标准**（全部满足；最后两条对每张卡都适用）：
  - env.test.ts：缺键 → 列出键名；值不出现在错误信息
  - `grep -n CRON_SECRET .env.example` 为空
  - `npm run test:e2e` 仍全绿（W0-07 已为 e2e 预置所需变量；若仍缺 → CCR 给 E 线）
  - 通用门禁 `npm run lint && npm run typecheck && npm test && npm run build` 全部 exit 0
  - `git log --first-parent --no-merges --name-only --format= <本卡起点>..HEAD | sort -u` 全部落在本卡“允许修改”内
- **验证命令**：
```bash
npx vitest run src/lib/__tests__/lane-d/env.test.ts
npm run lint && npm run typecheck && npm test && npm run build
npm run test:e2e
```
- **允许修改**：
  - src/lib/env.ts
  - src/instrumentation.ts
  - .env.example
  - src/lib/__tests__/lane-d/**
  - docs/design/03_solution/decisions/ADR-031-*.md
- **假设**：A-D-1：CRON_SECRET 为死键，删除（若用户需要外部 cron 触发 → 新需求另立）
- **升级/熔断**：—；同一卡连续 2 次独立验收 FAIL → 停止改代码，写失败分析交用户裁决
- **证据目录**：`docs/design/06_validation/evidence/W1-D/D-03/`

#### D-04　设置键对等 16 键 + 默认值单一来源 + 修正 3 个不存在的默认资源路径

- **工作包 / 切片**：WPD.3 设置对等　/　S-D3 设置键与 main 对等
- **来源需求**：REQ-F-013 parity A22；P11 #4；C-ops §4-#1
- **目标**：registry 补 advantage1~4、banner*×6、card*Subtitle×3、homeCards、siteLogoIcon、statsLabel；前台冻结默认值以 setting-defaults.ts 为准、registry 从其导入（单一来源）；placeholder.svg/favicon.ico/banner-bg.jpg 默认值改为仓库内存在的文件
- **输入**：settings-registry.ts:36-49；src/components/web/data/setting-defaults.ts；scripts/migrate-setting-keys.mjs:13-31；V0.6（DR-06：chatGuard 三键已由 W0-10 落入 settings-registry，本卡不再新增，只做 16 键对等与 BRAND_DEFAULTS）
- **依赖**：W0-13　**档位**：sonnect（对等补齐）　**规模**：中（1 天）（计划 1.0 人天）
- **输出（新增/修改）**：
  - src/lib/settings-registry.ts
  - src/components/web/data/setting-defaults.ts（仅导出形态，不改值）
  - scripts/migrate-setting-keys.mjs
  - src/lib/__tests__/settings-registry.test.ts
  - src/lib/__tests__/lane-d/settings-parity.test.ts
- **执行步骤**：
  1. settings-parity fixture = main 的键清单（从 origin/main 提取，写入 fixture）
  2. 默认资源路径存在性断言
  3. 跑本卡验证命令与通用门禁，把命令、exit code、关键输出写入证据目录
  4. 提交：`git commit -m "<feat|fix|test|docs>(D-04): <摘要>"`（只含允许路径）
- **验收标准**（全部满足；最后两条对每张卡都适用）：
  - settings-parity.test.ts：main 键全部存在；每个 /images/* 默认值文件存在
  - visual：失败集 ⊆ {courses@375} 且该项差异像素不增加（W0-13 若已恢复 46/46，则必须 46/46）
  - 通用门禁 `npm run lint && npm run typecheck && npm test && npm run build` 全部 exit 0
  - `git log --first-parent --no-merges --name-only --format= <本卡起点>..HEAD | sort -u` 全部落在本卡“允许修改”内
- **验证命令**：
```bash
npm run lint && npm run typecheck && npm test && npm run build
npm run test:visual
```
- **允许修改**：
  - src/lib/settings-registry.ts
  - src/components/web/data/**
  - scripts/**
  - src/lib/__tests__/settings-registry.test.ts
  - src/lib/__tests__/lane-d/**
- **升级/熔断**：某 main 键语义不明 → 列入证据待确认，不臆造默认值；同一卡连续 2 次独立验收 FAIL → 停止改代码，写失败分析交用户裁决
- **证据目录**：`docs/design/06_validation/evidence/W1-D/D-04/`

#### D-05　前台电话/域名兜底统一读 BRAND_DEFAULTS（仅替换字面量）

- **工作包 / 切片**：WPD.3 设置对等　/　S-D4 前台无硬编码品牌
- **来源需求**：M-5；P06-verify:91；K13
- **目标**：除 src/config/brand.ts 与 setting-defaults.ts 外 src 中无 400-001-5729 / 132-1945-5550 / hd1994 字面量（共 3 组，现 400 号与域名 13 处/11 文件，132 号 16 处/9 文件，执行前重新盘点）；不改 JSX 结构与 className
- **输入**：C-ops §2 的 13 处/11 文件清单；V0.6（DR-15）：实际 14 文件 21 行（ApplyClient.tsx×5、services/[slug]×2、contact×2、home.ts×2、about/campus/courses/[id]/layout.tsx/robots/sitemap/Footer/FloatingContact/Header 各 1、settings-registry.ts:47）；settings-registry.ts:47 是品牌默认值本身，验收 grep 排除该文件
- **依赖**：D-04　**档位**：sonnect（字面量替换）　**规模**：小（0.5 天）（计划 0.5 人天）
- **输出（新增/修改）**：
  - src/app/(web)/{about,campus,contact,courses/[id]}/page.tsx
  - src/components/web/Footer.tsx
  - src/components/web/data/home.ts
  - src/app/robots.ts
  - src/app/sitemap.ts
- **执行步骤**：
  1. 逐文件替换 + 每文件 diff 自查只含字面量与 import
  2. 跑本卡验证命令与通用门禁，把命令、exit code、关键输出写入证据目录
  3. 提交：`git commit -m "<feat|fix|test|docs>(D-05): <摘要>"`（只含允许路径）
- **验收标准**（全部满足；最后两条对每张卡都适用）：
  - `grep -rnE "400-001-5729|132-1945-5550|hd1994" src --exclude-dir=__tests__ --exclude=settings-registry.ts | grep -v "src/config/brand.ts\|setting-defaults.ts"` 为空
  - visual：失败集 ⊆ {courses@375} 且该项差异像素不增加（W0-13 若已恢复 46/46，则必须 46/46）
  - 人工审 `git diff w1-base-ccr-1 -- 'src/app/(web)' src/components/web src/app/robots.ts src/app/sitemap.ts`：每个文件只有兜底字面量所在行被替换，外加至多 1 行 import；无 JSX 结构或 className 变化
  - 通用门禁 `npm run lint && npm run typecheck && npm test && npm run build` 全部 exit 0
  - `git log --first-parent --no-merges --name-only --format= <本卡起点>..HEAD | sort -u` 全部落在本卡“允许修改”内
- **验证命令**：
```bash
npm run test:visual
npm run lint && npm run typecheck && npm test && npm run build
```
- **允许修改**：
  - src/app/(web)/**
  - src/components/web/Footer.tsx
  - src/components/web/data/**
  - src/app/robots.ts
  - src/app/sitemap.ts
  - src/components/web/FloatingContact.tsx
  - src/components/web/Header.tsx
- **本卡额外禁止**：
  - 上述文件中除兜底字面量与 import 外的任何改动
- **升级/熔断**：—；同一卡连续 2 次独立验收 FAIL → 停止改代码，写失败分析交用户裁决
- **证据目录**：`docs/design/06_validation/evidence/W1-D/D-05/`

#### D-06　前台缓存：去掉 (web) 的 force-dynamic，首页数据与区块配置 unstable_cache + 标签失效

- **工作包 / 切片**：WPD.4 前台缓存　/　S-D5 首页更快且改动 5 秒可见
- **来源需求**：P10 目标 3；ADR-024（区块配置随首页缓存）
- **目标**：getHomeData 与 resolveHomeBlocks 以 WEB_TAGS 缓存；cache-tags 正式实现；crud 工厂写操作按资源映射失效；后台改动后前台 ≤5s 可见（e2e）；首页热 TTFB 不劣于 before.json
- **输入**：C-ops §1-#3（11 处 force-dynamic、home.ts:95-123 三批串行、layout.tsx:13）；V0.4：block-defs 唯一位置为 src/config/block-defs.ts（W0-R0 合并后），block-registry.ts 结构以 827646b+W0-R0 为准；V0.6（DR-01）：区块注册表唯一定义 = src/lib/block-registry-defs.ts（555408c 合并后 src/config/block-defs.ts 已删除；block-registry.ts:13-18 re-export），该文件归 D 线，E-03 只读；V0.6（DR-16：(web) 内 force-dynamic 为 10 个文件）
- **依赖**：D-01　**档位**：sonnect（缓存实现（opus 券 1 次审查））　**规模**：大（1.5~2 天）（计划 2.0 人天）
- **输出（新增/修改）**：
  - src/app/(web)/**（仅 dynamic/revalidate 导出与数据函数调用）
  - src/components/web/data/home.ts（仅缓存包装与查询并行化）
  - src/lib/block-registry.ts
  - src/lib/cache-tags.ts
  - src/lib/crud.ts
  - tests/e2e/d-cache.spec.ts
- **执行步骤**：
  1. 资源→标签映射表放 cache-tags.ts
  2. e2e：后台改 Banner 标题 → 5 秒内前台可见
  3. 跑本卡验证命令与通用门禁，把命令、exit code、关键输出写入证据目录
  4. 提交：`git commit -m "<feat|fix|test|docs>(D-06): <摘要>"`（只含允许路径）
- **验收标准**（全部满足；最后两条对每张卡都适用）：
  - `grep -rn "force-dynamic" "src/app/(web)"` 仅剩证据中列明理由的页（如 apply）
  - d-cache.spec.ts 通过
  - visual：失败集 ⊆ {courses@375} 且该项差异像素不增加（W0-13 若已恢复 46/46，则必须 46/46）
  - after.json 首页热 TTFB ≤ before ×1.1
  - 通用门禁 `npm run lint && npm run typecheck && npm test && npm run build` 全部 exit 0
  - `git log --first-parent --no-merges --name-only --format= <本卡起点>..HEAD | sort -u` 全部落在本卡“允许修改”内
- **验证命令**：
```bash
npx playwright test -c tests/e2e/playwright.config.ts tests/e2e/d-cache.spec.ts
npm run test:visual
npm run lint && npm run typecheck && npm test && npm run build
```
- **允许修改**：
  - src/app/(web)/**
  - src/components/web/data/**
  - src/lib/block-registry.ts
  - src/lib/cache-tags.ts
  - src/lib/crud.ts
  - src/lib/crud-resources/site.ts
  - tests/e2e/d-*.spec.ts
  - src/lib/__tests__/lane-d/**
  - src/lib/__tests__/block-registry.test.ts
- **本卡额外禁止**：
  - (web) 页面 JSX/className
- **升级/熔断**：缓存导致后台改动前台不可见两轮未修 → 回退该页为动态并上报；同一卡连续 2 次独立验收 FAIL → 停止改代码，写失败分析交用户裁决
- **证据目录**：`docs/design/06_validation/evidence/W1-D/D-06/`

#### D-07　next.config 清理（cssChunking、过期注释）+ redirects 回归测试 + jobs 注释

- **工作包 / 切片**：WPD.5 配置收尾　/　S-D6 部署件齐全
- **来源需求**：P11 #6；P08 #7；I11
- **目标**：构建无 cssChunking 告警；29 条 redirects 有测试守住与 main 一致
- **输入**：next.config.ts:9-12,28；jobs/index.ts:3-6
- **依赖**：D-02　**档位**：haiku（清理）　**规模**：小（<2h，与 D-08 同批）（计划 0.25 人天）
- **输出（新增/修改）**：
  - next.config.ts
  - src/lib/jobs/index.ts（仅注释）
  - src/lib/__tests__/lane-d/redirects.test.ts
- **执行步骤**：
  1. redirects 测试读取 next.config 与 fixture（从 origin/main 提取）逐条比对
  2. 跑本卡验证命令与通用门禁，把命令、exit code、关键输出写入证据目录
  3. 提交：`git commit -m "<feat|fix|test|docs>(D-07): <摘要>"`（只含允许路径）
- **验收标准**（全部满足；最后两条对每张卡都适用）：
  - redirects.test.ts 通过
  - `npm run build 2>&1 | grep -ci cssChunking` = 0
  - `grep -n "当前为预留\|后续切片注册" next.config.ts src/lib/jobs/index.ts` 为空
  - 通用门禁 `npm run lint && npm run typecheck && npm test && npm run build` 全部 exit 0
  - `git log --first-parent --no-merges --name-only --format= <本卡起点>..HEAD | sort -u` 全部落在本卡“允许修改”内
- **验证命令**：
```bash
npm run lint && npm run typecheck && npm test && npm run build
```
- **允许修改**：
  - next.config.ts
  - src/lib/jobs/**
  - src/lib/__tests__/lane-d/**
- **升级/熔断**：—；同一卡连续 2 次独立验收 FAIL → 停止改代码，写失败分析交用户裁决
- **证据目录**：`docs/design/06_validation/evidence/W1-D/D-07/`

#### D-08　Docker 部署件 + CLAUDE.md

- **工作包 / 切片**：WPD.5 配置收尾　/　S-D6 部署件齐全
- **来源需求**：parity E1/E2；REQ-NF-004
- **目标**：Dockerfile（node 24、standalone、非 root）、docker-compose.yml（卷：DATA_DIR、数据库）、.dockerignore、CLAUDE.md（内容 @AGENTS.md）；健康检查打 /api/health
- **输入**：origin/main 的 Dockerfile/Dockerfile.dev/docker-compose.yml/.dockerignore/CLAUDE.md
- **依赖**：D-03　**档位**：sonnect（部署件）　**规模**：小（0.5 天）（计划 0.5 人天）
- **输出（新增/修改）**：
  - Dockerfile
  - docker-compose.yml
  - .dockerignore
  - CLAUDE.md
- **执行步骤**：
  1. 以 main 为蓝本改 standalone 与 DATA_DIR
  2. 跑本卡验证命令与通用门禁，把命令、exit code、关键输出写入证据目录
  3. 提交：`git commit -m "<feat|fix|test|docs>(D-08): <摘要>"`（只含允许路径）
- **验收标准**（全部满足；最后两条对每张卡都适用）：
  - `test -f CLAUDE.md && test -f Dockerfile`
  - `command -v docker && docker build -t hdwebsite:w1 .` 成功；无 docker → 标 UNKNOWN（不计 PASS）
  - 通用门禁 `npm run lint && npm run typecheck && npm test && npm run build` 全部 exit 0
  - `git log --first-parent --no-merges --name-only --format= <本卡起点>..HEAD | sort -u` 全部落在本卡“允许修改”内
- **验证命令**：
```bash
command -v docker && docker build -t hdwebsite:w1 . || echo UNKNOWN
```
- **允许修改**：
  - Dockerfile
  - docker-compose.yml
  - .dockerignore
  - CLAUDE.md
- **升级/熔断**：—；同一卡连续 2 次独立验收 FAIL → 停止改代码，写失败分析交用户裁决
- **证据目录**：`docs/design/06_validation/evidence/W1-D/D-08/`

#### D-09　storage.ts 正式实现 DATA_DIR；upload/file/collect-engine/backup 改用；standalone 不再携带 uploads

- **工作包 / 切片**：WPD.6 存储根　/　S-D7 上传与备份不再写进构建目录
- **来源需求**：P14 目标 1；I14（已复测：构建后 .next/standalone/uploads=32M，运行后增至 45M/526 个文件——运行时写入构建目录；server.js:6 chdir）
- **目标**：所有上传/备份/知识库文件路径与 cwd 无关；collect-engine 不再 import '@/app/api/upload/route'；upload 路由迁 withApi；outputFileTracingExcludes 排除 uploads
- **输入**：upload/route.ts:25；file/[...path]/route.ts:7,22-26；collect-engine.ts:19,113-122；backup.ts:45
- **依赖**：D-03　**档位**：sonnect（存储改造（opus 券审查））　**规模**：中（1 天）（计划 1.0 人天）
- **输出（新增/修改）**：
  - src/lib/storage.ts
  - src/app/api/upload/**
  - src/app/api/file/**
  - src/lib/collect-engine.ts（仅路径）
  - src/lib/jobs/backup.ts（仅路径）
  - next.config.ts（仅 tracing 排除）
  - src/lib/__tests__/lane-d/storage.test.ts
- **执行步骤**：
  1. storage.test.ts 含 chdir 用例与穿越用例
  2. build 后检查 standalone 目录
  3. 跑本卡验证命令与通用门禁，把命令、exit code、关键输出写入证据目录
  4. 提交：`git commit -m "<feat|fix|test|docs>(D-09): <摘要>"`（只含允许路径）
- **验收标准**（全部满足；最后两条对每张卡都适用）：
  - `grep -rn 'process.cwd(), "uploads"\|process.cwd(), "backups"' src` 为空
  - `grep -rn "@/app/" src/lib` 为空
  - `npm run build && test ! -d .next/standalone/uploads`
  - storage.test.ts 通过
  - 通用门禁 `npm run lint && npm run typecheck && npm test && npm run build` 全部 exit 0
  - `git log --first-parent --no-merges --name-only --format= <本卡起点>..HEAD | sort -u` 全部落在本卡“允许修改”内
- **验证命令**：
```bash
npx vitest run src/lib/__tests__/lane-d/storage.test.ts
npm run build && test ! -d .next/standalone/uploads
npm run lint && npm run typecheck && npm test && npm run build
```
- **允许修改**：
  - src/lib/storage.ts
  - src/app/api/upload/**
  - src/app/api/file/**
  - src/lib/collect-engine.ts
  - src/lib/jobs/**
  - next.config.ts
  - src/lib/env.ts
  - .env.example
  - src/lib/__tests__/lane-d/**
  - docs/design/03_solution/decisions/ADR-031-*.md
- **升级/熔断**：tracing 排除后运行时找不到文件 → 回退排除项并上报；同一卡连续 2 次独立验收 FAIL → 停止改代码，写失败分析交用户裁决
- **证据目录**：`docs/design/06_validation/evidence/W1-D/D-09/`

#### D-10　备份含 uploads 与 kb；运行时文件迁出 git（导出→.gitignore→git rm --cached）

- **工作包 / 切片**：WPD.6 存储根　/　S-D8 数据可备份可迁出
- **来源需求**：P14 目标 2/3/5；R-P6
- **目标**：备份产物含 db + uploads + kb（tar.gz），保留 14 份；仓库 git ls-files uploads = 0 且磁盘文件保留；public/uploads 20 个文件处置写入证据（默认保留，因前台可能引用）
- **输入**：backup.ts:11,33-62；C-ops §3（413 文件，32M）
- **依赖**：D-09　**档位**：sonnect（脚本+测试）　**规模**：中（1 天）（计划 1.0 人天）
- **输出（新增/修改）**：
  - src/lib/jobs/backup.ts
  - scripts/migrate-uploads-to-data-dir.mjs
  - .gitignore
  - uploads/**（仅 git rm --cached）
  - src/lib/__tests__/lane-d/backup.test.ts
- **执行步骤**：
  1. 迁移脚本 dry-run 默认，报告计数
  2. 计数与 git ls-files 一致才执行 git rm --cached
  3. 跑本卡验证命令与通用门禁，把命令、exit code、关键输出写入证据目录
  4. 提交：`git commit -m "<feat|fix|test|docs>(D-10): <摘要>"`（只含允许路径）
- **验收标准**（全部满足；最后两条对每张卡都适用）：
  - 迁移脚本报告 413
  - `test "$(git ls-files uploads | wc -l)" -eq 0`
  - backup.test.ts：归档含三类、第 15 份删除最旧
  - 通用门禁 `npm run lint && npm run typecheck && npm test && npm run build` 全部 exit 0
  - `git log --first-parent --no-merges --name-only --format= <本卡起点>..HEAD | sort -u` 全部落在本卡“允许修改”内
- **验证命令**：
```bash
npx vitest run src/lib/__tests__/lane-d/backup.test.ts
npm run lint && npm run typecheck && npm test && npm run build
```
- **允许修改**：
  - src/lib/jobs/**
  - scripts/**
  - .gitignore
  - uploads/**
  - src/lib/__tests__/lane-d/**
- **升级/熔断**：计数不一致 → 停止，不执行 git rm --cached；同一卡连续 2 次独立验收 FAIL → 停止改代码，写失败分析交用户裁决
- **证据目录**：`docs/design/06_validation/evidence/W1-D/D-10/`

#### D-11　删除媒体清理文件（单删/批删含缩略图）+ 孤儿扫描脚本

- **工作包 / 切片**：WPD.6 存储根　/　S-D8 数据可备份可迁出
- **来源需求**：P14 目标 4；C-ops §3-#4
- **目标**：crud.ts 新增 afterDelete 钩子；media 单删与 /api/media/batch 删除对应原图与 thumb/small/medium；scan-orphan-uploads.mjs 默认 dry-run
- **输入**：media/[id]/route.ts:13；media/batch/route.ts:31-32；crud.ts:41,43
- **依赖**：D-09　**档位**：sonnect（逻辑）　**规模**：中（0.75 天）（计划 0.75 人天）
- **输出（新增/修改）**：
  - src/lib/crud.ts
  - src/lib/crud-resources/media.ts
  - src/app/api/media/**
  - scripts/scan-orphan-uploads.mjs
  - src/lib/__tests__/lane-d/media-delete.test.ts
- **执行步骤**：
  1. 钩子失败不回滚 DB 删除，只记日志
  2. 跑本卡验证命令与通用门禁，把命令、exit code、关键输出写入证据目录
  3. 提交：`git commit -m "<feat|fix|test|docs>(D-11): <摘要>"`（只含允许路径）
- **验收标准**（全部满足；最后两条对每张卡都适用）：
  - media-delete.test.ts：单删/批删后 4 个文件均不存在
  - `node scripts/scan-orphan-uploads.mjs; echo $?` = 0
  - 通用门禁 `npm run lint && npm run typecheck && npm test && npm run build` 全部 exit 0
  - `git log --first-parent --no-merges --name-only --format= <本卡起点>..HEAD | sort -u` 全部落在本卡“允许修改”内
- **验证命令**：
```bash
npx vitest run src/lib/__tests__/lane-d/media-delete.test.ts
npm run lint && npm run typecheck && npm test && npm run build
```
- **允许修改**：
  - src/lib/crud.ts
  - src/lib/crud-resources/media.ts
  - src/app/api/media/**
  - src/lib/storage.ts
  - scripts/**
  - src/lib/__tests__/lane-d/**
- **升级/熔断**：—；同一卡连续 2 次独立验收 FAIL → 停止改代码，写失败分析交用户裁决
- **证据目录**：`docs/design/06_validation/evidence/W1-D/D-11/`

#### D-12　CollectParser 注册表（html/rss）+ 采集图片流式限长、白名单单一来源 + http-client/json-field

- **工作包 / 切片**：WPD.7 采集　/　S-D9 采集可扩展且图片受控
- **来源需求**：P09 目标（采集部分）；P15 目标 4
- **目标**：collect-engine 与 collect-test 都经 getParser(type)；图片读取超过上限立即中止；上传与采集共用 storage.ts 的类型白名单与上限常量
- **输入**：collect-engine.ts:102-202；collect-test.ts:37；upload/route.ts:16-24
- **依赖**：D-09　**档位**：sonnect（搬迁）　**规模**：中（1 天）（计划 1.0 人天）
- **输出（新增/修改）**：
  - src/lib/collect/**
  - src/lib/collect-engine.ts
  - src/lib/collect-test.ts
  - src/lib/storage.ts（常量）
  - src/app/api/upload/route.ts（引用常量）
  - docs/design/03_solution/decisions/ADR-032-采集解析注册表.md
  - src/lib/__tests__/lane-d/collect.test.ts
- **执行步骤**：
  1. 先写测试（rss/html fixture、超大图片中止）
  2. 搬迁
  3. P-1（REQ-NF-001 §3 AC3）：单个采集批次超过 30 分钟中止，剩余源标记 collect_failed 并触发通知
  4. 跑本卡验证命令与通用门禁，把命令、exit code、关键输出写入证据目录
  5. 提交：`git commit -m "<feat|fix|test|docs>(D-12): <摘要>"`（只含允许路径）
- **验收标准**（全部满足；最后两条对每张卡都适用）：
  - `grep -rn 'type === "rss"' src/lib` 为空
  - `grep -c "image/jpeg" src/lib/collect-engine.ts src/app/api/upload/route.ts` 均为 0
  - collect-autokb（C 线文件，只读回归）与 e2e collect-publish 通过
  - 采集批次超时单测：模拟 31 分钟 → 中止且记 collect_failed（fake timers）
  - 通用门禁 `npm run lint && npm run typecheck && npm test && npm run build` 全部 exit 0
  - `git log --first-parent --no-merges --name-only --format= <本卡起点>..HEAD | sort -u` 全部落在本卡“允许修改”内
- **验证命令**：
```bash
npx vitest run src/lib/__tests__/lane-d/collect.test.ts
npm run test:e2e
npm run lint && npm run typecheck && npm test && npm run build
```
- **允许修改**：
  - src/lib/collect/**
  - src/lib/collect-engine.ts
  - src/lib/collect-test.ts
  - src/lib/storage.ts
  - src/app/api/upload/**
  - src/app/api/collect-*/**
  - src/lib/crud-resources/collect.ts
  - src/lib/__tests__/lane-d/**
  - docs/design/03_solution/decisions/ADR-032-*.md
- **升级/熔断**：—；同一卡连续 2 次独立验收 FAIL → 停止改代码，写失败分析交用户裁决
- **证据目录**：`docs/design/06_validation/evidence/W1-D/D-12/`

#### D-13　GitHub Actions：push/PR 到 upgrade 与 lane/* 时在 ubuntu 上跑 lint/typecheck/test/build/e2e，并上传 Playwright 报告

- **工作包 / 切片**：WPD.8 CI　/　S-D10 门禁可在 Linux 复现
- **来源需求**：规划总指令 §9.2（门禁可复现）；V0.5 W0-08 卡点（e2e 只能在 Linux 取得官方输出）
- **目标**：每个提交都有一份 Linux 官方 e2e 输出（含 SHA），W0-08 之后的门禁不再依赖个人电脑
- **输入**：仓库无 .github/workflows；Node 版本以 package.json engines 为准；e2e 需 `npx playwright install --with-deps chromium`
- **依赖**：W0-13　**档位**：sonnect（标准 CI 配置）　**规模**：小（0.5 天）（计划 0.5 人天）
- **输出（新增/修改）**：
  - .github/workflows/ci.yml（npm ci → lint → typecheck → test → build → playwright install → test:e2e；artifact：.cache/e2e/**）
  - docs/design/06_validation/evidence/W1-D/D-13/ci.md（首次绿灯运行链接与 SHA）
- **执行步骤**：
  1. 编写 workflow（不跑 visual：参照机是 Windows，Linux 字体渲染会出现 11 处固定差异，见 V0.4 门禁证据）
  2. secrets 一律不用；JWT_SECRET 等测试值由 global-setup 自带
  3. 在 lane/backend 推一次验证绿灯
  4. 跑本卡验证命令与通用门禁，把命令、exit code、关键输出写入证据目录
  5. 提交：`git commit -m "<feat|fix|test|docs>(D-13): <摘要>"`（只含允许路径）
- **验收标准**（全部满足；最后两条对每张卡都适用）：
  - workflow 在 lane/backend 上首次运行全绿，e2e 8/8
  - workflow 中不出现任何真实密钥或 .env 内容
  - visual 不在 CI 中（理由写入 ci.md）
  - 通用门禁 `npm run lint && npm run typecheck && npm test && npm run build` 全部 exit 0
  - `git log --first-parent --no-merges --name-only --format= <本卡起点>..HEAD | sort -u` 全部落在本卡“允许修改”内
- **验证命令**：
```bash
act -j ci 或 GitHub 运行页面结果截图（入证据）
```
- **允许修改**：
  - .github/**
  - docs/design/06_validation/evidence/W1-D/**
- **升级/熔断**：Actions 额度或仓库权限不足 → 交用户裁决（K1 推送凭据相关）；同一卡连续 2 次独立验收 FAIL → 停止改代码，写失败分析交用户裁决
- **证据目录**：`docs/design/06_validation/evidence/W1-D/D-13/`

#### D-14　部署与恢复手册 + 一次恢复演练：宝塔/PM2 部署、全新机 30 分钟恢复、备份还原、PM2 重启后调度自动恢复

- **工作包 / 切片**：WPD.9 部署与恢复　/　S-D11 可恢复部署
- **来源需求**：REQ-NF-004（部署与可用性：恢复步骤与演练）；REQ-C-003（宝塔 + PM2、单机 SQLite）
- **目标**：按手册在一台全新 Linux 上 ≤30 分钟从备份恢复出可登录的站点；PM2 restart 后定时任务自动继续
- **输入**：`git ls-files | grep -iE 'deploy|restore|pm2|ecosystem'` 无部署/恢复文档（evidence/V0.6-需求缺口复核.md NF4-2/NF4-4）；src/lib/jobs/backup.ts；scripts/start-next.mjs；D-09 DATA_DIR
- **依赖**：D-09　**档位**：sonnect（文档 + 脚本 + 演练）　**规模**：中（1 天）（计划 1.0 人天）
- **输出（新增/修改）**：
  - docs/design/07_release/部署与恢复手册.md
  - scripts/restore.mjs（从备份 zip 还原 DB 与 DATA_DIR，拒绝覆盖非空目录除非 --force）
  - docs/design/06_validation/evidence/W1-D/D-14/（演练计时记录、PM2 重启前后 jobs 日志）
- **执行步骤**：
  1. 写手册：环境、首次部署、升级、备份、还原、回滚
  2. 实现 restore.mjs + 单测（tmp 目录）
  3. 在沙箱或干净容器按手册演练一次并计时
  4. pm2 start → 等一次 cron → pm2 restart → 再等一次 cron，日志证明继续执行
  5. 跑本卡验证命令与通用门禁，把命令、exit code、关键输出写入证据目录
  6. 提交：`git commit -m "<feat|fix|test|docs>(D-14): <摘要>"`（只含允许路径）
- **验收标准**（全部满足；最后两条对每张卡都适用）：
  - restore 单测通过（含拒绝覆盖非空目录）
  - 演练记录：从开始到 /manager 可登录 ≤ 30 分钟
  - PM2 重启前后各 1 条调度执行日志
  - 手册不含任何真实密钥
  - 通用门禁 `npm run lint && npm run typecheck && npm test && npm run build` 全部 exit 0
  - `git log --first-parent --no-merges --name-only --format= <本卡起点>..HEAD | sort -u` 全部落在本卡“允许修改”内
- **验证命令**：
```bash
npx vitest run src/lib/__tests__/lane-d
npm run lint && npm run typecheck && npm test && npm run build
```
- **允许修改**：
  - docs/design/07_release/**
  - scripts/**
  - src/lib/__tests__/lane-d/**
  - docs/design/06_validation/evidence/W1-D/**
- **升级/熔断**：无可用的干净 Linux 环境 → 演练记 UNKNOWN，不得写 PASS；同一卡连续 2 次独立验收 FAIL → 停止改代码，写失败分析交用户裁决
- **证据目录**：`docs/design/06_validation/evidence/W1-D/D-14/`

#### D-15　文章详情 JSON-LD（NewsArticle）：仅追加 script，不改可见像素

- **工作包 / 切片**：WPD.4 SEO　/　S-D12 结构化数据
- **来源需求**：REQ-NF-003 §3（结构化数据保留/补充）
- **目标**：/articles/[id] 的 HTML 含一个合法的 NewsArticle JSON-LD（headline、datePublished、dateModified、author、image、mainEntityOfPage），visual 不变
- **输入**：`grep -rn "ld+json\|NewsArticle" src` 无命中；src/app/(web)/articles/[id]/page.tsx
- **依赖**：D-06　**档位**：sonnect（小范围 SEO 追加）　**规模**：小（0.5 天）（计划 0.5 人天）
- **输出（新增/修改）**：
  - src/app/(web)/articles/[id]/page.tsx（仅追加 `<script type="application/ld+json">`，JSON 经 JSON.stringify 并转义 `</`）
  - src/lib/__tests__/lane-d/jsonld.test.ts
  - tests/e2e/d-jsonld.spec.ts
- **执行步骤**：
  1. 抽纯函数 buildArticleJsonLd(article)（放在 page.tsx 同目录或 lane-d 测试可导入的位置）
  2. 单测：字段齐全、`</script>` 被转义
  3. e2e：页面内 JSON 可解析且 @type=NewsArticle
  4. visual 复跑
  5. 跑本卡验证命令与通用门禁，把命令、exit code、关键输出写入证据目录
  6. 提交：`git commit -m "<feat|fix|test|docs>(D-15): <摘要>"`（只含允许路径）
- **验收标准**（全部满足；最后两条对每张卡都适用）：
  - jsonld.test.ts 与 d-jsonld.spec.ts 通过
  - 标题含 `</script>` 的文章不产生 HTML 注入（单测）
  - visual：失败集 ⊆ {courses@375} 且该项差异像素不增加（W0-13 若已恢复 46/46，则必须 46/46）
  - 通用门禁 `npm run lint && npm run typecheck && npm test && npm run build` 全部 exit 0
  - `git log --first-parent --no-merges --name-only --format= <本卡起点>..HEAD | sort -u` 全部落在本卡“允许修改”内
- **验证命令**：
```bash
npx vitest run src/lib/__tests__/lane-d/jsonld.test.ts
npx playwright test -c tests/e2e/playwright.config.ts tests/e2e/d-jsonld.spec.ts
npm run test:visual
```
- **允许修改**：
  - src/app/(web)/articles/[id]/**
  - src/lib/__tests__/lane-d/**
  - tests/e2e/d-*.spec.ts
  - docs/design/06_validation/evidence/W1-D/**
- **升级/熔断**：前台冻结文件改动后 visual 变化 → 回退，改为在 layout 之外注入；同一卡连续 2 次独立验收 FAIL → 停止改代码，写失败分析交用户裁决
- **证据目录**：`docs/design/06_validation/evidence/W1-D/D-15/`

## Wave 1 结束条件（你这一侧）

- B、C、D 全部卡的验证报告为 PASS（UNKNOWN 仅限 Coze/微信/SMTP 无凭证联调、无 docker、Playwright 依赖装不上，并写明原因），已提交进 `evidence/W1-B/`、`evidence/W1-C/`、`evidence/W1-D/`。
- `lane/backend` 已推送；越界检查通过；GATE、visual 46/46、e2e 全绿；`git ls-files uploads` 为 0；知识库上传 PDF/图片 400 用例在列且通过。

## 阶段 2：Wave 2（X 主持，你负责依赖、守卫脚本、性能与终审验证）

1. 等 X 完成 W2-01 并推送合并后的 upgrade：`git fetch && git checkout -b w2/backend origin/upgrade`。
2. 按顺序做 W2-03 → W2-09 → W2-04（卡见下），每张完成推送 `w2/backend` 并向 X 发验证请求；X 验证 PASS 后由 X 合并。
3. W2-07：X 完成 W2-06 后，你在新的干净克隆上对 `bb2c0e5..upgrade` 做独立终审（按“独立验证者职责”），额外检查：前台 `git diff origin/main -- src/components/web 'src/app/(web)' public` 只含四类已登记差异；parity-matrix missing+partial = 0 或逐条有理由；MUST 14 条有结论。结论写成《验证报告》交用户转给 X，标题 `W2 final-verify`。

### Wave 2 任务卡（你负责的部分）

#### W2-03　依赖归类与安全收口：@types/nodemailer 移 devDeps、处置 npm audit critical/high（next、vitest 等直接依赖），一次改 lock

- **工作包 / 切片**：WP2.3 依赖收口　/　S-W 集成
- **来源需求**：P15 目标 3；P07 #6
- **目标**：删除 @radix-ui/react-dialog、@radix-ui/react-label；@types/nodemailer 移入 devDependencies；react-hook-form/@hookform/resolvers 按 D9 裁决处理（默认保留）
- **输入**：A-06 结果；C-ops §4 依赖表；V0.4：@radix-ui 两包已在 827646b 移除，lock 中残留条目来自 prisma studio 间接依赖，不属本项目；V0.6（DR-20 / L-8）：@radix-ui 已无直接依赖；2026-10-16 `npm audit` = critical 3 / high 11，其中 next 16.2.1、vitest 为直接依赖
- **依赖**：W2-01　**档位**：opus（升级 Next 有回归风险，需评估）　**规模**：中（1 天）（计划 1.0 人天）
- **输出（新增/修改）**：
  - package.json
  - package-lock.json
- **执行步骤**：
  1. `npm audit --json > docs/design/06_validation/evidence/W2/audit-before.json`
  2. 逐条：有补丁版本 → 升到最小修复版本（next 只升补丁号，不跨小版本）；无修复或升级破坏门禁 → 写不可修理由与缓解
  3. @types/nodemailer 移 devDependencies；D9=删除时才删 ApplyForm
  4. 全量 GATE + visual + Linux e2e
  5. `npm audit --json > .../audit-after.json`
  6. 跑本卡验证命令与通用门禁，把命令、exit code、关键输出写入证据目录
  7. 提交：`git commit -m "<feat|fix|test|docs>(W2-03): <摘要>"`（只含允许路径）
- **验收标准**（全部满足；最后两条对每张卡都适用）：
  - `node -e "process.exit(require('./package.json').dependencies['@types/nodemailer']?1:0)"` exit 0
  - audit-after：critical = 0，或每条残留 critical 都有 K10 裁决记录（next 修复需 16.4.2、vitest 需 5.x，均超出“只升补丁号”默认）
  - GATE、e2e 8/8、visual 满足 V0.6 口径
  - 通用门禁 `npm run lint && npm run typecheck && npm test && npm run build` 全部 exit 0
  - `git log --first-parent --no-merges --name-only --format= <本卡起点>..HEAD | sort -u` 全部落在本卡“允许修改”内
- **验证命令**：
```bash
npm run lint && npm run typecheck && npm test && npm run build
npm run test:visual
```
- **允许修改**：
  - package.json
  - package-lock.json
  - src/components/web/ApplyForm.tsx（仅当 D9=删除）
  - docs/design/06_validation/evidence/W2/**
- **假设**：BLOCKING K10：是否允许 next 升小版本（16.2→16.4）与 vitest 升主版本；未裁决前只做补丁号升级并记录残留
- **升级/熔断**：—；同一卡连续 2 次独立验收 FAIL → 停止改代码，写失败分析交用户裁决
- **证据目录**：`docs/design/06_validation/evidence/W2/W2-03/`

#### W2-09　check-assets + check-root + 删除 .tmp-pa.html + 接入 npm run check

- **工作包 / 切片**：WP2.2 守卫建设（Guard，不与实现并行）　/　S-W 集成
- **来源需求**：P15 目标 1/3；规划总指令 §9.4（根目录污染检查）
- **目标**：源码、Setting 默认值、DB 内容中的 /images/*、/uploads/* 引用全部存在（含 public/uploads 来源）；根目录白名单守卫；package.json 仅改 scripts 字段
- **输入**：C-ops §4（14 个根文件、两份 playwright 配置）
- **依赖**：W2-03　**档位**：sonnect（脚本）　**规模**：中（0.75 天）（计划 0.75 人天）
- **输出（新增/修改）**：
  - scripts/check-assets.mjs
  - scripts/check-root.mjs
  - .tmp-pa.html（删除）
  - package.json（仅 scripts.check / scripts.check:assets / scripts.check:root）
- **执行步骤**：
  1. DB 扫描用临时库或 DATABASE_URL
  2. 跑本卡验证命令与通用门禁，把命令、exit code、关键输出写入证据目录
  3. 提交：`git commit -m "<feat|fix|test|docs>(W2-09): <摘要>"`（只含允许路径）
- **验收标准**（全部满足；最后两条对每张卡都适用）：
  - `node scripts/check-assets.mjs && node scripts/check-root.mjs && test ! -e .tmp-pa.html`
  - 本卡提交中 package-lock.json 无变化
  - 通用门禁 `npm run lint && npm run typecheck && npm test && npm run build` 全部 exit 0
  - `git log --first-parent --no-merges --name-only --format= <本卡起点>..HEAD | sort -u` 全部落在本卡“允许修改”内
- **验证命令**：
```bash
node scripts/check-assets.mjs && node scripts/check-root.mjs
npm run lint && npm run typecheck && npm test && npm run build
```
- **允许修改**：
  - scripts/**
  - .tmp-pa.html
  - package.json（仅 scripts 字段）
  - docs/design/06_validation/evidence/W2/**
- **升级/熔断**：发现 main 视觉依赖文件缺失 → 从 origin/main 恢复（属前台资源，需在证据列明），不得用占位图；同一卡连续 2 次独立验收 FAIL → 停止改代码，写失败分析交用户裁决
- **证据目录**：`docs/design/06_validation/evidence/W2/W2-09/`

#### W2-04　after.json 复测与目标判定（Y 在 w2/backend 执行，X 验证后合并）

- **工作包 / 切片**：WP2.4 性能复测　/　S-W 集成
- **来源需求**：P10 目标；§11 基线
- **目标**：/manager JS gzip ≤ before ×0.6 或证据说明差距来源与下一步；npm start Ready ≤10s；首页热 TTFB ≤ before ×1.1
- **输入**：D-01 before.json
- **依赖**：W2-03　**档位**：sonnect（测量）　**规模**：小（0.5 天）（计划 0.5 人天）
- **输出（新增/修改）**：
  - docs/design/06_validation/evidence/W2/after.json
  - docs/design/06_validation/evidence/W2/perf-compare.md
- **执行步骤**：
  1. 同环境测三次取中位数
  2. 跑本卡验证命令与通用门禁，把命令、exit code、关键输出写入证据目录
  3. 提交：`git commit -m "<feat|fix|test|docs>(W2-04): <摘要>"`（只含允许路径）
- **验收标准**（全部满足；最后两条对每张卡都适用）：
  - perf-compare.md 每项给出 PASS/FAIL 与数字
  - 通用门禁 `npm run lint && npm run typecheck && npm test && npm run build` 全部 exit 0
  - `git log --first-parent --no-merges --name-only --format= <本卡起点>..HEAD | sort -u` 全部落在本卡“允许修改”内
- **验证命令**：
```bash
node scripts/measure-baseline.mjs --out docs/design/06_validation/evidence/W2/after.json
```
- **允许修改**：
  - docs/design/06_validation/evidence/W2/**
  - src/app/manager/**（仅 import 方式，需 E 线负责人确认）
- **升级/熔断**：/manager 未达 -40% → opus 判定是否下调目标（须用户批准）；同一卡连续 2 次独立验收 FAIL → 停止改代码，写失败分析交用户裁决
- **证据目录**：`docs/design/06_validation/evidence/W2/W2-04/`

## 独立验证者职责（验证对方时切换到这个角色；用新的干净克隆，不在自己的工作目录里验证）

### 角色

你是独立验证者。你只看两样东西：**代码差异**（`git diff <起点>..<终点>`）与**你自己跑出来的命令结果**。执行者的汇报、自述、截图说明一律不作为证据。你不改业务代码，不写长篇解释；每条验收只输出 PASS / FAIL / UNKNOWN 与一行依据。

### 输入（来自对方的《验证请求》）

- 仓库与分支：`https://github.com/CodingHeader/HDwebsite`，分支 `<lane 分支或 upgrade>`
- 起点..终点 commit
- 要验收的任务卡：规划包 `tasks/<卡号>.md`（只以卡内“验收标准”“验证命令”“允许修改”为准）

### 步骤

```bash
git clone https://github.com/CodingHeader/HDwebsite.git hd-verify && cd hd-verify
git fetch --all --tags && git checkout <终点 commit>
npm ci && npx prisma generate
# 本地 .env.local 只放一次性随机 JWT_SECRET（≥32 位），验证结束删除
```

1. **路径检查（先做，失败即整卡 FAIL）**：`git log --first-parent --no-merges --name-only --format= <起点>..<终点> | sort -u` 列出的每个文件都必须匹配卡的“允许修改”（只看该线自己的非合并提交；合并进来的已批准 CCR 不计入）；并且不得出现 `src/contracts/**`、`prisma/schema.prisma`、`prisma/migrations/**`、`package.json`、`package-lock.json`（Wave 0 与 W2-03/W2-09 除外）。
2. **密钥扫描**：`git diff <起点>..<终点> | grep -nE "sk-[A-Za-z0-9]{20,}|ghp_[A-Za-z0-9]{20,}|github_pat_|-----BEGIN [A-Z ]*PRIVATE KEY"` 必须为空；diff 中不得出现 `.env`、`*.db`、`backups/`、`data/`。
3. **逐条执行卡内验证命令**，记录 exit code 与关键输出行（不超过 3 行）。
4. **回归**：`npm run lint && npm run typecheck && npm test && npm run build`；diff 触及前台引用文件（`src/app/(web)/**`、`src/components/web/**`、`src/components/ui/**`、`public/**`、`globals.css`）→ `npm run test:visual` 必须 46/46；触及页面或 `src/app/api/**` → `npm run test:e2e`。
5. **抽查反例**（至少 2 条，自己设计）：例如未登录访问新端点应 401、非超管操作应 403、上传 `.pdf` 应 400、改一个后台字段后前台 5 秒内可见。
6. 结束后：`git status` 必须干净；删除 `.env.local` 与临时库。

### 判定规则

- PASS：命令 exit 0 且输出满足条目。
- FAIL：命令非 0、输出不满足、路径越界、出现密钥、或卡内验收无法执行而执行者未说明。
- UNKNOWN：仅限客观无法执行（无凭证的真实联调、机器无 docker、Playwright 系统依赖装不上），必须写明原因；UNKNOWN 不等于 PASS。
- 整卡结论：任一 FAIL → FAIL；无 FAIL 且有 UNKNOWN → “PASS（含 UNKNOWN 项 n 条）”，由用户决定是否放行。

### 输出（写入 `docs/design/06_validation/evidence/<目录>/<卡号>-verify.md`，或作为《验证报告》文本交用户转回）

```text
<卡号> 独立验证  起点..终点：<a>..<b>  时间：<UTC+8>
结论：PASS | FAIL | PASS（含 UNKNOWN n 条）
| # | 验收条目 | 命令 | exit | 结果 | 依据（≤1 行） |
路径检查：PASS/FAIL（越界文件列表）
密钥扫描：PASS/FAIL
回归：lint/typecheck/test/build/visual/e2e 各自结果
反例抽查：2 条及结果
```

### 安全铁律

不在任何输出中写出 token、密码、API key 的值；不推送；不修改远端。


**你验证 X 时额外关注**：`src/components/ui/{button,input,textarea,label}.tsx` 的 `git diff --stat w1-base` 必须为空；页面层原生控件严格正则 `<(table|input|select|button|textarea)\b` 在 `src/app/manager/**` 命中数只降不升；`/manager` 首屏 JS gzip 相对 w1-base 增长 ≤ 2%；现有 data-testid 与 `getByRole("button",{name:"试抓"})` 等 E2E 选择器未改即通过。A-07 检查点验证范围是 `w1-base..lane/ui`，PASS 后 X 才打 `w1-ui-kit`。

## 通用纪律

- 仓库 `https://github.com/CodingHeader/HDwebsite`，前台视觉标准 = `origin/main@94dbbbb`（红色横幅轮播）。改动任何被前台引用的文件后必须跑 `npm run test:visual` 且 46/46。
- 先读 `AGENTS.md`（尤其 §3 前台风格冻结、§5 禁止事项），再读本线任务卡；Next.js 16 有破坏性变更，写代码前读 `node_modules/next/dist/docs/` 对应章节。
- **冻结面（Wave 1 全程只读）**：`src/contracts/**`、`prisma/schema.prisma` 与迁移、`package.json` 依赖段与锁文件、`vitest.config.ts`、全部 playwright 配置、其他线拥有的文件。需要改 → 停止该子项，写《契约变更请求》（`11-验收与审查规程.md` §4），继续做不受影响的卡。
- 小而聚焦的提交，信息前缀 `feat(<卡号>)` / `fix(<卡号>)` / `test(<卡号>)` / `docs(<卡号>)`；不改全局 git config。
- 每张卡结束必跑：`npm run lint && npm run typecheck && npm test && npm run build`（全部 exit 0）。
- 熔断：同一卡连续 2 次独立验收 FAIL → 停止改代码，写失败分析，交用户裁决。
- 环境：node 22 可用（engines >=24 的警告可忽略）；Playwright 缺系统库时 `sudo npx playwright install-deps chromium`，装不上就把相关验收记为 UNKNOWN，绝不记 PASS。本地需 `.env.local`（`JWT_SECRET` ≥32 位随机串，参照 `.env.example`）。

## 开工前的深度分析（必须写进证据目录的 `analysis.md`，每个工作包一次）

1. **5W1H 发散**：What（本卡要求什么、代码已有什么、缺什么、哪些只是别人声明未被证明）；Why（直接原因与根因，只改表面会留下什么）；Where/When（文件:行、执行阶段、必须先于/后于哪些卡）；Who（本线负责什么、哪些要别的线或集成者配合）；How（定位→方案→实现→验证→证据）；What if（配置缺失、依赖不可用、字段变化、端口占用、他线未完成、测试过但运行失败、前提不成立时怎么办）。
2. **苏格拉底追问**：每个重要结论回答——凭什么？证据是否来自 `w1-base` 之后的真实代码？有无反证？是否把现象当根因？漏了哪些异常路径？前提不成立还成立吗？还要跑什么命令确认？
3. **双向钢人论证**：为关键方案写最强支持理由与最强反对理由，标明哪些反对已被证据排除、哪些仍成立、哪些转交后续卡。
4. **终稿**：结论 + 代码证据 + 命令证据 + 前提 + 局限 + 未验证项 + 风险 + 下一步；无法确认的写 `已确认 / 部分确认 / 证据不足 / 待其他员工完成 / 存在缺陷 / 需要返工 / 暂不执行` 之一。
禁止根据猜测补全关键事实；禁止“最佳实践”“行业惯例”代替本项目证据；禁止“绝对正确”“一定成功”。

## 安全铁律（不可违反）

1. 不在聊天、日志、文件名、计划、证据、提交信息中明文出现私钥、token、密码、API key 的值；提到时只写“推送凭据”“访问令牌”等泛称。
2. **推送凭据由用户在本机配置**（credential helper 或权限 600 的 `~/.git-credentials`）；你不接触、不搜索、不打印凭据，也不要求用户把凭据发给你。没有可用凭据就不推送，在汇报里写明。推送后若使用了临时凭据文件立即删除；remote URL 不得含凭据：`git remote get-url origin | grep -qE 'https://[^/]*@' && echo 含凭据 || echo 干净`（SSH 地址 git@github.com 属正常）。
3. 不提交 `.env*`、`prisma/*.db`、`backups/`、`data/`、运行时上传、任何密钥；本地 `.env.local` 只放测试用随机值。
4. 不读取、不迁移凭据类文件（如 main 的 `website_error/.token.txt`）。

## 汇报格式

```text
Y / <W0|段 B|C|D|W2> / <工作包> 汇报
- 起点..终点：<commit>..<commit>（分支 upgrade / lane/backend / w2/backend）
- 完成的卡：<卡号>
- 逐条验收：| 卡号 | 验收条目 | 命令 | exit | 自测结果 | 证据路径 |
- 越界检查：是/否（否则列出文件）
- 契约变更请求：<编号或“无”>
- 未验证项与原因（Coze/微信/SMTP/docker 等）：
- 给 X 或用户的事项：
```
汇报只写可复现事实；PASS 由验证者给出，不由你自己宣布。
