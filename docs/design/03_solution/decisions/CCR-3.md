---
id: CCR-3
type: contract-change-request
title: Settings 契约扩展（display 分组 + image 类型）
status: approved
date: 2026-10-28
requester: main-agent
related: [V1.8/A1, V1.8/A2, ADR-009, ADR-034]
---

# CCR-3：Settings 契约扩展

## 1. 变更内容

`src/contracts/setting.ts` 两处：

| # | 位置 | 变更 | 行数 |
|---|---|---|---|
| 1 | `settingGroups`（:18-37） | `"other"` 后插入 `"display"` | +1 |
| 2 | `settingDefinitionSchema.type`（:44） | 枚举加 `"image"` | 改 1 行 |

## 2. 必要性

### `image` 类型（**功能性必需**）

`RegistryItem = Omit<SettingDefinition,"group"> & { group: string }`，
其 `type` 字段继承 `settingDefinitionSchema.type` 的 zod 枚举。
A2 要写 `def("wechatQrCode", ..., { type: "image" })`，不补枚举则 tsc 报错。

且 `SchemaForm.tsx:243` 早已实现 `case "image"`（渲染 `ImageField`，含上传 + 媒体库选择），
`fields/ImageField.tsx` 也真实存在 —— **契约挡在实现前面**。

### `display` 分组（**语义性**，非功能性）

实测 `settingGroups` 在产品代码零消费（`grep -rn "settingGroups" src/ | grep -v __tests__ | grep -v contracts/setting.ts` → 空）；
实际分组来自 `getGroups()` 直接读 `SETTINGS_REGISTRY`。
`def()` 的 `group` 参数类型是 `string`，不受枚举约束。

保留理由：`showImageOverlays` 的 group 语义就是 `display`（原版 DB 实测），
补上以保持契约与实际数据一致，并为未来可能的 drift 测试留锚点。

## 3. 影响面

- 冻结路径：`src/contracts/**`
- 涉及路由：`/api/settings/definitions` 会多返回一个 `display` 分组（`getGroups()` 驱动）
- 运行时校验：`settingDefinitionSchema` 未被任何运行时代码用于校验（仅类型推导），故无行为变化
- 回滚：删除这两行即可，无数据迁移

## 4. 审批

由 main-agent 以契约负责人身份批准（用户已授权自主裁决）。
提交信息须含 `CCR-3`，且本文件须被 git 跟踪，两个条件同时满足后 `check-frozen` 才会放行。