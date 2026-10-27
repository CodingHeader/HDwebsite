# STEP-S7：冻结面自动守卫

## 目标
把"冻结面只读"从口头纪律变成 CI 硬门禁。

## 卡
- `V14-FROZEN-GUARD-01`（P1，`sonnect`，小～中）
- **串行在 `V14-A11Y-01` 之后**（同改 `ci.yml`）

## 为什么需要（证据）
- `AGENTS.md §4` 声明冻结，但**当前无任何自动化检查**
- 历史教训：`827646b` 是跨所有权大提交进 `upgrade`，之后才补规则 → 靠人自觉已被证明不够

## 冻结路径清单
```
src/contracts/**
prisma/schema.prisma
prisma/migrations/**
package.json
package-lock.json / pnpm-lock.yaml / yarn.lock
vitest.config.ts
playwright.config.ts
```

## 执行步骤
1. 确定基线：`3e6a6b5` 或 `.frozen-baseline`（存 hash）
2. 实现 `scripts/check-frozen.mjs`：
   - `git diff --name-only <baseline> -- <冻结路径>`
   - 有变更 → 打印清单 + 提示"需 CCR" → `exit 1`
   - **CCR 豁免**：commit message 含 `feat(CCR-` / `chore(CCR-` 则放行
   - 基线缺失（浅克隆）→ 打印 SKIP + `exit 0`（不因环境误红）
3. `ci.yml` 在 `Asset / root guards` 附近追加 `node scripts/check-frozen.mjs`
4. **负向验证**：临时改 `src/contracts/common.ts` → `exit 1`；还原 → `exit 0`
5. **正向验证**：无改动 → `exit 0`
6. 证据记两次输出

## 完成判据
- [ ] 正向 `exit 0`
- [ ] 负向（contracts）`exit 1` 且打印文件
- [ ] 负向（schema.prisma）`exit 1`
- [ ] CCR 前缀可豁免
- [ ] CI 已含该步骤
- [ ] 浅克隆不误红
- [ ] `git status` 干净（负向验证后已还原）

## 验证命令
```bash
node scripts/check-frozen.mjs; echo "expect 0"
echo "// tmp" >> src/contracts/common.ts && node scripts/check-frozen.mjs; echo "expect 1"
git checkout -- src/contracts/common.ts
git status --short
grep -n "check-frozen" .github/workflows/ci.yml
```

## 关键约束
- **不得为加 script 改 `package.json`**（CI 里写 `node scripts/...` 即可）
- 负向验证的临时改动**必须还原**

## 证据落点
`evidence/V14/FROZEN-GUARD-01/execution.md`
