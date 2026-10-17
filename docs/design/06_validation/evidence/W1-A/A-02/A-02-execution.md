# A-02 执行记录：DataTable 排序/URL 同步/测试

分支 `lane/a-manager-ui`（自 w1-base-ccr-1，A-01 之后 + 合入 lane/e-manager-pages）。执行：本会话（Hark-A 角色）。

## 改动（全部在 allow 内）

- `src/components/manager/DataTable.tsx`：
  - `SortState` 类型 + 新可选 props：`onSortChange`（服务端排序回调）、`sort`（受控态）、`syncUrl`（URL 同步开关，缺省关闭——既有调用方行为不变）
  - 服务端排序模式：提供 `onSortChange` 时点击表头触发回调（rows 由调用方重查），跳过客户端当前页排序
  - URL 同步（`syncUrl`）：page/limit/sort 写 URL 查询参数（router.replace scroll:false）；每页条数变化回到第 1 页
  - 既有 data-testid（data-table/bulk-bar/table-skeleton）与 aria 语义全部保持
- `src/components/manager/__tests__/data-table.test.tsx`（新，6 用例 jsdom）：客户端排序默认（升/降切换）、服务端排序回调、全选/批量回调（run 收到选中行）、每页 10/20/50/100 选项与回调、URL 同步（router.replace page=2）、data-testid 容器
- 合入 `lane/e-manager-pages`（E-12 e2e 跨平台修复，`--no-ff`，他线平台修复按纪律带入；Windows e2e 前置）

## 验收结果

| 项 | 结果 |
|---|---|
| data-table.test.tsx | 6/6 PASS（排序、筛选 chips 由调用方传入、全选/批量回调、每页 10/20/50/100） |
| 既有 e2e | **8/8 PASS 不改选择器**（Windows，E-12 合入后；e2e-a02.log——首跑失败系 lane 分支无 E-12，按 --no-ff 合入后全过） |
| 通用门禁 | lint 0 errors / typecheck / test / build 全 EXIT=0（gate-a02.log） |
| 越界检查 | DataTable.tsx + 测试 ⊆ allow ✅（crud-specs.tsx 与 resource-meta 未动，归 E 线） |
| 375 无横向滚动 | <768px 卡片视图已在（P07），本卡未破坏（E-08 responsive 用例在 E 线收口时全量验证） |

## 登记

- 服务端排序为 opt-in（onSortChange）：E-05/E-06 迁移时由调用方接线（keyword/sort/filters 参数经 useManagerQuery）。
- URL 同步为 opt-in（syncUrl）：缺省关闭保证既有调用方与 e2e 零影响。
