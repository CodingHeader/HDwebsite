/**
 * 知识库入库钩子 + 远端同步队列（P06；ADR-025：远端 = Coze 数据集，适配器由 P12 注册）
 * - ingestCollectItem：采集条目 → 本地 Knowledge（source=collect, syncStatus=pending）+ 回链 CollectItem.knowledgeId
 *   本地条目立即可被 kb-adapter.searchLocal 检索（官网/公众号 AI 客服兜底轨）
 * - 队列：Knowledge.syncStatus ∈ {pending, failed} 即待推送；processKbSyncQueue 调用已注册的 KbRemoteAdapter.push
 *   成功 → synced + externalId + syncedAt（并回写 CollectItem.kbSyncedAt）；失败 → failed + syncErr（下轮重试）
 * - 未注册适配器：队列保持 pending（不丢），processKbSyncQueue 返回 skipped
 */
import { prisma } from "@/lib/prisma";
import crypto from "node:crypto";
import type { CollectItem, Knowledge } from ".prisma/client";
import { registerKnowledgeBackend, getKnowledgeBackend, unregisterKnowledgeBackend } from "@/lib/kb/registry";

/**
 * C-02：远端适配器类型与注册入口保留为**薄包装**，底层收敛到唯一注册表 `src/lib/kb/registry.ts`
 * （KnowledgeBackend）。旧类型/函数名不变，既有测试与调用方零改动。
 */
export type KbRemoteAdapter = {
  name: string;
  /** 推送（新增或覆盖）一条知识；返回远端文档 id */
  push: (k: Knowledge) => Promise<{ externalId: string; externalUrl?: string | null }>;
  /** 可选：远端删除 */
  remove?: (k: Knowledge) => Promise<void>;
};

/** 旧注册名（P06 兼容）：包装为 KnowledgeBackend 注册到唯一注册表；传 null 注销 */
export function registerKbRemoteAdapter(adapter: KbRemoteAdapter | null): void {
  if (!adapter) {
    unregisterKnowledgeBackend("coze");
    return;
  }
  registerKnowledgeBackend({
    name: "coze",
    search: async () => [],
    pushEntry: async (doc) => adapter.push(doc as unknown as Knowledge),
    removeDocument: adapter.remove ? async (externalId) => adapter.remove!({ externalId } as unknown as Knowledge) : undefined,
  });
}

/**
 * C-04：按设置装配 Coze 后端（kbCozeProviderId 指向 kind=coze 的供应商 + kbCozeSpaceId）。
 * - 未配置 → 不注册 coze 后端，队列保持 pending（本卡验收：无凭证时记录原因而非抛错）
 * - PAT 取自 provider.apiKey（v1: 前缀为加密值，需解密）
 */
export async function configureCozeBackendFromSettings(): Promise<{ ok: boolean; reason?: string }> {
  const { prisma } = await import("@/lib/prisma");
  const { decryptField } = await import("@/lib/crypto");
  const rows = await prisma.setting.findMany({ where: { key: { in: ["kbCozeProviderId", "kbCozeSpaceId"] } } });
  const get = (k: string) => rows.find((r) => r.key === k)?.value ?? "";
  const providerId = Number(get("kbCozeProviderId"));
  const spaceIdRaw = get("kbCozeSpaceId");
  const spaceId = spaceIdRaw.startsWith("v1:") ? decryptField(spaceIdRaw) ?? "" : spaceIdRaw;
  if (!providerId || !spaceId) {
    return { ok: false, reason: "知识库同步未配置：请在站点设置填写 kbCozeProviderId / kbCozeSpaceId" };
  }
  const provider = await prisma.lLMProvider.findUnique({ where: { id: providerId } });
  if (!provider) return { ok: false, reason: `kbCozeProviderId=${providerId} 对应的供应商不存在` };
  if (provider.kind !== "coze") return { ok: false, reason: `供应商 ${provider.name} 不是 Coze 类型` };
  const pat = provider.apiKey.startsWith("v1:") ? decryptField(provider.apiKey) ?? "" : provider.apiKey;
  if (!pat) return { ok: false, reason: "Coze PAT 解密失败（请在模型供应商页重新保存）" };
  const { selfRegisterCozeBackend } = await import("@/lib/kb/coze");
  selfRegisterCozeBackend(() => ({ pat, spaceId, apiBase: provider.endpoint, timeoutMs: 30_000 }));
  return { ok: true };
}

