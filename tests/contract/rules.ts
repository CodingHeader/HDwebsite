/**
 * W2-02 全路由契约测试规则表（rules.ts）
 *
 * 职责：为 src/app/api 下全部 route.ts 的每个 HTTP 方法定义"契约规则"，供 routes.test.ts 自动发现执行。
 * 规则覆盖四类场景（卡定义 §目标）：
 *   1. 未登录（无 token）→ 非公开路由期望 401；公开路由允许非 500
 *   2. 无权限（token 有，但缺该路由 permission）→ 期望 403
 *   3. 非法参数 → 期望 400
 *   4. 合法参数（有权限 + 正确 body/query）→ 期望 200/201
 *
 * 规则来源：
 *   - CRUD 路由：由 crudSpecs 自动推导（见 deriveCrudRules），只对 inventory 实际存在的路由生成
 *   - 手写路由：显式登记（见 handRules），手写优先覆盖
 *
 * 契约（src/contracts/**）冻结，本文件只读引用。
 *
 * 【本次修复的三条硬约束】（每条都对应一次真实踩坑，见 fixtures.ts 头注释）
 *   A. `:id` 必须按「用途」分配，不能一律 id=1：
 *      - GET → SAC.get(901)、PUT → SAC.put(902)、DELETE → SAC.del(903)、动作端点 → SAC.extra(904/905)
 *      - 否则 ok 用例真删/真改被其他用例引用的行，产生跨用例污染（顺序相关失败）
 *   B. `bad.body` 对自己会 `partial()` 的 PUT 不能用 `{}`（zod4 下 `{}` 合法），必须给 schema 级非法字段
 *   C. DELETE 无 body：400 用例必须用非法 id 触发 parseId，否则会用合法 id 真删一行
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { z } from "zod";
import { crudSpecs } from "@/lib/crud-resources";

// ─── 类型 ────────────────────────────────────────────────────

export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

/** multipart 上传用例（POST /knowledge-files 只接受 FormData，JSON body 一定 400） */
export type FormSpec = {
  fields?: Record<string, string>;
  /** 逐个构造 File（内容为纯文本，不涉及真实业务数据） */
  files?: { field: string; filename: string; type: string; content: string }[];
};

/** 单方法的契约规则 */
export type RouteRule = {
  method: HttpMethod;
  /** 所需权限点（如 "article:create"）；为空表示公开/无需鉴权 */
  permission?: string;
  /** 合法请求体（POST/PUT/PATCH） */
  body?: Record<string, unknown>;
  /** 合法 multipart 表单（与 body 互斥） */
  form?: FormSpec;
  /** 查询参数 */
  query?: Record<string, string | number>;
  /** 合法参数下的期望状态码（默认 200；创建类 201） */
  okStatus?: number;
  /** 非法参数构造（body 错 / query 错 / 路径参数错） */
  bad?: { body?: Record<string, unknown>; query?: Record<string, string>; params?: Record<string, string> };
  /** 路径参数显式覆盖（所有场景共用；避免测试自污染） */
  params?: Record<string, string>;
  /** 需要预置数据（GET/DELETE/:id 路由） */
  needsSeed?: boolean;
  /** skip 原因（非空表示该方法不测，必须 ≤5 个） */
  skip?: string;
};

/** 路由 → 方法 → 规则 */
export type RuleTable = Record<string, Partial<Record<HttpMethod, RouteRule>>>;

// ─── 读取真实路由清单（防止生成不存在的规则）────────────────────
type InvEntry = { route: string; methods: string[]; perms: string[] };
const inventory: InvEntry[] = JSON.parse(
  readFileSync(resolve("tests/contract/route-inventory.json"), "utf8")
);

/**
 * 一次性行 id 约定（与 fixtures.ts 的 SAC 保持一致）。
 * 独立成常量而非 import，避免 rules.ts（被 test 静态导入）反向依赖 fixtures 的 fs 副作用。
 */
const ROW = { get: "901", put: "902", del: "903", extra: "904", extra2: "905" } as const;

// ─── CRUD 自动推导 ───────────────────────────────────────────

/**
 * 从 crudSpecs 推导 CRUD 路由规则；只生成 inventory 中实际存在的路由方法。
 * 权限映射：spec.permission + ":list|create|edit|delete"。
 */
