import type { TransactionClient } from "@/lib/prisma";
import path from "node:path";
import { stat } from "node:fs/promises";

const BLOCKED_SHOWCASE_IMAGE_SEGMENTS = [
  "/images/gallery/",
  "/images/campus/",
  "/images/seed/gallery/",
  "/images/seed/campus/",
  "/images/xgnedu/",
  "/images/partners/",
  "xgnedu",
];

const TOXIC_SHOWCASE_TEXT_KEYWORDS = [
  "xgnedu",
  "新概念",
  "四川师范大学",
  "西华师范大学",
  "电子科技大学",
  "四川农业大学",
  "西南交通大学",
  "成都大学",
];

const MOJIBAKE_SHOWCASE_TEXT_PATTERNS = [
  "鍥",
  "甯",
  "寖",
  "澶у",
  "鑷€",
  "涓氳瘉",
  "瑗",
  "浜ら€",
  "鏁",
  "鍜",
  "蹇",
  "",
  "€",
  "�",
  "婵",
  "鏍″尯",
];

export const DEFAULT_SHOWCASE_PLACEHOLDER = "/images/logo_card.png";
export const DEFAULT_PARTNER_LOGO = "/images/logo.png";

export const DEFAULT_CERTIFICATE_TITLES = [
  "自考毕业证",
  "毕业证书",
  "社会工作者职业证书",
  "毕业证领取通知",
  "学位证书",
  "学位证领取通知",
  "最新批次毕业证领取",
  "成人教育学位证书通知",
];

export const DEFAULT_CAMPUS_GROUPS = [
  {
    name: "奥园校区",
    address: "四川省成都市高新区天府大道1700号新世界环球中心N2区601室",
    titles: ["奥园校区", "奥园校区环境"],
  },
  {
    name: "青羊校区",
    address: "四川省成都市高新区天府大道1700号新世界环球中心N2区601室",
    titles: ["青羊校区", "青羊校区环境"],
  },
  {
    name: "金牛校区",
    address: "四川省成都市高新区天府大道1700号新世界环球中心N2区601室",
    titles: ["金牛校区", "金牛校区证书墙"],
  },
  {
    name: "郫都校区",
    address: "四川省成都市高新区天府大道1700号新世界环球中心N2区601室",
    titles: ["郫都校区", "郫都校区证书墙"],
  },
] as const;

type ShowcaseTransaction = TransactionClient;

