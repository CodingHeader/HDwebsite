---
id: TASK-M1-011
type: task
title: News→Article 迁移脚本 + seed 基线 + M1 端到端验证
status: done
plan-ref: current-plan.md M1 清单第 6/7 项
milestone: M1
requires: [ADR-001, REQ-F-004]
created: 2026-10-11
updated: 2026-10-11
---

# TASK-M1-011：迁移脚本 + seed + 端到端验证

## 归属
- 所属切片：S1
- 来源需求：C1（News 并入 Article）；基础目标
- 来源方案：SOL-001 §3.4 / DEP-014

## 目标
迁移脚本（dry-run/apply/rollback 报告制）对旧库验证可用；seed 幂等基线数据；`npm run check` 绿 + 启动冒烟全通过。

## 输入
- 旧库：../04292309/prisma/dev.db（dry-run 目标）
- 前置任务：TASK-M1-003~010

## 输出
- scripts/migrate-news-to-article.mjs（保留 id/时间/浏览量；id 冲突跳过计数；apply 前自动备份 .pre-news-migrate；报告含迁移 id 清单供回滚）
- prisma/seed.ts（角色/管理员/菜单/设置/分类标签/示例文章 markdown+html/聊天场景/CronJob 行/服务指南/通知模板与 7 事件规则）
- src/lib/__tests__/*（6 文件 30 用例）

## Execution Steps
1. [x] 迁移脚本 dry-run 旧库（5 条 News/25 Article 计数核对）
2. [x] 键迁移脚本 dry-run（9 键映射 + 无映射键报告）
3. [x] npm run check（lint+typecheck+build）全绿
4. [x] 启动冒烟：health/settings/articles/login/CRUD/401 拦截/user-actions/homepage/sitemap
5. [x] 冒烟数据清理（测试文章删除）+ 服务停止

## 验收标准
- [x] npm run check 退出码 0
- [x] vitest 30/30 通过
- [x] 越权写被 401 拦截（契约②③验证）
- [x] dry-run 不写库（对比库文件 mtime）

## 验证命令
```bash
npm run check && npm run test && node scripts/migrate-news-to-article.mjs --db ../04292309/prisma/dev.db
```

## 证据路径
docs/design/06_validation/evidence/EVD-M1/

## 允许修改
- scripts/migrate-news-to-article.mjs、prisma/seed.ts、src/lib/__tests__/**

## 禁止修改
- 04292309/**（只读参照仓，dry-run 不落盘）

## 依赖与阻塞
- Depends on：TASK-M1-003~010
- Blocks：M1 验收（validation-plan §M1）、M4 部署切换
- 阻塞条件：旧库 schema 与预期不符（需人工核对）

## 建议执行档位
sonnet。

## 升级条件
apply 阶段（M4）由 opus 主导并双人核对计数。

## 预估规模
中。已完成。

## 备注（流程偏差登记）
本卡按「先建卡再开工」要求事后补录——实际顺序为同轮内实现→验证→建卡，已记入 changelog 第十轮与 talk.md；后续切片恢复先卡后码。
