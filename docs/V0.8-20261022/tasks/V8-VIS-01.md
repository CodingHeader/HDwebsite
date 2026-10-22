# V8-VIS-01：与 main 等量的确定性 seed 数据集

## 归属
- 所属切片：S3
- 来源需求/证据：用户转述：dev.db 内容表全 0，visual 高度差 2140px
- 执行者：P1

## 目标
npx tsx prisma/seed-visual.ts 后 Article/Course/Banner/Campus/Gallery 行数与 main 参照一致

## 输入
- 文档：docs/V0.8-20261022/00-事实基线.md、02-契约增量.md、04-连续执行协议.md
- 契约：src/contracts/**（只读，唯一源 zod）
- 前置任务：V8-G-01
- 前置状态：前置卡在 state.json 中为 done 且 verify=PASS（V8-V-01 除外）

## 输出
- prisma/seed-visual.ts
- prisma/fixtures/visual/**
- public/uploads/visual-fixtures/**
- docs/design/06_validation/evidence/V8/VIS-01/**

## Execution Steps
1. [ ] 从 main（94dbbbb 工作树或其 dev.db；只读）统计各内容表行数与首页区块所需字段，写 counts.json
2. [ ] 生成脱敏、固定内容的 fixtures（文本可用 main 公开页面文字，图片用 main 仓库内已有静态资源）
3. [ ] seed-visual.ts 幂等：先清空 5 张内容表再按 fixtures 写入，id 固定
4. [ ] 记录 seed 后各表行数

## 验收标准
- [ ] counts.json 与 seed 后行数逐表相等
- [ ] 连续执行两次 seed 结果一致（幂等）
- [ ] 不触碰 schema 与迁移

## 验证命令
```bash
npx tsx prisma/seed-visual.ts && npx tsx prisma/seed-visual.ts && node -e "" && npm run lint && npm run typecheck && npm test && npm run build && npm run check:assets && npm run check:root
```

## 证据路径
docs/design/06_validation/evidence/V8/VIS-01/（execution.md + 命令原始输出；verify.md 由独立验证者写）

## 允许修改
- prisma/seed-visual.ts
- prisma/fixtures/visual/**
- public/uploads/visual-fixtures/**
- docs/design/06_validation/evidence/V8/VIS-01/**

## 禁止修改
- docs/V0.7-20261019/**（历史只读）
- prisma/migrations/**
- prisma/schema.prisma
- src/contracts/**
- 其他卡的允许修改路径

## 依赖与阻塞
- Depends on：V8-G-01
- Blocks：V8-VIS-02, V8-V-01
- 阻塞条件：无（遇阻塞：state.json 标 blocked + 原因，立即转下一张就绪卡，不等待）

## 建议执行档位
sonnect　理由：原子实现，规则已在本卡写明

## 升级条件
main 侧数据不可得 → 登记 BLOCKING V8-Q4 并按 fixtures 估算数量继续（标注假设）；同卡连续 2 次验收 FAIL → 停止改代码，升一档并重写任务书（熔断）

## 预估规模
中　约 1.0 人天　≥ 2 小时
