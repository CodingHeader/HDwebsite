# P1 完整提示词：契约与 API 平台线（Wave 0 续跑 → B API 与响应平台）

> V0.6（2026-10-16，基线 upgrade@fb82885 / tag w1-base=0cb699b）Hark + 3 Agent 并行模式。本文件可单独下发，自带全部任务卡全文、所有权、验收与验证规程；规划包 `tasks/*.md` 是同一份数据的分卡版本。与真实代码冲突时以命令结果为准并停止汇报。

## 角色与使命

你是 **P1**：
1. **Wave 0.6 契约员**：W0-10（CCR-1：补冻结 V0.3 G 系列 DTO、扁平客服风控键、quietHours 范围）。W0-01~09 已完成，只读参考。
2. **B 线**（`lane/b-api-platform`）：旁路路由收口 withApi、限流 429/503、settings 拆分、PublishChannel、通知静默时段、公众号发布闭环（B-07 新卡）。
3. **CCR 落地人**；B 完成后担任 **Hark 的 A/E 线验证者** 与 **P2 的 C 线验证者**。

**三条底线**：前台视觉与 `origin/main@94dbbbb` 逐像素一致（V0.6 口径：W0-13 前失败集 ⊆ {courses@375}，W0-13 后目标 46/46；375 档 667 宽属 main 原样）；`src/components/ui/{button,input,textarea,label}.tsx` className 一字不改；36 个现有管理页在迁移前不因组件改动而坏。

## 项目事实快照（V0.6 校准：2026-10-16 13:2x 已 `git fetch`；开工后以你自己的命令结果为准）

- 仓库：`https://github.com/CodingHeader/HDwebsite`（公开）。前台视觉标准 = `origin/main@94dbbbb`。
- 远端 `origin/upgrade` = **`fb82885`**（2026-10-16 12:17 +08，docs-only：V0.5 规划包入库）；tag **`w1-base` = `0cb699b`**（W0-08 判 PASS）；`origin/w0/staging` = `0cc257d`。`w1-base..fb82885` 只改 `docs/`（328 个文件），冻结面未动。尚无任何 `lane/*` 远端分支 → Wave 1 未开工。
- Wave 0 实况（V0.6 独立复核，`evidence/V0.6-W0交付独立核验.md`）：W0-01/02/03/04/06 PASS；**W0-05 部分**（V0.3 G 系列 DTO 未冻结）、**W0-07 部分**（无 `tests/a11y/playwright.config.ts`、e2e 生产 env 未预置）、**W0-09 部分**（wechat 守卫正则把 `|` 转义，守卫失效）、**W0-R0 部分**（未改 storageState、AGENTS.md 无“禁止跨线大提交”）→ 由 W0-10/W0-11/W0-12 补齐，W0-13 打 `w1-base-ccr-1`。
- 门禁实测（Hark 沙箱，fb82885，Node 22.23.3 / Linux arm64）：lint 0 error / 18 warning、typecheck 0、test 23 文件 303 例全过、build 通过；**e2e 8/8（1.4m）**——与 W0-08 在 Docker 的 8/8 同结论（`evidence/V0.6-fb82885-门禁.log`、`V0.6-fb82885-e2e-linux.log`）。
- visual：W0-08 记 45/46，唯一失败 courses@375。**V0.6 发现**：79b0f32 重生成了 32 张参照图，`courses-375.png` 不在其中（`git log -- tests/visual/reference/courses-375.png` 只有 c7e5409，md5 `32230fcd…`），但 reference-deviation.md:44 记为“已重新生成”——陈述与事实不符；推断当时 busy 的 outputDir 阻断了这一张 → W0-13 先补生成再判。
- 375 档参照图 14/15 张宽 667px：main 本身在 375 视口横向溢出，参照与实际一致，**不是缺陷**，不得“修”。
- 仓库内 `docs/V0.5-20261015`（108 文件，25 个乱码名、缺 37 个文件含 prompts/）与 `docs/任务规划V0.2.0`（24 个乱码名）——根因是此前 zip 未置 UTF-8 文件名标志；V0.6 以 `git am` 补丁交付并由 W0-12 修复。
- 已定裁决：D6 保留 `data.fieldErrors`；D7 `created()` code 200 / HTTP 201；D8 推送规则；D9 保留 `ApplyForm`；D16 双环境矩阵（visual@Windows 参照机、e2e@Linux 同一 SHA）；**分工**：Hark 自做 UI 核心（A、E）+ W0-13 闸门 + Wave 2 集成终审；P1=W0-10+B；P2=C；P3=W0-11/W0-12+D+W2 后端段。
- 性能基线（V0.4 实测，待 D-01 在 w1-base-ccr-1 上重测）：首页 JS gzip 227,007 B；`/manager/articles` 首屏 586,879 B（827646b，含 TipTap 静态导入）。


