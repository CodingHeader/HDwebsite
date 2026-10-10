#!/usr/bin/env node
/**
 * AI智能菜单迁移脚本
 * 1. 隐藏旧 ai-config 一级直出菜单
 * 2. 创建 ai-smart 一级分组菜单
 * 3. 创建三个二级子菜单：模型配置/知识库/对话场景
 */
import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

const adapter = new PrismaLibSql({ url: "file:./prisma/dev.db" });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🚀 开始 AI 智能菜单迁移...\n");

  // Step 1: 隐藏旧 ai-config 菜单
  try {
    const oldMenu = await prisma.managerMenu.update({
      where: { code: "ai-config" },
      data: { isVisible: false },
    });
    console.log(`✅ 旧菜单已隐藏: ${oldMenu.code} / "${oldMenu.label}" (ID:${oldMenu.id})`);
  } catch (err) {
    console.log("⚠️ 旧 ai-config 菜单不存在或已隐藏，跳过");
  }

  // Step 2: 创建 AI智能 一级分组菜单
  const aiSmartMenu = await prisma.managerMenu.upsert({
    where: { code: "ai-smart" },
    update: {
      label: "AI智能",
      icon: "Bot",
      path: null,
      level: 1,
      sort: 99,
      isVisible: true,
    },
    create: {
      code: "ai-smart",
      label: "AI智能",
      icon: "Bot",
      path: null,
      level: 1,
      sort: 99,
      isVisible: true,
    },
  });
  console.log(`✅ AI智能分组菜单已创建/更新: ID=${aiSmartMenu.id}, code=${aiSmartMenu.code}`);

  // Step 3: 创建三个二级子菜单
  const subMenus = [
    {
      code: "model-configs",
      label: "模型配置",
      icon: "Bot",
      path: "/manager/model-configs",
      sort: 1,
      permission: "setting:list",
    },
    {
      code: "knowledge",
      label: "知识库",
      icon: "BookOpen",
      path: "/manager/knowledge",
      sort: 2,
      permission: "setting:list",
    },
    {
      code: "chat-scenes",
      label: "对话场景",
      icon: "MessageSquare",
      path: "/manager/chat-scenes",
      sort: 3,
      permission: "setting:list",
    },
  ];

  for (const menu of subMenus) {
    const created = await prisma.managerMenu.upsert({
      where: { code: menu.code },
      update: {
        ...menu,
        parentId: aiSmartMenu.id,
        level: 2,
      },
      create: {
        ...menu,
        parentId: aiSmartMenu.id,
        level: 2,
      },
    });
    console.log(`✅ 子菜单已创建/更新: ${created.code} / "${created.label}" → ${created.path} (ID:${created.id})`);
  }

  // Step 4: 验证结果
  const verifyMenus = await prisma.managerMenu.findMany({
    where: { parentId: aiSmartMenu.id },
    orderBy: { sort: "asc" },
  });
  console.log(`\n📋 AI智能分组下共 ${verifyMenus.length} 个子菜单：`);
  verifyMenus.forEach((m) => {
    console.log(`   - ${m.code} / "${m.label}" → ${m.path}`);
  });

  // 检查旧菜单状态
  const oldAiConfig = await prisma.managerMenu.findUnique({
    where: { code: "ai-config" },
  });
  if (oldAiConfig) {
    console.log(`\n🔒 旧菜单状态: ${oldAiConfig.code} / "${oldAiConfig.label}" | isVisible=${oldAiConfig.isVisible}`);
  }

  await prisma.$disconnect();
  console.log("\n🎉 迁移完成！");
}

main().catch(async (err) => {
  console.error("❌ 迁移失败:", err);
  await prisma.$disconnect();
  process.exit(1);
});
