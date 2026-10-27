# TASK V15-UX-STATES-01：42 页五态覆盖实测

## 归属
- 所属切片：S2
- 来源需求：`REQ-F-015 §5` Q4（五态组件化）、`src/contracts` UX States 契约
- 来源方案：`docs/V1.5-20261027/06-验收体系.md` §4.1

## 目标
对管理端 42 页逐页判定"空/加载/错误/无权限/成功"五态**能否在运行时通过 UI 触达**，每格给出 `PASS` / `FAIL(现象)` / `N-A(依据)`，不留"待核"。

## 输入
- 文档：`docs/V1.5-20261027/06-验收体系.md` §4.1（判据定义）
- 契约：`docs/V1.5-20261027/02-契约冻结包.md` §⑥ UX States
- 前置任务：**V15-AUDIT-FIX-01**（矩阵必须先可信）
- 前置状态：`src/components/manager/feedback/` 下 7 个态组件齐备

## 输出
- 新增：`docs/design/06_validation/evidence/V15/UX-STATES-01/matrix.md`（42 行 × 5 态 + 判据列）
- 新增：`docs/design/06_validation/evidence/V15/UX-STATES-01/execution.md`

## 判据（必须按此定义，不得自行放宽）

| 态 | 如何触达 | PASS 的最小证据 |
|---|---|---|
| 空 | 列表筛到 0 条 / 空数据条件 | 看到空态文案 + **下一步动作**（如"新建"） |
| 加载 | DevTools Slow 3G 后刷新 | 看到骨架屏，非白屏 |
| 错误 | 阻断 API（停服务或 DevTools block）后操作 | 看到错误说明 + 重试按钮 |
| 无权限 | VIEWER 账号访问 EDITOR 功能 | 看到 `Forbidden` 说明 |
| 成功 | 完成一次写操作 | 看到具体 toast 文案（非"操作成功"泛词） |

**纯只读页**（如 `logs`、`publish-jobs`）的"成功"态记 `N-A(纯只读页)`，须写依据。

## Execution Steps
1. [ ] 确认前置：`node scripts/audit-manager-ui.mjs` 的 PageHeader 缺失已为 0
2. [ ] 准备环境（复用 e2e env，不新建）：
   ```bash
   DATABASE_URL="file:./prisma/e2e.db" JWT_SECRET="e2e-jwt-secret-0123456789abcdef-0123456789abcdef" \
   ENCRYPTION_KEY="e2e-encryption-key-0123456789abcdef-0123456789abcdef" \
   APP_ORIGIN="http://127.0.0.1:6791" npx tsx prisma/seed.ts
   DATABASE_URL="file:./prisma/e2e.db" npx tsx prisma/seed-visual.ts   # 固定数据集，防页面高度漂移
   ```
3. [ ] `npm run build`（若 `.next` 旧于 `src`）→ 起服务（6791）
4. [ ] 按三类批量判定，同类页共用判据模板（提高效率，R10）：
   - A 类：走 `CrudPage` 的列表页（27 页）
   - B 类：自定义页（`content-hub`、`settings`、`knowledge-bases` 等）
   - C 类：纯只读页（`logs`、`publish-jobs`、`notify-records` 等）
5. [ ] 逐页填 5 态，每格写**判据**（做了什么、看到什么），不只写结论
6. [ ] 记录 FAIL 页的现象与复现步骤，**不修代码**（本轮不改 `src/**`）
7. [ ] `matrix.md` 收尾自查：42 行无空格、无"待核"

## 验收标准
- [ ] `matrix.md` 42 行 × 5 态 + 判据列，**无空单元格、无"待核"**（可自动化：grep 计数）
- [ ] 每格含具体判据文本（≥10 字符），非裸 `PASS`（可自动化：字段长度检查）
- [ ] FAIL 页有现象 + 复现步骤（人工判断）
- [ ] N-A 页有依据（人工判断）
- [ ] 未修改 `src/**`（可自动化：`git status --short src` 为空）
- [ ] 蒸馏结论：五态齐全页数 / 有缺陷页数 / N-A 数

## 验证命令
```bash
cd /e/Code/Demo/HDwebsite/hdwebsite_1011
grep -c "^| src/app/manager" docs/design/06_validation/evidence/V15/UX-STATES-01/matrix.md   # 期望 42
grep -c "待核" docs/design/06_validation/evidence/V15/UX-STATES-01/matrix.md                # 期望 0
git status --short src
```

## 证据路径
`docs/design/06_validation/evidence/V15/UX-STATES-01/`

## 允许修改
- `docs/design/06_validation/evidence/V15/UX-STATES-01/**`
- `.cache/**`（临时截图，不入库）

## 禁止修改
- `src/**`、`tests/**`、`scripts/**`、`prisma/**`、`package.json`
- `docs/V1.5-20261027/**`
- 不得为"通过"而降低判据（如把"看到骨架"改成"代码里有骨架"）

## 依赖与阻塞
- Depends on：V15-AUDIT-FIX-01
- Blocks：V15-CLOSE-01
- 阻塞条件：若环境起不来且 30 分钟内未解决 → 标 `blocked` 上报，不得用静态 grep 冒充运行时验证

## 建议执行档位
`opus`　理由：42 页 × 5 态的验收判断，判错会放行真缺陷；属不可逆验收决策。

## 升级条件
若发现 >10 页存在系统性缺陷（如所有 CrudPage 页错误态都缺重试）→ 升级上报，判定是否需开 V1.6 卡修复。

## 预估规模
大（约 4 小时）
