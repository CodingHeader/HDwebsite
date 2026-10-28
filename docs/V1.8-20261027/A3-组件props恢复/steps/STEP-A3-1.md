# STEP-A3-1：6 组件补 `showOverlay`

## 目标
给 6 个组件加上 `showOverlay?: boolean`（默认 `true`），包裹标题栏。

## 每个组件的三处改动

### 改动模式（统一）

```tsx
// ① interface 加一行
interface XxxProps {
  ...原有
  showOverlay?: boolean;
}

// ② 解构 + 默认值（必须 true）
export function Xxx({ ...原有, showOverlay = true }: XxxProps)

// ③ 条件包裹（范围照原版）
{showOverlay && (
  ...原标题栏 JSX...
)}
```

## 逐组件对照表（原版 file:line）

| 组件 | 原版声明 | 原版解构 | 原版消费点 |
|---|---|---|---|
| NewsCenter | `:18 showOverlay?: boolean` | `:44 showOverlay = true` | `:63`、`:104` |
| CampusSection | 同款 | 同款 | 需读原版定位 |
| CourseSectionNew | 同款 | 同款 | 同上 |
| CompanyIntro | 同款 | 同款 | 同上 |
| CertificateGallery | 同款 | 同款 | 同上 |
| PartnerUniversities | 同款 | 同款 | 同上 |

**执行方法**：逐个打开 `E:\Code\Demo\HDwebsite\hdwebsite_0429\src\components\web\<组件>.tsx`，找到 `{showOverlay && (`，记下它包裹的 JSX 起止，再到新版对应位置做同样包裹。

## 新版各组件的当前签名（已实测）

```tsx
NewsCenter.tsx:43          NewsCenter({ news }: NewsCenterProps)
CampusSection.tsx:22       CampusSection({ campuses, placeholderImage = "/images/logo_card.png" })
CourseSectionNew.tsx:25    CourseSectionNew({ hotMajors })
CompanyIntro.tsx:9         CompanyIntro({ videoUrl, introText, slogan })
CertificateGallery.tsx:14  CertificateGallery({ items, placeholderImage = "/images/logo_card.png" })
PartnerUniversities.tsx:18 PartnerUniversities({ partners })
```

## 验收
- [ ] 6 个文件各 `grep -c showOverlay` ≥ 3
- [ ] 6 个文件的默认值均为 `showOverlay = true`
- [ ] `npx tsc --noEmit` exit 0
- [ ] className 值未变

## 常见坑

| 坑 | 防守 |
|---|---|
| 默认值写成 `false` | 会让标题栏默认消失，视觉立即变化 |
| 包裹范围与原版不一致 | 逐行对照原版 `{showOverlay && (...)}` 的括号范围 |
| 顺手改了 className | 只加 props 与包裹，样式不动 |
| 某个组件原版有两处 `showOverlay &&` | 两处都要包（NewsCenter 就是 `:63` 和 `:104`） |
