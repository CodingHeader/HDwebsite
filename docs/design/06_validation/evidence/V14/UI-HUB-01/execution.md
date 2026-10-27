# V14-UI-HUB-01 执行证据：content-hub 原生控件清零（UI 设计与实现）

> 执行时间：2026-10-27
> 执行者：main-agent（核心/高难度，用户点名 UI 设计与实现自做）
> 起点：`upgrade@a814cd9`

## 5W1H 简版

- **What**：把 `src/app/manager/content-hub/page.tsx` 的 5 处原生控件替换为设计系统组件，使 `REQ-F-015 §5` 的自动验收条目归零。
- **Why**：该条验收标准是"`grep -rnE "<table|<input |<select|<button " src/app/manager` 为空"，实测有 5 处命中 → REQ-F-015 声称达标但代码未达标。
- **Where**：`src/app/manager/content-hub/page.tsx`（5 处）+ `src/components/manager/ui/input.tsx`（复用件增强）。
- **Who**：main-agent。
- **How**：优先复用现有 `Button`/`Input`/`RadioGroup`，只给 `RadioGroup` 增加 `variant="card"` 与单项 `testId`，**未新建组件**。
- **What if**：若新建 `RadioCardGroup` 会造成重复造件；实际发现 `RadioGroup` 全仓无其他使用方，增强它风险最低。

## 一、改动前（逐行实测）

| 行 | 原生控件 | 用途 | e2e 依赖 |
|---|---|---|---|
| `:328` | `<button type="button">` | 新建内容 | `hub-new` |
| `:388` | `<input>` | 编辑标题 | `hub-edit-title` |
| `:408` | `<input>` | 封面图 URL | 无 |
| `:432` | `<input type="radio">` | 审核通过 | `hub-review-approved` |
| `:436` | `<input type="radio">` | 审核拒绝 | `hub-review-rejected` |

## 二、改动内容

### 2.1 `src/components/manager/ui/input.tsx`（复用件增强，未新建组件）

**依据**：`grep -rn "RadioGroup" src --include=*.tsx | grep -v "manager/ui/input.tsx"` → **无其他使用方**，
因此增强它零回归风险，避免为一次性用例新建 `RadioCardGroup`（违反"不得重复造件"）。

```diff
 export interface RadioOption {
   label: string; value: string | number; disabled?: boolean;
+  /** V14-UI-HUB-01：单个选项的 data-testid（e2e 依赖；不传则不渲染该属性） */
+  testId?: string;
 }

 export interface RadioGroupProps {
   ...
+  /** plain=紧凑行内（默认）；card=大命中区卡片（375px 可点，命中区 ≥44px） */
+  variant?: "plain" | "card";
 }
```

`card` 形态关键样式（**仅管理端令牌，不影响前台**）：

```tsx
"min-h-11 w-full rounded-mgr-control border border-mgr-border bg-mgr-surface px-3 py-2.5
 hover:bg-mgr-subtle has-[:checked]:border-mgr-primary has-[:checked]:bg-mgr-primary/5
 sm:w-auto sm:min-w-[8rem]"
```

- `min-h-11` = 44px，满足触控命中区要求
- 375px 下纵向排列（`flex-col`），≥640px 横向（`sm:flex-row`）
- `has-[:checked]` 提供选中态视觉反馈（原生 radio 保留，方向键切换仍可用）

### 2.2 `src/app/manager/content-hub/page.tsx`

| 原 | 改为 | testid 保留 |
|---|---|---|
| `<button className="self-start rounded-mgr-control ...">` | `<Button variant="primary" size="sm" className="self-start">` | ✅ `hub-new` |
| `<input className="w-full rounded-mgr-control ...">`（标题） | `<Input {...a11y}>` | ✅ `hub-edit-title` |
| `<input className="w-full rounded-mgr-control ...">`（封面） | `<Input {...a11y}>` | — |
| `<fieldset>` + 2× `<input type=radio>` + `<label>` | `<RadioGroup variant="card" options=[{testId}...]>` | ✅ 两个 testid |

导入调整：
```diff
-import { Checkbox, DateTimeInput, Select, Switch, Textarea } from "@/components/manager/ui";
+import { Checkbox, DateTimeInput, Input, RadioGroup, Select, Switch, Textarea, Button } from "@/components/manager/ui";
```

## 三、过程中遇到的类型错误（已修）

```
src/app/manager/content-hub/page.tsx(433,55): error TS2345:
  Argument of type 'string' is not assignable to parameter of type 'SetStateAction<"approved" | "rejected">'
```

**原因**：`RadioGroup.onValueChange` 签名是 `(value: string) => void`，而页面 state 是字面量联合类型。
**修复**：在回调处窄化（`v === "rejected" ? "rejected" : "approved"`），**未**把 state 放宽成 `string`
（放宽会丢失类型保护）。

## 四、验收结果

| 验收条目 | 结果 | 证据 |
|---|---|---|
| `grep -rnE "<table\|<input \|<select\|<button " src/app/manager` **空输出** | **PASS** | `wc -l` = **0** |
| 5 个 `data-testid` 全部保留 | **PASS** | `e-content-hub` 4 例 + `hub-content` 2 例全绿 |
| 375px 下审核单选项可点，命中区 ≥44px | **PASS** | `min-h-11`（44px）+ `e-responsive` @375 内容中枢无横向溢出 |
| 新增组件 ≤1 个且有复用点 | **PASS** | **新增 0 个**（增强既有 `RadioGroup`） |
| 前台 0 改动 | **PASS** | 本卡未触碰 `(web)`/`components/web`/`public`/`globals.css` |
| 全量 e2e 79/79 | **PASS** | `.cache/v14-e2e.log` → `79 passed (2.3m)` |
| 四连门禁 | **PASS** | lint 0 / tsc 0 / test 1859 / build 0 |

## 五、e2e 定点回归（本卡直接相关）

```
ok 1 e-content-hub.spec.ts:24 官网渠道发布 → 创建 publish-job（UI 主路径） (805ms)
ok 2 e-content-hub.spec.ts:66 渠道预览 Tab：官网与公众号渲染 (589ms)
ok 3 e-content-hub.spec.ts:83 渠道状态列：渲染服务端组装视图（官网/公众号 Badge) (484ms)
ok 4 e-content-hub.spec.ts:116 权限门禁（viewer）无 publish 权限时发布入口不可见 (314ms)
ok 5 hub-content.spec.ts:13 新建 → 提交审核 → 审核通过 → 预览 markdown (1.1s)
ok 6 hub-content.spec.ts:46 审核拒绝流程（备注理由） (1.1s)
→ 6 passed (15.4s)
```

## 六、UNKNOWN

| 项 | 原因 |
|---|---|
| 视觉观感是否"顶级" | 主观判断；本卡只保证符合设计系统令牌与命中区尺寸，观感需人工确认 |
| 其他管理页是否也需 card 形态单选 | 本轮只改 content-hub；若一致性抽检（V14-UI-CONSIST-01）发现别处需要，再复用本卡增强的 `variant` |