export function deriveCrudRules(): RuleTable {
  const table: RuleTable = {};
  const invByRoute = new Map(inventory.map((i) => [i.route, i]));
  for (const [key, spec] of Object.entries(crudSpecs)) {
    const perm = spec.permission;
    if (!perm) continue;
    const listPath = `/${key}`;
    const idPath = `/${key}/:id`;
    const hasCreate = Boolean(spec.createSchema);
    const invList = invByRoute.get(listPath);
    const invId = invByRoute.get(idPath);

    if (invList) {
      const rules = (table[listPath] ??= {});
      if (invList.methods.includes("GET")) {
        rules.GET = {
          method: "GET",
          permission: `${perm}:list`,
          query: { page: 1, limit: 20 },
          okStatus: 200,
          bad: { query: { limit: "1000" } },
        };
      }
      if (invList.methods.includes("POST") && hasCreate) {
        rules.POST = {
          method: "POST",
          permission: `${perm}:create`,
          body: mockBody2(spec.createSchema),
          okStatus: 201,
          // 空体必然缺必填字段（createSchema 均由必填字段构成）
          bad: { body: {} },
          needsSeed: true,
        };
      }
    }
    if (invId) {
      const rules = (table[idPath] ??= {});
      if (invId.methods.includes("GET")) {
        rules.GET = {
          method: "GET",
          permission: `${perm}:list`,
          okStatus: 200,
          needsSeed: true,
          params: { id: ROW.get },
          // 所有 CRUD 详情路由都走 parseId → 非法 id 必 400（真实断言，不是"非 500"兜底）
          bad: { params: { id: "not-a-number" } },
        };
      }
      if (invId.methods.includes("PUT")) {
        rules.PUT = {
          method: "PUT",
          permission: `${perm}:edit`,
          body: mockUpdateBody(spec),
          okStatus: 200,
          // partial() 后空对象合法，bad 必须给 schema 级非法字段
          bad: { body: badUpdateBody(spec.createSchema) },
          needsSeed: true,
          params: { id: ROW.put },
        };
      }
      if (invId.methods.includes("DELETE")) {
        rules.DELETE = {
          method: "DELETE",
          permission: `${perm}:delete`,
          okStatus: 200,
          needsSeed: true,
          params: { id: ROW.del },
          // DELETE 无 body：400 用例必须用非法 id 触发 parseId（合法 id 会真删行）
          bad: { params: { id: "not-a-number" } },
        };
      }
    }
  }
  return table;
}

/**
 * 为 partial() 更新 schema 构造一个必然非法的请求体。
 * 背景：zod4 的 .partial() 让空对象通过（P06 已钉住该行为），故 bad 不能用 {}。
 * 策略：优先取「必填且非默认」字段，按其类型给不可能通过的值。
 */
function badUpdateBody(schema?: z.ZodObject<z.ZodRawShape>): Record<string, unknown> {
  if (!schema) return {};
  const keys = Object.keys(schema.shape);
  if (keys.length === 0) return {};
  const key = keys[0];
  const field = schema.shape[key] as z.ZodTypeAny;
  for (const bad of [1, "x", {}, [], true]) {
    try {
      const r = field.safeParse(bad);
      if (!r.success) return { [key]: bad };
    } catch {
      /* ignore */
    }
  }
  return { [key]: "".padEnd(10001, "x") };
}

/**
 * 更新用的合法体。
 *
 * 两个必须遵守的约束：
 *   1. 跳过「有默认值」的字段：`partial()` 会重放 default（如 isSuper→false、status→draft），
 *      仅想改名却把布尔/枚举/数组重置为默认值，会造成超管被降级一类自污染。
 *   2. 字符串值必须**全局唯一**：createSchema 的首个必填字段常是唯一键（name/slug/code/elementId），
 *      而 POST 用例已经用 "test" 建过一行；若 PUT 也写 "test"，就会 409 唯一冲突。
 *      故这里用递增序号生成 w202-uN，既满足 slug/code 的 ^[a-z0-9][a-z0-9_-]*$ 正则，
 *      也不会与任何固定夹具或 POST 用例撞值。
 */
let updateSeq = 0;

