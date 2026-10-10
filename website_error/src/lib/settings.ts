import { cache } from "react";
import { prisma } from "./prisma";
import { getDefaultValues, getSettingDefinition } from "./settings-registry";

// 缓存设置数据，避免重复查询
export const getSettings = cache(async () => {
  const settings = await prisma.setting.findMany();
  const defaults = getDefaultValues();

  // 合并DB值和Registry默认值
  const result: Record<string, string | null> = {};
  for (const [key, val] of Object.entries(defaults)) {
    result[key] = val;
  }
  for (const setting of settings) {
    result[setting.key] = setting.value;
  }
  return result;
});

// 获取特定设置值（从Registry获取默认值）
export async function getSetting(key: string, defaultValue?: string): Promise<string> {
  const settings = await getSettings();
  const registryDefault = getSettingDefinition(key)?.defaultValue ?? "";
  return settings[key] || defaultValue || registryDefault;
}

// 常用设置项的默认值（从Registry SSOT导出）
export const DEFAULT_SETTINGS = getDefaultValues();

// 获取学校完整名称
export async function getSchoolFullName(): Promise<string> {
  return getSetting("schoolFullName", DEFAULT_SETTINGS.schoolFullName);
}

// 获取学校简称
export async function getSchoolShortName(): Promise<string> {
  return getSetting("schoolShortName", DEFAULT_SETTINGS.schoolShortName);
}

// 获取学校标语
export async function getSchoolSlogan(): Promise<string> {
  return getSetting("companySlogan", DEFAULT_SETTINGS.companySlogan);
}

// 获取公司简介
export async function getCompanyIntro(): Promise<string> {
  return getSetting("companyIntro", DEFAULT_SETTINGS.companyIntro);
}
