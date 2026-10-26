# STEP S0

## V12-G-01 门禁基线与现状盘点（P2，小）
目标：在 a04530c 上固化 V1.2 起点基线五连（lint/typecheck/test/build/check-root），盘点 e2e 79 例与 visual 46 例现状
步骤：本地跑 lint/typecheck/test/build/check-root 五连并记录数值；…（详见 tasks/V12-G-01.md）
验收：五连全绿（lint 0 / tsc / 单测不降 / build / check-root）