---
id: REQ-F-006
type: requirement-feature
title: 采集的信息、新闻默认作为知识库文件
status: approved
owner: 产品所有者
created: 2026-10-10
updated: 2026-10-12
---

# REQ-F-006：采集信息默认入知识库

## 1. 基本信息

| 项 | 值 |
| --- | --- |
| 类型 / 状态 | functional / approved |
| 来源 Inbox | REQ-INBOX-20261010-001（新增设计第 6 条） |
| 对应原编号 | N6 |
| 优先级 | P1（M3） |

## 2. 背景

政策/新闻采集的价值不仅是发布，更是 AI 咨询的语料；现状知识库单表需人工逐条录入，无法承接自动采集流量。

## 3. 目标

采集去重通过的内容默认自动进入知识库（pending 状态），经审核激活后即可被 AI 检索引用。

### 用户故事

作为知识库管理员，我想让采集到的政策新闻自动进入知识库待审核，以便 AI 客服尽快用上最新政策。

## 4. 需求描述

CollectItem（去重通过，status=new）自动创建 KnowledgeFile（status=pending, source=collect），归属采集源配置的 targetBaseId + autoTags；collectItemId 回链采集条目；后台审核通过 → active（可被检索），拒绝 → rejected（保留记录不物理删除）。

## 5. 范围

### In Scope

- 采集 → KnowledgeFile(pending) 自动链路
- 归属规则（targetBaseId + autoTags）
- 审核流转（pending → active / rejected）

### Out of Scope

- 采集内容自动切片策略调优（使用 SOL-002 默认切片规则）
- 自动判定"是否值得入库"的智能筛选（全部默认入库，人工审核过滤）

## 6. 约束与依赖

- 依赖 SOL-002（知识库三级模型）与 SOL-004（采集）双落地（DEP-011）
- 采集大文件（>1MB）存储策略遵循 14-存储 S4

## 7. 验收条件

- [ ] 采集条目去重通过后自动生成 KnowledgeFile(status=pending, source=collect)
- [ ] 归属知识库与自动标签按采集源配置正确应用
- [ ] collectItemId 回链可从知识库文件跳回采集条目
- [ ] 审核 active 后可被场景检索命中；rejected 文件不被检索
- [ ] 发布渠道与知识库互不阻塞（同一采集内容可既发布又入库）

## 8. 影响分析

- 知识库文件量级将从人工级（百条内）升至采集级（持续增长）——检索预算与切片质量需按 REQ-NF-001 核验

## 9. 关联文档

- Solution：SOL-004（+SOL-002）
- Decision：ADR-003
- 设计提取：16-新增设计 §2、12-知识库 §3.4
- Plan：M3（S4）

---

## 2026-10-10 决策更新（ADR-020）

采集产物入库方式变更：审核通过的 CollectItem 经 KBAdapter 推送**外部知识库**（pushFile），本地不再生成 KnowledgeFile；外部库不可用时降级为本地 Knowledge 表兜底入库。

---

## 2026-10-12 更新（current-plan M-8、ADR-025）

- "默认入库"口径更正为：采集源开关 `autoToKb`（默认 true）开启时，新采集条目**入库即进入知识库**（不必等待审核或发布，P06）；目标库由采集源指定（默认"采集资讯"库，P12）。
- 入库形式：本地兜底条目（Knowledge，source=collect）+ 以 `txt` 类型推送到对应 Coze dataset（ADR-025；无 Coze 凭证/权限时仅本地，并在后台提示）。
- 审核门（ADR-017）仍控制**发布**，不控制入库；审核拒绝的条目同步把对应知识条目置为 inactive（P06 决定并写入证据）。
