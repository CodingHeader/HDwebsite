/**
 * C-05：本地兜底检索（打分/加权/库过滤） + C-02 的 local 后端包装。
 *
 * 打分口径（C-05 目标：Top-3 命中率相对基线不降）：
 * - `scoreLegacy`：**复刻** kb-adapter 旧逻辑（整词命中 ×3；bigram 过阈值才一次计分；无标题加权）——仅用于基线对照。
 * - `scoreWeighted`：新算法——标题命中 ×3 加权、bigram **连续计分**、词/gram 归一化（避免长文虚高）。
 * - `rankByScore`：按分数降序取 Top-N（分数 >0 才入选）。
 * - `searchLocalWeighted`：LIKE 预筛 ≤500 + 库过滤（baseIds）+ 标签过滤 + 打分排序。
 *
 * 兼容：`localBackend`（C-02 注册表实现）仍委托 kb-adapter.searchLocal（行为不变）；新算法由 kb-adapter 显式调用。
 */
import { prisma } from "@/lib/prisma";
import { searchLocal } from "@/lib/kb-adapter";
import type { KbHit } from "@/lib/kb-adapter";
import { registerKnowledgeBackend, getKnowledgeBackend } from "@/lib/kb/registry";
import type { KnowledgeBackend, KbSearchOptions } from "@/lib/kb/types";

/** 打分用的最小文档形状（与 Knowledge 行解耦，便于单测） */
export type ScorableDoc = { id: number; title: string; content: string; tags?: string | null; baseId?: number | null };

/** 查询中连续汉字片段的字符 bigram（去重；与 kb-adapter.cjkBigrams 同口径） */
export function cjkBigrams(q: string): string[] {
  const out = new Set<string>();
  for (const seg of q.match(/[\u4e00-\u9fff]+/g) ?? []) {
    if (seg.length === 1) out.add(seg);
    for (let i = 0; i < seg.length - 1; i++) out.add(seg.slice(i, i + 2));
  }
  return [...out];
}

/** 空白分词（英文/数字场景） */
function words(q: string): string[] {
  return q.split(/\s+/).filter(Boolean);
}

/**
 * **基线**：复刻 kb-adapter 旧评分（整词×3；bigram 达到 minGrams 阈值时按命中数一次性计分；不含标题加权）。
 * 仅用于前后对比，不参与线上检索。
 */
export function scoreLegacy(doc: ScorableDoc, query: string): number {
  const q = query.trim();
  if (!q) return 0;
  const hay = `${doc.title}\n${doc.content}\n${doc.tags ?? ""}`;
  const ws = words(q);
  const grams = cjkBigrams(q);
  const minGrams = Math.max(2, Math.ceil(grams.length * 0.3));
  const wordHits = ws.filter((w) => hay.includes(w)).length;
  const gramHits = grams.filter((g) => hay.includes(g)).length;
  const gramScore = gramHits >= Math.min(minGrams, grams.length) && gramHits > 0 ? gramHits : 0;
  return wordHits * 3 + gramScore;
}

/** 标题权重（标题命中比正文命中更相关） */
export const TITLE_WEIGHT = 3;

/**
 * **新算法**：标题加权 + bigram 连续计分 + 归一化。
 * - 标题命中：词命中 ×3×{@link TITLE_WEIGHT}；bigram 命中 ×{@link TITLE_WEIGHT}
 * - 正文/标签命中：词 ×3；bigram ×1
 * - 归一化：分母为查询侧总量（词数×3 + gram 数），避免长文档虚高
 */
export function scoreWeighted(doc: ScorableDoc, query: string): number {
  const q = query.trim();
  if (!q) return 0;
  const title = doc.title ?? "";
  const body = `${doc.content ?? ""}\n${doc.tags ?? ""}`;
  const ws = words(q);
  const grams = cjkBigrams(q);

  const wordHits = ws.filter((w) => title.includes(w) || body.includes(w)).length;
  const gramHitsTitle = grams.filter((g) => title.includes(g)).length;
  const gramHitsBody = grams.filter((g) => body.includes(g)).length;

  const raw = wordHits * 3 + gramHitsTitle * TITLE_WEIGHT + gramHitsBody;
  const denom = ws.length * 3 + grams.length;
  if (denom === 0) return 0;
  return raw / denom;
}

/** 按分数降序取 Top-N（仅保留 score > 0） */
export function rankByScore<T extends { doc: ScorableDoc; score: number }>(items: T[], top: number): ScorableDoc[] {
  return items
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || b.doc.id - a.doc.id)
    .slice(0, top)
    .map((x) => x.doc);
}

/** LIKE 预筛上限（避免全表扫描；超出按 priority/更新时间裁剪） */
export const PRELIMIT_MAX = 500;

/**
 * 加权检索：库过滤（baseIds）+ 标签过滤 + LIKE 预筛 ≤{@link PRELIMIT_MAX} + 加权打分 Top-N。
 * 与 kb-adapter.searchLocal 的差异：支持 baseIds（Knowledge.baseId 列已存在）与标题加权。
 */
export async function searchLocalWeighted(
  query: string,
  opts: KbSearchOptions = {}
): Promise<KbHit[]> {
  const take = opts.take ?? 6;
  const where: Record<string, unknown> = { status: "active" };
  if (opts.tags?.length) where.OR = opts.tags.map((t) => ({ tags: { contains: t } }));
  if (opts.baseIds?.length) where.baseId = { in: opts.baseIds };
  // V11-KB-04：回收站（软删）文件的切片不得被检索——排除 fileId 指向已删文件的切片
  //（无外键列，须先查已删文件 id 集；条目级停用由 status 过滤天然覆盖）
  const deletedFiles = await prisma.knowledgeFile.findMany({
    where: { deletedAt: { not: null } },
    select: { id: true },
  });
  if (deletedFiles.length > 0) {
    where.fileId = { notIn: deletedFiles.map((f) => f.id) };
  }
  const rows = (await prisma.knowledge.findMany({
    where,
    orderBy: [{ priority: "desc" }, { id: "desc" }],
    take: PRELIMIT_MAX,
  })) as unknown as ScorableDoc[];
  const q = query.trim();
  if (!q) {
    return rows.slice(0, take).map((r) => ({ source: "local" as const, title: r.title, content: r.content, tags: r.tags ?? undefined }));
  }
  const scored = rows
    .map((r) => ({ doc: r, score: scoreWeighted(r, q) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || b.doc.id - a.doc.id)
    .slice(0, take);
  return scored.map(({ doc, score }) => ({
    source: "local" as const,
    title: doc.title,
    content: doc.content,
    tags: doc.tags ?? undefined,
    score: Math.round(score * 1000) / 1000,
  }));
}

// ── C-02：local 后端（保持不变：委托 kb-adapter.searchLocal）──────────────
export const localBackend: KnowledgeBackend = {
  name: "local",
  search: async (query: string, opts: KbSearchOptions = {}): Promise<KbHit[]> =>
    searchLocal(query, { tags: opts.tags, take: opts.take }),
  pushEntry: async () => {
    throw new Error("local 后端无远端推送能力：本地条目由 kb-sync.ingestCollectItem 直接落库");
  },
};

/** 确保 local 后端已注册（幂等；模块加载时已自动注册） */
export function ensureLocalBackend(): KnowledgeBackend {
  if (!getKnowledgeBackend("local")) registerKnowledgeBackend(localBackend);
  return getKnowledgeBackend("local")!;
}

// 模块加载即注册（由 kb-adapter / app 入口间接 import 时生效）
registerKnowledgeBackend(localBackend);
