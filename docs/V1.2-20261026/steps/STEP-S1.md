# STEP S1

## V12-E2E-01 apply-chat 会话签发竞态修复（main-agent，中）
目标：访客在 /apply 发送消息必收到 AI 流式回复（e2e 单跑稳定绿），消除多签发源竞态导致的 POST 400
步骤：复现：单跑 tests/e2e/apply-chat.spec.ts 记录红（必现）；…（详见 tasks/V12-E2E-01.md）
验收：apply-chat.spec.ts 单跑 PASS（MOCK_REPLY 可见，会话落库）

## V12-E2E-02 mobile-375 空态容忍断言修正（P2，小）
目标：375 管理端用例在空库/有数据两种状态下都稳定（删除 isVisible 即时快照竞态）
步骤：复现：单跑 tests/e2e/mobile-375.spec.ts 记录红（内容中枢/招生批次空态）；…（详见 tasks/V12-E2E-02.md）
验收：mobile-375.spec.ts 单跑 4/4 ALL PASS（隔离环境）

## V12-E2E-03 全量 e2e 复跑与 CI 归零（P1，中）
目标：E2E-01/02 合并后全量 e2e 79/79 本地绿，推送后 CI Linux E2E job PASS
步骤：git pull --ff-only origin upgrade 确认双端；…（详见 tasks/V12-E2E-03.md）
验收：本地全量 e2e 79/79 ALL PASS