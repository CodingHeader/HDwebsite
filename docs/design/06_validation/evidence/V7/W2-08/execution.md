# W2-08 执行证据：ESLint 边界规则 + 13-响应设计同步 + CCR 收尾

> 卡定义：`docs/V0.7-20261019/tasks/W2-08.md`（允许修改：`eslint.config.mjs`、`docs/design/13-响应设计.md`、`src/lib/jobs/index.ts`、`src/lib/__tests__/**`、`docs/design/06_validation/evidence/V7/W2-08/**`）
> 执行：2026-10-21 ｜ 分支 `upgrade`（无新建分支）

## 1. 三项目标的落地结果

| 目标 | 要求 | 结果 |
|---|---|---|
| 1 | `eslint no-restricted-imports`：`src/lib` 禁止 import `@/app/**`（**error**） | **已落地**，规则真实生效（反向验证见 §3） |
| 2 | 路由内禁止定义请求体 zod（**error**） | **已落地**（覆盖全部路由）；唯一存量违例 `apply/route.ts` 按 CCR 规程阻断并豁免，见 `CCR-W2-08-01.md` |
| 3 | B-06 依赖：`notify.scan → flushDeferred()` 注册 + 单测 | **已落地**，2 用例通过；反向验证证明非空测试 |

## 2. 改动文件

| 文件 | 类型 | 说明 |
|---|---|---|
| `eslint.config.mjs` | 修改 | 新增两个 `files` 作用域块：① `src/lib/**` 禁 `@/app/*`（`ignores` 豁免 `__tests__`）；② `src/app/api/**/route.ts` 禁 `z.object(...)` 请求体；③ 单文件豁免 `apply/route.ts`（CCR 过渡） |
| `src/lib/jobs/index.ts` | 修改 | `notify.scan` 增加 `flushDeferred()`，置于两个扫描之后 |
| `src/lib/__tests__/notify-scan-flush.test.ts` | 新增 | 2 用例：调用序列 + flushDeferred 必须最后 |
| `docs/design/13-响应设计.md` | 修改 | 新增 §8「2026-10-21 复核」，把 §7 两条历史坑的当前真实状态写清（一条已修、一条待前台卡） |
| `docs/design/06_validation/evidence/V7/W2-08/CCR-W2-08-01.md` | 新增 | apply 路由 zod 定义的契约变更请求 |
| `docs/design/06_validation/evidence/V7/W2-08/ccr-closure.md` | 新增 | CCR 积压逐条收尾台账 |
| `docs/design/06_validation/evidence/V7/W2-08/execution.md` | 新增 | 本文件 |

## 3. 规则有效性验证（关键：防「规则写成空壳」）

### 3.1 规则 1 能被真实触发

临时创建违规文件（已删除）：

```ts
// src/lib/__zz-rulecheck.ts
import { GET } from "@/app/api/logs/route";
export const probe = GET;
```

```bash
npx eslint src/lib/__zz-rulecheck.ts
# 1:1  error  '@/app/api/logs/route' import is restricted from being used by a pattern.
#             src/lib 不得依赖 src/app（分层单向：app → lib）…  no-restricted-imports
# ✖ 1 problem (1 error, 0 warnings)
```

### 3.2 规则 2 能被真实触发

临时创建违规路由（已删除）：

```ts
// src/app/api/__zzprobe/route.ts
import { z } from "zod";
const bodySchema = z.object({ a: z.string() });
export async function POST() { return Response.json(bodySchema.parse({ a: "x" })); }
```

```bash
npx eslint src/app/api/__zzprobe/route.ts
# 2:20  error  路由内不得定义请求体 zod schema；请在 src/contracts/** 定义后 import（DTO 唯一源）。
#               no-restricted-syntax
# ✖ 1 problem (1 error, 0 warnings)
```

### 3.3 对既有代码零误伤

```bash
npx eslint src/lib src/app/api
# exit=0，0 errors，32 warnings（均为既有 unused-vars / 失效 disable 注释）
```

> 首次配置时**确实误伤了 75 处**：`src/lib/**/__tests__/**` 下的契约测试需要直接 import route handler（这是 W2-02 全路由契约套件 865 用例的核心机制）。已通过 `ignores` 精确豁免测试目录，而非把规则降级为 warn——生产代码仍是 error 门禁。

## 4. notify.scan 接线的反向验证

```bash
# 1) 正常：2 passed
npx vitest run src/lib/__tests__/notify-scan-flush.test.ts
# → Test Files 1 passed (1) | Tests 2 passed (2)

# 2) 注释掉 await flushDeferred()（其余不动）
# → Test Files 1 failed (1) | Tests 2 failed (2)

# 3) 恢复
# → 2 passed
```

测试手法：mock `@/lib/prisma` 让 `scanOnce` 只看到一条到期 `notify.scan` 行，再 mock `notify-gateway` 的三函数记录调用顺序，走**真实 `scanOnce` 调度链路**执行 handler——验证的是「调度真会调到 flushDeferred」，不是「源码里有这个字符串」。

## 5. 验收逐条

| 验收项（卡定义） | 判定 | 证据 |
|---|---|---|
| `npm run lint` 0 error（含新规则） | **PASS** | exit=0，`0 errors / 68 warnings` |
| `ccr-closure.md` 每条 CCR 已落地/已关闭 | **PASS**（1 条待裁决，已按规程阻断） | `ccr-closure.md` §1；CCR-1 已落地于 ADR-034；CCR-W2-08-01 待裁决 |
| `notify.scan` 调用 `flushDeferred` 的单测通过 | **PASS** | §4，2 用例 + 反向验证 |
| 文档错误码表与 `src/contracts/common.ts` 一致 | **PASS** | 逐条核对 10 项 `errorCodes` 与 §3/§8；文档 §8 记录差异说明（429/502/503 为补充项，非冲突） |
| lint 计数以干净工作树为准 | **PASS** | `.cache/**` 已由 W0-11 忽略；本轮 68 warnings 稳定可复现 |
| 通用门禁 `lint && typecheck && test && build` 全 exit 0 | **PASS** | 见 §6 |

## 6. 通用门禁

```bash
npm run lint        # exit=0（0 errors / 68 warnings）
npx tsc --noEmit    # exit=0
npm test            # 见提交时快照
npm run build       # exit=0
```

## 7. 未达成 / 遗留

| 项 | 状态 | 归属 |
|---|---|---|
| 路由内 zod 规则的**无豁免**覆盖 | 1 个文件豁免中 | `CCR-W2-08-01` 批准后由契约员 + B 线落地，本卡再删豁免 |
| `useSettings.ts` 数组兼容分支清理 | 未做（前台冻结面） | 前台卡，随 `test:visual` 进行；已登记 `13-响应设计.md` §8 |
| `next` 16.4.2 升级（K10 critical RCE） | 未做（依赖冻结面） | 用户裁决；W2-03 已登记 |
