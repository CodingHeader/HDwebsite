# TASK V15-KEYBOARD-01：42 页键盘可达实测

## 归属
- 所属切片：S2
- 来源需求：`REQ-F-015 §5` Q5（键盘可达：焦点陷阱/Esc/⌘+S）
- 来源方案：`docs/V1.5-20261027/06-验收体系.md` §4.2、`07-风险与待裁决.md` §B1

## 目标
对管理端 42 页逐页判定键盘可达性（K1~K4 四项），每格给出 `PASS` / `FAIL(现象)` / `N-A(依据)`，不留"待核"。

## 输入
- 文档：`docs/V1.5-20261027/06-验收体系.md` §4.2（判据）、`07` §B1（口径裁决）
- 契约：无
- 前置任务：**V15-AUDIT-FIX-01**
- 前置状态：`FormDialog.tsx:88-90` 已实现 `Ctrl/⌘+S/Enter` 提交

## 输出
- 新增：`docs/design/06_validation/evidence/V15/KEYBOARD-01/matrix.md`（42 行 × K1~K4 + 判据列）
- 新增：`docs/design/06_validation/evidence/V15/KEYBOARD-01/execution.md`

## 判据（默认方案 A：最小集，见 07 §B1）

| 项 | 判定动作 | PASS 条件 |
|---|---|---|
| **K1** Tab 顺序 | 从页面首个可聚焦元素 Tab 到末尾 | 顺序符合视觉顺序，无明显跳跃/回跳 |
| **K2** 主操作可聚焦 | Tab 到"新建/保存/提交"，按 Enter | 焦点可见 + 触发成功 |
| **K3** Esc 关闭弹窗 | 打开任一模态（新建/编辑/确认），按 Esc | 弹窗消失，无副作用 |
| **K4** 焦点可见 | 逐个可聚焦元素观察 focus ring | 目视可见，非 `outline: none` 无替代 |

**明确不在本卡范围**（列入 07 §B1 待裁决）：
- 焦点陷阱（实测 `grep -rcE "FocusTrap|focus-trap"` 在 manager 下全为 0，全站未实现）
- ⌘/Ctrl+S 全局快捷键（仅 `FormDialog` 内实现，非全局）

## Execution Steps
1. [ ] 确认前置：审计矩阵 PageHeader 缺失已为 0（`grep "PageHeader 缺失" audit-matrix.md`）
2. [ ] 准备环境（同 UX-STATES 卡，复用 e2e env + seed）
3. [ ] **先实测 K3 的现状**（关键，见 08 §L4）：
   ```bash
   grep -nE "Escape|onKeyDown" src/components/manager/ui/dialog.tsx
   grep -nE "Escape|onKeyDown|key===" src/components/manager/FormDialog.tsx
   ```
   静态 grep 后**必须运行时验证**一次（打开弹窗按 Esc），不得只凭 grep 下结论
4. [ ] 按三类批量判定（A 类 CrudPage 页 / B 类自定义页 / C 类只读页）
5. [ ] 每格写判据（按了哪些键、看到什么），不只写结论
6. [ ] 记录 FAIL 页的现象与复现步骤，**不修代码**
7. [ ] 若 K3 全站 FAIL（Dialog 无 Esc）→ 单独汇总一节，说明影响面与建议

## 验收标准
- [ ] `matrix.md` 42 行 × K1~K4 + 判据列，**无空单元格、无"待核"**（可自动化：grep）
- [ ] 每格判据 ≥10 字符（可自动化）
- [ ] K3 的结论有运行时验证记录（人工判断，须写明"打开了哪个弹窗、按 Esc 后看到什么"）
- [ ] 未修改 `src/**`（可自动化：`git status --short src`）
- [ ] 汇总：K1~K4 各 PASS/FAIL/N-A 计数

## 验证命令
```bash
cd /e/Code/Demo/HDwebsite/hdwebsite_1011
grep -c "^| src/app/manager" docs/design/06_validation/evidence/V15/KEYBOARD-01/matrix.md   # 期望 42
grep -c "待核" docs/design/06_validation/evidence/V15/KEYBOARD-01/matrix.md                # 期望 0
grep -nE "Escape|onKeyDown" src/components/manager/ui/dialog.tsx || echo "dialog.tsx 无 Esc 处理"
git status --short src
```

## 证据路径
`docs/design/06_validation/evidence/V15/KEYBOARD-01/`

## 允许修改
- `docs/design/06_validation/evidence/V15/KEYBOARD-01/**`

## 禁止修改
- `src/**`、`tests/**`、`scripts/**`、`prisma/**`、`package.json`
- `docs/V1.5-20261027/**`
- 不得为实现"通过"而修改 Dialog/FormDialog 组件

## 依赖与阻塞
- Depends on：V15-AUDIT-FIX-01
- Blocks：V15-CLOSE-01
- 阻塞条件：若 07 §B1 的裁决在执行前被推翻（改为完整集）→ 停手，等重新裁定判据后重跑

## 建议执行档位
`opus`　理由：需裁定"最小达标集"，且 K3/K4 涉及交互细节判断，口径不可逆。

## 升级条件
若发现 >10 页 K3 FAIL（Dialog 全站无 Esc）→ 升级上报，判定是否开 V1.6 卡修复（本轮不改代码）。

## 预估规模
大（约 4 小时）
