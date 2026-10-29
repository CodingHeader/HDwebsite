# E2E-01 · 断言同步（hub-content 2 处）

## 归属

- 阶段编号：E2E-01
- 分组：遗留修复
- 来源：V1.9 CHANGELOG §四 UNKNOWN #2

## 目标

修复 `tests/e2e/hub-content.spec.ts` 的 2 处断言失配，使该 spec 全绿，且**不弱化断言**。

## 为什么需要它（三级凭据）

### ① 来源
V1.9 E1 收口记录：

> E2E 2 FAIL（`hub-content.spec.ts` 第 22/53 行）：FIX-02 把 content-hub 创建 toast 由 `"已创建","草稿已入库，可提交审核。"` 改为 `"已创建","「${title}」已入库，可提交审核。"`，E2E 仍断言旧子串「草稿已入库」。E1 禁改 `tests/**` → 记为遗留。

### ② 实现
```ts
// src/app/manager/content-hub/page.tsx:196
toast.success("已创建", `「${body.title}」已入库，可提交审核。`);
```

### ③ 验证
```ts
// tests/e2e/hub-content.spec.ts:22
await expect(page.getByText("草稿已入库")).toBeVisible();   // ← 失配

// tests/e2e/hub-content.spec.ts:53
await expect(page.getByText("草稿已入库")).toBeVisible();   // ← 失配
```

## 输入

- 前置：无（可立即执行）
- 新文案已确认（`page.tsx:196`）

## 输出

- `tests/e2e/hub-content.spec.ts` 两处断言更新
- `docs/design/06_validation/evidence/V20/E2E-01/execution.md`

## 核心判据

```
PASS = hub-content spec 全绿
     ∧ 只改了该文件的 2 行断言
     ∧ 断言未弱化（见下）
```

### 断言弱化的红线

| 改法 | 判定 | 原因 |
|---|---|---|
| `getByText("草稿已入库")` → `getByText("已入库")` | ❌ **弱化** | `已入库` 更短，可匹配更多内容；且丢了「草稿」语义 |
| `getByText("草稿已入库")` → `getByText("入库")` | ❌ **弱化** | 更短 |
| `getByText("草稿已入库")` → `getByText(\`「${TITLE}」已入库\`)` | ✅ **正确** | 更强：限定到具体记录，且验证了新文案的实体名（FIX-02 的核心目的） |
| `getByText("草稿已入库")` → `getByTestId("toast-success")` | ❌ **弱化** | 放弃文案验证 |

**必须用第 3 种。** 理由：FIX-02 的目的就是让 toast 点名实体，断言若不含实体名，等于放弃验证 FIX-02 的成果。

## 执行步骤

| 步 | 内容 |
|---|---|
| 1 | 读两处断言的上下文，确认 `TITLE` / `title` 变量可访问 |
| 2 | 改为 `getByText(\`「${TITLE}」已入库\`)` 与 `getByText(\`「${title}」已入库\`)` |
| 3 | 跑 `npx playwright test -c tests/e2e/playwright.config.ts hub-content` |
| 4 | 若失败，抓实际 toast 文本比对（可能是标题含特殊字符） |
| 5 | 写 evidence |

### 上下文确认

```ts
// :14-22  创建流程
const TITLE = ...;                          // 需确认变量名
await page.getByTestId("hub-edit-title").fill(TITLE);
await page.getByRole("button", { name: "创建" }).click();
await expect(page.getByText("草稿已入库")).toBeVisible();

// :46-53  审核拒绝流程
const title = `${TITLE}-rej`;               // 注意是小写 title，带后缀
await page.getByTestId("hub-edit-title").fill(title);
await page.getByRole("button", { name: "创建" }).click();
await expect(page.getByText("草稿已入库")).toBeVisible();
```

**两处变量名不同**（`TITLE` vs `title`），改时勿混。

## 允许修改

- `tests/e2e/hub-content.spec.ts`（仅这 2 行）
- `docs/design/06_validation/evidence/V20/E2E-01/**`

## 禁止修改

- `src/**`（本卡只改测试）
- `tests/e2e/` 其余文件
- `tests/e2e/hub-content.spec.ts` 的其他行（除这 2 行断言）
- V1.8/V1.9 历史目录与证据

## 验证命令

```bash
cd "E:/Code/Demo/HDwebsite/hdwebsite_1011"

# 1) 只改了目标文件
git status --short tests/ | head

# 2) 差异只涉及 2 行断言
git diff tests/e2e/hub-content.spec.ts

# 3) 跑该 spec
npx playwright test -c tests/e2e/playwright.config.ts hub-content
```

## 依赖与阻塞

- Depends on：无
- 当前：**READY**
- 环境：复用 `tests/e2e/global-setup.ts`（自动 seed + 起 6791 + storageState）

## 回退方案

若新断言因标题特殊字符失配：改用

```ts
await expect(page.getByTestId("toast-success")).toContainText(`「${TITLE}」已入库`);
```

仍保留实体名，不弱化。
