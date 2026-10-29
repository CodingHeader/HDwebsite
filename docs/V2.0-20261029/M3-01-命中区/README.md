# M3-01 · 命中区 ≥44px（方案 A · 全局提升）

## 归属

- 阶段编号：M3-01
- 分组：遗留修复
- 来源：V1.9 B3 的 40 个 M3 FAIL（`evidence/V19/B3/cells.json`）

## 裁决：方案 A（全局提升）

> **裁决日期**：2026-10-29 ｜ **裁决人**：用户
> **结论**：全局提升至 44px，**桌面端同样生效**。

**规划者原建议方案 B（仅移动端）已被否决。** 本卡按方案 A 实施，不再讨论范围。

已知代价（用户主动选择，记录在案）：

| 代价 | 影响 |
|---|---|
| 桌面密度变松 | 表格行、工具栏、表单间距整体上升 |
| B2 参照失效 | 键盘验收基于 36px 布局，尺寸变化后需在 E1 复核 Tab 顺序 |
| 视觉基线需重建 | 尺寸变化必然影响像素对比，交 Linux CI |
| 与 main 差异扩大 | main 为 36px 密度 |

方案 A 的好处：一次改完无不一致、WCAG 2.5.8 全站达标、实现只需改令牌常量。

---

## 目标

管理端所有**可交互控件**的命中区高度 ≥44px，使 B3 的 M3 从 40 FAIL 归零。

## 为什么需要它（三级凭据）

### ① 来源
- V1.3 `STEP-S3.md:27`：「375px 下命中区 `min-h-11`（≥44px）」—— 原约束对象是**审核单选项**
- V1.4 `06-验收体系.md:73`：Q6「命中区 ≥44px」
- V1.8 B3 卡 `README.md:57`：M3「≥44×44」
- **用户 2026-10-29 裁决**：扩至全部控件，且不区分视口

### ② 实现
```ts
// src/components/manager/ui/button-class.ts:20-24
const sizes = {
  sm: "h-8  px-2.5 text-[12px] ...",   // 32px
  md: "h-9  px-3.5 text-[13px] ...",   // 36px
  lg: "h-10 px-4   text-[14px] ...",   // 40px
};

// src/components/manager/ui/input.tsx:18,41,151,172  —— 全部硬编码 h-9（36px）
```

### ③ 验证
```bash
$ node -e "读取 evidence/V19/B3/cells.json ..."
尺寸分布: { '76x36': 40 }      ← 40 个 FAIL 全是同一尺寸
M2 {"PASS":36,"N-A":7}          ← 核心操作可达零 FAIL（纯尺寸问题）
```

---

## 方案 A 实施清单（**36 处 / 20 文件**，实测清点）

> 清点命令（可复跑）：
> ```bash
> grep -rnE "h-(7|8|9|10)\b" src/components/manager/ --include=*.tsx --include=*.ts \
>   | grep -vE "th scope|<th |ShieldOff|<Bone|<Skeleton|<img |h-10 w-16|rounded-full bg-mgr-primary"
> ```
> 输出 36 行。下表逐行对应，**不得漏改**。

### 组 1 · 按钮尺寸令牌（3 处 → 全部 `h-11`）

| # | 文件:行 | 现值 | 改为 |
|---|---|---|---|
| 26 | `ui/button-class.ts:21` | `sm: "h-8 ..."` | `sm: "h-11 ..."` |
| 27 | `ui/button-class.ts:22` | `md: "h-9 ..."` | `md: "h-11 ..."` |
| 28 | `ui/button-class.ts:23` | `lg: "h-10 ..."` | `lg: "h-11 ..."` |

⚠️ **三档统一 44px**。若留 `sm: h-10`（40px）仍不达标。

### 组 2 · 输入类（7 处）

