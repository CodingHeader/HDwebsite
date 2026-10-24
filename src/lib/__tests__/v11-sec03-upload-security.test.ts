/**
 * V11-SEC-03：user-actions 频控、上传魔数正向校验与全站安全响应头回归测试。
 *
 * 缺陷（V1.1 审计 §安全.4/5）：
 *  - /api/user-actions 公开写入无频控 → 可无限刷埋点；
 *  - /api/upload 只按浏览器声明 Content-Type 白名单 → 改名伪装的任意文件可入库；
 *  - 全站无 X-Content-Type-Options / X-Frame-Options / Referrer-Policy。
 *
 * K2 决议：上传容量上限维持 20MB 不变（安全目标由魔数校验达成，容量为产品规格正交项）。
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.hoisted(() => {
  const tmp = process.env.TMPDIR || process.env.TEMP || "/tmp";
  process.env.DATABASE_URL = `file:${tmp}/hdw-contract-v11sec03-${process.pid}-${Date.now()}.db`;
  delete process.env.ENABLE_HSTS;
});

import { cleanupTestDb, ctx, initTestDb, json } from "./api-contract/harness";
import nextConfig from "../../../next.config";

import { UPLOAD_MAX_SIZE, UPLOAD_MIME_EXT, detectUploadMagic, validateUploadMagic } from "@/lib/storage";
import { __resetRateLimitBuckets, __setRateLimitClock } from "@/lib/rate-limit";
import { POST as uaPOST } from "@/app/api/user-actions/route";

// ── K2 决议锚点：容量维持 20MB ────────────────────────────────

describe("K2：上传容量上限维持 20MB 不变", () => {
  it("UPLOAD_MAX_SIZE === 20 * 1024 * 1024（防后续误收紧/放宽）", () => {
    expect(UPLOAD_MAX_SIZE).toBe(20 * 1024 * 1024);
  });
});

// ── 魔数正向校验（双向：声明 → 头字节；头字节 → 声明）─────────

const PNG_HEAD = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0];
const JPEG_HEAD = [0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10];
const GIF87A = [...Buffer.from("GIF87a"), 0x01, 0x00];
const GIF89A = [...Buffer.from("GIF89a"), 0x01, 0x00];
const WEBP_HEAD = [...Buffer.from("RIFF"), 0x14, 0x00, 0x00, 0x00, ...Buffer.from("WEBP"), 0x56];
const PDF_HEAD = [...Buffer.from("%PDF-1.7"), 0x0a];
const MP4_HEAD = [0x00, 0x00, 0x00, 0x18, ...Buffer.from("ftypmp42"), 0x00];
const TEXT_HEAD = [...Buffer.from("Hello, this is not an image at all.")] as number[];

describe("storage/validateUploadMagic：魔数正向校验", () => {
  it("真实图片头 + 声明一致 → 放行（JPEG/PNG/GIF87a/GIF89a/WebP）", () => {
    expect(validateUploadMagic("image/jpeg", new Uint8Array(JPEG_HEAD))).toEqual({ ok: true });
    expect(validateUploadMagic("image/png", new Uint8Array(PNG_HEAD))).toEqual({ ok: true });
    expect(validateUploadMagic("image/gif", new Uint8Array(GIF87A))).toEqual({ ok: true });
    expect(validateUploadMagic("image/gif", new Uint8Array(GIF89A))).toEqual({ ok: true });
    expect(validateUploadMagic("image/webp", new Uint8Array(WEBP_HEAD))).toEqual({ ok: true });
  });

  it("PDF / MP4 标准文件头 + 声明一致 → 放行", () => {
    expect(validateUploadMagic("application/pdf", new Uint8Array(PDF_HEAD))).toEqual({ ok: true });
    expect(validateUploadMagic("video/mp4", new Uint8Array(MP4_HEAD))).toEqual({ ok: true });
  });

  it("伪装：文本内容声明 image/png → 拒绝（审计核心缺陷）", () => {
    const r = validateUploadMagic("image/png", new Uint8Array(TEXT_HEAD));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toContain("不符");
  });

  it("双向：真实 PNG 头声明 image/jpeg → 拒绝并报出实际类型", () => {
    const r = validateUploadMagic("image/jpeg", new Uint8Array(PNG_HEAD));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toContain("image/png");
  });

  it("头字节过短/为空 → 拒绝", () => {
    expect(validateUploadMagic("image/png", new Uint8Array([0x89, 0x50])).ok).toBe(false);
    expect(validateUploadMagic("image/jpeg", new Uint8Array([])).ok).toBe(false);
  });

  it("WebP 缺偏移 8 处 WEBP 标记（仅 RIFF 容器）→ 拒绝", () => {
    const riffOnly = [...Buffer.from("RIFF"), 0, 0, 0, 0, ...Buffer.from("WAVE")];
    expect(validateUploadMagic("image/webp", new Uint8Array(riffOnly)).ok).toBe(false);
  });

  it("声明类型不在上传白名单 → 拒绝（白名单口径不变）", () => {
    const r = validateUploadMagic("image/bmp", new Uint8Array([0x42, 0x4d]));
    expect(r.ok).toBe(false);
    // 白名单本身未被改动（mp4/pdf 仍在，容量外规格不动）
    expect(Object.keys(UPLOAD_MIME_EXT).sort()).toEqual(
      ["application/pdf", "image/gif", "image/jpeg", "image/png", "image/webp", "video/mp4"]
    );
  });

  it("detectUploadMagic：按头识别白名单类型；白名单外/文本返回 null", () => {
    expect(detectUploadMagic(new Uint8Array(PNG_HEAD))).toBe("image/png");
    expect(detectUploadMagic(new Uint8Array(JPEG_HEAD))).toBe("image/jpeg");
    expect(detectUploadMagic(new Uint8Array(WEBP_HEAD))).toBe("image/webp");
    expect(detectUploadMagic(new Uint8Array(MP4_HEAD))).toBe("video/mp4");
    expect(detectUploadMagic(new Uint8Array(TEXT_HEAD))).toBeNull();
    expect(detectUploadMagic(new Uint8Array([0x42, 0x4d, 0x00]))).toBeNull(); // BMP 不在上传白名单
  });
});

// ── next.config.ts：安全响应头 ────────────────────────────────

function globalHeaders(rows: { source: string; headers: { key: string; value: string }[] }[]) {
  return rows.find((r) => r.source === "/:path*")?.headers ?? [];
}

describe("next.config headers：全站安全响应头", () => {
  const headersOf = async () => {
    // NextConfig.headers 为可选成员（本仓库 next.config.ts 必有实现）
    const rows = (await nextConfig.headers?.()) ?? [];
    return rows;
  };

  it("默认输出 nosniff / SAMEORIGIN / strict-origin-when-cross-origin，且不输出 HSTS（HTTP 部署默认关）", async () => {
    delete process.env.ENABLE_HSTS;
    const rows = await headersOf();
    const headers = globalHeaders(rows);
    const get = (k: string) => headers.find((h) => h.key === k)?.value;
    expect(get("X-Content-Type-Options")).toBe("nosniff");
    expect(get("X-Frame-Options")).toBe("SAMEORIGIN");
    expect(get("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
    expect(get("Strict-Transport-Security")).toBeUndefined();
    // 原 /api CORS 头保留
    expect(rows.find((r) => r.source === "/api/:path*")?.headers.map((h) => h.key)).toContain(
      "Access-Control-Allow-Origin"
    );
  });

  it("ENABLE_HSTS=1（HTTPS 部署）→ 追加 HSTS", async () => {
    process.env.ENABLE_HSTS = "1";
    try {
      const rows = await headersOf();
      const headers = globalHeaders(rows);
      expect(headers.find((h) => h.key === "Strict-Transport-Security")?.value).toBe(
        "max-age=31536000; includeSubDomains"
      );
    } finally {
      delete process.env.ENABLE_HSTS;
    }
  });
});

// ── 集成：user-actions 频控（真实路由 + 临时库）───────────────

function uaBody(type: string) {
  return { actionType: type, actionTarget: "home", sessionId: `sess-sec03-${type}` };
}

function uaRequest(type: string): Request {
  return new Request("http://localhost/api/user-actions", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(uaBody(type)),
  });
}

beforeAll(async () => {
  await initTestDb();
  delete process.env.TRUST_PROXY;
  __resetRateLimitBuckets();
}, 60_000);

afterAll(async () => {
  __resetRateLimitBuckets();
  __setRateLimitClock(null);
  const { prisma } = await import("@/lib/prisma");
  await prisma.$disconnect();
  cleanupTestDb();
});

describe("user-actions：公开埋点频控", () => {
  it("同 IP+类型 30 次内 201，第 31 次 429 + Retry-After；换类型不受影响", async () => {
    __resetRateLimitBuckets();
    for (let i = 0; i < 30; i++) {
      const res = await uaPOST(uaRequest("view"), ctx());
      expect(res.status).toBe(201);
    }
    const blocked = await uaPOST(uaRequest("view"), ctx());
    expect(blocked.status).toBe(429);
    const ra = Number(blocked.headers.get("retry-after"));
    expect(ra).toBeGreaterThanOrEqual(1);
    expect(ra).toBeLessThanOrEqual(60);
    const body = await json(blocked);
    expect(body.code).toBe(429);
    expect(body.data).toBeNull();

    // 频控键含 actionType：view 被限不影响 click 记录
    const click = await uaPOST(uaRequest("click"), ctx());
    expect(click.status).toBe(201);
  });

  it("伪造 x-forwarded-for 换键绕不过（默认不采信转发头）", async () => {
    __resetRateLimitBuckets();
    delete process.env.TRUST_PROXY;
    for (let i = 0; i < 30; i++) {
      const req = new Request("http://localhost/api/user-actions", {
        method: "POST",
        headers: { "content-type": "application/json", "x-forwarded-for": `10.1.${Math.floor(i / 250)}.${(i % 250) + 1}` },
        body: JSON.stringify(uaBody("submit")),
      });
      const res = await uaPOST(req, ctx());
      expect(res.status).toBe(201);
    }
    const forged = new Request("http://localhost/api/user-actions", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": "10.1.9.9" },
      body: JSON.stringify(uaBody("submit")),
    });
    expect((await uaPOST(forged, ctx())).status).toBe(429);
  });
});
