import { getRegistry, getGroups } from "@/lib/settings-registry";
import { requireAuth } from "@/lib/api-auth";
import { serverError, success } from "@/lib/api-response";

export const dynamic = "force-dynamic";

const GROUP_LABELS: Record<string, string> = {
  site: "站点", topbar: "顶栏", banner: "横幅", stats: "统计", cards: "首页卡片",
  footer: "页脚", company: "公司", contact: "联系", seo: "SEO", other: "其他",
  email: "邮件（SMTP）", "wechat-mp": "公众号", collect: "采集", llm: "大模型",
  notify: "通知", publish: "发布",
};

/** GET /api/settings/definitions：Registry 分组定义（驱动后台设置页） */
export async function GET(request: Request) {
  const guard = await requireAuth(request, "setting:list");
  if (!guard.ok) return guard.response;
  try {
    const registry = getRegistry();
    const groups = getGroups().map((g) => ({
      group: g,
      label: GROUP_LABELS[g] ?? g,
      isPublic: registry.filter((d) => d.group === g).every((d) => d.isPublic),
      items: registry
        .filter((d) => d.group === g)
        .map((d) => ({ key: d.key, label: d.label, type: d.type, isEncrypted: d.isEncrypted })),
    }));
    return success({ groups }, "获取设置定义成功");
  } catch (err) {
    console.error("[settings/definitions] 读取失败：", err);
    return serverError("获取设置定义失败");
  }
}
