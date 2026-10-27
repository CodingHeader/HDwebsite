---
card: V14-UI-CONSIST-01
title: 管理端一致性审计矩阵
date: 2026-10-27
executor: external-assistant
status: PASS
---
# V14-UI-CONSIST-01 执行证据
## 5W1H 简版
- **What**：对管理端 42 个 `src/app/manager/**/page.tsx` 做一致性审计，输出 5 项自动化判定 + 3 项人工待核。
- **Why**：REQ-F-015 管理端“顶级体验”需要一致性证据；原卡仅 12 页，主控裁定扩至全量 42 页。
- **Where**：`src/app/manager/**`（只读扫描）、`src/components/manager/**`（只读扫描）、`scripts/audit-manager-ui.mjs`（新增）、证据目录。
- **Who**：external-assistant。
- **How**：脚本扫描 42 个 page.tsx，按 5 项判定；不修任何 `src/**` 代码。
- **What if**：发现 FAIL 只记录并分类（页面层待修 / 组件层待修 / 需开卡），交主控处置。
## 改动文件
- `scripts/audit-manager-ui.mjs`：新增审计脚本。
- `docs/design/06_validation/evidence/V14/UI-CONSIST-01/audit-matrix.md`：42 行 × 8 列 + 结论列，无空格子。
- `docs/design/06_validation/evidence/V14/UI-CONSIST-01/execution.md`：本证据。
## 验收结果
| 项 | 结果 | 说明 |
|---|---:|---|
| 审计页数 = 42 | PASS | 与 `find src/app/manager -name page.tsx` 一致 |
| 原生控件 | PASS（0 FAIL） | 无小写 `<button/<input/<select/<table/<textarea` 字面量；media 隐藏 file input 用 `createElement("input")`（E-06），注释里的 `<input` 已剥离 |
| 原生反馈 | PASS（0 FAIL） | 无 `window.confirm`/`alert(` 违规；测试文件 XSS 串排除 |
| 令牌作用域 | FAIL（2 页） | `content-hub`、`login` 出现非 `mgr-*` 硬编码色值（`text-black`、`text-gray-400`、`bg-[#f7f7f7]`、`text-white/80`、`#fff` 渐变） |
| PageHeader 存在性 | FAIL（29 页缺失） | 见矩阵；未用 `<PageHeader>` |
| 前台零改动 | PASS | `git diff` 前台路径为空 |
| 矩阵无空格子 | PASS | 42 行均填 5 脚本 + 3 人工“待核” + 结论 |
| 未修 `src/**` | PASS | 本次只新增脚本与证据 |
## 三类 FAIL 归类（交主控处置）
- **页面层待修**：`content-hub`、`login` 的硬编码色值（应改 `mgr-*` 令牌或语义类）。
- **需主控复核人工项**：五态覆盖、键盘可达、375px 可用，共 42 页，逐页填“待核”，不伪造判定。
- **缺 PageHeader 29 页**：属组件层/页面层待修，具体哪些页面应由主控判定是否必须加（部分页面可能无标题场景，不能武断判 FAIL 后直接改）。
## UNKNOWN
- 3 项人工待核未判定：由主控复核（本卡明确不伪造）。
- 令牌作用域的正则只识别 hex/rgb/hsl/颜色名，未识别 Tailwind 的 `from-*`/`to-*`/`via-*` 渐变色值类与 CSS 变量引用；若主控要求更强口径，需扩展脚本。