function mockUpdateBody(spec: { createSchema?: z.ZodObject<z.ZodRawShape>; updateSchema?: z.ZodObject<z.ZodRawShape> }): Record<string, unknown> {
  const schema = spec.updateSchema ?? spec.createSchema;
  if (!schema) return {};
  const shape = schema.shape;
  const out: Record<string, unknown> = {};
  updateSeq += 1;
  const uniqueText = `w202-u${updateSeq}`;
  const candidates: unknown[] = [uniqueText, ...CANDIDATES];
  for (const key of Object.keys(shape)) {
    const field = shape[key] as z.ZodTypeAny;
    // 有默认值 → 跳过（避免 partial 重放默认值覆写既有数据）
    try {
      if (field.safeParse(undefined).success) continue;
    } catch {
      /* 非可 safeParse 字段继续尝试 */
    }
    for (const candidate of candidates) {
      try {
        if (field.safeParse(candidate).success) {
          out[key] = candidate;
          break;
        }
      } catch {
        /* ignore */
      }
    }
    // 只填第一个可填字段即可（PUT 语义允许部分更新）
    if (Object.keys(out).length > 0) break;
  }
  return out;
}

/**
 * mockBody2：字段级独立判定 + 整体组合校验。
 * 背景：旧 mockBody 逐 key 用"整对象校验"试探，对多必填字段 schema 在补齐任一 key 时整对象仍失败，
 * 导致返回 {}（POST/PUT 变 400）。
 * 策略：
 *   1. 对每个字段：先看其字段级 schema 单独 safeParse(candidate) 是否成功，取首个成功候选；
 *   2. 字段级失败时退回整体试探（保持向后兼容）。
 *   3. 对数组字段给合理默认（zod 默认只对缺省生效，显式 null 会失败）。
 */
export function mockBody2(schema?: z.ZodObject<z.ZodRawShape>): Record<string, unknown> | undefined {
  if (!schema) return undefined;
  const empty = schema.safeParse({});
  if (empty.success) return empty.data as Record<string, unknown>;

  const result: Record<string, unknown> = {};
  const shape = schema.shape;

  for (const key of Object.keys(shape)) {
    const field = shape[key] as z.ZodTypeAny;
    let picked: unknown = undefined;

    // ① 字段级独立判定（zod 4 的 zod.* 字段直接可 safeParse）
    for (const candidate of CANDIDATES) {
      try {
        const r = field.safeParse(candidate);
        if (r.success) {
          picked = candidate;
          break;
        }
      } catch {
        // 字段本身不是可 safeParse 的 zod schema（如 record）时跳过
      }
    }

    // ② 字段级失败 → 整体试探（旧逻辑兜底）
    if (picked === undefined) {
      for (const candidate of CANDIDATES) {
        const probe = schema.safeParse({ ...result, [key]: candidate });
        if (probe.success) {
          Object.assign(result, probe.data as Record<string, unknown>);
          picked = Symbol("probe-ok"); // 标记已由整体试探填充
          break;
        }
      }
    }

    // ③ 仍未填 → 用字段的默认值/首值再试一次（针对 z.enum / z.string().email 等）
    if (picked === undefined) {
      const defaults: unknown[] = ["a@b.com", "https://example.com", "2026-01-01T00:00:00.000Z", "test-slug", 1, "enabled", "draft", "pending"];
      for (const c of defaults) {
        try {
          const r = field.safeParse(c);
          if (r.success) {
            picked = c;
            break;
          }
        } catch {
          /* ignore */
        }
      }
    }

    // ④ 显式数组字段给默认
    if (picked === undefined) {
      try {
        const r = field.safeParse([]);
        if (r.success) picked = [];
      } catch {
        /* ignore */
      }
    }

    if (picked !== undefined && picked !== Symbol("probe-ok")) {
      Object.assign(result, { [key]: picked });
    }
  }

  // 最终整对象校验：仍失败则返回已拼出的结果（交给 handRules 显式登记）
  const final = schema.safeParse(result);
  return final.success ? (final.data as Record<string, unknown>) : result;
}

const CANDIDATES: unknown[] = [
  "test",
  1,
  false,
  true,
  "",
  0,
  null,
  "2026-01-01T00:00:00.000Z",
  "active",
  "article",
  "website",
];

// ─── 手写路由规则（显式登记）─────────────────────────────────

