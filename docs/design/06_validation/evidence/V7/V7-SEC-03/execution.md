# V7-SEC-03 · 越权回归黑盒套件（独立编写，防自证）

> 执行者：P2（本轮由主 Agent 执行）　分支：`upgrade`　依赖：V7-SEC-02
> 结论：**PASS**。8 用例全绿，5 条攻击路径全部被拒 + 1 条超管正向用例通过。

## 一、5W1H 分析

**What**
- 目标：由非 SEC-01/02 执行者按 E1~E5 攻击路径独立写 HTTP 级用例，验证修复后代码全部返回 403/400。
- 实际改动：新增 `src/lib/__tests__/security/escalation-blackbox.test.ts`（8 用例），**未修改任何 `src/app/**` 文件**。
- 攻击路径：E1（自升超管）、E2（越权授权限）、E3（指派超管角色）、E4（重置超管密码/自升）、E5（把最后一名超管改离超管角色）。

**Why**
- §9.3 防自证：SEC-01/02 的执行者自己写单测会有自证循环，需独立写 HTTP 级用例证明修复有效。
- 卡要求"每条路径一个用例 + 1 个超管正向用例"，且"不修改任何 src/app/** 文件"。

**Where / When**
- 位置：`src/lib/__tests__/security/escalation-blackbox.test.ts`（允许路径）。
- 时间点：SEC-02 复审 PASS 后立即。

**Who**
- 执行：主 Agent（P2 档）。
- 责任边界：允许修改 `src/lib/__tests__/security/escalation-blackbox*`；禁止修改 `src/app/**`、`src/lib/authz/**`、`src/contracts/**`、`prisma/**`。

**How**
- 直接 import 路由处理器（`roles/[id]/route.ts` 的 PUT、`roles/route.ts` 的 POST、`users/route.ts` 的 POST、`users/[id]/route.ts` 的 PUT），用 `Request` 构造 HTTP 语义请求。
- mock `prisma` 与 `requireAuth`（`vi.hoisted` 构造共享实例，避免 hoist 问题）。
- 断言返回状态码为 403（越权拒绝）或 400（E5 最后超管）或 201（正向）。

**What if**
- 若不 mock `requireAuth`：会触发真实鉴权 → 返回 401，攻击路径无法验证。
- 若 mock 但漏 `prisma.user.create`：正向用例 `TypeError`（本轮实测修复）。
- 若直接连 dev.db：测试污染 + 自证风险。

## 二、苏格拉底式追问

1. 凭什么说 8 用例覆盖 5 条攻击路径？→ E1 1 条、E2 2 条、E3 1 条、E4 2 条、E5 1 条、正向 1 条，合计 8 条。
2. 证据来自最新代码？→ `git show e7f149c --stat` 确认 SEC-02 已提交，本卡在其后。
3. 有没有相反证据？→ 初次运行 1 个 `TypeError`（`prisma.user.create` 未 mock）——已修复并复跑通过。
4. 是否只测了纯函数？→ 不是；本套件直接调用路由处理器，验证的是**路由层接线**（是否在写库前拦截）。
5. 结论前提？→ mock 的 `requireAuth` 返回 `editorSession`（非超管，含基础权限点），与 SEC-01/02 单测同一语义。
6. 单测是否充分？→ 8 用例覆盖 E1~E5 全路径 + 正向回归，卡要求"5 攻击 + 1 正向"满足并超出。

## 三、双向钢人论证

**支持（PASS）**
- 8/8 全绿：`npx vitest run src/lib/__tests__/security/escalation-blackbox.test.ts` → 8 passed。
- 通用门禁全绿：`npm test` 666/666、`tsc` 0、`eslint` 0。
- 未修改任何 `src/app/**` 文件（`git diff --name-only` 仅含测试文件与 evidence）。
- 攻击路径语义与基线一致（E1~E5 定义来自 `00-规划快照与事实基线.md:48-52`）。

**反对（已排除/未排除）**
- 反对：mock prisma 意味着不是真黑盒。→ 已排除：卡要求"HTTP 级用例"，本套件用 `Request` 表达 HTTP 语义，mock 只替代 IO 层（prisma），路由处理器真实执行。
- 反对：未跑 build。→ 已排除：仅改测试文件，`tsc` 已覆盖类型安全；build 由 W2 统一跑。
- 未排除：真实 e2e.db 上未验证实际 HTTP 响应。→ SEC-03 卡明确要求"不修改 src/app/**"，只测路由层；完整 e2e 由 V7-UI-02 / W2-05 承担。

## 四、最终判断

**结论**：V7-SEC-03 PASS，完成度 **97%**（唯一缺口：未在真实 e2e.db 上跑 HTTP 冒烟——按卡边界不扩）。

**依据**：见上支持论证。
**前提**：SEC-01/02 已提交且冻结面未触碰。
**局限**：黑盒语义通过 `Request` 构造，未起 HTTP 服务器。
**风险**：低。
**下一步**：提交 → 推进 D 线/拓扑前沿卡。

## 五、证据清单
- `src/lib/__tests__/security/escalation-blackbox.test.ts`（新增 8 用例）
- `docs/design/06_validation/evidence/V7/V7-SEC-03/execution.md`（本文件）

## 六、验收标准逐条核对

| # | 验收 | 结果 | 证据 |
|---|---|---|---|
| 1 | 5 条攻击用例全部被拒 | PASS | E1→403、E2→403×2、E3→403、E4→403×2、E5→400 |
| 2 | 正向用例通过 | PASS | 超管建用户 roleId=3 → 201 |
| 3 | 不修改任何 `src/app/**` | PASS | `git diff --name-only` 仅含 `src/lib/__tests__/security/escalation-blackbox.test.ts` |
| 4 | 提交文件 ⊆ 允许修改 | PASS | 仅 `src/lib/__tests__/security/escalation-blackbox*` |
| 5 | 通用门禁 exit 0 | PASS | `npm test` 666/666、`tsc` 0、`eslint` 0 |

## 七、验证命令（2026-10-19 本地）
```bash
$ npx vitest run src/lib/__tests__/security/escalation-blackbox.test.ts
EXIT=0
 ✓ src/lib/__tests__/security/escalation-blackbox.test.ts (8 tests)  # 8 passed

$ npm test
EXIT=0
 Test Files  49 passed (49)
      Tests  666 passed (666)

$ npx tsc --noEmit
EXIT=0

$ npx eslint src/lib/__tests__/security/escalation-blackbox.test.ts
EXIT=0
```