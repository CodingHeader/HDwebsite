/**
 * JSON 字段读写（`src/lib/json-field.ts`，W0-03 冻结签名）—— DB 中 JSON-in-String 字段的解析/序列化唯一入口。
 *
 * W0 默认实现 = 现有行为：解析失败/空值一律回落 fallback，**不抛异常**（与 `auth.ts` / `notify-gateway.ts`
 * 既有的 `try { JSON.parse } catch { 回落 }` 语义一致）。替换既有调用方由 B 线（B-04）在自有文件内完成。
 */

/**
 * 解析 JSON-in-String 字段；`raw` 为空（null/undefined/""）或非法 JSON → 返回 `fallback`。
 * @param raw DB 中的字符串值（允许 null/undefined）
 * @param fallback 解析失败时的回落值（如 `[]`、`{}`、`null`）
 */
export function parseJsonField<T>(raw: string | null | undefined, fallback: T): T {
  if (raw === null || raw === undefined) return fallback;
  if (typeof raw !== "string") return fallback;
  if (raw.trim() === "") return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/**
 * 序列化任意值为 JSON 字符串（写入 DB 前使用）。
 * `undefined` 会序列化为 `"null"`（保证返回值恒为 string，避免 `JSON.stringify` 返回 undefined）。
 */
export function stringifyJsonField(value: unknown): string {
  return JSON.stringify(value ?? null) as string;
}
