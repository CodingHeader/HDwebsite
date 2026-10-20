# B-04 P1 修复独立复审报告（verify-p1-fix）

- 复审对象：upgrade 分支，提交 `b771d6d`（B-04 P1 修复：`fix(B-04): toSessionUser 权限回落 safePerms`）
- 修复前基线：`a9b0d56`（B-04 卡首次迁移提交）
- 复审日期：2026-10-20
- 复审性质：**独立、只读**。仅读取工作区文件 + 检索内容，未运行 git 命令、未修改任何源码/证据文件；本报告为唯一写入文件。
- 复审范围：`src/lib/auth.ts`（重点 `toSessionUser` 44-62 行）、`src/lib/json-field.ts`、`src/contracts/auth.ts`、新增回归测试 `src/lib/__tests__/lane-b/auth-session.test.ts`、证据 `execution.md` / `verify.md`。

## 结论

**PASS**，完成度 **98%**。

P1-1 已修复：`toSessionUser` 现恒把**数组** `safePerms` 传给 `sessionUserSchema.parse()`，坏 JSON / `null` / 非数组 / 混合类型数组均回落为 `string[]`，不再触发 ZodError。回归测试 5 例真实覆盖关键边界，且会在修复前版本必然失败（详见 B 与 C 推理）。diff 未越界触碰冻结面。门禁结论与 evidence 一致（本次未实跑命令，见"局限"）。

**未发现新的 P1 问题**；仅 1 条 P3 备注（类型参数不必要地允许 null，属可读性瑕疵，不影响正确性）。

## 逐条验收结果（A–F）

### A. `toSessionUser` 是否恒把数组 `safePerms` 传给 schema —— PASS

`src/lib/auth.ts:47-61`（实读行号）：

```ts
47  const permissions = parseJsonField<string[] | null>(role.permissions, null);
48  const safePerms = Array.isArray(permissions) ? permissions.filter((p) => typeof p === "string") : [];
49  return sessionUserSchema.parse({
...
58      permissions: safePerms,        // ← 传给 schema 的是 safePerms，不是 permissions
```

- 任何输入下 `safePerms` 都是数组：`Array.isArray(...)` 为真 → `filter` 结果仍是数组；为假（含 `null`/`undefined`/非数组）→ 字面量 `[]`。
- 因此 `role.permissions` 的 `null`/`undefined` **不可能**漏网到 `sessionUserSchema.role.permissions`（该字段为 `z.array(z.string())`，`src/contracts/auth.ts:21`，非 nullable）。
- `getSession`（auth.ts:33-44）把 `toSessionUser` 结果直接返回，链路无再次解析入口。✓

### B. 与原 `catch → []` 语义等价性 + 7 类边界 —— PASS（含 1 处 P3 备注）

`parseJsonField<T>(raw, fallback)`（`src/lib/json-field.ts:13-22`）语义：`null` / `undefined` / 非 string / 空串（含全空白）/ 非法 JSON → 返回 `fallback`；合法 JSON → `JSON.parse` 结果强转 `T`。

原实现（据 verify.md P1-1 描述与 execution.md 第 27 条）：`try { permissions = JSON.parse(role.permissions) } catch { permissions = [] }`。

逐边界比对（最终传给 schema 的值 = `safePerms`）：

| `role.permissions` 输入 | `parseJsonField(..., null)` 结果 | `safePerms` | 原 `catch→[]` 结果 | 等价? |
|---|---|---|---|---|
| `null` | `null` | `[]` | 原 `JSON.parse(null)` → `"null"` 不抛错，`JSON.parse(null)` 实际解析为 null（`JSON.parse(null)` 强制转字符串 "null"），原实现无 typeof/数组校验时可能得 `null`；按"失败回落"口径应得 `[]` | ✓ 修复后更稳 |
| `undefined` | `null` | `[]` | `JSON.parse(undefined)` → 抛 SyntaxError → `[]` | ✓ |
| 空串 `""` / 全空白 | `null` | `[]` | `JSON.parse("")` → SyntaxError → `[]` | ✓ |
| 非字符串（如 Prisma 异常类型） | `null`（json-field.ts:15 显式 typeof 拦截） | `[]` | `JSON.parse(123)` → 抛错 → `[]` | ✓ |
| 非法 JSON（`"{not-json"`） | `null` | `[]` | 抛错 → `[]` | ✓ |
| 合法 JSON 非数组（如 `{"a":1}`、`"x"`、`42`、`null` 字面量） | 解析值 | `[]`（`Array.isArray` false） | 原实现若仅 `try` 无数组校验会把非数组直接传 schema → 抛 ZodError | ✓ 修复后更稳 |
| 数组含非 string 元素（`["a",1,"b"]`） | `["a",1,"b"]` | `["a","b"]` | 原实现把混型数组传 schema → `z.array(z.string())` 抛 ZodError | ✓ 修复后更稳 |
| 正常数组（`["a","b"]`） | `["a","b"]` | `["a","b"]` | `["a","b"]` | ✓ 完全一致 |