export function getKbRemoteAdapter(): KbRemoteAdapter | null {
  const b = getKnowledgeBackend("coze");
  if (!b) return null;
  return {
    name: b.name,
    push: async (k) => b.pushEntry({ id: k.id, title: k.title, content: k.content, tags: k.tags, externalId: k.externalId, datasetId: await cozeDatasetIdOf(k.baseId) }),
    remove: b.removeDocument ? async (k) => void (await b.removeDocument!(k.externalId ?? String(k.id))) : undefined,
  };
}

/** 默认落库：seed 的 `collect` 采集资讯库（schema.prisma:868 注释；prisma/seed.ts:391/398） */
export const DEFAULT_COLLECT_BASE_CODE = "collect";

/** C-08（G10）：sha256（hex），用于 KnowledgeFile 去重列（与 kb/ingest.ts 同口径） */
function sha256Of(text: string): string {
  return crypto.createHash("sha256").update(text, "utf8").digest("hex");
}

/** C-08：解析采集条目的目标库 id——源指定 knowledgeBaseId 优先，否则 seed 的 collect 采集资讯库 */
async function resolveCollectBaseId(item: Pick<CollectItem, "id"> & { sourceId?: number }): Promise<number | null> {
  if (item.sourceId) {
    const source = await prisma.collectSource.findUnique({ where: { id: item.sourceId }, select: { knowledgeBaseId: true } });
    if (source?.knowledgeBaseId) return source.knowledgeBaseId;
  }
  const def = await prisma.knowledgeBase.findUnique({ where: { code: DEFAULT_COLLECT_BASE_CODE }, select: { id: true } });
  return def?.id ?? null;
}

/** C-08（G10）：把采集条目镜像为 KnowledgeFile，`collectItemId` 指回来源 CollectItem（E-11 文件详情跳转依据）
 * - KnowledgeFile.baseId 为必填（schema.prisma）；目标库不存在时跳过镜像，反向回链由 CollectItem.knowledgeId 承担 */
async function upsertCollectFile(
  baseId: number | null,
  item: Pick<CollectItem, "id" | "title">,
  content: string,
  tags: string
): Promise<number | null> {
  if (!baseId) return null;
  const existing = await prisma.knowledgeFile.findFirst({ where: { collectItemId: item.id } });
  if (existing) {
    await prisma.knowledgeFile.update({
      where: { id: existing.id },
      // KnowledgeFile 无 title 列（schema.prisma），更新 filename / tags / sha256 / size
      // （审核通过后 contentMd 可能变化：同步去重主键 sha256 与字节数，避免与 Knowledge 内容脱钩）
      data: {
        filename: `${item.title.slice(0, 200)}.md`,
        tags,
        sha256: sha256Of(`${item.id}:${content}`),
        size: Buffer.byteLength(content, "utf8"),
      },
    });
    return existing.id;
  }
  const title = item.title.slice(0, 200);
  const created = await prisma.knowledgeFile.create({
    data: {
      baseId,
      filename: `${title}.md`,
      ext: "md",
      mimeType: "text/markdown",
      size: Buffer.byteLength(content, "utf8"),
      sha256: sha256Of(`${item.id}:${content}`),
      // 采集条目无真实磁盘文件：storagePath 记为 collect/<id>.md（仅占位，E-11 导出/重解析会提示重新上传）
      storagePath: `collect/${item.id}.md`,
      localParse: "ok",
      chunkCount: 1,
      collectItemId: item.id,
      tags,
    },
  });
  return created.id;
}