| # | 文件:行 | 现值 | 改为 | 备注 |
|---|---|---|---|---|
| 32 | `ui/input.tsx:18` | `"h-9"` | `"h-11"` | Input |
| 33 | `ui/input.tsx:41` | `"h-9 appearance-none pr-8"` | `"h-11 ..."` | Select |
| 34 | `ui/input.tsx:151` | `"h-9 pl-8 pr-8 ..."` | `"h-11 ..."` | SearchInput |
| 35 | `ui/input.tsx:172` | `"h-9"` | `"h-11"` | 另一 Input 分支 |
| 10 | `fields/RelationField.tsx:113` | `"h-9 w-full ..."` | `"h-11 w-full ..."` | 关联下拉 |
| 7 | `feedback/styles.ts:34` | `inputCls = "h-9 w-full ..."` | `"h-11 w-full ..."` | **⚠️ 关键** |
| 31 | `ui/form-field.tsx:73` | `min-h-9` | `min-h-11` | 字段容器 |

**⚠️ #7 是最容易漏的一处**：`feedback/styles.ts:34` 的 `inputCls` 被 `SearchInput.tsx:8` 直接引用，**是工具栏搜索框 343×36 的真正来源**。只改 `ui/input.tsx` 不改它，搜索框仍是 36px。

### 组 3 · 旧样式兼容层（3 处）

| # | 文件:行 | 现值 | 改为 | 备注 |
|---|---|---|---|---|
| 5 | `feedback/styles.ts:8` | `base: "... h-9 ..."` | `h-11` | 旧 `btn.base`（已被 `btnCls` 替代，但常量仍在） |
| 6 | `feedback/styles.ts:13` | `sm: "h-8 px-2.5 ..."` | `h-11` | 旧 `btn.sm` |
| 7 | 见组 2 | — | — | （同上，`inputCls`） |

> **说明**：`btn.base`（#5）实际已由 `btnCls()` 转调 `buttonClass()` 取代，直接引用 `btn.base` 的地方可能已无。**执行时先 `grep -rn "btn\.base\|btn\.sm" src/` 确认是否还在用**；若已是死代码，改为 `h-11` 保持一致即可，不必删（删属额外清理，另立卡）。

### 组 4 · 图标按钮 / 关闭按钮（6 处 → `h-11 w-11`）

| # | 文件:行 | 现值 |
|---|---|---|
| 29 | `ui/button.tsx:64` | `size === "sm" ? "h-7 w-7 ..." : "h-9 w-9 ..."` |
| 30 | `ui/dialog.tsx:36` | `h-8 w-8` |
| 3 | `DetailDialog.tsx:34` | `h-8 w-8` |
| 13 | `FormDialog.tsx:106` | `h-8 w-8` |
| 15 | `shell/AppShell.tsx:92` | `h-8 w-8` |
| 11 | `fields/RichTextEditorCore.tsx:35` | `h-8 w-8` |

⚠️ **`h-11 w-11` 是点击区 44×44，内部图标尺寸不动**（`[&_svg]:h-3.5` 等保持）。视觉上按钮变大、图标不变。

### 组 5 · 表格行内操作与分页（2 处）

| # | 文件:行 | 现值 | 改为 |
|---|---|---|---|
| 1 | `DataTable.tsx:212` | `block ? "h-8 justify-center ..."` | `h-11 justify-center` |
| 14 | `Pagination.tsx:27` | `"inline-flex h-8 min-w-8 ..."` | `"inline-flex h-11 min-w-11 ..."` |

⚠️ `Pagination` 的 `min-w-8` **必须同步改 `min-w-11`**，否则按钮 44×32（宽不足）。

### 组 6 · 标签页 / 过滤标签（3 处）

| # | 文件:行 | 现值 |
|---|---|---|
| 36 | `ui/misc.tsx:100` | `-mb-px inline-flex h-9 ...`（Tab） |
| 12 | `FilterTabs.tsx:36` | `h-7 rounded-[5px] px-3 ...` |
| 8 | `fields/MarkdownField.tsx:22` | `h-7 rounded px-2.5 ...`（Markdown/HTML 模式切换） |

### 组 7 · 导航壳（11 处）

