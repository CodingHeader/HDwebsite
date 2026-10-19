# D-04 方案：设置键对等 16 键 + 默认值单一来源 + 修正 3 个不存在的默认资源路径

> 2026-10-19，V0.7，执行者 P3。基于 `origin/main@94dbbbb`（git show origin/main:src/lib/settings-registry.ts，859 行）与 upgrade 当前 `src/lib/settings-registry.ts`（189 行）逐一比对。

## 一、main 键清单（非分组对象，共 56 个扁平键）

从 main 提取 `key: "xxx"` 的对象共 67 块，其中 10 个是分组（site/topbar/banner/stats/company/contact/seo/cards/footer/other），**56 个扁平键**：

```
siteName siteDescription siteLogo schoolFullName schoolShortName welcomeText
defaultPlaceholderImage siteLogoIcon siteFavicon
topNoticeText topNoticePhone
bannerBgImage bannerTitle bannerSubtitle bannerBtnText bannerBtnLink
bannerOverlayColor bannerOverlayOpacity bannerTextAlign bannerTextVerticalAlign
bannerShowContent bannerShowTitle bannerShowSubtitle bannerShowBtn
yearsOfEstablishment totalGraduates statsLabel
advantage1 advantage2 advantage3 advantage4
cardShowOverlay cardZikaoTitle cardZikaoSubtitle cardZikaoLink
cardChengkaoTitle cardChengkaoSubtitle cardChengkaoLink
cardKaifangTitle cardKaifangSubtitle cardKaifangLink
footerLogo footerSlogan footerDescription workHours
companySlogan companyIntro companyVideoUrl
contactPhone contactPhone1 contactPhone2 contactEmail address
seoTitle seoKeywords seoDescription icp
```

**homeCards**：main 中整块被注释（`// { key: "homeCards", ... }`），注释明确"首页服务卡片已迁移至独立的 HomeCard 数据表，四卡片通过 /api/homecards 接口管理"。upgrade 已实现 `/api/homecards` 与前台 `home.ts` 读取，**因此不补该键**（补反而会让旧 JSON 键与 HomeCard 表双写冲突），在证据中列明。

## 二、upgrade 缺失的 15 个 main 键（本卡补齐）

| 键 | main 默认值 | main type | 本卡 type 映射 | 原因 |
|---|---|---|---|---|
| siteLogoIcon | /images/logo_card.png | image | string | image→契约 5 枚举无 image，退化为 text 输入 |
| bannerOverlayColor | #000000 | color | string | color→string |
| bannerTextAlign | center | select | string | select→string（枚举值字符串） |
| bannerTextVerticalAlign | middle | select | string | select→string |
| bannerShowTitle | true | boolean | boolean | 一致 |
| bannerShowSubtitle | true | boolean | boolean | 一致 |
| bannerShowBtn | true | boolean | boolean | 一致 |
| statsLabel | 年培养输送各类人才 | text | text | 一致 |
| advantage1 | 正规可靠 | text | text | 一致（main 标注"已废弃，请使用首页服务卡片JSON配置"） |
| advantage2 | 国家承认 | text | text | 同上 |
| advantage3 | 管家服务 | text | text | 同上 |
| advantage4 | 终生可查 | text | text | 同上 |
| cardZikaoSubtitle | 自助者天助之 | text | text | 一致 |
| cardChengkaoSubtitle | 成就学员梦想 | text | text | 一致 |
| cardKaifangSubtitle | 终身学习伙伴 | text | text | 一致 |

**契约枚举约束（证据链）**：`src/contracts/setting.ts:43` `type: z.enum(["string", "number", "boolean", "json", "text"])` 是 Wave 1 冻结面，本卡不得改；因此 main 的 color/select/image/url 全部映射到 string。后台 `manager/settings/page.tsx` 的 fields 映射：`number→number`、`boolean→switch`、`json→textarea`、其他→`text`，所以这些键以普通文本输入渲染，功能可用但 UX 不如 main 的 select/color picker。**列为 UNKNOWN 待后续 CCR**（若要恢复 main 级 UX，须扩展 `src/contracts/setting.ts` type 枚举，属冻结面改动，须用户批准）。

## 三、默认值单一来源（卡明确要求）

`src/components/web/data/setting-defaults.ts` 的 `WEB_SETTING_DEFAULTS` 已是"main Registry 默认值快照（前台视觉冻结基准）"，且**已包含全部 56 个前台相关键、值与 main 完全一致**（脚本比对：onlyMain=[homeCards]、onlySD=[advantage1, companyIntro]、valueDiff=[]——valueDiff 为空是因为 SD 里的 advantage1 有 "正规可靠" 而 main 也有，脚本误判 due 到正则；人工核实 SD 值全部与 main 一致）。

**本卡做法**：registry 定义完 `SETTINGS_REGISTRY` 后，用一段覆盖循环把"前台分组"（site/topbar/banner/stats/cards/footer/company/contact/seo/other）的 `defaultValue` 从 `WEB_SETTING_DEFAULTS` 单一来源覆盖。这样：
- 前台视觉冻结基准唯一（setting-defaults.ts）；
- 后台设置页与前台默认值永不漂移；
- registry 字面量里仍写值（便于阅读与 diff），但注释声明会被覆盖。

**为什么不用 def() 逐个 webDefault(key, fallback)**：侵入大、样板多、容易漏；覆盖循环更符合"单一来源"语义且 diff 小。**为什么 lib 导入 components**：`src/components/web/data/setting-defaults.ts` 是纯数据模块（文件头自述"纯数据，前后端共用"），无 React 依赖，lib 导入不引入前端耦合；卡定义明确要求 registry 从 setting-defaults 导入，属允许路径。

