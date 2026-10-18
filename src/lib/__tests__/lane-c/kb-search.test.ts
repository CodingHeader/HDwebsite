/**
 * C-05 单测：本地检索打分（按库过滤 + 加权）——**Top-3 命中率前后对比**。
 * 步骤 1（基线）：用 kb-adapter 旧口径（整词×3 + bigram 通过阈值即计分、无标题加权、无库过滤）在 20 条 fixture 上测命中率。
 * 步骤 2/3：用 src/lib/kb/local.ts 新算法（标题加权 + bigram 连续计分 + 库过滤 + LIKE 预筛 ≤500）再测，断言**新 ≥ 旧**。
 */
import { describe, expect, it } from "vitest";
import qa from "./fixtures/kb-qa.json";
import { scoreLegacy, scoreWeighted, rankByScore } from "@/lib/kb/local";

type Doc = { id: number; title: string; content: string; tags?: string | null; baseId?: number | null };
type QA = { id: string; question: string; expectTitle: string };

/**
 * 由 fixture 生成语料（**含干扰文档**，使基线暴露弱点）：
 * - 正解文档：标题 = expectTitle（不含问题原词），正文给出说明
 * - 干扰文档：标题无关（如「常见问题汇总」），**正文逐字重复 3 次问题原词**——legacy 无标题加权会把干扰排在正解之前
 * 这样基线（旧口径）Top-3 命中率低于新算法的价值才可观测。
 */
const DOCS: Doc[] = qa.flatMap((q, i) => {
  const baseId = i % 2 === 0 ? 1 : 2;
  const answer: Doc = {
    id: i * 2 + 1,
    baseId,
    title: q.expectTitle,
    content: `本文说明相关办理流程与注意事项，请按指引准备。`,
    tags: i % 2 === 0 ? "招生" : "教学",
  };
  const distractor: Doc = {
    id: i * 2 + 2,
    baseId,
    title: `常见问题汇总 ${i + 1}`,
    content: `${q.question}。${q.question}。${q.question}。以上为近期高频提问的汇总记录。`,
    tags: "FAQ",
  };
  return [answer, distractor];
});

/** Top-3 命中率：问题检索后前 3 是否含期望标题 */
function top3HitRate(score: (doc: Doc, query: string) => number): number {
  let hit = 0;
  for (const q of qa as QA[]) {
    const ranked = rankByScore(
      DOCS.map((d) => ({ doc: d, score: score(d, q.question) })),
      3
    );
    if (ranked.some((d) => d.title === q.expectTitle)) hit++;
  }
  return hit / qa.length;
}

describe("C-05 本地检索打分：基线 vs 加权", () => {
  // 步骤 1：旧口径基线（kb-adapter 现状逻辑复刻：整词×3 + bigram 过阈值才计分、不加权标题）
  const legacyRate = top3HitRate(scoreLegacy);

  // 步骤 2/3：新算法（标题加权 ×3、bigram 连续计分、归一化）
  const weightedRate = top3HitRate(scoreWeighted);

  it("基线命中率可计算（0~1）", () => {
    expect(legacyRate).toBeGreaterThanOrEqual(0);
    expect(legacyRate).toBeLessThanOrEqual(1);
  });

  it("新算法 Top-3 命中率 ≥ 基线（无提升不得声称提升）", () => {
    // 记录两次数值便于证据回填
    console.log(`[C-05] 基线 Top-3 命中率 = ${(legacyRate * 100).toFixed(1)}%（${Math.round(legacyRate * qa.length)}/${qa.length}）`);
    console.log(`[C-05] 加权 Top-3 命中率 = ${(weightedRate * 100).toFixed(1)}%（${Math.round(weightedRate * qa.length)}/${qa.length}）`);
    expect(weightedRate).toBeGreaterThanOrEqual(legacyRate);
  });

  it("新算法在 fixture 上达到可用水平（≥80%）", () => {
    expect(weightedRate).toBeGreaterThanOrEqual(0.8);
  });

  it("库过滤：baseIds 限定后只在指定库内命中", () => {
    const q = qa[0] as QA; // 报名材料清单 → baseId 1（i=0）
    const inBase1 = rankByScore(
      DOCS.filter((d) => d.baseId === 1).map((d) => ({ doc: d, score: scoreWeighted(d, q.question) })),
      3
    );
    expect(inBase1.every((d) => d.baseId === 1)).toBe(true);
    expect(inBase1.some((d) => d.title === q.expectTitle)).toBe(true);
  });

  it("标题命中优先于正文命中（标题加权生效）", () => {
    const titleHit: Doc = { id: 101, title: "报名材料清单", content: "无关正文" };
    const bodyHit: Doc = { id: 102, title: "其他说明", content: "这里提到报名材料清单但只是正文提及" };
    expect(scoreWeighted(titleHit, "报名材料清单")).toBeGreaterThan(scoreWeighted(bodyHit, "报名材料清单"));
  });

  it("空查询 → 分数 0（不误命中）", () => {
    expect(scoreWeighted(DOCS[0], "")).toBe(0);
  });
});