## 团队与协作方式（全员按这一节执行）

| | P1 契约与 API 平台 | P2 AI 与知识库 | P3 运维与性能 | Hark（UI 核心 + 集成终审） |
|---|---|---|---|---|
| Wave 0.6（CCR-1） | W0-10 契约补冻结（`w0/ccr-1`） | 只读预研 C 线（读 W0-10 草案） | W0-11 测试基建 ‖ W0-12 规划包修复（`w0/test-infra`、`w0/docs`） | **W0-13**：合并、参照图补生成、双环境门禁、独立验证、打 `w1-base-ccr-1` |
| Wave 1 | `lane/b-api-platform`：B（7 张） | `lane/c-ai-kb`：C（12 张） | `lane/d-ops`：D（15 张） | `lane/a-manager-ui`：A（8 张）‖ `lane/e-manager-pages`：E（12 张），两条流并行 |
| 被谁验证 | P3 | P1 | P2 | P1（B 完成后空闲）+ Hark 的独立子代理复核 |
| Wave 2 验证 | — | — | Hark 验后端段 | W2-01~W2-06 由 P1 验证；W2-07 终审由 P2 + Hark 独立子代理复核，用户最终确认后推送 |
| Wave 2 | 回归协助 | 回归协助 | `w2/backend`：W2-03、W2-09、W2-04 | 集成者 + 终审：W2-01、W2-02、W2-08、W2-05、W2-06、W2-07 |

计划日历工期 **24.75 天**（资源约束调度：P1 8.75 / P2 15.5 / P3 22.5 / Hark-A 24.75 / Hark-E 19.25）。关键路径（V0.6 生成）：W0-10 → W0-13 → A-01→A-03→A-04→A-07 → E-05→E-07→E-08 → A-08 → W2-01→W2-02→W2-05→W2-06→W2-07。

1. **没有实时通信**。共享物只有：git（远端分支与 tag）、本规划包、由用户转交的《验证请求》/《验证报告》。
2. Wave 0.6 的三张补丁卡各在自己的 `w0/*` 分支提交并推送（只读分支，不是 upgrade）；W0-13 由 Hark 合并进 upgrade 并打 `w1-base-ccr-1`。**W1 五条 lane 一律从 `w1-base-ccr-1` 建分支**；若已有人从 `w1-base` 开工，先 `git rebase --onto w1-base-ccr-1 w1-base <lane>`。
3. **验证请求**格式：
```text
验证请求 <执行者>/<段>/<工作包>
分支：<branch>　起点..终点：<commit>..<commit>
卡号：<列表>（验收标准与命令见各自提示词的任务卡节）
已跑：lint/typecheck/test/build（exit）、visual、e2e、本卡命令
已知 UNKNOWN：<条目与原因>
```
4. 验证者只看 diff 与命令结果，输出 PASS/FAIL/UNKNOWN；不往对方分支提交。被验证方把报告原样提交进自己证据目录。
5. 等验证时继续做依赖已满足的下一张卡。硬闸门：`w1-base-ccr-1`（W0-13）、`w1-ui-kit`（A-07，挡 E-05/E-06）、Wave 2 进入条件。
6. 同一卡连续 2 次验证 FAIL → 熔断：停止改代码，写失败分析，交用户裁决。
7. 需要改冻结面（契约、迁移、依赖、配置）→《契约变更请求》交用户；批准后由 P1 在 upgrade 最小提交并打 `w1-base-ccr-<n>`。
8. **跨线页面依赖**：E-10 依赖 C-11 的 API、E-11 依赖 C-12 的 API、E-09 依赖 B-07 的渠道状态与多渠道发布 API、E-10 的排序 API 也在 C-11——页面只按 W0-05 + W0-10（CCR-1）冻结的 DTO 开发，对方未合并时该 e2e 条目记“待其他员工完成”，W2-05 复跑。

