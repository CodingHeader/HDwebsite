/**
 * C-06：知识库**库级**操作（建库同步 Coze dataset / 删除级联 / 触发同步队列）。
 * 与 kb/ingest.ts（文件级）分工：本模块负责 KnowledgeBase 维度。
 * - 建库：cozeDatasetId 未绑定且 Coze 已配置 → createDataset 并回写；未配置 → 记 syncErr 不阻塞
 * - 删除：级联删除全部文件（ingest.deleteFileCascade）与孤儿 Knowledge 切片，再删 KnowledgeBase
 * - 同步：调用 kb-sync.processKbSyncQueue 处理 pending/failed 条目
 */
import { prisma } from "@/lib/prisma";
import { createDataset, loadCozeKbConfig } from "@/lib/kb/coze";
import { deleteFileCascade } from "@/lib/kb/ingest";
import { processKbSyncQueue } from "@/lib/kb-sync";
import type { KnowledgeBase } from ".prisma/client";

/** 建库结果（Coze 未配置 → cozeDatasetCreated=false，不抛错） */
export type CreateBaseResult = {
  base: KnowledgeBase;
  cozeDatasetCreated: boolean;
  cozeError?: string;
};

/**
 * 创建知识库：
 * - 若 input.cozeDatasetId 已给出 → 直接绑定（不调 Coze）
 * - 否则若 Coze 配置存在 → createDataset（名称=name）→ 回写 cozeDatasetId + syncStatus="synced"
 * - Coze 未配置 → 保持 syncStatus="local" + syncErr 说明（不抛错，队列/管理页可见）
 */
export async function createBaseWithSync(input: {
  name: string;
  code: string;
  description?: string | null;
  cozeDatasetId?: string | null;
  isDefault?: boolean;
  status?: string;
  sort?: number;
}): Promise<CreateBaseResult> {
  const base = await prisma.knowledgeBase.create({
    data: {
      name: input.name,
      code: input.code,
      description: input.description ?? null,
      cozeDatasetId: input.cozeDatasetId ?? null,
      isDefault: input.isDefault ?? false,
      status: input.status ?? "active",
      sort: input.sort ?? 0,
      syncStatus: input.cozeDatasetId ? "synced" : "local",
    },
  });

  if (input.cozeDatasetId) return { base, cozeDatasetCreated: false };

  const cfg = await loadCozeKbConfig();
  if (!cfg) {
    await prisma.knowledgeBase.update({
      where: { id: base.id },
      data: { syncStatus: "local", syncErr: "Coze 未配置：请在站点设置填写 kbCozeProviderId / kbCozeSpaceId" },
    });
    return { base: { ...base, syncStatus: "local" }, cozeDatasetCreated: false, cozeError: "Coze 未配置，仅创建本地库" };
  }

  try {
    const { datasetId } = await createDataset(cfg, base.name, base.description ?? undefined);
    const updated = await prisma.knowledgeBase.update({
      where: { id: base.id },
      data: { cozeDatasetId: datasetId, syncStatus: "synced", syncErr: null },
    });
    return { base: updated, cozeDatasetCreated: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const updated = await prisma.knowledgeBase.update({
      where: { id: base.id },
      data: { syncStatus: "failed", syncErr: msg.slice(0, 500) },
    });
    return { base: updated, cozeDatasetCreated: false, cozeError: msg };
  }
}

/** 删除库：级联清理文件与孤儿条目；返回删除的库与残留说明 */
export async function deleteBaseCascade(id: number): Promise<{ ok: boolean; base?: KnowledgeBase; message?: string; orphanChunks?: number }> {
  const base = await prisma.knowledgeBase.findUnique({ where: { id } });
  if (!base) return { ok: false, message: "知识库不存在" };

  const files = await prisma.knowledgeFile.findMany({ where: { baseId: id } });
  for (const f of files) {
    await deleteFileCascade(f.id).catch(() => {});
  }
  // 兜底：删除未被文件级联清理的孤儿切片（如 deletedAt 未清的空文件残留）
  const orphan = await prisma.knowledge.deleteMany({ where: { baseId: id } });
  await prisma.knowledgeBase.delete({ where: { id } });
  return { ok: true, base, orphanChunks: orphan.count };
}

/** 触发知识库同步队列（条目级 pending/failed → 推送 Coze）；返回队列执行摘要 */
export async function syncKnowledgeQueue(take = 50) {
  return processKbSyncQueue(take);
}