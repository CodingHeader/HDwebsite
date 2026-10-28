# STEP-A2-3：banner 分组 3 键

## 目标
第二按钮的三个键。

## 插入位置
`src/lib/settings-registry.ts:67`（`bannerShowBtn`）之后。

## 要插入的 3 行

```ts
  // A2：Banner 第二按钮（原版 page.tsx:161-163 消费；默认 false = 不显示，与原版严格等于判定一致）
  def("bannerShowExtraBtn", "显示第二按钮", "banner", "false", { type: "boolean" }),
  def("bannerExtraBtnText", "第二按钮文字", "banner", "了解更多"),
  def("bannerExtraBtnLink", "第二按钮链接", "banner", "/courses"),
```

## 为什么 `bannerShowExtraBtn` 默认 `"false"`

**三级凭据**
1. ① 原版 `(web)/page.tsx:161`：`showExtraBtn: showImageOverlays && settingsMap.bannerShowExtraBtn === "true"`
2. ② 原版 DB 实测：`bannerShowExtraBtn` → `"false"`
3. ③ 判定语义是 `=== "true"`（严格等于才显示），故默认 `"false"` 是忠实还原

## 验收
- [ ] 3 键存在，group 均为 `banner`
- [ ] `bannerShowExtraBtn.type === "boolean"` 且默认 `"false"`
- [ ] `bannerExtraBtnText` 默认 `"了解更多"`、`bannerExtraBtnLink` 默认 `"/courses"`

## 常见坑

| 坑 | 防守 |
|---|---|
| 默认写成 `"true"` | 会让第二按钮默认出现，与原版不一致 |
| 漏 `type:"boolean"` | 设置页渲染成文本框，存 `"true"` 字符串也能用但体验差 |