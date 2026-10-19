/**
 * kb/manage（C-12 / WPC.3 知识库其他管理）
 * ==========================================================
 * 承载 C-12 卡的全部业务逻辑，路由层薄包装：
 *   1. batchFiles：批量 enable/disable/tag/untag/trash（契约 kbBatchSchema）
 *   2. trashAction：restore / purge（契约 kbTrashActionSchema）
 *   3. statsOf：库统计（kbStatsSchema；lastSyncAt = Knowledge.syncedAt 最大值，ADR-034）
 *   4. exportZip：导出 zip（原文件 + manifest.json；含/不含回收站）
 *   5. rebuildBase：单库重建切片（复用 C-03 管线，异步，返回 jobId）
 *   6. updateChunk：切片内容在线编辑（契约 knowledgeChunkUpdateSchema）
 *
 * 远端一致性（验收"彻底删除后远端删除被调用"）：purge 走 kb-sync.getKbRemoteAdapter().remove；
 * 远端删除失败 → 本地仍彻底删除，但回写 syncErr（不得静默成功）。
 * 未注册远端适配器 → 跳过远端（本地回收站仍生效），返回 removed=0。
 *
 * 导出 zip 不使用 jszip（jszip 仅为 mammoth 的传递依赖，package.json 冻结不可新增直接依赖）；
 * 改用 node:zlib 手写 STORE（不压缩）ZIP：crc32 计算每条 CRC32，local header/central directory/EOCD
 * 均为标准字节结构，兼容任意 ZIP 解压器。
 */
import { join } from "node:path";
import { rmSync, existsSync, readFileSync, statSync } from "node:fs";
import { crc32 } from "node:zlib";
import { prisma } from "@/lib/prisma";
import { kbDir } from "@/lib/storage";
import { parseByExt } from "@/lib/kb/parse";
import { chunkText } from "@/lib/kb/chunk";
import { getKbRemoteAdapter } from "@/lib/kb-sync";
import type { KbBatch, KbTrashAction } from "@/contracts/kb";

export const KB_BATCH_LIMIT = 100;

/** 从 KnowledgeFile.storagePath 构造磁盘绝对路径 */
function absPath(f: { storagePath: string }): string {
  return f.storagePath ? join(kbDir(), f.storagePath) : "";
}

function parseTags(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.filter((x) => typeof x === "string") : [];
  } catch {
    // 兼容历史逗号分隔
    return raw.split(",").filter(Boolean);
  }
}

function stringifyTags(tags: string[]): string {
  return JSON.stringify(tags);
}

// ── 1. 批量操作 ───────────────────────────────────────────────

export async function batchFiles(input: {
  ids: number[];
  action: KbBatch["action"];
  tags?: string[] | null;
}): Promise<{ count: number; details?: string[] }> {
  // 防御性兜底：契约 kbBatchSchema 已用 max(100) 保证 ≤100，此处在 parseBody 之外再兜底一次，
  // 防止未来有调用方直接调用 batchFiles 时绕过契约校验（当前所有入口均先走契约）
  if (input.ids.length > KB_BATCH_LIMIT) throw new Error(`批量操作一次最多 ${KB_BATCH_LIMIT} 个`);
  const where = { id: { in: input.ids }, deletedAt: null };
  const files = await prisma.knowledgeFile.findMany({ where, select: { id: true } });
  const ids = files.map((f) => f.id);
  if (!ids.length) return { count: 0 };

  switch (input.action) {
    case "enable":
    case "disable": {
      const status = input.action === "enable" ? "active" : "inactive";
      await prisma.knowledge.updateMany({ where: { fileId: { in: ids } }, data: { status } });
      return { count: ids.length };
    }
    case "tag": {
      const tags = input.tags ?? [];
      for (const id of ids) {
        const f = await prisma.knowledgeFile.findUnique({ where: { id }, select: { tags: true } });
        const merged = [...new Set([...parseTags(f?.tags), ...tags])];
        await prisma.knowledgeFile.update({ where: { id }, data: { tags: stringifyTags(merged) } });
      }
      return { count: ids.length, details: ids.map((id) => `#${id} 标签已合并`) };
    }
    case "untag": {
      const tags = input.tags ?? [];
      for (const id of ids) {
        const f = await prisma.knowledgeFile.findUnique({ where: { id }, select: { tags: true } });
        const remain = parseTags(f?.tags).filter((t) => !tags.includes(t));
        await prisma.knowledgeFile.update({ where: { id }, data: { tags: stringifyTags(remain) } });
      }
      return { count: ids.length };
    }
    case "trash": {
      await prisma.knowledgeFile.updateMany({
        where: { id: { in: ids }, deletedAt: null },
        data: { deletedAt: new Date() },
      });
      return { count: ids.length };
    }
    default:
      throw new Error(`未知批量操作：${String(input.action)}`);
  }
}

