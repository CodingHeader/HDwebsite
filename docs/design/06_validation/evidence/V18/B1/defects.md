# B1 缺陷清单（defects.md）— 探针阶段

> 生成：2026-10-28 · 基于 HEAD `4ff3132` 实测（探针 `.cache/v18-b1/probe.spec.ts`）
> 探针门禁 10/10 未过（8/10），按指令书 §5 步骤 3 停止，**未进入步骤 4 批量**。

## 缺陷 D-B1-01：筛选/空列表下的空态缺少「容器内」下一步动作

### 现象（observed 原文）
- `/manager/tags`（A 类）搜索 `zzz-no-match-zzz` 后：
  - `empty-state` 可见，innerText = `没有找到符合条件的标签\n\n换个关键词或清除筛选试试。`
  - `empty-state` 容器内 `button/a` 数量 = **0**
  - 「清除筛选」按钮出现在**表格工具栏**（搜索框右侧），不在 `empty-state` 容器内
  - 「新建」按钮在页面头部（`crud-create`），不在 `empty-state` 容器内
- `/manager/notify-rules`（B 类）`/api/notify-rules` 返回空列表后：
  - `empty-state` 可见，innerText = `暂无通知规则\n\n种子数据未初始化，请运行 prisma/seed.ts。`
  - `empty-state` 容器内 `button/a` 数量 = **0**（页面自定义 DataTable 未传 `emptyAction`）

### 复现步骤
1. 以 admin storageState 登录 `/manager/tags`
2. 搜索框输入 `zzz-no-match-zzz`
3. 观察 `empty-state`：标题「没有找到符合条件的标签」，说明「换个关键词或清除筛选试试。」
4. 断言 `empty-state` 容器内存在 `button` 或 `a` → **失败**

### 归因
- **A 类**：`src/components/manager/CrudPage.tsx`
  - `L426-427`：`emptyAction={!filtered && canCreate ? emptyCreateBtn : undefined}` —— 搜索到 0 条时 `filtered=true` → `emptyAction=undefined`，空态无「新建」按钮
  - `L418`：「清除筛选」按钮渲染在 `DataTable` 的 `toolbar` 槽位，**不在** `empty-state` 容器内
  - 结论：指令书 §3.3 假定「空态里出现的是「清除筛选」按钮（:418）」与 DOM 实际不符——`:418` 位于工具栏而非空态容器
- **B 类（notify-rules）**：`src/app/manager/notify-rules/page.tsx` —— 自定义 DataTable 未设置 `emptyAction`，空态仅有标题/说明，无任何动作按钮

### 影响
- 违反 §3.1 / §3.3 判据「empty-state 可见 ∧ 该容器内存在 button/a」
- 按 §0 铁律 1（只验收不修缺陷），本卡不修，写入 defects.md 即止
- 按 §5 步骤 3 探针门禁 10/10 → 8/10，**不得进入步骤 4 批量**

### 建议（交规划者裁决）
1. **方案 A（改判据）**：把「容器内」放宽为「页面存在可点下一步动作（工具栏「清除筛选」/页头「新建」均可）」，则 tags 空态 PASS；notify-rules 空态仍缺动作 → 仍 FAIL（需补 emptyAction）
2. **方案 B（真实缺陷）**：为 CrudPage 筛选空态注入「清除筛选」动作按钮（`emptyAction` 在 filtered 时设为清除筛选按钮），notify-rules 补 `emptyAction`；属 UI 修复，交后续卡
3. **共同部分**：二者都承认「空态应给用户下一步动作」；分歧在动作按钮位置/存在性
4. **分叉点**：A 类与 B 类根因不同（A 类按钮在工具栏、B 类完全缺失）

## 探针其余 8 格
`loading / error / forbidden / success` 在 tags 与 notify-rules 均 PASS（详见 `cells.json`）。
