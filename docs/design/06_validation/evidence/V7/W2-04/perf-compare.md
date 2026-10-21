# W2-04 性能复测与目标判定（perf-compare）

> 卡定义：`docs/V0.7-20261019/tasks/W2-04.md`
> 执行：2026-10-21 ｜ 平台 **win32** ｜ 端口 6797（before 用 6795，同为临时端口段，不冲突）
> before 基线：`docs/design/06_validation/evidence/W1-D/before.json`（sha `f158501`，2026-10-16）
> after 实测：`after-median.json`（sha `8b5e0cd`，三次取中位数）

## 1. 结论先行

| 卡目标 | before | after（3 次中位数） | 门槛 | 判定 |
| --- | --- | --- | --- | --- |
| `/manager` JS gzip ≤ before × 0.6 | 355,519 B | **361,329 B** | ≤ 213,311 B | **FAIL**（比值 1.016，仅降 0%） |
| `npm start` Ready ≤ 10s | 16,548 ms | **719 ms** | ≤ 10,000 ms | **PASS**（降 95.7%） |
| 首页热 TTFB ≤ before × 1.1 | 16 ms | **4 ms** | ≤ 17.6 ms | **PASS**（降 75%） |

**3 项中 2 PASS / 1 FAIL。** FAIL 项未达标，不做美化。

## 2. 上一轮 BLOCKED 的根因与解堵方式

### 2.1 根因（证据链）

上一轮 `after.json` 只有空骨架：

```json
{ "notes": ["npm start 未就绪：服务提前退出（code 1）"], "startToReadyStandaloneMs": null }
```

- `scripts/measure-baseline.mjs:114` 构造启动环境：`const env = { ...process.env, DATABASE_URL: prismaUrl(dbFile), JWT_SECRET };`
- D-03 新增 `src/lib/env.ts`，其 `collectEnvIssues()` 要求：
  - `JWT_SECRET`、`ENCRYPTION_KEY` —— **任何环境都必须存在且 ≥32 字符**（`src/lib/env.ts:42-49`）
  - `APP_ORIGIN` —— 仅 `NODE_ENV=production` 时要求（`env.ts:54`，测量时正是 production）
- 脚本启动了 production 模式服务，但只注入了 `DATABASE_URL`/`JWT_SECRET` → 缺 `ENCRYPTION_KEY`/`APP_ORIGIN`
  → `instrumentation.register()` 调用 `assertProductionEnv()` 失败 → **进程退出（code 1）**。

即：**D-03 的 env 强校验是正确加固，但它把 D-01 的测量脚本打穿了**——两者分属不同执行线，W2-04 卡不允许改 `scripts/`。

### 2.2 解堵方式（按用户裁决：移出项目目录）

- **未修改** `scripts/measure-baseline.mjs`（不在本卡允许路径内）。
- 在**项目树外**（`.box-agent-scratch/w204/`）写等价测量器 `measure-after.mjs`，补齐 `ENCRYPTION_KEY`/`APP_ORIGIN` 注入，指标名与 before.json 一一对应。
- 只把**结果**写入本卡允许路径 `evidence/V7/W2-04/`。
- 临时脚本曾在 `scripts/` 短暂落盘，已按用户裁决移除（`git ls-files` 确认未入库）。

> 这样既解开了阻塞，又保持"卡内不越界"。

## 3. 测量方法与可复现性

```bash
# 前置：npm run build（需 .next 生产产物）
node <项目树外>/measure-after.mjs \
  --root "E:/Code/Demo/HDwebsite/hdwebsite_1011" \
  --out  <项目树外>/after-runN.json     # 跑 3 次，取中位数
```

- 环境：`NODE_ENV=production`、临时 libsql 库（现场跑 migrations，不跑 seed 避免抖动）、端口 6797。
- 指标定义与 before 一致：`startToReadyNpmStartMs`（轮询 `/api/health` 至 200）、`homeTtfb*`、`apiArticlesTtfbMs`、`*JsGzip`（抓页面 `<script src>` 去重后逐 chunk `gzipSync` 累加）。
- 三次原始值：

| 指标 | run1 | run2 | run3 | 中位数 |
| --- | --- | --- | --- | --- |
| startToReadyNpmStartMs | 752 | 711 | 719 | **719** |
| homeTtfbColdMs | 307 | 318 | 301 | **307** |
| homeTtfbWarmMs | 32 | 3 | 4 | **4** |
| apiArticlesTtfbMs | 13 | 14 | 16 | **14** |
| homeJsGzip | 320,798 | 320,798 | 320,798 | **320,798** |
| managerJsGzip | 361,329 | 361,329 | 361,329 | **361,329** |
| managerArticlesJsGzip | 470,884 | 470,884 | 470,884 | **470,884** |

