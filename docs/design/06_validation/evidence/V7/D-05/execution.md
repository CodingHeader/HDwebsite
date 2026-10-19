# D-05 执行记录：前台电话/域名兜底统一读 WEB_SETTING_DEFAULTS + BRAND_DEFAULTS

> 执行者：P3 ｜ 分支：`upgrade` ｜ 完成时间：2026-10-19
> 卡依赖：D-04（已完成）｜ 卡阻塞：W2-01
> 证据路径：`docs/design/06_validation/evidence/V7/D-05/`

## 5W1H

- **What**：清除 src 中（除 `src/config/brand.ts` 与 `setting-defaults.ts` 外）的 3 组品牌字面量：400-001-5729、132-1945-5550、hd1994；只替换兜底字面量，不改 JSX 结构与 className。
- **Why**：前台品牌兜底硬编码会让"改一个电话要搜全站"；统一来源是 ADR-010 品牌基准 + 前台视觉冻结快照 `WEB_SETTING_DEFAULTS`。
- **Where/When**：13 个文件，全部前台相关；`grep -v src/config/brand.ts|setting-defaults.ts` 为空即达标。
- **Who**：P3；下游 W2-01。
- **How**：400 号与 132 号兜底改引 `WEB_SETTING_DEFAULTS.contactPhone / contactPhone1`；robots/sitemap 域名改引 `BRAND_DEFAULTS.siteDomain`。
- **What if**：卡允许修改不含 `src/config/brand.ts`，故不新增 132 号到 BRAND_DEFAULTS（避免越权改 brand 常量）；改读 `WEB_SETTING_DEFAULTS`（main 口径单一来源，D-04 已建立）。

## 关键设计决策

1. **兜底来源选择 `WEB_SETTING_DEFAULTS` 而非 `BRAND_DEFAULTS`**：
   - 卡允许修改含 `src/components/web/data/**`（`setting-defaults.ts` 所在），不含 `src/config/brand.ts`；
   - `BRAND_DEFAULTS` 只有 `contactPhone`（400 号）与 `siteDomain`（hd1994），**缺 132 号**，若强行新增即越权；
   - `WEB_SETTING_DEFAULTS` 是 main 口径快照，`contactPhone1: "132-1945-5550"`、`contactPhone: "400-001-5729"`、`topNoticePhone: "132-1945-5550"` 均存在，D-04 已把它作为 registry 默认值单一来源。
   - **UNKNOWN/待后续**：若后续要"前台兜底也走 BRAND_DEFAULTS"，须在 `src/config/brand.ts` 补 `contactPhone1`/`topNoticePhone` 常量（D-05 卡之外，另立 ADR）。

2. **ApplyClient.tsx 文本内嵌的处理**：
   - 4 处 132 号在 `"AI 暂时不可用…"` 双引号字符串里，直接替换为 `${WEB_SETTING_DEFAULTS.contactPhone1}` 会输出字面 `${}`；
   - 修正：把双引号字符串改为模板字面量（反引号），确保插值生效。
   - `getSetting("contactPhone", "132-1945-5550")` 兜底值也改为 `WEB_SETTING_DEFAULTS.contactPhone1`。

3. **services/[slug] 的无连字符版**：
   - `href={`tel:${(settings.contactPhone || "13219455550").replace(/-/g, "")}`}` 里是 `13219455550`（tel: 链接无连字符）；
   - 改为 `WEB_SETTING_DEFAULTS.contactPhone`，保持 `.replace(/-/g, "")` 不变。

4. **home.ts 的 topNoticePhone 键名**：
   - 初始脚本把 132 号统一替换为 `WEB_SETTING_DEFAULTS.contactPhone1`，但 `topNoticePhone` 语义应指向 `WEB_SETTING_DEFAULTS.topNoticePhone`；
   - 已修正回 `topNoticePhone`，避免顶栏公告电话与备用电话混淆。

5. **客户端组件 import 顺序**：
   - `Footer.tsx`、`Header.tsx`、`FloatingContact.tsx`、`ApplyClient.tsx` 是 `"use client"` 组件；
   - 首轮脚本把 import 插在文件头，导致 `"use client"` 出现在 import 之后，触发 ESLint `@typescript-eslint/no-unused-expressions`（3 处新增 warning）；
   - 已把 `WEB_SETTING_DEFAULTS` import 移到 `"use client";` 之后，lint 恢复到 37 warnings（与 D-04 基线一致）。

6. **robots.ts / sitemap.ts 的 BRAND_DEFAULTS 导入**：
   - 首轮脚本误判"already has WEB_SETTING_DEFAULTS"，实际两文件只替换了域名，未加导入；
   - 已补 `import { BRAND_DEFAULTS } from "@/config/brand";`。

