/**
 * 契约：知识库（`KnowledgeBase` / `KnowledgeFile` / 检索测试）
 * 来源：`parallel-w1/02-契约冻结包.md` §W0-05 目标形态；ADR-025（Coze 集成）、ADR-023（Coze 选型）。
 *
 * 约定：
 * - 可上传文件仅 Word（.docx/.doc）、Markdown（.md/.markdown）、TXT（.txt）；**不接受 PDF 与图片**（ADR-025 用户裁决）。
 * - 存储：`DATA_DIR/kb/<baseId>/<sha256>.<ext>`，**不对外公开**（无 URL），仅服务端读取。
 * - multipart 上传字段名 = {@link KB_UPLOAD_FIELD}，单次 ≤ {@link KB_MAX_FILES_PER_UPLOAD} 个。
 * - 同 `sha256 + baseId` 去重发生在 C-06 路由层（重复上传返回已有记录，HTTP 200）。
 */
import { z } from "zod";

// ── 白名单与限额（唯一源：C-06 的三重校验与 E-04 的提示文案均引用此处）────
/** 允许的扩展名（不含点号，小写） */
export const KB_FILE_EXTS = ["docx", "doc", "md", "markdown", "txt"] as const;
/** 单文件上限 10MB */
export const KB_MAX_FILE_BYTES = 10 * 1024 * 1024;
/** 单次上传文件数上限 */
export const KB_MAX_FILES_PER_UPLOAD = 10;
/** multipart 表单字段名 */
export const KB_UPLOAD_FIELD = "files";
/** 扩展名 → Coze `file_type`（Coze 文本知识库无 md 类型，映射为 txt） */
export const COZE_FILE_TYPE_MAP = {
  docx: "docx",
  doc: "doc",
  txt: "txt",
  md: "txt",
  markdown: "txt",
} as const;
/** 拒绝文案（400 的 `message`；E-04 文件行直接展示） */
export const KB_REJECT_MESSAGE = "仅支持 Word（.docx/.doc）、Markdown（.md）、TXT 文件，不支持 PDF 和图片";

export type KbFileExt = (typeof KB_FILE_EXTS)[number];

/** 取小写扩展名（无扩展名返回 `""`）；`a.B.MD` → `"md"` */
export function kbFileExtOf(filename: string): string {
  const m = /\.([A-Za-z0-9]+)\s*$/.exec(filename.trim());
  return m ? m[1].toLowerCase() : "";
}

/** 扩展名是否在白名单内（大小写不敏感） */
export function isAllowedKbExt(ext: string): ext is KbFileExt {
  return (KB_FILE_EXTS as readonly string[]).includes(ext.toLowerCase());
}

/** 文件名级校验（仅扩展名；大小/数量由 C-06 用 {@link KB_MAX_FILE_BYTES}/{@link KB_MAX_FILES_PER_UPLOAD} 校验） */
export function isAllowedKbFilename(filename: string): boolean {
  return isAllowedKbExt(kbFileExtOf(filename));
}

/** 扩展名 → Coze `file_type`；白名单外返回 `undefined` */
export function cozeFileTypeOf(filename: string): string | undefined {
  const ext = kbFileExtOf(filename);
  return isAllowedKbExt(ext) ? COZE_FILE_TYPE_MAP[ext] : undefined;
}

// ── 知识库 CRUD（`/api/knowledge-bases`，权限 kb:*）───────────────────────
export const knowledgeBaseCreateSchema = z.object({
  name: z.string().min(1).max(50),
  code: z.string().min(1).max(50).regex(/^[a-z0-9][a-z0-9_-]*$/),
  description: z.string().max(500).nullable().optional(),
  /** 绑定已有 Coze dataset；留空表示"新建并同步到 Coze" */
  cozeDatasetId: z.string().max(64).nullable().optional(),
  isDefault: z.boolean().default(false),
  status: z.enum(["active", "inactive"]).default("active"),
  sort: z.coerce.number().int().min(0).default(0),
});
export type KnowledgeBaseCreate = z.infer<typeof knowledgeBaseCreateSchema>;

export const knowledgeBaseUpdateSchema = knowledgeBaseCreateSchema.partial();
export type KnowledgeBaseUpdate = z.infer<typeof knowledgeBaseUpdateSchema>;

