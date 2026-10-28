# TASK WP1：前台配置化复原

## 归属
- 所属工作包：WP1
- 来源需求：`REQ-F-014`（前台风格冻结）+ 原版能力对等
- 来源方案：`docs/V1.7-20261027/02-能力退化清单与定级.md` P1-1 / P1-2 / P1-3

## 目标
恢复 9 个区块组件的 props 与 11 个配置键，使前台配置能力与原版对等，且默认渲染零变化。

## 输入
- 文档：`00-双基线事实对照.md`、`01-13维度穿透分析.md`、`03-剩余任务大纲.md`
- 契约：无变更
- 前置任务：无
- 前置状态：`upgrade@993ec44`，双端 0 0

## 输出
- 修改：`src/lib/settings-registry.ts`（+11 键）
- 修改：`src/components/web/{TopBanner,StatsBanner,FourCards,Banner,NewsCenter,CampusSection,CourseSectionNew,CompanyIntro,CertificateGallery,PartnerUniversities}.tsx`
- 修改：`src/app/(web)/page.tsx`、`layout.tsx`、`campus/page.tsx`
- 修改：`src/components/web/FloatingContact.tsx`
- 可能修改：`src/components/web/data/setting-defaults.ts`（新键默认值）
- 新增：`docs/design/06_validation/evidence/V17/WP1/**`

## Execution Steps
1. [ ] `STEP-1-1` 注册 11 键（cards 4 / topbar 1 / stats 1 / banner 3 / contact 1 / display 1）
2. [ ] `STEP-1-2` 恢复 9 组件 props（6 个 showOverlay + TopBanner 3 + StatsBanner 2 + FourCards 11 + Banner 3）
3. [ ] `STEP-1-3` 接线（page.tsx 9 处 / layout + FloatingContact / campus）
4. [ ] `STEP-1-4` 默认态回归（className 值 / 基线图 / 视觉 / 管理端表单）

## 验收标准
- [ ] 11 键存在且 group/默认值正确（可自动化）
- [ ] `bannerShowExtraBtn` 默认 `"false"`，其余布尔 `"true"`（可自动化）
- [ ] 9 组件 props 齐全，默认值与原版一致（可自动化 grep + tsc）
- [ ] `showContent=false` 时 TopBanner/StatsBanner 返回 null（人工）
- [ ] className **值**零变更（可自动化）
- [ ] 基线图/阈值/用例数三项未动（可自动化）
- [ ] 管理端 `/manager/settings` 11 键可见（人工）
- [ ] 2 项前台闭环验证（改值 → 生效）（人工）
- [ ] 视觉回归全绿 或 记 `UNKNOWN(需 Linux CI)`（可自动化）

## 验证命令
```bash
cd /e/Code/Demo/HDwebsite/hdwebsite_1011
# 键
npx tsx -e "
import {getSettingDefinition} from './src/lib/settings-registry';
for(const k of ['fourCardsShowSection','fourCardsBgColor','fourCardsBgImage','fourCardsContainerAlign','topbarBgImage','statsBgImage','bannerShowExtraBtn','bannerExtraBtnText','bannerExtraBtnLink','wechatQrCode','showImageOverlays'])
  console.log(k, getSettingDefinition(k)?.group ?? 'MISSING');
"
# props
for c in NewsCenter CampusSection CourseSectionNew CompanyIntro CertificateGallery PartnerUniversities; do
  echo -n "$c: "; grep -c showOverlay "src/components/web/$c.tsx"; done
# 视觉冻结
git diff -U0 -- "src/app/(web)" src/components/web | grep -oE 'className="[^"]*"' | sort | uniq -c | awk '$1%2==1'
git status --short tests/visual/reference
git diff --exit-code playwright.config.ts
# 类型
npx tsc --noEmit
```

## 证据路径
`docs/design/06_validation/evidence/V17/WP1/`

## 允许修改
- `src/lib/settings-registry.ts`
- `src/components/web/**`
- `src/app/(web)/**`
- `src/components/web/data/**`

## 禁止修改
- `src/contracts/**`、`prisma/**`、`package.json`
- `tests/visual/reference/*.png`（不得重建基线）
- `playwright.config.ts`（尤其 `maxDiffPixelRatio`）
- `src/components/manager/**`

## 依赖与阻塞
- Depends on：无
- Blocks：WP4（文档口径修正需引用 WP1 完成证据）
- 阻塞条件：若补 props 后默认态视觉必变（说明默认值判断错）→ 停手上报，不得靠重建基线掩盖

## 建议执行档位
`opus`　理由：触及前台冻结面，默认值判断错会违反 REQ-F-014。

## 升级条件
若视觉回归出现非字体差异的失败（如区块错位）→ 升级上报，先定位是否 props 默认值导致。

## 预估规模
大（6~8 小时，14 个 AT）
