# A-08 执行证据：组件层 a11y/响应式修复（响应 E-08「交 A-08」清单）

- 5W1H 简版：Who=执行线 A（lane/a-manager-ui）；What=按 W1-E/a11y-report.md §3 清单逐条修复组件层 color-contrast/ARIA；When=2026-10-17（北京时间）；Why=M-3（axe serious/critical=0）；How=组件内就地加深前景色（不改 globals.css——A-08 未放行全局令牌），RelationField 补 aria-controls。

## 集成复测（步骤 1）
- `git merge --no-ff lane/e-manager-pages`（316add3）——A 线取得 E 线全部（E-01~E-12 + W1-E 证据），三份验证文件（a11y/e-responsive/e-components）就位。**首跑 a11y 12/12 已通过**（E-08 守卫豁免生效）。

## 逐条修复（步骤 2，清单回填）
| # | 清单项（W1-E/a11y-report.md §3） | 修复 | 文件 |
|---|---|---|---|
| 1 | DataTable 表头/排序按钮 color-contrast 4.46/4.31:1 | 表头两处 `text-mgr-muted-fg` → `text-[oklch(0.44_0_0)]`；排序链接 tone `muted`；列菜单标题、每页条数 label 同步 | `DataTable.tsx:205,368,444,463,573` |
| 2 | Badge success 2.97:1（含 warning/danger/info/neutral） | 五个 tone 前景改深色（success `oklch(0.45 0.13 149)`≈5.2:1、warning `0.47 0.14 60`、danger `0.48 0.21 27.3`、info `0.47 0.14 241`、neutral `0.44 0 0`） | `ui/misc.tsx:11-18` |
| 3 | Kbd 4.31:1 | `ui/misc.tsx` Kbd 前景 `text-mgr-muted-fg` → `text-[oklch(0.44_0_0)]`；`shell/CommandPalette.tsx:92` 内联 Kbd 同步 | `ui/misc.tsx:55`、`shell/CommandPalette.tsx:92` |
| 4 | RelationField combobox 缺 aria-controls | 补 `aria-controls="relation-field-listbox"` + listbox `id` | `fields/RelationField.tsx` |

**修复方式说明**：`--mgr-muted-fg`（oklch 0.556）与 tone 变量在 `globals.css`（**A-08 未放行**，属冻结面周边），故在组件层用等色相深色值就地覆盖——不触碰全局令牌、不影响前台（组件仅 `[data-theme="manager"]` 内使用）。

## 严格复测（无豁免，临时 QA spec，跑完即删）
用一次性 `tests/a11y/zz-a08-strict.spec.ts`（**不含任何组件层豁免**）在 11 页严格扫描：
- 首轮（旧构建）：11 页 FAIL
- rebuild 后：**10/11 PASS**
- 修 `shell/CommandPalette.tsx` Kbd 后：**11 页中 10 页 PASS**，唯一 FAIL = `/manager/settings`
- 该 FAIL 根因：`src/app/manager/settings/page.tsx:168` **内联** `<kbd className="… bg-mgr-subtle px-1 font-sans">Ctrl</kbd>`（未用 `ui/misc` 的 Kbd，前景继承 `--mgr-muted-fg` = 4.31:1）——**settings 页属 E 线路径，A-08 不越界修改**
- QA spec 已删除（不入库）；日志留存 `.cache/a11y-strict{,2,3}.log`

## 验收逐条
| 验收项 | 结果 | 证据 |
|---|---|---|
| a11y serious/critical = 0（A+E 集成集） | PASS | `tests/a11y` **12 passed**（含冒烟；守卫判定下页面层 0） |
| e-responsive、e-components 全部通过 | PASS | **22 passed + 1 skipped**（媒体库空跳过批量条） |
| visual：失败集 ⊆ {courses@375} 且差异不增 | PASS | **45 passed / 1 failed = courses@375**（26989px，与 M1 基线同值） |
| /manager/articles 首屏 JS 达 A-05 上限 | PASS | A-05 已合入（125120 B ≤ 359059 验收线），本卡未改首屏包 |
| 通用门禁 4 项 exit 0 | PASS | lint=0、typecheck=0、vitest 全过、build=0 |
| 越界检查 | PASS | 仅 `src/components/manager/**`，越界 0 |

## 命令
```bash
npx playwright test -c tests/a11y/playwright.config.ts                          # 12 passed
npx playwright test -c tests/e2e/playwright.config.ts tests/e2e/e-{responsive,components}.spec.ts  # 22 passed + 1 skipped
npm run test:visual                                                            # 45/46（courses@375）
npm run lint && npm run typecheck && npm test && npm run build                  # 全 exit 0
```

## UNKNOWN / 残留（交 E 线，非 A-08 范围）
- **`/manager/settings` 严格模式残留 1 项**：settings 页内联 Kbd（`page.tsx:168`）未用 `ui/misc` 的 Kbd 组件 → 严格无豁免扫描下 4.31:1。**修复建议（E 线）**：改用 `<Kbd>` 组件或就地加深前景；E 线任意后续卡（或 W2 集成）可一行完成。
- 修复后 E-08 的组件层豁免判定（`tests/a11y/manager.spec.ts` 的 `isComponentOwnedNode`）可收回为严格模式（tests/a11y 属 E 线文件）。

## 后续方向待办
- E 线：settings 页内联 Kbd 一行修复 + 收回 E-08 豁免判定（严格化）。
- W2-01（A-08 Blocks）：按 W2 集成编排执行。
