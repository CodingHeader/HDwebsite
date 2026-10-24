# STEP S12（终审发布）

## V11-V-01 V1.1 全卡独立验收（subagent-verifier，中）
目标：每张已执行卡有 verify.md（PASS/FAIL/UNKNOWN + 命令输出），独立子代理出具
步骤：逐卡 git show + 重跑验收命令（CI 类以 run 结论为准）；结论一词 + 证据路径；FAIL 入返工清单
验收：verify.md 数 = 已执行卡数；0 FAIL 遗留（或全部转 blocked 有因）

## V11-REL-01 V1.1 终审交付（main-agent，小）
目标：changelog V1.1 段、parity 复核、zip、双端 0 0
步骤：汇总 verify；FAIL 清零方可收口；changelog 补 V1.1 段；parity 复核（新卡功能并入 F 节口径）；zip（docs/V1.1 + evidence/V11）+ SHA256；git fetch + rev-list 0 0
验收：双端 0 0；changelog/parity 有 V1.1 记录；zip SHA256 入证据
