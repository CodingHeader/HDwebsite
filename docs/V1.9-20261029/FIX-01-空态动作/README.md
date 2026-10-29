# FIX-01 · 空态动作补齐（6 页）

## 归属

- 阶段编号：FIX-01
- 分组：B1 缺陷修复
- 来源：B1 实测 F-01 / F-03 / F-04 / F-06 / F-09 / F-10（`evidence/V18/B1/defects.md`）

## 目标

为 6 个管理端页面的空态补上「下一步动作」，使 B1 判据「空态文案 + 下一步动作」成立。

**涉及 6 页**：

| # | 页面 | 缺陷号 | 现状 |
|---|---|---|---|
| 1 | `/manager/articles` | F-01 | 搜索在 toolbar，空态无动作 |
| 2 | `/manager/chat-history` | F-03 | 同上 |
| 3 | `/manager/collect-items` | F-04 | 描述指向页头动作，但非容器内 |
| 4 | `/manager/content-hub` | F-06 | 搜索在 toolbar，空态无动作 |
| 5 | `/manager/home-blocks` | F-09 | 无 `emptyAction` |
| 6 | `/manager/knowledge-bases` | F-10 | 引用 `kb-create`，但非状态条件渲染 |

## 为什么需要它（三级凭据）

### ① 来源
B1 卡片判据：空态 = 「空态文案 + **下一步动作**（如"新建"按钮）」（`docs/V1.8-20261027/B1-五态验收/README.md`）

### ② 实现
```tsx
// src/components/manager/DataTable.tsx:93
emptyAction?: ReactNode;
// :337
<EmptyState compact title={emptyTitle} description={emptyDescription} action={emptyAction} />
```
**能力已存在，6 页都没用。**

### ③ 验证
```bash
# 6 页 emptyAction 出现次数（实测均为 0）
$ for p in articles chat-history collect-items content-hub home-blocks knowledge-bases; do
    echo "$p: $(grep -c 'emptyAction' src/app/manager/$p/page.tsx)"
  done
```
`cells.json` 对应 6 格 `hasAction:false`。

## 输入

- 前置：B1 done（`c98ba62`）
- 现成能力：`DataTable.emptyAction` / `EmptyState.action` 均已存在
- 参考实现：`publish-jobs/page.tsx:227` 已有 `emptyAction` 用法（可作为范式）

## 输出

- 6 个 `page.tsx` 各补 `emptyAction`
- 证据：`docs/design/06_validation/evidence/V19/FIX-01/`
  - `execution.md`：6 页改动 + 逐页验证
  - `verify.json`：6 页的「筛选到 0 条 → 容器内 button/a 数量」结构化证据

## 核心判据

```
PASS = empty-state 可见
     ∧ empty-state 容器内 button/a 数量 ≥ 1
     ∧ 该动作能实际生效（点击后数据或筛选状态改变）
```

**每页必须给：做了什么 + 看到什么（动作文案原文）。禁止只写 PASS。**

## 执行步骤

| 步 | 内容 |
|---|---|
| 1 | 逐页读源码，确认该页空态的成因（筛选空 / 初始空 / tab 空） |
| 2 | 按成因选动作：筛选空 → 「清除筛选」；初始空 → 「新建」或该页主创建动作 |
| 3 | 补 `emptyAction`，动作复用该页已有 handler（不新写业务逻辑） |
| 4 | 起服务逐页验证，记录动作文案 |
| 5 | 写证据 |

### 逐页设计要点

| 页 | 空态成因 | 建议动作 |
|---|---|---|
| `articles` | 关键词/频道筛选 | 「清除筛选」→ 重置 keyword + channel |
| `chat-history` | 关键词筛选 | 「清除筛选」 |
| `collect-items` | 状态 tab（待审核/已通过…）为空 | 「切换状态」或指向「采集源」的链接 |
| `content-hub` | 关键词筛选 / 无内容 | 筛选时「清除筛选」；无内容时「新建」 |
| `home-blocks` | 无区块 | 「恢复默认」（`page.tsx:233` 描述已提及） |
| `knowledge-bases` | 无知识库 / 回收站空 / 无文件 | 按 `page.tsx:414/431` 两个分支分别给动作 |

## 允许修改

- `src/app/manager/articles/page.tsx`
- `src/app/manager/chat-history/page.tsx`
- `src/app/manager/collect-items/page.tsx`
- `src/app/manager/content-hub/page.tsx`
- `src/app/manager/home-blocks/page.tsx`
- `src/app/manager/knowledge-bases/page.tsx`
- `docs/design/06_validation/evidence/V19/FIX-01/**`

## 禁止修改

- `src/contracts/**`、`prisma/**`、`package.json`
- `src/app/(web)/**`、`src/components/web/**`（前台冻结）
- `docs/V1.8-20261027/**`、`docs/design/06_validation/evidence/V18/**`（历史只读）
- `src/components/manager/DataTable.tsx`、`EmptyState.tsx`（能力已足够，不需改）
- `tests/**`

## 验证命令

```bash
cd "E:/Code/Demo/HDwebsite/hdwebsite_1011"
npx tsc --noEmit
git status --short src | grep -vE "articles|chat-history|collect-items|content-hub|home-blocks|knowledge-bases" && echo "FAIL 越界" || echo "PASS 仅改 6 页"
```

## 依赖与阻塞

- Depends on：B1（done）
- 阻塞：无（`DataTable.emptyAction` 已存在）

## 与 FIX-02 的交集

`content-hub/page.tsx` 也被 FIX-02 修改（toast description）。

**处置**：两卡**串行执行**（先 FIX-01 再 FIX-02），各自独立 commit。同一 session 内顺序做，避免并发冲突。
