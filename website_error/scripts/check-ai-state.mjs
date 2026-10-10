import { PrismaClient } from '@prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';

const adapter = new PrismaLibSql({
  url: 'file:./prisma/dev.db',
});
const prisma = new PrismaClient({ adapter });

async function main() {
  const menus = await prisma.managerMenu.findMany({
    where: {
      OR: [
        { code: { contains: 'ai' } },
        { code: { contains: 'knowledge' } },
        { code: { contains: 'chat-scenes' } },
      ],
    },
    orderBy: { sort: 'asc' },
    include: { children: true },
  });

  console.log('AI-related menus:');
  menus.forEach((menu) => {
    console.log(`ID:${menu.id} | ${menu.code} | "${menu.label}" | level=${menu.level} | sort=${menu.sort} | path=${menu.path} | visible=${menu.isVisible} | parentId=${menu.parentId}`);
    if (menu.children && menu.children.length > 0) {
      menu.children.forEach((child) => {
        console.log(`  -> ID:${child.id} | ${child.code} | "${child.label}" | level=${child.level} | sort=${child.sort} | path=${child.path}`);
      });
    }
  });
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