## 改动文件清单（13 文件，34+/21-）

| 文件 | 改动 |
|---|---|
| `src/app/(web)/about/page.tsx` | +1 import，`settings.contactPhone || "400-001-5729"` → `WEB_SETTING_DEFAULTS.contactPhone` |
| `src/app/(web)/apply/ApplyClient.tsx` | +1 import；4 处 132 号：3 处双引号改模板字面量插值 + 1 处 getSetting 兜底值 |
| `src/app/(web)/campus/page.tsx` | +1 import，同 about |
| `src/app/(web)/contact/page.tsx` | +1 import；400 号 + 132 号各 1 处 |
| `src/app/(web)/courses/[id]/page.tsx` | +1 import，400 号 |
| `src/app/(web)/layout.tsx` | +1 import，132 号（contactPhone1） |
| `src/app/(web)/services/[slug]/page.tsx` | +1 import；2 处 132 号（含 1 处 tel: 链接 `13219455550` 改 `contactPhone`） |
| `src/app/robots.ts` | +1 import BRAND_DEFAULTS；`?? "www.hd1994.com"` → `?? BRAND_DEFAULTS.siteDomain` |
| `src/app/sitemap.ts` | +1 import BRAND_DEFAULTS；同上 |
| `src/components/web/FloatingContact.tsx` | +1 import；`phone = "132-1945-5550"` → `WEB_SETTING_DEFAULTS.contactPhone1` |
| `src/components/web/Footer.tsx` | +1 import；`contactPhone = "400-001-5729"` → `WEB_SETTING_DEFAULTS.contactPhone` |
| `src/components/web/Header.tsx` | +1 import；`contactPhone1 = "132-1945-5550"` → `WEB_SETTING_DEFAULTS.contactPhone1` |
| `src/components/web/data/home.ts` | 已 import setting-defaults（不新增）；`topNoticePhone` 与 `ctaPhone` 兜底改读 WEB_SETTING_DEFAULTS |

## 验收标准逐条

| # | 标准 | 结果 |
|---|---|---|
| 1 | `grep -rnE "400-001-5729\|132-1945-5550\|hd1994" src --exclude-dir=__tests__ --exclude=settings-registry.ts \| grep -v "src/config/brand.ts\|setting-defaults.ts"` 为空 | **PASS**（含 `13219455550` 一并清除；grep exit 1 无匹配） |
| 2 | visual：失败集不增（未改 JSX/className） | **PASS（静态）**：diff 只含 import 与字面量兜底值，无 JSX 结构/className 变化；`npm run test:visual` 未在本卡跑（需 Chromium，见局限） |
| 3 | 人工审 diff：每文件只有兜底字面量行 + 至多 1 行 import | **PASS**：34+/21-，逐文件核对 |
| 4 | 通用门禁全 exit 0 | **PASS**：lint 0 errors（37 warnings 基线）、`tsc --noEmit` 0、vitest 50 files/671 tests、`next build` 0 |
| 5 | diff 落在允许修改内 | **PASS**：全部 13 文件在允许清单（`src/app/(web)/**`、`src/components/web/{Footer,Header,FloatingContact}.tsx`、`src/components/web/data/home.ts`、`src/app/robots.ts`、`src/app/sitemap.ts`） |

## 验证命令输出

```
$ grep -rnE "400-001-5729|132-1945-5550|hd1994" src --exclude-dir=__tests__ --exclude=settings-registry.ts | grep -vE "src/config/brand.ts|setting-defaults.ts"
(无输出，exit 1)

$ npm run lint
✖ 37 problems (0 errors, 37 warnings)   ← 与 D-04 基线一致

$ npm run typecheck → exit 0
$ npm test → 50 files / 671 tests passed
$ npm run build → exit 0
```

## UNKNOWN / 待后续

1. **`npm run test:visual` 未跑**：本机 Playwright Chromium 未装或依赖浏览器下载；本卡未改 JSX/className，纯字面量替换不影响视觉（P02 已建立 15 路由 visual 门禁，W2 终审会跑）。卡定义要求 visual，**列为 UNKNOWN 待 W2-07 终审补跑**。
2. **BRAND_DEFAULTS 缺 contactPhone1/topNoticePhone**：前台兜底走 `WEB_SETTING_DEFAULTS` 而非 `BRAND_DEFAULTS`；若需统一到 BRAND_DEFAULTS，须另立 ADR 修改 `src/config/brand.ts`（超出本卡允许路径）。
3. **ApplyClient 文案仍硬编码"加微信 xgnedu"**：非电话/域名字面量，超出本卡 3 组范围，不动。
