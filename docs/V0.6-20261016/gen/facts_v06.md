## 项目事实快照（V0.6 校准：2026-10-16 13:2x 已 `git fetch`；开工后以你自己的命令结果为准）

- 仓库：`https://github.com/CodingHeader/HDwebsite`（公开）。前台视觉标准 = `origin/main@94dbbbb`。
- 远端 `origin/upgrade` = **`fb82885`**（2026-10-16 12:17 +08，docs-only：V0.5 规划包入库）；tag **`w1-base` = `0cb699b`**（W0-08 判 PASS）；`origin/w0/staging` = `0cc257d`。`w1-base..fb82885` 只改 `docs/`（328 个文件），冻结面未动。尚无任何 `lane/*` 远端分支 → Wave 1 未开工。
- Wave 0 实况（V0.6 独立复核，`evidence/V0.6-W0交付独立核验.md`）：W0-01/02/03/04/06 PASS；**W0-05 部分**（V0.3 G 系列 DTO 未冻结）、**W0-07 部分**（无 `tests/a11y/playwright.config.ts`、e2e 生产 env 未预置）、**W0-09 部分**（wechat 守卫正则把 `|` 转义，守卫失效）、**W0-R0 部分**（未改 storageState、AGENTS.md 无“禁止跨线大提交”）→ 由 W0-10/W0-11/W0-12 补齐，W0-13 打 `w1-base-ccr-1`。
- 门禁实测（Hark 沙箱，fb82885，Node 22.23.3 / Linux arm64）：lint 0 error / 18 warning、typecheck 0、test 23 文件 303 例全过、build 通过；**e2e 8/8（1.4m）**——与 W0-08 在 Docker 的 8/8 同结论（`evidence/V0.6-fb82885-门禁.log`、`V0.6-fb82885-e2e-linux.log`）。
- visual：W0-08 记 45/46，唯一失败 courses@375。**V0.6 发现**：79b0f32 重生成了 32 张参照图，`courses-375.png` 不在其中（`git log -- tests/visual/reference/courses-375.png` 只有 c7e5409，md5 `32230fcd…`），但 reference-deviation.md:44 记为“已重新生成”——陈述与事实不符；推断当时 busy 的 outputDir 阻断了这一张 → W0-13 先补生成再判。
- 375 档参照图 14/15 张宽 667px：main 本身在 375 视口横向溢出，参照与实际一致，**不是缺陷**，不得“修”。
- 仓库内 `docs/V0.5-20261015`（108 文件，25 个乱码名、缺 37 个文件含 prompts/）与 `docs/任务规划V0.2.0`（24 个乱码名）——根因是此前 zip 未置 UTF-8 文件名标志；V0.6 以 `git am` 补丁交付并由 W0-12 修复。
- 已定裁决：D6 保留 `data.fieldErrors`；D7 `created()` code 200 / HTTP 201；D8 推送规则；D9 保留 `ApplyForm`；D16 双环境矩阵（visual@Windows 参照机、e2e@Linux 同一 SHA）；**分工**：Hark 自做 UI 核心（A、E）+ W0-13 闸门 + Wave 2 集成终审；P1=W0-10+B；P2=C；P3=W0-11/W0-12+D+W2 后端段。
- 性能基线（V0.4 实测，待 D-01 在 w1-base-ccr-1 上重测）：首页 JS gzip 227,007 B；`/manager/articles` 首屏 586,879 B（827646b，含 TipTap 静态导入）。
