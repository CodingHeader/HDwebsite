# V11-PERF-01 执行证据：性能基线修复与测量

## 5W1H（简版）

- **What**：修复 `scripts/measure-baseline.mjs` 生产模式启动即退（补齐 D-03 env 强校验所需 env），并新增 5 个关键路由的页面加载基线（LCP/CLS/TBT/FCP 实验室探针）。
- **Why**：V1.1 审计 §运维.2——D-03 env 强校验（`src/lib/env.ts` + `instrumentation.ts`）上线后，measure-baseline 注入的 env 不全，生产服务器启动即 `process.exit(1)`，基线测量失效；且从未建立 LCP/Lighthouse 基线。
- **Who/When**：P1 lane 执行代理，2026-10-23。
- **Where**：`scripts/measure-baseline.mjs`（唯一允许改动文件）+ 本证据目录。
- **How**：启动 env 注入 `ENCRYPTION_KEY`（一次性 ≥32 字符）与 `APP_ORIGIN`（`http://127.0.0.1:PORT`）；用仓库既有 devDependency `@playwright/test` 的 Chromium 做 PerformanceObserver 探针（不加装任何包）。

## 现状盘点（审计声明 vs 代码核实）

| 审计声明 | 代码核实 | 结论 |
| --- | --- | --- |
| D-03 env 强校验导致启动即退 | `src/lib/env.ts` `assertProductionEnv()`（instrumentation 启动调用）：生产必需 `JWT_SECRET/ENCRYPTION_KEY/DATABASE_URL/APP_ORIGIN`，缺任一 → `process.exit(1)`；`measure-baseline.mjs` 原来只注入 `DATABASE_URL + JWT_SECRET`（本地 `.env.local` 也只有 JWT_SECRET 键）→ 缺 `ENCRYPTION_KEY`、`APP_ORIGIN`，生产启动必退 | **属实**（本次修复点） |
| 无 LCP/Lighthouse 基线 | 09-基线指标.md 只有 JS gzip/TTFB 口径，无 LCP/CLS/TBT | 属实（本次补实验室探针基线） |
| Lighthouse 可用性 | `npx --no-install lighthouse` → "missing packages"（本机未装；按执行纪律不为此装全局包） | 属实 → Lighthouse 项标 UNKNOWN，以 Playwright 实验室探针替代并记录口径 |

## 改动文件

- `scripts/measure-baseline.mjs`：
  - env 注入补 `ENCRYPTION_KEY`（一次性）+ `APP_ORIGIN`（探测基址）——修 D-03 启动即退；
  - 新增 `pageVitals(route)` 探针：Chromium 1440×900、`PerformanceObserver`（LCP/CLS/FCP/longtask，buffered）+ load 后 2.5s 观察窗；TBT 近似 = Σ(longtask.duration − 50ms)；
  - 5 个关键路由：`/`、`/news`、`/articles`、`/courses`、`/manager`；
  - 头注释同步（指标清单与口径）。

## 验收逐条

| 验收标准 | 结果 | 证据 |
| --- | --- | --- |
| 脚本可复跑（exit 0） | **PASS** | 连续两次 `node scripts/measure-baseline.mjs --out .cache/v11-perf-01-*.json` 均 exit 0；生产模式 `startToReadyNpmStartMs=13264ms`（此前启动即退） |
| 基线表入证据 | **PASS** | 见下表（源数据 `.cache/v11-perf-01-baseline.json`，sha=42d104b6） |
| Lighthouse 基线 | **UNKNOWN** | 本机未装 Lighthouse，按纪律不装全局包；以 Playwright 实验室探针替代（口径：桌面 1440×900、冷启动单次、load+2.5s 观察窗、TBT 为长任务近似，非 Lighthouse 加权分数）。后续可在 CI/有 Chrome 环境补 `npx lighthouse` 正式分 |

## 基线表（2026-10-23，win32，生产模式 npm start，临时库+seed）

| 指标 | 值 |
| --- | --- |
| startToReadyNpmStartMs | 13264 |
| startToReadyStandaloneMs | null（win32 无 standalone，E-12 口径） |
| homeTtfbColdMs / WarmMs | 22 / 5（3 次中位数） |
| apiArticlesTtfbMs | 3（3 次中位数） |
| homeJsGzip | 249,228 B（≈243 KiB，12 个 script） |
| managerJsGzip | 268,150 B（13 个 script，登录页口径） |
| managerArticlesJsGzip | 283,877 B（14 个 script） |

页面加载基线（Playwright 探针）：

| 路由 | LCP(ms) | CLS | TBT近似(ms) | FCP(ms) |
| --- | --- | --- | --- | --- |
| / | 196 | 0 | 66 | 196 |
| /news | 180 | 0 | 0 | 180 |
| /articles | 104 | 0 | 0 | 104 |
| /courses | 124 | 0 | 0 | 124 |
| /manager | 156 | 0 | 0 | 40 |

## 异常值登记（不优化，仅登记）

- `homeJsGzip ≈243 KiB`：首页脚本 gzip 合计偏大（12 个 script），本地 LCP 196ms / TBT 66ms 仍健康；后续版本若做拆包优化以此为准绳。
- 首页是唯一 TBT>0 的前台路由（66ms，hydrate 长任务），登记不处理。
- 本基线为本地实验室数据（Windows 沙箱 + 本地 SQLite），不代表生产环境网络条件；仅作版本间相对比较口径。

## 命令输出摘录

```
node scripts/measure-baseline.mjs --out .cache/v11-perf-01-baseline.json   → exit 0（JSON 见 .cache/）
node scripts/measure-baseline.mjs --out .cache/v11-perf-01-baseline-2.json → exit 0（复跑验证）
npx --no-install lighthouse --version → npm error ... missing packages（未安装 → UNKNOWN 口径）
```
