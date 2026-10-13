/**
 * crudSpecs 共享工具（W0-02 切分自 crud-resources.ts，逐字搬迁）：JSON-in-String 转换与跨域校验钩子。
 * 仅供 src/lib/crud-resources/<domain>.ts 内部引用。
 */
import { ApiHttpError } from "@/lib/api-handler";

/** 数组字段 → JSON 字符串（JSON-in-String 约定） */
export function jsonifyArray(keys: string[]) {
  const conv = (data: Record<string, unknown>) => {
    for (const k of keys) {
      const v = data[k];
      if (Array.isArray(v)) data[k] = JSON.stringify(v);
      else if (typeof v === "string" && v.trim().startsWith("[")) {
        // 幂等：已是 JSON 串的原样保留（防止二次 stringify 损坏）
        try {
          const parsed = JSON.parse(v);
          if (Array.isArray(parsed)) data[k] = JSON.stringify(parsed);
        } catch {
          /* 非法 JSON 交由上层校验 */
        }
      }
    }
    return data;
  };
  return {
    beforeCreate: async (data: Record<string, unknown>) => conv(data),
    beforeUpdate: async (data: Record<string, unknown>) => conv(data),
  };
}

/** 对象/数组字段 → JSON 字符串（区块配置等 JSON-in-String 字段；已是字符串的原样保留） */
export function jsonifyFields(keys: string[]) {
  const conv = (data: Record<string, unknown>) => {
    for (const k of keys) {
      const v = data[k];
      if (v !== null && typeof v === "object") data[k] = JSON.stringify(v);
    }
    return data;
  };
  return {
    beforeCreate: async (data: Record<string, unknown>) => conv(data),
    beforeUpdate: async (data: Record<string, unknown>) => conv(data),
  };
}

export const contentItemTags = jsonifyArray(["tags"]);
export const collectSourceTags = jsonifyArray(["autoTags"]);

export function assertAutoApproveAllowed(data: Record<string, unknown>, session: { role: { isSuper: boolean } }) {
  if (data.autoApprove === true && !session.role.isSuper) {
    throw new ApiHttpError(403, "仅超级管理员可开启「自动通过」（审核预授权，ADR-017）");
  }
}
