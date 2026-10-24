/**
 * W2-02 全路由契约测试自动发现（routes.test.ts）
 *
 * 机制：
 *   1. route-handlers.gen.ts 静态 import 全部 handler
 *   2. rules.ts 提供规则表（CRUD 自动推导 + 手写显式登记）
 *   3. 遍历 ruleTable 每个 route×method，跑 4 场景：
 *      401 未登录 / 403 无权限 / 400 非法参数 / 200|201 合法参数
 *   4. 覆盖率守卫：inventory 全部方法都必须有规则（skip ≤ 5 且每条有理由）
 *
 * 隔离策略（本次修复的重点）：
 *   - 临时 SQLite + migrations + 显式 id 夹具（fixtures.ts），用例之间不共享可删行
 *   - 一切会出网的模块（采集引擎/试抓/微信/发布执行器/LLM 适配器）在本文件 mock 掉，
 *     断言只看「信封 + 状态码」，不依赖外部站点或凭证
 *   - DATA_DIR 指向临时目录，上传/知识库落盘不污染工作区
 */
import { signChatSession } from "@/lib/chat-service";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

// hoisted 块先于所有 import 求值，此处不能引用任何顶层 import 或 import.meta。
// 只做一件事：把 DATABASE_URL 指到临时库（必须早于 @/lib/prisma 的模块初始化）。
vi.hoisted(() => {
  const tmp = process.env.TMPDIR || process.env.TEMP || "/tmp";
  process.env.DATABASE_URL = `file:${tmp}/hdw-contract-w202-${process.pid}-${Date.now()}.db`;
});

// 落盘隔离：storage 的 dataRoot() 是「调用时」读 DATA_DIR（非模块初始化时读），
// 故此处在模块体里设置即可覆盖全部 uploads/kb/backups 路径。
// 未设置时 dataRoot() 回退 process.cwd()，会让夹具与上传用例把文件写进仓库的 data/kb/。
const DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "hdw-contract-data-"));
process.env.DATA_DIR = DATA_DIR;

// revalidateTag 在测试环境无 static generation store，需 mock 静默
vi.mock("@/lib/cache-tags", async (orig) => {
  const actual = await orig<typeof import("@/lib/cache-tags")>();
  return { ...actual, invalidateWebContent: () => Promise.resolve() };
});

// ── 出网模块 mock：契约测试不触达外网（REQ-C-003 单机口径） ──
vi.mock("@/lib/collect-engine", () => ({
  runSource: async () => ({ newCount: 0, skipCount: 0, fetched: 0, failed: 0 }),
}));

vi.mock("@/lib/collect-test", () => ({
  fetchTextOnce: async () => "",
  testParseSource: async () => ({ items: [], errMsg: undefined }),
}));

vi.mock("@/lib/wechat", async (orig) => {
  const actual = await orig<typeof import("@/lib/wechat")>();
  return { ...actual, testAccount: async () => ({ ok: true, message: "mock：凭证校验通过" }) };
});

vi.mock("@/lib/publish-executor", async (orig) => {
  const actual = await orig<typeof import("@/lib/publish-executor")>();
  return { ...actual, executePublishJob: async () => "published" as const };
});

vi.mock("@/lib/llm/registry", async (orig) => {
  const actual = await orig<typeof import("@/lib/llm/registry")>();
  return {
    ...actual,
    // V8-T-02：/chat/stream 撤 skip 后，通用四场景会真实走网关，
    // 因此适配器必须同时提供 chat（非流式，其他路由用）与 stream（SSE 用）
    getAdapter: () => ({
      chat: async () => ({ reply: "ok" }),
      stream: async () => {
        const enc = new TextEncoder();
        return new ReadableStream<Uint8Array>({
          start(controller) {
            controller.enqueue(enc.encode("契约测试流式回复"));
            controller.close();
          },
        });
      },
    }),
  };
});

