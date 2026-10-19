/**
 * C-12：知识库导出 zip（`/api/knowledge-bases/[id]/export`，权限 kb:list，鉴权下载）。
 * - GET：把该库全部文件（含 manifest.json）打包为 ZIP；includeTrash=1 时含回收站文件
 * - zip 由 kb/manage.exportZip 用 node:zlib 手写 STORE 格式生成，无外部依赖（jszip 非直接依赖，package.json 冻结）
 * - 响应 Content-Type: application/zip，文件名含库 code 与日期
 */
import { withApi, parseId } from "@/lib/api-handler";
import { exportZip } from "@/lib/kb/manage";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { id: string };

/** GET /api/knowledge-bases/[id]/export?includeTrash=1 */
export const GET = withApi<Params>(
  async ({ request, params }) => {
    const id = parseId(params.id);
    const base = await prisma.knowledgeBase.findUnique({ where: { id }, select: { name: true, code: true } });
    if (!base) {
      return new Response(JSON.stringify({ code: 404, message: "知识库不存在" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }
    const url = new URL(request.url);
    const includeTrash = url.searchParams.get("includeTrash") === "1" || url.searchParams.get("includeTrash") === "true";
    const res = await exportZip(id, { includeTrash });
    if (!res.ok || !res.buffer) {
      return new Response(JSON.stringify({ code: 400, message: res.message ?? "导出失败" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    const safeName = base.code || base.name || `kb-${id}`;
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    // RFC 5987：filename 用 ASCII 兼容的 sanitize，filename* 用 UTF-8'' 编码（code 通常为 ASCII，
    // 若 code 含非 ASCII 字符，则 filename 回退为 kb-<id>，完整名称只放 filename*）
    const asciiName = /^[\x20-\x7E]+$/.test(safeName) ? safeName : `kb-${id}`;
    const filename = `${asciiName}-${date}.zip`;
    // Buffer 是 Uint8Array 子类，直接作为 BodyInit 使用；类型断言以兼容 TS lib 定义
    return new Response(res.buffer as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${asciiName}-${date}.zip"; filename*=UTF-8''${encodeURIComponent(filename)}`,
        "Content-Length": String(res.buffer.length),
        "Cache-Control": "no-store",
      },
    });
  },
  { permission: "kb:list", errorMessage: "导出知识库失败", route: "knowledge-bases/GET:id/export" }
);