---
id: TASK-M3-001
type: task
title: M3a 采集引擎（配置源/试抓/审核/图片转存/调度接入）
status: done
plan-ref: master-plan.md §6 M3；SOL-004
milestone: M3
requires: [REQ-F-002, REQ-F-006, ADR-003, ADR-015]
created: 2026-10-11
updated: 2026-10-11
---

# TASK-M3-001：采集引擎

## 目标
可配置源定时/手动采集 → 清洗 → urlHash+标题相似度去重 → 图片转存本地 → 审核队列 → 入内容中枢与知识库。

## 输出
- src/lib/collect-engine.ts（html/rss 双通道、限速 ≥2s、sha1 urlHash、bigram Jaccard 0.9、sharp 转存+Media 记录、失败留原链）
- src/lib/collect-test.ts（试抓预览不入库）+ collect.run 调度任务 + 失败 collect_failed 事件
- API：collect-sources（工厂 CRUD + test/run）、collect-items（审核队列 + PATCH 审批事务化：Knowledge + ContentItem + 回链）
- seed：5 个已核实真实源（省考试院/川大继教/电子科大继教×2/省教育厅；川大为 JS 渲染站已知限制）

## 验收标准
- [x] 5 源全部登记且 URL 真实可达（逐一 WebFetch 核实）
- [x] 审核 PATCH 幂等守卫（仅 new 可审）+ $transaction 三写一致
- [x] npm run check 绿

## 验证命令
```bash
npm run check
```

## 证据路径
docs/design/06_validation/evidence/EVD-M3/

## 允许修改 / 禁止修改
- 允许：src/lib/{collect-engine,collect-test}.ts、src/app/api/collect-*/**、prisma/seed.ts
- 禁止：目标网站（只读抓取，遵守限速与公开页红线 RISK-005）

## 依赖与阻塞
- Depends on：TASK-R0-001、调度基座（M1）
- Blocks：S5 发布（消费审核产物）
- 阻塞条件：无（源清单已由用户提供，DEP-004 关闭）

## 建议执行档位
sonnet（引擎实现）；合规口径已由 SOL-004 定死。
## 预估规模
大。已完成。
