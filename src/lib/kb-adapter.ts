/**
 * KBAdapter（ADR-020）：知识库抽象层 + 双轨检索
 * - LocalFallback：本地 Knowledge 表 contains 检索（始终可用）
 * - CozeClient：Coze 数据集/智能体检索（需 PAT dataset 权限；未授权时优雅降级）
 * 检索测试页对两条链路分别出结果（glossary：检索测试）。
 */
import { prisma } from "@/lib/prisma";
import { getRoutedProviders } from "@/lib/llm-gateway";
import { decryptField } from "@/lib/crypto";
import { cozeChat } from "@/lib/coze";
import type { Knowledge } from ".prisma/client";

export type KbHit = {
  source: "local" | "coze";
  title: string;
  content: string;
  tags?: string;
  score?: number;
};

export type KbSearchResult = {
  hits: KbHit[];
  localError?: string;
  cozeError?: string;
};

/** 本地兜底检索：Knowledge contains + 标签过滤 + 优先级排序，take 6 */
export async function searchLocal(query: string, opts: { tags?: string[]; take?: number } = {}): Promise<KbHit[]> {
  const take = opts.take ?? 6;
  const where: Record<string, unknown> = { status: "active" };
  if (opts.tags?.length) {
    where.OR = opts.tags.map((t) => ({ tags: { contains: t } }));
  }
  const rows = (await prisma.knowledge.findMany({
    where,
    orderBy: [{ priority: "desc" }, { id: "desc" }],
    take: 50,
  })) as Knowledge[];
  const q = query.trim();
  if (!q) {
    return rows.slice(0, take).map((r) => ({ source: "local" as const, title: r.title, content: r.content, tags: r.tags ?? undefined }));
  }
  // P06：整词命中（空白分词）权重 3；中文无空格时补充字符 bigram 重叠（≥2 个或 ≥30% 视为相关）
  const words = q.split(/\s+/).filter(Boolean);
  const grams = cjkBigrams(q);
  const minGrams = Math.max(2, Math.ceil(grams.length * 0.3));
  const scored = rows
    .map((r) => {
      const hay = `${r.title}\n${r.content}\n${r.tags ?? ""}`;
      const wordHits = words.filter((w) => hay.includes(w)).length;
      const gramHits = grams.filter((g) => hay.includes(g)).length;
      const score = wordHits * 3 + (gramHits >= Math.min(minGrams, grams.length) && gramHits > 0 ? gramHits : 0);
      return { r, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, take);
  return scored.map(({ r, score }) => ({
    source: "local" as const,
    title: r.title,
    content: r.content,
    tags: r.tags ?? undefined,
    score,
  }));
}

/** 查询中连续汉字片段的字符 bigram（去重） */
export function cjkBigrams(q: string): string[] {
  const out = new Set<string>();
  for (const seg of q.match(/[\u4e00-\u9fff]+/g) ?? []) {
    if (seg.length === 1) out.add(seg);
    for (let i = 0; i < seg.length - 1; i++) out.add(seg.slice(i, i + 2));
  }
  return [...out];
}

/** 知识上下文注入格式（SOL-002 口径）：[标题]\n内容 */
export function formatKbContext(hits: KbHit[]): string {
  if (hits.length === 0) return "";
  return hits.map((h) => `[${h.title}]\n${h.content}`).join("\n\n");
}

/** Coze 检索测试：通过默认 Coze 供应商的 bot 发起问答，返回其回答作为检索证据 */
export async function searchViaCoze(query: string): Promise<{ ok: boolean; answer?: string; errMsg?: string }> {
  const providers = await getRoutedProviders();
  const cozeProvider = providers.find((p) => p.kind === "coze");
  if (!cozeProvider) {
    return { ok: false, errMsg: "未配置 Coze 类型供应商（模型供应商页可添加）" };
  }
  const apiKey = cozeProvider.apiKey.startsWith("v1:") ? decryptField(cozeProvider.apiKey) ?? "" : cozeProvider.apiKey;
  if (!apiKey) return { ok: false, errMsg: "Coze PAT 解密失败" };
  const result = await cozeChat(
    {
      pat: apiKey,
      botId: cozeProvider.botId ?? "",
      apiBase: cozeProvider.endpoint,
      timeoutMs: 30_000,
    },
    query
  );
  if (!result.ok) return { ok: false, errMsg: result.errMsg };
  return { ok: true, answer: result.reply };
}

/** 双轨检索（管理页“检索测试”与 chat 装配共用） */
export async function kbSearch(query: string, opts: { tags?: string[] } = {}): Promise<KbSearchResult> {
  const [local, coze] = await Promise.all([
    searchLocal(query, { tags: opts.tags }).then(
      (hits) => hits,
      (err) => err as Error
    ),
    searchViaCoze(query).then(
      (r) => r,
      (err) => ({ ok: false, errMsg: err instanceof Error ? err.message : String(err) })
    ),
  ]);
  return {
    hits: Array.isArray(local) ? local : [],
    localError: Array.isArray(local) ? undefined : local.message,
    cozeError: coze.ok ? undefined : coze.errMsg,
  };
}
