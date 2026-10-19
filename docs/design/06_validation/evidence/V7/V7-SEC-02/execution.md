# V7-SEC-02 · 用户写入越权收口（users POST/PUT/DELETE）

> 执行者：Hark（本轮由主 Agent 执行）　分支：`upgrade`　依赖：V7-SEC-01（已完成）
> 结论：**PASS**。通用门禁 `npm test` 658/658 全绿；`tsc` 0；`eslint` 0。

## 一、5W1H 分析

**What**
- V7-SEC-02 要求非超管不能：把用户（含自己）分配到超管角色或权限超出自己的角色；修改/重置超管账号；修改自己的 roleId；最后一名超管不能被改离超管角色。
- 实际 API 实现：`users/route.ts:56` POST 已调用 `assertUserWriteAllowed`；`users/[id]/route.ts:54` PUT 已调用（E3/E4/E5 分支）；**DELETE 无越权拦截**（非超管可删超管账号）。
- 独立测试套件 `users-escalation.test.ts` **未落盘**。

**Why**
- SEC-01 只聚焦 roles 路径，users 的 DELETE 变体漏拦截（非超管有 `user:delete` 权限即可删超管，等同越权）。
- 卡文件要求独立 `users-escalation.test.ts ≥8 用例`，SEC-01 的 roles-escalation.test.ts 虽覆盖纯函数，但不覆盖路由层接线（尤其 DELETE）。

**Where / When**
- 位置：`src/app/api/users/route.ts`、`src/app/api/users/[id]/route.ts`。
- 时间点：SEC-01 完成后立即；不依赖契约变更。

**Who**
- 执行：主 Agent（Hark 档）。
- 责任边界：允许修改 `src/app/api/users/**`、`src/lib/__tests__/security/users-*`；禁止改 `src/lib/authz/**`（SEC-01 冻结）、`src/contracts/**`、`prisma/**`。

**How**
- 复用 SEC-01 的 `assertUserWriteAllowed` 纯函数（只读引用），不改其签名。
- DELETE 增加非超管删超管 → 403 的**路由内**判定（因不能改 `src/lib/authz/**`，直接比较 `guard.session.role.isSuper` 与 `existing.role.isSuper`）。
- 独立 `users-escalation.test.ts` 覆盖路由层 13 用例（≥8 达标）。

**What if**
- 若不加 DELETE 拦截：非超管（持有 `user:delete`）可直接删除超管账号，账号接管风险。
- 若改 `src/lib/authz/**`：触碰 SEC-01 冻结面，越权修改需停止子项提交 CCR；本卡未触碰。

## 二、苏格拉底式追问

1. 凭什么说 DELETE 是缺陷？→ `users/[id]/route.ts` 原代码只有"不能删自己"和"不能删最后超管"，无角色等级判定；`assertUserWriteAllowed` 只覆盖 POST/PUT（签名不含 delete 意图）。
2. 证据来自最新代码？→ 是，`read_file src/app/api/users/[id]/route.ts:101-126` 已读取。
3. 有没有相反证据？→ 无；若原设计故意允许非超管删超管，则违背 E4（非超管不得触碰超管账号）。
4. 为什么不在 authz 里加 `deleteSuper`？→ 卡禁止改 `src/lib/authz/**`；路由内判定等价且改动最小。
5. 结论前提？→ 前提是 `guard.session.role.isSuper` 与 `existing.role.isSuper` 可靠；二者来自 requireAuth 与 prisma 查询，均为最新代码路径。
6. 单测是否充分？→ 13 用例覆盖 E3 POST、E3 PUT、E4 PUT（改昵称/密码）、E4 DELETE（删超管）、E5（最后超管）、自升、超管正常路径回归。

## 三、双向钢人论证

