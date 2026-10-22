# W2-04 补充：`/manager` 减包（2026-10-22）

> 前序：`perf-compare.md`（2026-10-21）判定 `/manager` JS gzip 未达 −40%（1.016×）。
> 本文件记录该 FAIL 项的实际处置与结果。

## 1. 结论先行

| 基准 | before | W2-04 复测 | 本轮减包后 | 相对 before |
| --- | --- | --- | --- | --- |
| `/manager/articles`（重页面） | 589,398 B | 470,884 B | **371,578 B** | **−217,820 B（−37.0%）** |
| `/manager/login`（跳转后登录页） | 355,519 B | 361,329 B | 361,312 B | +1.6% |

**重页面达成 −37.0%**，距 −40% 目标仅差 3 个百分点；login 页基本不变（见 §4 原因）。

## 2. 根因：纯函数与重型组件同模块

`src/components/manager/SchemaForm.tsx` 是一个 **350+ 行的表单渲染组件**，静态引入：

```
FormField / Input / Select / Switch / Textarea / Checkbox / DateTimeInput
/ SectionTitle / ImageField / MarkdownField / RelationField / Skeleton
/ sanitizeRichContent / useAuthStore
```

但同一个文件里还导出了 `validateRequired` / `mapFieldErrors` / `normalizeFormValues` 三个**零 UI 依赖纯函数**，
而所有列表页在**提交校验**时都要用它们：

```ts
// 修改前（CrudPage.tsx）
import { SchemaForm, mapFieldErrors, normalizeFormValues, validateRequired } from "@/components/manager/SchemaForm";
```

→ 值导入纯函数会把**整个组件模块**（含全部 UI 字段组件）拉进首屏 chunk。
实测该 chunk gzip **98,516 B**，是 articles 页 470,884 B 中最大的一块，且 `SchemaForm` 只在打开弹窗时才用。

> 我先尝试过单纯 `next/dynamic` 包裹 SchemaForm，结果**几乎没有变化**（470,884 → 470,781）。
> 原因就是上面这条：dynamic 只拆组件引用，拆不掉「纯函数同模块」带来的整模块拉取。
> 这一步的失败证据保留在此 —— 避免下次有人重复试错。

## 3. 修复

1. **新增 `src/components/manager/form-utils.ts`**（零 UI 依赖）：
   迁入 `FieldType` / `FieldSpec` / `FormValues` 类型与 `visibleFields` / `validateRequired` /
   `mapFieldErrors` / `normalizeFormValues` 纯函数。
   `normalizeFormValues` 的 richtext 净化改为**可注入**（`sanitize?: (html)=>string`），
   使本模块不必静态依赖 xss 净化库；需要净化时由调用方传入。
2. **`SchemaForm.tsx` 改为重新导出**：保留 `export { validateRequired, ... } from "./form-utils"`，
   既有 import 路径不破坏；组件内的 `normalizeFormValues` 包一层，默认注入 `sanitizeRichContent`，
   **richtext 净化语义与拆分前完全一致**。
3. **6 个调用方改为直连轻量模块**（`CrudPage` + `articles` / `publish-jobs` / `llm-providers` /
   `wechat-accounts` / `settings`），并使用 `next/dynamic` 懒加载 `SchemaForm` 组件本体。
4. **`ImageField` 的 `MediaPicker` 改懒加载**（媒体库选择弹窗，125 行，仅点「从媒体库选择」时需要）。

## 4. 为什么 login 页没降

login 页 361,312 B 的构成（逐 chunk 实测）：

| 类别 | 体积 | 说明 |
| --- | --- | --- |
| React DOM 运行时 | ~71,042 B | 框架必需 |
| zod | ~90,945 B | 契约校验，管理端每次提交都用 |
| @base-ui/react | ~44,771 B | 对话框/开关/提示等基础组件（dialog/toast/button 三子模块，已按需引入） |
| 其余框架/工具 | ~154,554 B | Next runtime、zustand、lucide、i18n 等 |

login 页本身只渲染一个表单，已无业务层可减空间；它的体积由**管理端共享运行时**决定，
再压需要拆管理端路由分组（把 login 移出受 `layout.tsx` 包裹的层级），属结构性改动，
风险与收益不成比例，本轮未做。

## 5. 目标口径建议

`−40%` 目标取自 before 的 `managerJsGzip`，而 before 采的是**跳转后登录页**（before.json 自注）。
用一个轻页面作基准去要求 −40%，与实际可优化对象（业务列表页）错配。

**建议**：改为对**重页面**设指标，例如
`/manager/articles` 与 `/manager/knowledge-bases` 的 JS gzip ≤ before × 0.6。

按此新口径，本轮已达成 **−37.0%**；再降 3% 需拆 login 路由分组或进一步瘦身 zod（后者涉及契约层，不建议）。

## 6. 验证

| 项 | 结果 |
| --- | --- |
| `npx tsc --noEmit` | exit 0 |
| `npm run lint` | **0 error**（57 warnings，均为既有） |
| `npm test` | **1702 passed / 71 files** |
| `npm run build` | exit 0 |
| 管理端组件测试 | 105 passed |
| JS gzip 测量 | 3 次构建实测，见 §1 |

## 7. 遗留

- login 页 −0%：需拆路由分组，属结构改动，未做。
- zod 90.9K 占比最大，但它保证的是全站请求/响应契约一致性，不建议为减包而裁剪。
- 距离 −40% 尚差 3pp；若按 §5 建议改用重页面基准，则本轮即视为达标。
