# W2-08 · CCR 积压收尾清单

> 任务卡：W2-08（ESLint 边界规则 + 13-响应设计文档同步 + CCR 积压收尾）
> 执行：2026-10-21 ｜ 分支 `upgrade`
> 卡要求：**Wave 1 登记的 CCR 全部落地或关闭**，其中 B-06 需要的 `notify.scan → flushDeferred()` 注册并有单测。

## 1. 逐条状态

| # | CCR | 内容 | 状态 | 证据 |
|---|---|---|---|---|
| 1 | `CCR-1`（W0-10） | W1 前置契约补冻结（7 项最小契约补丁：notify quietHours 收敛 0..23/0..59、channels 多渠道、kb baseIds/providerIds 等） | **已落地** | `docs/design/03_solution/decisions/ADR-034-CCR-1-W1前置契约补冻结.md`；实现在 `src/contracts/resources.ts`、`src/contracts/kb.ts`（W2-02 契约测试已覆盖：`notify-rules/:id` 的 `quietHours:{start:"25:00"}` 断言 400） |
| 2 | `CCR-W2-08-01`（本轮新提） | 路由内 zod 请求体定义（`src/app/api/apply/route.ts`），需新增契约 `applySubmitSchema` 后删除本地定义 | **待裁决**（阻断子项） | 本目录 `CCR-W2-08-01.md`；当前以 `eslint.config.mjs` 对该单文件豁免过渡，规则对其它全部路由生效 |
| 3 | B-06 依赖项（非 CCR，但卡点名） | `notify.scan` 必须调用 `flushDeferred()`，否则静默期内的 deferred 通知永久滞留 | **已落地** | `src/lib/jobs/index.ts` 的 `notify.scan` 在 `publishRemindScan`/`notifyRetryScan` 之后调用 `flushDeferred()`；单测 `src/lib/__tests__/notify-scan-flush.test.ts`（2 用例，含「flushDeferred 必须最后执行」） |

## 2. 为什么 `CCR-W2-08-01` 不直接修

按 `11-验收与审查规程.md` §4：

> 需要改 `src/contracts/**` … 或改别的线拥有的文件 → 必须停止该子项并提交请求，不得"先写了再说"。

`apply/route.ts` 的修复需要**同时**改两处本卡无权触碰的路径：

1. `src/contracts/resources.ts` —— **冻结面**（AGENTS.md §4：f158501 之后 contracts 只读）；
2. `src/app/api/apply/route.ts` —— **B 线所有权**（B-03 迁移范围）。

任一为真即须阻断；两者同时为真，故本卡只登记、不修改。**未采用**「先改了再登记」的做法。

## 3. notify.scan → flushDeferred 的有效性验证（防测试空转）

不只跑绿，还做了**反向验证**：

```bash
# 1) 正常状态：2 用例通过
npx vitest run src/lib/__tests__/notify-scan-flush.test.ts
# → Test Files 1 passed (1) | Tests 2 passed (2)

# 2) 临时注释掉 await flushDeferred()，其余不动
# → Test Files 1 failed (1) | Tests 2 failed (2)
#    （calls 期望 ["publishRemindScan","notifyRetryScan","flushDeferred"]，实际只有前两个）

# 3) 恢复后重新通过
```

结论：该测试**确实锁住接线**，不是恒真的空测试。

## 4. 遗留与归属

| 项 | 归属 | 说明 |
|---|---|---|
| `CCR-W2-08-01` 裁决 | 集成者/契约员 | 批准后：契约员加 `applySubmitSchema` → B 线改 route import → 本卡删 `eslint.config.mjs` 中 apply 的两处豁免 |
| `useSettings.ts` 数组兼容分支清理 | 前台卡 | 属 `src/components/web/**` 冻结面（REQ-F-014），须随 `test:visual` 一起做；当前无功能风险（服务端只返回对象，分支永不命中），已登记于 `docs/design/13-响应设计.md` §8 |
| next 16.4.2 升级（K10） | 用户裁决 | 依赖冻结面；W2-03 已登记 critical RCE，本卡不擅动 |
