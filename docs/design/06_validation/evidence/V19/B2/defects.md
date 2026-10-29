# B2 键盘验收 defects.md

> 实测于 2026-10-29 · 分支 `upgrade` · HEAD `7e01458`（FIX-03）
> B2 判据 K1~K4 共 **172 格**：PASS 152 · FAIL 0 · N-A 20

## 结论

**B2 键盘验收未发现键盘可达性缺陷（FAIL = 0）。** 43 页 × K1~K4：

| 判据 | PASS | FAIL | N-A |
|---|---|---|---|
| K1 Tab 顺序 | 40 | 0 | 3 |
| K2 主操作 Enter | 36 | 0 | 7 |
| K3 Esc 关弹窗 | 35 | 0 | 8 |
| K4 焦点可见 | 41 | 0 | 2 |
| **合计** | **152** | **0** | **20** |

## N-A 清单与依据

### K1 N-A（3）

| 页 | 依据 |
|---|---|
| `/manager/ai-config` | 纯 `redirect` 无 UI（卡 N-A 合法） |
| `/manager/news` | 纯 `redirect` 无 UI（卡 N-A 合法） |
| `/manager/login` | 单表单页无列表 Tab 序列语义（卡 N-A 合法） |

### K2 N-A（7）

| 页 | 依据 |
|---|---|
| `/manager/collect-tasks` | `CrudPage` readOnly，无新建/保存，无 `rowActions`/`detail` → 无主操作 |
| `/manager/logs` | 同上 |
| `/manager/notify-records` | 同上 |
| `/manager/user-actions` | 同上 |
| `/manager/chat-history` | 自定义只读会话列表，`AIChatHistory`=0，无会话行即无「查看详情」主操作 |
| `/manager/ai-config` | 纯 redirect |
| `/manager/news` | 纯 redirect |

### K3 N-A（8）

| 页 | 依据 |
|---|---|
| `/manager/collect-tasks` | `CrudPage` readOnly 无 `dialog`/`detail` → 无弹窗 |
| `/manager/logs` | 同上 |
| `/manager/notify-records` | 同上 |
| `/manager/user-actions` | 同上 |
| `/manager`（仪表盘） | 页面无任何 `Dialog` 组件 |
| `/manager/login` | 页面无任何 `Dialog` 组件 |
| `/manager/ai-config` | 纯 redirect |
| `/manager/news` | 纯 redirect |

### K4 N-A（2）

| 页 | 依据 |
|---|---|
| `/manager/ai-config` | 纯 redirect |
| `/manager/news` | 纯 redirect |

## 说明：只读页 K2/K3 判 N-A 的依据

卡 N-A 合法条件表只列 `ai-config`/`news`（全）与 `login`（K1）。本卡对下列只读页 K2/K3 判 N-A，属同一逻辑延伸（非降判据）：

- **代码依据**：`src/components/manager/crud-specs.tsx` 的 `READ_ONLY` 定义（`collect-tasks`/`logs`/`notify-records`/`user-actions`）为 `readOnly:true`、`fields:[]`、**无** `detail`、**无** `rowActions` → `CrudPage`（`canCreate=false`、`rowActions=undefined`）不渲染新建/编辑/查看/删除按钮，也不挂任何 `Dialog`。
- **运行时证实**：`.cache/v19/b2-k2c.json`/`b2-k2e.json` 探针在 `main` 区域枚举到 **0 个动作按钮**（仅工具栏「切换密度/显示列/刷新」+ 排序表头），`chat-history` 空态无会话行。
- **判定**：K2（主操作 Enter）与 K3（Esc 关弹窗）无适用目标，故判 **N-A** 而非虚报 PASS（无主操作不可测）或误报 FAIL（非缺陷）。

## 已排除的 B1 遗留

V18-B1 的 11 个 FAIL 已由 **FIX-01/02/03**（`fd64d5d`/`7567581`/`7e01458`）修复。B2 判据不含五态（loading/error/forbidden/empty/success），故 B1 遗留不进入本卡 FAIL 统计。

## 后续

- 本卡 **FAIL = 0**，无缺陷需转入 backlog。
- 遗留的键盘相关观察：`media`「上传文件」Enter 触发**原生文件选择器**（非页面弹窗），属预期设计，判 PASS。
