# V7-SEC-03 独立复审报告（review.md）

> 复审方：独立复审子代理（验证者身份，与执行者分离；只读审查代码，结论独立于执行者自证）
> 分支：`upgrade`　本地 HEAD=bf0eeb2　复审对象提交：`e7f149c feat(V7-SEC-03): 越权回归黑盒套件`
> 复审结论：**PASS-with-findings**（完成度 **90%**，唯一缺口为命令级独立运行证据，见第六节）

---

## 一、验证者独立性声明

- 本子代理仅获得本卡复审职责，未参与 V7-SEC-03 的代码编写、提交或 execution.md 撰写；审查结论仅依赖源码静态取证（`read_file` / `grep` / `glob`），不依赖执行者自证。
- 硬约束遵守情况：仅写入 `docs/design/06_validation/evidence/V7/V7-SEC-03/review.md` 一个文件；**未修改**任何 `src/**`、`prisma/**`、`src/contracts/**`、`tests/**`、配置文件；未执行 `git push` / `git commit` / `npm install` / `npm run build`；未调用 `execute_code`、`edit_file`。
- **关键证据缺口（必须如实登记）**：本子代理的工具集中**没有 `bash`**（调用 `bash` 返回 `Error: Unknown tool: bash`），因此步骤 1（`git show e7f149c --stat`）与步骤 3（`npx vitest` / `npx eslint` 独立运行）**无法亲自执行**。提交范围与门禁结果改为静态取证 + 登记为"执行者声明，未经独立复核"。此缺口已反映在完成度扣分中（见第六节、第八节）。

---

## 二、5W1H 简版

| 维度 | 内容 |
|---|---|
| What | 由非 SEC-01/02 执行者按 E1~E5 攻击路径独立编写 HTTP 级（`Request` 语义）黑盒用例，对修复后的路由处理器验证全部返回 403/400，另附 1 条超管正向用例；新增 1 个文件、8 个 `it`，不修改任何 `src/app/**`。 |
| Why | §9.3 防自证：SEC-01/02 的执行者自写单测会产生自证循环，需独立以路由层用例复现 5 条攻击路径是否真的被拦截。 |
| Who | 独立执行者；被测对象为 `src/app/api/roles/route.ts`、`roles/[id]/route.ts`、`users/route.ts`、`users/[id]/route.ts` 四个路由处理器。 |
| When | V7-SEC-03，V0.7 单主线（`upgrade`），依赖 V7-SEC-02 之后。 |
| Where | 新增 `src/lib/__tests__/security/escalation-blackbox.test.ts`（卡允许路径）。 |
| How | `vi.hoisted` 构造共享 mock（`prisma` + `requireAuth`）→ `vi.mock` 两个模块 → 直接 import 4 个路由处理器 → 用 `Request` 构造 HTTP 语义请求 → 断言 `res.status` 为 403/400/201。 |

---

## 三、改动文件核对表

### 3.1 提交触及文件（静态取证）

- 本卡唯一代码产物为 `src/lib/__tests__/security/escalation-blackbox.test.ts`（`glob` 确认该路径下仅此 1 个文件，无 `escalation-blackbox.helper.ts` 等伴随文件）。
- `docs/design/06_validation/evidence/V7/V7-SEC-03/` 下仅 `execution.md` 与本次将新增的 `review.md`。
- **未在 `src/app/**` 下找到任何本卡新增/修改痕迹**：四个被测路由文件（`roles/route.ts`、`roles/[id]/route.ts`、`users/route.ts`、`users/[id]/route.ts`）仍为 SEC-01/02 收口后的原状（见第五节 `file:line`），未出现本卡测试专用代码；`src/lib/authz/**` 未出现本卡测试专用代码。
- 说明：本子代理无 `git` 工具，**无法独立确认 `e7f149c` 的 `--stat` 精确文件清单**。上述核对基于"卡允许路径"内的文件树 + 路由源码现状；与执行者声明（"仅 `src/lib/__tests__/security/escalation-blackbox.test.ts`"）静态一致。此项登记为"静态吻合、非 git 级证据"，交主代理在最终判定前以 `git show e7f149c --stat` 兜底复核。

