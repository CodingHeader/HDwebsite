/*
 * crudSpecs · 媒体库域（W0-02 切分自 crud-resources.ts；仅搬迁，无行为变化）
 */
import type { CrudSpec } from "@/lib/crud";

export const mediaSpecs: Record<string, CrudSpec> = {
  media: {
    model: 'media',
    permission: 'media',
    label: '媒体',
    searchFields: ['filename'],
    filters: { type: 'string' },
    orderBy: [{ id: 'desc' }],
    include: { uploader: { select: { id: true, username: true } } },
  },
};
