# STEP-1-3：首页接线（WP1-ST3）

## 目标
把 ST1 注册的键与 ST2 恢复的 props 接起来，使配置真正生效。

## 卡
WP1-ST3（`opus`，约 1.5h）

## 前置
`STEP-1-2` 完成（props 已就位）。

## 三处接线

### 1. `(web)/page.tsx` 九处传参

| 行 | 组件 | 补传 |
|---|---|---|
| `:66` | FourCards | `showSection` `bgColor` `bgImage` `containerAlign` |
| `:75` | TopBanner | `showContent` `bgImage` `showOverlay` |
| `:93` | StatsBanner | `showContent` `bgImage` |
| `:102` | PartnerUniversities | `showOverlay` |
| `:111` | CourseSectionNew | `showOverlay` |
| `:120` | CompanyIntro | `showOverlay` |
| `:129` | NewsCenter | `showOverlay` |
| `:138` | CertificateGallery | `showOverlay` |
| `:147` | CampusSection | `showOverlay` |

**数据来源**：`src/components/web/data/home.ts` 的 `d` 对象。需确认 11 个新键已进 `WEB_SETTING_DEFAULTS`（`src/components/web/data/setting-defaults.ts`），否则 `d` 里取不到。

**关键**：`showOverlay` 类布尔需转换 —— 键是字符串，组件要 boolean：
```tsx
showOverlay={d.showImageOverlays !== "false"}
```

### 2. `(web)/layout.tsx` 接 wechatQrCode

```tsx
const wechatQrCode = settings.wechatQrCode || "";
// ...
<FloatingContact phone={contactPhone1} wechatQrCode={wechatQrCode} />
```

同步改 `FloatingContact.tsx`：
- interface 加 `wechatQrCode?: string`
- 解构默认 `= ""`
- `:83` 的 `<span>微信二维码</span>` 改为条件渲染：
  ```tsx
  {wechatQrCode ? (
    <img src={wechatQrCode} alt="微信二维码" className="w-full h-full object-contain" />
  ) : (
    <span className="text-xs text-gray-400">微信二维码</span>
  )}
  ```

**注意**：这里用 `<img>` 而非 `next/image`，因为二维码是用户上传的任意 URL，与 `ArticleContent` 同理。

### 3. `(web)/campus/page.tsx` 接 showImageOverlays

```tsx
const showImageOverlays = settings.showImageOverlays !== "false";
// 包裹 :75 附近的遮罩层
{showImageOverlays && ( ...遮罩 JSX... )}
```

## 完成判据

- [ ] `page.tsx` 九处调用均含新参数
- [ ] `grep -c "showOverlay" "src/app/(web)/page.tsx"` ≥ 6
- [ ] `layout.tsx` 读取并传 `wechatQrCode`
- [ ] `FloatingContact` 含 prop 且条件渲染（空值仍显示占位）
- [ ] `campus/page.tsx` 遮罩受控
- [ ] `npx tsc --noEmit` exit 0

## 验证命令

```bash
cd /e/Code/Demo/HDwebsite/hdwebsite_1011
grep -nE "showOverlay|showSection|bgImage|containerAlign|showContent" "src/app/(web)/page.tsx" | head -15
grep -n "wechatQrCode" "src/app/(web)/layout.tsx" src/components/web/FloatingContact.tsx
grep -n "showImageOverlays" "src/app/(web)/campus/page.tsx"
npx tsc --noEmit
```

## 常见坑

| 坑 | 防守 |
|---|---|
| 键值传给 boolean prop 但没转换 | 字符串 `"false"` 是真值 → 必须 `!== "false"` |
| `d` 对象里没有新键 | 先确认 `setting-defaults.ts` 已补 |
| FloatingContact 改成直接显示 img 未留空态 | 必须保留占位分支 |
| 接线后默认态变化 | 见 `STEP-1-4` 视觉回归 |