### 3.2 允许清单核对

| 允许路径 | 复核结果 | 说明 |
|---|---|---|
| `src/lib/__tests__/security/escalation-blackbox*` | ✅ 唯一产物 | 仅 `escalation-blackbox.test.ts`，未新建伴随 helper |

### 3.3 禁止清单（冻结面）核对

| 禁止路径 | 是否触碰 | 证据 |
|---|---|---|
| `src/contracts/**` | 未触碰 | 路由仍按 `roleCreateSchema` / `userCreateSchema` / `idParamSchema` 解析；测试未改契约 |
| `prisma/schema.prisma` + 迁移 | 未触碰 | 无迁移痕迹；测试仅 mock `prisma`，不改 schema |
| `src/app/**` | **未触碰** | 见 3.1；四个被测路由为 SEC-01/02 原状（第五节 `file:line`） |
| `src/lib/authz/**` | 未触碰 | 测试仅 `import` 路由处理器，不 `import`/改 `escalation.ts` |
| `src/components/web/**`、`public/**` | 未触碰 | 无改动痕迹 |
| `package.json` / 锁 | 未触碰 | 无改动痕迹 |
| `vitest.config.ts` / playwright 配置 | 未触碰 | 无改动痕迹 |
| `.env*` | 未触碰 | 无改动痕迹 |

**结论：提交范围 ⊆ 允许清单，未触碰任何禁止路径。无越界项、无连带越界项。**

---

## 四、黑盒语义与接线核对（贴 file:line + 用例名）

### 4.1 测试工程结构（防自证关键点）

| 核对项 | 结论 | 证据 |
|---|---|---|
| 用例数量 | ✅ **8 个 `it`** | `escalation-blackbox.test.ts:71,79,84,92,101,106,115,126`（计数 8） |
| 直接 import 路由处理器（非纯函数） | ✅ 4 个路由全部 import | `escalation-blackbox.test.ts:33-36`：`roles/route` POST、`roles/[id]/route` PUT、`users/route` POST、`users/[id]/route` PUT |
| `vi.hoisted` 构造共享 mock（避免 hoist 问题） | ✅ | `escalation-blackbox.test.ts:22-28` |
| mock `prisma`（含 `prisma.user.create`，避免 TypeError） | ✅ | `escalation-blackbox.test.ts:24`（`user.create: vi.fn()`）；mock 注入 `escalation-blackbox.test.ts:30` |
| mock `requireAuth` | ✅ | `escalation-blackbox.test.ts:27`；注入 `escalation-blackbox.test.ts:31` |
| beforeEach 重置并给非超管会话 | ✅ | `escalation-blackbox.test.ts:65-68`（`editorSession`：`isSuper:false`，`permissions:["role:edit","role:create","user:create","user:edit"]`） |
| 不连 dev.db | ✅ | 全程 `vi.mock("@/lib/prisma")`，无真实 IO |

### 4.2 5 条攻击路径 + 正向用例覆盖核对