> JS gzip 三次完全一致 → 指标是**确定性**的（构建产物不变），不受运行时抖动影响；时间类指标有波动，取中位数。

## 4. FAIL 项归因（`/manager` JS gzip）

### 4.1 事实

- before 355,519 B → after 361,329 B，**反而增了 5,810 B（+1.6%）**，距 `-40%` 目标差 148,018 B。
- 同一次构建里 `/manager/articles` 从 589,398 B → **470,884 B（-20.1%）**，说明**局部确实有优化**，但被 `/manager/login` 这一入口的回归抵消。

### 4.2 为什么没达 -40%（三条可验证原因）

1. **基线口径问题**：before 的 `managerJsGzip` 采的是 `/manager` **跳转后的登录页**（before.json 自注："`/manager` 按跳转后登录页计量"）。本次同口径测 `/manager/login`，得到 361,329 B。该入口本就轻（无表格/表单），可压缩空间有限——而 `-40%` 的目标显然是按"重页面"设定的。
2. **W2-04 卡不允许改业务代码**：允许路径只有 `evidence/V7/W2-04/**` 与 `src/app/manager/**`（仅 import 方式，需 E 线确认）。**减包主要手段**（动态 import 大组件、拆分 SchemaForm、`optimizePackageImports`、treeshaking 服务端依赖）全部落在 `src/components/manager/**`、`next.config.ts`、`src/lib/**` —— 均越界。
3. **共享 chunk 只增不减**：`next.config.ts:11` 为 `cssChunking: false`（有意关闭，保持与 main 一致的样式注入顺序），且管理端所有页面共用同一批 chunk；新增的 V0.7 功能（B-07 渠道状态、notify-rules、knowledge-bases）把共享 chunk 撑大，抵消了 articles 页的下降。

### 4.3 下一步（需归属线执行，非本卡可做）

| 手段 | 预期 | 归属 |
| --- | --- | --- |
| `CrudPage`/`SchemaForm` 按需 `next/dynamic` 懒加载 | 中-高 | E 线（`src/components/manager/**`） |
| `optimizePackageImports` 收敛 `@tiptap/*`、`@base-ui/react` | 中 | D 线（`next.config.ts`） |
| 管理端路由段 `loading.tsx` + 分组 layout 收敛首屏 chunk | 中 | E 线 |
| 复核目标口径：是否应对"重页面"（articles/knowledge-bases）而非 login 页设 -40% | — | **需用户裁决** |

## 5. 未列入卡目标但必须如实报告的回归

| 指标 | before | after | 变化 | 说明 |
| --- | --- | --- | --- | --- |
| `homeTtfbColdMs` | 92 ms | **307 ms** | +234% | 冷启动首次访问。D-06 移除了 `force-dynamic` 并改用 `unstable_cache`，**首次请求要完成缓存填充**（含 DB 查询 + 区块解析），故冷态变慢；暖态从 16ms → 4ms（-75%）正是同一机制的收益。属**设计权衡**，非缺陷，但需登记 |
| `apiArticlesTtfbMs` | 4 ms | **14 ms** | +250% | 绝对值仍为 14ms（远低于 100ms 体验阈值）；before 的 4ms 是 dev.db 小数据集 + 无缓存层的理想值，now 走真实查询链路。属口径差异，建议下轮以 50ms 为门禁重定基线 |
| `homeJsGzip` | 227,705 B | **320,798 B** | +40.9% | 首页 11 区块全部恢复（A1，ADR-024）+ TipTap/区块注册表进共享 chunk。是**功能对等的代价**（parity A1 由 partial→present） |
| `managerArticlesJsGzip` | 589,398 B | **470,884 B** | **-20.1%** | 唯一显著下降项 |

## 6. 判定

| 项 | 结论 |
| --- | --- |
| 卡目标达成 | **2/3 PASS，1/3 FAIL**（`/manager` JS gzip 未达标） |
| 阻塞状态 | **已解除**（不再 BLOCKED）：根因明确、解堵方式合规、数据可复现 |
| 完成度 | **70%**（测量与判定 100% 完成；减包目标未达成，需越界手段） |
| 是否阻塞 W2-07 | **不阻塞**——本卡交付物是"复测 + 判定 + 差距归因"，已全部产出；减包本身需另开卡 |

## 7. 遗留

1. `/manager` JS gzip 减包需 E 线（组件懒加载）+ D 线（next.config 优化）配合，建议开返工卡。
2. `-40%` 目标口径需用户确认：以 login 页还是重页面为基准。
3. 时间类指标（cold TTFB / API TTFB）建议下轮以绝对值阈值（如 ≤500ms / ≤50ms）替代"相对 before 的倍数"，避免基线本身不可比。
