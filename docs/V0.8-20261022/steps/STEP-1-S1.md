# STEP-1 S1 安全依赖收口（K10）

## 进入条件
- 所含卡的依赖均为 done（见 state.json）

## 卡与执行者
- [V8-SEC-01](../tasks/V8-SEC-01.md) K10-A：next 16.2.1→16.4.2（含 eslint-config-next 同步） — Hark/opus
- [V8-SEC-02](../tasks/V8-SEC-02.md) K10-A：sharp 0.34→0.35.5 + 运行时依赖其余 high 收口 — P1/sonnect
- [V8-SEC-03](../tasks/V8-SEC-03.md) K10-A：vitest 3→5（含 tinypool）开发依赖升级 — P2/opus
- [V8-SEC-04](../tasks/V8-SEC-04.md) CI 安全审计门禁（官方源，防镜像假阴性） — P3/sonnect

## 退出条件
- 本步骤所有卡 status ∈ {done, blocked(外部条件)}；done 的卡均有 execution.md
- 全量门禁绿

## 不阻塞说明
- 本步骤中任何一张卡 blocked，都不影响其他步骤中依赖已满足的卡（按 04 协议取下一张）