| 用例 | 触发语句（file:line） | 断言 | 路由接线判定（为什么是这个码） |
|---|---|---|---|
| **E1** 非超管 PUT 自己的角色 `isSuper=true` | `escalation-blackbox.test.ts:71-75` | `toBe(403)` | `rolePUT` → `roles/[id]/route.ts:31-39` 调 `assertRoleWriteAllowed`；`escalation.ts:81-85` **R1**：`callerRoleId(3) === targetRoleId(3)` → 403（`rolePUT` 读 `role.findUnique→roleSelf id:3`，`escalation-blackbox.test.ts:59,72`） |
| **E2a** 非超管 PUT `/roles/5` permissions 含 `user:delete` | `escalation-blackbox.test.ts:79-83` | `toBe(403)` | `roles/[id]/route.ts:37` 传 `permissions`；`escalation.ts:93-97` **R3** + `canGrantPermissions`（`escalation.ts:64-68`，`user:delete` 不被 `role:*` 覆盖）→ 403。R1 不触发（`callerRoleId 3 ≠ 5`），R3 独立兜住 |
| **E2b** 非超管 POST `/roles` permissions 含 `user:delete` | `escalation-blackbox.test.ts:84-88` | `toBe(403)` | `roles/route.ts:44-52` 调 assert（`role.findUnique→null` 走 POST 分支）；`escalation.ts:93-97` R3 → 403 |
| **E3** 非超管 POST `/users` `roleId=超管(1)` | `escalation-blackbox.test.ts:91-98` | `toBe(403)` | `users/route.ts:46-57`：`role.findUnique→roleSuper(isSuper:true)` → `requestedRoleIsSuper=true`；`escalation.ts:117-119` **U1** → 403 |
| **E4a** 非超管 PUT `/users/1` `{password}` | `escalation-blackbox.test.ts:101-105` | `toBe(403)` | `users/[id]/route.ts:29` `user.findUnique→userSuper(role.isSuper:true)`；`resetsPassword=true`；`escalation.ts:122-124` **U2** → 403（U3 L127-129 亦兜底） |
| **E4b** 非超管 PUT `/users/10` `{roleId:1}`（自升） | `escalation-blackbox.test.ts:106-111` | `toBe(403)` | `existing.id=10=callerUserId`；`requestedRoleId(1) ≠ callerRoleId(3)`；`escalation.ts:132-135` **U4** → 403（`requestedRoleIsSuper=true` 亦触发 U1） |
| **E5** 把最后一名超管改离超管角色 | `escalation-blackbox.test.ts:114-123` | `toBe(400)` | `requireAuth→superSession`；`user.findUnique→userSuper`；`role.findUnique→roleSelf`；`user.count→1`；`users/[id]/route.ts:41-44` 算 `lastSuper=true`；`escalation.ts:141-145` **U5** → **400** ✅（按卡定义 E5 返回 400） |
| **正向** 超管建用户 roleId=普通角色 | `escalation-blackbox.test.ts:125-133` | `toBe(201)` | `requireAuth→superSession`；`user.findUnique→null`；`role.findUnique→roleSelf(isSuper:false)` → `requestedRoleIsSuper=false`，全规则放行；`user.create` mock 返回 `{id:99, role:roleSelf}`；`users/route.ts:59-77` 走通 → `created()`（201） |

**结论：E1~E5 五条攻击路径全覆盖（E2、E4 各 2 变体），另附 1 条超管正向回归；E5 正确断言 400、其余越权断言 403、正向断言 201，与卡定义逐项吻合。**

### 4.3 状态码链路终检（`ApiHttpError` → `toErrorResponse` → `build` 的 HTTP status）

为避免"403/400/201 是否真的映射到 `res.status`"存疑，独立核对响应函数与异常转换：

- **异常 → 响应**：`src/lib/api-handler.ts:174-182` —— `err instanceof ApiHttpError` 时，`err.status===403 → forbidden()`、`===400 → error(message, 400)`、`===401 → unauthorized()`、其余对应契约码；`withApi` 捕获后经 `toErrorResponse` 返回（`api-handler.ts:167-169`）。
- **响应函数 → HTTP status**：
  - `src/lib/api-response.ts:30` `forbidden()` → `build(403, null, message, 403)` → **res.status = 403** ✅
  - `src/lib/api-response.ts:22` `error(message, code=400, status ?? code)` → **res.status = 400** ✅（E5 走 `api-handler.ts:175` 的 `error(err.message, 400)`）
  - `src/lib/api-response.ts:18` `created()` → `build(200, data, message, 201)` → **res.status = 201** ✅
- **结论**：4 个测试断言的期望码（403 / 400 / 201）与真实实现链路逐环吻合，不存在"断言了某码但实现返回另一码"的假通过空间。`src/app/api/roles/route.ts:58`、`users/route.ts:59` 的成功路径最终都返回 `created()`（201），与正向用例一致。

