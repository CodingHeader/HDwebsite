/**
 * C-03：知识库文件解析（localParse）——docx（mammoth）/ Markdown / TXT；`.doc` 无纯 JS 解析 → skipped。
 * 纯函数模块：只依赖 Buffer 与 mammoth，无 prisma / 无 fs / 无网络（调用方传入内容或 Buffer）。
 *
 * localParse 取值（与 prisma/schema.prisma 的 KnowledgeFile.localParse 注释一致）：
 *   pending（未处理）/ ok（已抽文本）/ skipped（格式不支持本地解析，如 .doc）/ failed（解析抛错）
 */
import { kbFileExtOf } from "@/contracts/kb";

export type LocalParseState = "pending" | "ok" | "skipped" | "failed";

export type ParseResult = {
  state: LocalParseState;
  /** 抽取出的纯文本（state !== "ok" 时为空串） */
  text: string;
  /** 失败/跳过原因（state === "ok" 时为 null） */
  error: string | null;
};

/** 去掉 UTF-8 BOM 与 \r\n 归一化（Markdown/TXT 直读时用） */
export function normalizeText(raw: string): string {
  return raw.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
}

/**
 * docx → 纯文本（mammoth.extractRawText）。
 * mammoth 只接受 Buffer/ArrayBuffer（Node 侧），故入参为 Uint8Array。
 */
export async function parseDocx(buf: Uint8Array): Promise<ParseResult> {
  try {
    const mammoth = await import("mammoth");
    const { value } = await mammoth.extractRawText({ buffer: Buffer.from(buf) });
    const text = normalizeText(value ?? "");
    if (!text.trim()) {
      return { state: "failed", text: "", error: "docx 未抽取到文本内容（可能为空文档）" };
    }
    return { state: "ok", text, error: null };
  } catch (err) {
    return { state: "failed", text: "", error: err instanceof Error ? err.message : "docx 解析失败" };
  }
}

/**
 * 按扩展名解析文件内容。
 * - docx → mammoth 抽文本
 * - md / markdown / txt → UTF-8 直读（BOM 容错）
 * - doc → **skipped**（ADR-025：无纯 JS 解析方案；投 Coze 侧仍按 COZE_FILE_TYPE_MAP 处理）
 */
export async function parseByExt(filename: string, buf: Uint8Array): Promise<ParseResult> {
  const ext = kbFileExtOf(filename);
  switch (ext) {
    case "docx":
      return parseDocx(buf);
    case "md":
    case "markdown":
    case "txt": {
      const text = normalizeText(Buffer.from(buf).toString("utf8"));
      if (!text.trim()) return { state: "failed", text: "", error: "文件内容为空" };
      return { state: "ok", text, error: null };
    }
    case "doc":
      return { state: "skipped", text: "", error: "旧版 .doc 无纯 JS 解析方案（ADR-025），本地不入条目，仅同步 Coze" };
    default:
      return { state: "skipped", text: "", error: `扩展名 .${ext || "(空)"} 不在本地解析白名单` };
  }
}
