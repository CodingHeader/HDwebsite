---
card: V14-REQ-LEDGER-01
title: 102 条需求验收台账
date: 2026-10-27
executor: external-assistant
status: PASS
---
# V14-REQ-LEDGER-01 执行证据
## 5W1H 简版
- **What**：把 `docs/design/02_requirements/features/*.md`（15 篇）+ `non-functional/*.md`（4 篇）共 **102** 条 `- [ ]` 逐条判定为 PASS / UNKNOWN / N-A，并附证据路径。
- **Why**：V1.4 收口前需一份可复现的需求验收台账，区分“已实现且有测试证据”与“环境受限/需真实凭证”。
- **Where**：需求文件（仅 checkbox + 行尾证据）、`requirements-ledger.md`、本证据。
- **Who**：external-assistant。
- **How**：按文件顺序逐条判定；PASS 勾选并追加 `（证据：<路径>）`，UNKNOWN/N-A 保持未勾选并在台账备注原因。
- **What if**：计数铁律 `PASS + UNKNOWN + N-A == 102`；未实现项入 backlog。
## 计数
| 判定 | 数量 |
|---|---:|
| PASS | 90 |
| UNKNOWN | 12 |
| N-A | 0 |
| 合计 | 102 |
## UNKNOWN 12 条及原因
- REQ-F-002：首个真实源端到端（需运营录入真实采集源）。
- REQ-F-005：草稿可见 / 外链图片上传微信域 / 端到端真实发布（需真实微信凭证）。
- REQ-F-009：长答案客服消息接口补发（需真实微信凭证）。
- REQ-F-011：SMTP 连接测试通过（需真实 SMTP 凭证）。
- REQ-F-013：独立验证者抽查 ≥10 行（未执行）。
- REQ-F-015：独立验证者逐页人工核对（未执行）。
- REQ-NF-001：Lighthouse 移动端（需 Linux CI + 依赖变更 CCR）。
- REQ-NF-004：30 分钟恢复 / 备份恢复演练 / 灰度切换（需部署环境演练）。
## 验证
- 判定前未勾选：102；判定后未勾选：12（= UNKNOWN + N-A）。
- `git diff --stat docs/design/02_requirements/`：19 文件，90 处 checkbox + 行尾证据变更，未改正文措辞。
- `requirements-ledger.md`：102 行，无空单元格。
## 未实现项
- 无新增未实现项（全部 90 条 PASS 均有代码与测试证据；12 条 UNKNOWN 为环境/凭证/独立验证限制，非代码缺失）。因此 `backlog.md` 无新增。