vi.mock("@/lib/notify-gateway", async (orig) => {
  const actual = await orig<typeof import("@/lib/notify-gateway")>();
  return { ...actual, notifyEvent: async () => undefined };
});

// /api/kb/test 走 searchViaCoze：当前「不出网」仅因夹具没有 coze 供应商（数据巧合），
// 一旦有人加了 coze 供应商就会真实出网。这里显式 mock 掉，改成结构隔离。
vi.mock("@/lib/kb-adapter", async (orig) => {
  const actual = await orig<typeof import("@/lib/kb-adapter")>();
  return {
    ...actual,
    searchViaCoze: async () => ({ ok: false, errMsg: "mock：未配置 Coze（契约测试不外联）" }),
  };
});

// /api/knowledge-bases/[id]/rebuild 会起真实后台任务（读盘 + 删建切片）。
// 只替换 rebuildBase，保留 manage 的其他导出（exportZip/statsOf/updateChunk 等被其他路由使用）。
vi.mock("@/lib/kb/manage", async (orig) => {
  const actual = await orig<typeof import("@/lib/kb/manage")>();
  return {
    ...actual,
    rebuildBase: async (baseId: number) => ({ jobId: `mock-rebuild:${baseId}` }),
  };
});

import { routeHandlers } from "./route-handlers.gen";
import { allInventoryMethods, ruleTable, type HttpMethod, type RouteRule } from "./rules";
import { crudSpecs } from "@/lib/crud-resources";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { cleanupTestDb, createActor, ctx, initTestDb, req } from "../../src/lib/__tests__/api-contract/harness";
import { seedFixtures } from "./fixtures";

let SUPER = "";
let NOPERM = "";

// skip 记录（供覆盖率报告）
const skips: { route: string; method: string; reason: string }[] = [];

/**
 * 夹具守卫：规则表里每个「数字型 :id」都必须指向**真实存在**的行。
 *
 * 为什么必须有这条：W2-02 的顺序无关性靠「按用途给 id 分槽」保证，但那是人工约定。
 * 真实踩过的两次坑都是「分槽对了、种子漏了」：
 *   ① 大量路由统一打 id=1，而 1 号行被别的用例删掉 → 404
 *   ② /knowledge/:id 的切片挂在 fileId=901/903 上，被 knowledge-files 的级联删除抹掉 → 打乱顺序即 404
 * 这条守卫在**任何用例执行前**把「规则指向的行是否存在」一次性核完，
 * 让「种子里没这行」以明确报错暴露出来，而不是变成某个用例的 404。
 */
async function assertFixtureRowsExist(): Promise<void> {
  const missing: string[] = [];
  for (const [route, rules] of Object.entries(ruleTable)) {
    // 只校验 CRUD 资源路由（/xxx/:id）；非 CRUD 的（如 /chat-history/:id 是 sessionId）跳过
    const key = /^\/([a-z-]+)\/:id$/.exec(route)?.[1];
    if (!key) continue;
    const spec = crudSpecs[key];
    if (!spec) continue;
    const ids = new Set<string>();
    for (const rule of Object.values(rules)) {
      const raw = rule?.params?.id;
      if (raw && /^\d+$/.test(raw)) ids.add(raw);
    }
    for (const id of ids) {
      const row = await (prisma as unknown as Record<string, { findUnique: (a: unknown) => Promise<unknown> }>)[
        spec.model
      ].findUnique({ where: { id: Number(id) } });
      if (!row) missing.push(`${route} → ${spec.model} id=${id}`);
    }
  }
  if (missing.length > 0) {
    throw new Error(
      `夹具守卫失败：以下规则指向的行不存在，请检查 tests/contract/fixtures.ts\n  - ${missing.join("\n  - ")}`
    );
  }
}

