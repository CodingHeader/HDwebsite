# STEP-A1-1：`settingGroups` 补 `display`

## 目标
在 `src/contracts/setting.ts` 的分组枚举中插入 `display`。

## 前置
- 无
- 文件当前状态：17 个分组

## 执行步骤

1. 定位：`sed -n '17,37p' src/contracts/setting.ts`
2. 在 `"other",` 之后、`"email",` 之前插入一行 `  "display",`
3. 保持缩进 2 空格，与相邻行一致

**改后应为**：
```ts
export const settingGroups = [
  "site",
  "topbar",
  "banner",
  "stats",
  "cards",
  "footer",
  "company",
  "contact",
  "seo",
  "other",
  "display",        // ← 新增（A1）
  "email",
  "wechat-mp",
  "collect",
  "kb",
  "llm",
  "notify",
  "publish",
] as const;
```

## 为什么插在 other 之后
- `display` 是 UI 展示类配置，与 `other` 语义邻近
- 插在末尾会打乱设置页 tab 的现有顺序（运营已习惯）
- 插在中间只影响 `other` 与 `email` 之间的位置，影响面最小

## 验收
- [ ] `sed -n '/export const settingGroups/,/as const/p' src/contracts/setting.ts | grep -cE '^\s+"'` → **18**
- [ ] `grep -n '"display"' src/contracts/setting.ts` → 命中 1 处
- [ ] 其他 17 个分组顺序未变（`git diff` 只含 1 行新增）

## 常见坑

| 坑 | 防守 |
|---|---|
| 忘了逗号 | 数组语法错误，`tsc` 会立刻报 |
| 插在末尾 | 打乱 tab 顺序，运营感知 |
| 顺手改了其他分组名 | `git diff` 只允许 1 行 `+` |
