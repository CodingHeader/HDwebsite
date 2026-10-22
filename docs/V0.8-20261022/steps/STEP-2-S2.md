# STEP-2 S2 测试与守卫补洞

## 进入条件
- 所含卡的依赖均为 done（见 state.json）

## 卡与执行者
- [V8-T-01](../tasks/V8-T-01.md) 撤除 3 条过期 e2e skip（C-06/B-06 已关闭） — P2/sonnect
- [V8-T-02](../tasks/V8-T-02.md) /chat/stream SSE 契约测试（清零最后 1 条契约 skip） — P2/opus
- [V8-T-03](../tasks/V8-T-03.md) lint warning 清零并设 --max-warnings 0 — P3/haiku
- [V8-T-04](../tasks/V8-T-04.md) 非 withApi 路由 5 条核查：迁移或登记豁免 — P1/opus

## 退出条件
- 本步骤所有卡 status ∈ {done, blocked(外部条件)}；done 的卡均有 execution.md
- 全量门禁绿

## 不阻塞说明
- 本步骤中任何一张卡 blocked，都不影响其他步骤中依赖已满足的卡（按 04 协议取下一张）
