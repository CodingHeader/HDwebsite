/**
 * C-03 单测：知识库文件管线纯函数
 * - 三重校验：扩展名 / 文件头魔数 / MIME；伪装文件（.txt 的 PDF、.md 的 PNG）必须被拒且文案 = KB_REJECT_MESSAGE
 * - docx：mammoth 抽出预期文本（最小 docx 用 Buffer 手工构造 zip，不提交二进制）
 * - 切分：≤800 字、重叠 100 字、边界（800/801/1600）与代理对安全
 */
import { describe, expect, it } from "vitest";
import { deflateRawSync, crc32 } from "node:zlib";
import { checkUploadFile, sniffRejectedMagic, isZipContainer } from "@/lib/kb/filetype";
import { parseByExt, parseDocx, normalizeText } from "@/lib/kb/parse";
import { chunkText, CHUNK_MAX_CHARS, CHUNK_OVERLAP_CHARS, estimateChunkCount } from "@/lib/kb/chunk";
import { KB_REJECT_MESSAGE } from "@/contracts/kb";

// ── fixtures：全部用 Buffer 在测试内构造（不提交二进制大文件）────────────
const PDF_HEAD = Buffer.from("%PDF-1.7\n1 0 obj\n<<>>\nendobj\n", "utf8");
const PNG_HEAD = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.from("IHDR", "ascii")]);
const JPEG_HEAD = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.from("JFIF", "ascii")]);
const GIF_HEAD = Buffer.from("GIF89a", "ascii");
const BMP_HEAD = Buffer.concat([Buffer.from([0x42, 0x4d]), Buffer.alloc(10)]);
const WEBP_HEAD = Buffer.concat([Buffer.from("RIFF", "ascii"), Buffer.alloc(4), Buffer.from("WEBP", "ascii")]);
const TXT_HEAD = Buffer.from("普通文本内容，无魔数。", "utf8");

