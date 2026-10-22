/**
 * 文件直读服务（/uploads/:path* rewrite 目标）
 * 安全（R6）：路径规范化后必须仍位于 uploads 根内（防穿越）；扩展名白名单映射 Content-Type
 * D-09：uploads 根经 storage.uploadsDir() 解析（DATA_DIR 化），与 cwd 解耦。
 * V8-T-04：迁入 withApi（统一异常映射）。本路由返回**原始字节流**而非 JSON 信封，
 *   withApi 只负责包装与异常捕获，handler 直接 return Response 即可，响应语义不变。
 */
import { existsSync, statSync, createReadStream } from "node:fs";
import path from "node:path";
import { uploadsDir } from "@/lib/storage";
import { withApi } from "@/lib/api-handler";
import type { ReadableStream as WebReadableStream } from "node:stream/web";
import { Readable } from "node:stream";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CONTENT_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png",
  ".webp": "image/webp", ".gif": "image/gif", ".mp4": "video/mp4",
  ".pdf": "application/pdf",
};

type Params = { path: string[] };

export const GET = withApi<Params>(
  async ({ params }) => {
    const { path: parts } = params;
    if (!parts?.length || parts.some((p) => p === ".." || p.includes("\\") || p.startsWith("."))) {
      return new Response("Not found", { status: 404 });
    }
    const uploadRoot = uploadsDir();
    const abs = path.resolve(uploadRoot, ...parts);
    if (!abs.startsWith(uploadRoot + path.sep) || !existsSync(abs) || !statSync(abs).isFile()) {
      return new Response("Not found", { status: 404 });
    }
    const ext = path.extname(abs).toLowerCase();
    const contentType = CONTENT_TYPES[ext] ?? "application/octet-stream";
    const size = statSync(abs).size;
    const stream = Readable.toWeb(createReadStream(abs)) as WebReadableStream<Uint8Array>;
    return new Response(stream as unknown as ReadableStream, {
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(size),
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  },
  { errorMessage: "文件读取失败", route: "file/GET" }
);