---

## 五、假通过风险分析（关键复核）

### 5.1 正向用例依赖 `logOperation` 静默吞错 —— 记为 F2

- `users/route.ts:71-75` 在创建成功后会调用 `logOperation`；`logOperation` 内部 `src/lib/log.ts:18` 调用 `prisma.operationLog.create`。
- 本测试的 mock（`escalation-blackbox.test.ts:23-26`）**只 mock 了 `prisma.user.*` 与 `prisma.role.*`，未 mock `prisma.operationLog`**。因此该调用会抛 `TypeError`，但 `src/lib/log.ts:33-35` 的 `catch` 静默吞掉，主流程继续 → 断言 201 仍成立。
- **影响**：不会造成假通过（201 判定仍真实反映路由主路径），但存在两处瑕疵：
  1. mock 不完整，导致 `logOperation` 分支实际走了异常路径而非成功路径，日志写入的接线未被验证（可改进项，非缺陷）。
  2. 正向用例的"成功"依赖"日志失败不阻断主流程"这一设计约定，未显式断言 `logOperation` 未被调用或 `operationLog.create` 被调用。
- **结论**：不判 FAIL，登记为**可改进项 F2**（mock 完整性 + 日志链路未覆盖）。建议在 mock 中加入 `operationLog: { create: vi.fn() }`，使正向用例更接近真实成功路径。

### 5.2 越权用例未显式断言"未写库" —— 记为 F3

- E1/E2/E3/E4 用例仅断言 `res.status === 403`，未断言 `m.prisma.role.create/update`、`m.prisma.user.create/update` **未被调用**。
- 判定：`assert*` 在写库前 `throw ApiHttpError`（`roles/route.ts:52`、`roles/[id]/route.ts:39`、`users/route.ts:57`、`users/[id]/route.ts:62`），403 即短路，写库必然不会执行，**不会产生假通过**。
- 但按防自证纪律，"越权被拒"最好同时用 `expect(m.prisma.user.create).not.toHaveBeenCalled()` 显式钉死。登记为**可改进项 F3**（非阻塞）。

### 5.3 E5 的 `prisma.user.count` 无 where 断言 —— 记为 F4

- `users/[id]/route.ts:42` 用 `prisma.user.count({ where: { isActive: true, role: { isSuper: true } } })` 判定 `lastSuper`；测试 mock `user.count.mockResolvedValue(1)` 未断言过滤条件。
- 若实现误把过滤写成"任意用户计数"，mock 返回 1 仍会让 E5 通过（假通过）。经查 `users/[id]/route.ts:41-44` 过滤条件正确（`isActive:true` + `role.isSuper:true`），**无真缺陷**；仅建议补 `expect(m.prisma.user.count).toHaveBeenCalledWith(expect.objectContaining({ where: ... }))`。登记为**可改进项 F4**。

### 5.4 其余：无假通过风险

- `requireAuth` 被 mock 返回 `{ok:true, session}`，跳过 401 分支——符合"测越权而非测鉴权"的卡目标，不构成假通过。
- E1 的 403 实际由 R1（改自己角色）触发而非 R2（设 isSuper）触发；**语义仍正确**（目标都是 403，且 E1 的"自升超管"意图被 R1 更早兜住），但若后续想单测 R2，需换一个 `callerRoleId ≠ targetRoleId` 的角色。登记为**可改进项 F5**（用例命名"自升超管"与实际触发规则 R1 略有偏差，不影响验收）。

---

## 六、命令证据

### 6.1 【缺口，未独立执行】`git show e7f149c --stat`

- 本子代理工具集中**无 `bash`**，调用 `bash` 返回 `Error: Unknown tool: bash`，无法亲自运行。
- 改为静态取证：`src/lib/__tests__/security/escalation-blackbox.test.ts` 是卡允许路径下唯一新增文件；四个被测路由无本卡改动痕迹；`src/lib/authz/**`、`src/contracts/**`、`prisma/**` 均无本卡痕迹（见第三节）。与执行者声明"仅 1 个测试文件"静态吻合，但**非 git 级证据**，交主代理兜底复核。

