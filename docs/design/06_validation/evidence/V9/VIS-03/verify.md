# V9-VIS-03 独立验证报告（V9-V-01）

- 验证者：子代理（与执行者上下文隔离；依据 diff + 可重跑命令 + GitHub API 取证）
- 验证日期：2026-10-24；代码基线：upgrade@ca5303a
- **结论：PASS**

## 逐条验收

| 验收条目（引自卡定义） | 结果 | 证据 |
|---|---|---|
| CI visual 全绿（45/45） | **PASS** | run 39986975597（40a9331，新基线入库后首个 push run）visual job **success**，job log（id 120528567937）汇总行 `46 passed` = 45 visual 案例 + 1 功能用例。HEAD（ca5303a）run 39988219952 的 visual job 亦已完成且 success（复现） |
| 每张更新的基线截图有一行理由 | **PASS** | `git diff --name-only 6312746..40a9331 -- tests/visual/reference/` = **41 个 PNG**，与 evidence §6 表逐组对账：home×3、about×3、apply×3+learning×3+party×3+article-detail-1440、article-detail-375/768、articles×3、campus×3、contact×3、courses×3+course-detail-375/768、gallery×3、partners×3、service-detail×3 = **41/41 全覆盖**，无未说明文件。备注：理由按路由组一行（×3 宽度同因），非严格逐文件一行，但每个文件可唯一映射到一行理由，可追溯性实质满足 |
| 每条残差可归入三类之一且有处置记录 | **PASS** | evidence §2 分诊表逐案例含「归类 + 处置」两列，无空项。所用标签为 数据差/渲染噪声/数据面缺口，与卡定义三类（样式回归/数据差/合理演进）的映射：数据面缺口→seed 增量（=数据差处置，提交 6312746）；渲染噪声→基线重生成（=合理演进处置，提交 40a9331）；**样式回归 0 例**（证据 = diff 图逐块对齐记录 + 验证者核实本波次 `src/**` 零改动）。标签名与卡片原文不一致，属表述偏差不属实质缺口（备注 1） |
| 首页 1440/768/375 三宽度高度互不相同（证明内容渲染） | **PASS** | 验证者用 python 读 PNG IHDR：home-1440 = 1440×**6204**，home-768 = 768×**6614**，home-375 = **9179** 高，三者互异。且新基线高度与分诊表 CI 实测 "actual" 值精确吻合（campus 3562/3602/5304、articles 2926/3528/5818、gallery 2042/2527/4037、partners 2138/3063/5383），证明基线与被测渲染同源 |
| continue-on-error=false 且后续 CI run 中 visual 失败会阻断 | **PASS** | ca5303a diff 核实：visual job `continue-on-error: true → false` 单行翻转（该文件唯一改动，恰在卡允许的"翻转一处"内）；HEAD ci.yml 同值。阻断性：job 级 flag=false 后 visual 失败将使 run 失败（GHA 标准语义；翻转前 flag=true 自 f221a2b 起）。HEAD run 39988219952 visual job success——负路径（visual 失败阻断 run）未实际演练，属结构性保证（备注 2） |

## 允许修改路径核对（含越界披露评估）

三个提交逐文件核对：

| 提交 | 文件 | 判定 |
|---|---|---|
| 6312746 | `prisma/seed-visual.ts`（+59 行）、`prisma/fixtures/visual/counts.json` | 允许路径内 ✓。diff 核实为**纯数据面增量**（serviceGuides 6 行 + hotMajors 10 行两个工厂 + PLAN 两行注册 + counts.json 增补），未触碰归 CI-01 的 ensureVisualAuthor/外键自足段 ✓ |
| 40a9331 | `tests/visual/reference/**` 41 个 PNG（`git show --name-only` 核实无其他文件） | 允许路径内 ✓ |
| ca5303a | `.github/workflows/ci.yml`（仅 continue-on-error 一行）、evidence/VIS-03/execution.md（§6） | 恰为卡允许的唯一例外 ✓ |

- 本波次（e2b65e1..HEAD）`src/app/(web)/**`、`src/components/web/**`、`src/styles/**` **零改动**——与"0 例样式回归、无需前台修复"的分诊结论自洽 ✓。
- 前台风格冻结（REQ-F-014）：无代码改动，仅基线数据集口径更新；结构一致性证据 = 分诊表 + diff 图（验证者未逐像素复核 diff 图，依据：新基线高度与 CI actual 全量吻合 + CI 复跑全绿）。
- workflow_dispatch 重生成入口由 643bebc（CI-01 所有权内的 ci.yml）引入，VIS-03 证据 §4 有记录——跨卡协同，无越界。

## CI 取证记录（run id + 结论 + 查询命令）

查询命令：`curl -s -H @"$HOME/.api-header" "https://api.github.com/repos/CodingHeader/HDwebsite/actions/runs?branch=upgrade&per_page=8"` 与 `runs/<id>/jobs`（验证者 2026-10-24 执行）。

| run | commit | 事件 | visual job 结论 |
|---|---|---|---|
| 39979767004 | f78cc1d | push | 首次完整跑通：Visual regression failure（41 差异）→ 分诊输入（artifact visual-results-39979767004） |
| 39982327648 | 6312746 | push | Visual regression failure（seed 增量后余文本差，符合预期路径） |
| 39983978470 | 6312746 | workflow_dispatch（visual_update_ref=true） | **全步 success**：Prepare DB / Clean build / Visual regression --update-snapshots / **Upload updated reference baselines** 均 success → 40a9331 入库的基线来源可追溯 |
| 39986975597 | 40a9331 | push | **job success**，log `46 passed`（45 visual + 1 功能） |
| 39988219952 | ca5303a | push | visual job **success**（flag=false 生效后首证）；docker success；gate 进行中（E2E 属 E2E-01） |

## 未重跑/受限项

1. `npm run test:visual` 本地未重跑——卡定义明确本地仅冒烟不作门禁（Windows 字体差异），门禁 = CI visual job，已由 API 取证。
2. 分诊依据的 diff 截图（artifact 24.9MB）未由验证者重新下载逐张核看；采用间接验证：基线高度 ↔ CI actual 精确对账 + 基线提交后 CI 复跑全绿 + src 零改动。
3. run 39988219952 gate job 验证时点未完成（其 E2E 结论归 V9-E2E-01，不影响本卡）。
4. state.json 的 VIS-03 条目验证时点仍为 `running`（commits 仅列 6312746）——最后一次 state 提交为 5d28314，早于 40a9331/ca5303a；属记账滞后，待收口时更新（备注 3）。

## 备注

1. 分诊标签（渲染噪声/数据面缺口）与卡定义三类字面不同但处置映射完整；建议 REL-02 收口时在 EXEC-round1 中注明等价关系，避免后续审计误读。
2. "visual 失败会阻断"目前是 flag=false 的结构性保证；首次真实演练将发生在下一次 visual 失败时（无需额外动作）。
3. EXEC-round1.md §4 仍为"（待补）"，CI-01 验证报告同款记账缺口；不影响本卡验收条目。
4. 全部 web 页 375 宽度基线像素宽 667（375 视口横向溢出），新旧基线一致（验证者比对旧图证实为既有特性，非本轮引入）。
5. 本地 dev.db 在验证者首跑 `--check` 时为新两表 0 行（执行者未对 dev.db 补种）；验证者已写模式补齐至 12/12 并证幂等。CI 门禁不受影响（CI 用全新库）。