## 阶段 0：Wave 0.6 补丁（W0-01~W0-09、W0-R0 已完成，见状态列；你只做 W0-10）

```bash
git fetch origin --tags && git checkout -b w0/ccr-1 origin/upgrade
git rev-parse origin/upgrade w1-base     # 期望 fb82885…（或其后仅 docs 的提交）与 0cb699b…；不符 → 停止汇报
```
1. 只做 **W0-10**（CCR-1 契约补冻结），完成后 `git push origin w0/ccr-1`，向 Hark 发验证请求。
2. W0-10 与 P3 的 W0-11/W0-12 文件不相交，可同时进行；三张都 PASS 后由 Hark 在 W0-13 合并并打 `w1-base-ccr-1`。
3. `w1-base-ccr-1` 出现前不得开 B 线分支。

### Wave 0 任务卡

| 序 | 卡号 | 状态 | 任务 | 依赖 | 档位 | 人天 |
|---|---|---|---|---|---|---|
| 1 | W0-01 | 已完成 | 并行编排规则落盘（AGENTS.md §4 修订、P07~P15 提示词标注被取代、计划包入库） | — | haiku | 0.0 |
| 2 | W0-02 | 已完成 | 切分 crud-resources.ts 为按域文件、拆出客户端安全的 block-defs | W0-01 | sonnect | 0.0 |
| 3 | W0-03 | 已完成 | 新增 json-field / http-client / cache-tags / storage 接口模块（默认实现=现有行为） | W0-02 | sonnect | 0.0 |
| 4 | W0-R0 | 以合并 555408c 代替变基完成主体 | 基线重校准：本地 W0-01~03 变基到 827646b、合并 block-defs 双份、复跑全量门禁并定位 crud-article e2e 失败、AGENTS.md 增加“禁止跨线大提交直进 upgrade” | W0-03 | opus | 0.0 |
| 5 | W0-04 | 已完成 | 契约②错误码与错误体冻结 + manager-fetch 透传 fieldErrors | W0-R0 | opus | 0.0 |
| 6 | W0-05 | 部分完成 | 领域契约冻结：chat SSE、kinds、kb、notify quietHours、场景绑定、采集目标库、区块注册表 DTO、kbCoze 设置键 | W0-04 | opus | 0.0 |
| 7 | W0-06 | 已完成 | 迁移 p12_knowledge_base + 回滚脚本 + 默认库种子 | W0-05 | opus | 0.0 |
| 8 | W0-07 | 部分完成 | 一次性加入 W1 全部新依赖并配置测试收集 | W0-06 | sonnect | 0.0 |
| 9 | W0-09 | 部分完成 | 跨平台测试可移植性：去掉 shell grep 依赖、修复 Windows 下临时库删除 EPERM（DEF-X-01a/b） | W0-07 | sonnect | 0.0 |
| 10 | W0-08 | 已判 PASS 并打 w1-base | Wave 0 门禁（V0.5：双环境矩阵——visual@参照机 Windows、e2e@Linux）、独立校验、打冻结标签并分发 | W0-07, W0-09 | opus | 0.0 |
| 11 | W0-10 | 待开工 | CCR-1 契约补冻结：V0.3 G 系列 DTO（渠道状态、多渠道发布、LLM 用量与排序、知识库管理扩展、knowledgeFile 更新）+ 扁平客服风控键 + quietHours 范围 | W0-08 | opus | 1.0 |

#### W0-01　〔V0.6 状态：已完成（3c45c65/da5db69）；V0.6 复核 PASS〕并行编排规则落盘（AGENTS.md §4 修订、P07~P15 提示词标注被取代、计划包入库）

