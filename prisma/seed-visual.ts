/**
 * V8-VIS-01：visual 回归专用确定性种子数据
 *
 * 为什么需要它：
 *   V0.7 的 visual 像素比对失败，根因不是样式回归，而是 **dev.db 的内容表全为 0**——
 *   首页实测高度 3389px，参照图（main 口径）5529px，差 2140px 全是"没有数据所以没有区块"。
 *   要做有效的视觉比对，被测站点的**数据量与参照图一致**是前置条件。
 *
 * 数据基线来源：同级参考仓库 `../hdwebsite_0429/prisma/dev.db`（main 系真实数据）实测行数，
 * 固化在 `prisma/fixtures/visual/counts.json`。
 *
 * 设计原则：
 *   1. **确定性**：所有文本/图片/排序都是固定值（无 Date.now、无随机），同一次种子重复执行结果一致。
 *   2. **幂等**：先按固定 id 删除再插入（`deleteMany where id in [...]`），可反复执行。
 *   3. **不碰 schema**：只写数据，不建表不改迁移。
 *   4. **不引用外部资源**：图片路径指向 `public/uploads/visual-fixtures/` 下的本地占位图
 *      （由 scripts/gen-visual-fixtures.mjs 生成 1×1 纯色 PNG，避免依赖仓库体积）。
 *
 * 用法：
 *   npx tsx prisma/seed-visual.ts            # 写入/更新 visual 数据集
 *   npx tsx prisma/seed-visual.ts --check    # 只校验当前行数是否与 counts.json 一致
 *
 * ⚠️ 执行顺序很重要（V8-VIS-01 实测踩到）：
 *   前台首页是**静态预渲染**（`○ /`，见 next build 输出），且 `getHomeData` 的
 *   `unstable_cache` 配置为 `revalidate: false`（只靠 tag 失效，不按时间过期）。
 *   后台写操作会调 `invalidateWebContent(WEB_TAGS.home)` 让 tag 失效，
 *   但**本脚本直写 DB、不走 API，因此不会触发 tag 失效**。
 *   → 结果：seed 之后必须 **重新 build 或重启并触发标签失效**，静态页才会反映新数据。
 *   实测：seed 完直接 `npm run start`，首页 HTML 仍是旧数据（API 却已返回新数据）。
 *
 *   因此 visual 回归的正确顺序是：
 *     npx tsx prisma/seed-visual.ts && npm run build && npm run start
 *   （或在测试环境把首页改为动态渲染，但那会改变生产缓存行为，不建议）。
 *
 * 注意：本脚本**不清理**其它业务数据（如 User/Role/Setting），只用固定 id 段
 * （9000+）写入 visual 数据，避免与 `prisma/seed.ts` 的常规种子冲突。
 */
import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const url = process.env.DATABASE_URL ?? "file:./prisma/dev.db";
const prisma = new PrismaClient({ adapter: new PrismaLibSql({ url }) });

const countsPath = path.resolve(__dirname, "fixtures/visual/counts.json");
const COUNTS = JSON.parse(readFileSync(countsPath, "utf8")).counts as Record<string, number>;

/** 固定 id 段：9000+ 避免与常规 seed 冲突 */
const ID_BASE = 9000;

/** 确定性时间基准（固定值，不用 new Date()） */
const T0 = new Date("2026-01-01T00:00:00.000Z");

/** 本地占位图（由 gen-visual-fixtures.mjs 生成） */
const IMG = "/uploads/visual-fixtures";
const img = (n: number) => `${IMG}/ph-${String(n).padStart(2, "0")}.png`;

/**
 * 生成占位图（运行时自建，不把二进制塞进仓库）。
 *
 * 背景：`public/uploads/**` 被 .gitignore 的 `uploads/` 规则覆盖，图片无法入库；
 * 而 visual 数据集又必须让 `<img src>` 指向**真实存在**的文件（否则前端懒加载失败、
 * 且 `localImageExists()` 会把 imageMissing 标为 true）。
 * → 由本脚本按需生成 16×16 纯色 PNG（手写最小 PNG 编码，不引第三方依赖）。
 */
