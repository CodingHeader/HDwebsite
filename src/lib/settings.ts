/**
 * 设置服务：DB 读取 + Registry 默认值合并 + 加密字段处理
 * - getPublicSettings()：请求级缓存（React cache），公开字段集合（前台/公开接口用）——B-01 更名
 * - getAllSettings()：后台用，含非公开（解密后脱敏回显由路由层决定）
 * - getSettings()：{@link getPublicSettings} 的已弃用别名（P08 #5：与 getAllSettings 同名不同义已收敛）——B 线自有文件改用新名，别名在 W2-03 统一移除
 * - setSettings()：校验 key 属于 Registry；isEncrypted 字段落库前加密
 */
import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { decryptField, encryptField } from "@/lib/crypto";
import { invalidateWebContent, webTagsForModel } from "@/lib/cache-tags";
import {
  getDefaultValues,
  getPublicSettingKeys,
  getSettingDefinition,
} from "@/lib/settings-registry";

/** 公开字段集合（请求级缓存；不含 isPublic=false 的键） */
export const getPublicSettings = cache(async (): Promise<Record<string, string>> => {
  const defaults = getDefaultValues();
  const publicKeys = new Set(getPublicSettingKeys());
  const rows = await prisma.setting.findMany();
  const merged: Record<string, string> = {};
  for (const d of Object.keys(defaults)) {
    if (publicKeys.has(d)) merged[d] = defaults[d];
  }
  for (const row of rows) {
    if (!publicKeys.has(row.key)) continue;
    let value = row.value ?? "";
    if (row.isEncrypted && value) value = decryptField(value) ?? "";
    merged[row.key] = value || defaults[row.key] || "";
  }
  return merged;
});

/** @deprecated 已更名 {@link getPublicSettings}（B-01：语义单一化）；B 线自有文件一律用新名 */
export const getSettings = getPublicSettings;

export async function getAllSettings(): Promise<Record<string, string>> {
  const defaults = getDefaultValues();
  const rows = await prisma.setting.findMany();
  const merged: Record<string, string> = { ...defaults };
  for (const row of rows) {
    let value = row.value ?? "";
    if (row.isEncrypted && value) value = decryptField(value) ?? "";
    if (value || !defaults[row.key]) merged[row.key] = value;
  }
  return merged;
}

export async function setSettings(
  updates: Record<string, string>,
  opts: { skipEncrypted?: string[] } = {}
): Promise<{ updated: string[]; skipped: string[] }> {
  const updated: string[] = [];
  const skipped: string[] = [];
  for (const [key, rawValue] of Object.entries(updates)) {
    const defItem = getSettingDefinition(key);
    if (!defItem) {
      skipped.push(key);
      continue;
    }
    if (opts.skipEncrypted?.includes(key)) {
      skipped.push(key);
      continue;
    }
    const value =
      defItem.isEncrypted && rawValue ? encryptField(rawValue) : rawValue;
    await prisma.setting.upsert({
      where: { key },
      update: { value },
      create: {
        key,
        value,
        type: defItem.type,
        group: defItem.group,
        isPublic: defItem.isPublic,
        isEncrypted: defItem.isEncrypted,
        description: defItem.description ?? null,
      },
    });
    updated.push(key);
  }
  if (updated.length > 0) {
    // D-06：设置更新后失效前台设置与首页缓存（前台 getWebSettings/getHomeData ≤5s 可见）
    invalidateWebContent(webTagsForModel("setting"));
  }
  return { updated, skipped };
}
