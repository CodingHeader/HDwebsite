# V0.7 执行记录 · 第 1 轮（2026-10-19）

> 分支 `upgrade` 单主线。本文件记录本轮完成的卡、改动、子智能体审查结论与门禁证据。
> 基线：本地 `upgrade` == `origin/upgrade` == `61d546e`（比规划基线 `4cbd9c1` 更新，V0.7 规划包已在库）。

## 1. STEP-0 双端同步
- `git fetch origin` + 工作区状态：`## upgrade...origin/upgrade`，无领先落后。
- `git rev-parse HEAD origin/upgrade` → 均 `61d546e`，双端一致 `已确认`。
- 未触碰 `main`（与 `upgrade` 无共同祖先，禁止互合）。

## 2. V7-SEC-01 角色/用户写入越权收口
### 2.1 改动
- 新增 `src/lib/authz/escalation.ts`：纯函数模块（无 IO / 无 prisma）。
  - `canGrantPermissions(caller, requested)`：权限子集判定，与 `hasPermission` 语义一致（isSuper 直通 / `*` / `module:*`）。
  - `assertRoleWriteAllowed(caller, intent)`：R1 不能改自己所属角色 / R2 仅超管设 isSuper / R3 权限子集。
  - `assertUserWriteAllowed(caller, intent, opts)`：U1 指派超管角色(E3) / U2 重置超管密码(E4) / U3 触碰超管账号(E4) / U4 自改角色 / U5 最后一名超管不可改离(E5)。
- 修改 4 个路由，写库前调用：
  - `src/app/api/roles/route.ts`（POST，E1/E2）
  - `src/app/api/roles/[id]/route.ts`（PUT，E1/E2 + 权限误覆写修复 `!== undefined`）
  - `src/app/api/users/route.ts`（POST，E3）
  - `src/app/api/users/[id]/route.ts`（PUT，E3/E4/E5）
- 新增 `src/lib/__tests__/security/roles-escalation.test.ts`（21 用例）。

### 2.2 三轮子智能体审查
| 轮次 | 结论 | 关键发现 |
|---|---|---|
| R1 静态审查 | FAIL | 阻断：E3 在 PUT 漏拦截（传 `existing.role.isSuper` 而非目标角色） |
| R2 复审（结果丢失） | — | 子代理环境无 bash，静态审查 |
| R3 只读复审 | FAIL（方向需修正） | 判定"B1 回归"（最后一名超管无法自助写入），经 execute_code 推演**方向错误**；但引导发现真缺陷：U5 用 `targetRoleIsSuper`（目标角色）作触发前提，改离场景反而 `false` 绕过 E5 |
| R4 最终只读复审 | **PASS** | 重构 `UserWriteIntent` 显式区分当前/目标角色；E1~E5 全拦截；超管不回归 |

### 2.3 真缺陷修复（R3 引导 + 主代理推演确认）
- **原 U5 逻辑矛盾**：`if (lastSuper && targetRoleIsSuper && requestedRoleId!=null)` —— 改离超管时目标角色 `isSuper=false`，导致 U5 永不触发，E5 形同虚设。
- **重构**：`UserWriteIntent` 增加 `requestedRoleIsSuper`（目标角色），保留 `targetRoleIsSuper`（当前角色）。
  - U1(E3) 用 `requestedRoleIsSuper`；U2/U3(E4) 用 `targetRoleIsSuper`；U5 改为 `targetRoleIsSuper && requestedRoleId!=null && !requestedRoleIsSuper`。
- **防 B1 回归**：新增用例「最后一名超管仅改密码/仅改昵称 → null」。

### 2.4 门禁证据（实际运行）
| 命令 | 结果 |
|---|---|
| `npx vitest run src/lib/__tests__/security/roles-escalation.test.ts` | EXIT=0，21 tests passed |
| `npx tsc --noEmit -p tsconfig.json` | EXIT=0（0 输出） |
| `npx eslint src/lib/authz/escalation.ts src/lib/__tests__/security/roles-escalation.test.ts src/app/api/roles src/app/api/users` | EXIT=0，0 errors（3 处 `_ph` warning 为既有） |
| 冻结面 | 未触碰 `src/contracts/**`、`prisma/**`、`vitest.config.ts`、`(web)/**`、`public/**` |

### 2.5 越权路径覆盖（对照 00 §3）
| 编号 | 路径 | 结果 |
|---|---|---|
| E1 | 非超管 PUT 角色 isSuper=true | 403 ✅ |
| E2 | 非超管授予自身没有的权限 | 403 ✅ |
| E3 | 非超管指派/改成超管角色（POST+PUT） | 403 ✅ |
| E4 | 非超管重置超管密码 / 改超管账号 | 403 ✅ |
| E5 | 把最后一名超管改离超管角色 | 400 ✅ |

## 3. V7-T-01 测试隔离
- `src/lib/__tests__/lane-c/kb-coze.test.ts`：queue 用例 spyOn `prisma.setting.findMany` / `prisma.knowledge.findMany` 返回空，避免干净检出时读未迁移的 `prisma/dev.db`（报 `no such column Knowledge.baseId`）。
- `src/lib/__tests__/lane-c/kb-api.test.ts`：`beforeAll` 预热 `await import("mammoth")`，避免 docx 用例因 mammoth 冷加载 5s 超时（不改全局 vitest.config.ts）。
- 门禁：`npx vitest run src/lib/__tests__/lane-c/kb-coze.test.ts` EXIT=0（8 tests，90ms）；`kb-api.test.ts` EXIT=0（21 tests，2.66s）。

## 4. V7-G-01 治理同步
- `AGENTS.md` §4 编排段改为「V0.7 单主线」，lane 分支记录为已删除并注明"已废止"；入口指向 `docs/V0.7-20261019/README.md`。
- §4 冻结面/所有权段：`w1-base`/`w1-base-ccr-1` tag 引用改写为提交号 `f158501`。
- §5 推送规则：`upgrade` 单主线 + 逐卡独立验证后小提交即推。
- §8 证据分桶：新增 `evidence/V7/<卡号>/`。
- 校验：`grep -c "lane/"` → 1（仅"已废止"说明）；`grep -c "V0.7"` → 4；tag 引用 0。

## 5. 待办（后续轮次）
- 32 张 W1 卡补独立验收。
- D 线（env/Docker/存储/性能/CI/审计）与 B 线（publish/quietHours/uploadimg）未开工项。
- 推送前需用户批准（git push 纪律）。
- V7-SEC-02（黑盒用例）、V7-UI-02（visual/e2e）待跑。