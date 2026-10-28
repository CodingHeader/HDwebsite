# STEP-A2-4：contact / display 各 1 键

## 目标
微信二维码 + 图片遮罩开关。

## 插入位置
- `contact` 分组末尾：`src/lib/settings-registry.ts:109`（`address`）之后
- `display` 分组：**新建**（A1 刚加的分组，尚无任何键）

## contact 插入

```ts
  // A2：微信二维码（原版 layout.tsx:36→71 传给 FloatingContact；空 = 显示占位）
  def("wechatQrCode", "微信二维码", "contact", "", { type: "image" }),
```

## display 插入（新分组，建议放在 registry 末尾）

```ts
  // ── display 展示开关（A1 新增分组；A2 首个键）──
  // 原版 campus/page.tsx:38 消费：showImageOverlays !== "false"
  def("showImageOverlays", "显示图片遮罩", "display", "true", { type: "boolean" }),
```

## 为什么 `wechatQrCode` 必须是 `type: "image"`

**三级凭据**
1. ① 原版 `settings-registry.ts` 中该键声明为 `type: "image"`（原版有 10 处 image 类型）
2. ② 新版 `SchemaForm.tsx:243` 已有 `case "image"` → 渲染 `ImageField`（含上传 + 媒体库选择）
3. ③ 但新版设置页 `settings/page.tsx:141` 把非 number/boolean/json 全塌缩成 `text` → **实际仍显示文本框**

**结论**：标 `image` 是契约正确，但 UI 仍不显示上传控件（两版共有缺陷，见 C 组与 AT2.6）。**不因此改回 string** —— 契约应表达正确语义。

## 验收
- [ ] 两键存在，group 分别 `contact` / `display`
- [ ] 两者 type 均为 `image` / `boolean`
- [ ] `showImageOverlays` 默认 `"true"`
- [ ] `display` 分组在 registry 中至少出现 1 次

## 常见坑

| 坑 | 防守 |
|---|---|
| `wechatQrCode` 放错分组（如 site） | 原版是 contact，保持一致 |
| `display` 分组没建 | A1 只加了枚举，键还要自己加 |
| `showImageOverlays` 默认 `"false"` | 原版是 `"true"`（`!== "false"` 判定），改 false 会让遮罩默认消失 |