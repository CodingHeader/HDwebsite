/**
 * V11-KB-01/03/04：上传推送 Coze、检索页结构、拒审失效、正向魔数。
 */
import { describe, expect, it, vi } from "vitest";
import { checkIngestFile } from "@/lib/kb/ingest";

describe("V11-KB-04：上传正向魔数校验", () => {
  const mkFile = (name: string, bytes: Uint8Array, type = "application/octet-stream") =>
    new File([bytes], name, { type });

  it("docx 伪造（非 ZIP 容器）被拒", async () => {
    const fake = mkFile("fake.docx", new TextEncoder().encode("这不是 zip，是文本伪装的 docx 文件内容，足够长以过最小体积检查一些实现，但魔数不对。"));
    const r = await checkIngestFile(fake);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toContain("ZIP");
  });

  it("真 docx 头（PK\x03\x04）通过魔数关", async () => {
    const bytes = new Uint8Array([0x50, 0x4b, 0x03, 0x04, ...new Array(64).fill(0x41)]);
    const r = await checkIngestFile(mkFile("real.docx", bytes));
    expect(r.ok).toBe(true);
  });

  it("txt 伪装 PNG（黑名单魔数）被拒（既有能力）", async () => {
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, ...new Array(32).fill(0x41)]);
    const r = await checkIngestFile(mkFile("fake.txt", png));
    expect(r.ok).toBe(false);
  });

  it("txt 含 NUL 字节（二进制伪装）被正向校验拒", async () => {
    const bytes = new Uint8Array([0xe4, 0xbd, 0xa0, 0x00, 0xe5, 0xa5, 0xbd, ...new Array(32).fill(0x41)]);
    const r = await checkIngestFile(mkFile("binary.txt", bytes, "text/plain"));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toContain("UTF-8");
  });

  it("正常 UTF-8 markdown 通过", async () => {
    const r = await checkIngestFile(mkFile("ok.md", new TextEncoder().encode("# 标题\n\n正文内容，中文与 ASCII mixed。足够长度。"), "text/markdown"));
    expect(r.ok).toBe(true);
  });
});

describe("V11-KB-04：检索排除回收站切片", () => {
  it("searchLocalWeighted 的 where 排除已删文件 fileId（源码契约）", async () => {
    // 以源码文本断言过滤逻辑存在（行为级测试需 DB fixture，已在 e2e/集成层覆盖 trash 闭环）
    const fs = await import("node:fs");
    const src = fs.readFileSync("src/lib/kb/local.ts", "utf8");
    expect(src).toContain("deletedAt: { not: null }");
    expect(src).toContain("notIn");
  });
});

describe("V11-KB-04：采集拒绝 → 关联切片停用", () => {
  it("拒绝分支调用 knowledge.updateMany 停用（源码契约）", async () => {
    const fs = await import("node:fs");
    const src = fs.readFileSync("src/app/api/collect-items/[id]/route.ts", "utf8");
    expect(src).toContain('data: { status: "disabled" }');
    expect(src).toContain("collectItemId: item.id");
  });
});
