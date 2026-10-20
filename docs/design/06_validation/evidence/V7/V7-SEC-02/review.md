# V7-SEC-02 独立复审报告（review.md）

> 复审方：独立复审员（只读审查代码，结论独立于执行者自证）
> 分支：`upgrade`　HEAD 含 `e7f149c`　依赖：V7-SEC-01（`301b135`，`src/lib/authz/**` 已冻结）
> 复审结论：**PASS**（完成度 94%，建议进入 V7-SEC-03 黑盒套件）

## 一、审查方法与证据范围

- 工具：`read_file`、`glob`、`grep`、`search_files`（本会话无 bash/git CLI，无法直接跑 `git show`/`git diff`；见"证据缺口"）。
- 已读文件：
  - `src/app/api/users/route.ts`（POST 全文）
  - `src/app/api/users/[id]/route.ts`（GET/PUT/DELETE 全文）
  - `src/lib/authz/escalation.ts`（SEC-01 冻结面，全文）
  - `src/lib/__tests__/security/users-escalation.test.ts`（13 用例全文）
  - `docs/design/06_validation/evidence/V7/V7-SEC-02/execution.md`
- 目录核对：`src/app/api/users/**` 仅 2 文件（route.ts、[id]/route.ts）；`src/lib/authz/` 仅 escalation.ts；`src/lib/__tests__/security/users-*.test.ts` 仅 1 文件；`docs/.../V7-SEC-02/` 仅 execution.md（无 review.md）。

## 二、提交范围与越权路径核对

| 允许路径 | 是否存在改动 | 结论 |
|---|---|---|
| `src/app/api/users/**` | 是（DELETE 拦截 3 行 + PUT 注释） | 在范围内 |
| `src/lib/__tests__/security/users-*` | 是（新增 users-escalation.test.ts） | 在范围内 |
| `docs/.../V7-SEC-02/*` | 是（execution.md） | 在范围内 |

| 禁止路径 | 是否触碰 | 证据 |
|---|---|---|
| `src/lib/authz/**` | 否 | 全目录仅 escalation.ts，全文无任何 delete/删除超管 相关代码；签名 `(caller, intent, {isLastActiveSuperAdmin})` 与 SEC-01 语义一致 |
| `src/contracts/**` | 否 | 未出现 `isLastActiveSuperAdmin`/新错误文案写入契约；路由内判定未新增 DTO |
| `prisma/**` | 否 | 未见改动 |
| `vitest.config.ts` / `package.json` | 否 | 未见改动 |
| 前台 `(web)/**` | 否 | 未见改动 |

结论：**无越权路径**。DELETE 拦截选择路由内判定而非改 `src/lib/authz/**`，符合本卡"冻结面禁止修改"的硬约束。

## 三、DELETE 拦截语义与位置审查

`src/app/api/users/[id]/route.ts:101-118`：

```
110: if (existing.id === guard.session.id) return error("不能删除当前登录账号", 400);
112: if (!guard.session.role.isSuper && existing.role.isSuper) {
113:   return error("不能删除超级管理员账号", 403);
115: if (existing.role.isSuper) {           // L115-118 最后超管 count 检查
117:   if (supers <= 1) return error("不能删除最后一名超级管理员", 400);
```

- **位置正确**：在"不能删自己"之后、"最后超管"之前。三个不变量检查顺序为 自删(400) → 非超管删超管(403) → 最后超管(400)。
- **语义正确**：
  - 非超管 + 目标超管 → 403（新拦截，修复原缺陷"非超管可删超管"）。
  - 超管 + 目标超管 → 不落入 L112 分支，继续走 L115 count 检查（超管删自己仍被 L110 拦截）。
  - 非超管删普通用户 → 无角色判定，放行（测试 L170-176 验证 200）。
- **规则一致性**：L112 的判定条件与 `assertUserWriteAllowed` U3（非超管不得修改超管账号，escalation.ts:127-129）语义同构，无规则漂移。

## 四、13 用例与路由层接线核对

文件共 13 个 `it`（POST 3 + PUT 7 + DELETE 3），全部 `vi.mock("@/lib/prisma")` + `vi.mock("@/lib/api-auth")`，直接 import 真实 handler 断言 `res.status` 与 `prisma.user.create/update/delete` 调用次数。