beforeAll(async () => {
  await initTestDb();
  // 注意顺序：createActor 依赖自增 id（1、2、3），必须早于 fixtures.ts 写入 901+ 的显式 id
  const superActor = await createActor(prisma, "super", [], true);
  SUPER = superActor.token;
  NOPERM = (await createActor(prisma, "noperm", [])).token;
  // 登录用例需要真实可校验的账号（bcrypt 哈希，非明文断言）
  const admin = await createActor(prisma, "admin", ["*"], true);
  await prisma.user.update({
    where: { id: admin.actor.id },
    data: { passwordHash: await hashPassword("admin123") },
  });

  await seedFixtures(prisma, { superUserId: superActor.actor.id });
  // 夹具守卫：先于任何用例，一次性核完「规则指向的行都存在」
  await assertFixtureRowsExist();
}, 120_000);

afterAll(async () => {
  await prisma.$disconnect();
  cleanupTestDb();
  const dir = process.env.DATA_DIR;
  if (dir && dir.includes("hdw-contract-data-")) {
    try {
      fs.rmSync(dir, { recursive: true, force: true });
    } catch {
      /* 清理失败不影响判定 */
    }
  }
});

/**
 * 从路由路径提取参数名与默认值。
 * 关键：rule.params 必须在此生效并作用于**全部**场景（401/403/400/ok）。
 * 原缺陷：401 与 ok 用例调用 resolveParams(route) 未传 rule.params，导致 `/roles/:id`
 * 的 PUT 打到 id=1（超管角色）→ 超管被降级 → 后续 60+ 用例全部 403。
 */
function resolveParams(route: string, explicit?: Record<string, string>): Record<string, string> {
  const params: Record<string, string> = {};
  const matches = route.match(/:([a-zA-Z]+)/g) || [];
  for (const m of matches) params[m.slice(1)] = "1";
  return explicit ? { ...params, ...explicit } : params;
}

function buildQuery(query?: Record<string, string | number>): string {
  if (!query) return "";
  return (
    "?" +
    Object.entries(query)
      .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
      .join("&")
  );
}

/** multipart 构造：knowledge-files 上传用 */
function buildForm(form: NonNullable<RouteRule["form"]>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(form.fields ?? {})) fd.append(k, v);
  for (const f of form.files ?? []) {
    fd.append(f.field, new File([f.content], f.filename, { type: f.type }));
  }
  return fd;
}

/** 调用 handler */
async function callHandler(
  route: string,
  method: HttpMethod,
  opts: {
    token?: string;
    body?: unknown;
    form?: RouteRule["form"];
    query?: Record<string, string | number>;
    params?: Record<string, string>;
  }
): Promise<Response> {
  const handler = routeHandlers[route]?.[method];
  if (!handler) throw new Error(`未找到 handler：${route} ${method}`);
  const urlPath = route.replace(/:[a-zA-Z]+/g, (m) => opts.params?.[m.slice(1)] || "1");
  const url = `/api${urlPath}${buildQuery(opts.query)}`;
  const init: { method: string; token?: string; body?: unknown } = { method, token: opts.token };
  // multipart 必须让 fetch 自己生成 boundary：走 req() 的 JSON 序列化会破坏表单
  if (opts.form) {
    const r = new Request(`http://localhost${url}`, {
      method,
      headers: opts.token ? { authorization: `Bearer ${opts.token}` } : {},
      body: buildForm(opts.form),
    });
    return (await handler(r as never, ctx(opts.params))) as Response;
  }
  if (opts.body !== undefined) init.body = opts.body;
  // V11-SEC-04：chat/stream 需服务端签发的会话 cookie——按 body.sessionId 生成同源签名
  if (route === "/chat/stream" && opts.body && typeof opts.body === "object" && "sessionId" in opts.body) {
    const sid = String((opts.body as { sessionId: string }).sessionId);
    const r = new Request(`http://localhost${url}`, {
      method,
      headers: {
        "content-type": "application/json",
        ...(opts.token ? { authorization: `Bearer ${opts.token}` } : {}),
        Cookie: `chat_sid=${signChatSession(sid)}`,
      },
      body: JSON.stringify(opts.body),
    });
    return (await handler(r as never, ctx(opts.params))) as Response;
  }
  return (await handler(req(url, init), ctx(opts.params))) as Response;
}

