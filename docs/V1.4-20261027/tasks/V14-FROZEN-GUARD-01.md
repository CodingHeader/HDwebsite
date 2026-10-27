# TASK V14-FROZEN-GUARD-01：冻结面自动守卫

## 归属
- 所属切片：S7
- 来源需求：`AGENTS.md` §4「冻结面」（contracts / schema / 迁移 / 依赖 / 测试配置只读）
- 来源方案：V1.4 `01-需求基线复核.md` §5 I7

## 目标
把"冻结面只读"从**口头纪律**变成 **CI 硬门禁**：任何人误改 `src/contracts/**`、`prisma/schema.prisma`、`prisma/migrations/**`、`package.json` 或锁文件，CI 立即失败。

## 输入
- 文档：`AGENTS.md` §4、§5；`docs/V1.4-20261027/02-契约冻结包.md`
- 契约：无（守卫本身不改契约）
- 前置任务：V14-A11Y-01（同改 `ci.yml`，必须串行）
- 前置状态：`ci.yml` 已有 a11y 步骤

## 输出
- 新增：`scripts/check-frozen.mjs`
- 修改：`.github/workflows/ci.yml`（新增调用步骤）
- 证据：`docs/design/06_validation/evidence/V14/FROZEN-GUARD-01/execution.md`

## 为什么需要它（证据）
- `AGENTS.md` §4 声明冻结，但**当前无任何自动化检查**（实测 `grep -rn "frozen" scripts/ .github/` 无守卫实现）。
- 历史教训：`827646b` 是一次跨所有权大提交进入 `upgrade`，其后才补规则——**靠人自觉已被证明不够**。

## Execution Steps
1. [ ] 确定比对基线：以 `docs/V1.4-20261027/00-规划快照与事实基线.md` 记录的 commit（`3e6a6b5`）为冻结基线，或读 `.frozen-baseline` 文件（若不存在则首次生成并提交）
2. [ ] 实现 `scripts/check-frozen.mjs`：
   - 用 `git diff --name-only <baseline> -- <冻结路径>` 取变更文件
   - 冻结路径清单：`src/contracts/**`、`prisma/schema.prisma`、`prisma/migrations/**`、`package.json`、`package-lock.json`、`pnpm-lock.yaml`、`yarn.lock`、`vitest.config.ts`、`playwright.config.ts`
   - 有变更 → 打印文件清单 + 提示"需 CCR 流程"→ `exit 1`
   - **豁免机制**：若 commit message 含 `feat(CCR-` 或 `chore(CCR-` 则放行（CCR 是唯一合法变更通道）
   - 基线缺失（如 CI 浅克隆）→ 打印 SKIP 并 `exit 0`（不得因环境问题误红）
3. [ ] `.github/workflows/ci.yml` 在 `Asset / root guards` 附近追加步骤：`node scripts/check-frozen.mjs`
4. [ ] **负向验证**（必须有）：临时在 `src/contracts/common.ts` 加一行注释 → 脚本 `exit 1`；还原后 `exit 0`
5. [ ] **正向验证**：不改任何冻结文件时 `exit 0`
6. [ ] 证据记录两次运行输出

## 验收标准
- [ ] 正向：无改动时 `node scripts/check-frozen.mjs` → `exit 0`（可自动化）
- [ ] 负向：改 `src/contracts/**` 任一文件 → `exit 1` 且打印该文件（可自动化，须还原）
- [ ] 负向：改 `prisma/schema.prisma` → `exit 1`（可自动化，须还原）
- [ ] CCR 豁免：commit message 含 `feat(CCR-1):` 时放行（可用本地临时分支验证，不推送）
- [ ] CI 已含该步骤（可自动化：grep）
- [ ] 浅克隆场景不误红（人工判断：读脚本 SKIP 分支）
- [ ] `git status` 干净（负向验证后必须还原）

## 验证命令
```bash
node scripts/check-frozen.mjs; echo "expect 0, got $?"
# 负向（务必还原）
echo "// tmp" >> src/contracts/common.ts && node scripts/check-frozen.mjs; echo "expect 1, got $?"
git checkout -- src/contracts/common.ts
git status --short
grep -n "check-frozen" .github/workflows/ci.yml
```

## 证据路径
`docs/design/06_validation/evidence/V14/FROZEN-GUARD-01/execution.md`

## 允许修改
- `scripts/check-frozen.mjs`（新增）
- `.github/workflows/ci.yml`
- `.frozen-baseline`（若采用该方案，新增）
- `docs/design/06_validation/evidence/V14/FROZEN-GUARD-01/**`

## 禁止修改
- `src/**`（除负向验证的临时改动，**必须还原**）
- `prisma/**`
- `package.json`（注意：本卡不得为了加 script 而改它；CI 里写 `node scripts/...` 即可）

## 依赖与阻塞
- Depends on：V14-A11Y-01
- Blocks：无
- 阻塞条件：若 CI 为浅克隆导致拿不到基线 commit → 改用 `.frozen-baseline` 存 hash 方案（脚本内已含 SKIP 兜底）

## 建议执行档位
`sonnect`　理由：规则明确（比对文件清单 + 退出码），但需处理浅克隆/CCR 豁免两个边界。

## 升级条件
连续 2 次 FAIL → 熔断；降级为"只检查 contracts 目录"的最小版本。

## 预估规模
小～中　（2~3 小时）
