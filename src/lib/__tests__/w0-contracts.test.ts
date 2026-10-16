/**
 * W0-05 领域契约冻结验证：
 * - kinds：数组常量 + 派生 zod 枚举 + 中文标签 + `dedupeIds`
 * - kb：白名单/限额/Coze 类型映射/拒绝文案/文件名校验 + 库 CRUD + 进度 + 检索测试
 * - chat：chatRequestSchema（与 route.ts 现状逐字一致）+ SSE 判别联合
 * - resources 增量：notifyRule +quietHours、chatScene +baseIds/providerIds/temperature/maxTokens/topP、
 *   collectSource +knowledgeBaseId、4 处枚举改由 kinds 派生
 * - blocks 增量：blockRegistryItem / homeBlocksResetRequest
 * - 契约出口（index.ts）可导入
 */
import { describe, expect, it } from "vitest";
import {
  CHANNEL_KINDS,
  COLLECT_TYPES,
  KB_BACKENDS,
  KIND_LABELS,
  LLM_KINDS,
  channelKindSchema,
  collectTypeSchema,
  dedupeIds,
  kbBackendSchema,
  kindLabel,
  llmKindSchema,
} from "@/contracts/kinds";
import {
  COZE_FILE_TYPE_MAP,
  KB_FILE_EXTS,
  KB_MAX_FILE_BYTES,
  KB_MAX_FILES_PER_UPLOAD,
  KB_REJECT_MESSAGE,
  KB_UPLOAD_FIELD,
  cozeFileTypeOf,
  isAllowedKbFilename,
  kbBatchSchema,
  kbExportQuerySchema,
  kbFileExtOf,
  kbRebuildResponseSchema,
  kbSearchRequestSchema,
  kbStatsSchema,
  kbTrashActionSchema,
  knowledgeBaseCreateSchema,
  knowledgeBaseUpdateSchema,
  knowledgeChunkUpdateSchema,
  knowledgeFileStatusSchema,
  knowledgeFileUpdateSchema,
} from "@/contracts/kb";
import { CHAT_SSE_EVENTS, chatRequestSchema, chatSseEventSchema } from "@/contracts/chat";
import {
  chatSceneCreateSchema,
  collectSourceCreateSchema,
  llmProviderCreateSchema,
  notifyRuleUpdateSchema,
  publishJobCreateSchema,
} from "@/contracts/resources";
import { channelStateSchema, channelStatusSchema, contentHubItemSchema, CHANNEL_STATUSES } from "@/contracts/content-hub";
import { llmProviderOrderSchema, llmUsageQuerySchema, llmUsageRowSchema } from "@/contracts/llm";
import { blockRegistryItemSchema, homeBlocksResetRequestSchema } from "@/contracts/blocks";
import { settingGroups } from "@/contracts/setting";
import * as barrel from "@/contracts";
import { SETTINGS_REGISTRY, getGroups, getSettingDefinition } from "@/lib/settings-registry";

// ─────────────────────────────────────────────────────────────
describe("kinds：枚举唯一源与派生 schema", () => {
  it("四个数组常量取值与顺序固定（新值只能加在末尾，顺序即 UI 展示顺序）", () => {
    expect([...CHANNEL_KINDS]).toEqual(["website", "wechat"]);
    expect([...LLM_KINDS]).toEqual(["openai", "coze"]);
    expect([...COLLECT_TYPES]).toEqual(["html", "rss"]);
    expect([...KB_BACKENDS]).toEqual(["local", "coze"]);
  });

  it("KIND_LABELS 覆盖四个数组的并集（无漏项）", () => {
    const union = new Set<string>([...CHANNEL_KINDS, ...LLM_KINDS, ...COLLECT_TYPES, ...KB_BACKENDS]);
    for (const k of union) {
      expect(KIND_LABELS[k as keyof typeof KIND_LABELS], `缺少标签：${k}`).toBeTruthy();
    }
  });

  it("派生 schema 与数组一致：接受全部取值、拒绝数组外的值", () => {
    for (const v of CHANNEL_KINDS) expect(channelKindSchema.safeParse(v).success).toBe(true);
    for (const v of LLM_KINDS) expect(llmKindSchema.safeParse(v).success).toBe(true);
    for (const v of COLLECT_TYPES) expect(collectTypeSchema.safeParse(v).success).toBe(true);
    for (const v of KB_BACKENDS) expect(kbBackendSchema.safeParse(v).success).toBe(true);

    expect(channelKindSchema.safeParse("app").success).toBe(false);
    expect(llmKindSchema.safeParse("azure").success).toBe(false);
    expect(collectTypeSchema.safeParse("json").success).toBe(false);
    expect(kbBackendSchema.safeParse("notion").success).toBe(false);
    // 大小写敏感（枚举不做小写归一，避免静默接受脏数据）
    expect(channelKindSchema.safeParse("Website").success).toBe(false);
  });

  it("kindLabel 回落原值（UI 不渲染空串）", () => {
    expect(kindLabel("website")).toBe("官网");
    expect(kindLabel("rss")).toBe("RSS");
    expect(kindLabel("unknown-kind")).toBe("unknown-kind");
  });

  it("dedupeIds 保序去重（加法工具，供 C-07/E-01 归一 providerIds/baseIds）", () => {
    expect(dedupeIds([3, 1, 3, 2, 1])).toEqual([3, 1, 2]);
    expect(dedupeIds([])).toEqual([]);
    expect(dedupeIds([5])).toEqual([5]);
    expect(dedupeIds([1, 1, 1])).toEqual([1]);
  });
});

