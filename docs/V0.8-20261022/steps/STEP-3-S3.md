# STEP-3 S3 Linux 视觉回归闭环

## 进入条件
- 所含卡的依赖均为 done（见 state.json）

## 卡与执行者
- [V8-VIS-01](../tasks/V8-VIS-01.md) 与 main 等量的确定性 seed 数据集 — P1/sonnect
- [V8-VIS-02](../tasks/V8-VIS-02.md) Linux CI visual 作业（官方 playwright 镜像） — P3/sonnect
- [V8-VIS-03](../tasks/V8-VIS-03.md) visual 差异分诊与前台修复（红色横幅风格一致） — Hark/opus

## 退出条件
- 本步骤所有卡 status ∈ {done, blocked(外部条件)}；done 的卡均有 execution.md
- 全量门禁绿

## 不阻塞说明
- 本步骤中任何一张卡 blocked，都不影响其他步骤中依赖已满足的卡（按 04 协议取下一张）
