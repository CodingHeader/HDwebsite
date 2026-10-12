import { PrismaClient } from '@prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';

export type TransactionClient = Parameters<Parameters<PrismaClient['$transaction']>[0]>[0];

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

/**
 * SQLite 写锁等待（RISK-007，P04）：libsql 本地 file: 库默认遇锁立即 SQLITE_BUSY。
 * @libsql/client Config.timeout = 每个连接的 busy_timeout（毫秒，等价 `PRAGMA busy_timeout = 5000`，
 * 对 transaction() 内部新建连接同样生效；远端库忽略）。调度锁与请求写并发时等待而不是失败。
 */
export const SQLITE_BUSY_TIMEOUT_MS = 5000;

/** 构造 Prisma 客户端（导出供测试在临时库上复用同一配置） */
export function createPrismaClient(url: string = process.env.DATABASE_URL || 'file:./prisma/dev.db'): PrismaClient {
  const adapter = new PrismaLibSql({ url, timeout: SQLITE_BUSY_TIMEOUT_MS });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
