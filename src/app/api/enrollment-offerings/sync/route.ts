/**
 * 招生同步入口（V11-ENR-01 自 main/hdwebsite_0429 `POST /api/enrollment-offerings` 移植）
 *
 * 与既有 CRUD 路由（/api/enrollment-offerings，id 型、冻结契约 offeringCreateSchema）的分工：
 * - 本路由：name 型同步 upsert（外部推送语义，main 对齐）——不存在即建专业/院校/课程，
 *   重复推送幂等（键空值归一 + 串行链 + P2002 回退），并触发最低学费回写 Course。
 * - 冻结契约不变：同步输入 DTO 定于 src/lib/enrollment-sync.ts（enrollmentSyncSchema）。
 */
import { created } from "@/lib/api-response";
import { parseBody, withApi } from "@/lib/api-handler";
import { clientIp, logOperation } from "@/lib/log";
import { invalidateWebContent, webTagsForModel } from "@/lib/cache-tags";
import { enrollmentSyncSchema, upsertEnrollmentOffering } from "@/lib/enrollment-sync";

export const dynamic = "force-dynamic";

export const POST = withApi(
  async ({ request, session }) => {
    const input = await parseBody(request, enrollmentSyncSchema);
    const offering = await upsertEnrollmentOffering(input);
    invalidateWebContent(webTagsForModel("enrollmentOffering"));
    await logOperation({
      userId: session.id,
      username: session.username,
      module: "enrollment",
      action: "create",
      title: `${input.majorName} / ${input.partnerName}`,
      after: { id: offering.id },
      ip: clientIp(request),
      userAgent: request.headers.get("user-agent"),
    });
    // main 对齐：重复推送（幂等更新）同样返回 201「保存成功」
    return created(offering, "保存成功");
  },
  { permission: "enrollment:create", errorMessage: "保存招生计划失败", route: "enrollment-offerings/sync/POST" }
);
