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
  const campusSlugMap = {
    "大石西路总校": "dashixi",
    "双店路分校": "shuangdian",
  };
  for (const [name, slug] of Object.entries(campusSlugMap)) {
    const campus = await prisma.campus.findFirst({ where: { name } });
    if (!campus) continue;
    const imgs = await prisma.campusImage.findMany({
      where: { campusId: campus.id },
      orderBy: { sort: "asc" },
    });
    for (let i = 0; i < imgs.length; i++) {
      const image = `${base}/campus/${slug}-${((i % 3) + 1)}.svg`;
      await prisma.campusImage.update({
        where: { id: imgs[i].id },
        data: { image, caption: `${name} · 实景 ${i + 1}` },
      });
    }
    // 若少于 3 张，补足
    if (imgs.length < 3) {
      for (let i = imgs.length; i < 3; i++) {
        await prisma.campusImage.create({
          data: {
            campusId: campus.id,
            image: `${base}/campus/${slug}-${i + 1}.svg`,
            caption: `${name} · 实景 ${i + 1}`,
            sort: i,
          },
        });
      }
    }
  }

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
