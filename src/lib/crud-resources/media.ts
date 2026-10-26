/*
 * crudSpecs · 媒体库域（W0-02 切分自 crud-resources.ts；仅搬迁，无行为变化）
 * D-11：新增 afterDelete 钩子，单删时清理原图 + thumb/small/medium 缩略图文件。
 */
import type { CrudSpec } from "@/lib/crud";
import { prisma } from "@/lib/prisma";
import { resolveInside, uploadsDir, detectUploadMagic } from "@/lib/storage";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";

const BUILTIN_MIME_BY_EXT: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  mp4: "video/mp4",
  pdf: "application/pdf",
};

/** 物理删除一个 media 记录对应的全部文件（原图 + 缩略图）；文件不存在静默跳过 */
export function removeMediaFiles(row: { path?: string | null; metadata?: string | null }): void {
  const uploadsRoot = uploadsDir();
  const candidates: string[] = [];
  if (row.path) candidates.push(row.path);
  if (row.metadata) {
    try {
      const meta = JSON.parse(row.metadata) as { thumb?: string; small?: string; medium?: string };
      for (const key of ["thumb", "small", "medium"] as const) {
        const u = meta[key];
        if (typeof u === "string" && u.startsWith("/uploads/")) candidates.push(u.slice("/uploads/".length));
      }
    } catch {
      /* metadata 非 JSON 时忽略缩略图清理 */
    }
  }
  for (const rel of candidates) {
    // 安全：必须落在 uploads 根内；违规路径跳过该项继续清理其余（不整体中断）
    let abs: string;
    try {
      abs = resolveInside(uploadsRoot, rel.replace(/^\/+/, ""));
    } catch {
      console.error("[media] 跳过违规路径：", rel);
      continue;
    }
    if (existsSync(abs)) {
      try {
        rmSync(abs, { force: true });
      } catch (err) {
        console.error("[media] 删除文件失败（不阻断）：", abs, err);
      }
    }
  }
}

function mediaFileExists(url: string | null): boolean {
  if (!url) return false;
  if (url.startsWith("/uploads/")) {
    const rel = url.slice("/uploads/".length);
    try {
      return existsSync(resolveInside(uploadsDir(), rel));
    } catch {
      return false;
    }
  }
  try {
    return existsSync(path.join(process.cwd(), "public", decodeURIComponent(url)));
  } catch {
    return false;
  }
}

export function withMissingFiles(rows: { id: number; url?: string | null }[]): ({ missing: boolean } & { id: number; url?: string | null })[] {
  return rows.map((row) => ({ ...row, missing: !mediaFileExists(row.url ?? null) }));
}

type BuiltinAsset = {
  publicUrl: string;
  path: string;
  size: number;
  type: string;
};

function scanPublicImages(root: string): BuiltinAsset[] {
  if (!existsSync(root)) return [];
  const result: BuiltinAsset[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const abs = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(abs);
      else if (BUILTIN_MIME_BY_EXT[entry.name.toLowerCase().slice(entry.name.lastIndexOf(".") + 1)]) {
        const stat = statSync(abs);
        const rel = path.relative(process.cwd(), abs).split(path.sep).join("/");
        result.push({ publicUrl: `/${rel}`, path: abs, size: stat.size, type: path.extname(entry.name).slice(1).toLowerCase() });
      }
    }
  };
  walk(root);
  return result;
}

export async function importBuiltinsIntoMedia(seedAssets?: BuiltinAsset[]): Promise<{ total: number; created: { id: number; filename: string; url: string }[]; skipped: { id: number; filename: string; url: string }[]; failed: string[] }> {
  const assets = seedAssets ?? scanPublicImages(path.join(process.cwd(), "public", "images"));
  const normalizePublicUrl = (raw: string) => {
    let value = raw.replace(/^\//, "").split(/[\\/]+/).join("/");
    if (value.startsWith("public/")) value = value.slice("public/".length);
    return `/${value}`;
  };
  const existing = await prisma.media.findMany({ select: { id: true, url: true, filename: true } });
  const byUrl = new Map(existing.map((row) => [normalizePublicUrl(row.url), row]));
  const uploadsRoot = uploadsDir();
  const created: { id: number; filename: string; url: string }[] = [];
  const skipped: { id: number; filename: string; url: string }[] = [];
  const failed: string[] = [];

  for (const asset of assets) {
    const publicUrl = normalizePublicUrl(asset.publicUrl);
    const ext = path.extname(publicUrl).slice(1).toLowerCase();
    const mime = BUILTIN_MIME_BY_EXT[ext];
    if (!mime) {
      failed.push(`${publicUrl}：不支持的文件类型`);
      continue;
    }
    if (!existsSync(asset.path)) continue;
    const existingUrl = byUrl.get(publicUrl);
    if (existingUrl) {
      skipped.push({ id: existingUrl.id, filename: existingUrl.filename, url: existingUrl.url });
      continue;
    }
    try {
      const head = new Uint8Array(readFileSync(asset.path).subarray(0, 16));
      const detected = detectUploadMagic(head);
      if (detected !== mime) {
        failed.push(`${publicUrl}：文件内容与类型不符`);
        continue;
      }
      const destRel = `builtin/public_${publicUrl.replace(/^\//, "").split("/").join("_")}`;
      const destAbs = resolveInside(uploadsRoot, destRel);
      const destDir = path.dirname(destAbs);
      mkdirSync(destDir, { recursive: true });
      writeFileSync(destAbs, readFileSync(asset.path));
      const row = await prisma.media.create({
        data: {
          filename: path.basename(publicUrl),
          path: destRel.split(path.sep).join("/"),
          url: publicUrl,
          mimeType: mime,
          size: asset.size,
          type: mime.startsWith("image/") ? "image" : mime.startsWith("video/") ? "video" : "document",
          category: "内置资源",
        },
      });
      created.push({ id: row.id, filename: row.filename, url: row.url });
    } catch (err) {
      failed.push(`${publicUrl}：${err instanceof Error ? err.message : "导入失败"}`);
    }
  }
  return { total: assets.length, created, skipped, failed };
}

export const mediaSpecs: Record<string, CrudSpec> = {
  media: {
    model: 'media',
    permission: 'media',
    label: '媒体',
    searchFields: ['filename'],
    filters: { type: 'string', category: 'string' },
    orderBy: [{ id: 'desc' }],
    include: { uploader: { select: { id: true, username: true } } },
    mapList: (rows) => Promise.resolve(withMissingFiles(rows as { id: number; url?: string | null }[])),
    afterDelete: async (existing) => {
      removeMediaFiles(existing as { path?: string | null; metadata?: string | null });
    },
  },
};
