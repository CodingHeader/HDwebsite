# STEP-A2-1：cards 分组 4 键

## 目标
在 `cards` 分组末尾插入 4 个键。

## 前置
A1 完成；`display`/`image` 已可用。

## 插入位置
`src/lib/settings-registry.ts:90` 之后（`cardKaifangLink` 之后、`stats` 分组之前）。

## 要插入的 4 行

```ts
  // ── 四宫格容器（A2：恢复原版 fourCards* 配置，V1.7 裁决 2）──
  def("fourCardsShowSection", "四宫格整体显示", "cards", "true", { type: "boolean" }),
  // 默认空：新版 section 用 bg-gray-50（= #f9fafb），与原版 inline style 视觉等价，
  // 默认不设 inline style 以免与类名双处控制同一属性（V1.7 裁决 2 / C2 核实）
  def("fourCardsBgColor", "四宫格背景色", "cards", ""),
  def("fourCardsBgImage", "四宫格背景图", "cards", "", { type: "image" }),
  def("fourCardsContainerAlign", "四宫格内容对齐", "cards", "center"),
```

## 验收
- [ ] `grep -cE 'def\("fourCards' src/lib/settings-registry.ts` → **4**
- [ ] `fourCardsBgColor` 默认值为 `""`（非 `#f9fafb`）
- [ ] `fourCardsBgImage` 的 type 为 `image`
- [ ] `fourCardsShowSection` 的 type 为 `boolean`，默认 `"true"`

## 常见坑

| 坑 | 防守 |
|---|---|
| `fourCardsBgColor` 抄成 `#f9fafb` | 会与 `bg-gray-50` 重复控制，见上方注释 |
| 插到 stats 分组之后 | 会打乱分组顺序，设置页 tab 错位 |
| `fourCardsBgImage` 漏 `type:"image"` | 退化为普通文本框 |
