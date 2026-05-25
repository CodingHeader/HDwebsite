import path from "node:path";
import { readdir, stat, unlink } from "node:fs/promises";

import { BUILTIN_MEDIA_CATEGORY } from "@/lib/media-management";

export interface BuiltinMediaItem {
  id: number;
  filename: string;
  path: string;
  url: string;
  mimeType: string;
  size: number;
  type: string;
  category: string;
  createdAt: Date;
  uploader: null;
}

async function collectBuiltinImages(dir: string, urlPrefix: string): Promise<BuiltinMediaItem[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const items = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(dir, entry.name);
      const itemUrl = `${urlPrefix}/${entry.name}`.replace(/\\/g, "/");

      if (entry.isDirectory()) {
        return collectBuiltinImages(fullPath, itemUrl);
      }

      if (!/\.(png|jpe?g|gif|webp|svg)$/i.test(entry.name)) {
        return [];
      }

      const fileStat = await stat(fullPath);

      return [
        {
          id: 0,
          filename: entry.name,
          path: itemUrl,
          url: itemUrl,
          mimeType: "image/*",
          size: fileStat.size,
          type: "image",
          category: BUILTIN_MEDIA_CATEGORY,
          createdAt: fileStat.mtime,
          uploader: null,
        },
      ];
    }),
  );

  return items.flat();
}

export async function localMediaExists(url: string) {
  if (!url.startsWith("/")) {
    return true;
  }

  const fullPath = path.join(process.cwd(), "public", url.replace(/^\//, ""));

  try {
    const fileStat = await stat(fullPath);
    return fileStat.isFile();
  } catch {
    return false;
  }
}

export async function getBuiltinImages() {
  const imagesDir = path.join(process.cwd(), "public", "images");

  try {
    const builtins = await collectBuiltinImages(imagesDir, "/images");

    return builtins.map((item, index) => ({
      ...item,
      id: -(index + 1),
    }));
  } catch {
    return [];
  }
}

function toPublicFilePath(url: string) {
  if (!url.startsWith("/")) {
    return null;
  }

  const normalized = path.normalize(url).replace(/^(\.\.(\\|\/|$))+/, "");
  return path.join(process.cwd(), "public", normalized.replace(/^[\\/]/, ""));
}

export async function deleteLocalMediaByUrl(url: string) {
  const fullPath = toPublicFilePath(url);

  if (!fullPath) {
    return false;
  }

  try {
    await unlink(fullPath);
    return true;
  } catch {
    return false;
  }
}

export function extractMediaUrls(url: string, metadata?: string | null) {
  const urls = new Set<string>();

  if (url.startsWith("/")) {
    urls.add(url);
  }

  if (!metadata) {
    return Array.from(urls);
  }

  try {
    const parsed = JSON.parse(metadata) as Record<string, unknown>;
    for (const value of Object.values(parsed)) {
      if (typeof value === "string" && value.startsWith("/")) {
        urls.add(value);
      }
    }
  } catch {
    // Ignore invalid metadata and fall back to the main URL.
  }

  return Array.from(urls);
}
