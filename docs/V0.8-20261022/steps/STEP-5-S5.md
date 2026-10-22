# STEP-5 S5 后台体验收尾（UI）

## 进入条件
- 所含卡的依赖均为 done（见 state.json）

## 卡与执行者
- [V8-UI-01](../tasks/V8-UI-01.md) 管理端顶级体验收尾：空/错/无权限态全覆盖 + 视觉一致性 — Hark/opus

## 退出条件
- 本步骤所有卡 status ∈ {done, blocked(外部条件)}；done 的卡均有 execution.md
- 全量门禁绿

## 不阻塞说明
- 本步骤中任何一张卡 blocked，都不影响其他步骤中依赖已满足的卡（按 04 协议取下一张）
