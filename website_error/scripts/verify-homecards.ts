import { PrismaClient } from '@prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';

const adapter = new PrismaLibSql({
  url: 'file:./prisma/dev.db',
});
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('=== 首页卡片数据验证 ===\n');
  
  const cards = await prisma.homeCard.findMany({ orderBy: { sort: 'asc' } });
  
  console.log(`数据库中共有 ${cards.length} 张卡片\n`);
  
  for (const card of cards) {
    console.log(`[${card.id}] ${card.title} (${card.status})`);
    console.log(`  - backgroundImage: ${card.backgroundImage ?? '(null)'}`);
    console.log(`  - backgroundType: ${card.backgroundType}`);
    console.log(`  - description: ${card.description ?? '(null)'}`);
    console.log(`  - badge: ${card.badge ?? '(null)'}`);
    console.log(`  - showIcon: ${card.showIcon}, showTitle: ${card.showTitle}, showSubtitle: ${card.showSubtitle}`);
    console.log(`  - showArrow: ${card.showArrow}, showDecoration: ${card.showDecoration}`);
    console.log(`  - textAlign: ${card.textAlign}`);
    console.log('');
  }

  // 检查菜单
  const menus = await prisma.managerMenu.findMany({ 
    where: { level: 1 }, 
    orderBy: { sort: 'asc' } 
  });
  
  console.log('=== 后台菜单验证 ===\n');
  for (const menu of menus) {
    console.log(`${menu.sort}. ${menu.label} (${menu.code}) → ${menu.path}`);
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
