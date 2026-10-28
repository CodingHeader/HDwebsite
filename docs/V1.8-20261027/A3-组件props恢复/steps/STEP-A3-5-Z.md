# STEP-A3-5 + A3-Z：Banner 3 字段 与 阶段体检

## STEP-A3-5 · Banner 补 3 字段

### 三级凭据

**① 代码位置**
```tsx
// 原版 hdwebsite_0429/src/components/web/Banner.tsx
:30  showExtraBtn?: boolean;
:31  extraBtnText?: string;
:32  extraBtnLink?: string;

// 新版 src/components/web/Banner.tsx:16-36 —— BannerSettings 有 13 个字段，无上述 3 个
```

**② 实测**
```bash
grep -cE "showExtraBtn|extraBtnText|extraBtnLink" src/components/web/Banner.tsx → 0
# 原版前台消费点
(web)/page.tsx:161  showExtraBtn: showImageOverlays && settingsMap.bannerShowExtraBtn === "true"
(web)/page.tsx:162  extraBtnText: settingsMap.bannerExtraBtnText || undefined
(web)/page.tsx:163  extraBtnLink: settingsMap.bannerExtraBtnLink || undefined
```

**③ 落点**：A4 从 `d.bannerShowExtraBtn/ExtraBtnText/ExtraBtnLink` 传入

### 改动

```tsx
export interface BannerSettings {
  ...原有 13 项
  showExtraBtn?: boolean;
  extraBtnText?: string;
  extraBtnLink?: string;
}
```

渲染：`showExtraBtn && extraBtnText` 时渲染第二按钮（`href={extraBtnLink || "#"}`）。

### 验收
- [ ] 3 字段存在于 `BannerSettings`
- [ ] `showExtraBtn` 为 false 时不渲染第二按钮
- [ ] className 值未变

---

## STEP-A3-Z · 阶段体检

| # | 项 | 命令 | 期望 | 判据 |
|---|---|---|---|---|
| 1 | 6 组件 showOverlay | `grep -c showOverlay` × 6 | 各 ≥3 | interface+解构+JSX 三处 |
| 2 | 默认值全 true | `grep "showOverlay = true"` | 6 处 | 与原版默认一致 |
| 3 | TopBanner 3 props | `grep -cE "showContent\|bgImage\|showOverlay"` | ≥5 | 声明+解构+消费 |
| 4 | StatsBanner 2 props | 同上 | ≥4 | — |
| 5 | FourCards 7+4 | `grep -cE` 7 字段 / 4 props | ≥7 / ≥4 | — |
| 6 | Banner 3 字段 | `grep -cE "showExtraBtn\|extraBtnText\|extraBtnLink"` | ≥3 | — |
| 7 | 类型检查 | `npx tsc --noEmit` | exit 0 | — |
| 8 | **className 值未变** | `git diff -U0 -- src/components/web \| grep -oE 'className="[^"]*"' \| sort \| uniq -c \| awk '$1%2==1'` | **空** | 值层面比对，非行数 |
| 9 | 渐变类名保留 | `grep -c "bg-gradient-to-r" StatsBanner.tsx` | 1 | 不能被 bgImage 逻辑删掉 |
| 10 | bg-gray-50 保留 | `grep -c "bg-gray-50" FourCards.tsx` | 1 | 同上 |

### 未跑项

| 项 | 原因 |
|---|---|
| `npm test` | 组件无单测（`find src/components/web -name "__tests__"` 无） |
| `build` | tsc 已过；留 E1 |
| `test:visual` | **A5 专门跑**，本阶段只做静态检查 |

### 自我质疑

**质疑：不跑视觉回归，怎么知道默认渲染没变？**
→ 靠两条：① 所有新 prop 默认值与原版一致（原版默认即当前渲染）；② className 值零变更（结构没动样式）。
→ 但这是**静态推断**，真正的验证在 A5。**A3 完成后必须紧接着跑 A5**，不能跳过。

### 产出

`evidence/V18/A3/execution.md`：5W1H + 10 个组件改动清单 + 体检 10 项 + UNKNOWN（未跑视觉）