| # | 文件:行 | 元素 |
|---|---|---|
| 16 | `shell/Sidebar.tsx:59` | 侧栏菜单项 `h-9` |
| 17 | `shell/Sidebar.tsx:71` | 侧栏 logo 方块 `h-8 w-8` |
| 18 | `shell/Sidebar.tsx:189` | 侧栏折叠项 `h-9 w-full` |
| 19 | `shell/Topbar.tsx:39` | 移动端菜单按钮 `h-9 w-9` |
| 20 | `shell/Topbar.tsx:52` | 顶栏搜索框 `h-9` |
| 21 | `shell/Topbar.tsx:62` | 顶栏图标按钮 `h-9 w-9` |
| 22 | `shell/UserMenu.tsx:55` | 用户菜单触发器 `h-9` |
| 23 | `shell/UserMenu.tsx:90` | 菜单项按钮 `h-8` |
| 24 | `shell/UserMenu.tsx:107` | 菜单项 `h-9` |
| 25 | `shell/UserMenu.tsx:116` | 退出项 `h-9 w-full` |
| 9 | `fields/MarkdownField.tsx:38` | 工具栏按钮 `h-7` |

**⚠️ #17（侧栏 logo 方块 32×32）不是交互控件**，但视觉上与菜单项并排，若菜单项都 44px 而 logo 保持 32px 会失衡。**建议一并改 44px**，在 evidence 说明理由。

### 组 8 · 其他（2 处）

| # | 文件:行 | 元素 |
|---|---|---|
| 4 | `feedback/ConfirmDialog.tsx:81` | 确认弹窗图标圆 `h-10 w-10`（**非交互，装饰性**） |
| 2 | `DataTable.tsx:444` | 表头 `h-10`（**非交互**） |

**这 2 处不需改**——但它们在 36 行清点结果内（因不匹配排除规则）。执行时**跳过 #2 与 #4**，并在 evidence 写明为何跳过。

### 汇总

| 组 | 处数 | 需改 |
|---|---:|---|
| 1 按钮令牌 | 3 | ✅ |
| 2 输入类 | 7 | ✅ |
| 3 旧样式层 | 3 | ✅（含与组 2 重叠的 #7） |
| 4 图标按钮 | 6 | ✅ |
| 5 表格/分页 | 2 | ✅ |
| 6 标签页 | 3 | ✅ |
| 7 导航壳 | 11 | ✅ |
| 8 非交互 | 2 | ❌ 跳过 |
| **合计** | **36** | **34 处实改** |

**实改 34 处，20 个文件。**

### 不需要改的（已确认非交互）

| 文件:行 | 元素 |
|---|---|
| `DataTable.tsx:157` | 图片缩略图 `h-10 w-16` |
| `DataTable.tsx:463` | 右侧固定表头 `<th h-10>` |
| `feedback/Forbidden.tsx:18` | 图标 `<ShieldOff h-7 w-7>` |
| `feedback/PageSkeleton.tsx:22,32` | 骨架屏 |
| `fields/ImageField.tsx:28` | 预览缩略图 `h-9 w-9` |
| `fields/RichTextField.tsx:22` | 骨架 |
| `shell/UserMenu.tsx:57` | 头像方块 `h-7 w-7`（视觉元素） |

---

## 输入

- 前置：**裁决 D-20-01（已定：方案 A）**
- 已证实：40 页均为 `76×36`；M2 零 FAIL
- 已定位：**36 处高度类，其中 34 处需实改**（见实施清单）

## 输出

- **19 个文件、34 处**高度类改动
- `docs/design/06_validation/evidence/V20/M3-01/`
  - `execution.md`：34 处改动清单与理由（含 2 处跳过的说明）
  - `verify.json`：375 与 1440 两视口的控件尺寸实测

## 核心判据（方案 A）

```
PASS = 375px 视口下，核心控件 ≥ 44×44
     ∧ 1440px 视口下，核心控件同样 ≥ 44×44（方案 A 与 B 的关键差异）
     ∧ M3 的 40 FAIL 归零
```

