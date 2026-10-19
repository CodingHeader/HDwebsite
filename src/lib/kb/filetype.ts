/**
 * C-03：知识库上传文件的**三重校验**（扩展名 + MIME + 文件头魔数）。
 * 契约唯一源 `src/contracts/kb.ts`：白名单 `KB_FILE_EXTS`、拒绝文案 `KB_REJECT_MESSAGE`。
 * ADR-025：只接受 Word（.docx/.doc）、Markdown（.md/.markdown）、TXT；**PDF 与图片一律拒绝**
 * （即使改名伪装成 .txt/.md，也要靠文件头魔数拦下）。
 *
 * 本模块是纯函数（无 prisma / 无 fs / 无网络），可被路由层与单测直接调用。
 */
import { KB_FILE_EXTS, KB_REJECT_MESSAGE, kbFileExtOf, isAllowedKbExt } from "@/contracts/kb";

/** 校验结果：ok=true 时 ext 一定在白名单内 */
export type FileTypeCheck =
  | { ok: true; ext: string; mimeType: string }
  | { ok: false; reason: "ext" | "mime" | "magic"; message: string; detected?: string };

/** 扩展名 → 期望 MIME（宽松：只用于一致性提示，不作为硬拒绝依据） */
const MIME_BY_EXT: Record<string, string> = {
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  doc: "application/msword",
  md: "text/markdown",
  markdown: "text/markdown",
  txt: "text/plain",
};

/** 扩展名 → 期望 MIME 前缀（宽松匹配：text/* 与 application/* 混用常见） */
export function mimeForExt(ext: string): string {
  return MIME_BY_EXT[ext.toLowerCase()] ?? "application/octet-stream";
}

/** 被明确拒绝的文件头（PDF 与各类图片；ADR-025） */
const REJECTED_MAGIC: { name: string; bytes: number[]; extraAt?: { offset: number; bytes: number[] } }[] = [
  { name: "PDF", bytes: [0x25, 0x50, 0x44, 0x46] }, // %PDF
  { name: "PNG", bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
  { name: "JPEG", bytes: [0xff, 0xd8, 0xff] },
  { name: "GIF", bytes: [0x47, 0x49, 0x46, 0x38] }, // GIF8
  { name: "WEBP", bytes: [0x52, 0x49, 0x46, 0x46], extraAt: { offset: 8, bytes: [0x57, 0x45, 0x42, 0x50] } }, // RIFF....WEBP
  { name: "BMP", bytes: [0x42, 0x4d] }, // BM
  { name: "TIFF", bytes: [0x49, 0x49, 0x2a, 0x00] },
  { name: "TIFF", bytes: [0x4d, 0x4d, 0x00, 0x2a] },
];

function startsWith(buf: Uint8Array, bytes: number[], offset = 0): boolean {
  if (buf.length < offset + bytes.length) return false;
  for (let i = 0; i < bytes.length; i++) {
    if (buf[offset + i] !== bytes[i]) return false;
  }
  return true;
}

/**
 * 文件头嗅探：命中被拒类型返回类型名，否则 null。
 * 覆盖 PDF 与 PNG/JPEG/GIF/WEBP/BMP/TIFF（ADR-025 的"不支持 PDF 和图片"）。
 */
export function sniffRejectedMagic(buf: Uint8Array): string | null {
  for (const m of REJECTED_MAGIC) {
    if (!startsWith(buf, m.bytes)) continue;
    if (m.extraAt && !startsWith(buf, m.extraAt.bytes, m.extraAt.offset)) continue;
    return m.name;
  }
  return null;
}

/** docx 是 zip 容器：`PK\x03\x04`（用于宽松识别；不作为拒绝依据） */
export function isZipContainer(buf: Uint8Array): boolean {
  return startsWith(buf, [0x50, 0x4b, 0x03, 0x04]);
}

/**
 * 三重校验（顺序：扩展名 → 文件头 → MIME 一致性）。
 * 任一失败都返回 `KB_REJECT_MESSAGE`（与 C-06 路由 400 文案一致，供 E-04 文件行直接展示）。
 *
 * @param filename 原始文件名（含扩展名）
 * @param mimeType 浏览器上报的 MIME（可为空串，此时只做扩展名 + 魔数校验）
 * @param head     文件头字节（建议 ≥16 字节）
 */
export function checkUploadFile(filename: string, mimeType: string | null | undefined, head: Uint8Array): FileTypeCheck {
  const ext = kbFileExtOf(filename);

  // ① 扩展名白名单
  if (!isAllowedKbExt(ext)) {
    return { ok: false, reason: "ext", message: KB_REJECT_MESSAGE, detected: ext || "(无扩展名)" };
  }

  // ② 文件头魔数：伪装文件（如 .txt 的 PDF / .md 的 PNG）在此拦下
  const magic = sniffRejectedMagic(head);
  if (magic) {
    return { ok: false, reason: "magic", message: KB_REJECT_MESSAGE, detected: magic };
  }

  // ③ MIME 一致性（宽松）：声明为 image/* 或 application/pdf 的也拒绝
  const mime = (mimeType ?? "").toLowerCase();
  if (mime.startsWith("image/") || mime === "application/pdf") {
    return { ok: false, reason: "mime", message: KB_REJECT_MESSAGE, detected: mime };
  }

  return { ok: true, ext, mimeType: mimeType && mimeType.trim() ? mimeType : mimeForExt(ext) };
}

/** 白名单扩展名集合（透出给 UI / 路由做提示，避免各处重复字面量） */
export const ALLOWED_EXTS: readonly string[] = KB_FILE_EXTS;
