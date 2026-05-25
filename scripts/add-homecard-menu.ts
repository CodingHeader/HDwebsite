import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.managerMenu.upsert({
    where: { code: 'homecards' },
    update: {},
    create: {
      code: 'homecards',
      label: '首页卡片',
      icon: 'LayoutGrid',
      path: '/manager/homecards',
      level: 1,
      sort: 11,
      permission: 'setting:list',
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
