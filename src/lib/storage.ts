/**
 * 存储根与路径安全（`src/lib/storage.ts`，W0-03 冻结签名）—— 磁盘位置的唯一来源 + 防目录穿越。
 *
 * D-09：DATA_DIR 化实现。磁盘根不再直接硬编码 `process.cwd()`：
 * - 未设置 DATA_DIR → 各目录相对 `process.cwd()`（与 W0 默认行为完全一致，零破坏，
 *   本地开发/测试路径不变：`data/`、`uploads/`、`backups/`、`data/kb/`）。
 * - 设置 DATA_DIR=/opt/hdw/data → 全部落到该根下：`/opt/hdw/data/{data,uploads,backups}/…`。
 *   生产部署建议显式设置 DATA_DIR，使运行时写入集中在单一数据卷（D-08 卷 hdwebsite-data），
 *   与构建产物（standalone）彻底分离——standalone 不再携带 uploads（I14）。
 *
 * 设计约束：
 * - 保持 `dataDir()`/`uploadsDir()`/`backupsDir()`/`kbDir()` 公开签名与语义不变；
 *   新增 `dataRoot()` 作为 DATA_DIR 的解析点（内部使用，未导出以免扩大 API 面）。
 * - `resolveInside` 防目录穿越逻辑不变（词法规范化；符号链接由部署侧文件权限约束）。
 */
import path from "node:path";

/** 上传/采集共用的 MIME 类型 → 扩展名白名单（D-12：单一来源，上传与采集共用） */
export const UPLOAD_MIME_EXT: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "video/mp4": ".mp4",
  "application/pdf": ".pdf",
};

/** 上传单文件大小上限（字节）—— K2 决议（V1.1 SEC-03）：维持 20MB 不变，安全目标由魔数校验达成 */
export const UPLOAD_MAX_SIZE = 20 * 1024 * 1024;

/** 采集图片下载大小上限（字节）—— 超过立即中止该图，留原链 */
export const COLLECT_IMAGE_MAX_SIZE = 10 * 1024 * 1024;

/** 采集图片允许的 MIME 类型（仅图片；PDF/视频不入采集转存） */
export const COLLECT_IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
};

/** 上传白名单类型 → 文件头魔数（正向校验；V11-SEC-03）
 *  口径与 src/lib/kb/filetype.ts 的头字节嗅探对齐（只看文件头，不做全文件扫描）：
 *  - JPEG: FF D8 FF；PNG: 89 50 4E 47 0D 0A 1A 0A；GIF: "GIF8"（GIF87a/89a）；
 *    WebP: "RIFF" + 偏移 8 处 "WEBP"；PDF: "%PDF"；MP4: 偏移 4 处 "ftyp"。
 */
