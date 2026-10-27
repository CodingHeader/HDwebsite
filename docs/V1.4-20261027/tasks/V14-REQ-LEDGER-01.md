# TASK V14-REQ-LEDGER-01：102 条需求验收逐条判定

## 归属
- 所属切片：S5
- 来源需求：全部 19 个需求文档（`features/` 15 篇 + `non-functional/` 4 篇）
- 来源方案：V1.4 `01-需求基线复核.md` §5 I4

## 目标
把 16 个需求文档中 **102 条 `- [ ]`** 逐条判定为 `PASS` / `UNKNOWN` / `N-A`，每条附证据路径，产出唯一需求台账，使"还剩什么没做"可从文档直接回答。

## 输入
- 文档：`docs/design/02_requirements/features/*.md`（15）、`non-functional/*.md`（4）
- 契约：无
- 前置任务：**V14-UI-HUB-01、V14-UI-CONSIST-01、V14-A11Y-01、V14-VIS-STAB-01、V14-PERF-01、V14-FROZEN-GUARD-01 全部完成**
- 前置状态：上述卡证据齐备

## 未勾选分布（本轮实测，合计 102）

| 文件 | 条数 | 文件 | 条数 |
|---|---|---|---|
| REQ-F-001 | 5 | REQ-F-010 | 6 |
| REQ-F-002 | 7 | REQ-F-011 | 9 |
| REQ-F-003 | 6 | REQ-F-012 | 4 |
| REQ-F-004 | 5 | REQ-F-013 | 4 |
| REQ-F-005 | 7 | REQ-F-014 | 4 |
| REQ-F-006 | 5 | REQ-F-015 | 6 |
| REQ-F-007 | 6 | REQ-NF-001 | 4 |
| REQ-F-008 | 5 | REQ-NF-002 | 5 |
| REQ-F-009 | 6 | REQ-NF-003 | 4 |
| | | REQ-NF-004 | 4 |

## 输出
- 新增：`docs/design/06_validation/evidence/V14/REQ-LEDGER-01/requirements-ledger.md`
- 修改：各需求文档的 checkbox（**仅 PASS 项**）+ 行尾证据路径

## 判定规则（严格，不得放宽）

| 判定 | 条件 | 文档动作 |
|---|---|---|
| `PASS` | 有代码 **且** 有可复现命令/测试证据 | 勾选 `- [x]` + 行尾追加 `（证据：<路径>）` |
| `UNKNOWN` | 有实现但环境限制无法验证（须写原因） | **保持未勾选**，ledger 标注原因 |
| `N-A` | 需求已被 ADR 替代或明确不做（须写 ADR 号） | 保持未勾选，ledger 标注依据 |

## Execution Steps
1. [ ] 建 ledger 表头：`需求ID | 条目原文 | 判定 | 证据路径 | 备注`
2. [ ] 按 `REQ-F-001` → `REQ-NF-004` 顺序逐条判定（**不要跳读**）
3. [ ] 只对 `PASS` 勾选；**不得**改动需求正文措辞/优先级/`status` 字段
4. [ ] 计数对齐：`PASS + UNKNOWN + N-A == 102`（**必须相等**，否则有漏项）
5. [ ] 未实现项（若有）→ 开新卡或写入 `backlog.md`
6. [ ] 证据：ledger + 勾选后的 `git diff --stat`

## 验收标准
- [ ] 102 条**逐条**有判定，无遗漏（可自动化：计数对齐）
- [ ] 每条 `PASS` 附证据路径（可自动化：抽查 10 条，均有"（证据："）
- [ ] `UNKNOWN` 全部有原因，且**未被勾选**（可自动化：交叉核对）
- [ ] `N-A` 全部有 ADR 依据（人工判断）
- [ ] 未改需求原文措辞（可自动化：`git diff` 只含 `- [ ]`→`- [x]` 与行尾追加）

## 验证命令
```bash
# 判定前后计数
grep -rc "^- \[ \]" docs/design/02_requirements/features/*.md docs/design/02_requirements/non-functional/*.md | awk -F: '{s+=$2} END {print "未勾选:",s}'
# 剩余未勾选数 应 == UNKNOWN + N-A 数
grep -c "UNKNOWN\|N-A" docs/design/06_validation/evidence/V14/REQ-LEDGER-01/requirements-ledger.md
# 确认未改正文
git diff --stat docs/design/02_requirements/
```

## 证据路径
`docs/design/06_validation/evidence/V14/REQ-LEDGER-01/`

## 允许修改
- `docs/design/02_requirements/features/*.md`（**仅 checkbox 与行尾证据路径**）
- `docs/design/02_requirements/non-functional/*.md`（同上）
- `docs/design/02_requirements/backlog.md`（追加未实现项）
- `docs/design/06_validation/evidence/V14/REQ-LEDGER-01/**`

## 禁止修改
- `src/**`、`prisma/**`、`package.json`、任何测试
- 需求正文措辞、`priority`、`status` 字段

## 依赖与阻塞
- Depends on：V14-UI-HUB-01、V14-UI-CONSIST-01、V14-A11Y-01、V14-VIS-STAB-01、V14-PERF-01、V14-FROZEN-GUARD-01
- Blocks：V14-REL-01
- 阻塞条件：若某卡未完成导致证据缺失 → 该条判 `UNKNOWN` 并注明"待 <卡号>"，**不阻塞整卡**

## 建议执行档位
`sonnect`　理由：规则明确但量大（102 条），需要耐心与一致性。

## 升级条件
连续 2 次 FAIL → 熔断，只交 ledger 不改需求文档（ledger 本身即有验收价值）。

## 预估规模
**大**　（8 小时以上；这是本轮工作量最大的卡）