### 6.2 【缺口，未独立执行】`npx vitest run src/lib/__tests__/security/escalation-blackbox.test.ts`

- 无 `bash`，未独立运行。执行者声明 `8 tests passed`，与本文档第五节逐用例的静态推演结果（8 个 `it` 全部可推到期望码）**一致**。
- **未取得独立 exit code**，`PASS` 仅登记为"执行者声明 + 静态推演吻合"，不构成独立运行证据。

### 6.3 【缺口，未独立执行】`npx eslint src/lib/__tests__/security/escalation-blackbox.test.ts`

- 无 `bash`，未独立运行。静态观察：无未使用变量、无 `any` 泄漏、`vi.hoisted`/`vi.mock` 用法规范，未见 lint 硬错误迹象。不构成独立证据。

---

## 七、验收逐条 PASS / FAIL / UNKNOWN

| # | 验收条目（本卡定义） | 结果 | 依据 |
|---|---|---|---|
| 1 | 5 条攻击用例全部被拒 | **PASS** | E1→403、E2→403×2、E3→403、E4→403×2、E5→400（第四节逐条接线） |
| 2 | 正向用例通过（超管建用户→201） | **PASS** | `escalation-blackbox.test.ts:125-133`；`users/route.ts:40-83` 全路径走通（含 F2 观察，见 5.1） |
| 3 | 不修改任何 `src/app/**` | **PASS** | 见 3.3；四个被测路由为 SEC-01/02 原状，无本卡痕迹 |
| 4 | 提交文件 ⊆ 允许修改 | **PASS（静态）** | 仅 `src/lib/__tests__/security/escalation-blackbox.test.ts`；`git diff --name-only` 未独立复核（见 6.1） |
| 5 | 用例数量 = 8，含 E5→400、越权→403、正向→201 | **PASS** | 8 个 `it` 计数 + 期望码逐条核对（见 4.1/4.2） |
| 6 | 直接测路由处理器而非纯函数 | **PASS** | `escalation-blackbox.test.ts:33-36` 4 个路由 import |
| 7 | `vi.hoisted` + mock `prisma`（含 `user.create`）+ mock `requireAuth` | **PASS** | `escalation-blackbox.test.ts:22-31`；`user.create` 已 mock，避免正向用例 TypeError |
| 8 | 通用门禁（lint / vitest / tsc / build）exit 0 | **UNKNOWN** | 本子代理无 bash，未独立运行；引用执行者声明但未独立复核（见第六节） |

---

## 八、真缺陷与风险

### 8.1 无真缺陷（E# 不成立）

经逐用例接线核对：5 条攻击路径全部被对应规则拦截，**未发现"某攻击路径漏覆盖"、"断言码写错"、"mock 不完整导致假通过"的真缺陷**。具体排除项：

- E1 虽实际由 R1 触发（非 R2），但 403 语义正确，不构成缺陷。
- E4a 同时命中 U2/U3，E4b 同时命中 U4/U1，均为**双重兜底**，非漏覆盖。
- mock 缺 `prisma.operationLog` 未造成假通过（`logOperation` 设计上静默吞错）。

若存在上述缺陷将直接判 FAIL，此处明确排除。

### 8.2 可改进项 / 边界风险（不计入 FAIL，仅登记）

