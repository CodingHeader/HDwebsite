# STEP-A3-2 / 3-3：TopBanner + StatsBanner

## TopBanner 补 3 props

### 目标
`showContent` / `bgImage` / `showOverlay`，默认 `true` / `""` / `true`。

### 原版对照（三级凭据）

**① 代码位置** `hdwebsite_0429/src/components/web/TopBanner.tsx`
```tsx
:10  bgImage?: string;
:11  showOverlay?: boolean;
:22  bgImage,
:23  showOverlay = true,
:25-27  if (!showContent) { return null; }
:30-46  const bannerStyle = bgImage ? {backgroundImage:`url(${bgImage})`,...} : undefined;
:48  {showOverlay && (
```

**② 实测**
```bash
grep -c "showOverlay\|bgImage\|showContent" hdwebsite_0429/src/components/web/TopBanner.tsx
→ 5 处
grep -c "showOverlay\|bgImage\|showContent" hdwebsite_1011/src/components/web/TopBanner.tsx
→ 0 处
```

**③ 落点**：A4 从 `d.topbarBgImage` 等传入

### 新版现状（39 行）
```tsx
interface TopBannerProps {
  noticeText: string;
  noticePhone: string;
}
```

### 改造后
```tsx
interface TopBannerProps {
  noticeText: string;
  noticePhone: string;
  showContent?: boolean;   // 默认 true
  bgImage?: string;        // 默认 ""
  showOverlay?: boolean;   // 默认 true
}

export function TopBanner({ noticeText, noticePhone, showContent = true, bgImage, showOverlay = true }: TopBannerProps) {
  if (!showContent) return null;
  // ... 原有 telHref
  const bannerStyle = bgImage
    ? { backgroundImage: `url(${bgImage})`, backgroundSize: "cover", backgroundPosition: "center" }
    : undefined;
  // <section> 上挂 style={bannerStyle}
  // 标题栏部分用 {showOverlay && (...)} 包裹
}
```

### 验收
- [ ] `grep -cE "showContent|bgImage|showOverlay" TopBanner.tsx` ≥ 5
- [ ] `showContent = true`、`showOverlay = true`
- [ ] `if (!showContent) return null;` 存在
- [ ] className 值未变

---

## StatsBanner 补 2 props

### 原版对照

**① 代码位置** `hdwebsite_0429/src/components/web/StatsBanner.tsx`
```tsx
:8   showContent?: boolean;
:9   bgImage?: string;
:16  showContent = true,
:17  bgImage,
:20  if (!showContent) { return null; }
:24-26  const bannerStyle = bgImage ? { backgroundImage: `url(${bgImage})`, ... } : undefined;
```

**② 实测**
```bash
grep -cE "showContent|bgImage" hdwebsite_0429/.../StatsBanner.tsx → 4
grep -cE "showContent|bgImage" hdwebsite_1011/.../StatsBanner.tsx → 0
```

**③ 落点**：A4 从 `d.statsBgImage` 传入

### 新版现状（47 行）
```tsx
interface StatsBannerProps {
  years: number;
  graduates: string;
  advantages: string[];
}
```

### 改造后
```tsx
interface StatsBannerProps {
  years: number;
  graduates: string;
  advantages: string[];
  showContent?: boolean;   // 默认 true
  bgImage?: string;        // 默认 ""
}
export function StatsBanner({ years, graduates, advantages, showContent = true, bgImage }: StatsBannerProps) {
  if (!showContent) return null;
  const bannerStyle = bgImage ? {...} : undefined;
  // <div className="bg-gradient-to-r ..."> 上挂 style
}
```

### ⚠️ 注意：StatsBanner 的现有背景是渐变
新版 `:13` 用 `bg-gradient-to-r from-[#1a237e] via-[#283593] to-[#004d40]`。
原版同类位置用 `bannerStyle`（HTML 背景图）。

**处置**：`bgImage` 有值时用 inline style 覆盖渐变，为空时保持渐变。**不改渐变本身**（那是冻结的视觉）。

### 验收
- [ ] `grep -cE "showContent|bgImage" StatsBanner.tsx` ≥ 4
- [ ] 两默认值分别为 `true` / 空
- [ ] `if (!showContent) return null;` 存在
- [ ] 渐变类名未变（`grep -c "bg-gradient-to-r"` 仍为 1）
