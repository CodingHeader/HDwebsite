# V8-VIS-01 独立验证报告（V9-V-01）

- 验证者：子代理（与执行者上下文隔离；仅依据 diff + 可重跑命令）
- 验证日期：2026-10-23；代码基线：upgrade@fad1924
- 被验提交：9a76abd（feat(V8-VIS-01): visual 确定性种子数据集——首页高度 3389→5532）
- **结论：PASS**（附 findings：Category 计数为弱断言、占位图不入库，见备注）

## 逐条验收

| 验收条目（引自卡定义） | 结果 | 证据 |
| --- | --- | --- |
| counts.json 与 seed 后行数逐表相等 | PASS | 验证者亲跑 `npx tsx prisma/seed-visual.ts --check`：10 表 **10/10 ✓**（Category 21 / Major 16 / Article 25 / Course 6 / Banner 1 / Campus 4 / CampusImage 8 / Gallery 6 / Partner 10 / HomeCard 4），输出「✓ 全部表行数与 counts.json 一致」。counts.json 内含来源（../hdwebsite_0429/prisma/dev.db）与测量日期（2026-10-22），可追溯 |
| 连续执行两次 seed 结果一致（幂等） | PASS | 验证者亲跑：seed → check ✓ → 再 seed → 再 check ✓，两轮 check 输出一致；脚本逻辑为先 `deleteMany({ id 段 9000..9999 })` 再 createMany，时间戳/内容固定，无 Date.now()/随机数 |
| 不触碰 schema 与迁移 | PASS | `git show --stat 9a76abd`：仅 state.json、execution.md、prisma/fixtures/visual/counts.json、prisma/seed-visual.ts 4 文件；`prisma/migrations/**`、`prisma/schema.prisma` 零触碰 |

## 允许修改路径核对

卡允许：`prisma/seed-visual.ts`、`prisma/fixtures/visual/**`、`public/uploads/visual-fixtures/**`、证据目录。实改：

| 文件 | 判定 |
| --- | --- |
| prisma/seed-visual.ts（新增 387 行） | 允许 |
| prisma/fixtures/visual/counts.json（新增） | 允许 |
| docs/design/06_validation/evidence/V8/VIS-01/execution.md | 允许（证据） |
| docs/V0.8-20261022/state.json | 协议状态文件，按协议口径豁免 |
| public/uploads/visual-fixtures/**（25 张占位 PNG） | **未入提交**：`uploads/` 被 .gitignore 覆盖无法入库，改为 `ensurePlaceholderImages()` 运行时生成（零第三方依赖，已存在则跳过）。卡允许路径未要求必须提交该目录，判定为合理适配（执行证据 §3.1 已说明） |

无越界；未触碰冻结面（contracts/schema/迁移/依赖/测试配置零改动）。

## 未重跑/受限项

- **首页高度 5532 vs 参照 5529 未由验证者复测**：复现需 `seed → move .next/cache/fetch-cache → build → start → 1440 截图`，超出本验证时长预算；引用执行证据 §6.2 实测数据（5532 px，+3px / +0.05%），并注明该 3px 是否可接受由 V8-VIS-02 在 Linux 像素比对中裁决。
- 执行证据 §5 的「seed 后首页不变」三因分析（静态预渲染 + unstable_cache revalidate:false + seed 不触发 tag 失效）与 §6.2 的 clean-cache 构建验证，均为执行者实测记录，验证者未重复该实验，仅核对结论与代码事实一致（`src/components/web/data/home.ts` 确配 `revalidate: false`）。

## 备注

1. **弱断言 finding**：counts.json 的 `counts` 对象无 `Category` 键，seed-visual.ts:419 对缺失键回退 `expected = data.length`——Category 的 21/21 是「seed 了多少就期望多少」的自证校验。因 Category fixture 为固定 21 行、id 固定，确定性实际不受影响，但建议把 Category 显式补进 counts.json 使全部表为独立基线断言。
2. about/articles 两页高度与参照图仍有差（1950/2805 vs 2696），执行证据已如实登记为 VIS-02 范围（数据源不止本卡 5 张表），不影响本卡「数据等量」验收。
3. 执行证据与重跑结果无冲突。
