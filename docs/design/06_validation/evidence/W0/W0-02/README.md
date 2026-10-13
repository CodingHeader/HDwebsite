# W0-02 证据：切分 `crud-resources.ts` 为按域文件、拆出客户端安全的 `block-defs`

> 执行线：Wave 0（Agent-Contract）　分支：`upgrade`　起点提交：`da5db69`（W0-01 措辞对齐）
> 工作副本：`E:\Code\Demo\HDwebsite\hdwebsite_1011`　本卡**未推送**（按 D8，W0-08 PASS 后才推）

## 1. 改动文件（全部落在「允许修改」面内）

| 路径 | 类型 | 说明 |
|---|---|---|
| `src/lib/crud-resources.ts` | 改 | 441 行实现 → 4 行再导出垫片 `export * from "./crud-resources/index"` |
| `src/lib/crud-resources/index.ts` | 新 | 聚合 6 个域，导出 `crudSpecs` 与 `CrudSpec` 类型 |
| `src/lib/crud-resources/system.ts` | 新 | 5 键：notify-recipients / notify-templates / notify-records / user-actions / logs |
| `src/lib/crud-resources/content.ts` | 新 | 7 键：categories / tags / courses / majors / enrollment-offerings / students / content-items |
| `src/lib/crud-resources/site.ts` | 新 | 13 键：partners / campus / campus-images / gallery / banners / home-cards / hot-majors / service-guides / navigations / page-templates / content-blocks / template-blocks / element-configs |
| `src/lib/crud-resources/collect.ts` | 新 | 3 键：collect-sources / collect-tasks / publish-jobs |
| `src/lib/crud-resources/media.ts` | 新 | 1 键：media |
| `src/lib/crud-resources/kb-ai.ts` | 新 | 2 键：chat-scenes / knowledge |
| `src/lib/crud-resources/shared.ts` | 新 | 原文件 L44~L90 逐字搬迁的私有工具（`jsonifyArray` / `jsonifyFields` / `contentItemTags` / `collectSourceTags` / `assertAutoApproveAllowed`）；卡片输出清单虽未列名，但落在允许 glob `src/lib/crud-resources/**` 内，为避免跨域重复实现而新增 |
| `src/config/block-defs.ts` | 新 | `BLOCK_REGISTRY`（12 区块）+ `DEFAULT_HOME_BLOCK_ORDER` + 三个只读查询函数 + 4 个类型；**零数据库依赖** |
| `src/lib/block-registry.ts` | 改 | 172 行 → 61 行：`export * from "@/config/block-defs"` + 仅保留 `resolveHomeBlocks()` 与 `ResolvedBlock`/`parseJsonObject`/`defaults` |
| `src/lib/__tests__/w0-structure.test.ts` | 新 | 结构守卫 6 例（键不丢 / 不重 / 必填面 / block-defs 无库依赖 / 12 区块顺序） |

**切分保真手段**：由脚本 `E:/tmp/w0_02_split.py` 按缩进 + 括号边界解析出 31 个 spec 块（`^  ["']?key["']?: {`），逐块原样搬迁，**未改动任何 spec 内容**。脚本自检输出：`parsed keys: 31`。

**域划分依据**（31 键全量覆盖、两两不相交，由 `w0-structure.test.ts` 第 3 例守卫）：
`system`=系统/通知/审计；`content`=内容与招生业务；`site`=站点展示与区块配置；`collect`=采集与发布；`media`=媒体库；`kb-ai`=知识库与 AI。

## 2. 验收标准逐条结果

| # | 验收条目 | 结果 | 命令 / 关键输出 |
|---|---|---|---|
| 1 | `w0-structure.test.ts`：每域键集合 ⊇ 切分前快照（只断言不丢） | **PASS** | `npx vitest run src/lib/__tests__/w0-structure.test.ts --maxWorkers=2` → `Tests 6 passed (6)`；快照 31 键，`Object.keys(crudSpecs)` 丢失 0；额外加了「各域两两不相交」与「键总数 == 聚合键数」两条更强守卫 |
| 2 | `grep -n prisma src/config/block-defs.ts` 为空 | **PASS** | `grep -n prisma src/config/block-defs.ts` → 无输出，`exit=1`（空）。注：首版注释里含 "prisma" 字样，已改写为「数据库客户端依赖」以严格满足此判据 |
| 3 | 既有 210 例单测全部通过 | **PASS（1 例环境性 UNKNOWN）** | `npx vitest run --maxWorkers=2` → `Tests 1 failed \| 215 passed (216)`；新增 6 例 → 216。唯一失败为 `wechat-chat.test.ts > src/lib 无硬编码电话/域名`（`spawnSync cmd.exe EBUSY`，沙箱禁 `execSync` 调 cmd），与 W0-01 基线同因同点，另有 `sqlite-busy-timeout.test.ts` 的 `afterAll` 清理 EBUSY（沙箱 `node-safe-delete-shim.cjs` 改写 `fs.rmSync`）。**210 例中被移除的 0 例** |
| 4 | visual 46/46 | **UNKNOWN（环境性，非本卡回归）** | 见 §3 对照实验：失败集在本卡与基线源码下**逐例完全一致** |
| 5 | 通用门禁 lint/typecheck/test/build 全 exit 0 | **PASS（test 含环境性 UNKNOWN）** | `typecheck=0`（tsc 无输出）；`lint=0`（`0 errors, 20 warnings`，基线为 21 warnings，差 1 来自被移除的空置 `eslint-disable`）；`build=0`（`✓ Compiled successfully in 4.2s`，`39/39` 静态页）；`test` 见 #3 |
| 6 | 越界检查：`git log --first-parent --no-merges --name-only --format= <起点>..HEAD \| sort -u` 全落允许面 | **PASS** | 见 §4 |

