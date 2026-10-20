/*
 * crudSpecs · 媒体库域（W0-02 切分自 crud-resources.ts；仅搬迁，无行为变化）
 * D-11：新增 afterDelete 钩子，单删时清理原图 + thumb/small/medium 缩略图文件。
 */
import type { CrudSpec } from "@/lib/crud";
import { resolveInside, uploadsDir } from "@/lib/storage";
import { existsSync, rmSync } from "node:fs";

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

export const mediaSpecs: Record<string, CrudSpec> = {
  media: {
    model: 'media',
    permission: 'media',
    label: '媒体',
    searchFields: ['filename'],
    filters: { type: 'string' },
    orderBy: [{ id: 'desc' }],
    include: { uploader: { select: { id: true, username: true } } },
    afterDelete: async (existing) => {
      removeMediaFiles(existing as { path?: string | null; metadata?: string | null });
    },
  },
};
