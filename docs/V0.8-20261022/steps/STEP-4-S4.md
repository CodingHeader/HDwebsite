# STEP-4 S4 后台性能

## 进入条件
- 所含卡的依赖均为 done（见 state.json）

## 卡与执行者
- [V8-PERF-01](../tasks/V8-PERF-01.md) /manager 共享 chunk 再减（目标口径按 V8-Q3） — P1/opus

## 退出条件
- 本步骤所有卡 status ∈ {done, blocked(外部条件)}；done 的卡均有 execution.md
- 全量门禁绿

## 不阻塞说明
- 本步骤中任何一张卡 blocked，都不影响其他步骤中依赖已满足的卡（按 04 协议取下一张）
