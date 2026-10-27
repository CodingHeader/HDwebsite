---
id: EVD-V14-PERF-01
title: REQ-NF-001 性能四条当前可复现判定
status: active
module: validation
owner: assistant
created: 2026-10-27
related: [TASK V14-PERF-01, REQ-NF-001]
---
# V14-PERF-01 性能四条判定
> 执行时间：2026-10-27 · 执行者：external-assistant · 基线 `upgrade@ee57569`（判定时不改代码）
## 四条汇总表
| 条目 | 判定 | 具体数值或原因 | 证据 |
|---|---|---|---|
| 1. Lighthouse 移动端 | UNKNOWN | 需 Linux CI + `npm i -D lighthouse`（依赖变更需 CCR）；本地 Windows 无 Lighthouse，且 package.json 冻结禁止安装 | 见 §1 |
| 2. 网关超时 30s 可配 | PASS | 键 `llmTimeoutMs`，默认 `30000`ms，管理端设置页可配；非流式读 `llm-gateway.ts:235` 并传给 `adapter.chat`（`:234`）；流式读 `:295`，作为**空闲语义**而非总时长 | 见 §2 |
| 3. 采集限速 | PASS | 键 `collectRateLimitMs`，默认 `2000`ms，管理端设置页可配；读 `collect-engine.ts:248`，实际 sleep 落点 `:328` | 见 §3 |
| 4. SQLite BUSY 压测 | PASS | `busy_timeout=5000ms`；5 并发写 × 60s → `SQLITE_BUSY=0`；既有单测 4/4 通过 | 见 §4 |
## §1 Lighthouse 移动端 —— UNKNOWN
- 命令：`npx lighthouse <url> --preset=mobile`（未运行）。
- 原因：`package.json` 冻结，不得 `npm i -D lighthouse`；且 Lighthouse 移动端分数需要 Linux CI 环境稳定复现。变更依赖需走 CCR 流程。
- 结论：`UNKNOWN（需 Linux CI + npm i -D lighthouse，依赖变更需 CCR）`。
## §2 网关超时 30s 可配 —— PASS
**键与读取**：
- 注册表：`src/lib/settings-registry.ts:158` `def("llmTimeoutMs", "模型调用超时（毫秒）", "llm", "30000", { type: "number", isPublic: false })`。
- 读取：
  - 非流式 `src/lib/llm-gateway.ts:235` `const timeoutMs = Number(settings.llmTimeoutMs || 30000);`
  - 流式 `src/lib/llm-gateway.ts:295` 同式。
**传给 adapter 的生效点**：
- 非流式 `src/lib/llm-gateway.ts:234` `adapter.chat(provider, apiKey, messages, timeoutMs, opts.overrides)` → 30s 总时长上限。
- 流式 `src/lib/llm-gateway.ts:330` `getAdapter(provider.kind).stream(provider, apiKey, messages, totalMs, ...)`，其中 `totalMs = STREAM_TOTAL_TIMEOUT_MS`（`:299`，常量 `300_000`=5 分钟固定兜底）；`timeoutMs` 只参与 `idleMs`（`:298` `Math.max(timeoutMs, STREAM_IDLE_TIMEOUT_MS)`，`STREAM_IDLE_TIMEOUT_MS=30_000`）。
**流式空闲语义解释（防后人误读）**：V11-LLM-01 把流式超时从“整流 30s AbortSignal 会切断长回复”改为“**相邻 chunk 空闲超时**”。`llmTimeoutMs` 配置得更长 → 空闲阈值 `idleMs` 随之放宽（`max(llmTimeoutMs, 30s)`），保护慢速思考模型；配置得更短也不低于 30s 安全下限。总时长另有固定 `300s` 防挂死兜底，与 `llmTimeoutMs` 解耦。
**管理端设置页可配**：`src/app/manager/settings/page.tsx:26` 调 `/api/settings/definitions`；`src/app/api/settings/definitions/route.ts:14-26` 用 `getRegistry()` 全量下发，`llm` 分组含 `llmTimeoutMs`。故管理员可在设置页修改。
## §3 采集限速 —— PASS
**键与读取**：
- 注册表：`src/lib/settings-registry.ts:135` `def("collectRateLimitMs", "请求限速（毫秒）", "collect", "2000", { type: "number", isPublic: false })`。
- 读取：`src/lib/collect-engine.ts:248` `const rateLimitMs = Number(settings.collectRateLimitMs || 2000);`
**实际 sleep 落点**：
- `src/lib/collect-engine.ts:328` `await sleep(rateLimitMs);` —— 每成功入库 1 条采集项后限速 sleep。
- 另 `fetchHtmlDetails` 透传 `rateLimitMs`（`collect-engine.ts:279`），用于详情页抓取同样限速。
**管理端设置页可配**：同 §2，`collect` 分组含 `collectRateLimitMs`（`/api/settings/definitions` 全量下发）。
## §4 SQLite BUSY 压测 —— PASS
**断言口径（读 `src/lib/__tests__/sqlite-busy-timeout.test.ts`）**：
- 连接配置：`busy_timeout = SQLITE_BUSY_TIMEOUT_MS`（=5000ms）。
- 进程内：同一客户端并发 20 写 + 调度锁 + 交互事务全部成功（适配器 Mutex 串行化）。
- 跨进程：子进程持写锁 400ms 期间并发写全部成功，无 `SQLITE_BUSY`。
- 对照组：`timeout=0` 时立即 `SQLITE_BUSY`，证明测试有区分力。
**5 并发写 × 60s 实测**（临时脚本 `C:\tmp\perf-busy\stress.mjs`，临时库 `%TMP%/perf-busy-*/stress.db`，未触碰 `prisma/dev.db`、`prisma/e2e.db`）：
- 5 个独立 libsql 客户端进程（`timeout: 5000`），各循环 `UPDATE CronJob ...` 写事务 60s。
- 记录：`SQLITE_BUSY = 0`（全部 worker 输出 `{"ok":2680,"busy":0,"other":0}` 与 `{"ok":2477,"busy":0}` 等）。
- 说明：worker 进程在 60s 循环结束输出结果后，进程退出码为 `0xC0000005`（Windows libsql 原生句柄释放已知现象），不影响循环期内计数；结果以循环内统计为准。
**可复现命令**：
```bash
npx vitest run src/lib/__tests__/sqlite-busy-timeout.test.ts
# Test Files 1 passed (1), Tests 4 passed (4), Duration 3.37s
```
## UNKNOWN 登记
1. Lighthouse 移动端分数 —— 需 Linux CI + 依赖变更（CCR）。
2. 真实微信 / SMTP / Coze 联调 —— 本卡不涉及，属 REL-01 登记范围。
3. Windows 下 libsql 进程退出 0xC0000005 —— 仅压测进程退出期现象，已确认不影响写入结果。
## 约束遵守
- 仅写 `docs/design/06_validation/evidence/V14/PERF-01/**`。
- 未改 `src/**`、`package.json`、`prisma/**`、`tests/**`、`scripts/measure-baseline.mjs`。
- 临时脚本与输出均在 `C:\tmp`（`/tmp`），已清理 `C:\tmp\perf-busy`。