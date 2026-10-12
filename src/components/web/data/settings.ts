/**
 * 前台设置适配层（P02 / REQ-F-014）
 *
 * 为什么不用 `@/lib/settings#getSettings`：
 * - upgrade 的 getSettings 只返回 Registry 公开键，并用 upgrade Registry 的默认值兜底；
 *   这些默认值与 main 不同（如 bannerBgImage、bannerTitle、schoolShortName），会让前台外观偏离 main。
 * - 前台视觉以 origin/main@94dbbbb 为唯一标准，因此这里复刻 main `lib/settings.ts#getSettings` 的语义：
 *   main Registry 默认值（冻结快照） ← DB Setting 原值覆盖（含 Registry 外的键，如 advantage1~4）。
 * - 加密字段（isEncrypted）永不进入前台。
 * Registry 默认值统一回 main 口径属 P11（配置）范围，届时本快照可改为直接引用 Registry。
 */
import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { WEB_SETTING_DEFAULTS } from "./setting-defaults";

export { WEB_SETTING_DEFAULTS };

export type WebSettings = Record<string, string | null>;

/** 服务端：main 语义的设置读取（请求级缓存） */
export const getWebSettings = cache(async (): Promise<WebSettings> => {
  const result: WebSettings = { ...WEB_SETTING_DEFAULTS };
  const rows = await prisma.setting.findMany({
    select: { key: true, value: true, isEncrypted: true },
  });
  for (const row of rows) {
    if (row.isEncrypted) continue;
    result[row.key] = row.value;
  }
  return result;
});
