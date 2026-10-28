# TASK V15-KEYBOARD-01：42 页键盘可达实测

## 归属
- 所属切片：S2
- 来源需求：`REQ-F-015 §5` Q5（键盘可达）
- 来源方案：`docs/V1.6-20261027/03-执行单元分解.md` L1-2；`06-风险与待裁决.md` §B1

## 目标
42 页 × K1~K4 = 168 格，每格判 `PASS` / `FAIL(现象)` / `N-A(依据)`，附具体按键操作与观察结果。

## 输入
- 文档：`docs/V1.6-20261027/05-验收体系.md` §2.2（判据）
- 契约：无
- 前置任务：V15-AUDIT-FIX-01（✅ done）
- 前置状态：`FormDialog.tsx:88-90` 已有 `Ctrl/⌘+S/Enter`；`dialog.tsx` 98 行无 Esc 命中

## 输出
- 新增：`docs/design/06_validation/evidence/V15/KEYBOARD-01/matrix.md`（42 × 4 + 判据）
- 新增：`docs/design/06_validation/evidence/V15/KEYBOARD-01/execution.md`
- 新增：`docs/design/06_validation/evidence/V15/KEYBOARD-01/shared-components.md`（共性结论）

## Execution Steps
1. [ ] **先做共性验证**（`03 §L2-2.1`），不要 42 页重复：
   - [ ] K3 静态：`grep -nE "Escape|onKeyDown" src/components/manager/ui/dialog.tsx`（98 行）
   - [ ] K3 静态：同命令查 `FormDialog.tsx`、`feedback/ConfirmDialog.tsx`
   - [ ] K3 **运行时**：起服务，打开"新建"弹窗按 Esc，记录是否关闭
   - [ ] K4：抽查 5 类元素（Button/Input/Select/链接/卡片操作）观察 focus ring
   - [ ] K4：`grep -rn "outline-none\|outline: none" src/components/manager | head`
2. [ ] 把共性结论写 `shared-components.md`，明确"哪些页共用哪个容器"
3. [ ] K1 逐页：Tab 顺序（42 页），记录焦点序列与是否与视觉顺序一致
4. [ ] K2 逐页：Tab 到新建/保存按 Enter，判是否触发
5. [ ] K3 套用共性结论到使用 Dialog 的页
6. [ ] K4 套用共性结论
7. [ ] 汇总 matrix.md + execution.md

## 验收标准
- [ ] matrix.md 42 行 × K1~K4，无空、无"待核"（可自动化）
- [ ] 每格判据 ≥10 字符（可自动化）
- [ ] **K3 有运行时验证记录**：写明"打开哪个弹窗、按 Esc 后看到什么"（人工判断，缺此项整卡 FAIL）
- [ ] K3 若全站 FAIL，`shared-components.md` 说明影响面（多少个 Dialog 使用者）+ 建议
- [ ] 未改 `src/**`（可自动化）
- [ ] 计数自洽：PASS + FAIL + N-A = 168

## 验证命令
```bash
cd /e/Code/Demo/HDwebsite/hdwebsite_1011
grep -c "^| src/app/manager" docs/design/06_validation/evidence/V15/KEYBOARD-01/matrix.md   # 42
grep -c "待核" docs/design/06_validation/evidence/V15/KEYBOARD-01/matrix.md                # 0
grep -nE "Escape|onKeyDown" src/components/manager/ui/dialog.tsx || echo "dialog.tsx 无 Esc"
git status --short src
```

## 证据路径
`docs/design/06_validation/evidence/V15/KEYBOARD-01/`

## 允许修改
- `docs/design/06_validation/evidence/V15/KEYBOARD-01/**`

## 禁止修改
- `src/**`、`tests/**`、`scripts/**`、`prisma/**`、`package.json`
- `docs/V1.6-20261027/**`
- 不得为实现"通过"而改 Dialog/FormDialog

## 依赖与阻塞
- Depends on：V15-AUDIT-FIX-01 ✅
- Blocks：V15-CLOSE-01
- 阻塞条件：若 `06 §B1` 在执行前被改为完整集 → 停手，等重写判据后重跑

## 建议执行档位
`opus`　理由：需裁定最小达标集（B1），K3/K4 涉交互细节判断，口径不可逆。

## 升级条件
若 K3 全站 FAIL（Dialog 无 Esc 影响 >10 页）→ 升级上报，判定是否开修复卡（本轮不改代码）。

## 预估规模
大（4~5 小时）