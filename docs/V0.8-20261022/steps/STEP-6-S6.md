# STEP-6 S6 外部联调就绪与部署验证

## 进入条件
- 所含卡的依赖均为 done（见 state.json）

## 卡与执行者
- [V8-INT-01](../tasks/V8-INT-01.md) 微信/SMTP/Coze 凭证到位即测：冒烟脚本与操作手册 — P1/sonnect
- [V8-REL-01](../tasks/V8-REL-01.md) Docker 镜像 Linux 构建与冒烟（验证 D-08 声明） — P3/sonnect

## 退出条件
- 本步骤所有卡 status ∈ {done, blocked(外部条件)}；done 的卡均有 execution.md
- 全量门禁绿

## 不阻塞说明
- 本步骤中任何一张卡 blocked，都不影响其他步骤中依赖已满足的卡（按 04 协议取下一张）
