import { withApi } from "@/lib/api-handler";
import { success } from "@/lib/api-response";
import { clientIp, logOperation } from "@/lib/log";
import { importBuiltinsIntoMedia } from "@/lib/crud-resources/media";

export const dynamic = "force-dynamic";

export const POST = withApi(
  async ({ request, session }) => {
    const result = await importBuiltinsIntoMedia();
    await logOperation({
      userId: session.id,
      username: session.username,
      module: "media",
      action: "import-builtins",
      title: `并入内置图：新增 ${result.created.length}，跳过 ${result.skipped.length}`,
      before: { total: result.total },
      after: { created: result.created.length, skipped: result.skipped.length, failed: result.failed.length },
      ip: clientIp(request),
      userAgent: request.headers.get("user-agent"),
    });
    return success(result, `已扫描 ${result.total} 个内置资源`);
  },
  { permission: "media:create", errorMessage: "并入内置资源失败", route: "media/import-builtins/POST" }
);