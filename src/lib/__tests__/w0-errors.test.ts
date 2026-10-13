/**
 * W0-04 契约② 错误码与错误体验证（ADR-028）：
 * - 新工厂 HTTP 与 code 一致；created() 例外（HTTP 201 / code 200）
 * - ApiHttpError 可抛 409/429/502/503 并经 withApi 正确映射
 * - Prisma P2002 → 409
 * - managerFetch 透传 data.fieldErrors，并按 409/429/502/503 给 toastCopy 文案
 * - SchemaForm：visibleTo="super" 的字段对非超管不渲染（含 react-dom/server 静态渲染断言）、不参与必填校验
 */
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { ApiHttpError, withApi } from "@/lib/api-handler";
import {
  badGateway,
  conflict,
  created,
  serviceUnavailable,
  success,
  tooManyRequests,
  validationError,
} from "@/lib/api-response";
import { errorCodes, toastCopy } from "@/contracts/common";
import { ApiError, managerFetch } from "@/lib/manager-fetch";
import { SchemaForm, validateRequired, visibleFields, type FieldSpec } from "@/components/manager/SchemaForm";

// 客户端依赖在 node 环境下打桩：本文件验「信封解包 + 可见性逻辑 + react-dom/server 渲染面」，
// mock 按 selector 求值以便驱动 SchemaForm 的 isSuper 分支（见末组用例）
// `authState.isSuper` 可写：供 SchemaForm 的 useAuthStore selector 分支读取（见末组用例）
const authState = vi.hoisted(() => ({ isSuper: false }));
vi.mock("@/store/authStore", () => {
  const snapshot = () => ({ token: "t", user: { role: { isSuper: authState.isSuper } } });
  // 真实 zustand store 支持 `useAuthStore(selector)`；此处按 selector 求值，语义一致
  const useAuthStore = Object.assign(
    (selector?: (s: { token: string; user: { role: { isSuper: boolean } } }) => unknown) =>
      typeof selector === "function" ? selector(snapshot()) : snapshot(),
    {
      getState: () => ({ ...snapshot(), clear: () => {} }),
      setState: () => {},
      subscribe: () => () => {},
    },
  );
  return { useAuthStore };
});
vi.mock("@/components/manager/feedback/toast", () => ({
  toast: { success: () => {}, error: () => {}, info: () => {}, warning: () => {}, fromError: () => {}, dismiss: () => {} },
}));

const ctx = { params: Promise.resolve({}) };
const jsonFetch = (body: unknown, status = 200) =>
  vi.fn(async () => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } }));

describe("错误码枚举与文案（contracts/common）", () => {
  it("errorCodes 恰为 10 值（200/400/401/403/404/409/429/500/502/503）", () => {
    expect(Object.values(errorCodes)).toEqual([200, 400, 401, 403, 404, 409, 429, 500, 502, 503]);
  });

  it("toastCopy 含 4 个新增键且保留原 7 键", () => {
    for (const k of ["saved", "created", "deleted", "updated", "failed", "network", "forbidden"]) {
      expect(toastCopy[k as keyof typeof toastCopy]).toBeTruthy();
    }
    expect(toastCopy.conflict).toBeTruthy();
    expect(toastCopy.tooManyRequests).toBeTruthy();
    expect(toastCopy.badGateway).toBeTruthy();
    expect(toastCopy.serviceUnavailable).toBeTruthy();
  });
});

describe("响应工厂：HTTP 与 code 一致", () => {
  const cases: { name: string; factory: () => Response; http: number; code: number }[] = [
    { name: "success", factory: () => success({ ok: true }), http: 200, code: 200 },
    { name: "conflict", factory: () => conflict(), http: 409, code: 409 },
    { name: "tooManyRequests", factory: () => tooManyRequests(), http: 429, code: 429 },
    { name: "badGateway", factory: () => badGateway(), http: 502, code: 502 },
    { name: "serviceUnavailable", factory: () => serviceUnavailable(), http: 503, code: 503 },
  ];

  for (const c of cases) {
    it(`${c.name}：HTTP ${c.http} / code ${c.code} / data 形状正确`, async () => {
      const res = c.factory();
      expect(res.status).toBe(c.http);
      const body = await res.json();
      expect(body.code).toBe(c.code);
      expect(typeof body.message).toBe("string");
      if (c.code !== 200) expect(body.data).toBeNull();
    });
  }

  it("created()：HTTP 201 但 code 仍为 200（K10/D7 — manager-fetch 以 code 判定）", async () => {
    const res = created({ id: 1 });
    expect(res.status).toBe(201);
    expect((await res.json()).code).toBe(200);
  });

  it("新工厂默认文案取自 toastCopy", async () => {
    expect((await conflict().json()).message).toBe(toastCopy.conflict);
    expect((await tooManyRequests().json()).message).toBe(toastCopy.tooManyRequests);
    expect((await badGateway().json()).message).toBe(toastCopy.badGateway);
    expect((await serviceUnavailable().json()).message).toBe(toastCopy.serviceUnavailable);
  });

  it("400 校验失败仍用 data.fieldErrors（K9/D6 保留）", async () => {
    const res = validationError([{ message: "Required", path: ["title"] }]);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.code).toBe(400);
    expect(Object.keys(body.data.fieldErrors)).toEqual(["title"]);
  });
});