**注意：桌面端也必须 ≥44px。** 这是方案 A 的定义。若桌面仍为 36px，说明漏改或加了 `md:` 前缀，属**实施错误**。

## 必测控件清单

来源 `evidence/V19/B3/defects.md:22-28` + 本卡清单：

| 控件 | 位置 | 原尺寸 | 目标 |
|---|---|---|---|
| `新建` 按钮 | CrudPage 页头（40 页） | 76×36 | ≥44 高 |
| 搜索输入框 | CrudPage toolbar | 343×36 | ≥44 高 |
| `content-hub 新建内容` | content-hub | 68×32 | ≥44 |
| `notify-rules 编辑` | notify-rules 行操作 | 70×32 | ≥44 |
| `collect-items 审阅` | collect-items 行操作 | 52×32 | ≥44 |
| `login` 输入框 | login | 293×40 | ≥44 |
| `login` 登录按钮 | login | 293×40 | ≥44 |
| 分页按钮 | 各列表页 | 32×32 | ≥44×44 |
| 对话框关闭按钮 | 各弹窗 | 32×32 | ≥44×44 |

## 执行步骤

| 步 | 内容 |
|---|---|
| 1 | 按 §A~§H 逐项改，**每改一个文件记录改动行** |
| 2 | `npx tsc --noEmit` 确认无类型错误 |
| 3 | `npm run build` 确认 Tailwind 能生成 `h-11`（Tailwind v4 JIT） |
| 4 | 375 视口实测：跑 measure 脚本，逐控件记尺寸 |
| 5 | **1440 视口实测：同样逐控件记尺寸**（方案 A 必测） |
| 6 | 跑 `mobile-375` spec 确认无横向溢出（M1 回归） |
| 7 | 跑 `npm test` 确认 `data-table.test.tsx` 等未因尺寸假设失败 |
| 8 | 写 evidence |

### ⚠️ 三个实施陷阱

**陷阱 1 · `h-11` 是固定高度，不是最小高度**

`h-11` = `height: 2.75rem` = 44px（固定）。若有内容换行，可能溢出。

**建议**：单行控件用 `h-11`，愿多行容器（如 textarea）用 `min-h-11`。检查 `input.tsx` 的 textarea 分支（若有）是否误加。

**陷阱 2 · `min-w-8` 必须同步改**

`Pagination.tsx:27` 的 `h-8 min-w-8`，若只改高度不改宽度，按钮变成 44×32（宽 32 <44），仍不达标。

**陷阱 3 · 表格行高会变，可能引发 M1 横向溢出回归**

行内按钮 32→44 会让表格行变高，在 375px 下可能挤压导致横向滚动。**必须跑 `mobile-375` 确认 M1 未回归。**

## 验收的量化证据

```json
{
  "viewport375": [
    { "page": "/manager/tags", "control": "新建", "w": 76, "h": 44, "pass": true },
    { "page": "/manager/tags", "control": "搜索框", "w": 343, "h": 44, "pass": true },
    { "page": "/manager/tags", "control": "分页按钮", "w": 44, "h": 44, "pass": true }
  ],
  "viewport1440": [
    { "page": "/manager/tags", "control": "新建", "w": 76, "h": 44, "pass": true },
    { "page": "/manager/tags", "control": "搜索框", "w": 343, "h": 44, "pass": true }
  ]
}
```

**两个视口都必须 ≥44。**

## 允许修改

**共 19 个文件**（对应实施清单 34 处实改）：

### 核心令牌（6 个）
- `src/components/manager/ui/button-class.ts`（3 处）
- `src/components/manager/ui/button.tsx`（1 处，`:64`）
- `src/components/manager/ui/input.tsx`（4 处）
- `src/components/manager/ui/dialog.tsx`（1 处，`:36`）
- `src/components/manager/ui/form-field.tsx`（1 处，`:73`）
- `src/components/manager/ui/misc.tsx`（1 处，`:100`）

