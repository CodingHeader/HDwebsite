# V8-UI-01 执行证据：管理端五态全覆盖 + a11y 保持

- 执行者：主代理 ｜ 分支 `upgrade` ｜ 日期 2026-10-22
- 允许修改：`src/components/manager/**`、`src/app/manager/**`、`tests/e2e/ux-states.spec.ts`、`evidence/V8/UI-01/**`
- 前置：V8-PERF-01（done）、V8-T-01（done）

## 1. 起点：五态组件齐全，但**有页面漏接**

`src/components/manager/feedback/` 五个状态组件都在：

| 状态 | 组件 | testid |
| --- | --- | --- |
| loading | `PageSkeleton` / `TableSkeleton` | `page-skeleton` / `table-skeleton` |
| empty | `EmptyState` | `empty-state` |
| error | `ErrorState` | `error-state` |
| forbidden | `Forbidden` | `forbidden` |
| success | 各页正常内容 | — |

**问题在接线**：27 个页面由 `CrudPage` 驱动（自动具备五态），但 13 个**自定义页**逐个手写，
其中多数只处理了 403：

```ts
// 修补前的典型写法（notify-rules / collect-items / publish-jobs / wechat-accounts 等）
const error = rulesQ.error ?? templatesQ.error;
if (isForbidden(error)) return <Forbidden message={error.message} />;
// ← 非 403 的失败（500 / 网络错误）没有分支 → 页面继续往下渲染空表
```

后果：**接口 500 时用户看到的是"空列表"，不是"加载失败"**——会误以为真的没数据。

## 2. 修补（7 个页面补 ErrorState，5 个补骨架屏）

| 页面 | 补 ErrorState | 补 loading 骨架 |
| --- | --- | --- |
| articles | ✓ | 已有 |
| chat-history | 已有 | 已有 |
| collect-items | **✓** | **✓** |
| content-hub | **✓** | 已有 |
| home-blocks | 已有 | 已有 |
| knowledge-bases | **✓** | 已有 |
| llm-providers | 已有 | **✓** |
| media | 已有 | 已有 |
| notify-rules | **✓** | **✓** |
| publish-jobs | **✓** | **✓** |
| settings | 已有 | 已有 |
| wechat-accounts | **✓** | **✓** |

统一插入的代码（以 notify-rules 为例）：

```ts
if (isForbidden(error)) return <Forbidden message={error.message} />;
// V8-UI-01：非 403 的请求失败也要有明确错误态（此前会静默显示空表）
if (error && !isForbidden(error)) return <ErrorState message={error.message} onRetry={...} />;
// V8-UI-01：首屏加载用骨架，避免"空表闪一下"
if (rulesQ.loading && !error) return <PageSkeleton lines={8} />;
```

`onRetry` 接到各页已有的 `reload()`（多查询页则同时重载多个）。

## 3. 110 格矩阵核查（22 资源 × 5 态）

> 说明：仓库实际有 **40 个** `page.tsx`（不止卡定义说的 22——V0.7/V0.8 陆续加了
> knowledge-bases / publish-jobs / content-hub / notify-rules / llm-providers 等）。
> 按下表逐页核查，覆盖面比原口径更广。

| 类别 | 数量 | 五态来源 |
| --- | --- | --- |
| CrudPage 驱动 | **27** | `CrudPage` 内部统一处理（`isForbidden` → Forbidden、`error` → ErrorState、`loading` → TableSkeleton、空 → EmptyState） |
| 自定义页 | 13 | 逐页修补，见 §2 |
| **合计** | **40** | |

### 3.1 逐页实测结果

```
articles           F=true E=true S=true M=true
chat-history       F=true E=true S=true M=true
collect-items      F=true E=true S=true M=true
content-hub        F=true E=true S=true M=true
home-blocks        F=true E=true S=true M=true
knowledge-bases    F=true E=true S=true M=true
llm-providers      F=true E=true S=true M=true
login              F=false E=false S=true M=false   ← 语义例外，见 §3.2
media              F=true E=true S=true M=true
notify-rules       F=true E=true S=true M=true
publish-jobs       F=true E=true S=true M=true
settings           F=true E=true S=true M=true      ← M 例外，见 §3.2
wechat-accounts    F=true E=true S=true M=true
```

（F=Forbidden、E=ErrorState、S=Skeleton/loading、M=EmptyState；success 态由正常渲染体现）

### 3.2 两处**语义例外**（不是遗漏）

| 页面 | 缺什么 | 为什么不补 |
| --- | --- | --- |
| `login` | F / E / M | 公开页，**无鉴权** → 不存在 403 态；页面是登录表单，不存在"列表为空"。它有 loading（提交中）。硬加 Forbidden/Empty 反而是噪音 |
| `settings` | M（空态） | 设置页是**分组表单**，不是列表。"没有任何设置项"不是正常业务状态（注册表恒有默认值）。它的空态语义应为"该分组暂无可配置项"，已由页内文案处理 |

> 把这两处也算进"全覆盖"是自欺；按语义排除并写清理由，才是诚实的口径。

## 4. 验证

### 4.1 ux-states e2e：20/20 通过

```bash
npx playwright test -c tests/e2e/playwright.config.ts ux-states
# 20 passed (17.7s)
```

测试用 **Playwright route mock** 控制接口返回，覆盖 6 个代表页 × 3 种异常态 + 骨架 + 成功态：

| 组 | 用例 |
| --- | --- |
| 6 页 × 403 | `forbidden` 可见 |
| 6 页 × 500 | `error-state` 可见 |
| 6 页 × 空列表 | `empty-state` 或空行文案可见 |
| 骨架屏 | 拖慢接口 1.5s，断言 `page-skeleton`/`table-skeleton` 出现 |
| 成功态 | notify-rules 真实种子 7 条规则可见 |

### 4.2 a11y：12/12 通过，serious/critical = 0

```bash
npx playwright test -c tests/a11y/playwright.config.ts
# 12 passed (38.8s)
```

### 4.3 gzip 不回涨（卡验收：≤2%）

| | 值 |
| --- | --- |
| 本卡开工基线 | 284,100 B |
| 修补后 | **284,125 B** |
| 变化 | **+25 B（+0.01%）** ✅ |

（新增的 `ErrorState` / `PageSkeleton` 本就在共享 chunk 里，只是多接了几处引用。）

### 4.4 通用门禁

| 命令 | 结果 |
| --- | --- |
| `npm run lint`（--max-warnings 0） | exit 0 |
| `npx tsc --noEmit` | exit 0 |
| `npm test` | **1712 passed / 72 files** |
| `npm run build` | exit 0 |
| `check-root` / `check-assets` | PASS |

## 5. 遗留

1. **110 格矩阵没有做成"逐格脚本断言"**，而是"逐页核查 + 语义例外登记"。
   卡定义要求"矩阵 110 格全部有组件（证据表）"——本文件给的是按页核查表，
   粒度略粗（没有对每一页断言 5 个 testid 都出现）。ux-states 只挑了 6 个代表页跑 e2e。
   若要求严格 110 格，需扩展成 22 页 × 5 态 = 110 条用例（预计增加 ~3 分钟 e2e 时长）。
   **如实登记为"按页核查已达成、逐格断言未做"。**
2. `chat-history` / `home-blocks` / `media` / `settings` 四页的修补前就已有 ErrorState，
   本轮未改它们，未在 ux-states 里覆盖（只覆盖了 6 个本轮改动或代表性的页面）。
