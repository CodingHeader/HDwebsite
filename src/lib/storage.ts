/**
 * 存储根与路径安全（`src/lib/storage.ts`，W0-03 冻结签名）—— 磁盘位置的唯一来源 + 防目录穿越。
 *
 * W0 默认实现 = 现有行为（全部相对 `process.cwd()`）：`data/`、`uploads/`、`backups/`、`data/kb/`。
 * 「环境变量 DATA_DIR 化」由 D 线 D-09 在同一签名下替换实现（调用方无需改动）。
 */
import path from "node:path";

/** 数据根（备份、知识库文件、运行时数据） */
export function dataDir(): string {
  return path.resolve(process.cwd(), "data");
}

/** 媒体上传根（`/uploads/:path*` rewrite 目标） */
export function uploadsDir(): string {
  return path.resolve(process.cwd(), "uploads");
}

/** 数据库备份根（保留最近 14 份） */
export function backupsDir(): string {
  return path.resolve(process.cwd(), "backups");
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
