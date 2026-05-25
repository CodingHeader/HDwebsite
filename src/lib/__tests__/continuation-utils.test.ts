import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

import {
  buildChatTranscript,
  buildChatTranscriptSummary,
} from "../chat-history-view";
import { parseLogListQuery } from "../operation-log-query";
import {
  formatTotalTuitionPrice,
  getLowestTotalTuition,
  inheritEnrollmentLevels,
} from "../enrollment-pricing";
import {
  hasBrokenShowcaseText,
  resolveCampusCaption,
  resolveCampusName,
  resolvePartnerLogo,
  resolveShowcaseTitle,
} from "../showcase";
import { getSettingDefinition } from "../settings-registry";

test("parseLogListQuery clamps page and pageSize while preserving search", () => {
  const params = new URLSearchParams({
    page: "0",
    pageSize: "500",
    search: " 登录 ",
  });

  const query = parseLogListQuery(params);

  assert.deepEqual(query, {
    page: 1,
    pageSize: 100,
    search: "登录",
    skip: 0,
    take: 100,
  });
});

test("buildChatTranscriptSummary reports counts and time range", () => {
  const messages = [
    {
      id: 1,
      sessionId: "sess_1",
      role: "user",
      message: "你好",
      createdAt: "2026-04-30T08:00:00.000Z",
    },
    {
      id: 2,
      sessionId: "sess_1",
      role: "assistant",
      message: "您好，请问想咨询什么？",
      createdAt: "2026-04-30T08:00:05.000Z",
    },
  ];

  const summary = buildChatTranscriptSummary(messages);

  assert.equal(summary.messageCount, 2);
  assert.equal(summary.userMessageCount, 1);
  assert.equal(summary.assistantMessageCount, 1);
  assert.equal(summary.startedAt, "2026-04-30T08:00:00.000Z");
  assert.equal(summary.endedAt, "2026-04-30T08:00:05.000Z");
});

test("buildChatTranscript renders a readable merged transcript", () => {
  const messages = [
    {
      id: 1,
      sessionId: "sess_1",
      role: "user",
      message: "你好",
      createdAt: "2026-04-30T08:00:00.000Z",
    },
    {
      id: 2,
      sessionId: "sess_1",
      role: "assistant",
      message: "您好，请问想咨询什么？",
      createdAt: "2026-04-30T08:00:05.000Z",
    },
  ];

  const transcript = buildChatTranscript(messages);

  assert.match(transcript, /\[USER\] 2026-04-30 08:00:00/);
  assert.match(transcript, /\[ASSISTANT\] 2026-04-30 08:00:05/);
  assert.match(transcript, /您好，请问想咨询什么/);
});

test("resolveShowcaseTitle falls back when title is mojibake", () => {
  assert.equal(hasBrokenShowcaseText("鍥涘窛甯堣寖澶у鑷€冩瘯涓氳瘉"), true);

  const title = resolveShowcaseTitle({
    rawTitle: "鍥涘窛甯堣寖澶у鑷€冩瘯涓氳瘉",
    fallbackPrefix: "证书风采",
    index: 2,
  });

  assert.equal(title, "证书风采 3");
});

test("resolveCampusName and caption fall back to default seeded labels", () => {
  assert.equal(resolveCampusName("濂ュ洯鏍″尯", 0), "学院风采分组 1");
  assert.equal(resolveCampusName("图1", 0), "图1");
  assert.equal(
    resolveCampusCaption("濂ュ洯鏍″尯鐜", "濂ュ洯鏍″尯", 0, 1),
    "学院风采分组 1 图片 2",
  );
  assert.equal(resolveCampusCaption(null, "图1", 0, 0), null);
});

test("resolvePartnerLogo falls back when partner logo is missing", () => {
  assert.equal(
    resolvePartnerLogo({
      logo: "/uploads/202604/missing.png",
      imageMissing: true,
    }),
    "/images/logo.png",
  );
});

test("settings registry exposes background image and overlay controls for topbar and stats", () => {
  assert.equal(getSettingDefinition("topbarBgImage")?.type, "image");
  assert.equal(getSettingDefinition("topbarShowOverlay")?.type, "boolean");
  assert.equal(getSettingDefinition("statsBgImage")?.type, "image");
  assert.equal(getSettingDefinition("statsShowOverlay")?.type, "boolean");
});

test("settings registry stats group uses statsText instead of separate year/graduate fields", () => {
  assert.equal(getSettingDefinition("statsText")?.type, "text");
  assert.equal(getSettingDefinition("statsText")?.group, "stats");
  assert.equal(getSettingDefinition("statsText")?.defaultValue, "办学26年培养输送各类人才11万余人");
  assert.equal(getSettingDefinition("yearsOfEstablishment"), undefined);
  assert.equal(getSettingDefinition("totalGraduates"), undefined);
  assert.equal(getSettingDefinition("statsLabel"), undefined);
});

test("about page does not reference deprecated stats fields yearsOfEstablishment or totalGraduates", () => {
  const rootDir = path.resolve(__dirname, "../../..");
  const source = readFileSync(
    path.join(rootDir, "src/app/(web)/about/page.tsx"),
    "utf8",
  );
  assert.equal(source.includes("yearsOfEstablishment"), false);
  assert.equal(source.includes("totalGraduates"), false);
  assert.equal(source.includes("statsText"), true);
});