- **工作包 / 切片**：WP0.1 规则与计划落盘　/　S0 治理刀
- **来源需求**：用户 2026-10-13 指令（3~5 并行）；REQ-F-013；规划总指令 §7/§8
- **目标**：仓库内规则与本规划一致：AGENTS.md 允许 W1 五段（四人）并行且写明冻结面；P07~P15 提示词文首加“已由 parallel-w1 取代”指引
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
  2. AGENTS.md §4 改为：Wave0 串行冻结 → Wave1 五段（四人）并行（所有权矩阵）→ Wave2 集成；“推送只在 Final”改为：W0 独立校验 PASS 后推送 upgrade 与 tag w1-base，各线只推自己的 lane 分支（用户 2026-10-13 裁决 D8）；执行者 2 名（D11）
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

#### W0-02　〔V0.6 状态：已完成（f72e698；555408c 合并时 block-defs 方向反转，唯一定义=src/lib/block-registry-defs.ts）；V0.6 复核 PASS〕切分 crud-resources.ts 为按域文件、拆出客户端安全的 block-defs

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

#### W0-03　〔V0.6 状态：已完成（8b56426）；V0.6 复核 PASS（四模块零调用，接线在 W1）〕新增 json-field / http-client / cache-tags / storage 接口模块（默认实现=现有行为）

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

#### W0-R0　〔V0.6 状态：以合并 555408c 代替变基完成主体；storageState 复用登录、AGENTS.md“禁止跨线大提交”未做 → 由 W0-11/W0-12 补齐〕基线重校准：本地 W0-01~03 变基到 827646b、合并 block-defs 双份、复跑全量门禁并定位 crud-article e2e 失败、AGENTS.md 增加“禁止跨线大提交直进 upgrade”

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

#### W0-04　〔V0.6 状态：已完成（e62e883）；V0.6 复核 PASS〕契约②错误码与错误体冻结 + manager-fetch 透传 fieldErrors

- **工作包 / 切片**：WP0.4 契约冻结　/　S0 治理刀
- **来源需求**：P13 目标 1；REQ-NF-001；P06 已交付 data.fieldErrors；A-ui §0.2-d
- **目标**：code 枚举 = {200,400,401,403,404,409,429,500,502,503}；api-response 提供 conflict/tooManyRequests/badGateway/serviceUnavailable；ApiHttpError 支持 409/429/502/503；400 继续使用 data.fieldErrors；created() 维持 code 200 + HTTP 201；managerFetch 抛出的 ApiError 带 fieldErrors 并按 409/429/502/503 给中文文案
- **输入**：src/contracts/common.ts:14-21,60-67；src/lib/api-response.ts；src/lib/api-handler.ts:24-33,161-169；src/lib/manager-fetch.ts:39-75；V0.4：827646b 已让 manager-fetch 透传 fieldErrors（已满足部分），本卡只补错误码枚举、409/429/502/503 文案、P2002→409、visibleTo
- **依赖**：W0-R0　**档位**：opus（冻结契约语义，影响五段（四人））　**规模**：已完成（0 天）（计划 0.0 人天）
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

#### W0-05　〔V0.6 状态：部分完成（91780cb）：V0.3 追加的 G 系列 DTO 未冻结 → 由 W0-10 补齐〕领域契约冻结：chat SSE、kinds、kb、notify quietHours、场景绑定、采集目标库、区块注册表 DTO、kbCoze 设置键

