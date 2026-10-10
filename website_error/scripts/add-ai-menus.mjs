#!/usr/bin/env node
/**
 * 为后台添加 知识库 + 对话场景 两个菜单项，挂到 AI 配置下级（若无则建一个 AI 分组）
 * 一次性脚本，执行完可删
 */
import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

const adapter = new PrismaLibSql({ url: "file:./prisma/dev.db" });
const prisma = new PrismaClient({ adapter });

async function main() {
  // 把原"AI 配置"一级菜单升级为分组
  const aiGroup = await prisma.managerMenu.upsert({
    where: { code: "ai-config" },
    update: { label: "AI 智能", icon: "Bot", path: null, level: 1, sort: 9 },
    create: {
      code: "ai-config",
      label: "AI 智能",
      icon: "Bot",
      path: null,
      level: 1,
      sort: 9,
    },
  });

  // 原本直接指向 /manager/ai-config 的项变成子菜单：模型配置
  await prisma.managerMenu.upsert({
    where: { code: "ai-config-models" },
    update: {
      parentId: aiGroup.id,
      level: 2,
      label: "模型配置",
      icon: "Bot",
      path: "/manager/ai-config",
      permission: "setting:list",
      sort: 1,
    },
    create: {
      code: "ai-config-models",
      parentId: aiGroup.id,
      level: 2,
      label: "模型配置",
      icon: "Bot",
      path: "/manager/ai-config",
      permission: "setting:list",
      sort: 1,
    },
  });

  await prisma.managerMenu.upsert({
    where: { code: "knowledge" },
    update: {
      parentId: aiGroup.id,
      level: 2,
      label: "知识库",
      icon: "BookOpen",
      path: "/manager/knowledge",
      permission: "setting:list",
      sort: 2,
    },
    create: {
      code: "knowledge",
      parentId: aiGroup.id,
      level: 2,
      label: "知识库",
      icon: "BookOpen",
      path: "/manager/knowledge",
      permission: "setting:list",
      sort: 2,
    },
  });

  await prisma.managerMenu.upsert({
    where: { code: "chat-scenes" },
    update: {
      parentId: aiGroup.id,
      level: 2,
      label: "对话场景",
      icon: "MessageSquare",
      path: "/manager/chat-scenes",
      permission: "setting:list",
      sort: 3,
    },
    create: {
      code: "chat-scenes",
      parentId: aiGroup.id,
      level: 2,
      label: "对话场景",
      icon: "MessageSquare",
      path: "/manager/chat-scenes",
      permission: "setting:list",
      sort: 3,
    },
  });

  const list = await prisma.managerMenu.findMany({
    where: { parentId: aiGroup.id },
    orderBy: { sort: "asc" },
  });
  console.log(`✅ AI 分组下共 ${list.length} 项：`);
  list.forEach((m) => console.log(`  - ${m.code} / ${m.label} → ${m.path}`));

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