// ── 文件处理进度（GET `/api/knowledge-files/[id]/progress`）────────────────
/** `cozeStatus`：0 处理中 / 1 完成 / 9 失败（Coze `document_infos[].status`） */
export const knowledgeFileStatusSchema = z.object({
  cozeStatus: z.union([z.literal(0), z.literal(1), z.literal(9)]).nullable(),
  progress: z.number().int().min(0).max(100).nullable(),
  error: z.string().nullable().optional(),
});
export type KnowledgeFileStatus = z.infer<typeof knowledgeFileStatusSchema>;

// ── 检索测试（POST `/api/kb/test`，权限 kb:list）─────────────────────────
/** 保留既有 `query`/`tags` 与中文提示，新增 `baseIds`/`topK` */
export const kbSearchRequestSchema = z.object({
  query: z.string().trim().min(1, "请输入检索问题").max(500),
  tags: z.array(z.string()).optional(),
  baseIds: z.array(z.coerce.number().int().positive()).max(20).optional(),
  topK: z.coerce.number().int().min(1).max(20).default(5),
});
export type KbSearchRequest = z.infer<typeof kbSearchRequestSchema>;

// ── 管理端扩展（CCR-1 / W0-10 新增；消费卡 C-12、E-04、E-11）──────────────
/**
 * 文件元信息更新（PATCH `/api/knowledge-files/[id]`）。
 * 只更新 tags（KnowledgeFile.tags 列已存在）；状态走 kbBatch（见下）。
 */
export const knowledgeFileUpdateSchema = z.object({
  tags: z.array(z.string().min(1).max(20)).max(20).nullable().optional(),
});
export type KnowledgeFileUpdate = z.infer<typeof knowledgeFileUpdateSchema>;

/**
 * 批量操作（POST `/api/knowledge-files/batch`）。
 * enable/disable 的落点：按 Knowledge.fileId 批量设该文件全部 Knowledge 行的 status=active|inactive
 * （**KnowledgeFile 无 enabled 列**，见 ADR-034 §enable/disable 映射）；tag/untag 更新 KnowledgeFile.tags；
 * trash 移入回收站（KnowledgeFile.deletedAt）。
 */
export const kbBatchSchema = z.object({
  ids: z.array(z.coerce.number().int().positive()).min(1).max(100),
  action: z.enum(["enable", "disable", "tag", "untag", "trash"]),
  tags: z.array(z.string().min(1).max(20)).max(20).nullable().optional(),
});
export type KbBatch = z.infer<typeof kbBatchSchema>;

/** 回收站操作（POST `/api/knowledge-files/trash`）；purge 彻底删除时同步删 Coze 远端（C-12） */
export const kbTrashActionSchema = z.object({
  ids: z.array(z.coerce.number().int().positive()).min(1).max(100),
  action: z.enum(["restore", "purge"]),
});
export type KbTrashAction = z.infer<typeof kbTrashActionSchema>;

/** 知识库统计（GET `/api/knowledge-bases/[id]/stats`）；lastSyncAt 为派生字段（见 ADR-034） */
export const kbStatsSchema = z.object({
  baseId: z.coerce.number().int().positive(),
  files: z.coerce.number().int().min(0),
  chunks: z.coerce.number().int().min(0),
  trash: z.coerce.number().int().min(0),
  cozeOk: z.coerce.number().int().min(0),
  cozeFailed: z.coerce.number().int().min(0),
  /** 派生：该库 Knowledge.syncedAt 最大值（无同步记录为 null） */
  lastSyncAt: z.string().datetime({ offset: true }).nullable(),
});
export type KbStats = z.infer<typeof kbStatsSchema>;

/** 导出查询（GET `/api/knowledge-bases/[id]/export`，鉴权下载 zip；文件不对外公开，契约④） */
export const kbExportQuerySchema = z.object({
  baseId: z.coerce.number().int().positive(),
  includeTrash: z.coerce.boolean().default(false),
});
export type KbExportQuery = z.infer<typeof kbExportQuerySchema>;

/** 分块内容更新（PATCH `/api/knowledge-chunks/[id]`） */
export const knowledgeChunkUpdateSchema = z.object({
  content: z.string().min(1).max(20000),
});
export type KnowledgeChunkUpdate = z.infer<typeof knowledgeChunkUpdateSchema>;

/** 重建响应（POST `/api/knowledge-bases/[id]/rebuild`） */
export const kbRebuildResponseSchema = z.object({
  jobId: z.string().min(1),
});
export type KbRebuildResponse = z.infer<typeof kbRebuildResponseSchema>;
