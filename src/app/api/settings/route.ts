import { hasPermission } from "@/lib/auth";
import { success } from "@/lib/api-response";
import { clientIp, logOperation } from "@/lib/log";
import { getSettings, getAllSettings, setSettings } from "@/lib/settings";
import { getSettingDefinition } from "@/lib/settings-registry";
import { maskSecret } from "@/lib/crypto";
import { settingsUpdateSchema } from "@/contracts";
import { parseBody, withApi } from "@/lib/api-handler";
import { WEB_TAGS, invalidateWebContent } from "@/lib/cache-tags";

export const dynamic = "force-dynamic";

/** 加密字段回显一律脱敏；明文仅在写入侧提供 */
function maskEncrypted(data: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(data)) {
    out[k] = getSettingDefinition(k)?.isEncrypted && v ? maskSecret(v) : v;
  }
  return out;
}

/**
 * GET /api/settings：单一对象形态 Record<string,string>（13 §7 收紧口径）
 * 未登录 → 仅 isPublic 字段；有 setting:list 权限 → 全量（加密字段脱敏回显）；
 * 已登录但无 setting:list → 仍仅 isPublic（修复 Viewer 可读解密密钥的越权缺口）。
 */
export const GET = withApi(
  async ({ session }) => {
    const canList = !!session && hasPermission(
      { isSuper: session.role.isSuper, permissions: session.role.permissions },
      "setting:list"
    );
    const data = canList ? maskEncrypted(await getAllSettings()) : await getSettings();
    return success(data, "获取站点设置成功");
  },
  { auth: "optional", errorMessage: "获取站点设置失败", route: "settings/GET" }
);

/** PUT /api/settings：批量更新（鉴权 setting:edit —— 修复原项目登录即可改配置的越权缺口） */
export const PUT = withApi(
  async ({ request, session }) => {
    const input = await parseBody(request, settingsUpdateSchema);
    try {
      const before = await getAllSettings();
      // 加密字段：请求携带掩码值（含 ****）或空值时跳过，防止覆盖真实密钥
      const skipEncrypted = Object.entries(input)
        .filter(([k, v]) => getSettingDefinition(k)?.isEncrypted && (v.includes("****") || v === ""))
        .map(([k]) => k);
      const { updated, skipped } = await setSettings(input, { skipEncrypted });
      // D-06：设置更新后失效前台设置缓存（前台 getWebSettings ≤5s 可见）
      invalidateWebContent([WEB_TAGS.settings]);
      await logOperation({
        userId: session.id,
        username: session.username,
        module: "setting",
        action: "update",
        // 审计留痕不含明文：before/after 中加密键一律掩码，其余键掩码值本身
        before: Object.fromEntries(
          updated.map((k) => [k, getSettingDefinition(k)?.isEncrypted ? "***" : before[k]])
        ),
        after: Object.fromEntries(updated.map((k) => [k, getSettingDefinition(k)?.isEncrypted ? "***" : input[k]])),
        ip: clientIp(request),
        userAgent: request.headers.get("user-agent"),
      });
      return success({ updated, skipped }, "更新站点设置成功");
    } catch (err) {
      console.error("[settings/PUT] 更新失败：", err);
      throw err;
    }
  },
  { permission: "setting:edit", errorMessage: "更新站点设置失败", route: "settings/PUT" }
);