**覆盖范围不含后台分组**：email/wechat-mp/collect/kb/llm/notify/publish 无对应 WEB_SETTING_DEFAULTS 键，保持 registry 字面量值不变。

## 四、修正 3 个不存在的默认资源路径（W2-09 已登记）

| 键 | upgrade 现状 | main 默认值 | 修正为 | 文件是否存在 |
|---|---|---|---|---|
| defaultPlaceholderImage | /images/placeholder.svg | /images/logo_card.png | /images/logo_card.png | `public/images/logo_card.png` ✓ |
| bannerBgImage | /images/banner-bg.jpg | "" | "" | 空值由 DB 或前台兜底；前台 `home.ts` banner 无背景图时走 red 渐变 |
| siteFavicon | /favicon.ico | "" | "" | 空值表示未配置 favicon；main 用 public/favicon-32x32.png 由 Next 自动注入，registry 无需指向 |

**验证 main 是否存在这三个文件**：`git cat-file -e origin/main:public/images/placeholder.svg|banner-bg.jpg|favicon.ico` 全部失败 → main 也不存在这些文件。证据链闭环：不是 upgrade 丢了文件，而是 upgrade 早期 registry 作者凭空写了不存在的路径。

**video-poster.jpg**（CompanyIntro.tsx:32）：属前台冻结范围，本卡不动，继续登记在 `scripts/check-assets.known-missing.txt`，由前台恢复负责（main 也不存在，需按 main 视觉等价方案）。

## 五、默认值语义修正（覆盖循环顺带统一）

registry 字面量里以下前台键值与 main 不一致，会被覆盖循环自动改为 main 口径：

| 键 | upgrade 现状 | main / WEB_SETTING_DEFAULTS |
|---|---|---|
| siteDescription | 专注专升本学历提升 | 专注专升本教育，助力学历提升 |
| schoolShortName | 弘道 | 弘道教育 |
| welcomeText | 欢迎来到弘道教育 | 弘道教育 欢迎您! |
| bannerTitle | 学历提升 一站式服务 | 弘道教育 |
| bannerSubtitle | 自考 · 成考 · 开放大学 | 专注专升本教育，助力学历提升 |
| footerSlogan | 让每一次学历提升都值得信赖 | 专注学历提升教育 |
| footerDescription | 弘道教育专注成人学历提升 | 弘道教育致力于为社会人士提供优质的学历提升教育服务，助力学历提升，成就美好未来。 |
| companySlogan | 厚德弘道 笃行致远 | 弘道教育，百年大计，教育为本！ |
| companyIntro | 弘道教育致力于为学员提供专业的学历提升服务。 | 弘道教育成立于2004年2月，是一家专注于学历提升、职业证书考试培训的成人教育机构。 |
| contactPhone | BRAND_DEFAULTS.contactPhone | 400-001-5729 |
| contactPhone1 | "" | 132-1945-5550 |
| contactEmail | "" | "" |
| seoTitle | 弘道教育 - 专升本学历提升 | 弘道教育 - 专注专升本学历提升 |
| seoDescription | 弘道教育提供自考、成考、开放大学等学历提升服务。 | 弘道教育专注专升本学历提升，提供自考、成考等多种学历提升方案。 |

**注意**：`contactPhone` 当前用 `BRAND_DEFAULTS.contactPhone`（环境可覆盖），覆盖循环会强制改为 WEB_SETTING_DEFAULTS 的 "400-001-5729"，**这会让 BRAND_DEFAULTS 配置失效**。本卡处理：contactPhone 保持 `BRAND_DEFAULTS.contactPhone`（BRAND_DEFAULTS 本身默认 "400-001-5729"，环境可覆盖），在覆盖循环中**跳过 contact 分组的 contactPhone**，并在 evidence 中列明理由（BRAND_DEFAULTS 是 ADR-010 品牌基准，优先级高于 main 快照；D-05 会统一前台电话/域名兜底读 BRAND_DEFAULTS）。

## 六、statsText 与 homeCards 的处理

- `statsText`：upgrade 独有键（B 分支合并口径，竖线分隔统计项），main 无；**保留**，不在 WEB_SETTING_DEFAULTS 中，覆盖循环跳过。
- `homeCards`：main 已注释废弃，upgrade 通过 `/api/homecards` + HomeCard 表；**不补**。

## 七、验证

1. `scripts/migrate-setting-keys.mjs`：KEY_MAP 是否需要为 main 旧点分键补映射？main 的 Registry 是扁平键，DB 中若存旧点分键（如 site.logo）会迁移失败。检查 main seed 是否用点分键——main 的 registry defaultValue 都是扁平 key，DB Setting 表存的就是扁平 key，因此不需要补 KEY_MAP。**证据不足，待确认**：如果实际部署库有旧点分键，migrate 脚本会报 unmapped；属 P04 迁移范围，非本卡。
2. 跑 `npm run typecheck`：`settingDefinitionSchema` type 枚举不接受 string 之外的非法值；补键 type 全部在 5 枚举内。
3. 跑 `npm test`：现有 settings 相关测试是否断言 registry 数量/默认值。
4. 跑 `npm run check:assets`：修正后 3 项登记缺失应消失，只剩 video-poster.jpg 登记项。
5. 前台视觉不变：`WEB_SETTING_DEFAULTS` 未被修改（本卡只改 registry），前台 `getWebSettings` 仍走同一快照。
6. `npm run test:visual`：本卡不动前台文件，visual 不增失败集（如 CI 允许则跑）。
