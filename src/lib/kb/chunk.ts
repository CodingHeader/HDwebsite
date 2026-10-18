/**
 * C-03：知识库文本切分（本地条目 chunk）——**每片 ≤800 字、相邻重叠 100 字**。
 * 纯函数；按字符切（中文按字），不在代理对中间切断，尽量在句读边界回退。
 */

/** 单片上限（字符） */
export const CHUNK_MAX_CHARS = 800;
/** 相邻片重叠（字符） */
export const CHUNK_OVERLAP_CHARS = 100;

/** 句读回退候选（优先在此处断开，避免半句） */
const BREAK_CHARS = ["\n", "。", "！", "？", "；", ".", "!", "?", ";", "，", ","];

/** 是否在代理对中间（高代理 0xD800-0xDBFF 之后紧跟低代理 0xDC00-0xDFFF） */
function isSplitSurrogatePair(text: string, index: number): boolean {
  if (index <= 0 || index >= text.length) return false;
  const prev = text.charCodeAt(index - 1);
  const next = text.charCodeAt(index);
  return prev >= 0xd800 && prev <= 0xdbff && next >= 0xdc00 && next <= 0xdfff;
}

/**
 * 在 [from, limit] 区间内回退到最近的句读/空白边界（找不到则用 limit）。
 * 保证不以代理对拆分结尾（必要时再退 1 位）。
 */
function findBreak(text: string, from: number, limit: number): number {
  const floor = from + Math.floor((limit - from) * 0.6); // 最多回退 40%，避免碎片过短
  for (let i = limit; i > floor; i--) {
    if (isSplitSurrogatePair(text, i)) continue;
    const ch = text[i - 1];
    if (BREAK_CHARS.includes(ch)) return i;
  }
  let end = limit;
  if (isSplitSurrogatePair(text, end)) end -= 1;
  return end;
}

/**
 * 切分文本：每片 ≤{@link CHUNK_MAX_CHARS} 字符，相邻片重叠 {@link CHUNK_OVERLAP_CHARS} 字符。
 * - 空/纯空白输入 → 空数组
 * - 短文本（≤800）→ 单片
 * - 长文本 → 逐片推进，`next = end - overlap`，保证不丢字、不无限循环
 */
export function chunkText(text: string, max = CHUNK_MAX_CHARS, overlap = CHUNK_OVERLAP_CHARS): string[] {
  const src = text ?? "";
  if (!src.trim()) return [];
  if (max <= 0) throw new Error("chunkText: max 必须为正数");
  if (overlap < 0 || overlap >= max) throw new Error("chunkText: overlap 必须在 [0, max) 内");

  const out: string[] = [];
  let start = 0;
  while (start < src.length) {
    const limit = Math.min(start + max, src.length);
    const end = limit === src.length ? (isSplitSurrogatePair(src, limit) ? limit - 1 : limit) : findBreak(src, start, limit);
    const piece = src.slice(start, end).trim();
    if (piece) out.push(piece);
    if (end >= src.length) break;
    const next = end - overlap;
    // 防御：必须前进（否则死循环）
    start = next > start ? next : end;
  }
  return out;
}

/** 估算条目数（写入 KnowledgeFile.chunkCount 前用；空文本 → 0） */
export function estimateChunkCount(text: string): number {
  return chunkText(text).length;
}
