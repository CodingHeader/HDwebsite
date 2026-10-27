# TASK V15-AUDIT-FIX-01：审计脚本 PageHeader 判定修正

## 归属
- 所属切片：S1
- 来源需求：`REQ-F-015 §5`（每页有 PageHeader）
- 来源方案：`docs/V1.5-20261027/00-规划快照与事实基线.md` §F5

## 目标
修正 `scripts/audit-manager-ui.mjs` 的 PageHeader 判定，使其能识别经 `CrudPage` 间接渲染的情况，把误报的"缺失 29 页"修正为真实的 0 页，同时**保持对真缺失的检出能力**。

## 输入
- 文档：`docs/V1.5-20261027/00-规划快照与事实基线.md` §F5（含 5 条证据）
- 契约：无
- 前置任务：无
- 前置状态：`scripts/audit-manager-ui.mjs:28` 现有 `const PAGEHEADER = /<PageHeader\b/;`

## 输出
- 修改：`scripts/audit-manager-ui.mjs`
- 修改：`docs/design/06_validation/evidence/V14/UI-CONSIST-01/audit-matrix.md`（重跑后覆盖）
- 新增：`docs/design/06_validation/evidence/V15/AUDIT-FIX-01/execution.md`

## Execution Steps
1. [ ] 读现状：`sed -n '20,40p' scripts/audit-manager-ui.mjs`，确认 `PAGEHEADER` 与判定调用点
2. [ ] 确认事实：`grep -n "PageHeader" src/components/manager/CrudPage.tsx` → 应命中 `:370`
3. [ ] 实现间接识别（三选一，优先 A）：
   - **A**：若页面文件含 `CrudPage`，则判定为 `PASS(CrudPage 间接)`，并加注释说明
   - B：解析 import 链（过重，不选）
   - C：维护一份"已知提供 PageHeader 的容器组件"白名单（`CrudPage`、`AppShell` 等）
4. [ ] **保留负向能力**：新增一个自检分支或测试，构造"既无 PageHeader 也无 CrudPage"的输入，脚本必须报 FAIL
5. [ ] 重跑并覆盖 `audit-matrix.md`：
   ```bash
   node scripts/audit-manager-ui.mjs
   ```
6. [ ] 人工核对输出：PageHeader 缺失应为 **0**；令牌作用域 FAIL 应仍为 **2**（那 2 处是例外，本卡不改）
7. [ ] 写 evidence，含修正前后对比 + 负向验证输出

## 验收标准
- [ ] `node scripts/audit-manager-ui.mjs` 输出汇总 `PageHeader 缺失 | 0`（可自动化：grep）
- [ ] 判定逻辑能区分三种情况：直接引用 / CrudPage 间接 / 真缺失（可自动化：3 条断言）
- [ ] **负向**：构造一个纯静态、无 PageHeader 也无 CrudPage 的临时测试页 → 脚本报 FAIL（可自动化，须还原）
- [ ] 令牌作用域 FAIL 仍为 2（本卡不改该项）（可自动化：grep）
- [ ] 未修改 `src/**`（可自动化：`git status --short src`）
- [ ] `audit-matrix.md` 已按新逻辑重生成（可自动化：文件 mtime 晚于脚本改动）

## 验证命令
```bash
cd /e/Code/Demo/HDwebsite/hdwebsite_1011
node scripts/audit-manager-ui.mjs
grep -E "PageHeader 缺失|令牌作用域 FAIL" docs/design/06_validation/evidence/V14/UI-CONSIST-01/audit-matrix.md

# 负向（务必还原）
cat > src/app/manager/__tmp_nohdr/page.tsx <<'EOF'
export default function Tmp() { return <div>no header</div>; }
EOF
node scripts/audit-manager-ui.mjs | grep -A1 "__tmp_nohdr" || echo "未检出（不合格）"
rm -rf src/app/manager/__tmp_nohdr
git status --short src
```

## 证据路径
`docs/design/06_validation/evidence/V15/AUDIT-FIX-01/execution.md`

## 允许修改
- `scripts/audit-manager-ui.mjs`
- `docs/design/06_validation/evidence/V14/UI-CONSIST-01/audit-matrix.md`（重跑覆盖）
- `docs/design/06_validation/evidence/V15/AUDIT-FIX-01/**`

## 禁止修改
- `src/**`（负向验证的临时目录必须删除）
- `src/components/manager/CrudPage.tsx`
- 其它审计判定项（原生控件 / 令牌 / 前台零改动）的阈值
- `docs/V1.5-20261027/**`

## 依赖与阻塞
- Depends on：无
- Blocks：V15-UX-STATES-01、V15-KEYBOARD-01、V15-MOBILE-375-01
- 阻塞条件：若 `CrudPage` 的 PageHeader 实际是条件渲染（非顶层），则间接判定不成立 → 停手上报，不得强行改成 PASS

## 建议执行档位
`sonnect`　理由：正则/判定逻辑修改，规则明确，但需保证负向仍生效。

## 升级条件
若发现除 `CrudPage` 外还有多个容器组件提供 PageHeader，且需维护白名单 → 升级 `opus`，由主控裁定识别策略。

## 预估规模
小～中（约 1 小时）
