/**
 * 站点根地址（P06）：环境变量 APP_ORIGIN > Setting siteUrl > 品牌出厂默认。
 * 供邮件链接、公众号回复、采集 UA 等对外链接使用，避免在业务代码硬编码域名。
 */
import { getAllSettings } from "@/lib/settings";
import { BRAND_SITE_URL } from "@/config/brand";

export async function appOrigin(): Promise<string> {
  if (process.env.APP_ORIGIN) return process.env.APP_ORIGIN.replace(/\/$/, "");
  try {
    const s = await getAllSettings();
    if (s.siteUrl) return s.siteUrl.replace(/\/$/, "");
  } catch {
    /* 读库失败回退默认 */
  }
  return BRAND_SITE_URL;
}

export async function managerLink(path: string): Promise<string> {
  return `${await appOrigin()}/manager/${path.replace(/^\//, "")}`;
}
