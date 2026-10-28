# TASK V15-UX-STATES-01：42 页五态实测

## 归属
- 所属切片：S2
- 来源需求：`REQ-F-015 §5` Q4（五态组件化）；`V1.4/06-验收体系` §四
- 来源方案：`docs/V1.6-20261027/03-执行单元分解.md` L1-1

## 目标
42 页 × 5 态 = 210 格，每格判 `PASS` / `FAIL(现象)` / `N-A(依据)`，附"做了什么 + 看到什么"，无"待核"。

## 输入
- 文档：`docs/V1.6-20261027/{03,05}.md`（执行单元 + 判据）
- 契约：`docs/V1.6-20261027/02-契约冻结包.md` §⑥ UX States
- 前置任务：V15-AUDIT-FIX-01（✅ done）
- 前置状态：审计矩阵可信用（PageHeader 缺口已修正为 0）

## 输出
- 新增：`docs/design/06_validation/evidence/V15/UX-STATES-01/matrix.md`（42 行 × 5 态 + 判据）
- 新增：`docs/design/06_validation/evidence/V15/UX-STATES-01/execution.md`
- 新增：`docs/design/06_validation/evidence/V15/UX-STATES-01/defects.md`（FAIL 清单）

## Execution Steps
1. [ ] 环境：按 `steps/STEP-S2-1.md` 建库（e2e.db + seed + seed-visual）
2. [ ] 构建 + 起服务（`npx next start -p 6791`），登录一次拿 token
3. [ ] A 类批次 A1：标准列表页五态（每页 5 步，见 `03 §L3-1.1.1`）
4. [ ] A 类批次 A2：只读页 5 页（成功态 N-A）
5. [ ] A 类批次 A3：配置页 4 页
6. [ ] B 类子批 B1：内容域 5 页
7. [ ] B 类子批 B2：配置域 4 页
8. [ ] B 类子批 B3：3 页特殊页（`manager`/`news`/`login`，含预置 N-A）
9. [ ] B 类子批 B4：2 页图表页（`home-blocks`/`publish-jobs`）
10. [ ] 汇总：matrix.md 42 行无空、无"待核"；defects.md 列 FAIL 现象+复现
11. [ ] execution.md：5W1H + PASS/FAIL/N-A 计数

## 验收标准
- [ ] matrix.md 42 行 × 5 态，无空单元格、无"待核"（可自动化：grep 计数）
- [ ] 每格判据 ≥10 字符且含具体动作（可自动化：长度检查 + 抽样人工）
- [ ] `news` 5 态全 N-A 且有依据（代码仅 redirect）
- [ ] `login` 空态/列表态 N-A 有依据
- [ ] 只读页成功态 N-A 有依据
- [ ] defects.md 每个 FAIL 含现象 + 复现步骤（人工判断）
- [ ] 未改 `src/**`（可自动化：`git status --short src` 为空）
- [ ] 计数自洽：PASS + FAIL + N-A = 210

## 验证命令
```bash
cd /e/Code/Demo/HDwebsite/hdwebsite_1011
grep -c "^| src/app/manager" docs/design/06_validation/evidence/V15/UX-STATES-01/matrix.md   # 期望 42
grep -c "待核" docs/design/06_validation/evidence/V15/UX-STATES-01/matrix.md                # 期望 0
git status --short src                                                                       # 期望空
```

## 证据路径
`docs/design/06_validation/evidence/V15/UX-STATES-01/`

## 允许修改
- `docs/design/06_validation/evidence/V15/UX-STATES-01/**`
- `.cache/**`（临时截图）

## 禁止修改
- `src/**`、`tests/**`、`scripts/**`、`prisma/**`、`package.json`
- `docs/V1.6-20261027/**`
- 不得为"通过"降判据（如把"看到骨架"改成"代码里有骨架"）

## 依赖与阻塞
- Depends on：V15-AUDIT-FIX-01 ✅
- Blocks：V15-CLOSE-01
- 阻塞条件：若环境起不来且 40 分钟未解决 → 标 `blocked` 上报，不得用静态 grep 冒充运行时验证

## 建议执行档位
`opus`　理由：210 格验收判断，判错会放行真缺陷；属不可逆验收决策。

## 升级条件
若 A 类 27 页出现系统性五态缺陷（如全部缺错误态重试）→ 升级上报，判定是否开修复卡。

## 预估规模
大（6~8 小时）