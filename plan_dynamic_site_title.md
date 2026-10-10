# 三级原子化方案：网站标题从后台设置动态读取

## 问题根因
`src/app/layout.tsx` 使用 `export const metadata: Metadata = { title: "Website Clone" }` 硬编码标题，未消费数据库 Setting 表中 `siteName` 键值。所有子页面的 metadata 也是硬编码，未读取数据库设置。

## 最优方案：根Layout generateMetadata + title.template
Next.js 官方推荐的层级 metadata 模式，根 Layout 设置 `title: { default, template }`，子页面只需简短 title 即可自动拼接后缀。

---

# Milestone: 网站标题从后台设置动态读取

## 验收标准
- [ ] 首页 `<title>` = Setting 表 seoTitle/siteName 值
- [ ] 子页面 `<title>` = `页面名 - siteName`
- [ ] 后台修改 siteName 后前台即时生效
- [ ] site.webmanifest 动态读取 siteName
- [ ] DB 无数据时 fallback 到 Registry 默认值

## 包含的Phase
- Phase-1: 根Layout动态metadata（2个Task）
- Phase-2: Web子页面metadata动态化（2个Task）
- Phase-3: PWA manifest同步 + Seed数据修复（2个Task）
- Phase-4: 全面验收（1个Task）

---

# Phase-1: 根Layout动态metadata

| 序号 | Task | 优先级 | 依赖 |
|------|------|--------|------|
| 1 | 根Layout改用generateMetadata | P0 | - |
| 2 | settings.ts新增SEO快捷函数 | P0 | Task-1 |

## Task-1: 根Layout改用generateMetadata

**修改文件**: `src/app/layout.tsx`

**改造逻辑**:
- 删除 `export const metadata: Metadata = { title: "Website Clone", description: "Pixel-perfect website clone" }`
- 新增 `import { getSettings } from "@/lib/settings"; import { getDefaultValues } from "@/lib/settings-registry";`
- 新增 `export async function generateMetadata(): Promise<Metadata>` 函数
- 函数内: try/catch 调用 getSettings()，失败时 fallback 到 getDefaultValues()
- 读取 siteName/seoTitle/seoDescription/seoKeywords
- 返回 `{ title: { default: seoTitle, template: '%s - ${siteName}' }, description, keywords, icons, manifest }`

**title.template 机制**: 子页面设 `title: "关于我们"` → 渲染为 `"关于我们 - 弘道教育"`

## Task-2: settings.ts新增SEO快捷函数

**修改文件**: `src/lib/settings.ts`

**新增3个函数**:
- `getSeoTitle()`: 调用 getSetting("seoTitle", DEFAULT_SETTINGS.seoTitle)
- `getSeoDescription()`: 调用 getSetting("seoDescription", DEFAULT_SETTINGS.seoDescription)
- `getSeoKeywords()`: 调用 getSetting("seoKeywords", DEFAULT_SETTINGS.seoKeywords)

---

# Phase-2: Web子页面metadata动态化

| 序号 | Task | 优先级 | 依赖 |
|------|------|--------|------|
| 3 | 7个静态页面metadata动态化 | P1 | Task-1 |
| 4 | 3个动态详情页metadata后缀动态化 | P1 | Task-1 |

## Task-3: 7个静态页面metadata动态化

**修改文件（7个）**:
- src/app/(web)/about/page.tsx
- src/app/(web)/party/page.tsx
- src/app/(web)/learning/page.tsx
- src/app/(web)/gallery/page.tsx
- src/app/(web)/partners/page.tsx
- src/app/(web)/contact/page.tsx
- src/app/(web)/campus/page.tsx

**改造模式（每个文件相同）**:
- 删除 `export const metadata: Metadata = { title: "页面名 - 弘道教育", description: "..." }`
- 新增 `export async function generateMetadata(): Promise<Metadata>`
- 函数内: 调用 getSettings()，读取 siteName/seoDescription
- 返回 `{ title: "页面名" 或 "页面名 - ${siteName}", description: seoDescription }`
- 推荐用简短格式 `title: "页面名"`，让根Layout的 template 拼接后缀（DRY）

