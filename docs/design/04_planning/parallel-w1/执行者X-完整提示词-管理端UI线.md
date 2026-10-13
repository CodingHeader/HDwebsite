# 执行者 X 完整提示词：管理端 UI 线（A 组件库 → E 页面与功能 → Wave 2 集成）

> 本文件可单独下发，自带全部任务卡、所有权、验收与验证规程。规划包同目录的 `tasks/*.md` 是同一份数据的分卡版本，两者一致；若与仓库真实代码冲突，以命令结果为准并停止汇报。

## 角色与使命

你是 **执行者 X**，一人承担三个角色：
1. **Wave 0 验证者**：Y 在 upgrade 上做契约冻结时，你逐卡独立验证；W0-08 由你判 PASS，Y 才能打 `w1-base`。
2. **管理端 UI 执行者**（Wave 1）：先在 `src/components/manager/**` 建成顶级管理端设计系统（基础件、DataTable、ResourceForm 与字段件、TipTap、重写 CrudPage 并保持兼容、移除 radix 代码引用），再让 36 个管理页统一、可用、与契约一致（补齐通知规则 / 首页区块配置 / 页面模板 / 交互点 / 知识库页面，迁移 10 个特殊页，规格从契约派生，a11y 与响应式），最后修组件层 a11y。
3. **Wave 2 集成者**：合并两条线、建守卫、全量回归、文档收口、推送 upgrade、打包。

**规模**：A 线 8 张卡 + E 线 8 张卡，计划 23 人天；Wave 2 主持 6 张卡。全项目计划约 **36.5 人天**（资源约束调度）：第 0~5 天验证 W0 → 约第 5~28 天 A+E → 约第 29.5~36.5 天 Wave 2。

**你必须守住的三条底线**：前台视觉与 `origin/main@94dbbbb` 逐像素一致（visual 46/46）；`src/components/ui/{button,input,textarea,label}.tsx` 的 className 一字不改；36 个现有管理页在迁移前不因组件改动而坏（CrudPageSpec / RowAction / FieldSpec / data-testid 全部向后兼容）。

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

## 阶段 0：Wave 0 期间（你只验证，不写代码）

- 按下文“独立验证者职责”逐卡验证 Y 的 W0-01~W0-08（分支 upgrade，起点 `bb2c0e5`）。
- W0 验证额外关注：W0-02/W0-03 是否“零行为变化”（只搬迁/新增，不替换调用方）；W0-04/W0-05 的契约是否与规划包 `02-契约冻结包.md` 字段名、取值、中文文案一致；W0-06 迁移是否含 DROP / RedefineTables / `INSERT INTO "new_`，rollback 是否可逆；W0-07 依赖是否一次加齐（TipTap 8 包 ^3.22.4、mammoth、jsdom、@testing-library/react、@testing-library/dom、@axe-core/playwright）；`git diff --name-only bb2c0e5..HEAD` 不含前台路径。
- W0-08 最终判定：GATE 全绿、visual 46/46、e2e 8/8、上述各项 PASS → 给出 `W0-verify` PASS。
- 空闲时间：通读 A/E 任务卡与 `02-契约冻结包.md`、审计证据 `evidence/A-ui-审计.md`，把 A-01 的分析（5W1H）写好草稿，等 `w1-base` 出现即开工。

## 阶段 1：Wave 1 启动

```bash
git clone https://github.com/CodingHeader/HDwebsite.git && cd HDwebsite
git fetch --all --tags
git checkout -b lane/ui w1-base     # 没有 w1-base tag 说明 Wave 0 未完成，停止
npm ci && npx prisma generate
cp .env.example .env.local   # 只填测试用随机 JWT_SECRET（≥32 位）；不得提交
npm run lint && npm run typecheck && npm test && npm run build   # 先确认起点全绿，否则停止并汇报
```

必读（按顺序）：`AGENTS.md`（§2 用户裁决、§3 前台风格冻结、§5 禁止事项、§6 完成定义）→ 规划包 `00`、`02`、`07`、`11` → 本提示词全部任务卡 → 审计证据 `evidence/A-ui-审计.md`。Next.js 16 有破坏性变更，写代码前读 `node_modules/next/dist/docs/` 对应章节。

## 你的所有权（Wave 1 只能写这些路径；与 Y 零重叠，已机械校验）

**执行线 A 管理端组件库**
- `src/components/manager/**`
- `src/components/ui/dialog.tsx`
- `src/components/ui/label.tsx`
- `src/components/ui/checkbox.tsx`
- `src/components/ui/scroll-area.tsx`
- `src/components/ui/select.tsx`
- `src/components/ui/switch.tsx`
- `src/components/ui/table.tsx`
- `src/components/ui/tabs.tsx`
- `tests/e2e/a-*.spec.ts`
- `docs/design/06_validation/evidence/W1-A/**`
- `docs/design/03_solution/decisions/ADR-033-*.md`
- 排除：`src/components/manager/crud-specs.tsx`、`src/components/manager/resource-meta/**`

**执行线 E 管理端页面与功能**
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

**越界检查（每次提交验证请求前自己先跑）**：
```bash
git log --first-parent --no-merges --name-only --format= w1-base..HEAD | sort -u
```
输出的每个文件都必须落在下面“你的所有权”内（执行线 A 管理端组件库 ∪ 执行线 E 管理端页面与功能）；并且同一张卡的提交只碰该卡“允许修改”的路径（段与段之间不得混提交，例如 C 卡的提交不能改 D 段的文件）。

## 段 A：管理端组件库（7 张，A-08 放在 E 段之后）

**执行线 A 管理端组件库 的特别规则**

- `src/components/ui/{button,input,textarea,label}.tsx` 的 className **一个字都不能动**（与 origin/main 逐字一致，前台 6 个文件 + 管理端登录页在用）。新基础件放 `src/components/manager/ui/`。`ui/label.tsx` 只允许在 A-06 改为原生 `<label>` 且 className 不变。
- 设计令牌只能落在 `[data-theme="manager"]` 作用域；你不得修改 `src/app/globals.css`（需要新令牌 → 契约变更请求）。
- **向后兼容是硬约束**：`CrudPageSpec`、`RowAction`、`FieldSpec`、全部现有 `data-testid`、行操作直出按钮（现有 E2E 用 `getByRole("button",{name:"试抓"})` 定位）都要保留。（E 线在 2 人模式下排在 A-07 之后，可直接使用新组件；但兼容仍是硬约束，因为 36 个现有页面在 E-05/E-06 迁移前仍走旧 API。）
- RichTextField 必须 `next/dynamic` 懒加载；/manager 首屏包体相对 w1-base 增长 ≤ 2%。
- 你可以读 E 线分支复测，但不得写 `src/app/manager/**`、`crud-specs.tsx`、`resource-meta/**`。
- A-07 检查点（2 人模式）：A-01~A-04 完成后把 `w1-base..lane/ui` 交给 Y 独立验证；PASS 后在 `lane/ui` 打 tag `w1-ui-kit` 并推送该 tag。**不合入 upgrade**（upgrade 在 Wave 2 之前不变）。E 线就在同一分支继续，不需要 merge。

执行顺序：
| 序 | 卡号 | 任务 | 依赖 | 档位 | 人天 |
|---|---|---|---|---|---|
| 1 | A-01 | 管理端基础件（新目录，不动前台在用的 ui 文件） | W0-08 | sonnect | 2.0 |
| 2 | A-02 | DataTable：排序/筛选 chips/列显隐/密度/行选择+批量/每页条数/URL 同步/窄屏卡片 | A-01 | sonnect | 2.0 |
| 3 | A-03 | ResourceForm + 字段件（Json/Secret/Relation/Tags/Image+MediaPicker/DateTime）+ 服务端 fieldErrors 标红 | A-01 | sonnect | 2.0 |
| 4 | A-04 | CrudPage 重写为 PageHeader + DataTable + ResourceForm（25 个规格页零改文件迁移） | A-02, A-03 | sonnect | 1.0 |
| 5 | A-07 | A-07 检查点：A-01~A-04 由 Y 独立验证后在 lane/ui 打 tag w1-ui-kit（2 人模式不合入 upgrade） | A-04 | opus | 0.25 |
| 6 | A-05 | RichTextField（TipTap，动态导入）+ MarkdownField（编辑/预览） | A-03 | sonnect | 1.5 |
| 7 | A-06 | 移除 @radix-ui 的代码引用（依赖删除在 W2-03） | A-07 | sonnect | 1.0 |

工作包与验证节奏：A-01（WPA.1）完成发验证请求 → A-02+A-03 完成发一次 → A-04 完成后**发 A-07 检查点验证请求**（范围 `w1-base..lane/ui`）→ Y 判 PASS 后打并推送 tag `w1-ui-kit` → A-05、A-06 各发一次。

### 段 A 任务卡

#### A-01　管理端基础件（新目录，不动前台在用的 ui 文件）

