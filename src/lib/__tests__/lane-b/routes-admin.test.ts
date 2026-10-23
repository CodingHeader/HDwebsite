/**
 * B-02 契约测试：后台路由 withApi 迁移后的对外契约回归（users×2 / roles×2 / settings×3 /
 * manager-menus / wechat/accounts×2 / articles/[id] 的 GET/PUT/DELETE）
 *
 * 判据（卡定义"对外信封与状态码不变"）：
 *  - 信封恒为 { code, data, message }（src/contracts/common.ts）
 *  - 401 未登录 / 403 无权限 / 400 校验失败 / 404 资源不存在 / 200 成功
 *  - 公开读路由（articles GET、settings GET 未登录）允许匿名访问
 *  - 各路由的越权收口（SEC-01/SEC-02）语义保留
 *
 * 复用 api-contract/harness.ts（临时 SQLite + prisma/migrations + 真实 signToken），
 * 直接调用 route handler，不做 HTTP 服务。
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.hoisted(() => {
  const tmp = process.env.TMPDIR || process.env.TEMP || "/tmp";
  process.env.DATABASE_URL = `file:${tmp}/hdw-contract-b02-${process.pid}-${Date.now()}.db`;
});

// 记录 settings PUT 后是否调用了 invalidateWebContent（必须与 vi.mock 同时 hoist）
const cacheInvalidated = vi.hoisted(() => ({ calls: [] as string[][] }));
vi.mock("@/lib/cache-tags", async (orig) => {
  const actual = await orig<typeof import("@/lib/cache-tags")>();
  return {
    ...actual,
    invalidateWebContent: (tags: string[]) => {
      cacheInvalidated.calls.push(tags);
      return Promise.resolve();
    },
  };
});

import { prisma } from "@/lib/prisma";
import { cleanupTestDb, createActor, ctx, initTestDb, json, req } from "../api-contract/harness";

import { GET as usersGET, POST as usersPOST } from "@/app/api/users/route";
import { GET as userGET, PUT as userPUT, DELETE as userDELETE } from "@/app/api/users/[id]/route";
import { GET as rolesGET, POST as rolesPOST } from "@/app/api/roles/route";
import { GET as roleGET, PUT as rolePUT, DELETE as roleDELETE } from "@/app/api/roles/[id]/route";
import { GET as settingsGET, PUT as settingsPUT } from "@/app/api/settings/route";
import { GET as settingsDefsGET } from "@/app/api/settings/definitions/route";
import { POST as emailTestPOST } from "@/app/api/settings/email/test/route";
import { GET as menusGET } from "@/app/api/manager-menus/route";
import { GET as wcListGET, POST as wcPOST } from "@/app/api/wechat/accounts/route";
import { GET as wcGET, PUT as wcPUT, DELETE as wcDELETE } from "@/app/api/wechat/accounts/[id]/route";
import { GET as articleGET, PUT as articlePUT, DELETE as articleDELETE } from "@/app/api/articles/[id]/route";

let SUPER = "";
let superId = 0;
let EDITOR = ""; // 仅 article:list / article:edit
let NOPERM = "";
let USERLIST = ""; // 仅 user:list
let ROLEEDIT = ""; // 仅 role:edit

let normalUserId = 0;
let normalRoleId = 0;
let emptyRoleId = 0;
let superAdminRoleId = 0;
let wcId = 0;
let articleId = 0;
let draftId = 0;

beforeAll(async () => {
  await initTestDb();
  SUPER = (await createActor(prisma, "super", [], true)).token;
  superId = (await prisma.user.findFirst({ where: { username: "super" } }))!.id;
  EDITOR = (await createActor(prisma, "editor", ["article:list", "article:edit"])).token;
  NOPERM = (await createActor(prisma, "noperm", [])).token;
  USERLIST = (await createActor(prisma, "userlist", ["user:list"])).token;
  ROLEEDIT = (await createActor(prisma, "roleedit", ["role:edit"])).token;
  // V8-T-03：原本这里创建一个仅含 wechat:edit 权限的 actor，但无任何用例消费它。
  // 保留声明（便于后续扩展），去掉无效赋值以免制造"已覆盖 wechat 权限"的错觉。

  // 迁移测试需要内置超管角色（seed 不在契约测试里跑）
  const sa = await prisma.role.create({
    data: { name: "超级管理员", slug: "super-admin", permissions: JSON.stringify(["*"]), isSuper: true },
  });
  superAdminRoleId = sa.id;

  const normalRole = await prisma.role.create({
    data: { name: "普通角色", slug: "normal", permissions: JSON.stringify(["article:list"]) },
  });
  normalRoleId = normalRole.id;
  const emptyRole = await prisma.role.create({
    data: { name: "空角色", slug: "empty", permissions: JSON.stringify([]) },
  });
  emptyRoleId = emptyRole.id;

  const u = await prisma.user.create({
    data: { username: "victim", passwordHash: "x", roleId: normalRoleId },
  });
  normalUserId = u.id;

  const wc = await prisma.wechatAccount.create({
    data: {
      name: "公众号A", type: "service", appid: "wx0001",
      appSecret: "enc:secret", isEncrypted: true,
    },
  });
  wcId = wc.id;

  const pub = await prisma.article.create({
    data: { title: "已发布文章", slug: "b02-pub", content: "x", authorId: superId, status: "published" },
  });
  articleId = pub.id;
  const draft = await prisma.article.create({
    data: { title: "草稿文章", slug: "b02-draft", content: "x", authorId: superId, status: "draft" },
  });
  draftId = draft.id;
}, 60_000);

afterAll(async () => {
  await prisma.$disconnect();
  cleanupTestDb();
});

// ── users/route.ts（GET/POST）─────────────────────────────────

describe("users/route.ts", () => {
  it("GET 无 token → 401", async () => {
    const res = await usersGET(req("/api/users"), ctx());
    expect(res.status).toBe(401);
    expect((await json(res)).code).toBe(401);
  });

  it("GET 有 user:list 权限 → 200 列表信封（不含 passwordHash）", async () => {
    const res = await usersGET(req("/api/users?page=1&limit=10", { token: USERLIST }), ctx());
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.code).toBe(200);
    expect(Array.isArray(body.data.list)).toBe(true);
    for (const row of body.data.list) expect(row).not.toHaveProperty("passwordHash");
  });

  it("POST 无 user:create → 403", async () => {
    const res = await usersPOST(req("/api/users", { method: "POST", token: USERLIST, body: {} }), ctx());
    expect(res.status).toBe(403);
  });

  it("POST body 校验失败 → 400", async () => {
    const res = await usersPOST(
      req("/api/users", { method: "POST", token: SUPER, body: { username: "ab", password: "1", roleId: normalRoleId } }),
      ctx()
    );
    expect(res.status).toBe(400);
  });

  it("POST 正常 → 200/201 信封", async () => {
    const res = await usersPOST(
      req("/api/users", {
        method: "POST", token: SUPER,
        body: { username: "newbie", password: "secret123", roleId: normalRoleId, isActive: true },
      }),
      ctx()
    );
    expect(res.status).toBeLessThan(300);
    const body = await json(res);
    expect(body.data).toHaveProperty("id");
    expect(body.data).not.toHaveProperty("passwordHash");
  });

  it("POST 非超管指派超管角色 → 403（SEC-01 E3）", async () => {
    const res = await usersPOST(
      req("/api/users", {
        method: "POST", token: EDITOR,
        body: { username: "evil", password: "secret123", roleId: superAdminRoleId },
      }),
      ctx()
    );
    expect(res.status).toBe(403);
  });
});

// ── users/[id]/route.ts（GET/PUT/DELETE）──────────────────────

describe("users/[id]/route.ts", () => {
  it("GET 不存在 → 404", async () => {
    const res = await userGET(
      req(`/api/users/999999`, { token: SUPER }),
      ctx({ id: "999999" })
    );
    expect(res.status).toBe(404);
  });

  it("PUT 更新昵称 → 200", async () => {
    const res = await userPUT(
      req(`/api/users/${normalUserId}`, { method: "PUT", token: SUPER, body: { nickname: "改昵称" } }),
      ctx({ id: String(normalUserId) })
    );
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.code).toBe(200);
    expect(body.data.nickname).toBe("改昵称");
  });

  it("PUT 非超管改超管 → 403（SEC-01 E4）", async () => {
    const res = await userPUT(
      req(`/api/users/${superId}`, { method: "PUT", token: EDITOR, body: { nickname: "x" } }),
      ctx({ id: String(superId) })
    );
    expect(res.status).toBe(403);
  });

  it("PUT 非超管删超管 → 403（SEC-02 E4）", async () => {
    const res = await userDELETE(
      req(`/api/users/${superId}`, { method: "DELETE", token: EDITOR }),
      ctx({ id: String(superId) })
    );
    expect(res.status).toBe(403);
  });

  it("DELETE 正常删普通用户 → 200", async () => {
    // 自包含：删除本用例自建的用户，不影响其他用例依赖的 normalUserId（victim）
    const victim2 = await prisma.user.create({
      data: { username: "victim-del", passwordHash: "x", roleId: normalRoleId },
    });
    const res = await userDELETE(
      req(`/api/users/${victim2.id}`, { method: "DELETE", token: SUPER }),
      ctx({ id: String(victim2.id) })
    );
    expect(res.status).toBe(200);
    expect((await json(res)).data.id).toBe(victim2.id);
  });
});

// ── roles/route.ts（GET/POST）─────────────────────────────────

describe("roles/route.ts", () => {
  it("GET 无权限 → 403", async () => {
    const res = await rolesGET(req("/api/roles", { token: NOPERM }), ctx());
    expect(res.status).toBe(403);
  });

  it("GET 有 role:list → 200 含 userCount", async () => {
    const res = await rolesGET(
      req("/api/roles", { token: (await createActor(prisma, "rolelist", ["role:list"])).token }),
      ctx()
    );
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(Array.isArray(body.data.list)).toBe(true);
    for (const r of body.data.list) {
      expect(Array.isArray(r.permissions)).toBe(true);
      expect(r).toHaveProperty("userCount");
    }
  });

  it("POST 非超管创建超管角色 → 403（SEC-01 E1）", async () => {
    const res = await rolesPOST(
      req("/api/roles", { method: "POST", token: ROLEEDIT, body: { name: "越权超管", isSuper: true } }),
      ctx()
    );
    expect(res.status).toBe(403);
  });

  it("POST 正常创建 → 200/201", async () => {
    const res = await rolesPOST(
      req("/api/roles", { method: "POST", token: SUPER, body: { name: "新角色", permissions: ["article:list"] } }),
      ctx()
    );
    expect(res.status).toBeLessThan(300);
    expect((await json(res)).data.name).toBe("新角色");
  });
});

// ── roles/[id]/route.ts（GET/PUT/DELETE）──────────────────────

describe("roles/[id]/route.ts", () => {
  it("GET 有 role:list → 200 权限数组", async () => {
    const res = await roleGET(
      req(`/api/roles/${normalRoleId}`, { token: (await createActor(prisma, "rolelist2", ["role:list"])).token }),
      ctx({ id: String(normalRoleId) })
    );
    expect(res.status).toBe(200);
    expect((await json(res)).data.permissions).toEqual(["article:list"]);
  });

  it("PUT 内置超管不可改 isSuper=false → 400", async () => {
    const res = await rolePUT(
      req(`/api/roles/${superAdminRoleId}`, { method: "PUT", token: SUPER, body: { isSuper: false } }),
      ctx({ id: String(superAdminRoleId) })
    );
    expect(res.status).toBe(400);
  });

  it("PUT 非超管把角色升为超管 → 403（SEC-01 E1）", async () => {
    const res = await rolePUT(
      req(`/api/roles/${normalRoleId}`, { method: "PUT", token: ROLEEDIT, body: { isSuper: true } }),
      ctx({ id: String(normalRoleId) })
    );
    expect(res.status).toBe(403);
  });

  it("DELETE 有用户 → 400；DELETE 空角色 → 200", async () => {
    const busy = await roleDELETE(
      req(`/api/roles/${normalRoleId}`, { method: "DELETE", token: SUPER }),
      ctx({ id: String(normalRoleId) })
    );
    expect(busy.status).toBe(400);
    const ok = await roleDELETE(
      req(`/api/roles/${emptyRoleId}`, { method: "DELETE", token: SUPER }),
      ctx({ id: String(emptyRoleId) })
    );
    expect(ok.status).toBe(200);
  });
});

// ── settings/route.ts（GET/PUT）───────────────────────────────

describe("settings/route.ts", () => {
  it("GET 匿名 → 200 仅公开字段", async () => {
    const res = await settingsGET(req("/api/settings"), ctx());
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.code).toBe(200);
    expect(body.data).not.toHaveProperty("emailPassword"); // 非公开
  });

  it("GET 有 setting:list → 200 全量（加密字段脱敏）", async () => {
    const res = await settingsGET(
      req("/api/settings", { token: (await createActor(prisma, "settinglist", ["setting:list"])).token }),
      ctx()
    );
    expect(res.status).toBe(200);
  });

  it("PUT 无 setting:edit → 403", async () => {
    const res = await settingsPUT(req("/api/settings", { method: "PUT", token: NOPERM, body: {} }), ctx());
    expect(res.status).toBe(403);
  });

  it("PUT 正常更新 → 200 且触发 invalidateWebContent(settings)", async () => {
    cacheInvalidated.calls.length = 0;
    const res = await settingsPUT(
      req("/api/settings", { method: "PUT", token: SUPER, body: { siteName: "弘道教育-b02" } }),
      ctx()
    );
    expect(res.status).toBe(200);
    expect((await json(res)).code).toBe(200);
    expect(cacheInvalidated.calls.some((tags) => tags.includes("web:settings"))).toBe(true);
  });
});

// ── settings/definitions（GET）───────────────────────────────

describe("settings/definitions/route.ts", () => {
  it("GET 无权限 → 403", async () => {
    const res = await settingsDefsGET(req("/api/settings/definitions", { token: NOPERM }), ctx());
    expect(res.status).toBe(403);
  });

  it("GET 有权限 → 200 分组含 label/items", async () => {
    const res = await settingsDefsGET(
      req("/api/settings/definitions", { token: (await createActor(prisma, "settinglist2", ["setting:list"])).token }),
      ctx()
    );
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(Array.isArray(body.data.groups)).toBe(true);
    for (const g of body.data.groups) expect(typeof g.label).toBe("string");
  });
});

// ── settings/email/test（POST）────────────────────────────────

describe("settings/email/test/route.ts", () => {
  it("POST 无权限 → 403", async () => {
    const res = await emailTestPOST(req("/api/settings/email/test", { method: "POST", token: NOPERM }), ctx());
    expect(res.status).toBe(403);
  });

  it("POST 有权限 → 200 + data.ok 布尔（连接成败都 200）", async () => {
    const res = await emailTestPOST(
      req("/api/settings/email/test", { method: "POST", token: (await createActor(prisma, "settingedit", ["setting:edit"])).token }),
      ctx()
    );
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.code).toBe(200);
    expect(typeof body.data.ok).toBe("boolean");
  });
});

// ── manager-menus（GET，仅要求登录）───────────────────────────

describe("manager-menus/route.ts", () => {
  it("GET 无 token → 401", async () => {
    const res = await menusGET(req("/api/manager-menus"), ctx());
    expect(res.status).toBe(401);
  });

  it("GET 无任何权限 → 200（仅登录即可）", async () => {
    const res = await menusGET(req("/api/manager-menus", { token: NOPERM }), ctx());
    expect(res.status).toBe(200);
    expect(Array.isArray((await json(res)).data)).toBe(true);
  });
});

// ── wechat/accounts（GET/POST）────────────────────────────────

describe("wechat/accounts/route.ts", () => {
  it("GET 无 wechat:list → 403", async () => {
    const res = await wcListGET(req("/api/wechat/accounts", { token: NOPERM }), ctx());
    expect(res.status).toBe(403);
  });

  it("POST 创建 → 200/201，appSecret 已掩码", async () => {
    const res = await wcPOST(
      req("/api/wechat/accounts", {
        method: "POST", token: SUPER,
        body: { name: "公众号B", appid: "wx0002", appSecret: "rawsecret123" },
      }),
      ctx()
    );
    expect(res.status).toBeLessThan(300);
    const body = await json(res);
    expect(body.data.name).toBe("公众号B");
    expect(body.data.appSecret).toContain("*");
  });
});

// ── wechat/accounts/[id]（GET/PUT/DELETE）─────────────────────

describe("wechat/accounts/[id]/route.ts", () => {
  it("GET 不存在 → 404", async () => {
    const res = await wcGET(
      req(`/api/wechat/accounts/999999`, { token: SUPER }),
      ctx({ id: "999999" })
    );
    expect(res.status).toBe(404);
  });

  it("PUT 更新 → 200", async () => {
    const res = await wcPUT(
      req(`/api/wechat/accounts/${wcId}`, { method: "PUT", token: SUPER, body: { name: "公众号A-改" } }),
      ctx({ id: String(wcId) })
    );
    expect(res.status).toBe(200);
    expect((await json(res)).data.name).toBe("公众号A-改");
  });

  it("DELETE 删除 → 200", async () => {
    // 自包含：删除本用例自建的账号，不影响其他用例依赖的 wcId（公众号A）
    const acc = await prisma.wechatAccount.create({
      data: { name: "公众号C", type: "service", appid: "wx0003", appSecret: "enc:secret", isEncrypted: true },
    });
    const res = await wcDELETE(
      req(`/api/wechat/accounts/${acc.id}`, { method: "DELETE", token: SUPER }),
      ctx({ id: String(acc.id) })
    );
    expect(res.status).toBe(200);
    expect((await json(res)).data.id).toBe(acc.id);
  });
});

// ── articles/[id]（GET 公开读 / PUT / DELETE）─────────────────

describe("articles/[id]/route.ts", () => {
  it("GET 已发布匿名 → 200", async () => {
    const res = await articleGET(req(`/api/articles/${articleId}`), ctx({ id: String(articleId) }));
    expect(res.status).toBe(200);
    expect((await json(res)).data.title).toBe("已发布文章");
  });

  it("GET 草稿匿名 → 404（不泄露存在）", async () => {
    const res = await articleGET(req(`/api/articles/${draftId}`), ctx({ id: String(draftId) }));
    expect(res.status).toBe(404);
  });

  it("GET 草稿有 article:list → 200", async () => {
    const res = await articleGET(req(`/api/articles/${draftId}`, { token: EDITOR }), ctx({ id: String(draftId) }));
    expect(res.status).toBe(200);
  });

  it("PUT 无 article:edit → 403", async () => {
    const res = await articlePUT(
      req(`/api/articles/${articleId}`, { method: "PUT", token: NOPERM, body: { title: "x" } }),
      ctx({ id: String(articleId) })
    );
    expect(res.status).toBe(403);
  });

  it("PUT 正常更新 → 200", async () => {
    // 自包含：更新本用例自建的文章（"GET 已发布匿名"用例断言原始标题，不能被本用例改掉）
    const own = await prisma.article.create({
      data: { title: "待更新文章", slug: `b02-put-${Date.now()}`, content: "x", authorId: superId, status: "published" },
    });
    const res = await articlePUT(
      req(`/api/articles/${own.id}`, { method: "PUT", token: EDITOR, body: { title: "待更新文章-改" } }),
      ctx({ id: String(own.id) })
    );
    expect(res.status).toBe(200);
    expect((await json(res)).data.title).toBe("待更新文章-改");
  });

  it("DELETE 删除 → 200", async () => {
    // 自包含：删除本用例自建的草稿（草稿 GET 用例依赖 draftId 仍存在）
    const own = await prisma.article.create({
      data: { title: "待删草稿", slug: `b02-del-${Date.now()}`, content: "x", authorId: superId, status: "draft" },
    });
    const res = await articleDELETE(
      req(`/api/articles/${own.id}`, { method: "DELETE", token: SUPER }),
      ctx({ id: String(own.id) })
    );
    expect(res.status).toBe(200);
  });
});