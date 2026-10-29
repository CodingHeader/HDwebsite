# FIX-02 · toast 实体名（4 页 / 4 格）

## 归属

- 阶段编号：FIX-02
- 分组：B1 缺陷修复
- 来源：B1 实测 F-02 / F-07 / F-08 / F-11

## 目标

4 个页面的成功态 toast 需点名所建实体，不再只显示泛词「已创建」「已保存」。

| # | 页面 | 缺陷号 | 现状原文 |
|---|---|---|---|
| 1 | `banners` | F-02 | 仅「已创建」 |
| 2 | `content-hub` | F-07 | 「已创建」+ 固定模板文案 |
| 3 | `enrollment-offerings` | F-08 | 仅「已创建」 |
| 4 | `publish-jobs` | F-11 | 「已创建」+ 固定模板文案 |

## 为什么需要它（三级凭据）

### ① 来源
B1 卡片判据：成功态 = 「**具体** toast 文案；`操作成功` 泛词判 FAIL」

### ② 实现
```tsx
// src/components/manager/CrudPage.tsx:238
toast.success(editingId ? toastCopy.saved : toastCopy.created, displayName(body as Row) || undefined);

// :127-132  —— 候选键
export function displayName(row: Row): string {
  for (const k of ["title", "name", "username", "label", "nickname", "code", "email", "elementId"]) {
    if (typeof row[k] === "string" && row[k]) return String(row[k]);
  }
  return row.id !== undefined ? `#${row.id}` : "";
}

// src/contracts/common.ts:90
created: "已创建",
```

### ③ 验证
`cells.json` 4 格 FAIL。根因二分：

| 类型 | 页面 | 根因 |
|---|---|---|
| **类型 A**：`displayName` 取不到 | `banners`、`enrollment-offerings` | spec labels 无候选键（banners 只有 `image/link/sort/status`）→ 回退 `#id` |
| **类型 B**：文案写死 | `content-hub`、`publish-jobs` | 页面自己调 `toast.success`，description 是固定模板 |

## 输入

- 前置：**FIX-01 完成**（两卡共改 `content-hub/page.tsx`，须串行）
- 参考：`articles/page.tsx:192` `toast.success(..., String(body.title))` —— 已点名，可作范式

## 输出

- 4 页 toast 点名
- 证据：`docs/design/06_validation/evidence/V19/FIX-02/`
  - `execution.md`
  - `verify.json`：4 页的 toast Title/Description 原文

## 核心判据（与 B1 v2 一致，不放宽）

```
PASS = toast-success 可见
     ∧ (Title + Description) 合并文本包含所建实体名
     ∧ 该实体名 ∉ {已创建, 已保存, 操作成功, 提交成功}
```

**必须贴 toast 原文**，不接受「已点名」这种描述。

## 三条可选路径（`01-契约与不变量.md` §2.2 已裁决）

| 路径 | 做法 | 允许 |
|---|---|---|
| **A** | 各页 `toast.success()` 的 description 传实体名 | ✅ 优先 |
| **B** | 扩 `displayName()` 候选键 | ✅ 次选 |
| **C** | 改 `toastCopy`（`src/contracts/common.ts`） | ❌ **禁止**（冻结面 N-2） |

**裁决**：
- 类型 B（`content-hub`/`publish-jobs`）→ 走 **A**：页面已有实体对象，直接传名
- 类型 A（`banners`/`enrollment-offerings`）→ 先试 **A**（新建响应体是否含可读字段）；**A 不成立**才走 **B**

## 执行步骤

| 步 | 内容 |
|---|---|
| 1 | 4 页各新建一条，**先抓当前 toast 原文**存档（改前基线） |
| 2 | 类型 B 两页：改 description 为「`「<实体名>」<动作>`」 |
| 3 | 类型 A 两页：先打印新建响应体，确认有无可用名称字段 |
| 4 | 有 → 走 A；无 → 走 B（扩 `displayName` 候选键，只加确实需要的键） |
| 5 | 4 页重新验证，抓改后 toast 原文 |
| 6 | 写证据（改前/改后对照） |

### 各页具体建议

| 页 | 建议文案 |
|---|---|
| `banners` | 若能取到图片名/链接 → 「轮播图「<链接>」已创建」；否则至少「轮播图 #<id> 已创建」（`#id` 不含实体名，**不算 PASS**） |
| `enrollment-offerings` | 「招生批次「<sourceBatch>」已创建」 |
| `content-hub` | 「《<title>》已创建」 |
| `publish-jobs` | 「发布任务已创建：<内容标题>」 |

⚠️ `publish-jobs` 已知局限（B1 记录）：表单全 select，探针无法提取实体名。**本卡必须解决**——查响应体或列表回读。

## 允许修改

- `src/app/manager/content-hub/page.tsx`
- `src/app/manager/publish-jobs/page.tsx`
- `src/components/manager/CrudPage.tsx`（仅 `displayName` 候选键数组，路径 B 时）
- `docs/design/06_validation/evidence/V19/FIX-02/**`

**`banners` / `enrollment-offerings` 走 CrudPage，本身无页面代码可改** —— 若必须改 spec，限 `src/components/manager/resource-meta/specs.ts` 的对应两节。

## 禁止修改

- `src/contracts/common.ts`（`toastCopy` 冻结）
- `src/contracts/**` 其余、`prisma/**`、`package.json`、`tests/**`
- 前台路径
- 历史 V1.8 与 V18 证据

## 验证命令

```bash
npx tsc --noEmit
npx vitest run src/components/manager/__tests__/ 2>/dev/null || true
git diff --stat src/contracts/ | grep -q . && echo "FAIL 触碰契约" || echo "PASS 契约未改"
```

## 依赖与阻塞

- Depends on：B1（done）、**FIX-01**（同文件串行）
- 阻塞点：`banners` 新建响应体字段未知（UNKNOWN U-02），需第 3 步实测后定路径