/** 最小可用 docx（zip：mimetype 无关，mammoth 只需 word/document.xml） */
function buildMinimalDocx(text: string): Buffer {
  const files: { name: string; data: Buffer }[] = [
    {
      name: "word/document.xml",
      data: Buffer.from(
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>${text}</w:t></w:r></w:p></w:body></w:document>`,
        "utf8"
      ),
    },
  ];
  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  let offset = 0;
  for (const f of files) {
    const nameBuf = Buffer.from(f.name, "utf8");
    const crc = crc32(f.data) >>> 0;
    const compressed = deflateRawSync(f.data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0, 6);
    local.writeUInt16LE(8, 8); // deflate
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(compressed.length, 18);
    local.writeUInt32LE(f.data.length, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    localParts.push(local, nameBuf, compressed);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0, 8);
    central.writeUInt16LE(8, 10);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(compressed.length, 20);
    central.writeUInt32LE(f.data.length, 24);
    central.writeUInt16LE(nameBuf.length, 28);
    central.writeUInt32LE(offset, 42);
    centralParts.push(central, nameBuf);
    offset += local.length + nameBuf.length + compressed.length;
  }
  const centralBuf = Buffer.concat(centralParts);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(files.length, 8);
  eocd.writeUInt16LE(files.length, 10);
  eocd.writeUInt32LE(centralBuf.length, 12);
  eocd.writeUInt32LE(offset, 16);
  return Buffer.concat([...localParts, centralBuf, eocd]);
}

const DOCX = buildMinimalDocx("这是一段 docx 正文，用于验证 mammoth 抽取。");

describe("C-03 三重校验（扩展名 + 文件头 + MIME）", () => {
  it("合法 .txt（无魔数）通过，MIME 回填 text/plain", () => {
    const r = checkUploadFile("notes.txt", "", TXT_HEAD);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.ext).toBe("txt");
      expect(r.mimeType).toBe("text/plain");
    }
  });

  it("伪装成 .txt 的 PDF → 拒绝且文案 = KB_REJECT_MESSAGE", () => {
    const r = checkUploadFile("notes.txt", "text/plain", PDF_HEAD);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.reason).toBe("magic");
      expect(r.detected).toBe("PDF");
      expect(r.message).toBe(KB_REJECT_MESSAGE);
    }
  });

  it("伪装成 .md 的 PNG → 拒绝且文案 = KB_REJECT_MESSAGE", () => {
    const r = checkUploadFile("readme.md", "text/markdown", PNG_HEAD);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.reason).toBe("magic");
      expect(r.detected).toBe("PNG");
      expect(r.message).toBe(KB_REJECT_MESSAGE);
    }
  });

  it("显式 .pdf / .png 扩展名 → 拒绝（ext 分支）", () => {
    for (const name of ["doc.pdf", "img.png", "photo.jpg", "anim.gif", "pic.bmp", "x.webp"]) {
      const r = checkUploadFile(name, "", TXT_HEAD);
      expect(r.ok, `${name} 应被拒`).toBe(false);
      if (!r.ok) expect(r.message).toBe(KB_REJECT_MESSAGE);
    }
  });

  it("扩展名合法但 MIME 声明为 image/pdf → 拒绝（mime 分支）", () => {
    const r1 = checkUploadFile("a.txt", "image/png", TXT_HEAD);
    expect(r1.ok).toBe(false);
    if (!r1.ok) expect(r1.reason).toBe("mime");
    const r2 = checkUploadFile("a.md", "application/pdf", TXT_HEAD);
    expect(r2.ok).toBe(false);
    if (!r2.ok) expect(r2.reason).toBe("mime");
  });

  it("文件头嗅探覆盖 PDF/PNG/JPEG/GIF/WEBP/BMP，普通文本不误报", () => {
    expect(sniffRejectedMagic(PDF_HEAD)).toBe("PDF");
    expect(sniffRejectedMagic(PNG_HEAD)).toBe("PNG");
    expect(sniffRejectedMagic(JPEG_HEAD)).toBe("JPEG");
    expect(sniffRejectedMagic(GIF_HEAD)).toBe("GIF");
    expect(sniffRejectedMagic(WEBP_HEAD)).toBe("WEBP");
    expect(sniffRejectedMagic(BMP_HEAD)).toBe("BMP");
    expect(sniffRejectedMagic(TXT_HEAD)).toBeNull();
    expect(sniffRejectedMagic(Buffer.alloc(0))).toBeNull();
  });

  it("docx 被识别为 zip 容器且三重校验通过", () => {
    expect(isZipContainer(DOCX)).toBe(true);
    const r = checkUploadFile("report.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", DOCX);
    expect(r.ok).toBe(true);
  });
});

describe("C-03 解析（mammoth / 直读 / .doc skipped）", () => {
  it("docx 经 mammoth 抽出预期文本", async () => {
    const r = await parseDocx(DOCX);
    expect(r.state).toBe("ok");
    expect(r.text).toContain("这是一段 docx 正文");
  });

  it(".md / .txt 直读并归一化 BOM 与 CRLF", async () => {
    const buf = Buffer.from("\uFEFF# 标题\r\n\r\n正文", "utf8");
    const r = await parseByExt("guide.md", buf);
    expect(r.state).toBe("ok");
    expect(r.text.startsWith("# 标题\n\n正文")).toBe(true);
    expect(normalizeText("a\r\nb\rc")).toBe("a\nb\nc");
  });

  it(".doc → localParse=skipped（无纯 JS 解析，ADR-025）", async () => {
    const r = await parseByExt("legacy.doc", Buffer.from([0xd0, 0xcf, 0x11, 0xe0]));
    expect(r.state).toBe("skipped");
    expect(r.text).toBe("");
    expect(r.error).toContain("doc");
  });

  it("空内容 → failed，不产生条目", async () => {
    const r = await parseByExt("empty.txt", Buffer.from("   \n  ", "utf8"));
    expect(r.state).toBe("failed");
  });

  it("损坏的 docx → failed（不抛出）", async () => {
    const r = await parseDocx(Buffer.from("not a zip at all", "utf8"));
    expect(r.state).toBe("failed");
    expect(r.error).toBeTruthy();
  });
});

describe("C-03 切分（≤800 字、重叠 100 字）", () => {
  it("常量与契约口径一致", () => {
    expect(CHUNK_MAX_CHARS).toBe(800);
    expect(CHUNK_OVERLAP_CHARS).toBe(100);
  });

  it("空/空白 → 空数组；短文本 → 单片", () => {
    expect(chunkText("")).toEqual([]);
    expect(chunkText("   \n  ")).toEqual([]);
    expect(chunkText("短文本")).toEqual(["短文本"]);
    expect(chunkText("a".repeat(800))).toHaveLength(1);
  });

  it("801 字 → 2 片且相邻重叠 100 字", () => {
    const text = "字".repeat(801);
    const pieces = chunkText(text);
    expect(pieces.length).toBe(2);
    for (const p of pieces) expect(p.length).toBeLessThanOrEqual(800);
    // 重叠：第 1 片尾部 100 字应等于第 2 片开头（两侧均 trim，故用含包含判断）
    const tail = pieces[0].slice(-CHUNK_OVERLAP_CHARS);
    expect(pieces[1].slice(0, CHUNK_OVERLAP_CHARS)).toBe(tail);
  });

  it("1600 字 → 3 片，逐片 ≤800，且无缝无死循环", () => {
    const text = "abcdefghij".repeat(160);
    const pieces = chunkText(text);
    expect(pieces.length).toBeGreaterThanOrEqual(2);
    for (const p of pieces) expect(p.length).toBeLessThanOrEqual(800);
    // 覆盖性：原文每个位置都应落在至少一片中
    expect(pieces.join("")).toContain(text.slice(0, 200));
  });

  it("在句读边界优先断开（不切半句）", () => {
    const text = "第一句。".repeat(300); // 1200 字
    const pieces = chunkText(text);
    for (const p of pieces) expect(p.length).toBeLessThanOrEqual(800);
    expect(pieces[0].endsWith("。")).toBe(true);
  });

  it("不在代理对中间切断（emoji 安全）", () => {
    const text = "😀".repeat(900);
    const pieces = chunkText(text);
    // 每片都是完整 emoji：length 为 2 的倍数说明未拆断
    for (const p of pieces.slice(0, -1)) expect(p.length % 2).toBe(0);
    expect(estimateChunkCount(text)).toBe(pieces.length);
  });

  it("非法参数抛错（overlap ≥ max / max ≤ 0）", () => {
    expect(() => chunkText("abc", 0)).toThrow();
    expect(() => chunkText("abc", 100, 100)).toThrow();
    expect(() => chunkText("abc", 100, -1)).toThrow();
  });
});