/** C-08：目标库（KnowledgeBase）→ Coze dataset_id 解析；未绑定返回 null */
async function cozeDatasetIdOf(baseId: number | null): Promise<string | null> {
  if (!baseId) return null;
  const base = await prisma.knowledgeBase.findUnique({ where: { id: baseId }, select: { cozeDatasetId: true } });
  return base?.cozeDatasetId ?? null;
}

/** 采集条目入本地知识库（已有回链则更新内容并重新排队），返回 knowledgeId
 * - `sourceId` 可选：collect-engine（D 线，未声明 sourceId）运行时对象仍带该字段；缺省走默认 collect 库 */
export async function ingestCollectItem(
  item: Pick<CollectItem, "id" | "title" | "url" | "contentMd" | "summary" | "knowledgeId"> & { sourceId?: number },
  opts: { tags?: string[] } = {}
): Promise<number> {
  const content = item.contentMd || item.summary || item.title;
  const tags = ["采集", ...(opts.tags ?? [])].join(",");
  // C-08：目标库 = 源指定 knowledgeBaseId 或默认采集资讯库（ADR-025 §6；不改 collect-engine）
  const baseId = await resolveCollectBaseId(item);
  if (item.knowledgeId) {
    const existing = await prisma.knowledge.findUnique({ where: { id: item.knowledgeId } });
    if (existing) {
      await prisma.knowledge.update({
        where: { id: existing.id },
        data: { title: item.title, content, syncStatus: "pending", syncErr: null },
      });
      return existing.id;
    }
  }
  const k = await prisma.knowledge.create({
    data: {
      title: item.title.slice(0, 300),
      content,
      tags,
      source: "collect",
      externalUrl: item.url,
      status: "active",
      syncStatus: "pending",
      baseId,
    },
  });
  await prisma.collectItem.update({ where: { id: item.id }, data: { knowledgeId: k.id, kbSyncedAt: null } });
  // C-08（G10）：镜像 KnowledgeFile，collectItemId 指回来源 CollectItem（E-11 详情跳转；REQ-F-006 AC60）
  await upsertCollectFile(baseId, item, content, tags).catch((err) =>
    console.error(`[kb-sync] KnowledgeFile 镜像失败（CollectItem#${item.id}）：`, err)
  );
  return k.id;
}

export async function pendingKbSync(take = 100): Promise<Knowledge[]> {
  return prisma.knowledge.findMany({ where: { syncStatus: { in: ["pending", "failed"] } }, orderBy: { id: "asc" }, take });
}

export async function processKbSyncQueue(
  take = 20
): Promise<{ synced: number; failed: number; skipped: number; adapter: string | null; reason?: string }> {
  const adapter = getKbRemoteAdapter();
  const queue = await pendingKbSync(take);
  // C-04：无凭证时不抛错——返回原因，队列保持 pending 等配置补齐后重试
  if (!adapter) {
    const cfg = await configureCozeBackendFromSettings().catch(() => ({ ok: false, reason: "读取设置失败" }));
    return {
      synced: 0,
      failed: 0,
      skipped: queue.length,
      adapter: null,
      reason: cfg.reason ?? "知识库同步未配置：请在站点设置填写 kbCozeProviderId / kbCozeSpaceId",
    };
  }
  let synced = 0;
  let failed = 0;
  for (const k of queue) {
    try {
      const r = await adapter.push(k);
      const now = new Date();
      await prisma.knowledge.update({
        where: { id: k.id },
        data: { syncStatus: "synced", syncErr: null, syncedAt: now, externalId: r.externalId, externalUrl: r.externalUrl ?? k.externalUrl },
      });
      await prisma.collectItem.updateMany({ where: { knowledgeId: k.id }, data: { kbSyncedAt: now } });
      synced++;
    } catch (err) {
      await prisma.knowledge.update({
        where: { id: k.id },
        data: { syncStatus: "failed", syncErr: (err instanceof Error ? err.message : String(err)).slice(0, 500) },
      });
      failed++;
    }
  }
  return { synced, failed, skipped: 0, adapter: adapter.name };
}
