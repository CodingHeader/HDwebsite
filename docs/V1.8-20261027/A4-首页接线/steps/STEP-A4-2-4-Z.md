# STEP-A4-2~4 + A4-Z：传参 / 二维码 / 遮罩 / 体检

## STEP-A4-2 · `page.tsx` 9 处传参

### 改动清单（逐处精确）

```tsx
:66   <FourCards
        cards={d.homeCards}
        showOverlay={d.cardShowOverlay}
        showSection={d.fourCardsShowSection}          // +新
        bgColor={d.fourCardsBgColor}                  // +新
        bgImage={d.fourCardsBgImage}                  // +新
        containerAlign={d.fourCardsContainerAlign}    // +新
      />
:75   <TopBanner
        noticeText={d.topNoticeText}
        noticePhone={d.topNoticePhone}
        showContent={d.showImageOverlays}             // +新（与原版同源）
        bgImage={d.topbarBgImage}                     // +新
        showOverlay={d.showImageOverlays}             // +新
      />
:93   <StatsBanner
        years={d.years} graduates={d.graduates} advantages={d.advantages}
        showContent={d.showImageOverlays}             // +新
        bgImage={d.statsBgImage}                      // +新
      />
:102  <PartnerUniversities partners={d.partners} showOverlay={d.showImageOverlays} />
:111  <CourseSectionNew hotMajors={d.hotMajors} showOverlay={d.showImageOverlays} />
:120  <CompanyIntro videoUrl={...} introText={...} slogan={...} showOverlay={d.showImageOverlays} />
:129  <NewsCenter news={d.centerNews} showOverlay={d.showImageOverlays} />
:138  <CertificateGallery items={d.gallery} placeholderImage={...} showOverlay={d.showImageOverlays} />
:147  <CampusSection campuses={d.campuses} placeholderImage={...} showOverlay={d.showImageOverlays} />
```

**Banner 的 3 项**：`page.tsx` 里 Banner 在哪个位置？需要定位后加 `showExtraBtn={d.bannerShowExtraBtn}` 等。

## STEP-A4-3 · 二维码接通

### `layout.tsx`
```tsx
:55 附近加：
const wechatQrCode = settings.wechatQrCode || "";

:93 改为：
<FloatingContact phone={contactPhone1} wechatQrCode={wechatQrCode} />
```

### `FloatingContact.tsx`
```tsx
interface FloatingContactProps {
  phone?: string;
  wechatQrCode?: string;    // +新
}
export function FloatingContact({ phone = "", wechatQrCode = "" }: FloatingContactProps)

// :83 占位改为条件渲染：
{wechatQrCode ? (
  <img src={wechatQrCode} alt="微信二维码" className="w-full h-full object-contain" />
) : (
  <span className="text-xs text-gray-400">微信二维码</span>
)}
```

**注意**：用 `<img>` 而非 `next/image` —— 二维码是用户上传的任意 URL，与 `ArticleContent` 同理（`V1.7/02 §四` 已论证）。

## STEP-A4-4 · 遮罩开关

### `campus/page.tsx`
```tsx
const showImageOverlays = settings.showImageOverlays !== "false";
// 包裹 :75 附近的遮罩层
{showImageOverlays && ( ...遮罩 JSX... )}
```

**② 原版凭据**：`hdwebsite_0429/src/app/(web)/campus/page.tsx:38` 读取、`:84,106` 消费

---

## STEP-A4-Z · 阶段体检

| # | 项 | 命令 | 期望 | 判据 |
|---|---|---|---|---|
| 1 | home.ts 11 字段 | `grep -cE "fourCardsBgColor\|topbarBgImage\|..." home.ts` | ≥11 | 接口+return 各一次 = 22 |
| 2 | page.tsx 传参 | `grep -c "showOverlay" page.tsx` | ≥6 | 6 组件 + FourCards + TopBanner |
| 3 | layout 传二维码 | `grep -c wechatQrCode layout.tsx` | ≥2 | 声明+传参 |
| 4 | FloatingContact prop | `grep -c wechatQrCode FloatingContact.tsx` | ≥3 | interface+解构+条件 |
| 5 | campus 遮罩 | `grep -c showImageOverlays campus/page.tsx` | ≥2 | 声明+包裹 |
| 6 | 类型检查 | `npx tsc --noEmit` | exit 0 | — |
| 7 | className 值未变 | 差值公式 | 空 | — |
| 8 | 未越界 | `git status --short src` | 仅 5 个允许文件 | — |

### 未跑项

| 项 | 原因 |
|---|---|
| `npm test` | 前台数据层无单测 |
| `test:visual` | **A5 专跑** |
| `build` | 留 E1 |

### 自我质疑

**质疑：9 处传参 + 4 个文件改动，只跑 tsc 够吗？**
→ 类型层面够。但**生效性无法靠 tsc 验证** —— 传了参数不等于渲染正确。这就是 A5 必须存在的原因。

**质疑：`showContent={d.showImageOverlays}` 这样复用同一个开关合理吗？**
→ 原版就是这么做的：`page.tsx:157` `showContent: showImageOverlays && settingsMap.bannerShowContent !== "false"`。**用同一开关控制整组遮罩是原版设计**，照做。

### 产出
`evidence/V18/A4/execution.md`：5W1H + 5 文件改动 + 体检 8 项 + UNKNOWN（未验生效）
