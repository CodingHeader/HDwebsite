# W0-08 · 参照图重新生成偏差登记（用户批准，2026-10-15）

> 依据：`17-V0.5-W0-08门禁环境裁决.md` §3 选项 A（批准参照图重生成的越权偏差，"有条件"）+ 用户裁决 `approve_regen_reference`（2026-10-15，request_id=decision_2f02996e1b9c4dd5b6c6d07591978944）。
> 本偏差登记是 W0-08 卡内允许路径（`docs/design/06_validation/evidence/W0/**`）下的合规产物；参照图文件本身的修改经用户明确批准后执行。

## 1. 触发事实

| # | 事实 | 证据 |
|---|---|---|
| F1 | 官方 visual 真实结果 **4 passed / 41 failed / 2.3m**（`--output` 绕过 busy 目录后官方 runner 跑通） | `visual-windows-fail.log` |
| F2 | 失败根因：**参照图基线整体过期**——页面高度系统性暴增（home@1440 Expected 1440×5529，received 1440×11446；另见 1950→3379、1460→3150 等系统性翻倍） | `visual-windows-fail.log`；`visual-hang-evidence.md` §7.3 |
| F3 | **非代码违规**：两站互拍（main:6790 vs upgrade:6789）diff≈0.13%（同一渲染环境 A/B），main 与 upgrade 渲染一致；差异来自 827646b 里的参照图（10-13 快照）与当前 main 站点（动态数据增长）渲染的差距 | `courses-375-visual-rootcause.md`；`visual-hang-evidence.md` §6 |
| F4 | 参照图是 main 的视觉标准（裁决 §3 A 选项原文），过期基线必须从 main 重新生成才能闭环 | `17-V0.5-W0-08门禁环境裁决.md` §3 |

## 2. 用户裁决

- **批准从 main:6790 重新生成参照图**（用户裁决 `approve_regen_reference`，覆盖本卡硬约束"只允许还原"，属用户主动授权的偏差）。
- 生成命令与 main 提交号必须附上（W0-08 卡步骤 4 要求）。

## 3. 执行记录

| 动作 | 命令 | 结果 |
|---|---|---|
| 生成前基线 | `git rev-parse HEAD` | `0cc257dd84043a415536663809bcfb18c116b843`（SHA_GATE） |
| main 提交号 | main worktree（6790 站） | `94dbbbb`（origin/main，裁决 §0 规划快照） |
| 重新生成 | `VISUAL_REF=1 VISUAL_BASE_URL=http://127.0.0.1:6790 npx playwright test tests/visual --update-snapshots --output=.cache/visual/tr-fresh` | 见 §5 |
| 环境适配 | 追加 `--output=.cache/visual/tr-fresh` 绕开被 busy 文件（`courses-375-actual.png`，占用进程无法定位）阻塞的旧 outputDir；不改 `playwright.config.ts`、不改测试代码 | 已在 `visual-hang-evidence.md` §7.2 验证 |
| 生成后验证 | `npm run test:visual`（upgrade，6789） | 见 §5 |

## 4. main worktree 检出记录

- main 参照站：`E:\Code\Demo\HDwebsite\hdw-main-wt`，检出 `origin/main@94dbbbb`，`npm start`（standalone）监听 `127.0.0.1:6790`，health 200。
- 对照口径：`playwright.config.ts` 注释原文"参照截图（main）：VISUAL_REF=1 VISUAL_BASE_URL=http://127.0.0.1:6790 npm run visual:reference"。

## 5. 结果（已回填，2026-10-15 13:2x）

- 重新生成命令：`VISUAL_REF=1 VISUAL_BASE_URL=http://127.0.0.1:6790 npx playwright test tests/visual --update-snapshots --output=.cache/visual/tr-fresh --reporter=line` → **EXIT=0，45 passed（regen 模式，banner 用例在 main 参照站正常 skip）**，运行 2.0m。
- 重新生成后 `git status --short tests/visual/reference/` 变更文件数 = **32**（45 张中 32 张与 827646b 版本不同，均为 main:6790 当前渲染）。
- 重新生成后官方 visual（upgrade，6789）：`VISUAL_BASE_URL=http://127.0.0.1:6789 npx playwright test tests/visual --output=.cache/visual/tr-fresh --reporter=line` → **45 passed / 1 failed / 1.3m**，唯一失败 `courses @375`。
- **courses@375 诊断（确定性差异，为 A/E 线提供）**：
  - 差异量：26989 像素（ratio 0.02，刚超 1% 阈值），两次运行**像素数完全一致**（26989）→ 确定性，非偶发/超时。
  - 差异形态（Playwright diff 图 + 视觉检查）：**全页文字级渲染差异**（导航、标题、筛选胶囊、全部课程卡文字/价格、页脚均沿字形笔画高亮），**无结构错位、无色块偏移、无元素增删**；图片/色块区域未高亮。
  - DOM 级对比（375 视口，两站）：scrollHeight=4000、bodyScrollWidth=667、课程卡 6 张、sticky 头部与"在线客服/官方微信/校长电话"悬浮面板盒子坐标完全一致；唯一 DOM 差异为 upgrade 多一个 `data-visual-ignore` 的 AI 按钮（fixed 48×48，测试中 visibility:hidden 隐藏，此前证据已证 actual 中其紫色像素=0）。
  - 参照图：`tests/visual/reference/courses-375.png`（667×4000）已按 main:6790 当前渲染重新生成；upgrade 实际渲染与其存在 0.02 的文字级差异 → **upgrade 前台在 375 宽度下的文字渲染与 main 存在真实差异**，属 A/E 线待办（本卡不改页面）。
- 该偏差已由用户裁决批准（`approve_regen_reference`），参照图重新生成后随本卡提交入 upgrade 分支，作为 Wave 1 各线的新基线。
