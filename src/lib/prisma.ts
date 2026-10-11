import { PrismaClient } from '@prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';

export type TransactionClient = Parameters<Parameters<PrismaClient['$transaction']>[0]>[0];

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

const databaseUrl = process.env.DATABASE_URL || 'file:./prisma/dev.db';

const adapter = new PrismaLibSql({
  url: databaseUrl,
});

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
