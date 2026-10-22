# V8-VIS-03：visual 差异分诊与前台修复（红色横幅风格一致）

## 归属
- 所属切片：S3
- 来源需求/证据：REQ-F-014；D1 裁决：前台沿用 main 红色横幅轮播
- 执行者：Hark

## 目标
Linux + seed 下 test:visual 全部通过，或每条残差有已裁决的豁免

## 输入
- 文档：docs/V0.8-20261022/00-事实基线.md、02-契约增量.md、04-连续执行协议.md
- 契约：src/contracts/**（只读，唯一源 zod）
- 前置任务：V8-VIS-02
- 前置状态：前置卡在 state.json 中为 done 且 verify=PASS（V8-V-01 除外）

## 输出
- src/app/(web)/**
- src/components/web/**
- src/styles/**
- tests/visual/__screenshots__/**
- docs/design/06_validation/evidence/V8/VIS-03/**

## Execution Steps
1. [ ] 下载 CI 产物，按路由×宽度建 diff 表：样式回归 / 数据差 / 合理演进 三类
2. [ ] 样式回归：在 (web) 内修复，保持 main 外观
3. [ ] 合理演进（upgrade 新增能力导致）：更新基线截图并在证据中逐张说明
4. [ ] 把 VIS-02 的 continue-on-error 改 false（由本卡在证据中请求 P3 执行，避免跨所有权）

## 验收标准
- [ ] CI visual 全绿
- [ ] 每张更新的基线截图有一行理由
- [ ] 首页 1440/768/375 三宽度高度互不相同（证明内容渲染）

## 验证命令
```bash
npm run test:visual
```

## 证据路径
docs/design/06_validation/evidence/V8/VIS-03/（execution.md + 命令原始输出；verify.md 由独立验证者写）

## 允许修改
- src/app/(web)/**
- src/components/web/**
- src/styles/**
- tests/visual/__screenshots__/**
- docs/design/06_validation/evidence/V8/VIS-03/**

## 禁止修改
- docs/V0.7-20261019/**（历史只读）
- prisma/migrations/**
- prisma/schema.prisma
- src/contracts/**
- 其他卡的允许修改路径

## 依赖与阻塞
- Depends on：V8-VIS-02
- Blocks：V8-T-03
- 阻塞条件：依赖 V8-VIS-02 有 CI 结果（遇阻塞：state.json 标 blocked + 原因，立即转下一张就绪卡，不等待）

## 建议执行档位
opus　理由：安全/依赖/跨模块，决策不可逆

## 升级条件
残差需改 manager 设计系统组件 → 拆卡给 V8-UI-01；同卡连续 2 次验收 FAIL → 停止改代码，升一档并重写任务书（熔断）

## 预估规模
大　约 1.5 人天　≥ 2 小时
