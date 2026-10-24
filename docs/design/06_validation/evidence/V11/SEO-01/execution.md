# V11-SEO-01 执行证据：OG meta、JSON-LD 绝对地址与 sitemap 导航页扩展（K4=加）

## 5W1H 简版

- What：全站 OG meta（og:title/description/url/image，绝对地址口径）；文章 JSON-LD url/image 绝对化；
  sitemap 收录静态导航页。视觉零变化（只动 `<head>` metadata 与结构化数据，不改任何可见 JSX）。
- Where：`src/app/(web)/layout.tsx`、`src/app/(web)/web-metadata.ts`（新）、about/contact/courses/articles
  页面 metadata、`articles/[id]/json-ld.ts` + `articles/[id]/page.tsx`（仅 JSON-LD 数据与 metadata）、
  `src/app/sitemap.ts`、`src/lib/__tests__/v11-seo-01.test.ts`（新，8 例）。

## 现状盘点

| 项 | 现状（upgrade@8886ca5 树实测） | 处置 |
| --- | --- | --- |
| OG meta | 全站无任何 openGraph 输出（layout/页面均未定义） | layout 增加 `metadataBase` + `openGraph`（K4=加）；about/contact 原有静态 metadata 补 openGraph；courses/articles 原无 metadata，新增（仅 export，不动 JSX） |
| JSON-LD | `mainEntityOfPage: "/articles/42"`、`image: [相对路径]` 均相对地址（审计 §运维.3 属实） | `JsonLdArticleInput` 增加可选 `origin`（appOrigin()），传入时绝对化；未传保持旧相对口径（lane-d/jsonld.test.ts 既有断言不受影响，回归通过） |
| sitemap | 仅首页 + /articles + 已发布文章 | 新增 11 个静态导航页条目（清单见下） |

## 绝对地址来源与 og 继承口径

- origin：`appOrigin()` = `APP_ORIGIN` 环境变量 > Setting siteUrl > 品牌出厂默认（本次构建产物解析为
  `https://www.hd1994.com`，来自设置链）。
- layout 的 openGraph 为全站默认（子页面未覆写时继承）；Next 对 openGraph 为**整体覆写**不合并——
  因此 about/contact/courses/articles 页面级 openGraph 显式带 title/description/url/images
  （相对 url/images 经 `metadataBase` 在输出端解析为绝对地址，构建产物已核验）。

## sitemap 条目扩展清单（Execution Step 3）

新增 11 条静态导航页（base = `https://${APP_DOMAIN ?? BRAND_DEFAULTS.siteDomain}`）：

| 路径 | changeFrequency | priority |
| --- | --- | --- |
| /about | monthly | 0.6 |
| /courses | weekly | 0.8 |
| /apply | monthly | 0.8 |
| /services | monthly | 0.6 |
| /news | daily | 0.7 |
| /campus | monthly | 0.5 |
| /gallery | monthly | 0.5 |
| /partners | monthly | 0.5 |
| /party | monthly | 0.5 |
| /learning | monthly | 0.5 |
| /contact | monthly | 0.6 |

动态详情页（courses/[id]、services/[slug]、news/[id]）不在本卡范围（卡面"静态导航页"）。

## 改动文件

- `src/app/(web)/layout.tsx`：generateMetadata 增 `metadataBase` + `openGraph`（buildWebOpenGraph）。
- `src/app/(web)/web-metadata.ts`（新）：`toAbsoluteUrl` / `buildWebOpenGraph` 纯函数（供单测与复用）。
- `src/app/(web)/about/page.tsx`、`src/app/(web)/contact/page.tsx`：既有 metadata 补 openGraph（3 字段 + images）。
- `src/app/(web)/courses/page.tsx`、`src/app/(web)/articles/page.tsx`：新增 `export const metadata`
  （import + export 块，无 JSX 改动）。
- `src/app/(web)/articles/[id]/page.tsx`：generateMetadata 增 openGraph（type=article、绝对 url/image、
  publishedTime；select 补 coverImage/publishedAt）；组件内 `origin` 传入 buildArticleJsonLdScript
  （仅数据实参，script 标签 JSX 结构不变）。
- `src/app/(web)/articles/[id]/json-ld.ts`：可选 `origin` 绝对化 mainEntityOfPage/image。
- `src/app/sitemap.ts`：STATIC_NAV_PAGES 11 条。
- `src/lib/__tests__/v11-seo-01.test.ts`（新，8 例）。

## 验收逐条

| 验收标准 | 结果 | 证据 |
| --- | --- | --- |
| og:title/og:image/og:url 全站存在（构建产物断言） | PASS | `npm run build` 后逐页 grep 预渲染 HTML：/（og:title=弘道教育、og:url=https://www.hd1994.com、og:image=…/images/logo.png 绝对地址）、/about、/contact（页面级 og:url=…/about、…/contact + og:image）、/campus、/news、/partners、/party（layout 继承）全部带三标签且 URL 绝对；courses/articles 因 searchParams 为请求时渲染（ƒ），其 metadata 走同一 metadataBase 解析路径（构建产物已验证该解析），代码级定义已在库 |
| JSON-LD 无相对地址 | PASS | 单测：传 origin 时 mainEntityOfPage=https://…/articles/42、image=https://…/uploads/cover-1.png，`JSON.stringify` 无 `"/uploads|/articles` 相对残留；不传 origin 保持旧口径（既有 lane-d 16 例回归绿） |
| sitemap 条目扩展有清单 | PASS | 上表 11 条 + 单测快照（URL 全绝对、/articles/{id} weekly 0.6） |

## 命令输出摘录

```
npx vitest run src/lib/__tests__               → Test Files 77 passed (77) / Tests 850 passed (850)
npm run build                                  → ✓ Compiled successfully（sitemap.xml、全静态页预渲染成功）
grep og: .next/server/app/index.html           → og:title/og:url/og:image（https://www.hd1994.com…）
grep og: .next/server/app/about.html           → og:title/og:url(…/about)/og:image
npx eslint <本卡 10 个文件>                     → 无输出（0 问题）
```

## UNKNOWN

- courses/articles 为请求时渲染（searchParams），构建产物不含其 HTML——og 定义经 metadataBase 解析为绝对
  地址的路径已由静态页产物验证；如需运行时断言，可在部署后 curl 复核（非代码缺口）。

## 后续方向待办

- 无阻塞。`tests/visual/reference/**` 未动（OG 在 `<head>`，视觉基线不受影响）。
