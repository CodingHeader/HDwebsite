---
id: TASK-M1-006
type: task
title: Setting Registry 统一 + AES 加密 + 键迁移脚本
status: done
plan-ref: master-plan.md §5/§7
milestone: M1
requires: [ADR-009, ADR-010, REQ-C-002]
created: 2026-10-11
updated: 2026-10-11
---

# TASK-M1-006：Setting Registry 统一

## 归属
- 所属切片：S1
- 来源需求：C9 键双体系收敛；安全欠账（settings POST 无权限点）
- 来源方案：ADR-009 / ADR-010

## 目标
Registry 扁平 key 唯一真相源（60 键、16 组）；DB 值合并默认值；加密字段落库加密、回显可脱敏；settings 写接口带权限点；旧键迁移脚本。

## 输入
- 文档：11-配置设计.md、settings-registry 全键清单
- 契约：contracts/setting.ts
- 前置任务：TASK-M1-002/003/004

## 输出
- src/lib/settings-registry.ts（60 键；新增 email/collect/llm/notify/publish/wechat-mp 分组，凭证类 isEncrypted+非公开）
- src/lib/settings.ts（getSettings 请求级缓存/getAllSettings/setSettings + 掩码跳过保护）
- src/app/api/settings/route.ts（GET 公开仅 isPublic；PUT 鉴权 setting:edit）
- scripts/migrate-setting-keys.mjs（dry-run 默认/apply/无映射键报告）

## Execution Steps
1. [x] Registry 全键落位（品牌基准弘道教育）
2. [x] 新配置组扁平 camelCase 命名（规避废弃点分式样，如 emailHost）
3. [x] 键迁移脚本对旧库 dry-run（9 键可映射 + 无映射键报告）

## 验收标准
- [x] 未登录 GET 仅返回 isPublic 键
- [x] PUT 无 token → 401（修复原越权缺口）
- [x] 单测：键唯一/无点分 key/seed 键 ⊆ Registry/凭证字段加密（4 组用例）

## 验证命令
```bash
npx vitest run src/lib/__tests__/settings-registry.test.ts && node scripts/migrate-setting-keys.mjs --db ../04292309/prisma/dev.db | tail -3
```

## 证据路径
docs/design/06_validation/evidence/EVD-M1/

## 允许修改
- src/lib/settings*.ts、src/app/api/settings/**、scripts/migrate-setting-keys.mjs

## 禁止修改
- prisma/migrations/**

## 依赖与阻塞
- Depends on：TASK-M1-002/003/004
- Blocks：R0 设置管理页、S3/S5/S6 配置分组
- 阻塞条件：无

## 建议执行档位
sonnet。

## 升级条件
无需。

## 预估规模
中。已完成。