### 旧样式兼容层（1 个）
- `src/components/manager/feedback/styles.ts`（3 处：`:8` `:13` `:34`）

### 表格与分页（2 个）
- `src/components/manager/DataTable.tsx`（仅 `:212`；**禁止改 `:157` `:444` `:463`**）
- `src/components/manager/Pagination.tsx`（仅 `:27`）

### 对话框（2 个）
- `src/components/manager/DetailDialog.tsx`（仅 `:34`）
- `src/components/manager/FormDialog.tsx`（仅 `:106`）

### 字段组件（3 个）
- `src/components/manager/fields/RelationField.tsx`（仅 `:113`）
- `src/components/manager/fields/MarkdownField.tsx`（`:22` `:38`）
- `src/components/manager/fields/RichTextEditorCore.tsx`（仅 `:35`）

### 标签与过滤（1 个）
- `src/components/manager/FilterTabs.tsx`（仅 `:36`）

### 导航壳（4 个）
- `src/components/manager/shell/Sidebar.tsx`（`:59` `:71` `:189`）
- `src/components/manager/shell/Topbar.tsx`（`:39` `:52` `:62`）
- `src/components/manager/shell/UserMenu.tsx`（`:55` `:90` `:107` `:116`；**禁止改 `:57` 头像**）
- `src/components/manager/shell/AppShell.tsx`（仅 `:92`）

### 证据
- `docs/design/06_validation/evidence/V20/M3-01/**`
- `.cache/v20-m3/**`

## 禁止修改

- `src/contracts/**`、`prisma/**`、`package.json`
- `src/app/(web)/**`、`src/components/web/**`（**前台冻结**）
- `tests/e2e/mobile-375.spec.ts` 的 `toBeLessThanOrEqual(375)` 阈值
- V1.8/V1.9 历史目录与证据
- 不得为通过 M3 而改 B3 的判据或 matrix
- **不得加 `md:` 前缀**（那是方案 B，已被否决）

## 验证命令

```bash
cd "E:/Code/Demo/HDwebsite/hdwebsite_1011"

# 1) 类型
npx tsc --noEmit ; echo "tsc exit=$?"

# 2) 构建（确认 h-11 被 Tailwind 生成）
npm run build ; echo "build exit=$?"

# 3) 确认没有残留 h-9/h-8 交互控件
grep -rn "h-9\|h-8" src/components/manager/ui/*.ts* src/components/manager/DataTable.tsx src/components/manager/Pagination.tsx | grep -v "min-h-11\|h-11" | head
# 期望：仅剩非交互元素（表头 h-10、缩略图 h-10）

# 4) 375 无回归
npx playwright test -c tests/e2e/playwright.config.ts mobile-375

# 5) 单测
npm test -- --no-file-parallelism src/components/manager/__tests__/

# 6) 尺寸实测
npx tsx .cache/v20-m3/measure.mjs
```

## 依赖与阻塞

- Depends on：裁决 D-20-01 ✅ **已裁决（方案 A）**
- 当前：**READY**

## 熔断条件

| 情形 | 处置 |
|---|---|
| 375 出现横向溢出（M1 回归） | 记录具体页面与溢出量，缩小该页改动或回报 |
| 表格行高变化导致单测失败 | 检查 `data-table.test.tsx` 是否有高度假设，如实记录 |
| `h-11` 导致 textarea 等被截断 | 改用 `min-h-11`，在 evidence 中说明 |
| 某控件无法用令牌覆盖 | 记录到 evidence，说明为何需要单独处理 |

## E1 收口时的额外检查

方案 A 会让管理端布局整体变化，E1 须额外确认：

```bash
# 1) 视觉基线必然变化 → 交 Linux CI
# 2) B2 键盘验收的 Tab 顺序是否受影响
#    尺寸变化可能改变元素可见性/换行，进而改变 Tab 顺序
#    建议：抽查 5 页 K1，若有变化记 UNKNOWN 不阻断
# 3) 管理端 a11y 是否仍全绿
npx playwright test -c tests/a11y/playwright.config.ts
```
