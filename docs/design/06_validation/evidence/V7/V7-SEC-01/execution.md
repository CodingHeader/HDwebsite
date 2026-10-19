# V7-SEC-01 执行证据

> 卡：V7-SEC-01（角色写入越权收口）　执行者：主代理　分支：`upgrade`（单主线）
> 状态：**PASS**（经 4 轮子代理独立复审；最终 R4 完成度 100%）

## 1. 5W1H 简版
- **What**：非超管持 `role:edit/role:create/user:create/user:edit` 时存在 E1~E5 越权路径；本次收口为「写库前纯函数判定 + 403/400 返回」。
- **Why**：V0.6/V0.4 遗留，账号接管级风险；只做 `requireAuth` 权限点放行不足以约束"写库目标"。
- **Where**：`src/app/api/roles/**`、`src/app/api/users/**`，新模块 `src/lib/authz/escalation.ts`。
- **When**：在 `prisma.role.create/update`、`prisma.user.create/update` 之前判定。
- **Who**：Hark 语义；主代理实现；子代理 R1~R4 独立审查。
- **How**：TDD 先写失败用例 → 纯函数模块 → 4 路由接入 → 三轮子代理审查迭代 → 门禁复核。

## 2. 改动文件
| 文件 | 类型 |
|---|---|
| `src/lib/authz/escalation.ts` | 新增 |
| `src/lib/__tests__/security/roles-escalation.test.ts` | 新增（21 用例） |
| `src/app/api/roles/route.ts` | 修改 |
| `src/app/api/roles/[id]/route.ts` | 修改 |
| `src/app/api/users/route.ts` | 修改 |
| `src/app/api/users/[id]/route.ts` | 修改 |

## 3. 门禁输出摘要
```bash
$ npx vitest run src/lib/__tests__/security/roles-escalation.test.ts
✓ 21 tests passed (2ms)     EXIT=0

$ npx tsc --noEmit -p tsconfig.json
EXIT=0（0 输出）

$ npx eslint src/lib/authz/escalation.ts src/lib/__tests__/security/roles-escalation.test.ts src/app/api/roles src/app/api/users
EXIT=0（0 errors；3 处 `_ph` warning 为既有代码）
```

## 4. 越权路径验收逐条
| 编号 | 攻击 | 期望 | 实测 | 状态 |
|---|---|---|---|---|
| E1 | 非超管 PUT 自己角色 `{isSuper:true}` | 403 | 403（R1+R2） | PASS |
| E2 | 非超管授予自身没有的权限 | 403 | 403（R3） | PASS |
| E3 | 非超管 `roleId=超管角色`（POST + PUT 变体） | 403 | 403（U1，目标角色判定） | PASS |
| E4 | 非超管重置超管密码 / 自升角色 | 403 | 403（U2+U3+U4） | PASS |
| E5 | 把最后一名超管改离超管角色 | 400 | 400（U5，`requestedRoleIsSuper=false`） | PASS |

超管回归：创建/修改含 `isSuper:true` 角色 ✅；改非最后一名超管 ✅；最后一名超管仅改密码/昵称 ✅（不回归）。

## 5. 子代理审查迭代
| 轮次 | 结论 | 处置 |
|---|---|---|
| R1 | FAIL（E3 PUT 漏拦截） | 修 `targetRoleIsSuper` 传入 |
| R2 | （结果丢失，无结论） | — |
| R3 | 声称 B1 回归（方向错误），但引导发现真缺陷 U5 语义错位 | execute_code 推演证伪 B1，确认 U5 真缺陷 |
| R4 | **PASS 100%** | 显式区分当前/目标角色，补防 B1 回归用例 |

**真缺陷**：原 U5 `lastSuper && targetRoleIsSuper && requestedRoleId!=null` 中，改离场景 `targetRoleIsSuper=false`（目标角色），导致 U5 永不触发，E5 形同虚设。R4 已通过重构修复。

## 6. UNKNOWN 及原因
- 未做真实 HTTP 黑盒请求（未起服务）；判定基于源码 + 纯函数单测 + 逻辑推演。
- 未触碰 `src/contracts/**`、`prisma/**`、`vitest.config.ts`、`(web)/**`、`public/**`（冻结面）。

## 7. 后续方向待办
- V7-SEC-02（黑盒用例，需要起服务）。
- V7-SEC-03（安全边界检查）。