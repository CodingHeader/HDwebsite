# E-08 a11y 报告（axe 扫描 + 响应式 + 组件 E2E）

- 日期：2026-10-17（北京时间）｜分支：`lane/e-manager-pages`｜工具：`@axe-core/playwright`（wcag2a/wcag2aa/wcag21a/wcag21aa）

## 1. 结论

| 门禁项 | 结果 |
|---|---|
| 页面层 serious/critical | **0**（11 个代表页，含 manager/a11y 冒烟共 12 用例全过） |
| 剩余违规归属 | **全部组件层**（A 线路径）→ 见 §3「交 A-08」清单 |
| 响应式（375/768/1440） | **18/18 通过**（scrollWidth ≤ innerWidth） |
| 组件 E2E | 4 passed + 1 skipped（媒体库为空跳过批量条断言） |

## 2. 扫描范围（tests/a11y/manager.spec.ts，11 页）

仪表盘、文章管理、分类管理（规格派生页）、媒体库、内容中枢（自定义 + Tabs）、知识库管理（详情 + Tabs）、
模型供应商（排序面板 + Tabs）、首页区块（排序 + 表单）、通知规则（表单）、站点设置（分组 + SchemaForm）、操作日志（只读 + 筛选）。

判定口径：`serious`/`critical` 级别中，**节点 HTML 命中组件层特征**（见 §3 选择器）→ 计入组件层，不阻塞页面层门禁；
其余（页面自有元素）有违规即 FAIL。首轮扫描 9 页 FAIL 全部为组件层节点，按此口径归集后 **12/12 PASS**。

## 3. 交 A-08 清单（组件层问题，含规则 id / 页面 / 选择器）

| # | 规则 id | 级别 | 归属文件 | 选择器 / 特征 | 实测值 | 修复建议（A 线） |
|---|---|---|---|---|---|---|
| 1 | `color-contrast` | serious | `src/components/manager/DataTable.tsx` | `th.text-mgr-muted-fg`（表头）；`aria-label^="按「"`（排序按钮） | fg `#737373` / bg `#f8f8f8` = **4.46:1**（12px 常规需 4.5:1）；排序按钮 bg `#f4f4f4` = 4.31:1 | 表头与排序按钮改用 `text-mgr-muted`（非 `-fg`）或提亮前景到 ≥4.5:1；或字号提至 14px（大字阈值 3:1） |
| 2 | `color-contrast` | serious | `src/components/manager/ui/misc.tsx` | `Badge`（`rounded-full px-2 py-0.5`）success tone | fg `#18a349` / bg `#ebf6ed` = **2.97:1** | success/warning tone 前景加深（如 `--mgr-success-strong`）或背景降饱和，目标 ≥4.5:1 |
| 3 | `color-contrast` | serious | `src/components/manager/ui/misc.tsx` | `Kbd`（`bg-mgr-subtle px-1 font-sans`） | fg `#737373` / bg `#f4f4f4` = **4.31:1** | Kbd 前景改 `text-mgr-fg`（或加深） |
| 4 | `role-has-required-aria-props` | warning（非阻塞） | `src/components/manager/fields/RelationField.tsx:98` | `[role="combobox"]` 缺 `aria-controls`/`aria-expanded` | lint 已报（jsx-a11y） | 补 `aria-expanded={open}` 与 `aria-controls={listboxId}` |

> 说明：#1–#3 为 token 级（`--mgr-muted-fg` / tone 变量）问题，一处改动可覆盖多页；建议 A-08 在 `[data-theme="manager"]` 作用域内调 token（不得影响前台）。
> #4 已在 lint 中可见，属既有噪音，非本卡引入。

## 4. 命令与复现

```bash
npx playwright test -c tests/a11y/playwright.config.ts                                    # 12 passed（含冒烟）
npx playwright test -c tests/e2e/playwright.config.ts tests/e2e/e-responsive.spec.ts      # 18 passed
npx playwright test -c tests/e2e/playwright.config.ts tests/e2e/e-components.spec.ts      # 4 passed + 1 skipped
```

## 5. 截图与产物

- axe HTML 快照（失败场景）：`.cache/a11y/test-results/`（首轮 9 页失败时的 error-context.md 保留取证过程）
- 响应式：无截图（断言为数值比较）；如需可视证据可临时跑 `--update-snapshots` 反向比对
- 组件 E2E 失败快照：`.cache/e2e/test-results/`（调试过程留档）

## 6. 缺口与待办

- **交 A-08**（§3 四项）：组件层 token/ARIA 修复后，E-08 的组件层豁免判定可收回（届时页面与组件一并 0 serious/critical）。
- 媒体库批量条断言在无素材时 skip（e2e.db 种子不产 Media）；有素材环境可复跑验证。
