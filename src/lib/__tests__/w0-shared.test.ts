/**
 * W0-03 共享基座模块单测：json-field 往返/坏 JSON 回落、http-client 超时与重试、
 * cache-tags 静默失效、storage 路径穿越拒绝。
 */
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { parseJsonField, stringifyJsonField } from "@/lib/json-field";
import { HttpError, httpFetch } from "@/lib/http-client";
import { WEB_TAGS, invalidateWebContent } from "@/lib/cache-tags";
import { backupsDir, dataDir, kbDir, resolveInside, uploadsDir } from "@/lib/storage";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("json-field", () => {
  it("正常 JSON 字符串 → 解析为对象/数组/原始值", () => {
    expect(parseJsonField('{"a":1}', {})).toEqual({ a: 1 });
    expect(parseJsonField("[1,2,3]", [])).toEqual([1, 2, 3]);
    expect(parseJsonField("42", 0)).toBe(42);
    expect(parseJsonField('"x"', "")).toBe("x");
    expect(parseJsonField("null", { d: 1 })).toBeNull();
  });

  it("空值（null/undefined/空串/空白）→ 回落 fallback", () => {
    expect(parseJsonField(null, [])).toEqual([]);
    expect(parseJsonField(undefined, { k: "v" })).toEqual({ k: "v" });
    expect(parseJsonField("", [])).toEqual([]);
    expect(parseJsonField("   ", [])).toEqual([]);
  });

  it("坏 JSON → 回落 fallback，不抛异常", () => {
    expect(parseJsonField("{oops", [])).toEqual([]);
    expect(parseJsonField("not-json", null)).toBeNull();
    expect(parseJsonField("[1,", { d: 2 })).toEqual({ d: 2 });
  });

  it("stringifyJsonField 恒返回字符串，且与 parseJsonField 往返一致", () => {
    const value = { a: [1, 2], b: "中文" };
    expect(stringifyJsonField(value)).toBe(JSON.stringify(value));
    expect(parseJsonField(stringifyJsonField(value), null)).toEqual(value);
    expect(stringifyJsonField(undefined)).toBe("null");
    expect(stringifyJsonField(null)).toBe("null");
    expect(stringifyJsonField([])).toBe("[]");
  });
});

