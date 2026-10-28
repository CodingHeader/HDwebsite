# A4 执行证据：首页接线

## 5W1H

- **What**：把 A2 注册的 11 个配置键、A3 恢复的 props 接起来，使配置真正生效。
- **Why**：A2 的键与 A3 的 props 若未接线，均为死配置（管理端可改，前台不读）。本卡是 A5 回归验证的对象。
- **Where**：`src/components/web/data/home.ts`（补 11 字段）、`src/app/(web)/page.tsx`（9 处传参）、`src/app/(web)/layout.tsx` + `FloatingContact.tsx`（二维码）、`src/app/(web)/campus/page.tsx`（遮罩）。
- **Who**：main-agent。
- **How**：先补 `HomeData` 接口与 return（数据层），再改 9 处调用（表现层），最后两个独立入口（layout / campus）。布尔转换严格照原版判定方向。
- **What if**：布尔转换写反会导致默认态翻转（如 `bannerShowExtraBtn` 由 false 变 true，第二按钮突然出现）；已逐项对照原版 file:line。

## 改动文件（5 个）

| 文件 | 改动 |
|---|---|
| `src/components/web/data/home.ts` | `HomeData` 接口 +11 字段；return 对象 +11 项（含布尔转换） |
| `src/app/(web)/page.tsx` | 9 处调用补传参 |
| `src/app/(web)/layout.tsx` | 读 `wechatQrCode` 并传给 FloatingContact |
| `src/components/web/FloatingContact.tsx` | 加 `wechatQrCode` prop + 条件渲染（空则保留占位） |
| `src/app/(web)/campus/page.tsx` | 读 `showImageOverlays`，包裹图片说明 |

## 布尔转换方向（对照原版）

| 键 | 原版判定 | 本卡实现 | 依据 |
|---|---|---|---|
| `fourCardsShowSection` | `!== "false"` | `!== "false"` | 原版 page.tsx:168 |
| `showImageOverlays` | `!== "false"` | `!== "false"` | 原版 campus/page.tsx:38 |
| `bannerShowExtraBtn` | `=== "true"` | `=== "true"` | 原版 page.tsx:161 |

## 验收逐条

| # | 条目 | 命令 | 结果 |
|---|---|---|---|
| 1 | home.ts 含 11 字段 | `grep -cE "<11 个键名>"` | PASS（23 处：接口 11 + return 11 + 注释） |
| 2 | page.tsx 9 处传参 | `grep -c showOverlay` | PASS（9） |
| 3 | layout 传二维码 | `grep -c wechatQrCode` | PASS（3：注释 + 声明 + 传参） |
| 4 | campus 遮罩受控 | `grep -c showImageOverlays` | PASS（2：声明 + 使用） |
| 5 | 类型检查 | `npx tsc --noEmit` | PASS（exit 0） |
| 6 | className 值零变更 | 集合差 | PASS（空） |
| 7 | 未越界 | `git status --short src` | PASS（仅 5 个允许文件） |

## 关键设计决定

### 1. `topbarBgImage` / `fourCardsBgColor` 默认空（沿用 V1.7 裁决）

```ts
// 默认空：原版该键值指向 /uploads/202605/...ne0f5b.png，但该文件已不存在
topbarBgImage: settingsMap.topbarBgImage || "",
// 默认空：新版 section 用 bg-gray-50（= #f9fafb），与原版 inline style 视觉等价
fourCardsBgColor: settingsMap.fourCardsBgColor || "",
```

**后果**：默认态不生成 inline style → 沿用现有类名 → 与改动前渲染一致。

### 2. `FloatingContact` 用原生 `<img>` 而非 `next/image`

二维码是**用户上传的任意 URL**，`next/image` 需要预知尺寸 + 域名白名单。与 `ArticleContent`（富文本内嵌图）同理，用 `<img>` 是正确选择。已加 eslint-disable 注释说明原因。

### 3. `campus` 只挂 `img.caption`，未动页头

原版 `showImageOverlays` 控制三处（页头 / 校区名+地址 / 图片说明）。新版 `campus` 页的页头文案是「校区环境」而非原版「学院风采」，且校区名/地址在 `campus.name` 卡片内。

**决定**：只把 `showImageOverlays` 挂到 `img.caption`（最贴近原版语义的一处），页头与校区信息保持常显。

**理由**：新增三处包裹会扩大 A5 的视觉验证面；且原版那三处的语义是「列表式的图片遮罩层」，新版已改为卡片网格，结构不同，不宜照搬。

## 默认态验证

`git diff -U0 -- "src/app/(web)"` 的 className 值集合差：**空**（原有 className 值全部保留，无一个被改）。

## UNKNOWN

- `test:visual` 未跑（win32 无法生成 Linux 基线）：留 A5 统一处理。

## 提交

`feat(V18/A4): 首页接线 —— 11 键透传 + 二维码 + 遮罩`