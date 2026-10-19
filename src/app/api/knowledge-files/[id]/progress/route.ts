/**
 * C-06：文件处理进度（`/api/knowledge-files/[id]/progress`，权限 kb:list）。
 * - 本地：localParse + chunkCount
 * - 远端：若 Coze 后端已注册且有 cozeDocumentId → 实时查询（kb/coze.getDocumentStatus）
 * 返回契约 knowledgeFileStatusSchema 形状（cozeStatus / progress / error）。
 */
import { success } from "@/lib/api-response";
import { parseId, withApi } from "@/lib/api-handler";
import { getKnowledgeBackend } from "@/lib/kb/registry";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type IdParams = { id: string };

/** GET /api/knowledge-files/[id]/progress */
export const GET = withApi<IdParams>(
  async ({ params }) => {
    const id = parseId(params.id);
    const f = await prisma.knowledgeFile.findUnique({ where: { id } });
    if (!f) return success({ cozeStatus: null, progress: null, error: "文件不存在" }, "进度查询");
    let cozeStatus: 0 | 1 | 9 | null = (f.cozeStatus === 0 || f.cozeStatus === 1 || f.cozeStatus === 9 ? f.cozeStatus : null);
    let progress: number | null = f.cozeProgress ?? null;
    let error: string | null = f.errMsg ?? null;
    if (f.cozeDocumentId) {
      const backend = getKnowledgeBackend("coze");
      if (backend?.getDocumentStatus) {
        try {
          const st = await backend.getDocumentStatus(f.cozeDocumentId);
          cozeStatus = st.status;
          progress = st.progress;
          error = st.error ?? error;
        } catch (err) {
          error = err instanceof Error ? err.message : String(err);
        }
      } else {
        error = "Coze 后端未配置";
      }
    }
    return success({ cozeStatus, progress, error, localParse: f.localParse, chunkCount: f.chunkCount }, "获取文件进度成功");
  },
  { permission: "kb:list", errorMessage: "获取文件进度失败", route: "knowledge-files/progress/GET:id" }
);