test("showcase read routes do not call ensureShowcaseSeedData anymore", () => {
  const rootDir = path.resolve(__dirname, "../../..");
  const readPaths = [
    "src/app/(web)/page.tsx",
    "src/app/(web)/campus/page.tsx",
    "src/app/(web)/gallery/page.tsx",
    "src/app/api/campus/route.ts",
    "src/app/api/campus/[id]/route.ts",
    "src/app/api/gallery/route.ts",
  ];

  for (const relativePath of readPaths) {
    const source = readFileSync(path.join(rootDir, relativePath), "utf8");
    assert.equal(
      source.includes("ensureShowcaseSeedData("),
      false,
      `${relativePath} should not trigger showcase auto-seeding on read`,
    );
  }
});

test("homepage partner and hot major sections do not hard-limit enabled content counts", () => {
  const rootDir = path.resolve(__dirname, "../../..");
  const source = readFileSync(
    path.join(rootDir, "src/app/(web)/page.tsx"),
    "utf8",
  );

  assert.equal(
    source.includes('prisma.partner.findMany({ where: { status: "active" }, orderBy: { sort: "asc" }, take: 8 })'),
    false,
  );
  assert.equal(
    source.includes('prisma.hotMajor.findMany({ where: { status: "active" }, orderBy: { sort: "asc" }, take: 12 })'),
    false,
  );
});

test("CourseSectionNew does not slice hot majors to eight cards anymore", () => {
  const rootDir = path.resolve(__dirname, "../../..");
  const source = readFileSync(
    path.join(rootDir, "src/components/web/CourseSectionNew.tsx"),
    "utf8",
  );

  assert.equal(source.includes("filteredMajors.slice(0, 8)"), false);
});

test("homepage certificate section does not hard-limit enabled content counts", () => {
  const rootDir = path.resolve(__dirname, "../../..");
  const source = readFileSync(
    path.join(rootDir, "src/app/(web)/page.tsx"),
    "utf8",
  );

  assert.equal(
    source.includes('prisma.gallery.findMany({') && source.includes('category: "certificate"') && source.includes("take: 8"),
    false,
  );
});

test("CertificateGallery does not slice certificates to eight cards anymore", () => {
  const rootDir = path.resolve(__dirname, "../../..");
  const source = readFileSync(
    path.join(rootDir, "src/components/web/CertificateGallery.tsx"),
    "utf8",
  );

  assert.equal(source.includes("items.slice(0, 8)"), false);
});

test("CampusSection hides all visible text overlays when showOverlay is false", () => {
  const rootDir = path.resolve(__dirname, "../../..");
  const source = readFileSync(
    path.join(rootDir, "src/components/web/CampusSection.tsx"),
    "utf8",
  );
  const badgeIndex = source.indexOf('<span className="absolute right-2 top-2');
  const activeTitleIndex = source.indexOf("{activeItem.title}");
  const badgeGuard = source.slice(Math.max(0, badgeIndex - 80), badgeIndex);
  const modalTextGuard = source.slice(Math.max(0, activeTitleIndex - 120), activeTitleIndex);

  assert.match(badgeGuard, /showOverlay && \(/);
  assert.match(modalTextGuard, /showOverlay && \(/);
});

test("inheritEnrollmentLevels carries blank or slash levels within the same school only", () => {
  const rows = inheritEnrollmentLevels([
    { schoolName: "四川大学", level: "专升本" },
    { schoolName: "四川大学", level: "/" },
    { schoolName: "四川大学", level: "" },
    { schoolName: "四川大学", level: "专科" },
    { schoolName: "四川大学", level: "/" },
    { schoolName: "电子科技大学", level: "/" },
    { schoolName: "电子科技大学", level: "专升本" },
    { schoolName: "电子科技大学", level: "/" },
  ]);

  assert.deepEqual(rows.map((row) => row.resolvedLevel), [
    "专升本",
    "专升本",
    "专升本",
    "专科",
    "专科",
    null,
    "专升本",
    "专升本",
  ]);
});

test("getLowestTotalTuition uses the lowest total fee and ignores unpriced offerings", () => {
  const result = getLowestTotalTuition([
    {
      majorName: "法学",
      educationType: "自考",
      level: "专升本",
      partnerName: "四川大学",
      totalTuition: 8000,
      hasPrice: true,
    },
    {
      majorName: "法学",
      educationType: "自考",
      level: "专升本",
      partnerName: "西华师范大学",
      totalTuition: 5400,
      hasPrice: true,
    },
    {
      majorName: "法学",
      educationType: "自考",
      level: "专升本",
      partnerName: "电子科技大学",
      totalTuition: null,
      hasPrice: false,
    },
  ]);

  assert.equal(result.minTotalTuition, 5400);
  assert.equal(result.displayPrice, "¥5400");
  assert.equal(result.sourcePartnerName, "西华师范大学");
});

test("getLowestTotalTuition returns placeholder when every offering is unpriced", () => {
  const result = getLowestTotalTuition([
    {
      majorName: "示例专业",
      educationType: "自考",
      level: "专升本",
      partnerName: "四川大学",
      totalTuition: null,
      hasPrice: false,
    },
  ]);

  assert.equal(result.minTotalTuition, null);
  assert.equal(result.displayPrice, "--");
  assert.equal(formatTotalTuitionPrice(null), "--");
});

test("homepage hot major component does not expose enrollment price display fields", () => {
  const rootDir = path.resolve(__dirname, "../../..");
  const source = readFileSync(
    path.join(rootDir, "src/components/web/CourseSectionNew.tsx"),
    "utf8",
  );

  assert.equal(source.includes("displayPrice"), false);
  assert.equal(source.includes("minTotalTuition"), false);
});

test("CourseCard can render enrollment placeholder prices from course priceText", () => {
  const rootDir = path.resolve(__dirname, "../../..");
  const source = readFileSync(
    path.join(rootDir, "src/components/web/CourseCard.tsx"),
    "utf8",
  );

  assert.match(source, /priceText/);
  assert.match(source, /--/);
});
