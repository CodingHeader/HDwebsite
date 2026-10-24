# V11-MAIL-02：失败重试、HTML 模板与分组一致性

## 归属
- 所属切片：S7
- 来源需求/证据：V1.1 审计 §邮件.2/3/4
- 执行者：P1

## 目标
failed 记录重启后重试；模板改 HTML 且按事件选择；分组提示与种子规则一致

## 输入
- 文档：`docs/V1.1-20261024/00-事实基线.md`、`04-连续执行协议.md`
- 前置：V11-MAIL-01

## 输出
- - src/lib/notify-gateway.ts
- src/lib/**（模板/重试）
- prisma/seed.ts（种子规则文案，如涉）
- src/lib/__tests__/*
- docs/design/06_validation/evidence/V11/MAIL-02/**

## Execution Steps
1. [ ] 启动/定时扫描 failed 记录重试（次数上限 + 退避）
2. [ ] HTML 模板按事件类型选择（before_publish/failed/balance/collect）
3. [ ] 管理端分组提示文案与 seed 规则对齐（逐条核对入证据）

## 验收标准
- [ ] 重启后 failed 被重试（单测）
- [ ] 邮件为 HTML 且事件对应
- [ ] 按提示配置的收件人能收到对应事件邮件（规则核对表）

## 验证命令
```bash
npx vitest run src/lib/__tests__
```

## 证据路径
docs/design/06_validation/evidence/V11/MAIL-02/（execution.md + 命令原始输出；verify.md 由独立验证者写）

## 允许修改
- src/lib/notify-gateway.ts
- src/lib/**（模板/重试）
- prisma/seed.ts（种子规则文案，如涉）
- src/lib/__tests__/*
- docs/design/06_validation/evidence/V11/MAIL-02/**

## 禁止修改
- prisma/migrations/**
- docs/V0.7-20261019/**、docs/V0.8-20261022/**、docs/V0.9-20261023/**、docs/V1.0-20261024/**（历史只读）
- 其他卡的允许修改路径

## 依赖与阻塞
- Depends on：V11-MAIL-01
- Blocks：见 06-DAG
- 阻塞条件：遇外部条件 → state.json 标 blocked + 原因，转下一张就绪卡

## 建议执行档位
中

## 升级条件
同卡连续 2 次验收 FAIL → 熔断 blocked，升档重写任务书

## 预估规模
中