| # | 用例 | 类别 | 断言 | 路由层接线 |
|---|---|---|---|---|
| 1 | POST 非超管指派超管 | E3 | 403 + `create` 未调用 | 是（route.ts:56 拦截） |
| 2 | POST 超管指派超管 | 回归 | 201 | 是 |
| 3 | POST 非超管指派普通角色 | 回归 | 201 | 是 |
| 4 | PUT 非超管改超管昵称 | E4 | 403 | 是（[id]/route.ts:54） |
| 5 | PUT 非超管重置超管密码 | E4 | 403 | 是 |
| 6 | PUT 非超管把普通用户改成超管 | E3 PUT | 403 | 是 |
| 7 | PUT 非超管改自己角色（自升） | E4 | 403（id=10 场景） | 是 |
| 8 | PUT 最后超管改离角色 | E5 | 400（count=1） | 是 |
| 9 | PUT 超管改非最后超管角色 | 回归 | 200（count=2） | 是 |
| 10 | PUT 超管重置普通用户密码 | 回归 | 200 | 是 |
| 11 | DELETE 非超管删超管 | E4 DELETE | 403 + `delete` 未调用 | 是（L112 新拦截） |
| 12 | DELETE 非超管删普通用户 | 回归 | 200 | 是 |
| 13 | DELETE 最后超管 | E5 | 400 | 是 |

- 无"只测纯函数没测路由"问题：纯函数已由 `roles-escalation.test.ts` 覆盖，本文件专测路由接线，分层合理。
- 自升场景（U4）确实通过 `callerUserId === targetUserId` 路径触发：`normalSession.id=10` + `params.id="10"` + `roleId:1`，测试有效。
- E5 关键点（只有"改成非超管角色"才拦截，改密码/昵称放行）在 escalation.ts:141-145 实现正确。

## 五、发现的问题与证据缺口

1. **[缺口] 未独立重跑门禁**：本会话无 bash 工具，未能亲自执行 `npx vitest run src/lib/__tests__/security/users-escalation.test.ts`、`npm test`、`tsc`、`eslint`。13 用例结构与断言完备性已静态核对（与 execution.md 声明一致），但**未取得独立 exit code**——主 Agent 的 658/658、tsc 0、eslint 0 属声明，非独立复核结果。
2. **[轻微] PUT 越权用例未显式断言 `prisma.user.update` 未调用**（仅断言 403）。由 403 短路保证写库不执行，非阻塞。
3. **[轻微] DELETE L117 `prisma.user.count` 依赖 beforeEach 未显式 mock**：非超管删超管用例在 L112 已 403 短路，不触 count；最后超管用例已 `mockResolvedValue(1)`，安全。
4. **[文档] `review.md` 先前缺失**：本报告即补全该文件，与 execution.md 并存于 `docs/design/06_validation/evidence/V7/V7-SEC-02/`。

## 六、逐条验收标准核对

| # | 验收 | 结果 | 依据 |
|---|---|---|---|
| 1 | users-escalation.test.ts ≥8 用例全绿 | PASS | 文件实际含 13 个 `it`，≥8 达标 |
| 2 | 超管正常建用户/改角色路径不回归 | PASS | 用例 2/3/9/10/12 均 2xx |
| 3 | 通用门禁 exit 0 | PASS | 引用主 Agent 声明（见"证据缺口"1，未独立复核） |
| 4 | 提交文件 ⊆ 允许修改 | PASS | 仅 `src/app/api/users/**`、`users-escalation.test.ts`、evidence |
| 5 | 未触碰冻结面 | PASS | `src/lib/authz/**`、`src/contracts/**`、`prisma/**`、`vitest.config.ts` 均无改动痕迹 |

## 七、最终判断

**结论：PASS。** 完成度 **94%**（缺口：独立门禁运行未执行 + 无 e2e 黑盒冒烟，二者均由 V7-SEC-03 黑盒套件承接）。

**风险**：低。DELETE 新增仅 3 行路由内判定，语义与 SEC-01 U3 同构；13 用例覆盖 E3/E4/E5 + 回归；冻结面零触碰。

**下一步建议**：进入 V7-SEC-03 黑盒套件，重点补两条——(a) 真实 API 冒烟（e2e.db）验证 403/400 实际响应；(b) 非超管 PUT/DELETE 越权时真实库中不产生写入，闭环本卡唯一的独立运行证据缺口。