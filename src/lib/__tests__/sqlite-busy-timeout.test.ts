/**
 * P04 / RISK-007：SQLite 写并发——busy_timeout（libsql Config.timeout）生效验证。
 * 事实（读 @prisma/adapter-libsql 源码 + 实测）：
 *   - 同一 PrismaClient 内所有 IO 与事务由适配器 Mutex 串行化（事务持父锁到 commit）→ 进程内不会 SQLITE_BUSY；
 *   - libsql 本地库调用为同步原生调用，busy 等待会阻塞本线程事件循环 → 锁竞争只可能来自"另一进程"
 *     （seed / migrate / 迁移脚本 / sqlite3 CLI / 多实例），busy_timeout 正是为此兜底。
 * 因此本测试：
 *   1) 进程内：同一客户端并发 20 次写 OperationLog + 调度锁 claim/release + 交互事务，全部成功；
 *   2) 跨进程：子进程以写事务持锁 ~400ms，本进程（src/lib/prisma 同配置）并发 20 写 + 调度锁全部成功；
 *   3) 对照组：timeout=0 时同样持锁下立即 SQLITE_BUSY，证明测试有区分力。
 * 临时库按 prisma/migrations 顺序建表，不依赖本地 dev.db。
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { spawn } from "node:child_process";
import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createClient } from "@libsql/client";
import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { createPrismaClient, SQLITE_BUSY_TIMEOUT_MS } from "@/lib/prisma";

// V10-T-06：三个涉子进程/真实锁竞争的用例超时 20s→40s——断言与被测 busy_timeout(5000ms) 无关，
// 只是抗 CI/shuffle 负载下子进程 spawn+import 的抖动（V9-V-01 期间该文件出现过 1 次时序 flake，
// 10 次单跑 + 4 轮 shuffle 未复现；加保险不放松任何断言）。

const dir = mkdtempSync(join(tmpdir(), "p04-busy-"));
const url = `file:${join(dir, "test.db")}`;
let a: PrismaClient;

/** 子进程持写锁 holdMs；resolve 于子进程打印 LOCKED（已持锁）时，返回值 done 于子进程提交退出时 */
function holdWriteLockInChild(holdMs: number): Promise<{ done: Promise<number> }> {
  const code = `
    import { createClient } from "@libsql/client";
    const c = createClient({ url: ${JSON.stringify(url)} });
    const tx = await c.transaction("write");
    await tx.execute("UPDATE CronJob SET lastRunAt = CURRENT_TIMESTAMP WHERE name = 'p04.hold'");
    console.log("LOCKED");
    await new Promise((r) => setTimeout(r, ${holdMs}));
    await tx.commit();
    c.close();
  `;
  const child = spawn(process.execPath, ["--input-type=module", "-e", code], { cwd: process.cwd(), stdio: ["ignore", "pipe", "pipe"] });
  const done = new Promise<number>((r) => child.on("exit", (c) => r(c ?? -1)));
  return new Promise((resolve, reject) => {
    let err = "";
    child.stderr.on("data", (d) => (err += d));
    child.stdout.on("data", (d) => {
      if (String(d).includes("LOCKED")) resolve({ done });
    });
    void done.then((c) => reject(new Error(`子进程未持锁即退出 code=${c} ${err}`)));
  });
}

async function writeBurst(client: PrismaClient, module: string) {
  const writes = Array.from({ length: 20 }, (_, i) =>
    client.operationLog.create({ data: { username: "p04", module, action: "create", title: `w${i}` } })
  );
  const lock = (async () => {
    const claimed = await client.cronJob.updateMany({ where: { name: "p04.lock", lockedAt: null }, data: { lockedAt: new Date() } });
    await client.cronJob.update({ where: { name: "p04.lock" }, data: { lockedAt: null, lastRunAt: new Date() } });
    return claimed.count;
  })();
  const tx = client.$transaction(async (t) => {
    await t.operationLog.create({ data: { username: "p04", module: `${module}-tx`, action: "create" } });
    await t.cronJob.update({ where: { name: "p04.hold" }, data: { lastRunAt: new Date() } });
  });
  const results = await Promise.allSettled([lock, tx, ...writes]);
  return results.filter((r) => r.status === "rejected").map((r) => String((r as PromiseRejectedResult).reason));
}

beforeAll(async () => {
  const raw = createClient({ url });
  const migDir = join(process.cwd(), "prisma/migrations");
  for (const m of readdirSync(migDir).filter((d) => /^\d+_/.test(d)).sort()) {
    await raw.executeMultiple(readFileSync(join(migDir, m, "migration.sql"), "utf8"));
  }
  await raw.execute("INSERT INTO CronJob (name, cron, enabled, updatedAt) VALUES ('p04.hold', '* * * * *', 1, CURRENT_TIMESTAMP), ('p04.lock', '* * * * *', 1, CURRENT_TIMESTAMP)");
  raw.close();
  a = createPrismaClient(url);
});

afterAll(async () => {
  // W0-09（DEF-X-01a）：Windows 下 libsql 关闭连接后文件句柄延迟释放——
  // 实测 close() 后立即/50/100/200/500/1000ms rmSync 均抛 EPERM（p04-busy-*/probe-libsql-*/probe-d-*）。
  // 与 api-contract/harness 的 cleanupTestDb 保持一致：删除失败可安全忽略（临时目录在 OS tmp 下兜底清理），
  // 但不得把失败抛出成 suite 级 FAIL（原实现导致 Failed Suites 1/1，Tests 全通过仍判失败）。
  await a?.$disconnect();
  try {
    rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  } catch {
    // 已知：Windows 句柄延迟释放；不阻塞断言结果
  }
});

describe("SQLite busy_timeout（RISK-007）", () => {
  it("连接配置 busy_timeout = 5000ms", async () => {
    const rows = await a.$queryRawUnsafe<{ timeout: number | bigint }[]>("PRAGMA busy_timeout");
    expect(Number(rows[0].timeout)).toBe(SQLITE_BUSY_TIMEOUT_MS);
  });

  it("进程内：同一客户端并发 20 写 + 调度锁 + 交互事务全部成功（适配器 Mutex 串行化）", async () => {
    expect(await writeBurst(a, "p04-inproc")).toEqual([]);
    expect(await a.operationLog.count({ where: { module: "p04-inproc" } })).toBe(20);
    expect((await a.cronJob.findUnique({ where: { name: "p04.lock" } }))?.lockedAt).toBeNull();
  }, 40_000);

  it("跨进程：子进程持写锁 400ms 期间，并发 20 写 + 调度锁 + 事务全部成功，无 SQLITE_BUSY", async () => {
    const { done } = await holdWriteLockInChild(400);
    const failed = await writeBurst(a, "p04-xproc");
    expect(await done).toBe(0);
    expect(failed).toEqual([]);
    expect(await a.operationLog.count({ where: { module: "p04-xproc" } })).toBe(20);
  }, 40_000);

  it("对照组：timeout=0 时子进程持锁下写入立即 SQLITE_BUSY（证明测试有区分力）", async () => {
    const noWait = new PrismaClient({ adapter: new PrismaLibSql({ url, timeout: 0 }) });
    try {
      await noWait.cronJob.findFirst();
      const { done } = await holdWriteLockInChild(400);
      const err = await noWait.operationLog
        .create({ data: { username: "p04", module: "p04-nowait", action: "create" } })
        .then(() => null, (e: unknown) => e as { meta?: unknown });
      await done;
      expect(JSON.stringify(err?.meta ?? String(err))).toMatch(/SQLITE_BUSY|database is locked/i);
    } finally {
      await noWait.$disconnect();
    }
  }, 40_000);
});