describe("http-client", () => {
  const jsonResponse = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

  it("成功：返回原生 Response，可读 body", async () => {
    const fn = vi.fn(async () => jsonResponse({ ok: true }));
    vi.stubGlobal("fetch", fn);
    const res = await httpFetch("https://example.com/a", { logTag: "t" });
    expect(fn).toHaveBeenCalledTimes(1);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });

  it("非 2xx 默认抛 HttpError（带 status 与 bodyText），且不可重试状态码只请求一次", async () => {
    const fn = vi.fn(async () => new Response("bad request detail", { status: 400 }));
    vi.stubGlobal("fetch", fn);
    await expect(httpFetch("https://example.com/b", { retries: 3, retryDelayMs: 0 })).rejects.toMatchObject({
      name: "HttpError",
      status: 400,
      url: "https://example.com/b",
      bodyText: "bad request detail",
    });
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("可重试状态码（503）在重试耗尽后抛 HttpError", async () => {
    const fn = vi.fn(async () => new Response("unavailable", { status: 503 }));
    vi.stubGlobal("fetch", fn);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    await expect(httpFetch("https://example.com/c", { retries: 1, retryDelayMs: 0, logTag: "svc" })).rejects.toMatchObject({
      status: 503,
    });
    expect(fn).toHaveBeenCalledTimes(2);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0][0])).toContain("[svc]");
  });

  it("传输层失败重试后成功（fetch 失败 2 次、第 3 次成功）", async () => {
    let calls = 0;
    const fn = vi.fn(async () => {
      calls += 1;
      if (calls < 3) throw new Error(`boom ${calls}`);
      return jsonResponse({ ok: true });
    });
    vi.stubGlobal("fetch", fn);
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const res = await httpFetch("https://example.com/d", { retries: 2, retryDelayMs: 0 });
    expect(fn).toHaveBeenCalledTimes(3);
    expect(res.status).toBe(200);
  });

  it("传输层失败重试耗尽 → HttpError(status=0, isTransportError)", async () => {
    const fn = vi.fn(async () => {
      throw new DOMException("The operation was aborted due to timeout", "TimeoutError");
    });
    vi.stubGlobal("fetch", fn);
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const err = await httpFetch("https://example.com/e", { retries: 2, retryDelayMs: 0, timeoutMs: 5000 }).catch(
      (e: unknown) => e
    );
    expect(err).toBeInstanceOf(HttpError);
    const httpErr = err as HttpError;
    expect(httpErr.status).toBe(0);
    expect(httpErr.isTransportError).toBe(true);
    expect(httpErr.message).toContain("超时或网络错误");
    expect(httpErr.url).toBe("https://example.com/e");
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("throwOnHttpError:false → 原样返回错误响应，不抛", async () => {
    const fn = vi.fn(async () => new Response("nope", { status: 500 }));
    vi.stubGlobal("fetch", fn);
    const res = await httpFetch("https://example.com/f", { throwOnHttpError: false, retries: 5, retryDelayMs: 0 });
    expect(res.status).toBe(500);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("非法 timeoutMs / retries → HttpError（不发请求）", async () => {
    const fn = vi.fn(async () => jsonResponse({}));
    vi.stubGlobal("fetch", fn);
    await expect(httpFetch("https://example.com/g", { timeoutMs: 0 })).rejects.toBeInstanceOf(HttpError);
    await expect(httpFetch("https://example.com/g", { retries: -1 })).rejects.toBeInstanceOf(HttpError);
    expect(fn).not.toHaveBeenCalled();
  });
});

describe("cache-tags", () => {
  it("WEB_TAGS 冻结值与命名空间", () => {
    expect(WEB_TAGS).toEqual({ home: "web:home", articles: "web:articles", settings: "web:settings" });
    for (const v of Object.values(WEB_TAGS)) expect(v.startsWith("web:")).toBe(true);
  });

  it("invalidateWebContent 在无 Next 上下文时静默（不抛）", () => {
    expect(() => invalidateWebContent([WEB_TAGS.home, WEB_TAGS.articles, WEB_TAGS.settings])).not.toThrow();
    expect(() => invalidateWebContent(["unknown:tag"])).not.toThrow();
    expect(() => invalidateWebContent([])).not.toThrow();
  });
});

describe("storage", () => {
  it("四个根默认相对 process.cwd()（W0 零行为变化）", () => {
    expect(dataDir()).toBe(path.resolve(process.cwd(), "data"));
    expect(uploadsDir()).toBe(path.resolve(process.cwd(), "uploads"));
    expect(backupsDir()).toBe(path.resolve(process.cwd(), "backups"));
    expect(kbDir()).toBe(path.join(dataDir(), "kb"));
    expect(kbDir()).toBe(path.resolve(process.cwd(), "data", "kb"));
  });

  it("resolveInside 接受合法相对路径并落在根内", () => {
    const root = uploadsDir();
    expect(resolveInside(root, "202610/a.png")).toBe(path.join(root, "202610", "a.png"));
    expect(resolveInside(root, "collect/img-1.jpg")).toBe(path.join(root, "collect", "img-1.jpg"));
    expect(resolveInside(root, "a-b_c.1.txt")).toBe(path.join(root, "a-b_c.1.txt"));
  });

  it("resolveInside 拒绝穿越与非法形态", () => {
    const root = uploadsDir();
    for (const bad of [
      "../x.png",
      "../../etc/passwd",
      "a/../../b.png",
      "/etc/passwd",
      "C:/windows/x",
      "a\\b.png",
      ".hidden",
      "a/.hidden",
      ".",
      "..",
      "",
      "a//b.png",
      "a/",
    ]) {
      expect(() => resolveInside(root, bad), `应拒绝：${JSON.stringify(bad)}`).toThrow();
    }
  });
});
