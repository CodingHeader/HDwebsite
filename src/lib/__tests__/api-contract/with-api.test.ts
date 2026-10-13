/**
 * withApi 统一包装 + 权限目录一致性（P03）
 */
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { ApiHttpError, onApiError, parseBody, parseQuery, withApi } from "@/lib/api-handler";
import { success } from "@/lib/api-response";
import { permissionCatalog } from "@/contracts";
import { crudSpecs } from "@/lib/crud-resources";

const ctx = { params: Promise.resolve({}) };

describe("withApi", () => {
  it("未捕获异常 → 契约 500 + onApiError 钩子", async () => {
    const seen = vi.fn();
    const off = onApiError(seen);
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const route = withApi(async () => {
      throw new Error("boom");
    }, { errorMessage: "炸了", route: "test/boom" });
    const res = await route(new Request("http://localhost/api/boom", { method: "POST" }), ctx);
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ code: 500, data: null, message: "炸了" });
    expect(seen).toHaveBeenCalledTimes(1);
    expect(seen.mock.calls[0][0]).toMatchObject({ method: "POST", path: "/api/boom", route: "test/boom" });
    off();
    spy.mockRestore();
  });

  it("监听器自身抛错不影响响应", async () => {
    const off = onApiError(() => {
      throw new Error("listener");
    });
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await withApi(async () => {
      throw new Error("x");
    })(new Request("http://localhost/x"), ctx);
    expect(res.status).toBe(500);
    off();
    spy.mockRestore();
  });

  it("ApiHttpError / zod 解析失败 → 400，不触发钩子", async () => {
    const seen = vi.fn();
    const off = onApiError(seen);
    const schema = z.object({ n: z.number() });
    const r1 = await withApi(async ({ request }) => success(await parseBody(request, schema)))(
      new Request("http://localhost/x", { method: "POST", body: JSON.stringify({ n: "a" }) }),
      ctx
    );
    expect(r1.status).toBe(400);
    const r2 = await withApi(async ({ request }) => success(parseQuery(request, z.object({ q: z.enum(["a"]) }))))(
      new Request("http://localhost/x?q=b"),
      ctx
    );
    expect(r2.status).toBe(400);
    const r3 = await withApi(async () => {
      throw new ApiHttpError(404, "没有");
    })(new Request("http://localhost/x"), ctx);
    expect(r3.status).toBe(404);
    expect(seen).not.toHaveBeenCalled();
    off();
  });

  it("Prisma 唯一冲突 P2002 → 409（ADR-028，原 400）", async () => {
    const res = await withApi(async () => {
      throw Object.assign(new Error("dup"), { code: "P2002" });
    })(new Request("http://localhost/x"), ctx);
    expect(res.status).toBe(409);
    expect((await res.json()).code).toBe(409);
  });

  it("permission 给出时无 token → 401", async () => {
    const res = await withApi(async () => success(1), { permission: "log:list" })(new Request("http://localhost/x"), ctx);
    expect(res.status).toBe(401);
  });
});

describe("权限目录一致性", () => {
  const catalog = permissionCatalog as Record<string, readonly string[]>;
  const inCatalog = (p: string) => {
    const [m, a] = p.split(":");
    return (catalog[m] ?? []).includes(a);
  };

  function walk(dir: string): string[] {
    return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
      const p = path.join(dir, e.name);
      return e.isDirectory() ? walk(p) : /\.tsx?$/.test(e.name) ? [p] : [];
    });
  }

  it("src/app/api 中出现的每个权限字面量都在 permissionCatalog", () => {
    const used = new Set<string>();
    for (const f of walk(path.resolve(process.cwd(), "src/app/api"))) {
      const src = fs.readFileSync(f, "utf8");
      for (const m of src.matchAll(/(?:requireAuth\([^)]*|permission:\s*|hasPermission\([^)]*)"([a-z]+:[a-z]+)"/g)) used.add(m[1]);
      for (const m of src.matchAll(/"(media|article|log|campus|navigation):(list|create|edit|delete|publish)"/g)) used.add(`${m[1]}:${m[2]}`);
    }
    expect(used.size).toBeGreaterThan(10);
    expect([...used].filter((p) => !inCatalog(p))).toEqual([]);
  });

  it("crud 工厂实际挂载的 module:action 都在 permissionCatalog（扫描路由文件）", () => {
    const factoryAction: Record<string, string> = {
      crudList: "list",
      crudGet: "list",
      crudCreate: "create",
      crudUpdate: "edit",
      crudDelete: "delete",
    };
    const used = new Set<string>();
    for (const f of walk(path.resolve(process.cwd(), "src/app/api"))) {
      const src = fs.readFileSync(f, "utf8");
      const constSpec = src.match(/const spec = crudSpecs\["([^"]+)"\]/)?.[1];
      for (const m of src.matchAll(/(crudList|crudGet|crudCreate|crudUpdate|crudDelete)\((spec|crudSpecs\["([^"]+)"\])\)/g)) {
        const name = m[3] ?? constSpec;
        const spec = name ? crudSpecs[name] : undefined;
        expect(spec, `${f} 引用了未知 crudSpec`).toBeDefined();
        used.add(`${spec!.permission}:${factoryAction[m[1]]}`);
      }
    }
    expect(used.size).toBeGreaterThan(20);
    expect([...used].filter((p) => !inCatalog(p))).toEqual([]);
  });
});
