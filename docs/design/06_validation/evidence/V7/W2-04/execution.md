# W2-04 after.json 复测与目标判定 · 执行记录（已解堵）

> **状态更新（2026-10-21）**：本卡此前为 **BLOCKED**，现已解除阻塞并完成测量与判定。
> 最新结论请看同目录 **`perf-compare.md`**（3 次测量中位数、逐项 PASS/FAIL、差距归因）。
> 本文件保留首轮（阻塞态）的完整分析作为证据链的一部分，下方 §0 为本次解堵摘要。

## 0. 解堵摘要（2026-10-21）

| 项 | 结果 |
| --- | --- |
| 阻塞根因 | `scripts/measure-baseline.mjs` 只注入 `DATABASE_URL`/`JWT_SECRET`；D-03 的 `src/lib/env.ts` 要求 `ENCRYPTION_KEY`（任何环境）与 `APP_ORIGIN`（production）→ 服务启动期校验失败即退出（code 1） |
| 解堵方式 | 按用户裁决「移出项目目录」：**不改** `scripts/`，在项目树外写等价测量器，补齐两个 env 注入；只把结果写入本卡允许路径 |
| 是否越界 | 否。`git ls-files scripts/measure-after.mjs` = 0（临时落盘已移除，未入库） |
| 测量 | 3 次取中位数；JS gzip 3 次完全一致（确定性） |
| 目标达成 | `/manager` JS gzip **FAIL**（1.016×，仅降 0%）；`npm start` Ready **PASS**（16,548→719ms）；首页热 TTFB **PASS**（16→4ms） |
| 结论 | 2 PASS / 1 FAIL；**不再 BLOCKED**；FAIL 需 E/D 线配合减包，已给出手段与归属 |

---

以下为首轮（阻塞态）原始记录，保留作为证据链。

## 1. 执行过程（首轮）

1. 确认依赖：D-06（`git log` 有 D-06 提交）、W2-03、V7-UI-01 均已完成（evidence/V7 目录存在）。
2. 跑 `node scripts/measure-baseline.mjs --out docs/design/06_validation/evidence/V7/W2-04/after.json`。
3. 结果（2026-10-21T02:04:33Z，sha `973a443`）：

```json
{
  "platform": "win32",
  "notes": [
    "win32 无 standalone（next.config.ts 有意关闭，E-12 同口径）→ standalone 启动未测",
    "npm start 未就绪：服务提前退出（code 1）"
  ],
  "startToReadyStandaloneMs": null
}
```

4. 除 `startToReadyNpmStartMs` 外，`homeTtfbColdMs` / `homeTtfbWarmMs` / `apiArticlesTtfbMs` / `homeJsGzip` / `managerJsGzip` / `managerArticlesJsGzip` **均未输出**——脚本在服务未就绪时中止后续测量，`after.json` 只有空骨架。

## 2. 根因（证据链）

- `scripts/measure-baseline.mjs:116` 只注入 `env = { ...process.env, DATABASE_URL: prismaUrl(dbFile), JWT_SECRET }`。
- 该脚本由 **D-01** 建立（before.json 于 D-01 期产出，`sha f158501`）。
- D-03 新增 `src/lib/env.ts` 的 `collectEnvIssues()`：
  - `JWT_SECRET` / `ENCRYPTION_KEY`：**任何环境**都要求（`env.ts:42-49`，注释：jwt.ts/crypto.ts 首用时也会 FATAL，这里前置到启动期）
  - `APP_ORIGIN` 等：仅 `NODE_ENV=production` 要求（`env.ts:54`）
- 测量脚本以 production 启动 → 缺 `ENCRYPTION_KEY`、`APP_ORIGIN` → `instrumentation.register()` 的 `assertProductionEnv()` 判定失败 → 进程 `process.exit(1)`。

**性质**：D-03 的加固是正确的（生产缺 env 应当拒绝启动），问题是 D-01 的测量脚本未同步补注入。两者分属不同执行线。

## 3. 阻塞判定（首轮）

- 跨所有权：脚本在 `scripts/`，不属 W2-04 允许路径（`docs/.../V7/W2-04/**`、`src/app/manager/**`）。
- 卡定义 §依赖与阻塞：「需要改冻结面（契约/迁移/依赖/他线文件）→ 停止该子项，写《契约变更请求》」。
- 首轮即按此停止改代码，未越界。

## 4. 首轮结论

- 完成度：**0%（阻塞）**
- 判定：**BLOCKED**（跨所有权）

> 该结论已被 §0 的解堵取代；本卡在 2026-10-21 以「项目树外等价测量」方式完成，详见 `perf-compare.md`。
