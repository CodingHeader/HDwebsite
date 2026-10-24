# V11-MAIL-01：SMTP 发送异步化

## 归属
- 所属切片：S7
- 来源需求/证据：V1.1 审计 §邮件.1
- 执行者：P1

## 目标
邮件发送移出主请求路径（后台队列/异步），发布与余额填报不再被 SMTP 阻塞

## 输入
- 文档：`docs/V1.1-20261024/00-事实基线.md`、`04-连续执行协议.md`
- 前置：V11-G-01

## 输出
- - src/lib/notify-gateway.ts
- src/lib/**（调用点）
- src/lib/__tests__/*
- docs/design/06_validation/evidence/V11/MAIL-01/**

## Execution Steps
1. [ ] 梳理同步 await 发送点，改为入队后台处理（复用既有 defer/flushDeferred 机制）
2. [ ] 发送超时上限（如 10s）+ 失败标记
3. [ ] 单测：主流程不被 SMTP 慢速阻塞（mock 计时）

## 验收标准
- [ ] SMTP 挂起时主流程 <100ms 返回
- [ ] 邮件仍会送达（后台）

## 验证命令
```bash
npx vitest run src/lib/__tests__
```

## 证据路径
docs/design/06_validation/evidence/V11/MAIL-01/（execution.md + 命令原始输出；verify.md 由独立验证者写）

## 允许修改
- src/lib/notify-gateway.ts
- src/lib/**（调用点）
- src/lib/__tests__/*
- docs/design/06_validation/evidence/V11/MAIL-01/**

## 禁止修改
- prisma/**
- docs/V0.7-20261019/**、docs/V0.8-20261022/**、docs/V0.9-20261023/**、docs/V1.0-20261024/**（历史只读）
- 其他卡的允许修改路径

## 依赖与阻塞
- Depends on：V11-G-01
- Blocks：见 06-DAG
- 阻塞条件：遇外部条件 → state.json 标 blocked + 原因，转下一张就绪卡

## 建议执行档位
中

## 升级条件
同卡连续 2 次验收 FAIL → 熔断 blocked，升档重写任务书

## 预估规模
中