// ─────────────────────────────────────────────────────────────
describe("kb：白名单、限额与 Coze 类型映射", () => {
  it("常量取值固定", () => {
    expect([...KB_FILE_EXTS]).toEqual(["docx", "doc", "md", "markdown", "txt"]);
    expect(KB_MAX_FILE_BYTES).toBe(10 * 1024 * 1024);
    expect(KB_MAX_FILES_PER_UPLOAD).toBe(10);
    expect(KB_UPLOAD_FIELD).toBe("files");
    expect(KB_REJECT_MESSAGE).toBe("仅支持 Word（.docx/.doc）、Markdown（.md）、TXT 文件，不支持 PDF 和图片");
  });

  it("COZE_FILE_TYPE_MAP：md/markdown → txt（Coze 文本库无 md 类型）", () => {
    expect(COZE_FILE_TYPE_MAP.md).toBe("txt");
    expect(COZE_FILE_TYPE_MAP.markdown).toBe("txt");
    expect(COZE_FILE_TYPE_MAP.docx).toBe("docx");
    expect(COZE_FILE_TYPE_MAP.doc).toBe("doc");
    expect(COZE_FILE_TYPE_MAP.txt).toBe("txt");
  });

  it("kbFileExtOf 大小写与多点文件名", () => {
    expect(kbFileExtOf("政策.docx")).toBe("docx");
    expect(kbFileExtOf("a.B.MD")).toBe("md");
    expect(kbFileExtOf("README")).toBe("");
    expect(kbFileExtOf("trailing.")).toBe("");
  });

  it("KB 拒绝 pdf/png 扩展名（ADR-025 用户裁决），接受 Word/Markdown/TXT", () => {
    for (const ok of ["a.docx", "a.DOC", "a.doc", "a.md", "a.markdown", "a.txt", "专升本 政策.TXT"]) {
      expect(isAllowedKbFilename(ok), `应接受：${ok}`).toBe(true);
    }
    for (const bad of [
      "a.pdf",
      "a.PDF",
      "a.png",
      "a.jpg",
      "a.jpeg",
      "a.gif",
      "a.webp",
      "a.html",
      "a.csv",
      "a.xlsx",
      "a",
      "a.pdf.exe", // 末段仍是 exe
    ]) {
      expect(isAllowedKbFilename(bad), `应拒绝：${bad}`).toBe(false);
    }
  });

  it("cozeFileTypeOf：白名单内给 Coze 类型，白名单外 undefined", () => {
    expect(cozeFileTypeOf("规范.MD")).toBe("txt");
    expect(cozeFileTypeOf("规范.markdown")).toBe("txt");
    expect(cozeFileTypeOf("规范.docx")).toBe("docx");
    expect(cozeFileTypeOf("规范.txt")).toBe("txt");
    expect(cozeFileTypeOf("规范.pdf")).toBeUndefined();
    expect(cozeFileTypeOf("规范.png")).toBeUndefined();
  });

  it("knowledgeBaseCreateSchema：合法样例 + code 规则 + 默认值", () => {
    const ok = knowledgeBaseCreateSchema.safeParse({ name: "通用知识", code: "general" });
    expect(ok.success).toBe(true);
    if (ok.success) {
      expect(ok.data).toMatchObject({ isDefault: false, status: "active", sort: 0 });
    }
    // code 必须小写字母/数字开头，仅含 [a-z0-9_-]
    expect(knowledgeBaseCreateSchema.safeParse({ name: "n", code: "KB" }).success).toBe(false);
    expect(knowledgeBaseCreateSchema.safeParse({ name: "n", code: "-kb" }).success).toBe(false);
    expect(knowledgeBaseCreateSchema.safeParse({ name: "n", code: "kb-1_x" }).success).toBe(true);
    // name 必填
    expect(knowledgeBaseCreateSchema.safeParse({ code: "kb1" }).success).toBe(false);
    // cozeDatasetId 可空
    expect(knowledgeBaseCreateSchema.safeParse({ name: "n", code: "kb1", cozeDatasetId: null }).success).toBe(true);
  });

  it("knowledgeBaseUpdateSchema = create.partial()（全字段可选）", () => {
    expect(knowledgeBaseUpdateSchema.safeParse({}).success).toBe(true);
    expect(knowledgeBaseUpdateSchema.safeParse({ name: "改名" }).success).toBe(true);
  });

  it("knowledgeFileStatusSchema：cozeStatus 仅 0/1/9 或 null；progress 0..100", () => {
    expect(knowledgeFileStatusSchema.safeParse({ cozeStatus: 0, progress: 0 }).success).toBe(true);
    expect(knowledgeFileStatusSchema.safeParse({ cozeStatus: 1, progress: 100 }).success).toBe(true);
    expect(knowledgeFileStatusSchema.safeParse({ cozeStatus: 9, progress: 100, error: "权限不足" }).success).toBe(true);
    expect(knowledgeFileStatusSchema.safeParse({ cozeStatus: null, progress: null }).success).toBe(true);
    expect(knowledgeFileStatusSchema.safeParse({ cozeStatus: 2, progress: 1 }).success).toBe(false);
    expect(knowledgeFileStatusSchema.safeParse({ cozeStatus: 1, progress: 101 }).success).toBe(false);
    expect(knowledgeFileStatusSchema.safeParse({ cozeStatus: 1, progress: -1 }).success).toBe(false);
  });

  it("kbSearchRequestSchema：保留 query 中文提示 + topK 默认 5 + baseIds ≤20", () => {
    const def = kbSearchRequestSchema.safeParse({ query: "专升本政策" });
    expect(def.success).toBe(true);
    if (def.success) expect(def.data.topK).toBe(5);

    const trimmed = kbSearchRequestSchema.safeParse({ query: "  专升本  ", topK: 20 });
    expect(trimmed.success).toBe(true);
    if (trimmed.success) expect(trimmed.data.query).toBe("专升本");

    const empty = kbSearchRequestSchema.safeParse({ query: "   " });
    expect(empty.success).toBe(false);
    if (!empty.success) expect(empty.error.issues[0]?.message).toBe("请输入检索问题");

    expect(kbSearchRequestSchema.safeParse({ query: "q", topK: 21 }).success).toBe(false);
    expect(kbSearchRequestSchema.safeParse({ query: "q", topK: 0 }).success).toBe(false);
    expect(kbSearchRequestSchema.safeParse({ query: "q", baseIds: Array.from({ length: 20 }, (_, i) => i + 1) }).success).toBe(true);
    expect(kbSearchRequestSchema.safeParse({ query: "q", baseIds: Array.from({ length: 21 }, (_, i) => i + 1) }).success).toBe(false);
    expect(kbSearchRequestSchema.safeParse({ query: "q", baseIds: [0] }).success).toBe(false);
    expect(kbSearchRequestSchema.safeParse({ query: "q", tags: ["政策", "自考"] }).success).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────
describe("chat：请求体与 SSE 判别联合", () => {
  it("chatRequestSchema 与 route.ts 现状一致（默认 sceneCode=float，文案不变）", () => {
    const ok = chatRequestSchema.safeParse({ sessionId: "12345678", message: "你好" });
    expect(ok.success).toBe(true);
    if (ok.success) expect(ok.data.sceneCode).toBe("float");

    expect(chatRequestSchema.safeParse({ sessionId: "1234567", message: "你好" }).success).toBe(false); // <8
    expect(chatRequestSchema.safeParse({ sessionId: "x".repeat(65), message: "你好" }).success).toBe(false); // >64
    const empty = chatRequestSchema.safeParse({ sessionId: "12345678", message: "" });
    expect(empty.success).toBe(false);
    if (!empty.success) expect(empty.error.issues[0]?.message).toBe("消息不能为空");
    expect(chatRequestSchema.safeParse({ sessionId: "12345678", message: "x".repeat(2001) }).success).toBe(false);
    expect(chatRequestSchema.safeParse({ sessionId: "12345678", message: "x".repeat(2000) }).success).toBe(true);
  });

  it("事件名全集 = meta|delta|done|error", () => {
    expect([...CHAT_SSE_EVENTS]).toEqual(["meta", "delta", "done", "error"]);
  });

  it("chatSseEventSchema：四类事件逐一通过", () => {
    expect(chatSseEventSchema.safeParse({ event: "meta", data: { scene: { code: "float", name: "智能客服" } } }).success).toBe(true);
    expect(
      chatSseEventSchema.safeParse({ event: "meta", data: { scene: { code: "f", name: "n" }, greeting: null, provider: "main" } }).success
    ).toBe(true);
    expect(chatSseEventSchema.safeParse({ event: "delta", data: { text: "你" } }).success).toBe(true);
    expect(chatSseEventSchema.safeParse({ event: "done", data: { conversationId: "abc" } }).success).toBe(true);
    expect(chatSseEventSchema.safeParse({ event: "error", data: { message: "生成中断，请重试" } }).success).toBe(true);
  });

  it("chatSseEventSchema：未知事件 / 缺字段 / 字段类型错 → 拒绝", () => {
    expect(chatSseEventSchema.safeParse({ event: "ping", data: {} }).success).toBe(false);
    expect(chatSseEventSchema.safeParse({ event: "meta", data: {} }).success).toBe(false); // 缺 scene
    expect(chatSseEventSchema.safeParse({ event: "delta", data: { text: 1 } }).success).toBe(false);
    expect(chatSseEventSchema.safeParse({ event: "done", data: {} }).success).toBe(false);
    expect(chatSseEventSchema.safeParse({ event: "error", data: { message: null } }).success).toBe(false);
    expect(chatSseEventSchema.safeParse({ data: { text: "x" } }).success).toBe(false); // 缺判别键
  });
});

// ─────────────────────────────────────────────────────────────
describe("resources 增量：notifyRule.quietHours", () => {
  it("接受合法 HH:mm 起止，且 nullable/optional", () => {
    expect(notifyRuleUpdateSchema.safeParse({ quietHours: { start: "22:00", end: "08:30" } }).success).toBe(true);
    expect(notifyRuleUpdateSchema.safeParse({ quietHours: null }).success).toBe(true);
    expect(notifyRuleUpdateSchema.safeParse({}).success).toBe(true);
  });

  it("拒绝非 HH:mm 格式（缺前导零 / 缺字段 / 非数字）", () => {
    for (const bad of [
      { start: "9:00", end: "08:00" },
      { start: "22:00", end: "8:0" },
      { start: "aa:bb", end: "08:00" },
      { start: "22:00" },
      { start: "22:00:00", end: "08:00" },
    ]) {
      expect(notifyRuleUpdateSchema.safeParse({ quietHours: bad }).success, JSON.stringify(bad)).toBe(false);
    }
  });

  it("CCR-1 后范围收敛：25:00/99:99 非法（原钉住宽松点已由 W0-10 收敛）", () => {
    // W0-10 quietHours 范围收敛为 `^([01]\d|2[0-3]):[0-5]\d$`（0..23 / 0..59）；
    // 跨零点允许（start > end 表示跨夜，如 22:00→07:00）。
    expect(notifyRuleUpdateSchema.safeParse({ quietHours: { start: "25:00", end: "99:99" } }).success).toBe(false);
    expect(notifyRuleUpdateSchema.safeParse({ quietHours: { start: "23:59", end: "00:00" } }).success).toBe(true);
    expect(notifyRuleUpdateSchema.safeParse({ quietHours: { start: "22:00", end: "07:00" } }).success).toBe(true); // 跨夜合法
    expect(notifyRuleUpdateSchema.safeParse({ quietHours: { start: "00:00", end: "23:59" } }).success).toBe(true);
    expect(notifyRuleUpdateSchema.safeParse({ quietHours: { start: "23:60", end: "08:00" } }).success).toBe(false);
  });

  it("extend 只加字段：既有的 enabled/templateId/recipientGroups 行为不变", () => {
    const r = notifyRuleUpdateSchema.safeParse({ enabled: false, templateId: 3, recipientGroups: ["publish"] });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data).toMatchObject({ enabled: false, templateId: 3, recipientGroups: ["publish"] });
    expect(notifyRuleUpdateSchema.safeParse({ templateId: 0 }).success).toBe(false); // 仍须正整数
  });
});

describe("resources 增量：chatScene 知识库绑定与推理参数（K11/K12）", () => {
  const base = { code: "float", name: "浮动客服", greeting: "你好", systemPrompt: "你是客服" };

  it("baseIds 接受 int 数组或 JSON 数组串（旧逗号文本由 C-07 读取方兼容）", () => {
    expect(chatSceneCreateSchema.safeParse({ ...base, baseIds: [1, 2] }).success).toBe(true);
    expect(chatSceneCreateSchema.safeParse({ ...base, baseIds: "[1,2]" }).success).toBe(true);
    expect(chatSceneCreateSchema.safeParse({ ...base, baseIds: "1,2" }).success).toBe(true); // 旧格式仍在 string 分支内
    expect(chatSceneCreateSchema.safeParse({ ...base, baseIds: null }).success).toBe(true);
    expect(chatSceneCreateSchema.safeParse({ ...base, baseIds: Array.from({ length: 21 }, (_, i) => i + 1) }).success).toBe(false);
    expect(chatSceneCreateSchema.safeParse({ ...base, baseIds: [0] }).success).toBe(false);
  });

  it("providerIds 上限 10（K12：非空优先于 llmProviderId）", () => {
    expect(chatSceneCreateSchema.safeParse({ ...base, providerIds: [3, 1] }).success).toBe(true);
    expect(chatSceneCreateSchema.safeParse({ ...base, providerIds: "[3,1]" }).success).toBe(true);
    expect(chatSceneCreateSchema.safeParse({ ...base, providerIds: Array.from({ length: 10 }, (_, i) => i + 1) }).success).toBe(true);
    expect(chatSceneCreateSchema.safeParse({ ...base, providerIds: Array.from({ length: 11 }, (_, i) => i + 1) }).success).toBe(false);
    expect(chatSceneCreateSchema.safeParse({ ...base, providerIds: [1, -1] }).success).toBe(false);
    // 重复项当前被契约接受（去重不在冻结包语义内）→ 用 dedupeIds 归一，见 kinds 用例
    const dup = chatSceneCreateSchema.safeParse({ ...base, providerIds: [1, 1, 2] });
    expect(dup.success).toBe(true);
    if (dup.success) expect(dedupeIds(dup.data.providerIds as number[])).toEqual([1, 2]);
  });

  it("参数边界：temperature 0..2 / maxTokens 1..32000 / topP 0..1（可空）", () => {
    expect(chatSceneCreateSchema.safeParse({ ...base, temperature: 0 }).success).toBe(true);
    expect(chatSceneCreateSchema.safeParse({ ...base, temperature: 2 }).success).toBe(true);
    expect(chatSceneCreateSchema.safeParse({ ...base, temperature: 2.1 }).success).toBe(false);
    expect(chatSceneCreateSchema.safeParse({ ...base, temperature: -0.1 }).success).toBe(false);
    expect(chatSceneCreateSchema.safeParse({ ...base, maxTokens: 1 }).success).toBe(true);
    expect(chatSceneCreateSchema.safeParse({ ...base, maxTokens: 32000 }).success).toBe(true);
    expect(chatSceneCreateSchema.safeParse({ ...base, maxTokens: 32001 }).success).toBe(false);
    expect(chatSceneCreateSchema.safeParse({ ...base, maxTokens: 1.5 }).success).toBe(false);
    expect(chatSceneCreateSchema.safeParse({ ...base, topP: 0 }).success).toBe(true);
    expect(chatSceneCreateSchema.safeParse({ ...base, topP: 1 }).success).toBe(true);
    expect(chatSceneCreateSchema.safeParse({ ...base, topP: 1.5 }).success).toBe(false);
    expect(chatSceneCreateSchema.safeParse({ ...base, temperature: null, maxTokens: null, topP: null }).success).toBe(true);
  });
});

describe("resources 增量：collectSource.knowledgeBaseId", () => {
  const base = { name: "教育部", url: "https://example.com" };
  it("接受正整数或 null（空 = 默认「采集资讯」库）", () => {
    const r = collectSourceCreateSchema.safeParse({ ...base, knowledgeBaseId: 2 });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.knowledgeBaseId).toBe(2);
    expect(collectSourceCreateSchema.safeParse({ ...base, knowledgeBaseId: null }).success).toBe(true);
    expect(collectSourceCreateSchema.safeParse(base).success).toBe(true);
    expect(collectSourceCreateSchema.safeParse({ ...base, knowledgeBaseId: 0 }).success).toBe(false);
    expect(collectSourceCreateSchema.safeParse({ ...base, knowledgeBaseId: -1 }).success).toBe(false);
  });
});

describe("resources：4 处枚举改由 kinds 派生（零行为变化）", () => {
  it("CollectSource.type 派生自 COLLECT_TYPES", () => {
    const r = collectSourceCreateSchema.safeParse({ name: "n", url: "https://e.com", type: "rss" });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.type).toBe("rss");
    expect(collectSourceCreateSchema.safeParse({ name: "n", url: "https://e.com" }).success && collectSourceCreateSchema.parse({ name: "n", url: "https://e.com" }).type).toBe("html");
    expect(collectSourceCreateSchema.safeParse({ name: "n", url: "https://e.com", type: "json" }).success).toBe(false);
    expect(collectSourceCreateSchema.safeParse({ name: "n", url: "https://e.com", type: "HTML" }).success).toBe(false);
  });

  it("PublishJob.channel 派生自 CHANNEL_KINDS（默认 website）", () => {
    const r = publishJobCreateSchema.safeParse({ channel: "wechat" });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.channel).toBe("wechat");
    expect(publishJobCreateSchema.parse({}).channel).toBe("website");
    expect(publishJobCreateSchema.safeParse({ channel: "email" }).success).toBe(false);
  });

  it("LLMProvider.kind 派生自 LLM_KINDS（默认 openai）", () => {
    const payload = { name: "n", endpoint: "https://api.example.com", apiKey: "k", model: "m" };
    const r = llmProviderCreateSchema.safeParse({ ...payload, kind: "coze" });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.kind).toBe("coze");
    expect(llmProviderCreateSchema.parse(payload).kind).toBe("openai");
    expect(llmProviderCreateSchema.safeParse({ ...payload, kind: "azure" }).success).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────
describe("blocks 增量：区块注册表 DTO 与首页重置请求", () => {
  it("blockRegistryItemSchema：四字段必填，fields 为 {key,label,type}[]", () => {
    const ok = blockRegistryItemSchema.safeParse({
      code: "hero",
      name: "首屏横幅",
      defaultOrder: 10,
      fields: [{ key: "title", label: "标题", type: "text" }],
    });
    expect(ok.success).toBe(true);
    expect(blockRegistryItemSchema.safeParse({ code: "hero", name: "n", defaultOrder: 1, fields: [{ key: "k", label: "l" }] }).success).toBe(false);
    expect(blockRegistryItemSchema.safeParse({ code: "hero", name: "n", defaultOrder: "1", fields: [] }).success).toBe(false); // defaultOrder 须 number
    expect(blockRegistryItemSchema.safeParse({ code: "hero", name: "n", fields: [] }).success).toBe(false);
  });

  it("homeBlocksResetRequestSchema：templateCode 默认 home；confirm 必须是字面量 true", () => {
    const r = homeBlocksResetRequestSchema.safeParse({ confirm: true });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.templateCode).toBe("home");
    expect(homeBlocksResetRequestSchema.safeParse({ templateCode: "about", confirm: true }).success).toBe(true);
    expect(homeBlocksResetRequestSchema.safeParse({ confirm: false }).success).toBe(false);
    expect(homeBlocksResetRequestSchema.safeParse({}).success).toBe(false);
    expect(homeBlocksResetRequestSchema.safeParse({ confirm: "true" }).success).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────
describe("契约出口与设置注册表（W0-05 新增键）", () => {
  it("index.ts 导出新模块（kinds/kb/chat 可从 @/contracts 导入）", () => {
    for (const k of [
      "CHANNEL_KINDS",
      "LLM_KINDS",
      "COLLECT_TYPES",
      "KB_BACKENDS",
      "KIND_LABELS",
      "channelKindSchema",
      "llmKindSchema",
      "collectTypeSchema",
      "kbBackendSchema",
      "dedupeIds",
      "KB_FILE_EXTS",
      "KB_MAX_FILE_BYTES",
      "KB_MAX_FILES_PER_UPLOAD",
      "COZE_FILE_TYPE_MAP",
      "KB_REJECT_MESSAGE",
      "isAllowedKbFilename",
      "cozeFileTypeOf",
      "knowledgeBaseCreateSchema",
      "knowledgeBaseUpdateSchema",
      "knowledgeFileStatusSchema",
      "kbSearchRequestSchema",
      "chatRequestSchema",
      "chatSseEventSchema",
      "CHAT_SSE_EVENTS",
      "blockRegistryItemSchema",
      "homeBlocksResetRequestSchema",
    ]) {
      expect(k in barrel, `index.ts 未导出：${k}`).toBe(true);
    }
  });

  it("settingGroups 含新增 kb 分组（契约侧枚举）", () => {
    expect([...settingGroups]).toContain("kb");
    expect(getGroups()).toContain("kb");
  });

  it("kbCozeProviderId：数字键，非公开，默认空", () => {
    const d = getSettingDefinition("kbCozeProviderId");
    expect(d).toBeDefined();
    expect(d?.type).toBe("number");
    expect(d?.isPublic).toBe(false);
    expect(d?.isEncrypted).toBe(false);
    expect(d?.defaultValue).toBe("");
    expect(d?.group).toBe("kb");
  });

  it("kbCozeSpaceId：secret 键（isEncrypted + 非公开），默认空", () => {
    const d = getSettingDefinition("kbCozeSpaceId");
    expect(d).toBeDefined();
    expect(d?.isEncrypted).toBe(true);
    expect(d?.isPublic).toBe(false);
    expect(d?.defaultValue).toBe("");
    expect(d?.group).toBe("kb");
  });

  it("新增键不破坏 Registry 唯一性（key 仍全局唯一）", () => {
    const keys = SETTINGS_REGISTRY.map((d) => d.key);
    expect(new Set(keys).size).toBe(keys.length);
    expect(keys).toContain("kbCozeProviderId");
    expect(keys).toContain("kbCozeSpaceId");
  });
});

// ── CCR-1（W0-10）：G 系列 DTO parse 验证 ─────────────────────────────────
describe("CCR-1 content-hub：渠道状态与内容中枢条目", () => {
  it("CHANNEL_STATUSES 取值固定（= ContentChannel.status 列）", () => {
    expect(CHANNEL_STATUSES).toEqual(["unsent", "scheduled", "publishing", "published", "failed"]);
  });

  it("channelStateSchema 合法：官网渠道 accountId=null、各时间列可空", () => {
    const r = channelStateSchema.safeParse({
      channel: "website", accountId: null, status: "published",
      scheduledAt: null, publishedAt: "2026-05-01T10:00:00+08:00", externalUrl: "/info/1", errMsg: null,
    });
    expect(r.success).toBe(true);
  });

  it("channelStateSchema 合法：公众号渠道带 accountId", () => {
    const r = channelStateSchema.safeParse({
      channel: "wechat", accountId: 1, status: "scheduled",
      scheduledAt: "2026-05-02T09:00:00+08:00", publishedAt: null, externalUrl: null, errMsg: null,
    });
    expect(r.success).toBe(true);
  });

  it("channelStateSchema 非法：未知 status 与未知 channel", () => {
    expect(channelStateSchema.safeParse({ channel: "website", accountId: null, status: "queued", scheduledAt: null, publishedAt: null, externalUrl: null, errMsg: null }).success).toBe(false);
    expect(channelStateSchema.safeParse({ channel: "email", accountId: null, status: "published", scheduledAt: null, publishedAt: null, externalUrl: null, errMsg: null }).success).toBe(false);
  });

  it("channelStatusSchema 覆盖全部取值、拒绝未知值", () => {
    for (const s of CHANNEL_STATUSES) expect(channelStatusSchema.safeParse(s).success).toBe(true);
    expect(channelStatusSchema.safeParse("pending").success).toBe(false);
  });

  it("contentHubItemSchema 合法：channels 数组可空数组", () => {
    const r = contentHubItemSchema.safeParse({
      id: 1, title: "测试内容", contentType: "markdown", source: "manual",
      updatedAt: "2026-05-01T10:00:00+08:00", channels: [],
    });
    expect(r.success).toBe(true);
  });

  it("contentHubItemSchema 合法：多渠道视图", () => {
    const r = contentHubItemSchema.safeParse({
      id: 2, title: "采集内容", contentType: "html", source: "collect",
      updatedAt: "2026-05-01T10:00:00+08:00",
      channels: [
        { channel: "website", accountId: null, status: "published", scheduledAt: null, publishedAt: "2026-05-01T10:00:00+08:00", externalUrl: "/info/2", errMsg: null },
        { channel: "wechat", accountId: 1, status: "failed", scheduledAt: null, publishedAt: null, externalUrl: null, errMsg: "appid 无效" },
      ],
    });
    expect(r.success).toBe(true);
  });

  it("contentHubItemSchema 非法：未知 contentType/source", () => {
    expect(contentHubItemSchema.safeParse({ id: 1, title: "t", contentType: "pdf", source: "manual", updatedAt: "2026-05-01T10:00:00+08:00", channels: [] }).success).toBe(false);
    expect(contentHubItemSchema.safeParse({ id: 1, title: "t", contentType: "markdown", source: "wechat", updatedAt: "2026-05-01T10:00:00+08:00", channels: [] }).success).toBe(false);
  });
});

describe("CCR-1 llm：用量查询与供应商排序", () => {
  it("llmUsageQuerySchema 合法：provider 分组", () => {
    const r = llmUsageQuerySchema.safeParse({ groupBy: "provider", from: "2026-01-01", to: "2026-03-31" });
    expect(r.success).toBe(true);
  });

  it("llmUsageQuerySchema 合法：day 分组 + providerId 过滤", () => {
    const r = llmUsageQuerySchema.safeParse({ groupBy: "day", from: "2026-01-01", to: "2026-01-31", providerId: 3 });
    expect(r.success).toBe(true);
  });

  it("llmUsageQuerySchema 非法：区间超 92 天", () => {
    expect(llmUsageQuerySchema.safeParse({ groupBy: "day", from: "2026-01-01", to: "2026-05-01" }).success).toBe(false);
  });

  it("llmUsageQuerySchema 非法：to 早于 from 与坏日期格式", () => {
    expect(llmUsageQuerySchema.safeParse({ groupBy: "provider", from: "2026-03-01", to: "2026-01-01" }).success).toBe(false);
    expect(llmUsageQuerySchema.safeParse({ groupBy: "provider", from: "2026/01/01", to: "2026-01-31" }).success).toBe(false);
  });

  it("llmUsageRowSchema 合法：列名与 LLMUsage 表一致（无费用/耗时）", () => {
    const r = llmUsageRowSchema.safeParse({ key: "1", calls: 10, tokensIn: 1000, tokensOut: 2000, failures: 1 });
    expect(r.success).toBe(true);
    if (r.success) expect(Object.keys(r.data).sort()).toEqual(["calls", "failures", "key", "tokensIn", "tokensOut"]);
  });

  it("llmUsageRowSchema 非法：负数计数", () => {
    expect(llmUsageRowSchema.safeParse({ key: "1", calls: -1, tokensIn: 0, tokensOut: 0, failures: 0 }).success).toBe(false);
  });

  it("llmProviderOrderSchema 合法：1~50 个不重复 id", () => {
    expect(llmProviderOrderSchema.safeParse({ ids: [3, 1, 2] }).success).toBe(true);
    expect(llmProviderOrderSchema.safeParse({ ids: Array.from({ length: 50 }, (_, i) => i + 1) }).success).toBe(true);
  });

  it("llmProviderOrderSchema 非法：重复 id、空数组、超 50 个", () => {
    expect(llmProviderOrderSchema.safeParse({ ids: [1, 1, 2] }).success).toBe(false);
    expect(llmProviderOrderSchema.safeParse({ ids: [] }).success).toBe(false);
    expect(llmProviderOrderSchema.safeParse({ ids: Array.from({ length: 51 }, (_, i) => i + 1) }).success).toBe(false);
  });
});

describe("CCR-1 kb：管理端扩展 DTO", () => {
  it("knowledgeFileUpdateSchema 合法：tags 可空", () => {
    expect(knowledgeFileUpdateSchema.safeParse({ tags: ["招生", "政策"] }).success).toBe(true);
    expect(knowledgeFileUpdateSchema.safeParse({ tags: null }).success).toBe(true);
    expect(knowledgeFileUpdateSchema.safeParse({}).success).toBe(true);
  });

  it("knowledgeFileUpdateSchema 非法：超 20 个标签或空标签", () => {
    expect(knowledgeFileUpdateSchema.safeParse({ tags: Array.from({ length: 21 }, (_, i) => `t${i}`) }).success).toBe(false);
    expect(knowledgeFileUpdateSchema.safeParse({ tags: [""] }).success).toBe(false);
  });

  it("kbBatchSchema 合法：enable/disable/tag/untag/trash", () => {
    for (const action of ["enable", "disable", "tag", "untag", "trash"] as const) {
      expect(kbBatchSchema.safeParse({ ids: [1, 2], action }).success).toBe(true);
    }
    expect(kbBatchSchema.safeParse({ ids: [1], action: "tag", tags: ["a"] }).success).toBe(true);
  });

  it("kbBatchSchema 非法：超 100 个 id 与未知 action", () => {
    expect(kbBatchSchema.safeParse({ ids: Array.from({ length: 101 }, (_, i) => i + 1), action: "enable" }).success).toBe(false);
    expect(kbBatchSchema.safeParse({ ids: [1], action: "delete" }).success).toBe(false);
    expect(kbBatchSchema.safeParse({ ids: [], action: "enable" }).success).toBe(false);
  });

  it("kbTrashActionSchema 合法：restore/purge；非法 action 拒绝", () => {
    expect(kbTrashActionSchema.safeParse({ ids: [1], action: "restore" }).success).toBe(true);
    expect(kbTrashActionSchema.safeParse({ ids: [1], action: "purge" }).success).toBe(true);
    expect(kbTrashActionSchema.safeParse({ ids: [1], action: "enable" }).success).toBe(false);
  });

  it("kbStatsSchema 合法：含派生 lastSyncAt 可空", () => {
    const r = kbStatsSchema.safeParse({ baseId: 1, files: 10, chunks: 100, trash: 2, cozeOk: 8, cozeFailed: 1, lastSyncAt: null });
    expect(r.success).toBe(true);
    expect(kbStatsSchema.safeParse({ baseId: 1, files: 1, chunks: 1, trash: 0, cozeOk: 1, cozeFailed: 0, lastSyncAt: "2026-05-01T10:00:00+08:00" }).success).toBe(true);
  });

  it("kbExportQuerySchema 合法：includeTrash 默认 false", () => {
    const r = kbExportQuerySchema.safeParse({ baseId: 1 });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.includeTrash).toBe(false);
  });

  it("knowledgeChunkUpdateSchema 合法与非法：1..20000", () => {
    expect(knowledgeChunkUpdateSchema.safeParse({ content: "内容" }).success).toBe(true);
    expect(knowledgeChunkUpdateSchema.safeParse({ content: "" }).success).toBe(false);
    expect(knowledgeChunkUpdateSchema.safeParse({ content: "a".repeat(20001) }).success).toBe(false);
  });

  it("kbRebuildResponseSchema 合法：jobId 必填", () => {
    expect(kbRebuildResponseSchema.safeParse({ jobId: "job-1" }).success).toBe(true);
    expect(kbRebuildResponseSchema.safeParse({}).success).toBe(false);
  });
});

describe("CCR-1 resources：publishJobCreateSchema 多渠道与定时校验", () => {
  it("旧单 channel 兼容（e2e collect-publish 走旧字段）", () => {
    const r = publishJobCreateSchema.safeParse({ itemId: 1, contentType: "info", channel: "website" });
    expect(r.success).toBe(true);
  });

  it("新 channels 多渠道合法：1~2 个去重", () => {
    expect(publishJobCreateSchema.safeParse({ itemId: 1, channels: ["website"] }).success).toBe(true);
    expect(publishJobCreateSchema.safeParse({ itemId: 1, channels: ["website", "wechat"] }).success).toBe(true);
  });

  it("channels 非法：超 2 个、空数组、重复", () => {
    expect(publishJobCreateSchema.safeParse({ itemId: 1, channels: ["website", "wechat", "website"] }).success).toBe(false);
    expect(publishJobCreateSchema.safeParse({ itemId: 1, channels: [] }).success).toBe(false);
  });

  it("scheduledAt 定时必须晚于现在：过去时间非法、未来时间合法", () => {
    const past = new Date(Date.now() - 60_000).toISOString();
    const future = new Date(Date.now() + 3_600_000).toISOString();
    expect(publishJobCreateSchema.safeParse({ itemId: 1, channel: "website", scheduledAt: past }).success).toBe(false);
    expect(publishJobCreateSchema.safeParse({ itemId: 1, channel: "website", scheduledAt: future }).success).toBe(true);
  });

  it("scheduledAt 缺省合法（立即发布）", () => {
    expect(publishJobCreateSchema.safeParse({ itemId: 1, channel: "website", scheduledAt: null }).success).toBe(true);
  });
});
