import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkMenus() {
  try {
    console.log('检查数据库中的菜单数据...\n');
    
    const menus = await prisma.managerMenu.findMany({
      orderBy: { sort: 'asc' },
    });
    
    console.log(`找到 ${menus.length} 个菜单项:\n`);
    
    menus.forEach(menu => {
      console.log(`ID: ${menu.id}`);
      console.log(`代码: ${menu.code}`);
      console.log(`标签: ${menu.label}`);
      console.log(`路径: ${menu.path || '无'}`);
      console.log(`层级: ${menu.level}`);
      console.log(`父ID: ${menu.parentId || '无'}`);
      console.log(`可见: ${menu.isVisible}`);
      console.log(`排序: ${menu.sort}`);
      console.log('---');
    });
    
  } catch (error) {
    console.error('查询失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkMenus();
