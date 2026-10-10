#!/usr/bin/env node
/**
 * B6：把 DB 里各张表的 image / logo / iconImage 字段指向已经生成的 SVG。
 * 幂等。
 */
import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

const adapter = new PrismaLibSql({ url: "file:./prisma/dev.db" });
const prisma = new PrismaClient({ adapter });

const base = "/images/seed";

async function main() {
  // Banner（按 sort 顺序分配）
  const banners = await prisma.banner.findMany({ orderBy: { sort: "asc" } });
  for (let i = 0; i < banners.length; i++) {
    const image = `${base}/banner/banner-${(i % 3) + 1}.svg`;
    await prisma.banner.update({ where: { id: banners[i].id }, data: { image } });
  }

  // Partner logo
  const partnerMap = {
    "四川大学": `${base}/partner/scu.svg`,
    "西华大学": `${base}/partner/xhu.svg`,
    "成都理工大学": `${base}/partner/cdut.svg`,
    "电子科技大学": `${base}/partner/uestc.svg`,
    "西南财经大学": `${base}/partner/swufe.svg`,
    "四川师范大学": `${base}/partner/sicnu.svg`,
    "四川农业大学": `${base}/partner/sicau.svg`,
    "西南交通大学": `${base}/partner/swjtu.svg`,
  };
  for (const [name, logo] of Object.entries(partnerMap)) {
    await prisma.partner.updateMany({ where: { name }, data: { logo } });
  }

  // Campus + CampusImage
  // ⚠️ 已禁用 CampusImage 自动更新/补足 - 管理员需通过后台手动配置
  console.log("  [CampusImage] 跳过自动更新/补足，等待管理员手动配置");

  // HotMajor iconImage
  const majorMap = {
    "汉语言文学": `${base}/major/hywx.svg`,
    "学前教育": `${base}/major/xqjy.svg`,
    "会计学": `${base}/major/kjx.svg`,
    "工商管理": `${base}/major/gsgl.svg`,
    "计算机科学与技术": `${base}/major/jsjkx.svg`,
    "法学": `${base}/major/fx.svg`,
    "心理学": `${base}/major/xlx.svg`,
    "金融学": `${base}/major/jrx.svg`,
  };
  for (const [title, iconImage] of Object.entries(majorMap)) {
    await prisma.hotMajor.updateMany({
      where: { title },
      data: { iconImage, iconType: "image" },
    });
  }

  // 汇总
  const counts = {
    banner: await prisma.banner.count(),
    partner: await prisma.partner.count(),
    gallery: await prisma.gallery.count(),
    campus: await prisma.campus.count(),
    campusImage: await prisma.campusImage.count(),
    hotMajor: await prisma.hotMajor.count(),
  };
  console.log("✅ DB 资源指向已更新：");
  for (const [k, v] of Object.entries(counts)) {
    console.log(`  ${k.padEnd(12)} = ${v}`);
  }
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
