# TASK V15-CLOSE-01：V1.5 收口

## 归属
- 所属切片：S3
- 来源需求：`AGENTS.md §6` 完成定义、§8 提交与证据
- 来源方案：`docs/V1.6-20261027/03-执行单元分解.md` L1-4

## 目标
7 卡全部 done，补 changelog V1.5 段，跑本轮唯一一次全量门禁，推送并校验双端 0 0。

## 输入
- 文档：`docs/V1.6-20261027/{03,05}.md`
- 契约：无
- 前置任务：V15-UX-STATES-01、V15-KEYBOARD-01、V15-MOBILE-375-01 全部 done
- 前置状态：三卡证据齐备

## 输出
- 修改：`docs/V1.5-20261027/state.json`（终态）
- 修改：`docs/design/07_release/changelog.md`（V1.5 段）
- 修改：`docs/design/02_requirements/parity-matrix.md`（复核）
- 修改：`docs/V1.4-20261027/state.json`（仅 2 条流程类 UNKNOWN 依据）
- 新增：`docs/design/06_validation/evidence/V15/CLOSE-01/execution.md`

## Execution Steps
1. [ ] 逐卡核对 `state.json` 四字段（status/commits/verify/note）
2. [ ] 三卡改 done + 回填 commits
3. [ ] 回填 V1.4 两条 UNKNOWN 依据（"独立验证者抽查未执行"→ 已由 V15 执行，引用 evidence 路径）
4. [ ] **全量门禁串行**（唯一一次）：
   ```bash
   npm run lint && npm run typecheck && npm test && npm run build
   npm run check:assets && npm run check:root && npm run check:audit
   node scripts/check-frozen.mjs
   ```
5. [ ] 记录 BUILD_ID vs src mtime（fresh/stale）
6. [ ] 写 changelog V1.5 段（五类：门禁变化/feat/fix/test/UNKNOWN）
7. [ ] **如实写 FAIL 数**，不抹平
8. [ ] parity 复核（预期无变化）
9. [ ] 推送 + `git rev-list --left-right --count` → 0 0
10. [ ] 写 execution.md

## 验收标准
- [ ] 7 卡全 done（可自动化）
- [ ] 8 项门禁串行全 exit 0（附当次输出）
- [ ] changelog V1.5 段五类齐全，含真实 FAIL 数（可自动化：grep）
- [ ] 双端 0 0（可自动化）
- [ ] V1.4 两条 UNKNOWN 已引用 V15 证据且路径存在（可自动化）
- [ ] 未改 `src/**`（可自动化）
- [ ] e2e 若本机不可跑，记 `UNKNOWN(需 Linux CI)` 而非假装通过（人工判断）

## 验证命令
```bash
cd /e/Code/Demo/HDwebsite/hdwebsite_1011
node -e "const d=require('./docs/V1.5-20261027/state.json');
const bad=Object.entries(d).filter(([k,v])=>v.status!=='done');
console.log(bad.length?('未完成:'+bad.map(x=>x[0])):'7卡全done')"
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
- `docs/V1.4-20261027/state.json`（仅 UNKNOWN 字段）
- `docs/design/06_validation/evidence/V15/CLOSE-01/**`

## 禁止修改
- `src/**`、`tests/**`、`scripts/**`、`prisma/**`、`package.json`
- 需求文档正文（checkbox）
- `docs/V1.6-20261027/**`

## 依赖与阻塞
- Depends on：三张验收卡 + 已完成三卡
- Blocks：无（终点）
- 阻塞条件：若有卡 blocked → 收口时保留其状态并写明原因，不阻塞本卡

## 建议执行档位
`haiku`　理由：台账 + changelog + 门禁执行，无判断。

## 升级条件
门禁失败且 30 分钟内无法定位 → 升级 `opus` 判断是否既有噪音。

## 预估规模
小（约 1 小时，含门禁 ~8 分钟）