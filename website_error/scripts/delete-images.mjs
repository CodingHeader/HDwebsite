#!/usr/bin/env node
/**
 * 删除图片记录脚本
 * 安全删除 Gallery、CampusImage 记录
 */
import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

const adapter = new PrismaLibSql({ url: "file:./prisma/dev.db" });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🗑️ 开始删除图片记录...\n");

  // 1. 删除证书风采 (Gallery.category = certificate)
  console.log("=== 📜 删除证书风采记录 ===");
  const galleryDelete = await prisma.gallery.deleteMany({
    where: { category: "certificate" },
  });
  console.log(`  已删除 ${galleryDelete.count} 条 Gallery 记录`);

  // 2. 删除学院风采 (CampusImage) - 保留 Campus 主体
  console.log("\n=== 🏫 删除学院风采图片记录 ===");
  const campusImageDelete = await prisma.campusImage.deleteMany({});
  console.log(`  已删除 ${campusImageDelete.count} 条 CampusImage 记录`);
  console.log("  Campus 校区主体数据已保留");

  console.log("\n✅ 删除完成");
  console.log(`  Gallery 删除: ${galleryDelete.count}`);
  console.log(`  CampusImage 删除: ${campusImageDelete.count}`);

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error("❌ 删除失败:", err);
  await prisma.$disconnect();
  process.exit(1);
});