## Task-4: 3个动态详情页metadata后缀动态化

**修改文件（3个）**:
- src/app/(web)/articles/[id]/page.tsx — title 后缀从硬编码改为 `${siteName}`
- src/app/(web)/courses/[id]/page.tsx — `${course.title} - 弘道教育` → `${course.title} - ${siteName}`
- src/app/(web)/services/[slug]/page.tsx — `弘道教育服务指南` → `${siteName}服务指南`

**改造模式**: 在现有 generateMetadata 中添加 `getSettings()` 调用，用 Promise.all 并行请求实体数据和设置数据

---

# Phase-3: PWA manifest同步 + Seed数据修复

| 序号 | Task | 优先级 | 依赖 |
|------|------|--------|------|
| 5 | site.webmanifest动态化 | P1 | Task-1 |
| 6 | seed.ts设置key格式对齐 | P2 | - |

## Task-5: site.webmanifest动态化

**新建文件**: `src/app/site.webmanifest/route.ts`
- GET handler: 调用 getSettings() 读取 siteName/siteDescription
- 返回 Response(JSON, { headers: { "Content-Type": "application/manifest+json" } })
- name = siteName, short_name = siteName.slice(0,6), description = siteDescription

**删除文件**: `public/site.webmanifest`（静态文件与 API 路由冲突）

## Task-6: seed.ts设置key格式对齐

**修改文件**: `prisma/seed.ts`（第411-441行）

**key映射**:
- site.title → siteName, site.subtitle → siteDescription, site.logo → siteLogo
- schoolSlogan → companySlogan, contact.phone1 → contactPhone1, contact.phone2 → contactPhone2
- contact.email → contactEmail, contact.address → address, contact.worktime → workHours
- seo.title → seoTitle, seo.keywords → seoKeywords, seo.description → seoDescription
- site.icp → icp
- 删除: social.wechat/social.weibo/social.douyin/site.copyright（Registry 未定义）
- 新增: siteLogoIcon/siteFavicon/welcomeText/footerSlogan/footerDescription/topNoticeText/topNoticePhone/contactPhone/bannerBgImage/bannerTitle/bannerSubtitle/bannerBtnText/bannerBtnLink/statsLabel/companyVideoUrl

---

# Phase-4: 全面验收

| 序号 | Task | 优先级 | 依赖 |
|------|------|--------|------|
| 7 | 全站metadata动态化端到端验收 | P0 | Task-1~6 |

## Task-7: 端到端验收
验证所有页面 title/description/keywords 从数据库读取，后台修改 siteName 后前台即时生效。

---

# 方案对比

| 维度 | 方案A: generateMetadata+template | 方案B: 每页独立generateMetadata | 方案C: 客户端document.title |
|------|------|------|------|
| SEO友好 | 优 | 优 | 差 |
| 代码简洁 | 优 | 中 | 差 |
| 维护性 | 优 | 中 | 差 |
| 用户体验 | 优 | 优 | 差（闪屏） |
| 改动量 | 小（1+7+3+1=12文件） | 大 | 中 |
| 技术规范 | 官方推荐 | 可行 | 不推荐 |

**最优方案**: A

---

# 文件操作总清单

## 新建（1个）
1. src/app/site.webmanifest/route.ts

## 修改（13个）
1. src/app/layout.tsx
2. src/lib/settings.ts
3-9. src/app/(web)/about|party|learning|gallery|partners|contact|campus/page.tsx
10. src/app/(web)/articles/[id]/page.tsx
11. src/app/(web)/courses/[id]/page.tsx
12. src/app/(web)/services/[slug]/page.tsx
13. prisma/seed.ts

## 删除（1个）
1. public/site.webmanifest