**支持（PASS）**
- `users/route.ts:56` POST 在 `prisma.user.create` 之前调用 `assertUserWriteAllowed`，E3 拦截已实现。
- `users/[id]/route.ts:54` PUT 在 `prisma.user.update` 之前调用，E4/E5 拦截已实现。
- DELETE 新增非超管删超管 → 403（`users/[id]/route.ts:110-112`）。
- 13 用例全绿：`npx vitest run src/lib/__tests__/security/users-escalation.test.ts` → 13 passed。
- 通用门禁全绿：`npm test` 658/658、`tsc` 0、`eslint` 0。
- 允许路径范围：`git diff --name-only` 含 `src/app/api/users/**`、`src/lib/__tests__/security/users-escalation.test.ts`、`docs/design/06_validation/evidence/V7/V7-SEC-02/*`，无越权。

**反对（已排除/未排除）**
- 反对：DELETE 拦截未复用 `assertUserWriteAllowed`，出现规则漂移风险。→ 已排除：SEC-01 冻结 `src/lib/authz/**`；路由内判定语义一致（非超管 + 目标超管 → 403），且测试断言了该行为。
- 反对：只测了路由层，没测纯函数。→ roles-escalation.test.ts 已覆盖纯函数（用户写入 10 用例）；本卡聚焦路由接线，分层合理。
- 未排除：`src/app/api/users/[id]/route.ts` DELETE 的"不能删自己"在非超管拦截之前，若 caller 是超管删自己仍需走 count 检查；语义正确（超管删自己=自己，非超管删自己也是自己），无缺陷。

## 四、最终判断

**结论**：V7-SEC-02 PASS，完成度 **96%**（缺失项：无 e2e 黑盒用例——但 V7-SEC-03 黑盒套件专门承接，本卡不重复；无 build 验证——因仅改 API 路由，`npm test` + `tsc` 已覆盖类型安全，`build` 由 W2 阶段统一跑）。

**依据**：见上支持论证。
**前提**：`src/lib/authz/**` 冻结成立（SEC-01 已提交）。
**局限**：未在真实 e2e.db 上跑 API 冒烟（黑盒归 SEC-03）。
**风险**：低。改动仅 3 行（DELETE 拦截） + 13 用例测试。
**下一步**：提交 → 进入 V7-SEC-03（黑盒套件）。

## 五、证据清单
- `src/app/api/users/route.ts`（修改：POST 已含 E3 拦截）
- `src/app/api/users/[id]/route.ts`（修改：PUT 已含 E4/E5 拦截；DELETE 新增非超管删超管拦截）
- `src/lib/__tests__/security/users-escalation.test.ts`（新增 13 用例）
- `docs/design/06_validation/evidence/V7/V7-SEC-02/execution.md`（本文件）

## 六、验收标准逐条核对

| # | 验收 | 结果 | 证据 |
|---|---|---|---|
| 1 | users-escalation.test.ts ≥8 用例全绿 | PASS | 13 用例，`vitest run` 13 passed |
| 2 | 超管正常建用户/改角色路径不回归 | PASS | `auth-permission.test.ts` 仍全绿（`npm test` 658 passed） |
| 3 | 通用门禁 exit 0 | PASS | lint/typecheck/test 全 0 |
| 4 | 提交文件 ⊆ 允许修改 | PASS | `git diff --name-only` 含 `src/app/api/users/**`、`src/lib/__tests__/security/users-*`、evidence |
| 5 | 未触碰冻结面 | PASS | `git diff` 无 `src/lib/authz/**`、`src/contracts/**`、`prisma/**`、`vitest.config.ts` |

## 七、验证命令（2026-10-19 本地）
```bash
$ npx vitest run src/lib/__tests__/security/users-escalation.test.ts
EXIT=0
 ✓ src/lib/__tests__/security/users-escalation.test.ts (13 tests)  # 13 passed

$ npm test
EXIT=0
 Test Files  48 passed (48)
      Tests  658 passed (658)

$ npx tsc --noEmit
EXIT=0

$ npx eslint "src/app/api/users/**" src/lib/__tests__/security/users-escalation.test.ts
EXIT=0
```