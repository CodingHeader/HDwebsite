---
id: TASK-M1-002
type: task
title: 契约源冻结（src/contracts zod 单一源）
status: done
plan-ref: master-plan.md §4 契约冻结包
milestone: M1
requires: [REQ-NF-002, SOL-001]
created: 2026-10-11
updated: 2026-10-11
---

# TASK-M1-002：契约源冻结

## 归属
- 所属切片：S1
- 来源需求：规划指令「契约冻结」；REQ-NF-002
- 来源方案：master-plan §4（六份契约）

## 目标
前后端共享的请求/响应/权限 Schema 唯一定义于 src/contracts/，机器可校验。

## 输入
- 文档：13-响应设计.md（ApiResponse/分页/错误细则）、03-后端设计.md（权限体系）
- 前置任务：TASK-M1-001

## 输出
- src/contracts/common.ts（信封/分页/错误码/列表查询）
- src/contracts/auth.ts（登录/Session/JWT claims/权限点 catalog/superAdminOnly）
- src/contracts/article.ts、setting.ts、user-action.ts、index.ts

## Execution Steps
1. [x] 按契约②③④定义 zod Schema 与类型导出
2. [x] 权限点全集含新模块（collect/publish/kb/llm/notify/wechat/review）

## 验收标准
- [x] 前端仅凭 contracts 可写调用层（manager-fetch 已对接）
- [x] 错误码枚举与 13-响应设计 §1 完全一致
- [x] review:edit 标注为 SuperAdmin 独享（ADR-017）

## 验证命令
```bash
npx tsc --noEmit && grep -c "Schema" src/contracts/*.ts
```

## 证据路径
docs/design/06_validation/evidence/EVD-M1/

## 允许修改
- src/contracts/**

## 禁止修改
- prisma/**、src/app/**

## 依赖与阻塞
- Depends on：TASK-M1-001
- Blocks：TASK-M1-004/005、后续全部 API 卡
- 阻塞条件：Schema 语义冲突需回 master-plan 仲裁

## 建议执行档位
opus。理由：契约语义冻结属全局决策。

## 升级条件
需推翻 13-响应设计口径时升 fable（需用户批准）。

## 预估规模
小。已完成。
