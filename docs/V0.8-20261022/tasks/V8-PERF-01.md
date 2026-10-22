# V8-PERF-01：/manager 共享 chunk 再减（目标口径按 V8-Q3）

## 归属
- 所属切片：S4
- 来源需求/证据：W2-04：/manager JS gzip FAIL 1.016×；articles 372,724 B（−36.8%）
- 执行者：P1

## 目标
按 V8-Q3=B：/manager/articles 首屏 JS gzip 不回涨（≤372,724 B）且共享 chunk −10%

## 输入
- 文档：docs/V0.8-20261022/00-事实基线.md、02-契约增量.md、04-连续执行协议.md
- 契约：src/contracts/**（只读，唯一源 zod）
- 前置任务：V8-SEC-01
- 前置状态：前置卡在 state.json 中为 done 且 verify=PASS（V8-V-01 除外）

## 输出
- next.config.ts
- src/components/manager/**
- src/app/manager/**
- docs/design/06_validation/evidence/V8/PERF-01/**

## Execution Steps
1. [ ] 用 next build 产物 + source-map-explorer（npx，不加依赖）列出共享 chunk 前 10 模块
2. [ ] 候选手段按收益排序：optimizePackageImports、图标按需、DnD/Markdown/图表组件懒加载、去掉值导入组件模块（同 form-utils 模式）
3. [ ] 每个手段单独提交并测量 3 次取中位数
4. [ ] 保持 sanitize 默认注入（安全优先，不得为减包移除）

## 验收标准
- [ ] V8-Q3=B：/manager/articles ≤372,724 B 且共享 chunk 较本卡开工时 −10%（W2-04 同口径 3 次中位数）
- [ ] 门禁 + e2e 全绿
- [ ] sanitizeRichContent 仍被默认调用（grep + 单测）

## 验证命令
```bash
node scripts/measure-baseline.mjs --route /manager/articles --runs 3; npm run lint && npm run typecheck && npm test && npm run build && npm run check:assets && npm run check:root
```

## 证据路径
docs/design/06_validation/evidence/V8/PERF-01/（execution.md + 命令原始输出；verify.md 由独立验证者写）

## 允许修改
- next.config.ts
- src/components/manager/**
- src/app/manager/**
- docs/design/06_validation/evidence/V8/PERF-01/**

## 禁止修改
- docs/V0.7-20261019/**（历史只读）
- prisma/migrations/**
- prisma/schema.prisma
- src/contracts/**
- 其他卡的允许修改路径

## 依赖与阻塞
- Depends on：V8-SEC-01
- Blocks：V8-T-03, V8-UI-01
- 阻塞条件：依赖 V8-SEC-01（next 升级会改变 chunk）（遇阻塞：state.json 标 blocked + 原因，立即转下一张就绪卡，不等待）

## 建议执行档位
opus　理由：安全/依赖/跨模块，决策不可逆

## 升级条件
任何手段需要改契约或去掉安全层；同卡连续 2 次验收 FAIL → 停止改代码，升一档并重写任务书（熔断）

## 预估规模
中　约 1.0 人天　≥ 2 小时
