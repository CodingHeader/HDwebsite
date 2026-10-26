# STEP-S4：需求反勾（102 条逐条判定）

## 目标
把 16 个需求文档里 102 条未勾选验收逐条判定为 `PASS` / `UNKNOWN` / `N-A`，使"还剩什么没做"可从文档直接回答。

## 卡
- `V13-REQ-01`（P2，中档，**大**）

## 未勾选分布（本轮 grep 实测，合计 102）
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
| `PASS` | 有代码 **且** 有可复现命令/测试证据 | 勾选 `- [x]` + 行尾追加 `（证据：<路径>）` |
| `UNKNOWN` | 有实现但环境限制无法验证（须写原因） | **保持未勾选**，ledger 标注 |
| `N-A` | 需求已被 ADR 替代或明确不做（须写 ADR 号） | 保持未勾选，ledger 标注 |

## 执行步骤
1. 建 ledger 表头：`需求ID | 条目原文 | 判定 | 证据路径 | 备注`
2. 按 REQ-F-001 → REQ-NF-004 顺序逐条判定
3. 只对 `PASS` 勾选；**不得**改动需求正文措辞/优先级/状态字段
4. 计数对齐：`PASS + UNKNOWN + N-A == 102`（**必须相等**）
5. 未实现项开新卡或入 backlog

## 完成判据
- [ ] 102 条逐条有判定，无遗漏
- [ ] 每条 PASS 附证据路径
- [ ] UNKNOWN 全部有原因且未勾选
- [ ] N-A 全部有 ADR 依据
- [ ] 计数对齐 102
- [ ] 未改需求原文措辞

## 验证命令
```bash
grep -c "^- \[ \]" docs/design/02_requirements/features/*.md docs/design/02_requirements/non-functional/*.md
# 剩余未勾选数 == ledger 中 UNKNOWN + N-A 数
```

## 证据落点
`evidence/V13/REQ-01/requirements-ledger.md`