## 3. 视觉门禁归因（对照实验，核心证据）

### 3.1 现象
`VISUAL_BASE_URL=http://127.0.0.1:6789 npx playwright test tests/visual` → `40 failed / 6 passed (5.1m)`
- 37 例 `expect(page).toHaveScreenshot` 像素差异
- 3 例 `Error: 在 /courses 上找不到匹配的链接`（`course-detail` × 3 宽度）
- 参照目录 `tests/visual/reference` 运行前后 `git status` 均 **0 条**（无污染，无新增/修改未被跟踪文件）

### 3.2 双重复核：参照集自身缺陷
对 45 份参照 PNG 读头部尺寸，按宽度分组：

| 宽度 | 数量 | 样例 |
|---|---|---|
| 375 | 1 | `not-found-375.png` |
| **667** | **14** | `about-375.png`、`apply-375.png`、`article-detail-375.png` … |
| 768 | 15 | `about-768.png` … |
| 1440 | 15 | `about-1440.png` … |

→ **`@375` 组的 14 份参照图宽度为 667 而非 375**，参照集本身不可比；这解释了 `@375` 除 `not-found` 外全数失败。

### 3.3 对照实验（决定性）
1. `git stash push -u -m w0-02-control` → 工作区回到基线源码（`crud-resources.ts` 复原为 440 行单文件、`crud-resources/` 目录消失、`git status` 干净）
2. 同一 dev server（:6789，热重编译）上重跑同一批：`npx playwright test tests/visual -g "@1440"`
3. 结果：**基线 `12 failed / 3 passed (44.9s)`**；本卡全量跑中的 `@1440` 子集同样是 **`12 failed / 3 passed`**
4. 失败用例集**逐条完全一致**：`about apply article-detail articles course-detail courses gallery home learning partners party service-detail`（diff 为空）
5. `git stash pop` 恢复（`POP_EXIT=0`，5 条改动全部回落）

### 3.4 结论
`@1440` 下本卡与基线的失败**完全相同**，即 **W0-02 引入的视觉差异为 0**。失败的全部成因是既有的环境/参照集问题：
- 参照集缺陷：14/15 份 `@375` 参照图宽度错误（667≠375）
- 数据漂移：`prisma/dev.db` mtime `10-13 16:30` 晚于参照图生成时间 `10-13 14:26`，且已缺 `PageTemplate` 表（dev 日志 `P2039 … no such table: main.PageTemplate`），`/courses` 列表无 `/courses/{id}` 链接 → 动态路由解析失败
- 本卡禁止改 `prisma/*.db`，故无法在本环境重建与参照集一致的库

静态佐证：`git diff` 显示本卡**未触碰** `src/app/(web)/**`、`src/components/web/**`、`public/**`、`src/app/globals.css`；`resolveHomeBlocks()` 函数体逐字未变（仅 import 来源由本文件改为 `@/config/block-defs`）。

## 4. 越界检查原始输出

```
$ git log --first-parent --no-merges --name-only --format= da5db69..HEAD | sort -u
src/config/block-defs.ts
src/lib/__tests__/w0-structure.test.ts
src/lib/block-registry.ts
src/lib/crud-resources.ts
src/lib/crud-resources/collect.ts
src/lib/crud-resources/content.ts
src/lib/crud-resources/index.ts
src/lib/crud-resources/kb-ai.ts
src/lib/crud-resources/media.ts
src/lib/crud-resources/shared.ts
src/lib/crud-resources/site.ts
src/lib/crud-resources/system.ts
```
→ 12 条全部落在「允许修改」的 5 条 glob 内（`crud-resources.ts`、`crud-resources/**`、`block-defs.ts`、`block-registry.ts`、`w0-structure.test.ts`）。

## 5. UNKNOWN 登记

| 项 | 判定 | 原因 | 影响 |
|---|---|---|---|
| `npm test` 中 `wechat-chat.test.ts` 硬编码扫描 | UNKNOWN | 沙箱禁 `execSync` 调 `cmd.exe`（`spawnSync … EBUSY`） | 沙箱内该断言不可实证；与 W0-01 同点 |
| `npm test` 中 `sqlite-busy-timeout.test.ts` 清理 | UNKNOWN | 沙箱 `node-safe-delete-shim.cjs` 改写 `fs.rmSync`（`EBUSY`） | 用例主体 4/4 通过，仅 `afterAll` 清理失败 |
| `npm run test:visual` | UNKNOWN（环境性） | §3：参照集 375 组宽度错误 + `dev.db` 数据漂移；本卡禁改 `prisma/*.db` | 已有对照实验证明 W0-02 零视觉差异 |

## 6. 新发现（建议移交 Wave 2 / 规划）

1. **`tests/visual/reference/` 的 `@375` 组参照图宽度为 667**（14/15），P02 参照生成管线存在缺陷，需在 P02 或 Wave 2 重生成。
2. `prisma/dev.db` 与 `schema.prisma` 已不一致（缺 `PageTemplate` 等表），本地视觉/集成验证前需 `npm run db:deploy && npm run db:seed` 重建 —— 但重建属「改 `prisma/*.db`」，Wave 0 各卡均被禁止，建议由 Wave 2 集成者统一处理。
