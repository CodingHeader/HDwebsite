# B2 · 键盘验收

## 归属
- 阶段编号：B2
- 所属分组：B 验收闭环（承接 V1.5/V1.6 `V15-KEYBOARD-01`）
- 来源凭据：`docs/V1.5-20261027/tasks/V15-KEYBOARD-01.md`、`V1.7/06-风险与待裁决.md §B1`

## 目标
42 页 × K1~K4 = **168 格**，每格判 `PASS` / `FAIL(现象)` / `N-A(依据)`，附具体按键与观察结果。

## 为什么需要它（三级凭据）

### ① 代码位置
```ts
// 已有部分键盘能力
src/components/manager/FormDialog.tsx:88-90   Ctrl/⌘+S/Enter 提交
src/components/manager/DataTable.tsx:366      Esc 关列菜单
src/components/manager/SearchInput.tsx:56     Esc 清空
src/components/manager/ui/input.tsx:146       Esc 清除
src/components/manager/shell/UserMenu.tsx:32  Esc 关菜单

// 但 Dialog 本体无 Esc
src/components/manager/ui/dialog.tsx（98 行）  grep Escape → 0 命中
```

### ② 实测证据
```bash
$ grep -rcE "FocusTrap|focus-trap" src/components/manager src/app/manager
（全 0 —— 全站无焦点陷阱）

$ grep -nE "Escape|onKeyDown" src/components/manager/ui/dialog.tsx
（空）

$ grep -c "待核" docs/design/06_validation/evidence/V14/UI-CONSIST-01/audit-matrix.md
43
```

### ③ 规划落点
- 关闭 REQ-LEDGER 的「独立验证者逐页人工核对未执行」
- 产出 `evidence/V18/B2/matrix.md`

## 输入
- 前置阶段：**A2**（审计矩阵可信）
- 前置状态：同 B1

## 输出
- 新增：`evidence/V18/B2/matrix.md`（42 × 4 + 判据）
- 新增：`evidence/V18/B2/shared-components.md`（共性结论）
- 新增：`evidence/V18/B2/execution.md`

## 判据（按 V1.7 §B1 裁决的最小集，**不得自行扩为完整集**）

| 项 | 判定动作 | PASS | FAIL |
|---|---|---|---|
| **K1** Tab 顺序 | 从首元素 Tab 到末元素 | 顺序符合视觉，无跳跃/回跳 | 有跳跃 |
| **K2** 主操作可聚焦 | Tab 到"新建/保存"，按 Enter | 焦点可见 + 触发成功 | 不可达 / 不触发 |
| **K3** Esc 关弹窗 | 打开弹窗按 Esc | 关闭无副作用 | 不关闭 |
| **K4** 焦点可见 | 逐个 Tab 观察 focus ring | 目视可见 | `outline:none` 无替代 |

**明确不在范围**：焦点陷阱、⌘/Ctrl+S 全局（全站未实现，见 `V1.7/06 §B1`）

## 执行步骤（先共性，后逐页）

| 步骤 | 内容 | 为什么 |
|---|---|---|
| STEP-B2-1 | K3 静态 + **运行时**验证 | Dialog 是共享组件，一次定性覆盖 42 页 |
| STEP-B2-2 | K4 抽查 5 类元素 | 焦点样式是全局的 |
| STEP-B2-3 | K1/K2 逐页（42 页） | 依赖各页结构 |
| STEP-B2-Z | 体检 | — |

## 关键要求：K3 必须运行时验证

**② 凭据**：`grep -nE "Escape|onKeyDown" src/components/manager/ui/dialog.tsx` → 无命中

**但这不能直接判「Modal 无 Esc」**：
- Esc 可能由父级 `onKeyDown` 处理
- 可能由全局监听处理（如 `AppShell`）

**③ 处置**：必须实际打开弹窗按一次 Esc，记录"看到什么"。**只凭 grep 下结论违反 H4 坑。**

## 验收标准
- [ ] `matrix.md` 42 行 × K1~K4，无空、无"待核"（可自动化）
- [ ] 每格判据 ≥10 字符（可自动化）
- [ ] **K3 有运行时验证记录**（写明"打开哪个弹窗、按 Esc 后看到什么"）（人工，缺此项整卡 FAIL）
- [ ] K3 若全站 FAIL，`shared-components.md` 说明影响面（多少 Dialog 使用者）+ 建议
- [ ] 计数自洽：PASS + FAIL + N-A = **168**（可自动化）
- [ ] 未改 `src/**`（可自动化）

## 验证命令
```bash
cd /e/Code/Demo/HDwebsite/hdwebsite_1011
grep -c "^| src/app/manager" evidence/V18/B2/matrix.md    # 42
grep -c "待核" evidence/V18/B2/matrix.md                  # 0
grep -nE "Escape|onKeyDown" src/components/manager/ui/dialog.tsx || echo "dialog 无 Esc 处理"
git status --short src                                    # 空
```

## 证据路径
`evidence/V18/B2/`

## 允许修改
- `evidence/V18/B2/**`

## 禁止修改
- `src/**`（本卡只验收）
- 不得为实现"通过"而改 Dialog/FormDialog
- `evidence/V14/**`

## 依赖与阻塞
- Depends on：A2
- Blocks：E1
- 阻塞条件：若 `V1.7/06 §B1` 的裁决被改为完整集 → 停手，等重写判据

## 建议执行档位
`opus`　理由：需裁定最小达标集，K3/K4 涉交互细节判断。

## 升级条件
若 K3 全站 FAIL（影响 >10 页）→ 升级上报，评估是否开修复阶段

## 预估规模
大（4~5h）

## 自我质疑

**质疑：全站没有焦点陷阱，按最小集判会不会"放水"？**
→ 是放水，但是**有依据的放水**。
- ① 原版也没有（`grep FocusTrap` 原版同样 0）
- ② 按完整集判 = 42 页全 FAIL = 要求重做管理端
- ③ 故记 `FAIL(无焦点陷阱)` 在 `shared-components.md`，作为**已知缺陷**登记，而非隐藏

**质疑：K1 Tab 顺序"符合视觉顺序"太主观**
→ 确实主观。缓解：记录**完整焦点序列**（如 `侧栏→搜索→筛选→新建→首行→行操作`），让复核者能自己判断。