export async function localImageExists(url: string): Promise<boolean> {
  if (!url.startsWith("/")) {
    return true;
  }

  const fullPath = path.join(process.cwd(), "public", url.replace(/^\//, ""));

  try {
    const fileStat = await stat(fullPath);
    return fileStat.isFile();
  } catch {
    return false;
  }
}

export function isBlockedShowcaseImage(image?: string | null): boolean {
  if (!image) {
    return true;
  }

  const normalized = image.toLowerCase();
  return BLOCKED_SHOWCASE_IMAGE_SEGMENTS.some((segment) =>
    normalized.includes(segment.toLowerCase())
  );
}

export function hasToxicShowcaseText(value?: string | null): boolean {
  if (!value) {
    return false;
  }

  return TOXIC_SHOWCASE_TEXT_KEYWORDS.some((keyword) =>
    value.includes(keyword)
  );
}

export function hasBrokenShowcaseText(value?: string | null): boolean {
  if (!value) {
    return true;
  }

  if (hasToxicShowcaseText(value)) {
    return true;
  }

  return MOJIBAKE_SHOWCASE_TEXT_PATTERNS.some((pattern) =>
    value.includes(pattern)
  );
}

export function resolveShowcaseImage(options: {
  image?: string | null;
  placeholderImage?: string;
  imageMissing?: boolean;
}): string {
  const { image, placeholderImage = "/images/logo_card.png", imageMissing = false } = options;

  if (!image || imageMissing || isBlockedShowcaseImage(image)) {
    return placeholderImage;
  }

  return image;
}

export function resolveShowcaseTitle(options: {
  rawTitle?: string | null;
  fallbackPrefix: string;
  index: number;
}): string {
  const { rawTitle, fallbackPrefix, index } = options;

  if (hasBrokenShowcaseText(rawTitle)) {
    return `${fallbackPrefix} ${index + 1}`;
  }

  return rawTitle!;
}

export function resolveCampusName(
  rawName: string | null | undefined,
  campusIndex: number,
): string {
  if (!hasBrokenShowcaseText(rawName)) {
    return rawName!;
  }

  return `学院风采分组 ${campusIndex + 1}`;
}

export function resolveCampusCaption(
  rawCaption: string | null | undefined,
  rawCampusName: string | null | undefined,
  campusIndex: number,
  imageIndex: number,
): string | null {
  if (!rawCaption?.trim()) {
    return null;
  }

  if (!hasBrokenShowcaseText(rawCaption)) {
    return rawCaption!;
  }

  const campusName = resolveCampusName(rawCampusName, campusIndex);
  return `${campusName} 图片 ${imageIndex + 1}`;
}

export function resolvePartnerLogo(options: {
  logo?: string | null;
  imageMissing?: boolean;
  placeholderLogo?: string;
}): string {
  const {
    logo,
    imageMissing = false,
    placeholderLogo = DEFAULT_PARTNER_LOGO,
  } = options;

  if (!logo || imageMissing) {
    return placeholderLogo;
  }

  return logo;
}

async function ensureDefaultCampusData(tx: ShowcaseTransaction) {
  const activeCampuses = await tx.campus.findMany({
    where: { status: "active" },
    include: { images: { orderBy: { sort: "asc" } } },
    orderBy: [{ sort: "asc" }, { id: "asc" }],
  });

  if (activeCampuses.length === 0) {
    for (const [campusIndex, campus] of DEFAULT_CAMPUS_GROUPS.entries()) {
      await tx.campus.create({
        data: {
          name: campus.name,
          address: campus.address,
          sort: campusIndex,
          status: "active",
          images: {
            create: campus.titles.map((title, imageIndex) => ({
              image: DEFAULT_SHOWCASE_PLACEHOLDER,
              caption: title,
              sort: imageIndex,
            })),
          },
        },
      });
    }
    return;
  }

  for (const [campusIndex, campus] of activeCampuses.entries()) {
    const nextCampusName = resolveCampusName(campus.name, campusIndex);

    if (nextCampusName !== campus.name) {
      await tx.campus.update({
        where: { id: campus.id },
        data: { name: nextCampusName },
      });
    }

    for (const [imageIndex, image] of campus.images.entries()) {
      const nextCaption = resolveCampusCaption(
        image.caption,
        campus.name,
        campusIndex,
        imageIndex,
      );
      const imageMissing = !(await localImageExists(image.image));
      const nextImage = resolveShowcaseImage({
        image: image.image,
        imageMissing,
        placeholderImage: DEFAULT_SHOWCASE_PLACEHOLDER,
      });

      if (nextCaption === image.caption && nextImage === image.image) {
        continue;
      }

      await tx.campusImage.update({
        where: { id: image.id },
        data: {
          caption: nextCaption,
          image: nextImage,
        },
      });
    }
  }
}

async function ensureDefaultGalleryData(tx: ShowcaseTransaction) {
  const activeCertificateItems = await tx.gallery.findMany({
    where: {
      category: "certificate",
      status: "active",
    },
    orderBy: [{ sort: "asc" }, { id: "asc" }],
    take: DEFAULT_CERTIFICATE_TITLES.length,
  });

  if (activeCertificateItems.length === 0) {
    await tx.gallery.createMany({
      data: DEFAULT_CERTIFICATE_TITLES.map((title, index) => ({
        title,
        image: DEFAULT_SHOWCASE_PLACEHOLDER,
        category: "certificate",
        sort: index,
        status: "active",
      })),
    });
    return;
  }

  for (const [index, title] of DEFAULT_CERTIFICATE_TITLES.entries()) {
    const item = activeCertificateItems[index];

    if (!item) {
      await tx.gallery.create({
        data: {
          title,
          image: DEFAULT_SHOWCASE_PLACEHOLDER,
          category: "certificate",
          sort: index,
          status: "active",
        },
      });
      continue;
    }

    if (!hasBrokenShowcaseText(item.title)) {
      continue;
    }

    await tx.gallery.update({
      where: { id: item.id },
      data: { title },
    });
  }
}

export async function ensureShowcaseSeedData(tx: ShowcaseTransaction) {
  await ensureDefaultCampusData(tx);
  await ensureDefaultGalleryData(tx);
}
