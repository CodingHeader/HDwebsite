# STEP-S0：台账归位

## 目标
把 V1.4 的 5 张"实际已完成但标 ready"的卡改为 done，使台账与实际一致。

## 卡
- `V15-LEDGER-01`（外部助手，`haiku`，小）

## 为什么必须第一刀

| 理由 | 证据 |
|---|---|
| 台账是取卡循环的输入 | `09-执行协议 §二` 第 2 步"读 state.json 取 ready 卡" |
| 现状会误导执行 | `state.json` 5 卡写 ready，实际均有提交（`00 §F4` 逐卡列出） |
| 不改则后续全带偏 | 执行者会以为还有 5 卡要做，重复劳动 |

## 5 卡与实际提交的对应（已实测，直接用）

| 卡 | 提交 |
|---|---|
| V14-FROZEN-GUARD-01 | `7d29740`、`ee57569` |
| V14-UI-CONSIST-01 | `026c398` |
| V14-PERF-01 | `0ed1264` |
| V14-REQ-LEDGER-01 | `afc2089` |
| V14-REL-01 | `d25e0eb` |

## 执行顺序
1. 逐卡 `git log --oneline --grep="V14-<卡号>"` 复核 hash
2. 逐卡确认证据目录存在且非空
3. 改 status/commits/verify/note
4. `node -e` 校验 JSON 合法 + 9 卡全 done
5. 写 evidence
6. commit + push（`docs(V15-LEDGER-01): ...`）

## 完成判据
- [ ] 9 卡全 `done`
- [ ] 每个 `commits` 里的 hash 都能 `git cat-file -e` 通过
- [ ] 未改 `depends_on`/`owner`/`tier`/`size`

## 常见坑
| 坑 | 防守 |
|---|---|
| 把 `commits` 填成空数组 → JSON 合法但验收不过 | 验收要求逐 hash 校验 |
| 顺手改了别的字段 | `git diff` 逐字段检查，只允许 status/commits/verify/note 变 |
