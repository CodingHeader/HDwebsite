# STEP-1-2：组件 props 恢复（WP1-ST2）

## 目标
给 9 个区块组件恢复被裁撤的 props，默认值与原版一致。

## 卡
WP1-ST2（`opus`，约 3h）

## 前置
`STEP-1-1` 完成（键已注册）。

## 9 个组件 / 逐项对照

### 1. 六组件补 `showOverlay`

`NewsCenter`、`CampusSection`、`CourseSectionNew`、`CompanyIntro`、`CertificateGallery`、`PartnerUniversities`

每个改三处：
```tsx
// ① interface
interface XxxProps {
  ...原有;
  showOverlay?: boolean;   // 新增
}

// ② 解构 + 默认值（必须 true）
export function Xxx({ ..., showOverlay = true }: XxxProps) {

// ③ 条件包裹（范围照原版）
{showOverlay && (  ...原标题栏 JSX...  )}
```

**原版位置参考**（照抄条件包裹范围，**不抄 className**）：
- `NewsCenter.tsx:18,44,63`
- 其余五个：`E:\Code\Demo\HDwebsite\hdwebsite_0429\src\components\web\<同名>.tsx`

### 2. TopBanner 补 3 个

```tsx
interface TopBannerProps {
  noticeText: string;
  noticePhone: string;
  showContent?: boolean;   // 默认 true
  bgImage?: string;
  showOverlay?: boolean;   // 默认 true
}

if (!showContent) return null;
const bannerStyle = bgImage ? { backgroundImage: `url(${bgImage})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined;
```

原版参考 `TopBanner.tsx:10-11,22-23,25-27,30-48`

### 3. StatsBanner 补 2 个

`showContent?: boolean`（默认 true，false 返回 null）、`bgImage?: string`

原版参考 `StatsBanner.tsx:8-9,16-17,20,24-26`

### 4. FourCards 补 4 props + 7 卡片字段

```tsx
interface CardData {
  ...原有 7 项;
  backgroundImage?: string | null;
  showIcon?: boolean;
  showTitle?: boolean;
  showSubtitle?: boolean;
  showArrow?: boolean;
  showDecoration?: boolean;
  textAlign?: "left" | "center" | "right";
}

interface FourCardsProps {
  cards?: CardData[];
  showOverlay?: boolean;
  showSection?: boolean;      // 默认 true
  bgColor?: string;
  bgImage?: string;
  containerAlign?: "left" | "center" | "right";  // 默认 center
}
```

原版参考 `FourCards.tsx:11-13,20-25`

### 5. Banner 补 3 个

```tsx
export interface BannerSettings {
  ...原有;
  showExtraBtn?: boolean;
  extraBtnText?: string;
  extraBtnLink?: string;
}
```

原版参考 `Banner.tsx:30-32`

## 完成判据

- [ ] 6 组件各含 `showOverlay`（interface + 解构 + JSX，≥3 处）
- [ ] TopBanner 含 3 props 且 `showContent=false` 返回 null
- [ ] StatsBanner 含 2 props
- [ ] FourCards 含 7 卡片字段 + 4 props
- [ ] Banner 含 3 字段
- [ ] **所有默认值与原版一致**
- [ ] `npx tsc --noEmit` exit 0
- [ ] **className 值零变更**

## 验证命令

```bash
cd /e/Code/Demo/HDwebsite/hdwebsite_1011
for c in NewsCenter CampusSection CourseSectionNew CompanyIntro CertificateGallery PartnerUniversities; do
  echo -n "$c showOverlay: "; grep -c "showOverlay" "src/components/web/$c.tsx"
done
grep -c "showContent\|bgImage\|showOverlay" src/components/web/TopBanner.tsx
grep -cE "backgroundImage|showIcon|showTitle|showSubtitle|showArrow|showDecoration|textAlign" src/components/web/FourCards.tsx
npx tsc --noEmit
# className 值零变更（比对值，非行数）
git diff -U0 -- src/components/web | grep -oE 'className="[^"]*"' | sort | uniq -c | awk '$1%2==1'
# 期望空
```

## 常见坑

| 坑 | 防守 |
|---|---|
| **默认值写成 false** | 每个 prop 默认值照原版 file:line 核 |
| 照抄原版时把 className 也抄了 | **只抄 props 与 `&&` 包裹范围，不碰 className** |
| `showContent` 忘了 early return | TopBanner/StatsBanner 都要 `if (!showContent) return null;` |
| FourCards 只加 interface 未加渲染 | 7 个字段都要在 JSX 中有消费点，否则是死字段 |
