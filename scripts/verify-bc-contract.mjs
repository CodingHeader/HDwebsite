#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(relPath) {
  return fs.readFileSync(path.join(root, relPath), "utf8");
}

function expect(condition, message, failures) {
  if (!condition) failures.push(message);
}

const failures = [];

const articlePage = read("src/app/(web)/articles/[id]/page.tsx");
expect(
  articlePage.includes("findFirst({"),
  "文章详情页仍未使用 findFirst 查询 published 文章",
  failures
);

const banner = read("src/components/web/Banner.tsx");
expect(
  /<p className="[^"]*font-bold[^"]*"/.test(banner),
  "Banner 副标题仍未加粗",
  failures
);
expect(
  banner.includes('btnText: settings?.btnText || "立即咨询"'),
  "Banner 默认按钮文案仍不是“立即咨询”",
  failures
);
expect(
  banner.includes("showExtraBtn") && banner.includes("extraBtnText") && banner.includes("extraBtnLink"),
  "Banner 第二 CTA 能力仍未恢复",
  failures
);

const topBanner = read("src/components/web/TopBanner.tsx");
expect(
  topBanner.includes("showContent") && /if \(!showContent\)/.test(topBanner),
  "TopBanner 一键显示开关仍未恢复",
  failures
);

const statsBanner = read("src/components/web/StatsBanner.tsx");
expect(
  statsBanner.includes("showContent") && /if \(!showContent\)/.test(statsBanner),
  "StatsBanner 一键显示开关仍未恢复",
  failures
);

const topEntrance = read("src/components/web/TopEntranceSection.tsx");
expect(
  !topEntrance.includes("md:col-span-12 lg:col-span-3"),
  "TopEntranceSection 在 md 断点下仍让左侧入口独占整行",
  failures
);

const fourCards = read("src/components/web/FourCards.tsx");
expect(
  fourCards.includes("showSection") &&
    fourCards.includes("bgColor") &&
    fourCards.includes("bgImage") &&
    fourCards.includes("containerAlign"),
  "FourCards 区块级配置仍未恢复",
  failures
);
expect(
  fourCards.includes("showIcon") &&
    fourCards.includes("showTitle") &&
    fourCards.includes("showSubtitle") &&
    fourCards.includes("showArrow") &&
    fourCards.includes("showDecoration"),
  "FourCards 细粒度元素开关仍未恢复",
  failures
);

const campusSection = read("src/components/web/CampusSection.tsx");
expect(
  campusSection.includes("useState") && /Lightbox|modal|dialog/i.test(campusSection),
  "CampusSection 仍缺少点击展开能力",
  failures
);
expect(
  /badge|张/.test(campusSection),
  "CampusSection 仍缺少图片数量徽章",
  failures
);

const footer = read("src/components/web/Footer.tsx");
expect(
  /lg:col-span-3[^]*justify-center|items-center[^]*footerLinks|footerLinks[^]*justify-center/.test(footer),
  "Footer 右侧链接列仍未做垂直居中处理",
  failures
);

const mediaPage = read("src/app/manager/media/page.tsx");
expect(
  mediaPage.includes("Pagination"),
  "媒体管理仍未恢复分页能力",
  failures
);
expect(
  /selectedIds|toggleSelect|批量/.test(mediaPage),
  "媒体管理仍未恢复批量操作能力",
  failures
);

const homePage = read("src/app/(web)/page.tsx");
for (const key of [
  "topbarShowContent",
  "statsShowContent",
  "bannerShowExtraBtn",
  "bannerExtraBtnText",
  "bannerExtraBtnLink",
  "fourCardsShowSection",
  "fourCardsBgColor",
  "fourCardsBgImage",
  "fourCardsContainerAlign",
]) {
  expect(homePage.includes(key), `首页尚未接通设置项：${key}`, failures);
}

const registry = read("src/lib/settings-registry.ts");
for (const key of [
  "topbarShowContent",
  "statsShowContent",
  "bannerShowExtraBtn",
  "bannerExtraBtnText",
  "bannerExtraBtnLink",
  "fourCardsShowSection",
  "fourCardsBgColor",
  "fourCardsBgImage",
  "fourCardsContainerAlign",
]) {
  expect(registry.includes(`key: "${key}"`), `设置注册表缺少字段：${key}`, failures);
}

const visibleCopyFiles = [
  "src/app/(web)/gallery/page.tsx",
  "src/app/(web)/page.tsx",
  "src/components/web/Navbar.tsx",
  "src/components/web/CompanyIntro.tsx",
  "src/components/web/Footer.tsx",
];
for (const relPath of visibleCopyFiles) {
  const content = read(relPath);
  expect(!content.includes("考研"), `${relPath} 仍包含“考研”可见文案`, failures);
  expect(!content.includes("新概念"), `${relPath} 仍包含“新概念”可见文案`, failures);
}

const seed = read("prisma/seed.ts");
expect(!seed.includes("新概念"), "种子数据默认文案仍包含“新概念”", failures);
expect(!seed.includes("xgnedu"), "种子数据默认文案仍包含 xgnedu", failures);

if (failures.length > 0) {
  console.error("验证失败：");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("验证通过：关键契约已满足。");
