# STEP-A4-1：`data/home.ts` 补 11 字段

## 目标
在 `HomeData` 接口与 `getHomeData()` 返回值中加入 A2 注册的 11 个键。

## 三级凭据

**① 代码位置**
```ts
// src/components/web/data/home.ts
:39   export interface HomeData {
:56     homeCards: {...}
:66     cardShowOverlay: boolean;
:67     topNoticeText: string;
:126    const [serviceGuidesRaw, settingsMap, homeCardsRaw] = await Promise.all([...])
:150    return { ... }
:179    cardShowOverlay: settingsMap.cardShowOverlay !== "false",
:180    topNoticeText: settingsMap.topNoticeText || "2026成人高考火热报名中",
```

**② 实测**
```bash
$ grep -cE "fourCardsBgColor|topbarBgImage|statsBgImage|fourCardsShowSection|fourCardsContainerAlign|wechatQrCode|showImageOverlays" src/components/web/data/home.ts
0
```

**③ 落点**：`page.tsx` 的 `d` 就是 `HomeData`。不补 → `d.fourCardsBgImage` 为 `undefined`。

## 要加的 11 个字段

### 接口（`HomeData` 内，`topNoticeText` 之后）

```ts
  // A4：A2 注册的 11 键透传（V1.8）
  fourCardsShowSection: boolean;
  fourCardsBgColor: string;
  fourCardsBgImage: string;
  fourCardsContainerAlign: "left" | "center" | "right";
  topbarBgImage: string;
  statsBgImage: string;
  wechatQrCode: string;
  showImageOverlays: boolean;
  bannerShowExtraBtn: boolean;
  bannerExtraBtnText: string;
  bannerExtraBtnLink: string;
```

### 返回值（`getHomeData` 的 return 对象内）

```ts
  fourCardsShowSection: settingsMap.fourCardsShowSection !== "false",
  fourCardsBgColor: settingsMap.fourCardsBgColor || "",
  fourCardsBgImage: settingsMap.fourCardsBgImage || "",
  fourCardsContainerAlign:
    (settingsMap.fourCardsContainerAlign as "left" | "center" | "right") || "center",
  topbarBgImage: settingsMap.topbarBgImage || "",
  statsBgImage: settingsMap.statsBgImage || "",
  wechatQrCode: settingsMap.wechatQrCode || "",
  showImageOverlays: settingsMap.showImageOverlays !== "false",
  bannerShowExtraBtn: settingsMap.bannerShowExtraBtn === "true",   // 严格等于
  bannerExtraBtnText: settingsMap.bannerExtraBtnText || "",
  bannerExtraBtnLink: settingsMap.bannerExtraBtnLink || "",
```

## 布尔转换的方向必须与原版一致

| 键 | 原版判定 | 转换写法 |
|---|---|---|
| `fourCardsShowSection` | `!== "false"` | `!== "false"` |
| `showImageOverlays` | `!== "false"` | `!== "false"` |
| `bannerShowExtraBtn` | `=== "true"` | `=== "true"` |

**② 凭据**：原版 `(web)/page.tsx:168`（`!== "false"`）、`:38`（`!== "false"` 在 campus）、`:161`（`=== "true"`）

**③ 影响**：写反会导致默认态翻转（如 `bannerShowExtraBtn` 默认 `false`，写成 `!== "false"` 会变 `true`，第二按钮突然出现）。

## 验收
- [ ] 11 个字段在 `HomeData` 中
- [ ] 11 个字段在 return 对象中
- [ ] 3 个布尔的转换方向与原版一致
- [ ] `npx tsc --noEmit` exit 0

## 常见坑

| 坑 | 防守 |
|---|---|
| 布尔转换写反 | 逐项对照原版 file:line |
| 只加接口不加 return | tsc 会报 missing property，能抓出来 |
| `containerAlign` 没做类型断言 | `settingsMap.xxx` 是 string，需要 `as` |
