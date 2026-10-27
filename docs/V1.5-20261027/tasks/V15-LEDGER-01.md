# TASK V15-LEDGER-01：V1.4 台账回填

## 归属
- 所属切片：S0
- 来源需求：`AGENTS.md §6` 完成定义（Done ≠ 代码写完，须台账一致）
- 来源方案：`docs/V1.5-20261027/00-规划快照与事实基线.md` §F4

## 目标
把 `docs/V1.4-20261027/state.json` 中 5 张实际已完成但标 `ready` 的卡改为 `done`，并回填 `commits` / `verify` / `note`，使台账与 `git log` 一致。

## 输入
- 文档：`docs/V1.5-20261027/00-规划快照与事实基线.md`（§F4 列出 5 卡与实际提交的对应）
- 契约：无
- 前置任务：无
- 前置状态：`upgrade@d25e0eb`，双端 0 0

## 输出
- 修改：`docs/V1.4-20261027/state.json`

## Execution Steps
1. [ ] `git log --oneline --grep="V14-<卡号>"` 逐卡取实际提交 hash，记录：
   - V14-FROZEN-GUARD-01 → `7d29740`、`ee57569`
   - V14-UI-CONSIST-01 → `026c398`
   - V14-PERF-01 → `0ed1264`
   - V14-REQ-LEDGER-01 → `afc2089`
   - V14-REL-01 → `d25e0eb`
2. [ ] 逐卡核对证据文件存在：
   - `docs/design/06_validation/evidence/V14/FROZEN-GUARD-01/execution.md`
   - `docs/design/06_validation/evidence/V14/UI-CONSIST-01/{audit-matrix.md,execution.md}`
   - `docs/design/06_validation/evidence/V14/PERF-01/perf-baseline.md`
   - `docs/design/06_validation/evidence/V14/REQ-LEDGER-01/{requirements-ledger.md,execution.md}`
   - `docs/design/06_validation/evidence/V14/REL-01/execution.md`
3. [ ] 改 `status: ready → done`，填 `commits` 数组、`verify`（一句可复现的判定）、`note`（含关键结论与 UNKNOWN）
4. [ ] **不改** 已 done 的 4 卡（BASE-01/UI-HUB-01/A11Y-01/VIS-STAB-01）
5. [ ] **不改** 任何其他字段语义（depends_on / owner / tier / size 保持原样）

## 验收标准
- [ ] 9 卡 `status` 全为 `done`（可自动化：`node -e` 打印）
- [ ] 9 卡 `commits` 均非空且每个 hash 能在 `git log` 中找到（可自动化：逐 hash `git cat-file -e`）
- [ ] 每个 `done` 卡对应证据目录存在非空 md（可自动化）
- [ ] JSON 可被 `JSON.parse` 解析（可自动化）
- [ ] 未修改 `depends_on` / `owner` / `tier` / `size`（可自动化：`git diff` 逐字段检查）

## 验证命令
```bash
cd /e/Code/Demo/HDwebsite/hdwebsite_1011
node -e "const d=require('./docs/V1.4-20261027/state.json');
for(const[k,v] of Object.entries(d)) console.log(k, v.status, (v.commits||[]).length);
"
# 期望 9 行全 done，commits 均 >=1
for c in 7d29740 ee57569 026c398 0ed1264 afc2089 d25e0eb 9cab673 f9854f7 49aaf04 48eb0b2 675c6a3 2348f3a 8c71228 69505ed; do
  git cat-file -e "$c^{commit}" && echo "$c OK" || echo "$c MISSING"
done
git diff --stat docs/V1.4-20261027/state.json
```

## 证据路径
`docs/design/06_validation/evidence/V15/LEDGER-01/execution.md`

## 允许修改
- `docs/V1.4-20261027/state.json`
- `docs/design/06_validation/evidence/V15/LEDGER-01/**`

## 禁止修改
- `docs/V1.5-20261027/**`（本轮规划包，只读）
- `src/**`、`tests/**`、`scripts/**`、`prisma/**`、`package.json`
- 任何需求文档正文

## 依赖与阻塞
- Depends on：无
- Blocks：无直接下游，但作为第一刀必须先做（它是取卡循环的输入）
- 阻塞条件：若某卡找不到对应提交或证据 → 该卡保持 `ready` 并在 evidence 中写明缺失项，不得凭空填 hash

## 建议执行档位
`haiku`　理由：纯 JSON 转录，规则明确，无判断。

## 升级条件
若发现某卡的证据与提交不匹配（如提交存在但证据目录为空）→ 升级 `sonnect`，逐卡核查实际完成度。

## 预估规模
小（约 10 分钟）
