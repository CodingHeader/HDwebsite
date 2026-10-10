import { PrismaClient } from '@prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';

const adapter = new PrismaLibSql({
  url: 'file:./prisma/dev.db',
});
const prisma = new PrismaClient({ adapter });

async function main() {
  const menus = await prisma.managerMenu.findMany({
    where: { level: 1 },
    orderBy: { sort: 'asc' },
  });
  
  console.log('Current menu order:');
  menus.forEach(menu => {
    console.log(`${menu.sort}. ${menu.label} (${menu.code}) - path: ${menu.path}`);
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