- **工作包 / 切片**：WP0.4 契约冻结　/　S0 治理刀
- **来源需求**：P09 目标；P12 目标 1/2/5/6/7；P13 目标 2；P07 #5/#7；ADR-024；ADR-025
- **目标**：五条执行线所需的全部 DTO/枚举一次性落入 src/contracts/**（zod 唯一源），之后冻结
- **输入**：B-domain §1.2/§3.2；A-ui §1.1-#5/#7；src/contracts/resources.ts:217,220,259-263,274-290；ADR-025
- **依赖**：W0-04　**档位**：opus（冻结五段（四人）共享 DTO）　**规模**：已完成（0 天）（计划 0.0 人天）
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

#### W0-06　〔V0.6 状态：已完成（d977e94）；migrate diff 为空、rollback 与 p06 逐对象一致；V0.6 复核 PASS〕迁移 p12_knowledge_base + 回滚脚本 + 默认库种子

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

#### W0-07　〔V0.6 状态：部分完成（61efd4a）：依赖与 vitest 收集已到位；a11y 配置、e2e 生产 env 预置、deps.md 未做 → 由 W0-11 补齐〕一次性加入 W1 全部新依赖并配置测试收集

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

#### W0-09　〔V0.6 状态：部分完成（0cc257d）：wechat-chat 守卫正则转义了 `|`，守卫失效；EPERM 以 try/catch 吞掉 → 由 W0-11 修正〕跨平台测试可移植性：去掉 shell grep 依赖、修复 Windows 下临时库删除 EPERM（DEF-X-01a/b）

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

#### W0-08　〔V0.6 状态：已判 PASS 并打 w1-base（0cb699b）：visual 45/46（courses@375 用户放行）、e2e 8/8（Docker；V0.6 沙箱同 SHA 复现 8/8）；courses-375.png 实际未重生成 → 由 W0-13 收口〕Wave 0 门禁（V0.5：双环境矩阵——visual@参照机 Windows、e2e@Linux）、独立校验、打冻结标签并分发

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
- **依赖**：W0-08　**档位**：opus（冻结五段（四人）共享 DTO，改错即多线返工）　**规模**：中（1 天）（计划 1.0 人天）
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

## 阶段 1：B 线

```bash
git clone https://github.com/CodingHeader/HDwebsite.git && cd HDwebsite
git fetch --all --tags
git checkout -b lane/b-api-platform w1-base-ccr-1   # 无该 tag → W0-13 未完成，停止
npm ci && npx prisma generate
cp .env.example .env.local   # 只填测试用随机 JWT_SECRET（≥32 位）；不得提交
npm run lint && npm run typecheck && npm test && npm run build   # 先确认起点全绿，否则停止并汇报
```

## 你的所有权

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

**越界检查（每次发验证请求前先跑）**：
```bash
git log --first-parent --no-merges --name-only --format= w1-base-ccr-1..HEAD | sort -u
```
每个文件都必须落在下面“你的所有权”内（执行线 B API 与响应平台）；同一张卡的提交只碰该卡“允许修改”的路径。

**执行线 B API 与响应平台 的特别规则**

- 迁移路由时**响应形状与状态码不得改变**（除 W0 已冻结的错误码语义）。每迁一个路由，先写 401/403/400/200 用例（复用 `src/lib/__tests__/api-contract/harness.ts`），迁移后用例不改即通过。
- `getSettings` 保留为 @deprecated 别名，前台 9 个文件零改动。
- 写操作后的前台失效只调用 W0 冻结的 `invalidateWebContent([WEB_TAGS.x])`，不自己实现缓存（cache-tags.ts 归 D 线）。
- B-06 需要 `notify.scan` 调用 `flushDeferred()`：`src/lib/jobs/**` 归 D 线，你只导出函数并写 CCR，单测直接调用验证。
- 全路由契约测试（tests/contract）与 ESLint 边界规则属于“守卫”，按规划总指令 §8.1 不与实现并行，放在 Wave 2（W2-02、W2-08）；你在 B-03 把协议例外清单写入 `evidence/W1-B/non-json-routes.md`，供 W2-02 使用。
- `src/lib/__tests__/w0-structure.test.ts` 在 Wave 1 归你维护（它只断言资源键“不丢”，其他线新增资源不会让它失败）。

| 序 | 卡号 | 状态 | 任务 | 依赖 | 档位 | 人天 |
|---|---|---|---|---|---|---|
| 1 | B-01 | 待开工 | settings 读取分为 getPublicSettings / getAllSettings（getSettings 保留为已弃用别名） | W0-13 | sonnect | 0.25 |
| 2 | B-02 | 待开工 | withApi 迁移 A：后台路由（users×2、roles×2、settings×3、manager-menus、wechat/accounts×2、articles/[id] 的 GET/PUT/DELETE） | B-01 | sonnect | 1.5 |
| 3 | B-04 | 待开工 | B 线自有文件改用 http-client 与 json-field（wechat、notify-gateway、auth） | B-01 | sonnect | 0.5 |
| 4 | B-03 | 待开工 | withApi 迁移 B：apply、articles 列表、auth×4、user-actions、api 根；非 JSON 例外清单 | B-02 | sonnect | 1.0 |
| 5 | B-05 | 待开工 | PublishChannel 注册表（website/wechat）+ 发布后写失效 | B-04 | opus | 1.0 |
| 6 | B-06 | 待开工 | 通知：静默时段生效、去重跨进程原子化并细化键、邮件堆栈脱敏、notify-rules PATCH 接收 quietHours | B-04 | sonnect | 1.0 |
| 7 | B-07 | 待开工 | 公众号图文发布闭环：正文外链图转存微信（uploadimg）、发布结果回写 externalUrl（freepublish/get）、发布间隔 ≥60s；内容中枢后端：渠道状态 DTO 与多渠道一次发布（G1） | B-05 | sonnect | 2.0 |

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

## 独立验证者职责（验证别人时切换到这个角色；用新的干净 worktree/克隆）

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

1. **路径检查（先做，失败即整卡 FAIL）**：`git log --first-parent --no-merges --name-only --format= <起点>..<终点> | sort -u` 列出的每个文件都必须匹配卡的“允许修改”（只看该线自己的非合并提交；合并进来的 M1 `w1-ui-kit` 与已批准 CCR 不计入）；并且不得出现 `src/contracts/**`、`prisma/schema.prisma`、`prisma/migrations/**`、`package.json`、`package-lock.json`（Wave 0 与 W2-03/W2-09 除外）。
2. **密钥扫描**：`git diff <起点>..<终点> | grep -nE "sk-[A-Za-z0-9]{20,}|ghp_[A-Za-z0-9]{20,}|github_pat_|-----BEGIN [A-Z ]*PRIVATE KEY"` 必须为空；diff 中不得出现 `.env`、`*.db`、`backups/`、`data/`。
3. **逐条执行卡内验证命令**，记录 exit code 与关键输出行（不超过 3 行）。
4. **回归**：`npm run lint && npm run typecheck && npm test && npm run build`；diff 触及前台引用文件（`src/app/(web)/**`、`src/components/web/**`、`src/components/ui/**`、`public/**`、`globals.css`）→ `npm run test:visual` 满足 V0.6 视觉口径（失败集 ⊆ {courses@375}；W0-13 恢复 46/46 后必须 46/46）；触及页面或 `src/app/api/**` → `npm run test:e2e`。
5. **抽查反例**（至少 2 条，自己设计）：例如未登录访问新端点应 401、非超管操作应 403、上传 `.pdf` 应 400、改一个后台字段后前台 5 秒内可见。
6. 结束后：`git status` 必须干净；删除 `.env.local` 与临时库。

### 判定规则

- PASS：命令 exit 0 且输出满足条目。
- FAIL：命令非 0、输出不满足、路径越界、出现密钥、或卡内验收无法执行而执行者未说明。
- UNKNOWN：仅限客观无法执行（无凭证的真实联调、机器无 docker、Playwright 系统依赖装不上），必须写明原因；UNKNOWN 不等于 PASS。
- 整卡结论：任一 FAIL → FAIL；无 FAIL 且有 UNKNOWN → “PASS（含 UNKNOWN 项 n 条）”，由集成者决定是否放行。

### 输出（写入 `docs/design/06_validation/evidence/<目录>/<卡号>-verify.md`，或作为《验证报告》交用户转回）

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


## 通用纪律

- 仓库 `https://github.com/CodingHeader/HDwebsite`，前台视觉标准 = `origin/main@94dbbbb`（红色横幅轮播）。改动任何被前台引用的文件后必须跑 `npm run test:visual` 且满足 V0.6 视觉口径（失败集 ⊆ {courses@375}；W0-13 恢复 46/46 后必须 46/46）。
- 先读 `AGENTS.md`（尤其 §3 前台风格冻结、§5 禁止事项），再读本线任务卡；Next.js 16 有破坏性变更，写代码前读 `node_modules/next/dist/docs/` 对应章节。
- **冻结面（Wave 1 全程只读）**：`src/contracts/**`、`prisma/schema.prisma` 与迁移、`package.json` 依赖段与锁文件、`vitest.config.ts`、全部 playwright 配置、其他线拥有的文件。需要改 → 停止该子项，写《契约变更请求》（`11-验收与审查规程.md` §4），继续做不受影响的卡。
- 小而聚焦的提交，信息前缀 `feat(<卡号>)` / `fix(<卡号>)` / `test(<卡号>)` / `docs(<卡号>)`；不改全局 git config。
- 每张卡结束必跑：`npm run lint && npm run typecheck && npm test && npm run build`（全部 exit 0）。
- 熔断：同一卡连续 2 次独立验收 FAIL → 停止改代码，写失败分析，交用户裁决。
- 环境：node 22 可用（engines >=24 的警告可忽略）；Playwright 缺系统库时 `sudo npx playwright install-deps chromium`，装不上就把相关验收记为 UNKNOWN，绝不记 PASS。本地需 `.env.local`（`JWT_SECRET` ≥32 位随机串，参照 `.env.example`）。

## 开工前的深度分析（必须写进证据目录的 `analysis.md`，每个工作包一次）

1. **5W1H 发散**：What（本卡要求什么、代码已有什么、缺什么、哪些只是别人声明未被证明）；Why（直接原因与根因，只改表面会留下什么）；Where/When（文件:行、执行阶段、必须先于/后于哪些卡）；Who（本线负责什么、哪些要别的线或集成者配合）；How（定位→方案→实现→验证→证据）；What if（配置缺失、依赖不可用、字段变化、端口占用、他线未完成、测试过但运行失败、前提不成立时怎么办）。
2. **苏格拉底追问**：每个重要结论回答——凭什么？证据是否来自 `w1-base-ccr-1` 之后的真实代码？有无反证？是否把现象当根因？漏了哪些异常路径？前提不成立还成立吗？还要跑什么命令确认？
3. **双向钢人论证**：为关键方案写最强支持理由与最强反对理由，标明哪些反对已被证据排除、哪些仍成立、哪些转交后续卡。
4. **终稿**：结论 + 代码证据 + 命令证据 + 前提 + 局限 + 未验证项 + 风险 + 下一步；无法确认的写 `已确认 / 部分确认 / 证据不足 / 待其他员工完成 / 存在缺陷 / 需要返工 / 暂不执行` 之一。
禁止根据猜测补全关键事实；禁止“最佳实践”“行业惯例”代替本项目证据；禁止“绝对正确”“一定成功”。

## 安全铁律（不可违反）

1. 不在聊天、日志、文件名、计划、证据、提交信息中明文出现私钥、token、密码、API key 的值；提到时只写“推送凭据”“访问令牌”等泛称。
2. **推送凭据由用户在本机配置**（credential helper 或权限 600 的 `~/.git-credentials`）；你不接触、不搜索、不打印凭据，也不要求用户把凭据发给你。没有可用凭据就不推送，在汇报里写明。推送后若使用了临时凭据文件立即删除；remote URL 不得含凭据：`git remote get-url origin | grep -qE 'https://[^/]*@' && echo 含凭据 || echo 干净`（SSH 地址 git@github.com 属正常）。
3. 不提交 `.env*`、`prisma/*.db`、`backups/`、`data/`、运行时上传、任何密钥；本地 `.env.local` 只放测试用随机值。
4. 不读取、不迁移凭据类文件（如 main 的 `website_error/.token.txt`）。

## 汇报格式（每个工作包一次，同时作为验证请求附件）
```text
<P?> / <段> / <工作包> 汇报
- 起点..终点：<commit>..<commit>（分支）
- 完成的卡：<卡号>
- 逐条验收：| 卡号 | 验收条目 | 命令 | exit | 自测结果 | 证据路径 |
- 越界检查：是/否（否则列出文件）
- 契约变更请求：<编号或“无”>
- 未验证项与原因：
```
只写可复现事实；PASS 由验证者给出，不由自己宣布。
