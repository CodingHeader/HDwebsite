# STEP-7 S7 独立验收与发布

## 进入条件
- 所含卡的依赖均为 done（见 state.json）

## 卡与执行者
- [V8-V-01](../tasks/V8-V-01.md) V0.8 全卡独立验收（只看 diff + 运行结果） — P2/opus
- [V8-REL-02](../tasks/V8-REL-02.md) 终审、changelog、双端同步与打包 — Hark/opus

## 退出条件
- 本步骤所有卡 status ∈ {done, blocked(外部条件)}；done 的卡均有 execution.md
- 全量门禁绿

## 不阻塞说明
- 本步骤中任何一张卡 blocked，都不影响其他步骤中依赖已满足的卡（按 04 协议取下一张）
