// 检查 DB 中所有模块 image 字段 vs 实际文件是否存在
import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import fs from "node:fs";
import path from "node:path";

const adapter = new PrismaLibSql({ url: "file:./prisma/dev.db" });
const prisma = new PrismaClient({ adapter });

const ROOT = path.resolve(process.cwd(), "public");

function check(rel) {
  if (!rel) return "[NULL]";
  if (rel.startsWith("http")) return "[external]";
  const abs = path.join(ROOT, rel.startsWith("/") ? rel.slice(1) : rel);
  try {
    const st = fs.statSync(abs);
    return `OK ${st.size}B`;
  } catch {
    return "❌ MISSING";
  }
}

async function main() {
  const [partners, majors, gallery, campusImages, banners] = await Promise.all([
    prisma.partner.findMany({ where: { status: "active" } }),
    prisma.hotMajor.findMany({ where: { status: "active" } }),
    prisma.gallery.findMany({ where: { status: "active" } }),
    prisma.campusImage.findMany(),
    prisma.banner.findMany({ where: { status: "active" } }),
  ]);

  console.log("\n=== Partner.logo ===");
  partners.forEach((p) => console.log(`  ${p.name.padEnd(20)} ${p.logo || "[null]"} → ${check(p.logo)}`));

  console.log("\n=== HotMajor.iconImage (iconType=image 才用) ===");
  majors.forEach((m) => console.log(`  ${(m.title || "?").padEnd(20)} type=${m.iconType} img=${m.iconImage || "[null]"} → ${check(m.iconImage)}`));

  console.log("\n=== Gallery.image ===");
  gallery.forEach((g) => console.log(`  ${g.title.padEnd(30)} ${g.image || "[null]"} → ${check(g.image)}`));

  console.log("\n=== CampusImage.image ===");
  campusImages.forEach((c) => console.log(`  #${c.id} ${c.image || "[null]"} → ${check(c.image)}`));

  console.log("\n=== Banner.image ===");
  banners.forEach((b) => console.log(`  #${b.id} ${b.image || "[null]"} → ${check(b.image)}`));

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
