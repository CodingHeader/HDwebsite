/**
 * C-06：知识库 CRUD 列表 + 创建（`/api/knowledge-bases`，权限 kb:list / kb:create）。
 * - 列表：分页 + keyword（name/code）+ 可选 status 过滤；返回 list + pagination（契约③）
 * - 创建：使用契约 knowledgeBaseCreateSchema；建库时若未绑定 Coze dataset 且 Coze 已配置则同步创建
 *   远端 dataset（见 kb/bases.createBaseWithSync；未配置不阻塞，记 syncErr）
 */
import { created, success } from "@/lib/api-response";
import { withApi, parseBody, parseQuery } from "@/lib/api-handler";
import { listQuerySchema } from "@/contracts";
import { knowledgeBaseCreateSchema } from "@/contracts/kb";
import { createBaseWithSync } from "@/lib/kb/bases";
import { prisma } from "@/lib/prisma";
import { logOperation, clientIp } from "@/lib/log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/knowledge-bases：库列表 */
export const GET = withApi(
  async ({ request }) => {
    const url = new URL(request.url);
    const { page, limit, keyword } = parseQuery(request, listQuerySchema);
    const status = url.searchParams.get("status");
    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (keyword) where.OR = [{ name: { contains: keyword } }, { code: { contains: keyword } }];
    const [list, total] = await Promise.all([
      prisma.knowledgeBase.findMany({ where, orderBy: [{ sort: "asc" }, { id: "asc" }], skip: (page - 1) * limit, take: limit }),
      prisma.knowledgeBase.count({ where }),
    ]);
    return success({ list, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } }, "获取知识库列表成功");
  },
  { permission: "kb:list", errorMessage: "获取知识库列表失败", route: "knowledge-bases/GET" }
);

/** POST /api/knowledge-bases：创建库（可同步创建 Coze dataset） */
export const POST = withApi(
  async ({ request, session }) => {
    const input = await parseBody(request, knowledgeBaseCreateSchema);
    const { base, cozeDatasetCreated, cozeError } = await createBaseWithSync(input);
    await logOperation({
      userId: session.id,
      username: session.username,
      module: "kb",
      action: "create",
      title: base.name,
      after: { id: base.id },
      ip: clientIp(request),
      userAgent: request.headers.get("user-agent"),
    });
    return created({ ...base, cozeDatasetCreated, cozeError: cozeError ?? null }, cozeDatasetCreated ? "创建知识库成功（已同步 Coze）" : "创建知识库成功（Coze 未同步）");
  },
  { permission: "kb:create", errorMessage: "创建知识库失败", route: "knowledge-bases/POST", conflictMessage: { unique: "知识库 code 已存在" } }
);