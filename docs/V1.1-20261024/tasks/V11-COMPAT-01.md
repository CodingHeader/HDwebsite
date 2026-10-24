# V11-COMPAT-01：旧 API 入口兼容

## 归属
- 所属切片：S10
- 来源需求/证据：V1.1 审计 §管理端.7
- 执行者：P2

## 目标
/api/ai-config、/api/chat/completion 等旧入口重定向/别名到现役端点（不复活死代码）

## 输入
- 文档：`docs/V1.1-20261024/00-事实基线.md`、`04-连续执行协议.md`
- 前置：V11-G-01

## 输出
- - src/app/api/ai-config/**
- src/app/api/chat/completion/**
- src/lib/__tests__/*
- docs/design/06_validation/evidence/V11/COMPAT-01/**

## Execution Steps
1. [ ] 盘点旧入口的原语义（main 对照），映射到现役端点（307/308 或适配转发）
2. [ ] 每入口一条契约级测试（状态码+落点）

## 验收标准
- [ ] 旧入口不再裸 404（映射表逐条核）
- [ ] 现役端点行为不受影响

## 验证命令
```bash
npx vitest run src/lib/__tests__
```

## 证据路径
docs/design/06_validation/evidence/V11/COMPAT-01/（execution.md + 命令原始输出；verify.md 由独立验证者写）

## 允许修改
- src/app/api/ai-config/**
- src/app/api/chat/completion/**
- src/lib/__tests__/*
- docs/design/06_validation/evidence/V11/COMPAT-01/**

## 禁止修改
- src/contracts/**
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