- **工作包 / 切片**：WPA.1 设计系统基础件　/　S-A1 管理端设计系统
- **来源需求**：REQ-F-015；P07 组件清单；P05-execution:105
- **目标**：src/components/manager/ui/ 下提供 Button/IconButton/Input/Textarea/Select/Combobox/Checkbox/Switch/RadioGroup/DateTimeInput/FormField/Sheet/DropdownMenu/Tooltip/Popover/Badge/Card/Skeleton/Kbd/Separator，基于 @base-ui/react，令牌限 [data-theme=manager]；feedback/styles.ts 的 btnCls/inputCls 改为组件
- **输入**：A-ui §A.3/A.4；P02 设计系统节；src/components/manager/feedback/styles.ts
- **依赖**：W0-08　**档位**：sonnect（组件实现）　**规模**：大（2 天）（计划 2.0 人天）
- **输出（新增/修改）**：
  - src/components/manager/ui/**（新）
  - src/components/manager/feedback/styles.ts
  - src/components/manager/ui/__tests__/*.test.tsx
  - docs/design/03_solution/decisions/ADR-033-管理端设计系统.md
- **执行步骤**：
  1. 写 ADR-033（为何新建 manager/ui 而非改 ui/）
  2. 逐件实现 + jsdom 测试（键盘可达、aria、disabled/loading）
  3. styles.ts 85 处引用逐步替换（可跨 A-06~A-08 完成）
  4. 跑本卡验证命令与通用门禁，把命令、exit code、关键输出写入证据目录
  5. 提交：`git commit -m "<feat|fix|test|docs>(A-01): <摘要>"`（只含允许路径）
- **验收标准**（全部满足；最后两条对每张卡都适用）：
  - `git diff --stat w1-base -- src/components/ui/button.tsx src/components/ui/input.tsx src/components/ui/textarea.tsx src/components/ui/label.tsx` 为空
  - 组件测试全绿
  - visual 46/46
  - 通用门禁 `npm run lint && npm run typecheck && npm test && npm run build` 全部 exit 0
  - `git log --first-parent --no-merges --name-only --format= <本卡起点>..HEAD | sort -u` 全部落在本卡“允许修改”内
- **验证命令**：
```bash
npx vitest run src/components/manager/ui
npm run lint && npm run typecheck && npm test && npm run build
npm run test:visual
```
- **允许修改**：
  - src/components/manager/**（不含 crud-specs.tsx 与 resource-meta/**，归 E 线）
  - docs/design/03_solution/decisions/ADR-033-*.md
  - docs/design/06_validation/evidence/W1-A/**
- **本卡额外禁止**：
  - src/components/ui/button.tsx、input.tsx、textarea.tsx、label.tsx 的 className（前台 6 个文件 + 管理端登录页在用，与 origin/main 逐字一致）
- **升级/熔断**：base-ui 缺件 → opus 决定自实现或保留 radix 至 A-06；同一卡连续 2 次独立验收 FAIL → 停止改代码，写失败分析交用户裁决
- **证据目录**：`docs/design/06_validation/evidence/W1-A/A-01/`

#### A-02　DataTable：排序/筛选 chips/列显隐/密度/行选择+批量/每页条数/URL 同步/窄屏卡片

- **工作包 / 切片**：WPA.2 数据表格　/　S-A2 列表可排序筛选批量
- **来源需求**：REQ-F-015；P07 #1；P05-verify:39（375 溢出）
- **目标**：一个 DataTable 组件覆盖 25 个规格页与 6 个特殊页的表格需求；行操作保留直出按钮（兼容现有 e2e getByRole）
- **输入**：A-ui §1.1-#1、§1.3 E2E 选择器清单；CrudPage.tsx:53（PAGE_SIZE=10）
- **依赖**：A-01　**档位**：sonnect（组件实现）　**规模**：大（2 天）（计划 2.0 人天）
- **输出（新增/修改）**：
  - src/components/manager/DataTable.tsx
  - src/components/manager/Pagination.tsx
  - src/components/manager/feedback/TableState.tsx
  - src/components/manager/__tests__/data-table.test.tsx
- **执行步骤**：
  1. 定义列规格类型（render: text/image/badge/boolean/date/relative-time/money/link）
  2. URL 同步 ?page&limit&keyword&sort&filters
  3. <768px 切卡片视图，操作列不截断
  4. 组件测试 + 保留全部既有 data-testid
  5. 跑本卡验证命令与通用门禁，把命令、exit code、关键输出写入证据目录
  6. 提交：`git commit -m "<feat|fix|test|docs>(A-02): <摘要>"`（只含允许路径）
- **验收标准**（全部满足；最后两条对每张卡都适用）：
  - data-table.test.tsx：排序、筛选、全选/批量回调、每页 10/20/50/100
  - 375 宽无横向滚动（E-08 responsive 用例）
  - 既有 e2e 8/8 不改选择器即通过
  - 通用门禁 `npm run lint && npm run typecheck && npm test && npm run build` 全部 exit 0
  - `git log --first-parent --no-merges --name-only --format= <本卡起点>..HEAD | sort -u` 全部落在本卡“允许修改”内
- **验证命令**：
```bash
npx vitest run src/components/manager/__tests__/data-table.test.tsx
npm run lint && npm run typecheck && npm test && npm run build
npm run test:e2e
```
- **允许修改**：
  - src/components/manager/**（不含 crud-specs.tsx 与 resource-meta/**，归 E 线）
- **升级/熔断**：某特殊页无法用 DataTable 表达 → opus 仲裁允许组合基础件；同一卡连续 2 次独立验收 FAIL → 停止改代码，写失败分析交用户裁决
- **证据目录**：`docs/design/06_validation/evidence/W1-A/A-02/`

#### A-03　ResourceForm + 字段件（Json/Secret/Relation/Tags/Image+MediaPicker/DateTime）+ 服务端 fieldErrors 标红

- **工作包 / 切片**：WPA.3 表单体系　/　S-A3 表单分区与字段级错误
- **来源需求**：REQ-F-015；P07 #2；W0-04 fieldErrors
- **目标**：表单支持 sections/折叠高级设置、Ctrl/⌘+S、未保存提示、远程关联搜索、媒体库选择；后端 400 的 data.fieldErrors 逐字段 aria-invalid
- **输入**：SchemaForm.tsx:13-15,97-113,146；manager-fetch ApiError.fieldErrors（W0-04）
- **依赖**：A-01　**档位**：sonnect（组件实现）　**规模**：大（2 天）（计划 2.0 人天）
- **输出（新增/修改）**：
  - src/components/manager/ResourceForm.tsx
  - src/components/manager/fields/**
  - src/components/manager/SchemaForm.tsx（兼容层）
  - src/components/manager/__tests__/resource-form.test.tsx
  - tests/e2e/a-form-errors.spec.ts
- **执行步骤**：
  1. 字段类型扩展且 FieldSpec 向后兼容
  2. MediaPicker 用 /api/media 列表 + /api/upload
  3. fieldErrors 映射测试
  4. 跑本卡验证命令与通用门禁，把命令、exit code、关键输出写入证据目录
  5. 提交：`git commit -m "<feat|fix|test|docs>(A-03): <摘要>"`（只含允许路径）
- **验收标准**（全部满足；最后两条对每张卡都适用）：
  - resource-form.test.tsx：JsonField 非法 JSON 报错；mock 400 fieldErrors → 对应字段 aria-invalid=true
  - e2e：提交非法 slug 后字段标红（A-03 自带 e2e 用例 tests/e2e/a-form-errors.spec.ts）
  - 通用门禁 `npm run lint && npm run typecheck && npm test && npm run build` 全部 exit 0
  - `git log --first-parent --no-merges --name-only --format= <本卡起点>..HEAD | sort -u` 全部落在本卡“允许修改”内
- **验证命令**：
```bash
npx vitest run src/components/manager/__tests__/resource-form.test.tsx
npm run lint && npm run typecheck && npm test && npm run build
```
- **允许修改**：
  - src/components/manager/**（不含 crud-specs.tsx 与 resource-meta/**，归 E 线）
  - tests/e2e/a-*.spec.ts
- **升级/熔断**：—；同一卡连续 2 次独立验收 FAIL → 停止改代码，写失败分析交用户裁决
- **证据目录**：`docs/design/06_validation/evidence/W1-A/A-03/`

#### A-04　CrudPage 重写为 PageHeader + DataTable + ResourceForm（25 个规格页零改文件迁移）

- **工作包 / 切片**：WPA.4 通用资源页　/　S-A4 规格页统一
- **来源需求**：REQ-F-015；基础目标“统一风格/标准组件/完整 CRUD”
- **目标**：CrudPageSpec/RowAction 向后兼容；所有 data-testid 保留；CrudPage 内无原生 table/button/input
- **输入**：CrudPage.tsx（383 行）
- **依赖**：A-02, A-03　**档位**：sonnect（组合）　**规模**：中（1 天）（计划 1.0 人天）
- **输出（新增/修改）**：
  - src/components/manager/CrudPage.tsx
- **执行步骤**：
  1. 新实现 + 逐个打开 25 个规格页人工检查
  2. e2e 全量
  3. 跑本卡验证命令与通用门禁，把命令、exit code、关键输出写入证据目录
  4. 提交：`git commit -m "<feat|fix|test|docs>(A-04): <摘要>"`（只含允许路径）
- **验收标准**（全部满足；最后两条对每张卡都适用）：
  - `grep -cE "<(table|button|input|select|textarea)(\s|>|$)" src/components/manager/CrudPage.tsx` = 0
  - e2e 8/8
  - 通用门禁 `npm run lint && npm run typecheck && npm test && npm run build` 全部 exit 0
  - `git log --first-parent --no-merges --name-only --format= <本卡起点>..HEAD | sort -u` 全部落在本卡“允许修改”内
- **验证命令**：
```bash
npm run lint && npm run typecheck && npm test && npm run build
npm run test:e2e
```
- **允许修改**：
  - src/components/manager/**（不含 crud-specs.tsx 与 resource-meta/**，归 E 线）
- **升级/熔断**：—；同一卡连续 2 次独立验收 FAIL → 停止改代码，写失败分析交用户裁决
- **证据目录**：`docs/design/06_validation/evidence/W1-A/A-04/`

#### A-07　A-07 检查点：A-01~A-04 由 Y 独立验证后在 lane/ui 打 tag w1-ui-kit（2 人模式不合入 upgrade）

- **工作包 / 切片**：WPA.5 组件检查点　/　S-A4 规格页统一
- **来源需求**：规划总指令 §7.1（契约冻结、所有权不相交）；本规划 06-依赖DAG与并行判定.md §2（唯一的线间中途合并点）
- **目标**：E 线迁移特殊页（E-05/E-06）前，确认新组件 API 稳定且向后兼容
- **输入**：A-01~A-04 提交与证据
- **依赖**：A-04　**档位**：opus（检查点 review）　**规模**：小（<2h）（计划 0.25 人天）
- **输出（新增/修改）**：
  - git tag w1-ui-kit（打在 lane/ui 并推送该 tag）
  - docs/design/06_validation/evidence/W1-A/A-07-checkpoint-verify.md
- **执行步骤**：
  1. 推送 lane/ui，把 `w1-base..lane/ui` 作为验证请求交 Y（只看 diff 与命令结果）
  2. PASS 后 `git tag w1-ui-kit && git push origin w1-ui-kit`
  3. E-05/E-06 开工前确认 tag 存在；同一分支，无需 merge
  4. 跑本卡验证命令与通用门禁，把命令、exit code、关键输出写入证据目录
  5. 提交：`git commit -m "<feat|fix|test|docs>(A-07): <摘要>"`（只含允许路径）
- **验收标准**（全部满足；最后两条对每张卡都适用）：
  - A-07 验证报告结论 PASS（已提交进证据目录）
  - `git diff --name-only w1-base..w1-ui-kit` 全部属于 A 线所有权
  - GATE、VIS、E2E 全绿
  - 通用门禁 `npm run lint && npm run typecheck && npm test && npm run build` 全部 exit 0
  - `git log --first-parent --no-merges --name-only --format= <本卡起点>..HEAD | sort -u` 全部落在本卡“允许修改”内
- **验证命令**：
```bash
npm run lint && npm run typecheck && npm test && npm run build
npm run test:visual
npm run test:e2e
```
- **允许修改**：
  - src/components/manager/**（不含 crud-specs.tsx 与 resource-meta/**，归 E 线）
  - src/components/ui/dialog.tsx
  - src/components/ui/label.tsx
  - src/components/ui/checkbox.tsx
  - src/components/ui/scroll-area.tsx
  - src/components/ui/select.tsx
  - src/components/ui/switch.tsx
  - src/components/ui/table.tsx
  - src/components/ui/tabs.tsx
  - tests/e2e/a-*.spec.ts
  - docs/design/06_validation/evidence/W1-A/**
  - docs/design/03_solution/decisions/ADR-033-*.md
- **升级/熔断**：FAIL → 在 lane/ui 修复后重发验证请求；E-05/E-06 顺延，E-01~E-04 不受影响；同一卡连续 2 次独立验收 FAIL → 停止改代码，写失败分析交用户裁决
- **证据目录**：`docs/design/06_validation/evidence/W1-A/A-07/`

#### A-05　RichTextField（TipTap，动态导入）+ MarkdownField（编辑/预览）

- **工作包 / 切片**：WPA.3 表单体系　/　S-A5 富文本恢复
- **来源需求**：REQ-F-013 parity C6；REQ-NF-001（包体）
- **目标**：富文本恢复为 TipTap，提交前 sanitizeRichContent；RichTextField 用 next/dynamic 懒加载，/manager 首屏包体不因 TipTap 增长（相对 w1-base 测量 ≤ +2%）
- **输入**：origin/main components/manager/RichTextField.tsx、fields/RichTextEditor.tsx；src/lib/markdown.ts:59
- **依赖**：A-03　**档位**：sonnect（移植）　**规模**：中（1.5 天）（计划 1.5 人天）
- **输出（新增/修改）**：
  - src/components/manager/fields/RichTextField.tsx
  - src/components/manager/fields/MarkdownField.tsx
- **执行步骤**：
  1. 移植 main 的编辑器工具栏（标题/加粗/斜体/下划线/列表/对齐/链接/图片走媒体库）
  2. next/dynamic(ssr:false) 包装
  3. Markdown 预览复用 MarkdownRenderer（只 import，不改前台文件）
  4. 跑本卡验证命令与通用门禁，把命令、exit code、关键输出写入证据目录
  5. 提交：`git commit -m "<feat|fix|test|docs>(A-05): <摘要>"`（只含允许路径）
- **验收标准**（全部满足；最后两条对每张卡都适用）：
  - `grep -rn "next/dynamic" src/components/manager/fields/RichTextField.tsx` 命中
  - e2e a-richtext.spec.ts：插入 <script> 保存后前台详情页不含 script 标签
  - /manager JS gzip 相对 w1-base ≤ +2%（scripts/measure-baseline.mjs 由 D 线提供，W2-04 复核）
  - 通用门禁 `npm run lint && npm run typecheck && npm test && npm run build` 全部 exit 0
  - `git log --first-parent --no-merges --name-only --format= <本卡起点>..HEAD | sort -u` 全部落在本卡“允许修改”内
- **验证命令**：
```bash
npx playwright test -c tests/e2e/playwright.config.ts tests/e2e/a-richtext.spec.ts
npm run lint && npm run typecheck && npm test && npm run build
```
- **允许修改**：
  - src/components/manager/**（不含 crud-specs.tsx 与 resource-meta/**，归 E 线）
  - tests/e2e/a-*.spec.ts
- **升级/熔断**：TipTap 与 React19 运行时报错两次 → 上报，不降级为 textarea；同一卡连续 2 次独立验收 FAIL → 停止改代码，写失败分析交用户裁决
- **证据目录**：`docs/design/06_validation/evidence/W1-A/A-05/`

#### A-06　移除 @radix-ui 的代码引用（依赖删除在 W2-03）

- **工作包 / 切片**：WPA.6 依赖收敛与质量　/　S-A1 管理端设计系统
- **来源需求**：P07 #6（radix 实际 7 处在用）
- **目标**：FormDialog/DetailDialog/ConfirmDialog/AppShell/CommandPalette 改用 base-ui；ui/dialog.tsx 删除（零引用）；ui/label.tsx 改为原生 <label> 且 className 不变
- **输入**：A-ui §1.1-#6
- **依赖**：A-07　**档位**：sonnect（替换）　**规模**：中（1 天）（计划 1.0 人天）
- **输出（新增/修改）**：
  - 上述 7 个文件
- **执行步骤**：
  1. 逐个替换并保留焦点陷阱/Esc/aria
  2. ui/label.tsx 渲染结果 HTML 对比（class 不变）
  3. 跑本卡验证命令与通用门禁，把命令、exit code、关键输出写入证据目录
  4. 提交：`git commit -m "<feat|fix|test|docs>(A-06): <摘要>"`（只含允许路径）
- **验收标准**（全部满足；最后两条对每张卡都适用）：
  - `grep -rn "@radix-ui" src` 为空
  - visual 46/46（前台 ApplyForm 引用 label，外观不变）
  - e2e 8/8
  - 通用门禁 `npm run lint && npm run typecheck && npm test && npm run build` 全部 exit 0
  - `git log --first-parent --no-merges --name-only --format= <本卡起点>..HEAD | sort -u` 全部落在本卡“允许修改”内
- **验证命令**：
```bash
grep -rn '@radix-ui' src && exit 1 || echo ok
npm run test:visual
npm run test:e2e
```
- **允许修改**：
  - src/components/manager/**（不含 crud-specs.tsx 与 resource-meta/**，归 E 线）
  - src/components/ui/dialog.tsx
  - src/components/ui/label.tsx
- **升级/熔断**：焦点管理回归两次 → opus；同一卡连续 2 次独立验收 FAIL → 停止改代码，写失败分析交用户裁决
- **证据目录**：`docs/design/06_validation/evidence/W1-A/A-06/`

## 段 E：管理端页面与功能（8 张）+ A-08

**执行线 E 管理端页面与功能 的特别规则**

- 2 人模式下 E 线全部排在 A-07 检查点之后：E-01~E-04 可以直接使用新组件（DataTable、ResourceForm、新 CrudPage），也可以沿用旧 API——两者都兼容。
- E-05/E-06 开工条件：tag `w1-ui-kit` 已存在（A-07 检查点 PASS）。同一分支，无需 merge。页面层不得写原生 `<table|input|select|button|textarea>`（验收用严格正则）。
- 新增菜单只改 `prisma/seed.ts` 的菜单段，必须幂等（连跑两次不重复）。
- E-04 知识库页按 `02-契约冻结包.md` 的端点与 schema 开发；C 线端点未合并前用组件测试 mock，e2e 写好、在 W2-05 跑。
- E-08 只修页面层问题；组件层问题写入 `evidence/W1-E/a11y-report.md` 的“交 A-08”清单（规则 id、页面、选择器），不得越界修改组件。
- 现有 4 个 E2E spec（crud-article、collect-publish、auth、apply-chat）归你维护；新增用例文件名以 `e-` 开头。

执行顺序：
| 序 | 卡号 | 任务 | 依赖 | 档位 | 人天 |
|---|---|---|---|---|---|
| 1 | E-01 | 表单规格对齐冻结契约（承接项小修）+ 规格漂移护栏测试 | W0-08 | sonnect | 1.0 |
| 2 | E-02 | 通知规则页 + 菜单（含静默时段） | W0-08 | sonnect | 0.75 |
| 3 | E-03 | ADR-024 三页：首页区块配置、页面模板、交互点配置 + 注册表/恢复默认端点 + 3 条菜单 | W0-08 | sonnect | 2.0 |
| 4 | E-04 | 知识库管理页（库列表/详情/文件拖拽上传/进度/条目/检索测试）+ AI 场景表单分区 + 菜单 | W0-08 | sonnect | 2.0 |
| 5 | E-05 | 特殊页迁移 A：articles（接 PATCH 一键上下线）、publish-jobs、collect-items、content-hub | A-07 | sonnect | 2.0 |
| 6 | E-06 | 特殊页迁移 B：llm-providers、wechat-accounts、media（改名+批量接口）、chat-history、settings、仪表盘、login、logs 筛选、not-found | A-07 | sonnect | 2.0 |
| 7 | E-07 | 管理端规格从契约派生（resource-meta + derive），crud-specs ≤ 200 行 | E-05, E-06, E-03 | sonnect | 1.5 |
| 8 | E-08 | a11y 扫描、管理端响应式（375/768/1440）与组件 E2E | E-07 | opus | 1.0 |
| 9 | A-08 | 组件层 a11y/响应式修复（响应 E-08 的“交 A-08”清单） | A-06, E-08 | sonnect | 1.0 |

工作包与验证节奏：E-01（护栏）→ E-02+E-03+E-04（缺失管理页，可分三次发）→ E-05+E-06（特殊页迁移，需 `w1-ui-kit`）→ E-07（规格单源）→ E-08（质量门，产出“交 A-08”清单）→ A-08（修组件层问题，关闭清单）。

### 段 E 任务卡

#### E-01　表单规格对齐冻结契约（承接项小修）+ 规格漂移护栏测试

- **工作包 / 切片**：WPE.1 契约对齐与护栏　/　S-E1 表单与契约一致
- **来源需求**：REQ-F-015；P06-execution:109；P06-verify:92；P08 #2（真实漂移 11 资源）
- **目标**：content-items 状态只剩 draft/pending_review/offline 且有“提交审核/审核”行操作；collect-sources 有 autoToKb、autoApprove（仅超管可见可改）、cron 留空=仅手动提示、knowledgeBaseId 选择；chat-scenes 有专属模型/优先级/参数/知识库；11 个资源缺失字段补齐或在白名单写明有意省略
- **输入**：A-ui §1.3、§3；src/components/manager/crud-specs.tsx；W0-05 契约
- **依赖**：W0-08　**档位**：sonnect（规格修补）　**规模**：中（1 天）（计划 1.0 人天）
- **输出（新增/修改）**：
  - src/components/manager/crud-specs.tsx
  - src/app/manager/{content-hub,publish-jobs}/page.tsx
  - src/components/manager/resource-meta/__tests__/spec-drift.test.ts
- **执行步骤**：
  1. 先写 spec-drift.test.ts（读取契约 schema 的 shape 与 enum.options 和 crud-specs 比对）→ 记录失败
  2. 逐资源补字段/改枚举，直到只剩白名单
  3. publish-jobs 去掉 limit=100 回填
  4. chat-scenes 的知识库与模型优先级改为多选，提交 int 数组（契约接受数组或 JSON 串）
  5. 跑本卡验证命令与通用门禁，把命令、exit code、关键输出写入证据目录
  6. 提交：`git commit -m "<feat|fix|test|docs>(E-01): <摘要>"`（只含允许路径）
- **验收标准**（全部满足；最后两条对每张卡都适用）：
  - spec-drift.test.ts 通过且白名单每项附理由
  - e2e collect-publish 通过
  - 非超管登录看不到 autoApprove 字段（e2e 或组件测试）
  - 通用门禁 `npm run lint && npm run typecheck && npm test && npm run build` 全部 exit 0
  - `git log --first-parent --no-merges --name-only --format= <本卡起点>..HEAD | sort -u` 全部落在本卡“允许修改”内
- **验证命令**：
```bash
npx vitest run src/components/manager/resource-meta/__tests__/spec-drift.test.ts
npm run lint && npm run typecheck && npm test && npm run build
npm run test:e2e
```
- **允许修改**：
  - src/components/manager/crud-specs.tsx
  - src/components/manager/resource-meta/**
  - src/app/manager/**
- **升级/熔断**：会话中拿不到 isSuper → opus 判断是否需契约变更请求；同一卡连续 2 次独立验收 FAIL → 停止改代码，写失败分析交用户裁决
- **证据目录**：`docs/design/06_validation/evidence/W1-E/E-01/`

#### E-02　通知规则页 + 菜单（含静默时段）

- **工作包 / 切片**：WPE.2 缺失管理页　/　S-E2 通知规则可配置
- **来源需求**：REQ-F-011；I8；P07 #5；W0-05 quietHours
- **目标**：/manager/notify-rules 可查看 7 类事件规则，编辑启用/模板/收件人分组/静默时段并保存回读一致
- **输入**：api/notify-rules（GET withApi、PATCH）；seed.ts:164-172
- **依赖**：W0-08　**档位**：sonnect（页面）　**规模**：中（0.75 天）（计划 0.75 人天）
- **输出（新增/修改）**：
  - src/app/manager/notify-rules/page.tsx
  - prisma/seed.ts（group-notify 下新增 1 条菜单，权限 notify:list）
- **执行步骤**：
  1. 页面 + e2e e-notify-rules.spec.ts
  2. seed 菜单段幂等
  3. 跑本卡验证命令与通用门禁，把命令、exit code、关键输出写入证据目录
  4. 提交：`git commit -m "<feat|fix|test|docs>(E-02): <摘要>"`（只含允许路径）
- **验收标准**（全部满足；最后两条对每张卡都适用）：
  - e2e：切换 enabled 与 quietHours 保存后刷新回读一致
  - seed 连跑两次菜单不重复
  - 通用门禁 `npm run lint && npm run typecheck && npm test && npm run build` 全部 exit 0
  - `git log --first-parent --no-merges --name-only --format= <本卡起点>..HEAD | sort -u` 全部落在本卡“允许修改”内
- **验证命令**：
```bash
npx playwright test -c tests/e2e/playwright.config.ts tests/e2e/e-notify-rules.spec.ts
npm run lint && npm run typecheck && npm test && npm run build
```
- **允许修改**：
  - src/app/manager/**
  - prisma/seed.ts
  - tests/e2e/e-*.spec.ts
- **升级/熔断**：PATCH 不接受 quietHours（B 线未合并）→ 页面先完成，e2e 标 待其他员工完成，W2-05 复跑；同一卡连续 2 次独立验收 FAIL → 停止改代码，写失败分析交用户裁决
- **证据目录**：`docs/design/06_validation/evidence/W1-E/E-02/`

#### E-03　ADR-024 三页：首页区块配置、页面模板、交互点配置 + 注册表/恢复默认端点 + 3 条菜单

- **工作包 / 切片**：WPE.2 缺失管理页　/　S-E3 首页区块可配置
- **来源需求**：REQ-F-013 parity C9/C10；ADR-024
- **目标**：管理员可拖拽排序、启停首页区块、按 block-defs 的 fields 编辑；“恢复默认”= main 原样；禁用一个区块后前台不再渲染该 data-block，恢复默认后 visual 仍 46/46
- **输入**：src/config/block-defs.ts（W0-02）；api/{content-blocks,page-templates,template-blocks,element-configs}
- **依赖**：W0-08　**档位**：sonnect（页面+两个端点）　**规模**：大（2 天）（计划 2.0 人天）
- **输出（新增/修改）**：
  - src/app/manager/{home-blocks,page-templates,element-configs}/page.tsx
  - src/app/api/home-blocks/registry/route.ts（GET，withApi，block:list）
  - src/app/api/home-blocks/reset/route.ts（POST，withApi，block:edit）
  - prisma/seed.ts（3 条菜单）
  - tests/e2e/e-home-blocks.spec.ts
- **执行步骤**：
  1. 两个新端点用 withApi + W0 契约 blockRegistryItem/homeBlocksResetRequest
  2. 页面 + 拖拽（键盘可替代：上移/下移按钮）
  3. e2e 禁用→前台不渲染→恢复默认
  4. 跑本卡验证命令与通用门禁，把命令、exit code、关键输出写入证据目录
  5. 提交：`git commit -m "<feat|fix|test|docs>(E-03): <摘要>"`（只含允许路径）
- **验收标准**（全部满足；最后两条对每张卡都适用）：
  - e2e e-home-blocks.spec.ts 通过
  - 恢复默认后 `npm run test:visual` 46/46
  - 未登录访问 registry → 401，无 block 权限 → 403
  - 通用门禁 `npm run lint && npm run typecheck && npm test && npm run build` 全部 exit 0
  - `git log --first-parent --no-merges --name-only --format= <本卡起点>..HEAD | sort -u` 全部落在本卡“允许修改”内
- **验证命令**：
```bash
npx playwright test -c tests/e2e/playwright.config.ts tests/e2e/e-home-blocks.spec.ts
npm run test:visual
npm run lint && npm run typecheck && npm test && npm run build
```
- **允许修改**：
  - src/app/manager/**
  - src/app/api/home-blocks/**
  - prisma/seed.ts
  - tests/e2e/e-*.spec.ts
- **升级/熔断**：前台缓存（D-06）导致 5 秒内不可见 → W2 集成时由 D 线修 invalidate，E 线 e2e 加等待≤5s；同一卡连续 2 次独立验收 FAIL → 停止改代码，写失败分析交用户裁决
- **证据目录**：`docs/design/06_validation/evidence/W1-E/E-03/`

#### E-04　知识库管理页（库列表/详情/文件拖拽上传/进度/条目/检索测试）+ AI 场景表单分区 + 菜单

- **工作包 / 切片**：WPE.2 缺失管理页　/　S-E4 知识库可管理
- **来源需求**：REQ-F-007；ADR-025；M-10/M-11
- **目标**：管理员可新建/绑定 Coze 库、上传 Word/MD/TXT（PDF/图片在前端即拦截并显示后端同款中文提示）、看同步进度、做检索测试；场景表单分区：基础/模型与参数/知识库
- **输入**：W0-05 kb 契约；C 线端点（按契约开发，e2e 在 W2-05 合并后跑）
- **依赖**：W0-08　**档位**：sonnect（页面）　**规模**：大（2 天）（计划 2.0 人天）
- **输出（新增/修改）**：
  - src/app/manager/knowledge-bases/**
  - src/app/manager/knowledge/page.tsx
  - src/app/manager/chat-scenes/page.tsx
  - src/components/manager/crud-specs.tsx
  - prisma/seed.ts（知识库菜单）
  - tests/e2e/e-knowledge.spec.ts
- **执行步骤**：
  1. 按契约开发；C 线未合并前用组件测试 mock
  2. e2e 写好但标注依赖 C-06
  3. 跑本卡验证命令与通用门禁，把命令、exit code、关键输出写入证据目录
  4. 提交：`git commit -m "<feat|fix|test|docs>(E-04): <摘要>"`（只含允许路径）
- **验收标准**（全部满足；最后两条对每张卡都适用）：
  - 组件测试：选择 .pdf/.png → 不发请求并显示 KB_REJECT_MESSAGE
  - W2-05：e2e e-knowledge.spec.ts 通过（上传 .md → 条目数>0；上传 .pdf → 400 提示）
  - 通用门禁 `npm run lint && npm run typecheck && npm test && npm run build` 全部 exit 0
  - `git log --first-parent --no-merges --name-only --format= <本卡起点>..HEAD | sort -u` 全部落在本卡“允许修改”内
- **验证命令**：
```bash
npx vitest run src/components/manager
npm run lint && npm run typecheck && npm test && npm run build
```
- **允许修改**：
  - src/app/manager/**
  - src/components/manager/crud-specs.tsx
  - src/components/manager/resource-meta/**
  - prisma/seed.ts
  - tests/e2e/e-*.spec.ts
- **升级/熔断**：契约不足以完成页面 → 契约变更请求，不得自定 DTO；同一卡连续 2 次独立验收 FAIL → 停止改代码，写失败分析交用户裁决
- **证据目录**：`docs/design/06_validation/evidence/W1-E/E-04/`

#### E-05　特殊页迁移 A：articles（接 PATCH 一键上下线）、publish-jobs、collect-items、content-hub

- **工作包 / 切片**：WPE.3 特殊页迁移　/　S-E5 内容链页面统一
- **来源需求**：REQ-F-015；P03-execution:104（B3 文章 PATCH 前端未接）
- **目标**：四页只用设计系统组件；文章列表行操作“上线/下线”调用 PATCH /api/articles/[id]
- **输入**：A-ui §A.1 行数；articles/[id]/route.ts:178
- **依赖**：A-07　**档位**：sonnect（页面迁移）　**规模**：大（2 天）（计划 2.0 人天）
- **输出（新增/修改）**：
  - src/app/manager/{articles,publish-jobs,collect-items,content-hub}/page.tsx
- **执行步骤**：
  1. 逐页替换，保留 testid
  2. crud-article.spec 增加“保存后重新 GET 断言持久化”（P05-verify:41）
  3. 跑本卡验证命令与通用门禁，把命令、exit code、关键输出写入证据目录
  4. 提交：`git commit -m "<feat|fix|test|docs>(E-05): <摘要>"`（只含允许路径）
- **验收标准**（全部满足；最后两条对每张卡都适用）：
  - 严格正则 `grep -rnE "<(table|input|select|button|textarea)(\s|>|$)" src/app/manager/{articles,publish-jobs,collect-items,content-hub}` 为空
  - e2e crud-article/collect-publish 通过
  - 通用门禁 `npm run lint && npm run typecheck && npm test && npm run build` 全部 exit 0
  - `git log --first-parent --no-merges --name-only --format= <本卡起点>..HEAD | sort -u` 全部落在本卡“允许修改”内
- **验证命令**：
```bash
npm run lint && npm run typecheck && npm test && npm run build
npm run test:e2e
```
- **允许修改**：
  - src/app/manager/**
  - src/components/manager/crud-specs.tsx
  - src/components/manager/resource-meta/**
  - tests/e2e/crud-article.spec.ts
  - tests/e2e/collect-publish.spec.ts
- **升级/熔断**：—；同一卡连续 2 次独立验收 FAIL → 停止改代码，写失败分析交用户裁决
- **证据目录**：`docs/design/06_validation/evidence/W1-E/E-05/`

#### E-06　特殊页迁移 B：llm-providers、wechat-accounts、media（改名+批量接口）、chat-history、settings、仪表盘、login、logs 筛选、not-found

- **工作包 / 切片**：WPE.3 特殊页迁移　/　S-E6 系统与 AI 页面统一
- **来源需求**：REQ-F-015；parity B7（媒体 PATCH）、B8（media/batch）、C4/C5
- **目标**：/manager 全部页面严格正则计数 = 0；媒体库可改名、批量删除调 /api/media/batch；logs 可按模块/动作/时间筛选；login 改用 manager/ui（不再引用前台共享 ui/Input）
- **输入**：A-ui §1.2 按文件计数；media/page.tsx:74
- **依赖**：A-07　**档位**：sonnect（页面迁移）　**规模**：大（2 天）（计划 2.0 人天）
- **输出（新增/修改）**：
  - src/app/manager/{llm-providers,wechat-accounts,media,chat-history,settings,login,logs}/page.tsx
  - src/app/manager/page.tsx
  - src/app/manager/not-found.tsx（新）
  - src/components/manager/crud-specs.tsx（logs filters）
- **执行步骤**：
  1. 逐页迁移
  2. settings 页按 registry 分组渲染，secret 用 SecretField
  3. 跑本卡验证命令与通用门禁，把命令、exit code、关键输出写入证据目录
  4. 提交：`git commit -m "<feat|fix|test|docs>(E-06): <摘要>"`（只含允许路径）
- **验收标准**（全部满足；最后两条对每张卡都适用）：
  - `grep -rnE "<(table|input|select|button|textarea)(\s|>|$)" src/app/manager` 为空
  - e2e auth/apply-chat 通过
  - `grep -rn "components/ui/input\|components/ui/label" src/app/manager` 为空
  - 通用门禁 `npm run lint && npm run typecheck && npm test && npm run build` 全部 exit 0
  - `git log --first-parent --no-merges --name-only --format= <本卡起点>..HEAD | sort -u` 全部落在本卡“允许修改”内
- **验证命令**：
```bash
npm run lint && npm run typecheck && npm test && npm run build
npm run test:e2e
```
- **允许修改**：
  - src/app/manager/**
  - src/components/manager/crud-specs.tsx
  - src/components/manager/resource-meta/**
  - tests/e2e/auth.spec.ts
  - tests/e2e/apply-chat.spec.ts
- **升级/熔断**：—；同一卡连续 2 次独立验收 FAIL → 停止改代码，写失败分析交用户裁决
- **证据目录**：`docs/design/06_validation/evidence/W1-E/E-06/`

#### E-07　管理端规格从契约派生（resource-meta + derive），crud-specs ≤ 200 行

- **工作包 / 切片**：WPE.4 规格单源派生　/　S-E7 规格从契约派生
- **来源需求**：P08 目标 1（以审计修正后的口径：契约→crud-specs）
- **目标**：字段键与枚举 options 由 zod schema 派生（.shape / .options），手写只剩 label、控件提示与特殊行为；新资源（blocks、kb）纳入
- **输入**：A-ui §3（字段重合 156/漂移 25）；W0-05 冻结契约
- **依赖**：E-05, E-06, E-03　**档位**：sonnect（重构）　**规模**：中（1.5 天）（计划 1.5 人天）
- **输出（新增/修改）**：
  - src/components/manager/resource-meta/**（新）
  - src/components/manager/crud-specs.tsx
  - src/components/manager/resource-meta/__tests__/derive.test.ts
- **执行步骤**：
  1. 试点 3 个资源 → 全量
  2. spec-drift.test.ts 继续为绿
  3. 跑本卡验证命令与通用门禁，把命令、exit code、关键输出写入证据目录
  4. 提交：`git commit -m "<feat|fix|test|docs>(E-07): <摘要>"`（只含允许路径）
- **验收标准**（全部满足；最后两条对每张卡都适用）：
  - `test $(wc -l < src/components/manager/crud-specs.tsx) -le 200`
  - derive.test.ts 与 spec-drift.test.ts 全绿
  - e2e 全量通过
  - 通用门禁 `npm run lint && npm run typecheck && npm test && npm run build` 全部 exit 0
  - `git log --first-parent --no-merges --name-only --format= <本卡起点>..HEAD | sort -u` 全部落在本卡“允许修改”内
- **验证命令**：
```bash
npx vitest run src/components/manager/resource-meta
npm run lint && npm run typecheck && npm test && npm run build
npm run test:e2e
```
- **允许修改**：
  - src/components/manager/crud-specs.tsx
  - src/components/manager/resource-meta/**
- **升级/熔断**：zod 4 元数据不足 → 并列 meta 对象（仍在 resource-meta/），不得回到手写字段键；同一卡连续 2 次独立验收 FAIL → 停止改代码，写失败分析交用户裁决
- **证据目录**：`docs/design/06_validation/evidence/W1-E/E-07/`

#### E-08　a11y 扫描、管理端响应式（375/768/1440）与组件 E2E

- **工作包 / 切片**：WPE.5 质量门　/　S-E8 可访问性与响应式
- **来源需求**：M-3（axe serious/critical=0、375 可用）；P13 目标 4
- **目标**：tests/a11y/manager.spec.ts 覆盖 10 个代表页；tests/e2e/e-responsive.spec.ts 断言 scrollWidth ≤ innerWidth；e-components.spec.ts 覆盖排序/筛选/批量删除/字段标红
- **输入**：W0-07 的 @axe-core/playwright 与 tests/a11y/playwright.config.ts
- **依赖**：E-07　**档位**：opus（可访问性审查（opus 券 1 次）+ sonnect 修复）　**规模**：中（1 天）（计划 1.0 人天）
- **输出（新增/修改）**：
  - tests/a11y/manager.spec.ts
  - tests/e2e/e-responsive.spec.ts
  - tests/e2e/e-components.spec.ts
  - docs/design/06_validation/evidence/W1-E/a11y-report.md
- **执行步骤**：
  1. 写用例并运行
  2. 页面层问题（E 所有路径）就地修复
  3. 组件层问题（A 所有路径）逐条写入 a11y-report.md 的“交 A-08”清单，不越界修改
  4. 截图存证
  5. 跑本卡验证命令与通用门禁，把命令、exit code、关键输出写入证据目录
  6. 提交：`git commit -m "<feat|fix|test|docs>(E-08): <摘要>"`（只含允许路径）
- **验收标准**（全部满足；最后两条对每张卡都适用）：
  - 三个用例文件存在且可运行
  - 页面层 serious/critical = 0；剩余项全部归属组件且已列入交 A-08 清单（含规则 id、页面、选择器）
  - e-responsive、e-components 中不依赖组件修复的用例通过
  - 通用门禁 `npm run lint && npm run typecheck && npm test && npm run build` 全部 exit 0
  - `git log --first-parent --no-merges --name-only --format= <本卡起点>..HEAD | sort -u` 全部落在本卡“允许修改”内
- **验证命令**：
```bash
npx playwright test -c tests/a11y/playwright.config.ts
npx playwright test -c tests/e2e/playwright.config.ts tests/e2e/e-responsive.spec.ts tests/e2e/e-components.spec.ts
npm run test:visual
```
- **允许修改**：
  - tests/a11y/*.spec.ts
  - tests/e2e/e-*.spec.ts
  - src/components/manager/crud-specs.tsx
  - src/components/manager/resource-meta/**
  - src/app/manager/**
  - docs/design/06_validation/evidence/W1-E/**
- **升级/熔断**：axe 规则与设计冲突 → opus 裁决并记 ADR-033；同一卡连续 2 次独立验收 FAIL → 停止改代码，写失败分析交用户裁决
- **证据目录**：`docs/design/06_validation/evidence/W1-E/E-08/`

#### A-08　组件层 a11y/响应式修复（响应 E-08 的“交 A-08”清单）

- **工作包 / 切片**：WPA.6 依赖收敛与质量　/　S-A6 组件可访问
- **来源需求**：M-3；REQ-F-015
- **目标**：E-08 清单中所有组件层问题修复后，tests/a11y 扫描 serious/critical = 0，e-responsive 与 e-components 全部通过
- **输入**：docs/design/06_validation/evidence/W1-E/a11y-report.md
- **依赖**：A-06, E-08　**档位**：sonnect（修复）　**规模**：中（1 天）（计划 1.0 人天）
- **输出（新增/修改）**：
  - src/components/manager/**（A 所有部分）
  - docs/design/06_validation/evidence/W1-A/a11y-fix.md
- **执行步骤**：
  1. E 线分支合并本线最新代码后在 E 分支上复测（只读）
  2. 逐条修复并回填清单
  3. 跑本卡验证命令与通用门禁，把命令、exit code、关键输出写入证据目录
  4. 提交：`git commit -m "<feat|fix|test|docs>(A-08): <摘要>"`（只含允许路径）
- **验收标准**（全部满足；最后两条对每张卡都适用）：
  - `npx playwright test -c tests/a11y/playwright.config.ts` serious/critical = 0（在合入 A+E 的临时集成分支上）
  - e-responsive、e-components 全部通过
  - visual 46/46
  - 通用门禁 `npm run lint && npm run typecheck && npm test && npm run build` 全部 exit 0
  - `git log --first-parent --no-merges --name-only --format= <本卡起点>..HEAD | sort -u` 全部落在本卡“允许修改”内
- **验证命令**：
```bash
npx playwright test -c tests/a11y/playwright.config.ts
npm run test:visual
npm run lint && npm run typecheck && npm test && npm run build
```
- **允许修改**：
  - src/components/manager/ui/**
  - src/components/manager/fields/**
  - src/components/manager/feedback/**
  - src/components/manager/shell/**
  - src/components/manager/__tests__/**
  - src/components/manager/CrudPage.tsx
  - src/components/manager/DataTable.tsx
  - src/components/manager/ResourceForm.tsx
  - src/components/manager/SchemaForm.tsx
  - src/components/manager/FormDialog.tsx
  - src/components/manager/DetailDialog.tsx
  - src/components/manager/Pagination.tsx
  - docs/design/06_validation/evidence/W1-A/**
- **升级/熔断**：axe 规则与设计冲突 → opus 裁决并记 ADR-033；同一卡连续 2 次独立验收 FAIL → 停止改代码，写失败分析交用户裁决
- **证据目录**：`docs/design/06_validation/evidence/W1-A/A-08/`

## Wave 1 结束条件（你这一侧）

- A、E 全部卡的验证报告为 PASS（UNKNOWN 只允许出现在无凭证/无 docker/Playwright 依赖装不上的条目并写明原因），已提交进 `evidence/W1-A/`、`evidence/W1-E/`。
- `lane/ui` 已推送；越界检查通过；GATE、visual 46/46、e2e 全绿；`/manager` 首屏包体相对 w1-base 增长 ≤ 2%。

## 阶段 2：Wave 2 集成（你主持）

**进入条件**（任一不满足就停止并汇报）：W0-verify PASS；A-07 检查点 PASS；`lane/ui`、`lane/backend` 每张卡都有 PASS 验证报告；裁决 D6~D9、D11 已写入 `docs/design/04_planning/current-plan.md` 文首裁决表（W0-01 已写，核对即可）。

**合并规程**（W2-01）：
```bash
git checkout upgrade && git pull --ff-only
for b in lane/backend lane/ui; do
  git diff upgrade...origin/$b | grep -nE "sk-[A-Za-z0-9]{20,}|ghp_[A-Za-z0-9]{20,}|github_pat_|-----BEGIN [A-Z ]*PRIVATE KEY" && { echo "密钥：$b"; break; }
  git merge --no-ff "origin/$b" -m "merge($b): Wave 1 合入" || { echo "冲突：$b"; break; }
  npm ci && npm run lint && npm run typecheck && npm test && npm run build && npm run test:visual && npm run test:e2e || { echo "门禁失败：$b"; break; }
done
git push origin upgrade     # W2-01 合并完立即推送，Y 才能从合并后的 upgrade 拉 w2/backend
```
冲突只允许出现在证据文档；出现在代码文件说明所有权矩阵有缺陷 → 停止，交用户，不要手工“揉”代码。

**分工与顺序**：W2-01（你）→ 你做 W2-02、W2-08；同时 Y 在 `w2/backend` 做 W2-03 → W2-09 → W2-04 → 你验证 Y 的 W2 提交并 `git merge --no-ff origin/w2/backend` → 你做 W2-05 全量回归 → W2-06 文档 → W2-07：Y 做独立终审，PASS 后你推送并打包。你在 Wave 2 不替 Y 改依赖或脚本；发现某线业务问题退回该线在原 lane 分支修复、重新验证后再合并。

### Wave 2 任务卡（你负责的部分）

#### W2-01　按 lane/backend → lane/ui 顺序合并两条执行线分支，逐次跑门禁

- **工作包 / 切片**：WP2.1 合并　/　S-W 集成
- **来源需求**：规划总指令 §7.3；§9.2
- **目标**：两条执行线合入 upgrade，冲突为 0 或仅限证据文档；每次合并后全量门禁通过
- **输入**：origin/lane/backend、origin/lane/ui 与各卡 PASS 验证报告
- **依赖**：A-05, A-08, E-01, E-02, E-04, B-03, B-05, B-06, C-06, C-08, C-09, D-05, D-06, D-07, D-08, D-10, D-11, D-12　**档位**：opus（跨线集成仲裁）　**规模**：中（1 天）（计划 1.0 人天）
- **输出（新增/修改）**：
  - upgrade 合并提交
  - docs/design/06_validation/evidence/W2/merge-log.md
- **执行步骤**：
  1. 每条分支合并前确认其全部卡验证报告 PASS 并做密钥扫描
  2. 合并后 GATE+VIS+E2E
  3. 合并完成立即推送 upgrade，通知 Y 从此拉 w2/backend
  4. 跑本卡验证命令与通用门禁，把命令、exit code、关键输出写入证据目录
  5. 提交：`git commit -m "<feat|fix|test|docs>(W2-01): <摘要>"`（只含允许路径）
- **验收标准**（全部满足；最后两条对每张卡都适用）：
  - `git log --merges --first-parent w1-base..upgrade` 含 2 次 Wave 1 合并（CCR 合并另计）
  - 每次合并后门禁全绿（日志入证据）
  - 通用门禁 `npm run lint && npm run typecheck && npm test && npm run build` 全部 exit 0
  - `git log --first-parent --no-merges --name-only --format= <本卡起点>..HEAD | sort -u` 全部落在本卡“允许修改”内
- **验证命令**：
```bash
npm run lint && npm run typecheck && npm test && npm run build
npm run test:visual
npm run test:e2e
```
- **允许修改**：
  - （合并本身）
  - docs/design/06_validation/evidence/W2/**
- **升级/熔断**：出现非证据文件冲突 → 说明所有权矩阵有缺陷，回到规划修正；同一卡连续 2 次独立验收 FAIL → 停止改代码，写失败分析交用户裁决
- **证据目录**：`docs/design/06_validation/evidence/W2/W2-01/`

#### W2-02　全路由契约测试自动发现（tests/contract），覆盖合并后全部路由（守卫角色执行）

- **工作包 / 切片**：WP2.2 守卫建设（Guard，不与实现并行）　/　S-W 集成
- **来源需求**：P13 目标 3；M-4
- **目标**：遍历 src/app/api/**/route.ts 导出的方法，每个方法必须在 rules.ts 有规则（未登录/非法参数/合法参数），断言信封与状态码；缺规则即失败
- **输入**：src/lib/__tests__/api-contract/harness.ts；W0-04 错误码
- **依赖**：W2-01　**档位**：sonnect（测试工程）　**规模**：大（2 天）（计划 2.0 人天）
- **输出（新增/修改）**：
  - tests/contract/routes.test.ts
  - tests/contract/rules.ts
  - docs/design/06_validation/evidence/W2/contract-coverage.md