export const handRules: RuleTable = {
  // ── auth（公开） ──────────────────────────────────────────
  // 登录用例需要真实存在的账号：routes.test.ts 会建 admin/admin123（见 seedAdmin）
  "/auth/login": {
    POST: { method: "POST", body: { username: "admin", password: "admin123" }, okStatus: 200, bad: { body: { username: "" } } },
  },
  "/auth/logout": { POST: { method: "POST", okStatus: 200 } },
  "/auth/me": { GET: { method: "GET", okStatus: 200 } },
  "/auth/refresh": { POST: { method: "POST", okStatus: 200 } },
  // ── articles（手写） ─────────────────────────────────────
  "/articles": {
    GET: { method: "GET", query: { page: 1, limit: 10 }, okStatus: 200, bad: { query: { limit: "1000" } } },
    POST: {
      method: "POST",
      permission: "article:create",
      body: { title: "测试文章", slug: "w2-02-test", content: "正文", status: "draft" },
      okStatus: 201,
      bad: { body: { title: "" } },
      needsSeed: true,
    },
  },
  "/articles/:id": {
    GET: { method: "GET", okStatus: 200, needsSeed: true, params: { id: ROW.get } },
    PUT: {
      method: "PUT",
      permission: "article:edit",
      body: { title: "更新" },
      okStatus: 200,
      bad: { body: { title: "" } },
      needsSeed: true,
      params: { id: ROW.put },
    },
    PATCH: {
      method: "PATCH",
      permission: "article:publish",
      body: { status: "published" },
      okStatus: 200,
      bad: { body: { status: "invalid" } },
      needsSeed: true,
      params: { id: "904" },
    },
    DELETE: { method: "DELETE", permission: "article:delete", okStatus: 200, needsSeed: true, params: { id: ROW.del } },
  },
  // ── logs（只读） ─────────────────────────────────────────
  "/logs": { GET: { method: "GET", permission: "log:list", query: { page: 1, limit: 20 }, okStatus: 200, bad: { query: { limit: "1000" } } } },
  // ── manager ──────────────────────────────────────────────
  "/manager-menus": { GET: { method: "GET", okStatus: 200 } },
  "/manager/dashboard": { GET: { method: "GET", permission: "article:list", okStatus: 200 } },
  // ── settings ─────────────────────────────────────────────
  // GET 是 auth:"optional"（未登录只回 isPublic 字段），因此不能声明 permission —— 否则 401/403 断言必失败
  "/settings": {
    GET: { method: "GET", okStatus: 200 },
    // bad 必须用「值类型错误」：settingsUpdateSchema 是 z.record(string, string)，空对象合法
    PUT: { method: "PUT", permission: "setting:edit", body: { siteName: "弘道教育" }, okStatus: 200, bad: { body: { siteName: 1 } } },
  },
  "/settings/definitions": { GET: { method: "GET", permission: "setting:list", okStatus: 200 } },
  // 该路由完全不解析 body（只读设置并发 SMTP 探活），构造不出 400，故不设 bad
  "/settings/email/test": {
    POST: { method: "POST", permission: "setting:edit", body: {}, okStatus: 200 },
  },
  // ── roles ────────────────────────────────────────────────
  "/roles": {
    GET: { method: "GET", permission: "role:list", query: { page: 1, limit: 20 }, okStatus: 200 },
    POST: {
      method: "POST",
      permission: "role:create",
      body: { name: "测试角色", slug: "w2-02-role", permissions: [], isSuper: false },
      okStatus: 201,
      bad: { body: { name: "" } },
    },
  },
  "/roles/:id": {
    // 禁止指向 CREATE 建的超管角色（id=1，slug=role-super 绕过 super-admin 保护），
    // 也禁止指向 902（PUT 目标）；DELETE 用 903（无用户，可删）
    GET: { method: "GET", permission: "role:list", okStatus: 200, needsSeed: true, params: { id: ROW.get } },
    PUT: {
      method: "PUT",
      permission: "role:edit",
      body: { name: "更新角色" },
      okStatus: 200,
      bad: { body: { status: "not-a-status" } },
      needsSeed: true,
      params: { id: ROW.put },
    },
    DELETE: {
      method: "DELETE", permission: "role:delete", okStatus: 200, needsSeed: true,
      params: { id: ROW.del }, bad: { params: { id: "not-a-number" } },
    },
  },
  // ── users ────────────────────────────────────────────────
  "/users": {
    GET: { method: "GET", permission: "user:list", query: { page: 1, limit: 20 }, okStatus: 200 },
    POST: {
      method: "POST",
      permission: "user:create",
      // roleId 走 901（非超管角色），避免新增超管账号影响「最后一名超管」判定
      body: { username: "w2-02-user", password: "Passw0rd!", roleId: 901 },
      okStatus: 201,
      bad: { body: { username: "" } },
    },
  },
  "/users/:id": {
    GET: { method: "GET", permission: "user:list", okStatus: 200, needsSeed: true, params: { id: ROW.get } },
    // userUpdateSchema 无 username 字段：改 nickname 才是真实可更新字段
    PUT: { method: "PUT", permission: "user:edit", body: { nickname: "改名" }, okStatus: 200, needsSeed: true, params: { id: ROW.put } },
    DELETE: {
      method: "DELETE", permission: "user:delete", okStatus: 200, needsSeed: true,
      params: { id: ROW.del }, bad: { params: { id: "not-a-number" } },
    },
  },
  // ── chat-history（id = sessionId） ────────────────────────
  "/chat-history": { GET: { method: "GET", permission: "log:list", query: { page: 1, limit: 20 }, okStatus: 200 } },
  "/chat-history/:id": {
    // 注意：该路由的 :id 是 sessionId（字符串，契约 ^[A-Za-z0-9_.:-]+$），不是数字 id。
    // 必须显式给 bad.params，否则统一兜底的 "not-a-number" 恰好是合法会话 id → 不会 400。
    GET: {
      method: "GET", permission: "log:list", okStatus: 200, needsSeed: true,
      params: { id: "sess-get-0001" },
      bad: { params: { id: "bad session id" } },
    },
    DELETE: {
      method: "DELETE", permission: "log:delete", okStatus: 200, needsSeed: true,
      params: { id: "sess-del-0903" },
      bad: { params: { id: "bad session id" } },
    },
  },
  // ── kb ───────────────────────────────────────────────────
  "/kb/test": { POST: { method: "POST", permission: "kb:list", body: { query: "测试" }, okStatus: 200, bad: { body: {} } } },
  "/knowledge-bases": {
    GET: { method: "GET", permission: "kb:list", query: { page: 1, limit: 20 }, okStatus: 200 },
    POST: { method: "POST", permission: "kb:create", body: { name: "测试知识库", code: "w2-02-kb" }, okStatus: 201, bad: { body: { name: "" } } },
  },
  "/knowledge-bases/:id": {
    GET: { method: "GET", permission: "kb:list", okStatus: 200, needsSeed: true, params: { id: ROW.get } },
    PUT: { method: "PUT", permission: "kb:edit", body: { name: "更新" }, okStatus: 200, needsSeed: true, params: { id: ROW.put } },
    DELETE: {
      method: "DELETE", permission: "kb:delete", okStatus: 200, needsSeed: true,
      params: { id: ROW.del }, bad: { params: { id: "not-a-number" } },
    },
  },
  // sync 不读 body，body 任填都不影响；无 400 路径
  "/knowledge-bases/sync": { POST: { method: "POST", permission: "kb:edit", body: {}, okStatus: 200 } },
  "/knowledge-bases/:id/stats": { GET: { method: "GET", permission: "kb:list", okStatus: 200, params: { id: ROW.get } } },
  "/knowledge-bases/:id/export": { GET: { method: "GET", permission: "kb:list", okStatus: 200, params: { id: ROW.get } } },
  // rebuild 不读 body（只 parseId）；用 904 独立行，避免与 GET 的库互相影响
  "/knowledge-bases/:id/rebuild": { POST: { method: "POST", permission: "kb:edit", body: {}, okStatus: 201, params: { id: ROW.extra } } },
  // POST /knowledge-files 只接受 multipart（JSON body 必 400），ok 用例给真实 FormData
  "/knowledge-files": {
    GET: { method: "GET", permission: "kb:list", query: { page: 1, limit: 20 }, okStatus: 200 },
    POST: {
      method: "POST",
      permission: "kb:create",
      query: { baseId: 901 },
      form: {
        files: [{ field: "files", filename: "w2-02.md", type: "text/markdown", content: "# 契约测试\n\n上传内容。\n" }],
      },
      okStatus: 201,
      bad: { body: {} },
    },
  },
  "/knowledge-files/:id": {
    GET: { method: "GET", permission: "kb:list", okStatus: 200, needsSeed: true, params: { id: ROW.get } },
    PUT: { method: "PUT", permission: "kb:edit", body: { tags: ["t1"] }, okStatus: 200, needsSeed: true, params: { id: ROW.put } },
    DELETE: {
      method: "DELETE", permission: "kb:delete", okStatus: 200, needsSeed: true,
      params: { id: ROW.del }, bad: { params: { id: "not-a-number" } },
    },
  },
  "/knowledge-files/batch": {
    POST: { method: "POST", permission: "kb:edit", body: { ids: [904], action: "enable" }, okStatus: 200, bad: { body: { ids: [] } } },
  },
  "/knowledge-files/trash": {
    POST: { method: "POST", permission: "kb:edit", body: { ids: [905], action: "restore" }, okStatus: 200, bad: { body: {} } },
  },
  "/knowledge-files/:id/progress": { GET: { method: "GET", permission: "kb:list", okStatus: 200, params: { id: ROW.get } } },
  "/knowledge-files/:id/reparse": { POST: { method: "POST", permission: "kb:edit", body: {}, okStatus: 200, params: { id: ROW.get } } },
  "/knowledge-files/:id/chunks/:chunkId": {
    PATCH: {
      // 必须用 902/902：901 的切片会被 /reparse 用例删光重建（id 变化），
      // 共用会导致「切片不存在」404（原失败根因）。updateChunk 还要求 Knowledge.fileId 非空。
      method: "PATCH", permission: "kb:edit", body: { content: "更新分片" }, okStatus: 200,
      bad: { body: { content: "" } }, params: { id: "902", chunkId: "902" },
    },
  },
  // ── knowledge（旧版知识条目，crudSpecs: knowledge）───────
  // 这三个 :id 必须指向 906/907/908——它们的 fileId 为 null，不会被下列跨表级联抹掉：
  //   POST /knowledge-files/901/reparse（reparse 删光 fileId=901 后重建）
  //   DELETE /knowledge-files/903（deleteFileCascade 连带删 fileId=903）
  // 若指向 901-903，打乱用例顺序时 reparse/delete 先跑 → 这里必 404。
  "/knowledge/:id": {
    GET: {
      method: "GET", permission: "kb:list", okStatus: 200, needsSeed: true,
      params: { id: "906" },
      bad: { params: { id: "not-a-number" } },
    },
    PUT: {
      method: "PUT", permission: "kb:edit", body: { title: "知识更新" }, okStatus: 200,
      bad: { body: { title: "" } }, needsSeed: true, params: { id: "907" },
    },
    DELETE: {
      method: "DELETE", permission: "kb:delete", okStatus: 200, needsSeed: true,
      params: { id: "908" }, bad: { params: { id: "not-a-number" } },
    },
  },
  // ── home-blocks ──────────────────────────────────────────
  "/home-blocks/registry": { GET: { method: "GET", permission: "block:list", okStatus: 200 } },
  // 契约要求 confirm: true（literal），空体必 400
  "/home-blocks/reset": {
    POST: { method: "POST", permission: "block:edit", body: { templateCode: "home", confirm: true }, okStatus: 200, bad: { body: {} } },
  },
  // ── collect ──────────────────────────────────────────────
  "/collect-items": { GET: { method: "GET", permission: "collect:list", query: { page: 1, limit: 20 }, okStatus: 200 } },
  "/collect-items/:id": {
    // 仅 status=new 可审核；用 901 独占行，bad 用非法枚举值
    PATCH: { method: "PATCH", permission: "review:edit", body: { status: "rejected" }, okStatus: 200, bad: { body: { status: "bad" } }, params: { id: ROW.get } },
  },
  // run/test 会发起真实 HTTP：routes.test.ts 已 mock 采集引擎与试抓，断言只看信封
  "/collect-sources/:id/run": { POST: { method: "POST", permission: "collect:edit", body: {}, okStatus: 200, params: { id: ROW.get } } },
  "/collect-sources/:id/test": { POST: { method: "POST", permission: "collect:edit", body: {}, okStatus: 200, params: { id: ROW.get } } },
  // ── content-items ────────────────────────────────────────
  "/content-items/:id/review": {
    // 契约字段是 decision/remark（非 action）
    POST: { method: "POST", permission: "review:edit", body: { decision: "approved" }, okStatus: 200, bad: { body: { decision: "bad" } }, params: { id: ROW.get } },
  },
  // ── media ────────────────────────────────────────────────
  "/media/batch": {
    POST: {
      method: "POST",
      permission: "media:list",
      body: { action: "move-category", ids: [901], category: "校园" },
      okStatus: 200,
      bad: { body: { action: "bad", ids: [] } },
    },
  },
  // 覆盖率缺口：mediaUpdateSchema 是 strict + refine(至少一个键)，空体必 400
  "/media/:id": {
    GET: { method: "GET", permission: "media:list", okStatus: 200, needsSeed: true, params: { id: ROW.get } },
    PATCH: {
      method: "PATCH", permission: "media:edit", body: { filename: "renamed.png" }, okStatus: 200,
      bad: { body: {} }, needsSeed: true, params: { id: ROW.put },
    },
    DELETE: {
      method: "DELETE", permission: "media:delete", okStatus: 200, needsSeed: true,
      params: { id: ROW.del }, bad: { params: { id: "not-a-number" } },
    },
  },
  // ── notify ───────────────────────────────────────────────
  "/notify-rules": { GET: { method: "GET", permission: "notify:list", query: { page: 1, limit: 20 }, okStatus: 200 } },
  "/notify-rules/:id": {
    PATCH: {
      method: "PATCH", permission: "notify:edit", body: { quietHours: { start: "22:00", end: "07:00" } }, okStatus: 200,
      bad: { body: { quietHours: { start: "25:00", end: "07:00" } } }, params: { id: ROW.get },
    },
  },
  // ── publish-jobs ─────────────────────────────────────────
  "/publish-jobs": {
    GET: { method: "GET", query: { page: 1, limit: 20 }, okStatus: 200 },
    POST: {
      method: "POST",
      permission: "publish:create",
      // itemId=1 是 approved 状态且被 fixtures 固定保留（不删）
      body: { itemId: 1, channels: ["website"], contentType: "article" },
      okStatus: 201,
      // 400 必须是「契约层」非法：itemId=999999 会走到业务 404，不是 400
      bad: { body: { itemId: 1, channel: "bad-channel" } },
    },
  },
  "/publish-jobs/:id": {
    GET: { method: "GET", okStatus: 200, needsSeed: true, params: { id: ROW.get } },
    // 发现真实业务缺陷（非测试问题，本卡禁止越界修业务代码，已记入执行记录待 B 线处理）：
    //   crudUpdate 走 `spec.createSchema!.partial()`（src/lib/crud.ts:157），而 zod4 对
    //   「含 refine 的 object schema」调用 .partial() 直接抛
    //   `Error: .partial() cannot be used on object schemas containing refinements`，
    //   而 publishJobCreateSchema 恰好带两条 refine（channels/channel 二选一、scheduledAt 必须晚于现在）。
    //   → PUT /api/publish-jobs/:id 恒定 500「更新发布任务失败」。修复需改 crud.ts 或补 updateSchema，均属 B 线所有权。
    PUT: {
      method: "PUT",
      body: { action: "publish" },
      okStatus: 200,
      bad: { body: { action: "bad" } },
      needsSeed: true,
      params: { id: ROW.put },
      // F-01 已修复（crud.ts 的 resolveUpdateSchema 兼容 zod4 对含 refine schema 的 .partial() 限制），
      // 原先的 skip 已撤除 —— 该端点现在有完整的 401/403/400/200 四场景覆盖。
    },
    DELETE: {
      method: "DELETE", okStatus: 200, needsSeed: true,
      params: { id: ROW.del }, bad: { params: { id: "not-a-number" } },
    },
  },
  // cancel 只接受 scheduled/pending 等可迁移态：904=scheduled；905=failed 供 retry
  "/publish-jobs/:id/cancel": { POST: { method: "POST", permission: "publish:edit", body: {}, okStatus: 200, params: { id: ROW.extra } } },
  // retry 会真实执行发布：routes.test.ts 已 mock 执行器
  "/publish-jobs/:id/retry": { POST: { method: "POST", permission: "publish:edit", body: {}, okStatus: 200, params: { id: ROW.extra2 } } },
  // ── wechat ───────────────────────────────────────────────
  "/wechat/accounts": {
    GET: { method: "GET", permission: "wechat:list", query: { page: 1, limit: 20 }, okStatus: 200 },
    POST: {
      method: "POST",
      permission: "wechat:edit",
      body: { name: "公众号测试", appid: "wx-test-appid", appSecret: "secret", type: "service" },
      okStatus: 201,
      bad: { body: { name: "" } },
    },
  },
  "/wechat/accounts/:id": {
    GET: { method: "GET", permission: "wechat:list", okStatus: 200, needsSeed: true, params: { id: ROW.get } },
    PUT: { method: "PUT", permission: "wechat:edit", body: { name: "更新公众号" }, okStatus: 200, bad: { body: { name: "" } }, needsSeed: true, params: { id: ROW.put } },
    DELETE: {
      method: "DELETE", permission: "wechat:edit", okStatus: 200, needsSeed: true,
      params: { id: ROW.del }, bad: { params: { id: "not-a-number" } },
    },
  },
  // 会发起微信 API 调用：routes.test.ts 已 mock testAccount
  "/wechat/accounts/:id/test": { POST: { method: "POST", permission: "wechat:edit", body: {}, okStatus: 200, params: { id: ROW.extra } } },
  // ── apply / user-actions / chat / llm ────────────────────
  // apply 用 created()（201），不是 200
  "/apply": { POST: { method: "POST", body: { name: "张三", phone: "13800138000" }, okStatus: 201, bad: { body: { name: "" } } } },
  "/user-actions": {
    GET: { method: "GET", query: { page: 1, limit: 20 }, okStatus: 200 },
    // 契约必填：actionType/actionTarget/sessionId（后两者原规则漏了）
    POST: {
      method: "POST",
      body: { actionType: "submit", actionTarget: "apply", sessionId: "sess-000001" },
      okStatus: 201,
      bad: { body: { actionType: "bad" } },
    },
  },
  "/chat/stream": {
    POST: {
      method: "POST",
      body: { message: "你好", channel: "website" },
      okStatus: 200,
      skip: "SSE 流式响应，非 JSON 信封，单独测",
    },
  },
  "/campus/:id/images": {
    GET: { method: "GET", permission: "campus:list", okStatus: 200, params: { id: ROW.get } },
    POST: { method: "POST", permission: "campus:create", body: { image: "/uploads/x.png", sort: 1 }, okStatus: 201, bad: { body: {} }, params: { id: ROW.get } },
  },
  "/campus/:id/images/:imageId": {
    // 嵌套路由必须用 904/905：扁平 /campus-images/:id 的 PUT 用 902、DELETE 用 903，
    // 共用一行会互相踩（扁平 DELETE 先删掉，嵌套 PUT 就会 404）
    PUT: { method: "PUT", permission: "campus:edit", body: { image: "/uploads/y.png" }, okStatus: 200, params: { id: ROW.get, imageId: "904" } },
    DELETE: { method: "DELETE", permission: "campus:delete", okStatus: 200, needsSeed: true, params: { id: ROW.get, imageId: "905" } },
  },
  "/llm/providers": {
    GET: { method: "GET", permission: "llm:list", query: { page: 1, limit: 20 }, okStatus: 200 },
    POST: {
      method: "POST",
      permission: "llm:edit",
      body: { name: "测试模型", kind: "openai", endpoint: "https://example.com/v1", apiKey: "sk-test", model: "gpt-4o" },
      okStatus: 201,
      bad: { body: { name: "" } },
    },
  },
  "/llm/providers/:id": {
    GET: { method: "GET", permission: "llm:list", okStatus: 200, needsSeed: true, params: { id: ROW.get } },
    PUT: { method: "PUT", permission: "llm:edit", body: { name: "更新" }, okStatus: 200, bad: { body: { name: "" } }, needsSeed: true, params: { id: ROW.put } },
    DELETE: {
      method: "DELETE", permission: "llm:edit", okStatus: 200, needsSeed: true,
      params: { id: ROW.del }, bad: { params: { id: "not-a-number" } },
    },
  },
  "/llm/providers/order": {
    PUT: { method: "PUT", permission: "llm:edit", body: { ids: [901, 902] }, okStatus: 200, bad: { body: { ids: [] } } },
    PATCH: { method: "PATCH", permission: "llm:edit", body: { ids: [902, 901] }, okStatus: 200, bad: { body: { ids: [] } } },
  },
  // balance 读写 DB 并可能发通知（notify-gateway 已 mock）；bad 用缺 balance
  "/llm/providers/:id/balance": {
    POST: { method: "POST", permission: "llm:edit", body: { balance: 10 }, okStatus: 200, bad: { body: {} }, params: { id: ROW.extra } },
  },
  // test 走适配器（已 mock），空体允许
  "/llm/providers/:id/test": { POST: { method: "POST", permission: "llm:edit", body: {}, okStatus: 200, params: { id: ROW.extra2 } } },
  "/llm/usage": {
    GET: {
      method: "GET",
      permission: "llm:list",
      query: { from: "2026-01-01", to: "2026-01-31" },
      okStatus: 200,
      bad: { query: { from: "2026-01-01" } },
    },
  },
};

/** 汇总规则表：CRUD 自动推导 + 手写显式登记（手写优先覆盖） */
export const ruleTable: RuleTable = (() => {
  const table = deriveCrudRules();
  for (const [route, rules] of Object.entries(handRules)) {
    table[route] = { ...table[route], ...rules };
  }
  return table;
})();

/** 覆盖率辅助：返回 inventory 中全部 route×method 的列表 */
export function allInventoryMethods(): { route: string; method: string }[] {
  const out: { route: string; method: string }[] = [];
  for (const inv of inventory) {
    for (const m of inv.methods) out.push({ route: inv.route, method: m });
  }
  return out;
}
