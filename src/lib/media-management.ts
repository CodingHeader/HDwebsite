export interface MediaCategoryOption {
  value: string;
  label: string;
}

export interface MediaListItemLike {
  id: number;
  category: string | null;
}

export const BUILTIN_MEDIA_CATEGORY = "builtin";

export const MEDIA_CATEGORY_OPTIONS: MediaCategoryOption[] = [
  { value: "banner", label: "轮播图" },
  { value: "logo", label: "Logo 图标" },
  { value: "article", label: "文章配图" },
  { value: "avatar", label: "头像" },
  { value: "certificate", label: "证书风采" },
  { value: "campus", label: "学院风采" },
  { value: "partner", label: "合作院校" },
  { value: "course", label: "课程" },
  { value: "news", label: "新闻" },
  { value: "other", label: "其他" },
  { value: BUILTIN_MEDIA_CATEGORY, label: "内置静态图" },
];

export function isBuiltinMediaItem(item: MediaListItemLike): boolean {
  return item.id < 0 || item.category === BUILTIN_MEDIA_CATEGORY;
}

export function partitionMediaItems<T extends MediaListItemLike>(items: T[]) {
  const builtinItems: T[] = [];
  const uploadedItems: T[] = [];

  for (const item of items) {
    if (isBuiltinMediaItem(item)) {
      builtinItems.push(item);
    } else {
      uploadedItems.push(item);
    }
  }

  return { builtinItems, uploadedItems };
}

export function resolveMediaCategoryInput(
  presetCategory: string,
  customCategory: string,
): string | null {
  const custom = customCategory.trim();
  if (custom) {
    return custom;
  }

  const preset = presetCategory.trim();
  return preset || null;
}

export function buildMediaCategoryOptions(existingCategories: Array<string | null | undefined>) {
  const merged = new Map<string, MediaCategoryOption>();

  for (const option of MEDIA_CATEGORY_OPTIONS) {
    merged.set(option.value, option);
  }

  for (const category of existingCategories) {
    const value = (category ?? "").trim();
    if (!value || merged.has(value)) {
      continue;
    }
    merged.set(value, { value, label: value });
  }

  return Array.from(merged.values());
}

export function getMediaCategoryLabel(category: string | null | undefined): string {
  const value = (category ?? "").trim();
  if (!value) {
    return "未分类";
  }

  const matched = MEDIA_CATEGORY_OPTIONS.find((option) => option.value === value);
  return matched?.label ?? value;
}
