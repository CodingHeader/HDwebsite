/**
 * slug 生成（原项目口径）：小写 → 非法字符转 - → 截断 100 → 唯一性追加序号
 */
export function slugify(title: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100)
    .replace(/-+$/g, "");
  return base || `item-${Date.now()}`;
}

/** 带唯一性校验的 slug 生成（checkExists 返回该 slug 是否已存在） */
export async function uniqueSlug(
  title: string,
  checkExists: (slug: string) => Promise<boolean>
): Promise<string> {
  const base = slugify(title);
  if (!(await checkExists(base))) return base;
  for (let i = 2; i < 1000; i++) {
    const candidate = `${base}-${i}`;
    if (!(await checkExists(candidate))) return candidate;
  }
  return `${base}-${Date.now()}`;
}