function ensurePlaceholderImages(): number {
  const dir = path.join(process.cwd(), "public", "uploads", "visual-fixtures");
  mkdirSync(dir, { recursive: true });

  const crcTable: number[] = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crcTable[n] = c >>> 0;
  }
  const crc32 = (buf: Buffer): number => {
    let crc = 0xffffffff;
    for (const b of buf) crc = crcTable[(crc ^ b) & 0xff] ^ (crc >>> 8);
    return (crc ^ 0xffffffff) >>> 0;
  };
  const chunk = (type: string, data: Buffer): Buffer => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const t = Buffer.from(type, "ascii");
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(Buffer.concat([t, data])));
    return Buffer.concat([len, t, data, crc]);
  };
  const png = (w: number, h: number, rgb: [number, number, number]): Buffer => {
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(w, 0);
    ihdr.writeUInt32BE(h, 4);
    ihdr[8] = 8; // bit depth
    ihdr[9] = 2; // color type: truecolor
    const raw = Buffer.alloc((w * 3 + 1) * h);
    for (let y = 0; y < h; y++) {
      raw[y * (w * 3 + 1)] = 0; // filter: none
      for (let x = 0; x < w; x++) {
        const o = y * (w * 3 + 1) + 1 + x * 3;
        raw[o] = rgb[0];
        raw[o + 1] = rgb[1];
        raw[o + 2] = rgb[2];
      }
    }
    return Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      chunk("IHDR", ihdr),
      chunk("IDAT", zlib.deflateSync(raw)),
      chunk("IEND", Buffer.alloc(0)),
    ]);
  };

  const colors: [number, number, number][] = [
    [200, 30, 30], [30, 90, 200], [30, 150, 90], [180, 150, 40],
    [120, 60, 180], [60, 160, 180], [220, 120, 40], [90, 90, 90],
  ];
  let created = 0;
  for (let i = 1; i <= 25; i++) {
    const file = path.join(dir, `ph-${String(i).padStart(2, "0")}.png`);
    if (!existsSync(file)) {
      writeFileSync(file, png(16, 16, colors[(i - 1) % colors.length]));
      created++;
    }
  }
  return created;
}

const pad = (n: number) => String(n).padStart(2, "0");

// ── 各表数据生成（纯函数，全部确定性）────────────────────────

const categories = () => {
  const rows = [];
  for (let i = 1; i <= 21; i++) {
    rows.push({
      id: ID_BASE + i,
      name: `视觉分类${pad(i)}`,
      slug: `visual-cat-${pad(i)}`,
      type: i <= 14 ? "article" : i <= 18 ? "course" : "partner",
      sort: i,
      isNav: false,
      isVisible: true,
      createdAt: T0,
      updatedAt: T0,
    });
  }
  return rows;
};

const majors = () => {
  const rows = [];
  for (let i = 1; i <= COUNTS.Major; i++) {
    rows.push({
      id: ID_BASE + 100 + i,
      name: `视觉专业${pad(i)}`,
      slug: `visual-major-${pad(i)}`,
      description: `视觉回归用专业描述 ${i}`,
      duration: "2.5年",
      cover: img(i),
      status: "active",
      sort: i,
      categoryId: ID_BASE + 15,
      createdAt: T0,
      updatedAt: T0,
    });
  }
  return rows;
};

const articles = () => {
  const rows = [];
  for (let i = 1; i <= COUNTS.Article; i++) {
    rows.push({
      id: ID_BASE + 200 + i,
      title: `视觉回归文章 ${pad(i)}：专升本政策解读`,
      slug: `visual-art-${pad(i)}`,
      content: `<p>这是视觉回归用的第 ${i} 篇文章正文。</p><p>固定内容，用于稳定页面高度。</p>`,
      excerpt: `视觉回归用摘要 ${i}`,
      coverImage: img(i),
      authorId: 1, // 由 prisma/seed.ts 保证存在的 admin
      categoryId: ID_BASE + ((i - 1) % 14) + 1,
      status: "published",
      isTop: i <= 3,
      isRecommend: i <= 6,
      isHot: i <= 8,
      viewCount: 100 + i,
      likeCount: 10 + i,
      publishedAt: T0,
      createdAt: T0,
      updatedAt: T0,
    });
  }
  return rows;
};

const courses = () => {
  const rows = [];
  for (let i = 1; i <= COUNTS.Course; i++) {
    rows.push({
      id: ID_BASE + 300 + i,
      title: `视觉回归课程 ${pad(i)}`,
      description: `视觉回归用课程描述 ${i}`,
      price: 1980 + i * 100,
      priceText: `¥${1980 + i * 100}`,
      duration: "2.5年",
      outline: `<p>课程 ${i} 的大纲</p>`,
      cover: img(i),
      status: "active",
      categoryId: ID_BASE + 15,
      majorId: ID_BASE + 101,
      sort: i,
      createdAt: T0,
      updatedAt: T0,
    });
  }
  return rows;
};

const banners = () => {
  const rows = [];
  for (let i = 1; i <= COUNTS.Banner; i++) {
    rows.push({
      id: ID_BASE + 400 + i,
      image: img(i),
      link: "/",
      sort: i,
      status: "active",
      createdAt: T0,
    });
  }
  return rows;
};

const campuses = () => {
  const rows = [];
  for (let i = 1; i <= COUNTS.Campus; i++) {
    rows.push({
      id: ID_BASE + 500 + i,
      name: `视觉校区${pad(i)}`,
      address: `成都市视觉路 ${i} 号`,
      sort: i,
      status: "active",
      createdAt: T0,
    });
  }
  return rows;
};

const galleries = () => {
  const rows = [];
  for (let i = 1; i <= COUNTS.Gallery; i++) {
    rows.push({
      id: ID_BASE + 600 + i,
      title: `视觉证书${pad(i)}`,
      image: img(i),
      category: "certificate",
      sort: i,
      status: "active",
      createdAt: T0,
    });
  }
  return rows;
};

