# STEP-A1-2：`type` 枚举补 `image`

## 目标
在 `settingDefinitionSchema` 的 `type` 枚举中加入 `"image"`。

## 前置
`STEP-A1-1` 完成（`display` 分组已加）。

## 执行步骤

1. 定位：`sed -n '40,50p' src/contracts/setting.ts`
2. 修改第 43 行

**改前**：
```ts
type: z.enum(["string", "number", "boolean", "json", "text"]),
```

**改后**：
```ts
type: z.enum(["string", "number", "boolean", "json", "text", "image"]),
```

3. 保持其他字段不动

## 为什么只加 image，不加原版的其余 9 种

原版 `SettingFieldType`（`hdwebsite_0429/src/lib/settings-registry.ts:20-31`）有 11 种：
`text / textarea / number / url / image / email / phone / boolean / json / color / select`

**新版 `SchemaForm` 实际支持的渲染分支**（`SchemaForm.tsx:118-270`）：
`switch / multiselect / json / image / tags / markdown / richtext / secret / text / number`

**交集 = `image`**（其余原版类型要么新版用 `text` 兜底已够，要么组件未实现）。

**加契约但组件不支持的 type = 死枚举**，所以只加 `image`。

## 验收
- [ ] `sed -n '43p' src/contracts/setting.ts` 含 `"image"`
- [ ] 枚举值数量 5 → 6
- [ ] `npx tsc --noEmit` exit 0
- [ ] 现有 registry 无类型报错（`grep -oE 'type: "[a-z]+"' src/lib/settings-registry.ts | sort -u` 只有 boolean/number/string/text）

## 常见坑

| 坑 | 防守 |
|---|---|
| 顺序打乱 | 追加在末尾，不改原顺序 |
| 顺手把原版 11 种全加 | 会产生死枚举，组件不支持 |
| 忘了同步 `RegistryItem` 类型 | `RegistryItem = Omit<SettingDefinition,"group">&{group:string}` 自动继承，无需改 |