**结论**：7 类边界全部与"原 catch → `[]`"的**可观测结果等价或更稳**（修复前"合法 JSON 非数组"与"数组含非 string"两类反而会抛错）。修复未破坏任何正常路径。

**P3 备注**：`parseJsonField<string[] | null>(role.permissions, null)` 的类型参数写 `string[] | null`，但实际只消费 `Array.isArray` 分支；由于 fallback 是 `null`，类型必须声明 `| null` 才能通过 tsc。属可读性可优化项（可改用 `parseJsonField<unknown>(role.permissions, null)` + 数组收窄），不影响正确性。

### C. 回归测试 5 例覆盖度 + "修复前必然失败"推理 —— PASS

`src/lib/__tests__/lane-b/auth-session.test.ts` 5 例（实读）：

| 例 | 输入 | 期望 | 修复前 (a9b0d56) 表现 | 覆盖价值 |
|---|---|---|---|---|
| 1 | `JSON.stringify(["a","b"])` | `["a","b"]` | ✓ 通过（同值） | 正常路径无回归 |
| 2 | `"{not-json"` | `[]`，**不抛异常** | `permissions=null` → `sessionUserSchema.parse` 抛 ZodError → **FAIL** | 直接命中 P1-1 |
| 3 | `null` | `[]` | 同上，`null` 传 schema → ZodError → **FAIL** | 命中 P1-1 |
| 4 | `JSON.stringify({a:1})` | `[]` | 非数组对象传 schema → ZodError → **FAIL** | 命中 P1-1 同类 |
| 5 | `JSON.stringify(["a",1,"b"])` | `["a","b"]` | 混型数组传 schema → ZodError → **FAIL** | 命中 P1-1 同类 |

- 覆盖缺口：**未覆盖 `undefined`** 与**空串 `""`**两个边界（测试只测了 `null`）。由于 `parseJsonField` 对二者与 `null` 走同一分支（json-field.ts:14,16），行为一致，属低风险遗漏，建议后续补 1 例，**不构成 P2**。
- 推理依据（不依赖 git 命令）：修复前的关键差异是 `permissions`（可空）而非 `safePerms` 被传入 schema；`roleSummarySchema.permissions` 为 `z.array(z.string())`（contracts/auth.ts:21，已实读），`.parse()` 对 `null`/非数组/混型必抛 ZodError。例 2/3/4/5 的输入恰好分别触发"非法 JSON→null"、"null→null"、"合法非数组"、"混型数组"四条失败路径，因此**测试必在 a9b0d56 版本失败**。这一推理与 verify.md 第 89 行"补齐证据缺口：声明为 `z.array(z.string())` 非 nullable → 必抛 ZodError"一致。
- 测试质量：断言清晰，`baseUser`/`baseRole` 用 `as never` 绕过类型严格性以模拟 Prisma 返回的完整对象，属测试桩惯用写法；不依赖 DB，纯函数级，快速稳定。

### D. 类型层面收窄 + tsc —— PASS

```ts
const permissions = parseJsonField<string[] | null>(role.permissions, null);  // string[] | null
const safePerms = Array.isArray(permissions) ? permissions.filter((p) => typeof p === "string") : [];
```

- `Array.isArray(permissions)` 真分支收窄 `permissions` 为 `string[]`（TS 内置类型谓词），`filter((p) => typeof p === "string")` 的谓词是 TS 认可的类型守卫 → 结果类型为 `string[]`；假分支为 `never[]` 字面量，与 `string[]` 兼容。
- `safePerms` 推断为 `string[]`，与 `sessionUserSchema.role.permissions`（`z.array(z.string())`）完全兼容。
- execution.md 第 45 行记录 `npx tsc --noEmit → exit 0`。本次静态核验确认**无类型歧义点**，未发现会导致 tsc 报错的路径（tsconfig `strict: true` 已开启，`src/lib/json-field.ts` 与 `auth.ts` 均通过 strict 检查）。

### E. 是否越界触碰冻结面 —— PASS