const partners = () => {
  const rows = [];
  for (let i = 1; i <= COUNTS.Partner; i++) {
    rows.push({
      id: ID_BASE + 700 + i,
      name: `视觉合作院校${pad(i)}`,
      logo: img(i),
      website: "https://example.com",
      sort: i,
      status: "active",
      createdAt: T0,
    });
  }
  return rows;
};

/**
 * V8-VIS-01 补充：校区图片。
 *
 * 为什么必须补：`CampusSection` 渲染的是 `campuses.flatMap(c => c.images)`，
 * **campus 本身没有关联图片时整块高度为 0**（实测 home-campus 高度 0）。
 * 只 seed Campus 而不 seed CampusImage，首页永远看不到"学院风采"区块。
 * 每个校区 2 张，与 main 口径接近。
 */
const campusImages = () => {
  const rows = [];
  for (let i = 1; i <= COUNTS.Campus; i++) {
    for (let k = 1; k <= 2; k++) {
      const n = (i - 1) * 2 + k;
      rows.push({
        id: ID_BASE + 550 + n,
        campusId: ID_BASE + 500 + i,
        image: img(n),
        caption: `视觉校区${pad(i)} 图${k}`,
        sort: k,
        createdAt: T0,
      });
    }
  }
  return rows;
};

const homeCards = () => {
  const rows = [];
  for (let i = 1; i <= COUNTS.HomeCard; i++) {
    rows.push({
      id: ID_BASE + 800 + i,
      title: `视觉卡片${pad(i)}`,
      subtitle: `副标题 ${i}`,
      icon: img(i),
      href: "/courses",
      sort: i,
      status: "active",
      createdAt: T0,
      updatedAt: T0,
    });
  }
  return rows;
};

// ── 写入 / 校验 ────────────────────────────────────────────────

const PLAN = [
  { model: "category" as const, rows: categories, key: "Category", deleteKey: "id" },
  { model: "major" as const, rows: majors, key: "Major", deleteKey: "id" },
  { model: "article" as const, rows: articles, key: "Article", deleteKey: "id" },
  { model: "course" as const, rows: courses, key: "Course", deleteKey: "id" },
  { model: "banner" as const, rows: banners, key: "Banner", deleteKey: "id" },
  { model: "campus" as const, rows: campuses, key: "Campus", deleteKey: "id" },
  // V8-VIS-01：CampusImage 不在 counts.json 基线里（main 的 dev.db 该表也没单独统计），
  // 期望值取本脚本生成数（Campus × 2），用于自检行数一致。
  { model: "campusImage" as const, rows: campusImages, key: "CampusImage", deleteKey: "id" },
  { model: "gallery" as const, rows: galleries, key: "Gallery", deleteKey: "id" },
  { model: "partner" as const, rows: partners, key: "Partner", deleteKey: "id" },
  { model: "homeCard" as const, rows: homeCards, key: "HomeCard", deleteKey: "id" },
];

async function main() {
  const checkOnly = process.argv.includes("--check");
  if (!checkOnly) {
    const created = ensurePlaceholderImages();
    console.log(`[seed-visual] 占位图：已存在跳过，新建 ${created} 张 → public/uploads/visual-fixtures/`);
  }
  const results: { table: string; expected: number; actual: number; ok: boolean }[] = [];

  for (const step of PLAN) {
    const data = step.rows();
    const delegate = (prisma as unknown as Record<string, { count: (a?: unknown) => Promise<number>; deleteMany: (a: unknown) => Promise<unknown>; createMany: (a: unknown) => Promise<unknown> }>)[step.model];

    if (!checkOnly) {
      // 幂等：先删掉本脚本负责的 id 段，再插入
      await delegate.deleteMany({ where: { id: { gte: ID_BASE, lt: ID_BASE + 1000 } } });
      await delegate.createMany({ data });
    }

    const expected = COUNTS[step.key] ?? data.length;
    const actual = await delegate.count({ where: { id: { gte: ID_BASE, lt: ID_BASE + 1000 } } });
    results.push({ table: step.key, expected, actual, ok: expected === actual });
  }

  // 报告
  console.log(`\n== seed-visual ${checkOnly ? "(check)" : "(write)"} ==`);
  console.log("table".padEnd(12), "expected".padStart(9), "actual".padStart(8), "ok");
  for (const r of results) {
    console.log(r.table.padEnd(12), String(r.expected).padStart(9), String(r.actual).padStart(8), r.ok ? "✓" : "✗");
  }

  const bad = results.filter((r) => !r.ok);
  if (bad.length) {
    console.error(`\n✗ ${bad.length} 张表行数与 counts.json 不一致`);
    process.exit(1);
  }
  console.log("\n✓ 全部表行数与 counts.json 一致");
}

main()
  .catch((e) => {
    console.error("[seed-visual] 失败：", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
