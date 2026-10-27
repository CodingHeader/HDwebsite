# TASK V15-CLOSE-01：V1.5 收口

## 归属
- 所属切片：S3
- 来源需求：`AGENTS.md §6` 完成定义、§8 提交与证据
- 来源方案：`docs/V1.5-20261027/04-垂直切片清单.md` S3

## 目标
把 V1.5 六卡状态钉为终态，补 changelog V1.5 段，跑一次全量门禁（本轮唯一一次），推送并校验双端 0 0。

## 输入
- 文档：`docs/V1.5-20261027/{04,06,09}.md`
- 契约：无
- 前置任务：V15-LEDGER-01、V15-AUDIT-FIX-01、V15-TOKEN-01、V15-UX-STATES-01、V15-KEYBOARD-01、V15-MOBILE-375-01 **全部 done**
- 前置状态：六卡证据齐备

## 输出
- 修改：`docs/V1.5-20261027/state.json`（终态）
- 修改：`docs/design/07_release/changelog.md`（V1.5 段）
- 修改：`docs/design/02_requirements/parity-matrix.md`（复核，预期无变化）
- 修改：`docs/V1.4-20261027/state.json`（**仅**把 2 条"独立验证者未执行"的 UNKNOWN 依据更新为已执行；不改需求文档本身）
- 新增：`docs/design/06_validation/evidence/V15/CLOSE-01/execution.md`

## Execution Steps
1. [ ] 逐卡核对 `state.json`：`status` / `commits` / `verify` / `note` 四字段齐全
2. [ ] **跑一次全量门禁**（本轮唯一一次，串行）：

   > 铁律：禁止并行跑 `build` 与 `test`（V1.3 实测 `Hook timed out`）。

   ```bash
   npm run lint && npm run typecheck && npm test && npm run build
   npm run check:assets && npm run check:root && npm run check:audit
   node scripts/check-frozen.mjs
   ```
3. [ ] 若本卡前有任何卡改过 `src/**`（预期没有）→ 追加 `npm run test:e2e`
4. [ ] 补 changelog V1.5 段，按五类结构：门禁变化 / feat / fix / test / UNKNOWN
   - 必须写明：本轮**无功能新增**，只做验收闭环
   - 必须列：五态/键盘/375px 各自的 PASS/FAIL/N-A 计数
5. [ ] parity 矩阵复核：预期无状态变化（本轮不改功能）；若确无变化，注明"复核无变化"
6. [ ] 更新 `docs/V1.4-20261027/state.json` 中 REQ-LEDGER 相关 UNKNOWN 依据：
   - "独立验证者抽查≥10 行未执行" → 已由 V15 执行，引用 `evidence/V15/**`
   - "独立验证者逐页人工核对未执行" → 同上
   - **不改需求文档正文的 checkbox**（那是 REQ-LEDGER 卡的所有权）
7. [ ] `git rev-list --left-right --count origin/upgrade...HEAD` → 目标 `0 0`
8. [ ] 写 evidence：门禁输出摘要 + 双端计数 + 各卡 PASS/FAIL 汇总

## 验收标准
- [ ] 7 卡全 `done`，无 `ready` / `in_progress` 残留（可自动化：`node -e`）
- [ ] 全量门禁 8 项串行全 exit 0（可自动化，须粘当次输出）
- [ ] changelog 含 V1.5 段且五类结构齐全（可自动化：grep）
- [ ] 双端 `0 0`（可自动化）
- [ ] parity 矩阵有复核结论（无变化也须写明）
- [ ] V1.4 的 2 条流程类 UNKNOWN 已引用 V15 证据（可自动化：grep 路径存在）
- [ ] 未改任何 `src/**`（可自动化：`git status --short src` 为空）

## 验证命令
```bash
cd /e/Code/Demo/HDwebsite/hdwebsite_1011
node -e "const d=require('./docs/V1.5-20261027/state.json');
const bad=Object.entries(d).filter(([k,v])=>v.status!=='done');
console.log(bad.length?('未完成: '+bad.map(x=>x[0]).join(',')):'7卡全done');
"
grep -n "V1.5" docs/design/07_release/changelog.md | head -3
git fetch origin upgrade && git rev-list --left-right --count origin/upgrade...HEAD
git status --short src
```

## 证据路径
`docs/design/06_validation/evidence/V15/CLOSE-01/execution.md`

## 允许修改
- `docs/V1.5-20261027/state.json`
- `docs/design/07_release/changelog.md`
- `docs/design/02_requirements/parity-matrix.md`
- `docs/V1.4-20261027/state.json`（仅 UNKNOWN 依据字段）
- `docs/design/06_validation/evidence/V15/CLOSE-01/**`

## 禁止修改
- `src/**`、`tests/**`、`scripts/**`、`prisma/**`、`package.json`
- 需求文档正文（`docs/design/02_requirements/features/**` 的 checkbox）
- `docs/V1.5-20261027/` 下除 `state.json` 外的其它文件

## 依赖与阻塞
- Depends on：其余 6 卡全部 done
- Blocks：无（终点卡）
- 阻塞条件：若有卡 `blocked` → 收口时保留其 blocked 并写明原因，**不阻塞本卡**；但 changelog 必须如实记录

## 建议执行档位
`haiku`　理由：纯台账收口 + 模板填空，无判断。

## 升级条件
若全量门禁出现失败且无法在 30 分钟内定位 → 升级 `opus`，由主控判断是否属既有噪音。

## 预估规模
小（约 30 分钟，含门禁 ~8 分钟）
