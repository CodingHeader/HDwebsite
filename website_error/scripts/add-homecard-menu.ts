import { PrismaClient } from '@prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';

const adapter = new PrismaLibSql({
  url: 'file:./prisma/dev.db',
});
const prisma = new PrismaClient({ adapter });

async function main() {
  await prisma.managerMenu.upsert({
    where: { code: 'homecards' },
    update: { path: '/manager/home-cards', sort: 7 },
    create: {
      code: 'homecards',
      label: '首页卡片',
      icon: 'LayoutGrid',
      path: '/manager/home-cards',
      level: 1,
      sort: 7,
      permission: 'content:edit',
    },
  });
  console.log('HomeCards menu added successfully');
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
