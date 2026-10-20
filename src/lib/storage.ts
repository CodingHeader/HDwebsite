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
