# STEP-S5：需求台账可回答"还剩什么没做"

## 目标
16 个需求文档中 102 条 `- [ ]` 逐条判定为 PASS / UNKNOWN / N-A，产出唯一台账。

## 卡
- `V14-REQ-LEDGER-01`（P2，`sonnect`，**大**）
- **必须最后做**（需引用其它全部卡证据）

## 102 条分布（实测）

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

## 判定规则（严格）

| 判定 | 条件 | 文档动作 |
|---|---|---|
| `PASS` | 有代码 **且** 有可复现证据 | 勾选 `- [x]` + 行尾追加 `（证据：<路径>）` |
| `UNKNOWN` | 有实现但环境限制（须写原因） | **保持未勾选** |
| `N-A` | 已被 ADR 替代或明确不做（须写 ADR 号） | 保持未勾选 |

## 执行步骤
1. 建 ledger 表头：`需求ID | 条目原文 | 判定 | 证据路径 | 备注`
2. 按 REQ-F-001 → REQ-NF-004 顺序逐条判定（不跳读）
3. 仅对 PASS 勾选；**不改正文措辞/priority/status**
4. 计数对齐 `PASS + UNKNOWN + N-A == 102`
5. 未实现项 → 开卡或入 `backlog.md`
6. 证据：ledger + `git diff --stat`

## 完成判据
- [ ] 102 条逐条有判定
- [ ] 每条 PASS 附证据路径（抽查 10 条）
- [ ] UNKNOWN 全部有原因且未勾选
- [ ] N-A 全部有 ADR 依据
- [ ] 计数对齐 102
- [ ] 未改需求原文措辞

## 验证命令
```bash
grep -rc "^- \[ \]" docs/design/02_requirements/features/*.md docs/design/02_requirements/non-functional/*.md | awk -F: '{s+=$2} END {print "未勾选:",s}'
git diff --stat docs/design/02_requirements/
```

## 证据落点
`evidence/V14/REQ-LEDGER-01/requirements-ledger.md`
