# STEP S0（门禁与基线）

## V11-G-01 门禁基线与快照复测（P2，小）
目标：在 0728c46 上固化 V1.1 起点门禁基线（本地全绿），登记沙箱与本机环境差异
步骤：本地跑 lint/typecheck/test/check-assets/build/check-root 五连并记录；复核沙箱三项声明：crud.ts F-01 在树（已核实 crud.ts:74-96）、zz-dbg 已删、check-root 51 条 PASS；记录 build 的 no such table 只出现在未 migrate 沙箱（本机 dev.db 已迁移，build 绿），写入证据
验收：五连全绿（lint 0 warning / tsc / 1712 / build / check-root）；三项声明在证据中有本机复核结论；基线数值表入 evidence