- 本次修复只涉及：`src/lib/auth.ts`（第 47-58 行，`toSessionUser` 内部）+ 新增测试 `src/lib/__tests__/lane-b/auth-session.test.ts` + 证据文件 `execution.md` / `verify.md` / 本报告 `verify-p1-fix.md`。
- **冻结面核验**：
  - `src/contracts/auth.ts` **未被修改**（本次实读确认 `roleSummarySchema.permissions: z.array(z.string())` 仍是原始非 nullable 声明，`sessionUserSchema` 结构完整）——修复通过适配**调用方**而非放宽**契约**完成，符合"契约单一来源"原则，也未触发《契约变更请求》。
  - `src/lib/json-field.ts` **未被修改**（W0-03 冻结签名保持不变）。
  - `package.json`、`package-lock.json`、`vitest.config.ts`、`playwright.config.ts`、`prisma.config.ts`、`prisma/`、`src/contracts/**` 本次均为只读，未发现改动迹象。
- 结论：diff 范围 = `src/lib/auth.ts` + `lane-b` 测试 + `docs/` 证据，**完全在 B-04 允许路径内**，无越界。

### F. 门禁可复现性 —— PASS（引用 execution.md 实测 + 静态核验）

execution.md 第 44-48 行记录的实测输出：

| 命令 | 期望 | execution.md 记录 |
|---|---|---|
| `npm run lint` | 0 errors | exit 0, 0 errors, 55 warnings（既有，+1 归 W2-08） |
| `npx tsc --noEmit` | exit 0 | exit 0 |
| `npx vitest run src/lib/__tests__/lane-b/auth-session.test.ts` | 5 passed | 1 file / 5 tests passed |
| `npm test` | 60 files / 765 tests | 60 files / 765 tests（P1 修复后） |

静态交叉核验（本次）：
- `npm test` 的 "60 files" 口径 = `src/**/__tests__/**/*.test.ts`（59 个，glob 实查）+ `tests/contract/w0-placeholder.test.ts`（1 个）＝ 60；另有 5 个 `.tsx` 测试文件，均满足 `vitest.config.ts:19` 的 `include` 模式，因此 60 与 765 的计数口径合理、与证据一致。
- `auth-session.test.ts` 5 例的 `describe/it` 结构与 `execution.md` 第 37/46 行一致。
- 本次未实跑 lint/tsc/vitest（工具受限），门禁结论**引用 execution.md + 静态代码核验**，可复现性判断基于配置与文件实查，详见"局限"。

## 新问题分级

| 级别 | 问题 | 证据 | 建议 |
|---|---|---|---|
| **P3** | `parseJsonField<string[] \| null>(role.permissions, null)` 类型参数允许 `null`，与后续 `Array.isArray` 收缩冗余 | `src/lib/auth.ts:47`；因 fallback 为 `null` 不得不声明可空 | 可改为 `parseJsonField<unknown>(role.permissions, null)`，不影响正确性，属可读性优化，无需阻塞 |
| **P3** | 回归测试未覆盖 `undefined` 与空串 `""` 边界 | `auth-session.test.ts` 仅 5 例（null 覆盖了 `parseJsonField` 的 null 分支） | 建议后续补 2 例；`parseJsonField` 已对二者统一回落，风险极低 |

**未发现 P1/P2 新问题。** P1-1 已闭环关闭。

## 局限（本复审）

1. **未运行任何命令**：本会话 bash 与 `execute_code` 均不可用，无法执行 `git show b771d6d` / `git show a9b0d56` / `npm run lint` / `npx tsc --noEmit` / `vitest`。因此：
   - 门禁结论（lint / tsc / vitest 输出）**引用 execution.md 与 verify.md 的实测记录**，本次仅做静态代码与配置核验。
   - 修复前版本 a9b0d56 的 `auth.ts` 内容**未能逐行读取**，B/C 两项中"修复前必然失败"的推理基于：verify.md P1-1 描述（第 57-72 行）+ execution.md 第 27 条 + 契约 schema 实读 + 原 `catch → []` 语义。该推理链完整，但非 `git show` 逐字符比对。
   - git diff / stat 未跑，E 项的"冻结面未触碰"基于工作区文件实读 + evidence 记录，非 `git show --stat` 输出。
2. **测试断言未运行**：5 例的通过状态引自 execution.md 第 37/46 行与 verify.md 第 90 行，未在本会话实测。
3. **契约 schema 为本次实读**（`src/contracts/auth.ts:17-33`），非转述，故此前 verify.md 第 83/95 行的 UNKNOWN-1（"未读到 schema 定义"）已消除。

## 允许进入下一阶段

**是。** b771d6d 正确修复 P1-1，未引入新缺陷，diff 干净且在允许路径内，不阻塞 B-05/B-06。仅 2 条 P3 建议项，可随 W2-08 一并处理。