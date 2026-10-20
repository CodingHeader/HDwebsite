#!/usr/bin/env node
/**
 * D-11 · scan-orphan-uploads：扫描 uploads 下的孤儿文件（磁盘有文件但 DB 无 media 记录）。
 *
 * 用法：node scripts/scan-orphan-uploads.mjs [--apply]
 *   - 默认 dry-run：只报告计数与样本路径，不删除任何文件。
 *   - --apply：对孤儿文件执行 rmSync（默认仍不推荐；建议先 dry-run 人工核对）。
 *
 * 判定：uploads/ 下每个文件（递归）：
 *   - 去掉磁盘根前缀得到 rel；
 *   - DB 中 media.path === rel 或 media.metadata 里 /uploads/<rel> 命中 → 已登记；
 *   - 否则为孤儿。
 *
 * 退出码：0 = 扫描完成（无论是否有孤儿）；1 = 参数错误或执行阶段异常。
 */
import { readdirSync, statSync, rmSync, existsSync } from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

const APPLY = process.argv.includes("--apply");

const adapter = new PrismaLibSql({ url: process.env.DATABASE_URL || "file:./prisma/dev.db" });
const prisma = new PrismaClient({ adapter });

/** 递归列出目录下所有文件（相对路径） */
function walkFiles(rootAbs, dirAbs = rootAbs, prefix = "") {
  const out = [];
  for (const name of readdirSync(dirAbs)) {
    const abs = path.join(dirAbs, name);
    const rel = prefix ? `${prefix}/${name}` : name;
    const st = statSync(abs);
    if (st.isDirectory()) out.push(...walkFiles(rootAbs, abs, rel));
    else if (st.isFile()) out.push(rel);
  }
  return out;
}

async function main() {
  const uploadsRoot = path.resolve(process.env.DATA_DIR ? process.env.DATA_DIR : process.cwd(), "uploads");
  if (!existsSync(uploadsRoot)) {
    console.log(`[scan-orphan] uploads 根不存在：${uploadsRoot}`);
    process.exit(0);
  }

  const files = walkFiles(uploadsRoot);
  console.log(`[scan-orphan] 磁盘文件总数 = ${files.length}`);

  // 构建已登记集合：media.path + metadata 里的 /uploads/xxx
  const media = await prisma.media.findMany({
    select: { path: true, metadata: true },
  });
  const registered = new Set();
  for (const m of media) {
    if (m.path) registered.add(m.path.replace(/^\/+/, ""));
    if (m.metadata) {
      try {
        const meta = JSON.parse(m.metadata);
        for (const k of ["thumb", "small", "medium"]) {
          const u = meta?.[k];
          if (typeof u === "string" && u.startsWith("/uploads/")) registered.add(u.slice("/uploads/".length));
        }
      } catch {
        /* metadata 非 JSON */
      }
    }
  }
  console.log(`[scan-orphan] DB 已登记路径数 = ${registered.size}`);

  const orphans = files.filter((f) => !registered.has(f.replace(/\\/g, "/")));
  console.log(`[scan-orphan] 孤儿文件数 = ${orphans.length}`);
  if (orphans.length > 0) {
    console.log("[scan-orphan] 孤儿样本（最多 20 条）：");
    for (const o of orphans.slice(0, 20)) console.log(`  ${o}`);
  }

  if (APPLY && orphans.length > 0) {
    console.log(`[scan-orphan] 执行删除 ${orphans.length} 个孤儿文件…`);
    let removed = 0;
    for (const rel of orphans) {
      const abs = path.join(uploadsRoot, rel);
      if (existsSync(abs)) {
        rmSync(abs, { force: true });
        removed++;
      }
    }
    console.log(`[scan-orphan] 已删除 ${removed} 个`);
  } else if (!APPLY) {
    console.log("[scan-orphan] dry-run：未删除任何文件。使用 --apply 才执行清理。");
  }
}

main()
  .catch((err) => {
    console.error("[scan-orphan] 执行异常：", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());