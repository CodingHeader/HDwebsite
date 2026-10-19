# C-11 执行证据：LLM 用量统计 + 供应商优先级排序 API

> 卡：`docs/V0.6-20261016/tasks/C-11.md`　分支：`lane/c-ai-kb`　起点：`3b5519a`（C-10 交付后）　所有者：Agent-AI
> 状态：**DONE**（门禁 4/4 exit 0；子智能体独立验收 PASS）

## 1. 分析（5W1H 简版）

- **What**：为运营提供两个 API——`GET /api/llm/usage?groupBy=provider|day&from&to`（聚合 LLMUsage，需 llm:list）+ `PATCH|PUT /api/llm/providers/order`（批量写 priority，需 llm:update→llm:edit）。
- **Why**：需求缺口 G6（LLMUsage 只写不读）；G7（优先级排序）。
- **Where**：`src/app/api/llm/usage/route.ts`（新）、`src/app/api/llm/providers/order/route.ts`（新）、`src/lib/__tests__/lane-c/llm-usage.test.ts`（新）、`src/lib/__tests__/lane-c/llm-order.test.ts`（新）。
- **Who**：C 线（07-所有权矩阵 C 行含 `src/app/api/llm/**`）。
- **How**：Prisma groupBy 聚合 → 内存归并 → 契约校验；排序走事务。
- **When**：C-01（llm:list/llm:edit 权限 + provider CRUD）已交付 → C-11 解锁。

## 2. 设计决策

### D1 groupBy=day 补齐空日
LLMUsage 表 `(date, providerId)` 唯一，没有记录的日期不会出现。`groupBy=day` 走"补齐区间内所有日期，无用量填 0"——便于 E-10 折线图不出现断点。**测试断言**：`[2026-10-14, 15, 16]` 全三行，其中 16 日为 `{calls:0,...}`。
**反对**：空日会膨胀响应体（92 天上限 = 92 行，可接受）；对"仅看有数据日"的视图，E-10 可自行过滤 `calls>0`。保留补齐设计。

### D2 聚合实现：先 groupBy 再内存归并
不用 Prisma `groupBy: {by:["providerId"]}` 直接聚合跨天，是因为 SQLite 方言下 `by` 与 `_sum` 组合在部分版本返回 NaN/缺失；改用 `by:["date","providerId"]` 全量取行后内存归并，避免方言陷阱。数据量受契约 `≤92天 × ≤50 provider` 约束，内存归并无压力。

### D3 权限动作：llm:update → llm:edit（关键裁决）
**冲突**：契约 `src/contracts/llm.ts:45` 注释写"权限 llm:update"，但 `src/contracts/auth.ts:80` 的 `permissionCatalog.llm` 只有 `["list","edit"]`，**没有 `update` 动作**。
**证据**：`src/lib/__tests__/api-contract/with-api.test.ts:95-103` 是全仓守卫——"src/app/api 中出现的每个权限字面量都在 permissionCatalog"。首次运行 C-11 时该测试 FAIL：`expected ['llm:update'] to deeply equal []`。
**裁决**：以可执行的 `permissionCatalog` 为准（`llm:edit`），与 `providers/route.ts:65`（llm:edit）、`providers/[id]/route.ts`（llm:edit）一致；**不**改 `src/contracts/**`（Wave 0 后冻结，需 CCR）。契约注释的 `llm:update` 属 W0-10 文本笔误，记入证据待集成者复核。
**测试修正**：llm-order.test.ts 用 `llm:edit` 造 admin 权限 → 复跑 with-api.test.ts PASS。

### D4 PATCH 与 PUT 并存
契约注释写 `PUT`，卡 Execution Step 4 写 `PATCH /api/llm/providers/order {ids:number[]}`。两方法共用 `reorder` handler，避免调用方（E-10 前端）按注释用 PUT 时 405。**测试断言**：PUT 与 PATCH 都 200。

### D5 优先级写值
`ids` 第 i 位 → `priority = i+1`（1 最高）。与 `providers/route.ts:22` 列表 `orderBy priority asc` 一致。**测试断言**：`ids=[B,A,C]` 后 `findMany orderBy priority asc` = `[B,A,C]`，priority=`[1,2,3]`。

## 3. 改动文件

```
A src/app/api/llm/usage/route.ts            （GET，~95 行）
A src/app/api/llm/providers/order/route.ts  （PATCH+PUT，~55 行）
A src/lib/__tests__/lane-c/llm-usage.test.ts（9 用例）
A src/lib/__tests__/lane-c/llm-order.test.ts（6 用例）
```

## 4. 验收结果（逐条）

| # | 验收标准 | 结果 | 证据 |
|---|---|---|---|
| 1 | llm-usage.test.ts 通过 | **PASS** | 9/9 passed |
| 2 | 响应通过 W0-05 zod schema parse | **PASS** | `llmUsageRowSchema.array().safeParse(rows).success === true`（两处断言） |
| 3 | 无权限返回 403 且体符合契约② | **PASS** | `{code:403, message, data}`（llm-usage + llm-order 各一例） |
| 4 | llm-order.test.ts 通过 | **PASS** | 6/6 passed |
| 5 | `test -f src/app/api/llm/providers/order/route.ts` | **PASS** | 文件存在，且 build 产物含 `/api/llm/providers/order` |
| 6 | P-5：响应不含耗时与费用字段 | **PASS** | `JSON.stringify(b.data)` 不含 `latencyMs`/`costCent`/`elapsedMs`（ADR-034） |
| 7 | 通用门禁 4/4 exit 0 | **PASS** | 见 §5 |
| 8 | 允许路径核查 | **PASS** | 4 文件全在 C 线允许列表 |

## 5. 命令输出摘要

```
$ npx vitest run src/lib/__tests__/lane-c/llm-usage.test.ts src/lib/__tests__/lane-c/llm-order.test.ts
Test Files  2 passed (2) / Tests  15 passed (15)   exit 0

$ npx vitest run src/lib/__tests__/api-contract/with-api.test.ts src/lib/__tests__/lane-c/llm-usage.test.ts src/lib/__tests__/lane-c/llm-order.test.ts
Test Files  3 passed (3) / Tests  22 passed (22)   exit 0

$ npm run lint          → 23 warnings (0 errors)      exit 0
$ npm run typecheck     → exit 0
$ npm test              → 34 files / 479 tests passed  exit 0
$ npm run build         → ✓ Compiled successfully; /api/llm/usage + /api/llm/providers/order 均在产物  exit 0
```

## 6. 越界复核

- **允许**：`src/app/api/llm/**`（2 新路由）、`src/lib/__tests__/lane-c/**`（2 新测试）、`docs/design/06_validation/evidence/W1-C/**`（本文件）。
- **未触碰**：`src/contracts/**`（D3 未改契约）、`prisma/schema.prisma`、`prisma/migrations/**`、`package.json`、`vitest.config.ts`、`src/components/web/**`、`src/app/(web)/**`、`public/**`。
- **DR-23**：未引入任何 `z.object` 到 API 路由（schema 从契约 import）。

## 7. UNKNOWN / 后续

- **UNKNOWN-1（D3）**：契约 `llm.ts:45` 注释的 `llm:update` 与 `permissionCatalog` 实际 `llm:edit` 不一致。本卡按可执行目录对齐（llm:edit），**不提交 CCR**；建议集成者在 Wave 2 契约复核时统一契约注释文本。
- **UNKNOWN-2**：`test:e2e` / `test:visual` 因 Windows 环境无法运行（D16），与 W0-08 同口径，Wave 2 补齐。
- **后续**：C-12（知识库其他管理）为 C 线最后一张卡。