const UPLOAD_MAGIC: { mime: string; offset?: number; bytes: number[]; extraAt?: { offset: number; bytes: number[] } }[] = [
  { mime: "image/jpeg", bytes: [0xff, 0xd8, 0xff] },
  { mime: "image/png", bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
  { mime: "image/gif", bytes: [0x47, 0x49, 0x46, 0x38] },
  { mime: "image/webp", bytes: [0x52, 0x49, 0x46, 0x46], extraAt: { offset: 8, bytes: [0x57, 0x45, 0x42, 0x50] } },
  { mime: "application/pdf", bytes: [0x25, 0x50, 0x44, 0x46] },
  { mime: "video/mp4", offset: 4, bytes: [0x66, 0x74, 0x79, 0x70] },
];

function magicMatches(head: Uint8Array, m: { offset?: number; bytes: number[]; extraAt?: { offset: number; bytes: number[] } }): boolean {
  const at = m.offset ?? 0;
  if (head.length < at + m.bytes.length) return false;
  for (let i = 0; i < m.bytes.length; i++) {
    if (head[at + i] !== m.bytes[i]) return false;
  }
  if (m.extraAt) {
    if (head.length < m.extraAt.offset + m.extraAt.bytes.length) return false;
    for (let i = 0; i < m.extraAt.bytes.length; i++) {
      if (head[m.extraAt.offset + i] !== m.extraAt.bytes[i]) return false;
    }
  }
  return true;
}

/** 按文件头识别白名单类型；命中返回 MIME，未命中（含白名单外的真实类型/纯文本等）返回 null */
export function detectUploadMagic(head: Uint8Array): string | null {
  for (const m of UPLOAD_MAGIC) {
    if (magicMatches(head, m)) return m.mime;
  }
  return null;
}

/**
 * 上传魔数正向校验（V11-SEC-03，双向）：
 * ① 声明类型必须有期望文件头（防"扩展名/Content-Type 伪装成图片"）；
 * ② 文件头识别出的真实类型与声明一致（真实类型不在白名单时同样拒绝）。
 * 仅 image/jpeg、image/png、image/gif、image/webp 有强魔数约束；pdf/mp4 按标准文件头校验。
 */
export function validateUploadMagic(mimeType: string, head: Uint8Array): { ok: true } | { ok: false; message: string } {
  if (!(mimeType in UPLOAD_MIME_EXT)) {
    return { ok: false, message: `不支持的文件类型：${mimeType || "未知"}` };
  }
  if (!magicMatches(head, UPLOAD_MAGIC.find((m) => m.mime === mimeType)!)) {
    const detected = detectUploadMagic(head);
    return {
      ok: false,
      message: detected
        ? `文件内容与声明的类型不符（实际为 ${detected}）`
        : "文件内容与声明的类型不符",
    };
  }
  return { ok: true };
}

/**
 * 数据根：环境变量 DATA_DIR 显式设置时以其为根（解析为绝对路径）；否则回退项目根。
 * 各公开 Dir 函数统一经此解析，实现"路径与 cwd 解耦"。
 */
function dataRoot(): string {
  const dir = process.env.DATA_DIR;
  if (typeof dir === "string" && dir.trim().length > 0) {
    return path.resolve(dir.trim());
  }
  return process.cwd();
}

/** 数据子目录（备份、知识库文件、运行时数据） */
export function dataDir(): string {
  return path.resolve(dataRoot(), "data");
}

/** 媒体上传根（`/uploads/:path*` rewrite 目标） */
export function uploadsDir(): string {
  return path.resolve(dataRoot(), "uploads");
}

/** 数据库备份根（保留最近 14 份） */
export function backupsDir(): string {
  return path.resolve(dataRoot(), "backups");
}

/** 知识库文件根（`<kbDir>/<baseId>/<sha256>.<ext>`，不对外公开） */
export function kbDir(): string {
  return path.join(dataDir(), "kb");
}

/**
 * 把**不受信任**的相对路径解析进 `root` 内，违规即抛错（防目录穿越）。
 *
 * 拒绝：绝对路径 / 盘符路径 / 反斜杠 / 含 NUL / 段以 `.` 开头（含 `.`、`..`）/ 空段 / 空串。
 * 返回绝对路径，且保证等于 `root` 或位于 `root` 之下。
 *
 * 注：仅做**词法**规范化，不解析符号链接（符号链接穿越由部署侧文件权限约束）。
 * @throws {Error} 路径违规
 */
export function resolveInside(root: string, rel: string): string {
  if (typeof rel !== "string" || rel.length === 0) throw new Error("resolveInside: 路径不能为空");
  if (rel.includes("\0")) throw new Error("resolveInside: 路径含非法字符");
  if (rel.includes("\\")) throw new Error(`resolveInside: 不允许反斜杠 —— ${rel}`);
  if (path.isAbsolute(rel) || /^[a-zA-Z]:/.test(rel)) throw new Error(`resolveInside: 不允许绝对路径 —— ${rel}`);

  const segments = rel.split("/");
  for (const seg of segments) {
    if (seg === "") throw new Error(`resolveInside: 路径含空段 —— ${rel}`);
    if (seg.startsWith(".")) throw new Error(`resolveInside: 不允许点开头段 —— ${rel}`);
  }

  const absRoot = path.resolve(root);
  const abs = path.resolve(absRoot, ...segments);
  if (abs !== absRoot && !abs.startsWith(absRoot + path.sep)) {
    throw new Error(`resolveInside: 解析结果越出根目录 —— ${rel}`);
  }
  return abs;
}
