import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // 检查当前值
  const before = await prisma.managerMenu.findUnique({
    where: { code: 'conversations' }
  });
  console.log('Before:', before?.label, 'Hex:', Buffer.from(before?.label || '').toString('hex'));

  // 修复 conversations 菜单标签
  const result = await prisma.managerMenu.updateMany({
    where: { code: 'conversations' },
    data: { label: '对话日志' }
  });
  
  console.log('Updated count:', result.count);
  
  // 验证
  const after = await prisma.managerMenu.findUnique({
    where: { code: 'conversations' }
  });
  
  console.log('After:', after?.label, 'Hex:', Buffer.from(after?.label || '').toString('hex'));
  
  // 检查是否还有其他乱码菜单
  const allMenus = await prisma.managerMenu.findMany();
  const corrupted = allMenus.filter(m => {
    const hex = Buffer.from(m.label).toString('hex');
    // GBK 编码的中文字符范围检查
    return hex.match(/b[0-9a-f]{2}d[0-9a-f]{2}/i);
  });
  
  if (corrupted.length > 0) {
    console.log('Other corrupted menus:', corrupted.map(m => ({ code: m.code, label: m.label })));
  } else {
    console.log('All menus are UTF-8 encoded.');
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
