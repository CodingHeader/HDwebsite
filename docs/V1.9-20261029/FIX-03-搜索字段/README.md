# FIX-03 · `collect-tasks` 搜索字段

## 归属

- 阶段编号：FIX-03
- 分组：B1 缺陷修复
- 来源：B1 实测 F-05

## 目标

修复 `/manager/collect-tasks` 搜索框无效：输入 `zzz-no-match-zzz` 仍返回 1 行，无空态。

## 为什么需要它（三级凭据）

### ① 来源
B1 卡片判据：空态 = 搜索 `zzz-no-match-zzz` → 空态可见

### ② 实现
```ts
// src/lib/crud-resources/collect.ts:32
"collect-tasks": {
  model: "collectTask",
  permission: "collect",
  label: "采集任务",
  searchFields: [],            // ← 根因：空数组 = 无可搜字段
  filters: { sourceId: "number", status: "string" },
  ...
}
```
对比同文件 `:14` `collect-sources` 为 `searchFields: ["name", "url"]`。

### ③ 验证
`cells.json` F-05：搜索 `zzz-no-match-zzz` 后 8000ms 仍返回 1 行，页面无 `empty-state`。

## 输入

- 前置：B1 done
- 需确认：`collectTask` 模型有哪些文本字段（含关联）

## 输出

- 修复后的 `searchFields` 或前端搜索框条件渲染
- 证据：`docs/design/06_validation/evidence/V19/FIX-03/`
  - `execution.md`：路径选择与理由
  - `verify.json`：搜索前后的行数

## 核心判据

```
PASS（路径 A）= 搜索 zzz-no-match-zzz → 返回 0 行 ∧ empty-state 可见
PASS（路径 B）= 页面无搜索输入框 ∧ （该页其他功能不受影响）
```

**必须记录搜索前后的实际行数。**

## 三条路径（`01-契约与不变量.md` §2.3 已裁决）

| 路径 | 做法 | 前置确认 |
|---|---|---|
| **A**（优先） | `searchFields: ["source"]` 或该模型的实际文本字段 | Prisma 能否对关联字段 `contains` |
| **B**（次选） | 前端隐藏搜索框 | `searchFields: []` 即"不可搜"语义 |
| **C** | 改判据 N-A | ❌ **禁止**：搜索框仍在，输入无效无反馈 |

## 执行步骤

| 步 | 内容 |
|---|---|
| 1 | 读 `prisma/schema.prisma` 的 `CollectTask` 模型，列全部 `String` 字段 |
| 2 | 若有自有文本字段（如 `errorMessage`）→ 直接加 `searchFields: ["<字段>"]`，走 A |
| 3 | 若无自有字段、只有关联 `source.name` → 读 `src/lib/crud-*.ts` 看 `searchFields` 如何拼 Prisma where |
| 4 | 若支持 `"source"` 关联语法 → 走 A；不支持 → 走 B |
| 5 | 走 B 时：确认 `CrudPage` 在 `searchFields` 为空时是否隐藏搜索框（**这是关键，`CrudPage` 未读 `searchFields`，它读的是 `spec`**） |
| 6 | 验证并写证据 |

### ⚠️ 第 5 步的关键陷阱

`CrudPage.tsx:388` 的搜索框是**无条件渲染**的，它不看 `searchFields`（那是后端资源注册，CrudPage 拿不到）。

所以路径 B **不能**靠"`searchFields` 为空自动隐藏"——必须在 `crudPageSpecs["collect-tasks"]` 里加一个开关，或在该页内联 spec 里控制。

**若需要给 `CrudPageSpec` 新增字段（如 `noSearch?: boolean`）**：
- 该接口在 `src/components/manager/CrudPage.tsx`，**不是** `src/contracts/**`
- 属组件内接口扩展，**不触发 CCR**
- 但会改共用组件，须评估对 27 页的影响（默认 false，无影响）

## 允许修改

- `src/lib/crud-resources/collect.ts`
- `src/components/manager/crud-specs.tsx`（若路径 B 需加开关）
- `src/components/manager/CrudPage.tsx`（仅当路径 B 且需新增 `noSearch` 字段时）
- `docs/design/06_validation/evidence/V19/FIX-03/**`

## 禁止修改

- `src/contracts/**`、`prisma/**`（模型不改）
- `package.json`、`tests/**`
- 前台路径
- 历史 V1.8 与 V18 证据
- 通用 Crud 查询构造逻辑（`src/lib/crud-*.ts` 的过滤器核心）——**若必须改，停手写 CCR**

## 验证命令

```bash
npx tsc --noEmit
npx vitest run src/lib/crud-resources 2>/dev/null || true
git diff --stat src/contracts/ prisma/ | grep -q . && echo "FAIL 触碰冻结面" || echo "PASS"
```

## 依赖与阻塞

- Depends on：B1（done）
- **CONDITIONAL**：路径 A 取决于 Prisma 关联字段 `contains` 是否可行（UNKNOWN U-01）
- 熔断：若 A 需要改通用查询构造器 → 停止，写 CCR
