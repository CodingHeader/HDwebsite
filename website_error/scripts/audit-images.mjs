#!/usr/bin/env node
/**
 * 图片审计脚本 - 生成删除候选清单
 * 检查 Gallery、CampusImage、Media 中的图片记录
 */
import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const adapter = new PrismaLibSql({ url: "file:./prisma/dev.db" });
const prisma = new PrismaClient({ adapter });

async function fileExists(url) {
  if (!url || !url.startsWith("/")) return true;
  const fullPath = path.join(process.cwd(), "public", url.replace(/^\//, ""));
  try {
    await stat(fullPath);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  console.log("🔍 开始图片审计...\n");

  // 1. 审计证书风采 (Gallery.category = certificate)
  console.log("=== 📜 证书风采 (Gallery.category = certificate) ===");
  const galleryItems = await prisma.gallery.findMany({
    where: { category: "certificate" },
    orderBy: { sort: "asc" },
  });
  
  const galleryAudit = [];
  for (const item of galleryItems) {
    const exists = await fileExists(item.image);
    galleryAudit.push({
      id: item.id,
      title: item.title,
      image: item.image,
      status: item.status,
      fileExists: exists,
    });
    console.log(`  ID:${item.id} | ${item.title.padEnd(20)} | ${item.image} | 文件${exists ? "✅" : "❌缺失"}`);
  }
  console.log(`  总计: ${galleryItems.length} 条记录\n`);

  // 2. 审计学院风采 (CampusImage)
  console.log("=== 🏫 学院风采 (CampusImage) ===");
  const campusImages = await prisma.campusImage.findMany({
    include: { campus: { select: { name: true } } },
    orderBy: { sort: "asc" },
  });
  
  const campusImageAudit = [];
  for (const img of campusImages) {
    const exists = await fileExists(img.image);
    campusImageAudit.push({
      id: img.id,
      campusName: img.campus.name,
      caption: img.caption,
      image: img.image,
      fileExists: exists,
    });
    console.log(`  ID:${img.id} | ${img.campus.name.padEnd(10)} | ${img.caption?.padEnd(10) || ""} | ${img.image} | 文件${exists ? "✅" : "❌缺失"}`);
  }
  console.log(`  总计: ${campusImages.length} 条记录\n`);

  // 3. 审计关联 Media 记录
  console.log("=== 📁 关联 Media 记录 ===");
  const allImages = [
    ...galleryItems.map(g => g.image),
    ...campusImages.map(c => c.image),
  ];
  
  const mediaRecords = await prisma.media.findMany({
    where: {
      OR: [
        { url: { in: allImages } },
        { path: { in: allImages } },
      ],
    },
  });
  console.log(`  找到 ${mediaRecords.length} 条关联 Media 记录\n`);

  // 4. 输出删除候选清单
  const deleteCandidates = {
    gallery: galleryItems.map(g => ({
      id: g.id,
      title: g.title,
      image: g.image,
      reason: "证书风采待清理",
    })),
    campusImages: campusImages.map(c => ({
      id: c.id,
      campusName: c.campus.name,
      caption: c.caption,
      image: c.image,
      reason: "学院风采待清理",
    })),
    media: mediaRecords.map(m => ({
      id: m.id,
      filename: m.filename,
      url: m.url || m.path,
      reason: "关联图片待清理",
    })),
  };

  // 写入审计文档
  const auditResult = {
    timestamp: new Date().toISOString(),
    summary: {
      galleryCount: galleryItems.length,
      campusImageCount: campusImages.length,
      mediaCount: mediaRecords.length,
    },
    galleryAudit,
    campusImageAudit,
    deleteCandidates,
  };

  console.log("=== 📊 审计摘要 ===");
  console.log(`  证书风采记录: ${galleryItems.length}`);
  console.log(`  学院风采记录: ${campusImages.length}`);
  console.log(`  关联 Media: ${mediaRecords.length}`);
  console.log(`\n✅ 审计完成`);

  await prisma.$disconnect();
  return auditResult;
}

main().then(result => {
  // 输出 JSON 供后续处理
  console.log("\n=== JSON 输出 ===");
  console.log(JSON.stringify(result, null, 2));
}).catch(async (err) => {
  console.error("❌ 审计失败:", err);
  await prisma.$disconnect();
  process.exit(1);
});
