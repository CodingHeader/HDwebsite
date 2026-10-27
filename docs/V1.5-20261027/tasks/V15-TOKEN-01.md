# TASK V15-TOKEN-01：令牌作用域例外白名单化

## 归属
- 所属切片：S1
- 来源需求：`REQ-F-015 §5`（管理端只用 `mgr-*` 令牌，无全局污染）
- 来源方案：`docs/V1.5-20261027/00-规划快照与事实基线.md` §F6

## 目标
把 2 处"有正当理由的硬编码色值"登记为受控白名单，使令牌作用域检查从"2 处 FAIL"变为"0 处 FAIL + 2 条已批准例外"，**不修改任何样式**。

## 输入
- 文档：`docs/V1.5-20261027/00-规划快照与事实基线.md` §F6（含 7 条实测行号）
- 契约：无
- 前置任务：无
- 前置状态：`evidence/V14/UI-CONSIST-01/audit-matrix.md` 汇总 `令牌作用域 FAIL | 2`

## 输出
- 新增：`docs/design/06_validation/evidence/V15/TOKEN-01/whitelist.md`
- 修改：`docs/design/06_validation/evidence/V14/UI-CONSIST-01/audit-matrix.md`（在汇总处加例外说明，**不改 42 行判定**）

## Execution Steps
1. [ ] 复核 2 处证据（逐行确认，不凭记忆）：
   ```bash
   sed -n '528,536p' src/app/manager/content-hub/page.tsx
   sed -n '60,80p' src/app/manager/login/page.tsx
   ```
2. [ ] 写 `whitelist.md`，每条例外必须含**五个字段**：
   - 文件:行号
   - 命中内容（原文片段）
   - 为什么不能改用 `mgr-*`（技术理由，非"觉得好看"）
   - 若强行改会违反哪条需求/导致什么后果
   - 批准结论（本轮：登记白名单，不改）
3. [ ] 例外 1（content-hub 公众号预览）理由须写明：这是**模拟微信阅读界面**，真实公众号配色固定，用 `mgr-*` 会使预览失真、功能失去意义
4. [ ] 例外 2（login 品牌页）理由须写明：深色品牌渐变上的**反白文字**，`mgr-*` 无反色语义
5. [ ] 在 `audit-matrix.md` 汇总表下方追加「已知例外」小节，指向 `whitelist.md`
6. [ ] **不修改任何 `.tsx` className / style**

## 验收标准
- [ ] `whitelist.md` 含且仅含 2 条例外，每条五字段齐全（可自动化：字段计数）
- [ ] 每条例外有 `file:line` 且该行确实含硬编码色值（可自动化：`grep -n` 复验）
- [ ] 未修改任何 `src/**`（可自动化：`git status --short src` 为空）
- [ ] `audit-matrix.md` 42 行判定值未变（可自动化：`git diff` 只含追加的小节）
- [ ] 例外理由不是"设计需要"这类空话，须指到具体后果（人工判断）

## 验证命令
```bash
cd /e/Code/Demo/HDwebsite/hdwebsite_1011
grep -nE "#[0-9a-fA-F]{3,8}\b|\b(black|white)\b" src/app/manager/content-hub/page.tsx | sed -n '1,6p'
grep -nE "#fff|bg-white|text-white" src/app/manager/login/page.tsx | sed -n '1,6p'
git status --short src
git diff --stat docs/design/06_validation/evidence/V14/UI-CONSIST-01/audit-matrix.md
```

## 证据路径
`docs/design/06_validation/evidence/V15/TOKEN-01/{whitelist.md,execution.md}`

## 允许修改
- `docs/design/06_validation/evidence/V15/TOKEN-01/**`
- `docs/design/06_validation/evidence/V14/UI-CONSIST-01/audit-matrix.md`（仅追加"已知例外"小节）

## 禁止修改
- `src/**`（尤其 `content-hub/page.tsx`、`login/page.tsx` 的 className）
- `src/app/globals.css`、`tailwind` 配置
- `docs/V1.5-20261027/**`

## 依赖与阻塞
- Depends on：无
- Blocks：无
- 阻塞条件：若发现除这 2 处外还有其它硬编码色值 → 一并登记，不得遗漏；若发现某处无正当理由 → 标 `FAIL` 并转 V1.6 开卡修

## 建议执行档位
`sonnect`　理由：枚举登记 + 理由撰写，规则明确但须写清技术依据。

## 升级条件
若判定某处"应改而非应登记"→ 升级 `opus`，由主控裁定（涉及 REQ-F-014 冻结面）。

## 预估规模
小（约 40 分钟）
