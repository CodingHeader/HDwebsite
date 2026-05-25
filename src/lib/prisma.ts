import { PrismaClient } from '.prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';

// 导出事务客户端类型（使用 any 避免类型问题）
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type TransactionClient = any;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const globalForPrisma = globalThis as unknown as {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  prisma: any | undefined;
};

const databaseUrl = process.env.DATABASE_URL || 'file:./prisma/dev.db';

const adapter = new PrismaLibSql({
  url: databaseUrl,
});

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
