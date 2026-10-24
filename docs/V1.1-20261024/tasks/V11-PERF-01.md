# V11-PERF-01：性能基线修复与测量

## 归属
- 所属切片：S11
- 来源需求/证据：V1.1 审计 §运维.2
- 执行者：P1

## 目标
measure-baseline 在生产模式可用；建立 LCP/Lighthouse 本地基线（记录口径）

## 输入
- 文档：`docs/V1.1-20261024/00-事实基线.md`、`04-连续执行协议.md`
- 前置：V11-G-01

## 输出
- - scripts/measure-baseline.mjs
- docs/design/06_validation/evidence/V11/PERF-01/**

## Execution Steps
1. [ ] 修 D-03 env 强校验导致的启动即退（脚本注入所需 env 或改用健康接口探测）
2. [ ] 对 5 个关键路由跑 Lighthouse（本地生产模式），记录 LCP/CLS/TBT 基线
3. [ ] 异常值登记（不追求优化，V1.1 只建基线）

## 验收标准
- [ ] 脚本可复跑（exit 0）
- [ ] 基线表入证据

## 验证命令
```bash
node scripts/measure-baseline.mjs
```

## 证据路径
docs/design/06_validation/evidence/V11/PERF-01/（execution.md + 命令原始输出；verify.md 由独立验证者写）

## 允许修改
- scripts/measure-baseline.mjs
- docs/design/06_validation/evidence/V11/PERF-01/**

## 禁止修改
- src/**
- docs/V0.7-20261019/**、docs/V0.8-20261022/**、docs/V0.9-20261023/**、docs/V1.0-20261024/**（历史只读）
- 其他卡的允许修改路径

## 依赖与阻塞
- Depends on：V11-G-01
- Blocks：见 06-DAG
- 阻塞条件：遇外部条件 → state.json 标 blocked + 原因，转下一张就绪卡

## 建议执行档位
低

## 升级条件
同卡连续 2 次验收 FAIL → 熔断 blocked，升档重写任务书

## 预估规模
小
