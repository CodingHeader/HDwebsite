# D-04 执行记录：设置键对等 16 键 + 默认值单一来源 + 修正 3 个不存在的默认资源路径

> 执行者：P3 ｜ 分支：`upgrade` ｜ 完成时间：2026-10-19
> 卡依赖：D-03（已完成）｜ 卡阻塞：D-05、D-06
> 方案：`docs/design/06_validation/evidence/V7/D-04/plan.md`

## 5W1H

- **What**：upgrade 的 `src/lib/settings-registry.ts` 缺 main 的 15 个键（siteLogoIcon、banner* 系列、statsLabel、advantage1~4、card*Subtitle×3）；3 个默认资源路径（placeholder.svg/banner-bg.jpg/favicon.ico）指向仓库中不存在的文件；默认值单一来源未建立。
- **Why**：REQ-F-013 parity A22 要求 main 每个功能 upgrade 都存在；设置页分组渲染 SchemaForm 必须覆盖 main 全部键；默认值漂移会让前台外观偏离 main。
- **Where/When**：`src/lib/settings-registry.ts`（registry 本体）、`src/components/web/data/setting-defaults.ts`（导入，不改值）、`src/lib/__tests__/lane-d/settings-parity.test.ts`（新增）、`scripts/check-assets.known-missing.txt`（同步清理）。
- **Who**：P3；上游 W2-09（check-assets 已登记 3 项待修）；下游 D-05/D-06。
- **How**：① 从 `origin/main:src/lib/settings-registry.ts` 提取 57 个扁平键与默认值，比对 upgrade；② 补齐 15 键，契约 `type` 枚举限制下做类型映射；③ 用覆盖循环强制前台分组默认值对齐 `WEB_SETTING_DEFAULTS`（单一来源）；④ 修正 3 个不存在的默认资源路径；⑤ 新增 parity 测试冻结证据。
- **What if**：不改契约枚举（`src/contracts/setting.ts` 冻结），main 的 color/select/image/url 全部映射为 string，后台设置页退化为 text 输入（可用但 UX 弱），已列为 UNKNOWN。

## 一、main 键提取证据

从 `git show origin/main:src/lib/settings-registry.ts`（859 行）逐块解析 `{ key: "x", ... defaultValue: "..." }`，共提取 **57 个扁平键**，冻结到 `src/lib/__tests__/lane-d/main-registry.keys.json`：

- main 有 `homeCards` 键但整块被注释（`// { key: "homeCards", ... }`），注释明说"首页服务卡片已迁移至独立的 HomeCard 数据表，通过 /api/homecards 接口管理"。upgrade 已实现 `/api/homecards`，**因此不补该键**（补会让旧 JSON 键与 HomeCard 表双写冲突），parity 测试断言 `getSettingDefinition("homeCards")` 为 undefined。
- `icp` 在 main 中存在（`defaultValue: ""`），upgrade 已有该键；56 键中 41 个 upgrade 已有，15 个缺失，`icp` 本身不缺，实际补键 = 15。

## 二、补键明细（15 键）

| 键 | main 默认值 | main type | 本卡 type | 说明 |
|---|---|---|---|---|
| siteLogoIcon | /images/logo_card.png | image | string | 契约无 image，退化为文本 |
| bannerOverlayColor | #000000 | color | string | 契约无 color |
| bannerTextAlign | center | select | string | 契约无 select（枚举值字符串） |
| bannerTextVerticalAlign | middle | select | string | 同上 |
| bannerShowTitle | true | boolean | boolean | 一致 |
| bannerShowSubtitle | true | boolean | boolean | 一致 |
| bannerShowBtn | true | boolean | boolean | 一致 |
| statsLabel | 年培养输送各类人才 | text | text | 一致 |
| advantage1 | 正规可靠 | text | text | main 标注已废弃，保留兼容 DB |
| advantage2 | 国家承认 | text | text | 同上 |
| advantage3 | 管家服务 | text | text | 同上 |
| advantage4 | 终生可查 | text | text | 同上 |
| cardZikaoSubtitle | 自助者天助之 | text | text | 一致 |
| cardChengkaoSubtitle | 成就学员梦想 | text | text | 一致 |
| cardKaifangSubtitle | 终身学习伙伴 | text | text | 一致 |

**契约约束证据链**：`src/contracts/setting.ts:43` `type: z.enum(["string", "number", "boolean", "json", "text"])` 是 Wave 1 冻结面，本卡不得修改；后台 `manager/settings/page.tsx` 的 fields 映射 `number→number / boolean→switch / json→textarea / 其他→text`，补键以文本/开关/多行输入正常渲染，功能可用。

**UNKNOWN 待后续**：若要恢复 main 的 color/select/image/url 级 UX（色板选择器、下拉、图片上传控件），须扩展 `src/contracts/setting.ts` type 枚举——属冻结面改动，须用户批准，写 CCR 请求。

## 三、默认值单一来源（覆盖循环）

在 `SETTINGS_REGISTRY` 定义后追加覆盖循环：

```ts
const WEB_GROUPS = new Set(["site","topbar","banner","stats","cards","footer","company","contact","seo","other"]);
const SKIP_WEB_OVERRIDE = new Set(["contactPhone","siteUrl","statsText"]);
for (const item of SETTINGS_REGISTRY) {
  if (!WEB_GROUPS.has(item.group)) continue;
  if (SKIP_WEB_OVERRIDE.has(item.key)) continue;
  const webDefault = WEB_SETTING_DEFAULTS[item.key];
  if (webDefault !== undefined) item.defaultValue = webDefault;
}
```

