# V7-V-A W1-A 线独立验收补登 · 执行证据

- 执行者：主代理（opus 档位）· 分支：`upgrade` · 依赖：V7-T-01（已完成）
- 卡定义：`docs/V0.7-20261019/tasks/V7-V-A.md`；切片 S2
- 允许修改：`docs/design/06_validation/evidence/W1-A/*/*-verify.md`
- 禁止修改：src/**、tests/**、prisma/**

## 1. 目标

对 A-01~A-08 逐卡只看 diff + 运行结果给出 PASS/FAIL/UNKNOWN，写 `<卡号>-verify.md`。

## 2. 执行过程

1. 定位 8 个 A 卡提交（git log --grep）：
   - A-01 `4ce9e16`、A-02 `cbbcceb`、A-03 `632dc51`、A-04 `4170d7b`、A-05 `465b0bd`、A-06 `27b1dba`、A-07 `ff0890e`（M1）、A-08 `1ae8550`
2. `git show --stat` 逐卡核对 diff 触及文件 ⊆ 各卡允许修改路径。
3. 逐条执行原卡验收命令（只读 + 测试），独立于 A 线原执行者。
4. 生成 `<卡号>-verify.md`（8 份），每份含判定 + 理由 + 关键证据 + UNKNOWN。

## 3. 独立复核结果

| 卡 | 判定 | 关键证据 |
|---|---|---|
| A-01 | PASS | manager/ui/ 新目录 + ADR-033；前台 `src/components/ui/**` 未改；单测 6/6；门禁全绿 |
| A-02 | PASS | DataTable 服务端排序 + URL 同步；data-table.test.tsx 6/6；e2e 8/8 选择器不变 |
| A-03 | PASS | relation 远程搜索 + Ctrl/⌘+S + fieldErrors 标红；resource-form.test.tsx 5/5；e2e a-form-errors 通过 |
| A-04 | PASS | `grep -cE '<(table\|button\|input\|select\|textarea)(\\s\|>\|$)' src/components/manager/CrudPage.tsx` = **0**；e2e 9/9；jsdom smoke 降级登记 |
| A-05 | PASS | RichTextField 双层 next/dynamic 命中；SchemaForm 无静态导入；XSS e2e 通过；包体 ≤359,059 B 上限 |
| A-06 | PASS | `grep -rn '@radix-ui' src` = **空**；diff 仅注释改写 + label.tsx 2 行 |
| A-07 | PASS | M1-verify.md 已存在且结论 PASS；tag w1-ui-kit 2026-10-19 已删 → 基线 c6a2cb4 |
| A-08 | PASS | a11y 12/12（页面层 serious/critical=0）；e-responsive 通过；门禁全绿 |

**本次独立跑**：

- `npx vitest run src/components/manager/ui src/components/manager/__tests__/data-table.test.tsx src/components/manager/__tests__/resource-form.test.tsx` → **3 files / 17 tests passed**
- `npm run lint` 0 errors / `npm run typecheck` exit 0 / `npm test` **823 passed** / `npm run build` exit 0
- `npx playwright test -c tests/e2e/playwright.config.ts` → **49 pass / 3 skip / 0 fail**
- `npx playwright test -c tests/a11y/playwright.config.ts` → **12 passed**

## 4. 验证者独立性

- A 线原执行者：Agent-UI（提交 author 为 lane 期 Agent-UI）
- V7-V-A 验证者：主代理（opus，独立上下文复核）
- 验证者不是该卡原执行者，符合"防自证循环"。

## 5. UNKNOWN（如实登记）

- **visual**：前台视觉回归在 Windows 环境 UNKNOWN（参照图生成于 Linux/CI，main@94dbbbb 口径）；留 Linux 实机 V7-UI-02。
- 卡定义原引用 `w1-base-ccr-1` / `w1-ui-kit` tag（2026-10-19 已删），按 V0.7 口径改写为提交号 `f158501` / `c6a2cb4`。

## 6. 验收逐条（大纲）

| 项 | 判定 | 证据 |
|---|---|---|
| 每张卡都有 verify.md | **PASS** | 8 份 `<卡号>-verify.md` 生成于 W1-A/A-0X/ |
| 验证者不是原执行者 | **PASS** | §4 |
| 不改任何 src/** | **PASS** | 本卡零代码改动 |
| 触及文件 ⊆ 允许修改 | **PASS** | `git diff --name-only` = 仅 evidence/W1-A/A-0X/*-verify.md |

## 7. 结论

- **完成度：100%**
- **判定：PASS**（visual UNKNOWN 已登记，非本卡硬门禁）
- **阻塞**：无。

## 8. git 状态

- HEAD：`0ae414e`（W2-05 证据）
- 本地领先 origin/upgrade 56+ 提交，远端 0 独有。