- **执行步骤**：
  1. 在合并后的 upgrade 上对全部路由建规则（含 knowledge-bases、knowledge-files、home-blocks、media、upload；知识库上传 PDF/图片 400 用例必须在列）
  2. NON_JSON_ROUTES 取自 evidence/W1-B/non-json-routes.md
  3. 跑本卡验证命令与通用门禁，把命令、exit code、关键输出写入证据目录
  4. 提交：`git commit -m "<feat|fix|test|docs>(W2-02): <摘要>"`（只含允许路径）
- **验收标准**（全部满足；最后两条对每张卡都适用）：
  - `npx vitest run tests/contract` 通过
  - 覆盖率报告：发现的方法 100% 有规则（合并后口径），skip ≤ 5 且每条有理由
  - 通用门禁 `npm run lint && npm run typecheck && npm test && npm run build` 全部 exit 0
  - `git log --first-parent --no-merges --name-only --format= <本卡起点>..HEAD | sort -u` 全部落在本卡“允许修改”内
- **验证命令**：
```bash
npx vitest run tests/contract
npm run lint && npm run typecheck && npm test && npm run build
```
- **允许修改**：
  - tests/contract/**
  - src/lib/__tests__/api-contract/**
  - docs/design/06_validation/evidence/W2/**
- **升级/熔断**：某路由无法构造合法请求 → 规则标 skip 并写理由，skip ≤ 5；同一卡连续 2 次独立验收 FAIL → 停止改代码，写失败分析交用户裁决
- **证据目录**：`docs/design/06_validation/evidence/W2/W2-02/`

#### W2-08　ESLint 边界规则（直接 error）+ 13-响应设计文档同步 + CCR 积压收尾（含 notify.scan 调用 flushDeferred）

- **工作包 / 切片**：WP2.2 守卫建设（Guard，不与实现并行）　/　S-W 集成
- **来源需求**：规划总指令 §9.4（架构边界检查）；P08 目标（禁止重复 DTO）
- **目标**：eslint no-restricted-imports：src/lib 禁止 import '@/app/**'（D-09 已消除 collect-engine 反向依赖）、路由内禁止定义请求体 zod（error）；Wave 1 登记的 CCR 全部落地或关闭，其中 B-06 需要的 notify.scan → flushDeferred() 在 src/lib/jobs/index.ts 注册并有单测
- **输入**：eslint.config.mjs（18 行）；C-ops §3（collect-engine.ts:19 反向依赖）
- **依赖**：W2-01　**档位**：sonnect（守卫与收尾）　**规模**：小（0.5 天）（计划 0.5 人天）
- **输出（新增/修改）**：
  - eslint.config.mjs
  - docs/design/13-响应设计.md
  - src/lib/jobs/index.ts（仅 notify.scan 注册）
  - docs/design/06_validation/evidence/W2/ccr-closure.md
- **执行步骤**：
  1. 新增规则（error）并修复/退回违规
  2. 文档改为 W0 冻结口径
  3. 逐条处理 CCR 积压并记录
  4. 跑本卡验证命令与通用门禁，把命令、exit code、关键输出写入证据目录
  5. 提交：`git commit -m "<feat|fix|test|docs>(W2-08): <摘要>"`（只含允许路径）
- **验收标准**（全部满足；最后两条对每张卡都适用）：
  - `npm run lint` 0 error（含新规则）
  - ccr-closure.md 中每条 CCR 状态为已落地/已关闭
  - notify.scan 调用 flushDeferred 的单测通过
  - 文档错误码表与 src/contracts/common.ts 一致（脚本比对或人工逐条）
  - 通用门禁 `npm run lint && npm run typecheck && npm test && npm run build` 全部 exit 0
  - `git log --first-parent --no-merges --name-only --format= <本卡起点>..HEAD | sort -u` 全部落在本卡“允许修改”内
- **验证命令**：
```bash
npm run lint
```
- **允许修改**：
  - eslint.config.mjs
  - docs/design/13-响应设计.md
  - src/lib/jobs/index.ts
  - src/lib/__tests__/**
  - docs/design/06_validation/evidence/W2/**
- **升级/熔断**：—；同一卡连续 2 次独立验收 FAIL → 停止改代码，写失败分析交用户裁决
- **证据目录**：`docs/design/06_validation/evidence/W2/W2-08/`

#### W2-05　全量回归：e2e（含 e-knowledge、e-home-blocks、e-notify-rules、e-components、e-responsive、a-richtext、d-cache）、visual、a11y、responsive、contract

- **工作包 / 切片**：WP2.5 全量验收　/　S-W 集成
- **来源需求**：M-1~M-14；基础目标 5 条
- **目标**：全部测试在合并后的 upgrade 上一次跑通并留日志
- **输入**：W2-01~04
- **依赖**：W2-02, W2-04, W2-08, W2-09　**档位**：sonnect（执行）　**规模**：中（1 天）（计划 1.0 人天）
- **输出（新增/修改）**：
  - docs/design/06_validation/evidence/W2/full-run.md
- **执行步骤**：
  1. 按 11-验收与审查规程.md §6 的守卫顺序跑
  2. 跑本卡验证命令与通用门禁，把命令、exit code、关键输出写入证据目录
  3. 提交：`git commit -m "<feat|fix|test|docs>(W2-05): <摘要>"`（只含允许路径）
- **验收标准**（全部满足；最后两条对每张卡都适用）：
  - GATE、VIS、E2E、a11y、contract 全部 exit 0
  - 失败项有归属线与复修记录
  - 通用门禁 `npm run lint && npm run typecheck && npm test && npm run build` 全部 exit 0
  - `git log --first-parent --no-merges --name-only --format= <本卡起点>..HEAD | sort -u` 全部落在本卡“允许修改”内
- **验证命令**：
```bash
npm run lint && npm run typecheck && npm test && npm run build
npm run test:visual
npm run test:e2e
npx playwright test -c tests/a11y/playwright.config.ts
npx vitest run tests/contract
```
- **允许修改**：
  - docs/design/06_validation/evidence/W2/**
- **升级/熔断**：同一失败两次 → 熔断，回到对应线；同一卡连续 2 次独立验收 FAIL → 停止改代码，写失败分析交用户裁决
- **证据目录**：`docs/design/06_validation/evidence/W2/W2-05/`

#### W2-06　parity-matrix 终态、current-plan/roadmap/changelog 同步、MUST 逐条结论

- **工作包 / 切片**：WP2.6 文档收口　/　S-W 集成
- **来源需求**：M-1；规划总指令 §2.3（文档与代码一致）
- **目标**：parity-matrix 每行状态与证据为合并后真实状态（现矩阵仍停留在 P01 统计：present 17/partial 24/missing 3）；MUST 表逐条 PASS/FAIL/UNKNOWN
- **输入**：全部证据
- **依赖**：W2-05　**档位**：haiku（文档）　**规模**：小（0.5 天）（计划 0.5 人天）
- **输出（新增/修改）**：
  - docs/design/02_requirements/parity-matrix.md
  - docs/design/04_planning/current-plan.md
  - docs/design/04_planning/roadmap.md
  - docs/design/07_release/changelog.md
- **执行步骤**：
  1. 逐行复核，不确定的标 UNKNOWN
  2. 跑本卡验证命令与通用门禁，把命令、exit code、关键输出写入证据目录
  3. 提交：`git commit -m "<feat|fix|test|docs>(W2-06): <摘要>"`（只含允许路径）
- **验收标准**（全部满足；最后两条对每张卡都适用）：
  - parity-matrix 中 missing+partial = 0，或每条剩余行附裁决/UNKNOWN 理由（人工逐条）
  - MUST 表 14 条全部有结论
  - 通用门禁 `npm run lint && npm run typecheck && npm test && npm run build` 全部 exit 0
  - `git log --first-parent --no-merges --name-only --format= <本卡起点>..HEAD | sort -u` 全部落在本卡“允许修改”内
- **验证命令**：
```bash
test "$(grep -cE '\| *(missing|partial) *\|' docs/design/02_requirements/parity-matrix.md || true)" -eq 0 || echo '存在 missing/partial：逐条核对是否附裁决或 UNKNOWN 理由'
```
- **允许修改**：
  - docs/design/**
- **升级/熔断**：—；同一卡连续 2 次独立验收 FAIL → 停止改代码，写失败分析交用户裁决
- **证据目录**：`docs/design/06_validation/evidence/W2/W2-06/`

#### W2-07　独立终审 → 推送 upgrade → 打包

- **工作包 / 切片**：WP2.7 终审与交付　/　S-W 集成
- **来源需求**：规划总指令 §9.3；AGENTS.md §8
- **目标**：独立审查者只看 `git diff bb2c0e5..upgrade` 与运行结果给出 PASS；推送使用临时凭据且 remote URL 无凭据残留
- **输入**：W2-06
- **依赖**：W2-06　**档位**：opus（终审）　**规模**：小（计划 0.5 人天）
- **输出（新增/修改）**：
  - docs/design/06_validation/evidence/W2/final-verify.md
- **执行步骤**：
  1. 审查 → 推送 → `git remote -v` 无凭据 → 删除临时凭据文件
  2. 跑本卡验证命令与通用门禁，把命令、exit code、关键输出写入证据目录
  3. 提交：`git commit -m "<feat|fix|test|docs>(W2-07): <摘要>"`（只含允许路径）
- **验收标准**（全部满足；最后两条对每张卡都适用）：
  - final-verify.md 结论 PASS
  - `git remote get-url origin` 不含 '@'
  - 临时凭据文件不存在
  - 通用门禁 `npm run lint && npm run typecheck && npm test && npm run build` 全部 exit 0
  - `git log --first-parent --no-merges --name-only --format= <本卡起点>..HEAD | sort -u` 全部落在本卡“允许修改”内
- **验证命令**：
```bash
git remote get-url origin | grep -q @ && exit 1 || echo ok
```
- **允许修改**：
  - docs/design/06_validation/evidence/W2/**
- **升级/熔断**：FAIL → 回到对应线；连续 2 次 → 熔断上报用户；同一卡连续 2 次独立验收 FAIL → 停止改代码，写失败分析交用户裁决
- **证据目录**：`docs/design/06_validation/evidence/W2/W2-07/`

**终审额外检查**（交给 Y 一起验）：`git diff origin/main -- src/components/web 'src/app/(web)' public` 只含四类已登记差异（import 路径/类型、数据适配与缓存、兜底字面量、ChatWidget SSE 解析）；parity-matrix 中 missing+partial = 0 或逐条有裁决/UNKNOWN 理由；MUST 14 条每条有结论。

**推送**：
```bash
git push origin upgrade --follow-tags
git remote get-url origin | grep -qE 'https://[^/]*@' && echo "remote 含凭据，立即清理" || echo "remote 干净"
```
**打包**：`docs/design/04_planning/parallel-w1/`（规划包）+ `docs/design/06_validation/evidence/{W0,W1-*,W2}/` 打成 zip，附 final-verify 结论摘要。

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

工作包汇报（每个工作包一次，同时作为验证请求的附件）：
```text
X / <段 A|E|W2> / <工作包> 汇报
- 起点..终点：<commit>..<commit>（分支 lane/ui 或 upgrade）
- 完成的卡：<卡号>
- 逐条验收：| 卡号 | 验收条目 | 命令 | exit | 自测结果 | 证据路径 |
- 越界检查：是/否（否则列出文件）
- 契约变更请求：<编号或“无”>
- 未验证项与原因：
- 给 Y 或用户的事项：
```
Wave 2 汇报：合并 n/n 与每次门禁 / 守卫（契约测试覆盖、ESLint、check-assets、check-root）/ W2-03、W2-04、W2-06 结论 / 全量回归 / 终审 PASS·FAIL / MUST 14 条 PASS·UNKNOWN·FAIL 计数 / 推送 commit 与 remote 是否干净 / 未决。
汇报只写可复现事实；PASS 由验证者给出，不由你自己宣布。