// ── 2. 回收站操作 ─────────────────────────────────────────────

export async function trashAction(input: {
  ids: number[];
  action: KbTrashAction["action"];
}): Promise<{ count: number; purgedRemote: number; syncErr?: string[] }> {
  const where = { id: { in: input.ids }, deletedAt: { not: null } };
  const files = await prisma.knowledgeFile.findMany({
    where,
    select: { id: true, storagePath: true, cozeDocumentId: true, baseId: true },
  });
  const ids = files.map((f) => f.id);

  if (input.action === "restore") {
    await prisma.knowledgeFile.updateMany({ where: { id: { in: ids } }, data: { deletedAt: null } });
    return { count: ids.length, purgedRemote: 0 };
  }

  // purge：彻底删除（本地 + 远端 Coze + 磁盘 + DB）
  const adapter = getKbRemoteAdapter();
  const syncErr: string[] = [];
  let purgedRemote = 0;
  for (const f of files) {
    // 1) 远端删除（尽力；失败记录 syncErr，但本地仍继续删除——本地回收站语义）
    if (f.cozeDocumentId && adapter?.remove) {
      try {
        await adapter.remove({ id: f.id, externalId: f.cozeDocumentId, baseId: f.baseId } as never);
        purgedRemote++;
      } catch (err) {
        syncErr.push(`#${f.id} 远端删除失败：${err instanceof Error ? err.message : String(err)}`);
      }
    }
    // 2) 删除 Knowledge 切片
    await prisma.knowledge.deleteMany({ where: { fileId: f.id } });
    // 3) 删除磁盘文件
    const p = absPath(f);
    if (p) {
      try {
        if (existsSync(p)) rmSync(p, { force: true });
      } catch {
        /* 磁盘删除尽力 */
      }
    }
    // 4) 删除 DB 记录
    await prisma.knowledgeFile.deleteMany({ where: { id: f.id } });
  }
  return { count: ids.length, purgedRemote, syncErr: syncErr.length ? syncErr : undefined };
}

// ── 3. 库统计 ─────────────────────────────────────────────────

export async function statsOf(baseId: number): Promise<{
  baseId: number;
  files: number;
  chunks: number;
  trash: number;
  cozeOk: number;
  cozeFailed: number;
  lastSyncAt: string | null;
}> {
  const [files, chunks, trash, cozeOk, cozeFailed, lastSync] = await Promise.all([
    prisma.knowledgeFile.count({ where: { baseId, deletedAt: null } }),
    prisma.knowledge.count({ where: { baseId, fileId: { not: null } } }),
    prisma.knowledgeFile.count({ where: { baseId, deletedAt: { not: null } } }),
    prisma.knowledge.count({ where: { baseId, syncStatus: "synced" } }),
    prisma.knowledge.count({ where: { baseId, syncStatus: "failed" } }),
    prisma.knowledge.findFirst({
      where: { baseId, syncedAt: { not: null } },
      orderBy: { syncedAt: "desc" },
      select: { syncedAt: true },
    }),
  ]);
  return {
    baseId,
    files,
    chunks,
    trash,
    cozeOk,
    cozeFailed,
    lastSyncAt: lastSync?.syncedAt?.toISOString() ?? null,
  };
}

// ── 4. 导出 zip（STORE 格式，node:zlib，无外部依赖）───────────

type ZipEntry = { name: string; data: Buffer; mtime: number };

/** 时间戳 → DOS time（16 位：时5 + 分6 + 秒/2 5） */
function toDosTime(t: number): number {
  const d = new Date(t);
  return (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1);
}