- 覆盖范围 = 前台视觉冻结分组；后台分组（email/wechat-mp/collect/kb/llm/notify/publish）不覆盖，保持 registry 字面量值。
- `contactPhone` 跳过：保持 `BRAND_DEFAULTS.contactPhone`（ADR-010 品牌基准，环境可覆盖）。`WEB_SETTING_DEFAULTS.contactPhone` 也是 "400-001-5729"，值相同，但语义上 contactPhone 走 BRAND_DEFAULTS 更正确（D-05 会统一前台电话/域名兜底读 BRAND_DEFAULTS）。
- `siteUrl` / `statsText` 不在 `WEB_SETTING_DEFAULTS`，跳过。
- 覆盖循环顺带统一了 10+ 项 upgrade 独有文案与 main 的差异（siteDescription、schoolShortName、welcomeText、bannerTitle/Subtitle、footerSlogan/Description、companySlogan/Intro、seoTitle/Description、contactPhone1 等），**这不会改变前台视觉**，因为前台 `getWebSettings` 一直走 `WEB_SETTING_DEFAULTS` 快照；改变的是后台设置页的默认展示值，使其与前台一致。

**关键验证**：parity 测试断言 registry 中前台分组默认值与 `WEB_SETTING_DEFAULTS` 完全一致（跳过 contactPhone/siteUrl/statsText）。

## 四、修正 3 个不存在的默认资源路径（W2-09 已登记）

| 键 | 原值（不存在） | 修正值 | 依据 |
|---|---|---|---|
| defaultPlaceholderImage | /images/placeholder.svg | /images/logo_card.png | main 默认值；文件存在 |
| bannerBgImage | /images/banner-bg.jpg | "" | main 默认值为空；文件在 main 也不存在 |
| siteFavicon | /favicon.ico | "" | main 默认值为空；favicon 由 Next 从 public/favicon-*.png 注入 |

**验证 main 亦无这些文件**：`git cat-file -e origin/main:public/images/placeholder.svg|banner-bg.jpg|favicon.ico` 全部失败 → main 也不存在。不是 upgrade 丢了文件，而是早期 registry 作者凭空写了不存在的路径。

修正后 `node scripts/check-assets.mjs` 输出从 `FAIL 4 项` 变为 `PASS（含 1 项已登记待修）`，剩余登记项 = `/images/video-poster.jpg`（前台 CompanyIntro 视频 poster，属前台冻结范围，本卡不动）。

## 五、验收标准逐条

| # | 标准 | 结果 |
|---|---|---|
| 1 | settings-parity.test.ts：main 键全部存在；每个 /images/* 默认值文件存在 | **PASS**（5 用例全过；新增 `src/lib/__tests__/lane-d/settings-parity.test.ts`） |
| 2 | visual：失败集不增（本卡未动前台文件） | **PASS**（本卡未修改 `src/app/(web)/**`、`src/components/web/**`、`public/**`、`globals.css`；前台 `getWebSettings` 数据源不变） |
| 3 | 通用门禁全绿 | **PASS**：lint 0 errors（37 warnings 既有）、`tsc --noEmit` 0、vitest 50 files / 671 tests、`next build` 0 |
| 4 | diff 全部落在允许修改内 | **PASS**：`src/lib/settings-registry.ts`、`src/lib/__tests__/lane-d/settings-parity.test.ts`、`src/lib/__tests__/lane-d/main-registry.keys.json`、`scripts/check-assets.known-missing.txt`、`docs/design/06_validation/evidence/V7/D-04/**`。`src/components/web/data/setting-defaults.ts` 未修改 |

## 六、验证命令输出摘要

```
$ npx vitest run src/lib/__tests__/lane-d/settings-parity.test.ts
Test Files  1 passed (1)   Tests  5 passed (5)

$ npx vitest run settings-registry.test.ts w0-contracts.test.ts lane-b/settings.test.ts
Test Files  3 passed (3)   Tests  79 passed (79)

$ npm test
Test Files  50 passed (50)  Tests  671 passed (671)

$ npm run lint   → 0 errors, 37 warnings (既有)
$ npm run typecheck → exit 0
$ npm run build  → exit 0

$ node scripts/check-assets.mjs
check-assets PASS（含 1 项已登记待修）：扫描 8 个资源引用（src=8、registry=2、db=0）
```

## 七、UNKNOWN / 待后续

1. **color/select/image/url UX 恢复**：契约枚举不允许这些类型，须 CCR + 用户批准。
2. **旧点分键迁移**：如果实际部署库有 `site.logo` 等旧点分键，`scripts/migrate-setting-keys.mjs` 的 KEY_MAP 需补映射；属 P04 迁移范围，本卡不处理（`prisma/dev.db` 当前 0 字节，无数据可验证）。
3. **homeCards 键**：main 注释已废弃，不补；若未来需要兼容 main 旧 JSON 数据，需在 HomeCard 数据层加迁移逻辑。
4. **video-poster.jpg**：继续登记在 `check-assets.known-missing.txt`，由前台恢复负责。
