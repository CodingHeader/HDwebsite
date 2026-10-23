/**
 * C-06：知识库文件列表 + multipart 上传（`/api/knowledge-files`，权限 kb:list / kb:create）。
 * - GET：默认排除软删除（deletedAt IS NULL）；`trash=1` 只返回软删除行（回收站视图，V9-E2E-01
 *   修复——原实现硬编码 deletedAt:null 且忽略 trash 参数，回收站页恒为空，e2e 首跑暴露）；
 *   分页 + baseId/keyword 过滤
 * - POST：multipart，字段名 = 契约 KB_UPLOAD_FIELD（"files"），单次 ≤ KB_MAX_FILES_PER_UPLOAD（10）
 *   - 三重校验（checkIngestFile）：.pdf/.png/.jpg（含伪装）→ 400 + KB_REJECT_MESSAGE
 *   - .md/.docx/.txt → 入库并返回 KnowledgeFile + chunkCount > 0
 *   - 重复上传（同 baseId + sha256）→ 200，status="existing"
 */
import { created, error, success } from "@/lib/api-response";
import { ApiHttpError, parseQuery, withApi } from "@/lib/api-handler";
import { listQuerySchema } from "@/contracts";
import { KB_MAX_FILES_PER_UPLOAD, KB_UPLOAD_FIELD } from "@/contracts/kb";
import { checkIngestFile, ingestFile } from "@/lib/kb/ingest";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/knowledge-files */
export const GET = withApi(
  async ({ request }) => {
    const url = new URL(request.url);
    const { page, limit, keyword } = parseQuery(request, listQuerySchema);
    const baseIdRaw = url.searchParams.get("baseId");
    // trash 视图开关：与 baseId 一样走 searchParams 直读（契约 listQuerySchema 不含该可选参数，
    // 不触冻结契约面）。默认行为不变：只返回未删除行。
    const isTrashView = url.searchParams.get("trash") === "1";
    const where: Record<string, unknown> = isTrashView ? { deletedAt: { not: null } } : { deletedAt: null };
    if (baseIdRaw) {
      const n = Number(baseIdRaw);
      if (!Number.isFinite(n)) throw new ApiHttpError(400, "baseId 必须是数字");
      where.baseId = n;
    }
    if (keyword) where.OR = [{ filename: { contains: keyword } }, { ext: { contains: keyword } }];
    const [list, total] = await Promise.all([
      prisma.knowledgeFile.findMany({
        where,
        orderBy: [{ id: "desc" }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.knowledgeFile.count({ where }),
    ]);
    return success({ list, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } }, "获取知识库文件列表成功");
  },
  { permission: "kb:list", errorMessage: "获取知识库文件列表失败", route: "knowledge-files/GET" }
);

/** POST /api/knowledge-files：multipart 上传 */
export const POST = withApi(
  async ({ request }) => {
    const url = new URL(request.url);
    const baseIdRaw = url.searchParams.get("baseId");
    if (!baseIdRaw) throw new ApiHttpError(400, "缺少 baseId 参数");
    const baseId = Number(baseIdRaw);
    if (!Number.isInteger(baseId) || baseId <= 0) throw new ApiHttpError(400, "baseId 必须是正整数");
    if (!(await prisma.knowledgeBase.findUnique({ where: { id: baseId } }))) {
      throw new ApiHttpError(404, "知识库不存在");
    }

    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      throw new ApiHttpError(400, "请求体不是合法的 multipart 表单");
    }
    const raw = form.getAll(KB_UPLOAD_FIELD).filter((v): v is File => v instanceof File);
    if (raw.length === 0) throw new ApiHttpError(400, `缺少 ${KB_UPLOAD_FIELD} 文件字段`);
    if (raw.length > KB_MAX_FILES_PER_UPLOAD) {
      throw new ApiHttpError(400, `单次最多上传 ${KB_MAX_FILES_PER_UPLOAD} 个文件`);
    }

    // 全量预校验：任一失败即整批 400（保证一次请求要么全成功要么全拒绝，便于前端提示）
    for (const f of raw) {
      const c = await checkIngestFile(f);
      if (!c.ok) throw new ApiHttpError(400, c.message);
    }

    const results = [];
    for (const f of raw) {
      const r = await ingestFile(baseId, f);
      if (r.status === "rejected") throw new ApiHttpError(400, r.message);
      if (r.status === "error") return error(r.message, 400);
      results.push({ status: r.status, file: r.file, chunkCount: r.chunks });
    }
    const allExisting = results.every((r) => r.status === "existing");
    // 契约头注释：重复上传（同 baseId+sha256）返回已有记录，HTTP 200；新建返回 201
    const payload = { list: results, count: results.length };
    return allExisting
      ? success(payload, `上传成功（${results.length} 个文件，均为重复上传）`)
      : created(payload, `上传成功（${results.length} 个文件）`);
  },
  { permission: "kb:create", errorMessage: "上传文件失败", route: "knowledge-files/POST" }
);