// ─── 收集测试用例（含 skip）──────────────────────────────────
const cases: { route: string; method: HttpMethod; rule: RouteRule }[] = [];
for (const [route, rules] of Object.entries(ruleTable)) {
  for (const [method, rule] of Object.entries(rules)) {
    if (!rule) continue;
    if (rule.skip) {
      skips.push({ route, method: method as HttpMethod, reason: rule.skip });
      continue;
    }
    cases.push({ route, method: method as HttpMethod, rule });
  }
}

describe("W2-02 全路由契约自动发现", () => {
  for (const { route, method, rule } of cases) {
    const ok = rule.okStatus ?? 200;

    it(`${method} ${route} → 401 未登录`, async () => {
      const params = resolveParams(route, rule.params);
      const res = await callHandler(route, method, { params });
      if (rule.permission) {
        expect(res.status).toBe(401);
      } else {
        // 公开路由：未登录也应有响应（200/201/400/404），不能是 500
        expect(res.status).not.toBe(500);
      }
    });

    if (rule.permission) {
      it(`${method} ${route} → 403 无权限`, async () => {
        const params = resolveParams(route, rule.params);
        const res = await callHandler(route, method, {
          token: NOPERM,
          body: rule.body,
          query: rule.query,
          params,
        });
        expect(res.status).toBe(403);
      });
    }

    it(`${method} ${route} → 400 非法参数`, async () => {
      // 400 断言强度分两级，避免「只断言非 500」的口径打折：
      //   ① 规则给了 bad（body/query/params）→ 用规则的非法输入，断言真 400
      //   ② 规则没给 bad 但路径含 :id → 一律用非法 id 触发 parseId 400（所有 :id 路由都有 parseId）
      //   ③ 两者都没有（无 :id 且无 bad）→ 只能断言非 500
      // DELETE 特殊：无 body，必须用非法 id（合法 id 会真删一行，污染后续 ok 用例）
      const hasIdParam = route.includes(":id");
      const needIdFallback = !rule.bad && hasIdParam;
      const badParams = rule.bad?.params ?? (needIdFallback ? { id: "not-a-number" } : undefined);
      const params = resolveParams(route, badParams);
      const res = await callHandler(route, method, {
        token: SUPER,
        body: rule.bad?.body,
        query: rule.bad?.query,
        params,
      });
      if (rule.bad || needIdFallback) {
        expect(res.status).toBe(400);
      } else {
        expect(res.status).not.toBe(500);
      }
    });

    it(`${method} ${route} → ${ok} 合法参数`, async () => {
      const params = resolveParams(route, rule.params);
      const res = await callHandler(route, method, {
        token: SUPER,
        body: rule.body,
        form: rule.form,
        query: rule.query,
        params,
      });
      if (res.status !== ok) {
        console.error(`[W2-02-ok-fail] ${method} ${route}: got ${res.status} expect ${ok} body=${(await res.clone().text()).slice(0, 300)}`);
      }
      expect(res.status).toBe(ok);
    });
  }
});

// ─── 覆盖率守卫 ──────────────────────────────────────────────
describe("W2-02 覆盖率守卫", () => {
  it("inventory 全部方法 100% 有规则", () => {
    const missing = allInventoryMethods().filter(
      ({ route, method }) => !ruleTable[route]?.[method as HttpMethod]
    );
    expect(missing).toEqual([]);
  });

  it("skip ≤ 5 且每条有理由", () => {
    expect(skips.length).toBeLessThanOrEqual(5);
    for (const s of skips) {
      expect(s.reason.length).toBeGreaterThan(3);
    }
  });

  it("生成覆盖率报告", () => {
    const all = allInventoryMethods();
    const covered = all.filter(({ route, method }) => Boolean(ruleTable[route]?.[method as HttpMethod]));
    // 覆盖率 100%（因为守卫已断言 missing=[]）
    expect(covered.length).toBe(all.length);
  });
});