describe("withApi：ApiHttpError 全状态映射（ADR-028）", () => {
  for (const status of [400, 401, 403, 404, 409, 429, 502, 503] as const) {
    it(`ApiHttpError(${status}) → HTTP ${status} 且 code ${status}`, async () => {
      const route = withApi(async () => {
        throw new ApiHttpError(status, `错误 ${status}`);
      });
      const res = await route(new Request("http://localhost/x"), ctx);
      expect(res.status).toBe(status);
      const body = await res.json();
      expect(body.code).toBe(status);
      expect(body.message).toBe(`错误 ${status}`);
      expect(body.data).toBeNull();
    });
  }

  it("Prisma P2002 → 409（ADR-028，原 400）", async () => {
    const route = withApi(async () => {
      throw Object.assign(new Error("dup"), { code: "P2002" });
    });
    const res = await route(new Request("http://localhost/x"), ctx);
    expect(res.status).toBe(409);
    expect((await res.json()).code).toBe(409);
  });

  it("Prisma P2003 仍为 400（未在本卡调整）", async () => {
    const route = withApi(async () => {
      throw Object.assign(new Error("fk"), { code: "P2003" });
    });
    const res = await route(new Request("http://localhost/x"), ctx);
    expect(res.status).toBe(400);
  });
});

describe("managerFetch：fieldErrors 透传与新码文案", () => {
  it("400 带 fieldErrors → ApiError.fieldErrors 深相等且保留后端 message", async () => {
    const envelope = {
      code: 400,
      data: { fieldErrors: { title: "不能为空", "tags.0": "格式不正确" } },
      message: "参数校验失败：title 不能为空",
    };
    vi.stubGlobal("fetch", jsonFetch(envelope, 400));
    const err = (await managerFetch("/api/x").catch((e) => e)) as ApiError;
    expect(err).toBeInstanceOf(ApiError);
    expect(err.code).toBe(400);
    expect(err.message).toBe(envelope.message);
    expect(err.fieldErrors).toEqual({ title: "不能为空", "tags.0": "格式不正确" });
    vi.unstubAllGlobals();
  });

  it("非 400 错误不带 fieldErrors", async () => {
    vi.stubGlobal("fetch", jsonFetch({ code: 404, data: null, message: "资源不存在" }, 404));
    const err = (await managerFetch("/api/y").catch((e) => e)) as ApiError;
    expect(err.code).toBe(404);
    expect(err.message).toBe("资源不存在");
    expect(err.fieldErrors).toBeUndefined();
    vi.unstubAllGlobals();
  });

  for (const [code, copy] of [
    [409, toastCopy.conflict],
    [429, toastCopy.tooManyRequests],
    [502, toastCopy.badGateway],
    [503, toastCopy.serviceUnavailable],
  ] as const) {
    it(`${code} → 文案为 toastCopy（${copy.slice(0, 6)}…）`, async () => {
      vi.stubGlobal("fetch", jsonFetch({ code, data: null, message: "" }, code));
      const err = (await managerFetch("/api/z").catch((e) => e)) as ApiError;
      expect(err.code).toBe(code);
      expect(err.message).toBe(copy);
      vi.unstubAllGlobals();
    });
  }

  it("成功（HTTP 201 / code 200）→ 返回 data", async () => {
    vi.stubGlobal("fetch", jsonFetch({ code: 200, data: { id: 7 }, message: "创建成功" }, 201));
    await expect(managerFetch<{ id: number }>("/api/w")).resolves.toEqual({ id: 7 });
    vi.unstubAllGlobals();
  });
});

describe("SchemaForm：visibleTo 隐藏逻辑", () => {
  const fields: FieldSpec[] = [
    { key: "title", label: "标题" },
    { key: "autoApprove", label: "自动通过", type: "switch", visibleTo: "super" },
  ];

  it("超管看到全部字段，非超管不渲染 super 字段", () => {
    expect(visibleFields(fields, true).map((f) => f.key)).toEqual(["title", "autoApprove"]);
    expect(visibleFields(fields, false).map((f) => f.key)).toEqual(["title"]);
  });

  it("隐藏字段不参与必填校验；默认 isSuper=true 保持既有调用方行为", () => {
    const only: FieldSpec[] = [{ key: "autoApprove", label: "自动通过", required: true, visibleTo: "super" }];
    expect(validateRequired(only, {}, false)).toEqual({});
    expect(validateRequired(only, {}, true)).toEqual({ autoApprove: "请填写「自动通过」" });
    expect(validateRequired(only, {})).toEqual({ autoApprove: "请填写「自动通过」" });
  });

  it("可见字段的必填校验不受影响", () => {
    expect(validateRequired([{ key: "title", label: "标题", required: true }], {}, false)).toEqual({
      title: "请填写「标题」",
    });
  });
});

// 验收条目「对非超管不渲染」的**渲染面**断言：用 react-dom/server 静态渲染，
// 无需 jsdom / 无需改 vitest 冻结配置（`.test.ts` 内即可覆盖）。
describe("SchemaForm：visibleTo 的 DOM 渲染面（react-dom/server）", () => {
  const fields: FieldSpec[] = [
    { key: "title", label: "标题" },
    { key: "autoApprove", label: "自动通过", type: "switch", visibleTo: "super" },
  ];
  const render = () =>
    renderToStaticMarkup(createElement(SchemaForm, { fields, values: {}, onChange: () => {} }));

  it("非超管：super 字段的 label 与控件均不出现在 HTML 中", () => {
    authState.isSuper = false;
    const html = render();
    expect(html).toContain("标题");
    expect(html).not.toContain("自动通过");
    expect(html).not.toContain('role="switch"'); // super 的 switch 控件整块不渲染
  });

  it("超管：super 字段随 label 与控件一同出现在 HTML 中", () => {
    authState.isSuper = true;
    const html = render();
    expect(html).toContain("标题");
    expect(html).toContain("自动通过");
    expect(html).toContain('role="switch"');
  });
});