/** 时间戳 → DOS date（16 位：年-1980 7 + 月4 + 日5） */
function toDosDate(t: number): number {
  const d = new Date(t);
  const year = Math.max(1980, Math.min(2107, d.getFullYear()));
  return ((year - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
}

/** 单文件构建本地文件头 + 数据（STORE，CRC32 来自 node:zlib） */
function buildLocalEntry(entry: ZipEntry): Buffer {
  const name = Buffer.from(entry.name, "utf8");
  const data = entry.data;
  const crc = crc32(data) >>> 0;
  const header = Buffer.alloc(30);
  header.writeUInt32LE(0x04034b50, 0); // local file header signature
  header.writeUInt16LE(20, 4); // version needed
  header.writeUInt16LE(0, 6); // general purpose flag
  header.writeUInt16LE(0, 8); // compression method = store
  header.writeUInt16LE(toDosTime(entry.mtime), 10);
  header.writeUInt16LE(toDosDate(entry.mtime), 12);
  header.writeUInt32LE(crc, 14);
  header.writeUInt32LE(data.length, 18); // compressed size = raw
  header.writeUInt32LE(data.length, 22); // uncompressed size
  header.writeUInt16LE(name.length, 26);
  header.writeUInt16LE(0, 28); // extra length
  return Buffer.concat([header, name, data]);
}

/** 构建中央目录条目，offset 为每个 local header 的起始偏移 */
function buildCentralEntry(entry: ZipEntry, offset: number): Buffer {
  const name = Buffer.from(entry.name, "utf8");
  const crc = crc32(entry.data) >>> 0;
  const header = Buffer.alloc(46);
  header.writeUInt32LE(0x02014b50, 0);
  header.writeUInt16LE(20, 4);
  header.writeUInt16LE(20, 6);
  header.writeUInt16LE(0, 8);
  header.writeUInt16LE(0, 10);
  header.writeUInt16LE(toDosTime(entry.mtime), 12);
  header.writeUInt16LE(toDosDate(entry.mtime), 14);
  header.writeUInt32LE(crc, 16);
  header.writeUInt32LE(entry.data.length, 20);
  header.writeUInt32LE(entry.data.length, 24);
  header.writeUInt16LE(name.length, 28);
  header.writeUInt16LE(0, 30);
  header.writeUInt16LE(0, 32);
  header.writeUInt16LE(0, 34);
  header.writeUInt16LE(0, 36);
  header.writeUInt32LE(0, 38);
  header.writeUInt32LE(offset, 42);
  return Buffer.concat([header, name]);
}

function buildZip(entries: ZipEntry[]): Buffer {
  let offset = 0;
  const localParts: Buffer[] = [];
  const offsets: number[] = [];
  for (const e of entries) {
    offsets.push(offset);
    const part = buildLocalEntry(e);
    localParts.push(part);
    offset += part.length;
  }
  const centralParts: Buffer[] = [];
  for (let i = 0; i < entries.length; i++) {
    centralParts.push(buildCentralEntry(entries[i], offsets[i]));
  }
  const centralBuf = Buffer.concat(centralParts);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); // EOCD
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralBuf.length, 12);
  end.writeUInt32LE(offset, 16);
  end.writeUInt16LE(0, 20);
  return Buffer.concat([...localParts, centralBuf, end]);
}

export async function exportZip(
  baseId: number,
  opts: { includeTrash?: boolean } = {}
): Promise<{ ok: boolean; buffer?: Buffer; count: number; message?: string }> {
  const base = await prisma.knowledgeBase.findUnique({
    where: { id: baseId },
    select: { id: true, name: true, code: true },
  });
  if (!base) return { ok: false, count: 0, message: "知识库不存在" };

  const where: Record<string, unknown> = { baseId };
  if (!opts.includeTrash) where.deletedAt = null;

  const files = await prisma.knowledgeFile.findMany({ where, orderBy: { id: "asc" } });
  if (!files.length) return { ok: false, count: 0, message: "该知识库没有可导出的文件" };

  const manifest = {
    base: { id: base.id, name: base.name, code: base.code },
    exportedAt: new Date().toISOString(),
    files: [] as {
      id: number;
      filename: string;
      ext: string;
      size: number;
      sha256: string;
      storagePath: string;
      tags: string | null;
      deletedAt: string | null;
      chunkCount: number;
    }[],
  };

  const entries: ZipEntry[] = [];
  for (const f of files) {
    const p = absPath(f);
    const exists = p && existsSync(p);
    const buf = exists ? readFileSync(p) : Buffer.alloc(0);
    entries.push({
      name: `files/${f.id}/${f.filename}`,
      data: buf,
      mtime: exists ? statSync(p).mtimeMs : Date.now(),
    });
    manifest.files.push({
      id: f.id,
      filename: f.filename,
      ext: f.ext,
      size: f.size,
      sha256: f.sha256,
      storagePath: f.storagePath,
      tags: f.tags,
      deletedAt: f.deletedAt?.toISOString() ?? null,
      chunkCount: f.chunkCount,
    });
  }
  entries.push({ name: "manifest.json", data: Buffer.from(JSON.stringify(manifest, null, 2), "utf8"), mtime: Date.now() });

  return { ok: true, buffer: buildZip(entries), count: files.length };
}

