---
id: TASK-R0-001
type: task
title: 站点基线重建（CRUD 工厂 + 全资源 API + 前后台页面 + 上传/媒体）
status: done
plan-ref: master-plan.md §6 R0 切片
milestone: R0
requires: [REQ-F-012, ADR-022, SOL-001]
created: 2026-10-11
updated: 2026-10-11
---

# TASK-R0-001：站点基线重建

## 归属
- 所属切片：R0（基线重建，master-plan §6 补缺口切片）
- 来源需求：任务书 M-1（原分支功能全保留）/ M-2（B 域）/ 基础目标
- 来源方案：ADR-022 / 07-组件设计（CrudPage）/ R2 收敛

## 目标
原项目 25+ 资源的全量 CRUD（API + 管理页）、前台 13 类页面、上传/媒体服务在新仓可用。

## 输入
- 文档：03-后端设计（API 全景）/ 02-前端设计 / 04-数据设计 / B 仓差异清单（ADR-022）
- 前置任务：TASK-M1-001~011

## 输出
- src/lib/crud.ts（CRUD 工厂：鉴权/校验/审计/冲突映射）+ crud-resources.ts（26 资源规格 SSOT）
- src/contracts/resources.ts（全资源请求 Schema）+ 52 个生成式路由文件（25 资源 × 列表/详情 + users/roles/media/content-items 特殊实现）
- src/app/api/upload（sharp 缩略图 + 类型白名单）+ api/file/[...path]（双重路径穿越防护）
- src/components/manager/{CrudPage,SchemaForm,crud-specs}（schema 驱动管理页框架）+ 26 个管理页
- 前台：Header 导航表驱动 / Footer / 首页 8 分区 / about/contact/courses(+id)/partners/gallery/campus/apply(+ApplyForm+api/apply)/services/[slug]/learning/party + FloatingContact
- ManagerMenu 全量 seed（11 顶层 + 28 二级）+ 前台 Navigation seed + Course.sort 迁移

## 验收标准
- [x] 全部管理资源 CRUD 冒烟通过（鉴权/分页/keyword/审计）
- [x] npm run check 绿；vitest 33/33
- [x] 前台 9 类页面 HTTP 200；报名提交 → Student + UserAction 落库（双层频控）

## 验证命令
```bash
npm run check && npm run test
```

## 证据路径
docs/design/06_validation/evidence/EVD-R0/

## 允许修改 / 禁止修改
- 允许：src/app/**、src/components/**、src/lib/{crud,crud-resources}.ts、src/contracts/resources.ts、prisma/seed.ts
- 禁止：04292309/**、hdwebsite_0429/**（只读参照）

## 依赖与阻塞
- Depends on：M1 全部
- Blocks：M2/M3/S6 页面与 API
- 阻塞条件：无

## 建议执行档位
opus（CrudPage 抽象与规格表设计）；页面填充 sonnet。
## 预估规模
大。已完成。
