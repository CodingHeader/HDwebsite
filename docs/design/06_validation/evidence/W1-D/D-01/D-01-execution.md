# D-01 执行记录：基线测量脚本 + before.json

分支 `lane/d-ops`（自 w1-base-ccr-1 = f158501）。执行：本会话（P3/Ops 角色）。

## 改动（全部在 allow 内）

- `scripts/measure-baseline.mjs`（新）：一条命令输出 8 个指标（homeJsGzip/managerJsGzip/managerArticlesJsGzip/homeTtfbColdMs/homeTtfbWarmMs/apiArticlesTtfbMs/startToReadyNpmStartMs/startToReadyStandaloneMs）
- 临时库放 `.cache/baseline-*/`（gitignore 不入仓库；win32 下临时库必须与 ROOT 同盘——跨盘符相对 file URL 非法 os error 123）+ 一次性 JWT_SECRET
- 平台适配（E-12 同款根因，均已登记）：
  - prismaUrl：win32 用相对 ROOT 形式（schema engine 打不开 file:///C:/ 三斜线盘符 URL os error 161）
  - npm 启动：直接 `node scripts/start-next.mjs`（spawn("npm.cmd") 无 shell 会 EINVAL）
  - main 完成后 process.exit(0)（start-next 孙进程树可能挂住事件循环）
- win32 无 standalone → startToReadyStandaloneMs=null（notes 说明，E-12 同口径）

## before.json 实测值（vs 09-基线指标/V0.6 记录）

| 指标 | 实测 | 基线 | 偏差 |
|---|---|---|---|
| homeJsGzip | 227705 B | 227007 B | +0.3% ✅ ≤15% |
| managerJsGzip | 355519 B | 345853 B | +2.8% ✅ |
| managerArticlesJsGzip | 589398 B | 586879 B（V0.6 记录） | +0.4% ✅（S1 已知 TipTap 缺陷值，A-05 优化目标） |
| homeTtfbColdMs | 92 ms | — | 首测 |
| homeTtfbWarmMs | 16 ms | 33~42 ms | 优于基线 ✅ |
| apiArticlesTtfbMs | 4 ms | 20~31 ms | 优于基线 ✅ |
| startToReadyNpmStartMs | 16548 ms | D-02 目标 ≤10s | **超 D-02 目标，登记**（start-next 未重建时 16.5s；D-02 优化卡处理） |
| startToReadyStandaloneMs | null | 7.3s（Linux） | win32 无 standalone（E-12 同口径），Linux 上由 D-13 CI 复测 |

## 验收结果

| 项 | 结果 |
|---|---|
| `node scripts/measure-baseline.mjs --out .../before.json` | **exit 0** ✅（重跑复现：同值 227705/355519/589398） |
| JSON 8 键 | 齐全 ✅ |
| 通用门禁 | 见 gate-d01.log |
| P-4 Lighthouse 移动端 | **UNKNOWN**（本机无 Lighthouse 运行时；D-13 CI 可补） |

## 登记

- 初跑三次失败均已定位修复（161 三斜线 URL / 123 跨盘符相对路径 / EINVAL npm spawn / 挂起退出）——非连续同因，脚本最终 exit 0 且重跑复现同值。
