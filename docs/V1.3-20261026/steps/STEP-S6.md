# STEP-S6：收口

## 目标
把 V1.2 遗留与 V1.3 全部卡一次性收口，保证台账 / changelog / parity / 双端四者一致。

## 卡
- `V13-REL-01`（P1，低档，小）

## 执行步骤
1. 逐卡核对 `state.json`：`status` / `commits` / `verify` / `note` 四字段齐全
2. V1.2 三卡状态迁移（标 `superseded` 并指向承接卡）：
   - `V12-VIS-01` → `V13-VIS-01`
   - `V12-REL-01` → `V13-REL-01`
   - `V12-Q2-01` → `V13-Q2-01`
3. changelog 追加 V1.3 段（缺口台账、修复项、门禁变化、UNKNOWN 项）
4. parity 矩阵复核（预期：无功能增减，仅 vitals 变化）
5. 双端核对 `git rev-list --left-right --count` → `0 0`
6. EXEC-log 写终稿

## 完成判据
- [ ] 无 `ready` / `in_progress` 残留（除 blocked 且有原因）
- [ ] V1.2 三卡已标 `superseded`
- [ ] changelog 有 V1.3 段
- [ ] 双端 `0 0`
- [ ] 每个 UNKNOWN 有原因

## 验证命令
```bash
python -c "import json;d=json.load(open('docs/V1.3-20261026/state.json'));print({k:v['status'] for k,v in d.items()})"
git rev-list --left-right --count origin/upgrade...HEAD
```

## 证据落点
`evidence/V13/REL-01/execution.md`
