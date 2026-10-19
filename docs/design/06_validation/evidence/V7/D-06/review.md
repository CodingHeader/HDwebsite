# D-06 独立复审报告（review）

> 被审方：主 Agent（D-06 实现，起点 24754b1）
> 复审范围：`upgrade` 分支未提交 D-06 改动（19 项）；基于卡单、`08-所有权矩阵.md`、`execution.md` 与全部相关源码实读。

## 总评：**PASS（有条件）**

实现正确、失效链路闭环，与 Next 16 源码语义一致；两项越界登记属规划遗漏下的**合理越界**。
放行条件（已在复审后逐项处理）：

1. ~~越界登记由规划侧确认并收编所有权矩阵~~（未处理，交集成者 W2-06/CCR）
2. ~~文档注释同步~~（已处理：`d-cache.spec.ts` 头部注释改为 `{ expire: 0 }`）
3. ~~CI/新环境建库先 `prisma migrate deploy` 再 build~~（环境前提，交 D-13 CI）
4. ~~补一条针对 `invalidateWebContent` 的 mock 断言~~（已处理：新增 `src/lib/__tests__/lane-d/cache-tags-invalidate.test.ts`，4 例 PASS）

## 逐文件判定表

| 文件 | 判定 | 依据 |
|---|---|---|
| `src/lib/cache-tags.ts` | 允许 | 矩阵 L113/114 |
| `src/lib/crud.ts` | 允许 | 矩阵 L123（D-06,D-11） |
| `src/lib/block-registry.ts` | 允许 | 矩阵 L113 |
| `src/components/web/data/{home,settings,navigation}.ts` | 允许 | 矩阵 L94（D-04,D-05,D-06） |
| `src/app/(web)/**` | 允许 | 矩阵 L65（D-05,D-06） |
| `tests/e2e/d-cache.spec.ts` | 允许 | 矩阵 L133 |
| `src/lib/settings.ts` | **越界-合理** | 矩阵未列；`/api/settings/**` 归 B-02 不可改；5.9.5.2 写路径只能落 `setSettings` |
| `src/app/api/home-blocks/reset/route.ts` | **越界-合理** | 矩阵未列 `/api/home-blocks/**`；唯一非 crud 写入口，不补失效点破坏 e-home-blocks 断言 |

## 实现正确性核对

- **A. `revalidateTag(tag, {expire:0})` 语义正确**：`next/dist/server/web/spec-extension/revalidate.js` L207-211 证明 `cacheLife.expire === 0` 时置 `ActionDidRevalidateStaticAndDynamic`（立即过期），非 SWR。evidence §3.2 记录 e-home-blocks 从 FAIL→PASS 对照。
- **B. `withWebCacheFallback` 低风险可接受**：仅匹配 `incrementalCache missing`（E469），其他错误 rethrow；生产 DB 错误不被吞。
- **C. crud 三处失效点位置正确**：均在 `delegate(...)` 成功之后、`logOperation` 之前。
- **D. settings 失效时机正确**：`if (updated.length > 0)` 守卫，无空转。
- **E. 移除 force-dynamic 后依赖正确**：layout/page 数据源均为 unstable_cache 缓存函数；apply 保留合理（searchParams）。
- **F. RESOURCE_TO_TAGS 映射无缺口**：`setting → [settings, home]`、`navigation → [settings]` 覆盖 layout 作用域。

## 问题清单（按严重度）

| # | 严重度 | 问题 | 状态 |
|---|---|---|---|
| 1 | 高 | build 静态预渲染依赖 DB 已 migrate（环境前提，非代码缺陷） | 交 D-13 CI；不建议代码兜底 |
| 2 | 中 | `d-cache.spec.ts` 头部注释仍写 `profile="max"` | **已修复** |
| 3 | 中 | d-cache.spec 断言链为「弱证明」（只证业务可见性，不证失效机制） | **已补 mock 单测** `cache-tags-invalidate.test.ts` |
| 4 | 低 | `invalidateWebContent` 静默失败 | **已修复**：非 Invariant 错误改 `console.warn` |
| 5 | 低 | 越界登记未获独立裁决 | 交集成者 W2-06/CCR |

## 验收项独立判定

| 验收 | 判定 |
|---|---|
| 5.9.5.1 force-dynamic 仅剩 apply | PASS（主路由实读 + build Static/Dynamic 输出一致） |
| 5.9.5.2 d-cache.spec.ts | PASS（4 passed，15.7s） |
| 5.9.5.3 visual | UNKNOWN（win32 无法跑） |
| 5.9.5.4 after.json TTFB | 待 W2-04 |
| 5.9.5.5 通用门禁 | PASS（tsc 0 / lint 0 errors / test 675 / build 0） |
| 5.9.5.6 允许路径 | PASS（2 处合理越界已登记） |

## 反对意见排除情况

**已排除**：SWR 语义质疑（源码+对照实验）；crud 失效点在写前（实读 L116/166/196）；settings 无条件触发（L84-87 守卫）；误改 `/api/settings/**`（未动）；apply 被静态化（仍 force-dynamic）。

**仍成立**：build 依赖 DB migrate（环境前提）；d-cache 弱证明（已补单测）；revalidateTag 静默失败会让管理员 5 分钟不更新（已加 warn）。

## 证据缺口（未独立核实）

- `git status --short` / `git diff 24754b1` 完整清单（父级 bash 审批拦截）——由主 Agent 直接核实。
- 全量 grep force-dynamic（仅实读 6 条主路由）——由主 Agent 的 build 输出佐证。
- tsc/lint/test/build 实跑——主 Agent 已实跑确认。before=16ms 基线不可独立复现。

**结论**：实现质量良好；放行条件 ②③④ 已在复审后由主 Agent 落实，①⑤ 交集成者。