# STEP S2

## V12-VIS-01 Visual 基线漂移分诊与恢复（main-agent，中）
目标：对 36/46 失败逐组判定（真回归 vs 基线过期 vs 渲染噪声），据此修复或经 Linux CI 重生成基线，使 test:visual 门禁绿
步骤：依据 .cache/visual/results.json + 断点文档（2026-10-26-breakpoint-resume.md 分诊表），为 36 例逐组标注：真回归候选 / 内容或高度过期 / 渲染噪声；…（详见 tasks/V12-VIS-01.md）
验收：分诊表覆盖全部 36 例（三分类，逐组一行依据）