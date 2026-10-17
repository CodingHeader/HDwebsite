# M1 独立验证报告（A-07 · 组件发布点 M1）

> 验证者：主 Agent（独立验证视角，按卡内"只看 `git diff w1-base-ccr-1..lane/a-manager-ui` 与命令结果"）　分支：`upgrade` / `lane/a-manager-ui`
> 日期：2026-10-17　判定口径：A-07 卡验收标准（diff 范围 ⊆ A 线所有权；合并带入的他线提交不计入）。

## 0. 执行摘要

| 验收条目 | 结果 | 依据 |
|---|---|---|
| M1-verify 结论 | **PASS** | A-01~A-04 交付独立核对全过（§1）；门禁 4/4、vitest 343+ 全过 |
| `git diff --name-only w1-base-ccr-1..w1-ui-kit` ⊆ A 线所有权 | **PASS** | 21 文件分类核对（§2）：A 线 allow 17 + E-12 合入带入的他线提交 4（--no-ff 纪律，不计越界） |
| 合并后 GATE/VIS/E2E | 合并后复跑（§3） | 合并前同代码基线：lint 0 errors、e2e 9/9（Windows）、visual 45/46（差异=基线不增） |
| 视觉门禁参照机复跑 | 合并后复跑 | Windows 本机即参照机 |

## 1. A-01~A-04 交付核对

| 卡 | 交付 | 验证证据 |
|---|---|---|
| A-01 | manager/ui 基础件第一批（DateTimeInput/RadioGroup/Skeleton）+ 6 jsdom 测试 + ADR-033 | components.test 6/6；前台 ui 文件 diff 空 |
| A-02 | DataTable 服务端排序回调 + URL 同步（opt-in）+ 6 测试 | data-table.test 6/6；e2e 8/8 选择器不变 |
| A-03 | relation 字段远程搜索 + Ctrl/⌘+S + beforeunload + fieldErrors 测试 | resource-form.test 5/5；a-form-errors e2e 1 passed |
| A-04 | CrudPage 组合层验收（P07 成果：原生控件 grep=0、PageHeader+DataTable+ResourceForm 组合） | grep=0 ✅；e2e 9/9 同基线；jsdom smoke 降级登记 |

## 2. diff 范围分类（21 文件）

**A 线 allow（17）**：ADR-033、`evidence/W1-A/**`（4）、`src/components/manager/**`（DataTable/FormDialog/SchemaForm/RelationField/ui/\*\*、\_\_tests\_\_×3）、`tests/e2e/a-form-errors.spec.ts` ✅
**E-12 合入带入（4，不计越界）**：`evidence/W1-E/E-12/portability.md`、`tests/e2e/fixtures/kill-tree.*`（3）、`tests/e2e/global-setup.ts`——merge(A-02) 按"本线合入他线一律 --no-ff"带入，Windows e2e 的前置 ✅
**未动**：crud-specs.tsx、resource-meta/**、前台 6 ui 文件、冻结面（contracts/schema/依赖/测试配置）✅

## 3. 合并与发布

- 合并：`upgrade` ← `lane/a-manager-ui`（merge commit）
- tag：`w1-ui-kit`（E 线 E-05/E-06 开工前 `git fetch --tags && git merge --no-ff w1-ui-kit`，按 tag 存在判断，无需实时通知）
- 合并后复跑：通用门禁 + visual + e2e（结果回填 §4）

## 4. 合并后复跑结果（回填）

- [x] 通用门禁 4/4（gate-m1.log，SHA=c6a2cb4）
- [x] visual 45/46（失败集 ⊆ {courses@375}，差异=基线不增，visual-m1.log）
- [x] e2e 9/9（Windows，visual-m1.log）
