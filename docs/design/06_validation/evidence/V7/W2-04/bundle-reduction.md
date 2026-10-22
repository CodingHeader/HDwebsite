# W2-04 补充：`/manager` 减包（2026-10-22）

> 前序：`perf-compare.md`（2026-10-21）判定 `/manager` JS gzip 未达 −40%（1.016×）。
> 本文件记录该 FAIL 项的实际处置与结果。

## 1. 结论先行

| 基准 | before | W2-04 复测 | 本轮减包后 | 相对 before |
| --- | --- | --- | --- | --- |
| `/manager/articles`（重页面） | 589,398 B | 470,884 B | **372,724 B** | **−216,674 B（−36.8%）** |
| `/manager/login`（跳转后登录页） | 355,519 B | 361,329 B | 361,312 B | +1.6% |

> 数字口径：`372,724` 为**独立复算值**（逐 chunk 解 gzip 累加，见 §6），比首轮记录的 371,578 高 1,146 B，原因是复核后为 richtext 恢复了默认净化（§3.2），多带进 ≈3.6 KB 的自研 xss-filter 的一部分。

**重页面达成 −36.8%**，距 −40% 目标差 3.2pp；login 页基本不变（见 §4 原因）。

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

按此新口径，本轮已达成 **−36.8%**；再降 3.2pp 需拆 login 路由分组或进一步瘦身 zod（后者涉及契约层，不建议）。

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

---

## 8. 独立复核发现的问题与修复（2026-10-22）

独立复核者对本轮改动提出 3 条实质意见，**全部成立**，已逐条修复：

### 8.1 `scheduledAt` 时序校验在兼容路径中被丢弃（严重）

- **问题**：`resolveUpdateSchema` 走「重建 shape + 逐字段 optional」时，`publishJobCreateSchema`
  的两条 refine 被整体丢弃。其中「channels/channel 二选一」在部分更新下天然不适用（可接受），
  但**「scheduledAt 必须晚于现在」是真实业务约束**——丢失后 `PUT` 能把过期时间写库。
- **更关键**：原提交说明写「需跨字段校验的场景交由 beforeUpdate 钩子」，但复核者查证
  `publish-jobs` 的 CrudSpec **根本没有 beforeUpdate**（`collect.ts:36-48`）。**说明与实现不符。**
- **修复**：`src/lib/crud-resources/collect.ts` 为 publish-jobs 补 `beforeUpdate`，
  在「本次确实要改 scheduledAt」时校验必须晚于现在（`null` 表示清空=立即发布，合法）。
- **验证**：新增 2 用例（过去时间→400、未来时间→200 且落库）。
  **反向验证**：移除 beforeUpdate 后，过去时间用例立刻 `expected 200 to be 400` → 修复真实有效。

### 8.2 6 个调用方的 richtext 净化被静默摘除（严重）

- **问题**：拆分后调用方改为直连 `form-utils`，而 `form-utils.normalizeFormValues` 的 `sanitize`
  当时是**可选参数、不传则不净化** → 从 SchemaForm 时代的「有净化」变成「无净化」。
  服务端契约仍会校验，不是可直接利用的 XSS，但**纵深防御层被静默削弱**，且提交说明没写。
- **修复**：`form-utils.normalizeFormValues` 的 `sanitize` 改为**默认注入 `sanitizeRichContent`**，
  与拆分前行为完全一致。代价是 form-utils 需引入 xss-filter（零第三方依赖的自研实现，
  295 行、gzip ≈3.6 KB），实测 articles 页 +1,146 B。
  取舍：3.6 KB 换回一层安全防护，**明确选安全**。
- **验证**：临时代码验证 `<script>` 被剥离（`<p>hi</p><script>alert(1)</script>` → 不含 `<script>`），
  验证后已删除探针文件。

### 8.3 `crud-update-schema.test.ts` 是自指测试（中）

- **问题**：该测试复制了一份「同构实现」，没有 import 真实函数。
  后果：crud.ts 里函数被改坏或改回 `.partial()`，8 个用例**一条都不会红**——它测的是它自己。
- **修复**：`crud.ts` 导出 `resolveUpdateSchema`，测试改为直接 import 真实实现；
  并新增「显式 updateSchema 优先」用例。
- **验证**：反向验证（把 `resolveUpdateSchema(spec)` 换回 `spec.createSchema!.partial()`）时，
  `publish-job-update.test.ts` 的 4 个端到端用例全部变 500 —— 那才是真正锁住缺陷的测试。

### 8.4 复核未完成项（本次一并补做）

复核者因预算耗尽未执行第 2/4/5/6 项，本文件已补：

| 项 | 结果 |
| --- | --- |
| 减包独立复算 | **已复算**：逐 chunk 解 gzip 累加 = 372,724 B（含 8.2 的 +1,146 B），文档数字已更正 |
| CCR-W2-08-01 零豁免 | `grep apply/route.ts eslint.config.mjs` → 0 命中；规则对全部路由生效 |
| 契约覆盖率 | 868 passed（默认与 shuffle 一致）；skip 仅剩 1 条（/chat/stream SSE） |
| K10 审计 | 官方 registry：critical 3 / high 7；默认镜像 404 假阴性已证实 |