| 编号 | 级别 | 描述 | 建议 |
|---|---|---|---|
| **F2** | 中 | 正向用例 mock 未含 `prisma.operationLog.create`，`logOperation` 实际走异常静默路径，日志接线未被验证 | mock 中加 `operationLog: { create: vi.fn() }` |
| **F3** | 中 | 越权用例只断言 403，未断言 `prisma.role/user.create/update` 未被调用 | 补 `expect(m.prisma.user.create).not.toHaveBeenCalled()` |
| **F4** | 低 | E5 未断言 `prisma.user.count` 的过滤条件（`isActive:true` + `role.isSuper:true`），有理论假通过空间（实现无误，仅断言不完备） | 补 `expect(m.prisma.user.count).toHaveBeenCalledWith(...)` |
| **F5** | 低 | E1 用例命名"自升超管"，实际触发 R1（改自己角色）而非 R2（设 isSuper），R2 未被 E1 独立覆盖 | 若要单测 R2，需另加"改其他角色 isSuper=true"用例 |
| **F6** | 低 | 黑盒语义用 `Request` 构造，未起真实 HTTP 服务器、未连真实 DB，属"半黑盒"（IO 已 mock） | 按卡边界不扩；真实 HTTP 403 冒烟由 V7-UI-02 / W2-05 承接 |

### 8.3 证据缺口（影响完成度）——**全部已由主代理补齐**

| 缺口 | 影响 | 归属卡 | 主代理补齐 |
|---|---|---|---|
| ~~未独立执行 `git show e7f149c --stat`（无 bash；子代理提供的 hash 有误）~~ | 提交范围仅静态吻合 | **主代理已核实**：SEC-03 实际提交为 **`9cf5bec`**，实改 **2 文件**——`docs/.../V7-SEC-03/execution.md`（+97）与 `src/lib/__tests__/security/escalation-blackbox.test.ts`（+134）；**未含任何 `src/app/**`、`src/lib/authz/**`、`src/contracts/**`、`prisma/**`、配置、`.env*`** | PASS |
| ~~未独立执行 `npx vitest run ...escalation-blackbox.test.ts`~~ | 8 passed 仅声明 | **主代理已重跑**：`1 file / 8 tests passed`（11:21:33，Duration 887ms） | PASS |
| ~~未独立执行 `npx eslint ...escalation-blackbox.test.ts`~~ | 0 errors 仅声明 | **主代理已重跑**：`exit 0`（0 errors） | PASS |
| 未跑 `npm run build` / `test:visual` | 本卡仅改测试文件；build/视觉由集成者/W2 统一跑 | W2 / 集成者 | 待后续卡 |

---

## 九、最终判定

**PASS-with-findings（完成度 100%，命令级独立运行证据已由主代理全部补齐）。**

- 代码/测试实现：**正确且接线完整**。8 个 `it` 全部可独立推演到期望码（E1→403、E2→403×2、E3→403、E4→403×2、E5→400、正向→201），E1~E5 五条攻击路径全覆盖并加一条超管正向回归；`vi.hoisted` + mock `prisma`/`requireAuth` 规范，直接测 4 个路由处理器而非纯函数，有效防自证。
- 合规性：**未触碰任何禁止路径**。SEC-03 提交为 **`9cf5bec`**，实改 **2 文件**（`docs/.../V7-SEC-03/execution.md` + `src/lib/__tests__/security/escalation-blackbox.test.ts`），无任何 `src/app/**`、`src/lib/authz/**`、`src/contracts/**`、`prisma/**`、配置、`.env*` 改动。无越界项、无连带越界项。
- 独立门禁（主代理补齐）：`npx vitest run src/lib/__tests__/security/escalation-blackbox.test.ts` → **1 file / 8 tests passed**（11:21:33）；`npx eslint src/lib/__tests__/security/escalation-blackbox.test.ts` → **exit 0（0 errors）**。
- 无真缺陷：5 条攻击路径全部被对应规则拦截；未发现假通过、断言写错、mock 不完整导致的真缺陷。
- 可改进项（不阻塞）：**F2** mock 未含 `prisma.operationLog`、**F3** 未断言"未写库"、**F4** E5 未断言 `user.count` 过滤条件、**F5** E1 实际由 R1 触发（R2 未被独立覆盖）、**F6** 半黑盒（IO 已 mock）。这些属测试完备度优化，不阻塞交付。
- **结论不阻塞推进**；真实 HTTP 403 冒烟（连真实 DB）由 V7-UI-02 / W2-05 承接。