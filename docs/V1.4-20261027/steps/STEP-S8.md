# STEP-S8：收口

## 目标
V1.3 遗留 6 卡 + V1.4 全部卡一次性收口，台账/changelog/parity/双端四者一致。

## 卡
- `V14-REL-01`（P1，`haiku`，小）

## V1.3 遗留（实测仍为 ready，需标 superseded）

| V1.3 卡 | 承接 |
|---|---|
| `V13-GATE-A11Y-01` | → `V14-A11Y-01` |
| `V13-UI-HUB-01` | → `V14-UI-HUB-01` |
| `V13-UI-CONSIST-01` | → `V14-UI-CONSIST-01` |
| `V13-PERF-01` | → `V14-PERF-01` |
| `V13-REQ-01` | → `V14-REQ-LEDGER-01` |
| `V13-REL-01` | → `V14-REL-01` |

## 执行步骤
1. 逐卡核对 `V14 state.json` 四字段齐全（status/commits/verify/note）
2. V1.3 遗留 6 卡标 `superseded` 并指向承接卡
3. changelog 追加 V1.4 段：门禁变化（a11y 进 CI、冻结面守卫进 CI）、修复项（UI-HUB 控件、visual 稳定性结论）、UNKNOWN 项
4. parity 矩阵复核（预期无状态变化）
5. `git rev-list --left-right --count origin/upgrade...HEAD` → `0 0`
6. 证据：state 终态 + changelog diff + 双端计数

## 完成判据
- [ ] 所有卡有终态，无 ready/in_progress 残留
- [ ] V1.3 遗留 6 卡已标 superseded
- [ ] changelog 含 V1.4 段
- [ ] 双端 `0 0`
- [ ] 每个 UNKNOWN 有原因

## 验证命令
```bash
python -c "import json;d=json.load(open('docs/V1.4-20261027/state.json'));print({k:v['status'] for k,v in d.items()})"
python -c "import json;d=json.load(open('docs/V1.3-20261026/state.json'));print([k for k,v in d.items() if v['status']=='superseded'])"
grep -n "V1.4" docs/design/07_release/changelog.md | head -3
git rev-list --left-right --count origin/upgrade...HEAD
```

## 证据落点
`evidence/V14/REL-01/execution.md`