// ── 5. 单库重建切片 ──────────────────────────────────────────

/** 单文件重建切片（C-03 管线：read → parseByExt → chunkText → Knowledge 覆盖） */
async function rebuildFile(fileId: number): Promise<{ chunks: number }> {
  const f = await prisma.knowledgeFile.findUnique({ where: { id: fileId } });
  if (!f) throw new Error(`KnowledgeFile#${fileId} 不存在`);
  const p = absPath(f);
  let text = "";
  if (p && existsSync(p)) {
    const buf = readFileSync(p);
    const parsed = await parseByExt(f.filename, new Uint8Array(buf));
    if (parsed.state === "ok") text = parsed.text;
  }
  const chunks = text ? chunkText(text) : [];
  await prisma.knowledge.deleteMany({ where: { fileId } });
  for (let i = 0; i < chunks.length; i++) {
    await prisma.knowledge.create({
      data: {
        baseId: f.baseId,
        fileId,
        chunkIndex: i,
        title: f.filename,
        content: chunks[i],
        tags: f.tags ?? "", // Knowledge.tags 是逗号分隔（ADR-020）
        source: "local",
        status: "active",
        syncStatus: "pending",
      },
    });
  }
  await prisma.knowledgeFile.update({
    where: { id: fileId },
    data: { chunkCount: chunks.length, localParse: "ok" },
  });
  return { chunks: chunks.length };
}

export async function rebuildBase(baseId: number): Promise<{ jobId: string }> {
  const base = await prisma.knowledgeBase.findUnique({ where: { id: baseId }, select: { id: true } });
  if (!base) throw new Error("知识库不存在");
  const jobId = `rebuild:${baseId}:${Date.now()}`;
  void (async () => {
    try {
      const files = await prisma.knowledgeFile.findMany({ where: { baseId, deletedAt: null }, select: { id: true } });
      let done = 0;
      for (const f of files) {
        try {
          await rebuildFile(f.id);
        } catch (err) {
          console.error(`[kb/manage] rebuild #${f.id} 失败：`, err);
        }
        done++;
      }
      console.info(`[kb/manage] rebuild ${baseId} 完成（${done}/${files.length}）`);
    } catch (err) {
      console.error(`[kb/manage] rebuild ${baseId} 失败：`, err);
    }
  })();
  return { jobId };
}

// ── 6. 切片在线编辑 ──────────────────────────────────────────

export async function updateChunk(chunkId: number, content: string): Promise<{ ok: boolean }> {
  const chunk = await prisma.knowledge.findUnique({ where: { id: chunkId } });
  if (!chunk) throw new Error("切片不存在");
  const fileId = chunk.fileId;
  if (!fileId) throw new Error("该切片未关联文件，不支持在线编辑");
  await prisma.knowledge.update({ where: { id: chunkId }, data: { content, syncStatus: "pending" } });
  const cnt = await prisma.knowledge.count({ where: { fileId } });
  await prisma.knowledgeFile
    .update({ where: { id: fileId }, data: { chunkCount: cnt } })
    .catch(() => undefined);
  return { ok: true };
}

/** 供测试使用：导出 zip 构建器（避免内部函数无法在单测中直接验证） */
export const __zip = { buildZip, buildLocalEntry, buildCentralEntry, toDosTime, toDosDate };