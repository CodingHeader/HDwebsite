# V12-E2E-03 执行证据：全量 e2e 复跑与 CI 归零

> 执行时间：2026-10-26（Linux 容器）
> 执行者：main-agent
> 基线：upgrade@663d8d4（V12-E2E-01 + E2E-02 后）

## 5W1H 简版

- **What**：E2E-01/02 合并后全量 e2e 79/79 本地绿，推送后 CI Linux E2E job PASS。
- **Why**：V1.2 门禁归零（CI run 40281405584 gate FAIL：E2E Linux）。
- **Where/When**：npm run test:e2e（79 例）；推送 upgrade 后等 CI run conclusion。
- **Who**：main-agent 执行；独立验证者后续出 verify.md。
- **How**：全量复跑 → 推送 → 等 CI conclusion。

## 全量 e2e 复跑（2026-10-26 18:30）

**79 passed / 0 failed（3.8m）**，与基线 77/2 对比：

| 指标 | G-01 基线 | E2E-03 复跑 | 变化 |
|---|---|---|---|
| 通过 | 77 | **79** | +2 |
| 失败 | 2（apply-chat + mobile-375） | **0** | -2 |

关键用例：
- apply-chat.spec.ts:15 访客在 /apply 发送消息收到 AI 流式回复 → **PASS**（E2E-01 修复）
- mobile-375.spec.ts:27 内容中枢移动端卡片渲染 → **PASS**（E2E-02 修复）
- mobile-375.spec.ts:46 招生批次移动端卡片可渲染 → **PASS**（E2E-02 修复）

## 推送与 CI

- 本地提交已推送：663d8d4 → e3decfc（E2E-03 证据 + state 心跳）。
- CI run 40303786917（head e3decfc）：
  - **gate job：PASS**（conclusion=success，含 E2E Linux 79/79）
  - visual job：FAILURE（30/46，V12-VIS-01 分诊处理中）
  - docker job：PASS
- **E2E-03 验收：本地 79/79 PASS + CI gate job PASS = 完成**。
- visual job 失败属 V12-VIS-01 范围（独立分诊），不影响 E2E-03 结论。

## 验收条目

- [x] 本地全量 e2e 79/79 ALL PASS
- [x] 推送后 CI gate job（含 E2E Linux）PASS（run conclusion 记录入证据）
- [x] CI run 结论（run 40303786917 gate job PASS）

## 改动文件

- docs/design/06_validation/evidence/V12/E2E-03/execution.md
- docs/V1.2-20261026/state.json（E2E-03 done）
- docs/V1.2-20261026/EXEC-log.md（心跳）

## 后续

- V12-VIS-01：visual 36/46 分诊
- V12-REL-01：台账收口
