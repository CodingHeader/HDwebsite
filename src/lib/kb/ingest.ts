/**
 * C-06：知识库文件**入库管线**（路由层与测试共用，纯 prisma + fs，不触网络）。
 *
 * 职责（与 C-03 管线衔接）：
 * - 三重校验：checkUploadFile（扩展名 + 魔数 + MIME），失败返回 400 文案 {@link KB_REJECT_MESSAGE}
 * - 文件落盘：`kbDir()/<baseId>/<sha256>.<ext>`（不对外公开，契约④）
 * - 去重：同一 `baseId + sha256` 冲突 → 返回已有记录（HTTP 200，契约头注释）
 * - 本地解析：parseByExt（docx / md / markdown / txt → ok；doc → skipped）→ chunkText 切片 → Knowledge 落库
 * - 单文件事务：文件记录 + 全部切片在一个事务内完成，失败回滚并清理已写磁盘
 * - 删除级联：删除 KnowledgeFile 时同步删除其 Knowledge 切片，并尽力删除磁盘文件
 *
 * 注意：Coze 远端推送不在此模块（见 kb/coze.ts + kb-sync），本模块只负责**本地**一致。
 */
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { KB_MAX_FILE_BYTES } from "@/contracts/kb";
import { checkUploadFile } from "@/lib/kb/filetype";
import { parseByExt } from "@/lib/kb/parse";
import { chunkText } from "@/lib/kb/chunk";
import { kbDir } from "@/lib/storage";
import { prisma } from "@/lib/prisma";
import type { KnowledgeFile } from ".prisma/client";

/** 入库校验结果：与契约拒绝文案一致 */
export type IngestCheck =
  | { ok: true; filename: string; ext: string; mimeType: string; size: number; head: Uint8Array }
  | { ok: false; message: string };

/**
 * 校验一个上传文件（供 multipart 路由调用）：
 * ① File 存在且 size ≤ {@link KB_MAX_FILE_BYTES}
 * ② checkUploadFile 三重校验（扩展名 / 魔数 / MIME）
 */
export async function checkIngestFile(file: File): Promise<IngestCheck> {
  if (file.size > KB_MAX_FILE_BYTES) {
    return { ok: false, message: `单个文件不能超过 ${Math.floor(KB_MAX_FILE_BYTES / 1024 / 1024)}MB` };
  }
  const buf = new Uint8Array(await file.arrayBuffer());
  const head = buf.slice(0, 32);
  const c = checkUploadFile(file.name, file.type, head);
  if (!c.ok) return { ok: false, message: c.message };
  // V11-KB-04：黑名单之外补正向校验——
  //   docx 必须是 ZIP 容器（PK\x03\x04）；md/txt 必须可按 UTF-8 解码且不含 NUL（防伪装二进制）
  if (c.ext === "docx" || c.ext === "doc") {
    if (!(head[0] === 0x50 && head[1] === 0x4b)) {
      return { ok: false, message: "文档内容与扩展名不符（docx 须为 ZIP 容器）" };
    }
  } else if (c.ext === "txt" || c.ext === "md" || c.ext === "markdown") {
    const text = new TextDecoder("utf-8", { fatal: true }).decode(buf.subarray(0, Math.min(buf.length, 64 * 1024)));
    if (text.includes("\u0000")) {
      return { ok: false, message: "文本文件包含二进制内容（非 UTF-8 文本）" };
    }
  }
  return { ok: true, filename: file.name, ext: c.ext, mimeType: c.mimeType, size: file.size, head };
}

/** 去重/冲突返回的已有记录形态 */
export type IngestOutcome =
  | { status: "created" | "existing"; file: KnowledgeFile; chunks: number }
  | { status: "rejected"; message: string }
  | { status: "error"; message: string };

/** sha256（hex） */
function sha256Hex(buf: Uint8Array): string {
  return crypto.createHash("sha256").update(Buffer.from(buf)).digest("hex");
}

/**
 * 入库一个文件（调用方保证已通过 {@link checkIngestFile}）：
 * - 读全文 → 校验 → 落盘 → 解析 → 切片 → 事务写库
 * - 同 `baseId+sha256` 已存在：返回 existing（不改动任何数据）
 */

/**
 * V11-KB-01：本地上传的文件推送 Coze（fire-and-forget，不阻塞上传主流程）。
 * - 目标库绑定 cozeDatasetId 且 Coze 后端可用才推；否则静默跳过（不报错不落日志噪音）
 * - 内容形态：解析成功的全文（md/txt/docx 抽取文本）作为 document 推送（文件名即文档名）
 * - 结果记 OperationLog（schema 冻结，KnowledgeFile 无 coze 状态列）
 * - 失败不影响上传结果（文件与切片已落库；可重传同名文件走 existing 分支后重推）
 */
async function pushFileToCoze(baseId: number, filename: string, text: string): Promise<void> {
  try {
    const { getKnowledgeBackend } = await import("@/lib/kb/registry");
    const { configureCozeBackendFromSettings } = await import("@/lib/kb-sync");
    const cfgOk = await configureCozeBackendFromSettings();
    const b = getKnowledgeBackend("coze");
    if (!cfgOk.ok || !b?.pushDocument) return; // 未配置 Coze：静默跳过（本地上传不依赖远端）
    const base = await prisma.knowledgeBase.findUnique({ where: { id: baseId }, select: { cozeDatasetId: true } });
    if (!base?.cozeDatasetId) return;
    const { documentId } = await b.pushDocument({ id: 0, baseId, title: filename, content: text, datasetId: base.cozeDatasetId });
    const { logOperation } = await import("@/lib/log");
    await logOperation({ username: "system", module: "kb", action: "coze_push", title: filename, after: { documentId } });
  } catch (err) {
    const { logOperation } = await import("@/lib/log");
    await logOperation({ username: "system", module: "kb", action: "coze_push_failed", title: filename, after: { error: err instanceof Error ? err.message : String(err) } }).catch(() => {});
  }
}

export async function ingestFile(baseId: number, file: File): Promise<IngestOutcome> {
  const check = await checkIngestFile(file);
  if (!check.ok) return { status: "rejected", message: check.message };

  const buf = new Uint8Array(await file.arrayBuffer());
  const sha = sha256Hex(buf);

  // 去重（先查一次，避免无谓落盘）
  const dup = await prisma.knowledgeFile.findUnique({ where: { baseId_sha256: { baseId, sha256: sha } } });
  if (dup) return { status: "existing", file: dup, chunks: dup.chunkCount };

  // 落盘
  // turbopackIgnore：`kbDir()` 是函数调用，Turbopack 无法静态解析其返回值，会过度追踪整个项目根（11991 文件）。
  // 加 turbopackIgnore 注释使构建期不追踪该动态路径；运行时路径由 storage.ts 解析。
  const dir = path.join(/* turbopackIgnore: true */ kbDir(), String(baseId));
  const storagePath = `${baseId}/${sha}.${check.ext}`;
  const abs = path.join(/* turbopackIgnore: true */ kbDir(), storagePath);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(abs, Buffer.from(buf));

  // 解析 + 切片
  const parsed = await parseByExt(check.filename, buf);
  const chunks = parsed.state === "ok" ? chunkText(parsed.text) : [];
  const errMsg = parsed.state === "ok" ? null : parsed.error;

  try {
    const fileRec = await prisma.$transaction(async (tx) => {
      const f = await tx.knowledgeFile.create({
        data: {
          baseId,
          filename: check.filename.slice(0, 255),
          ext: check.ext,
          mimeType: check.mimeType,
          size: check.size,
          sha256: sha,
          storagePath,
          localParse: parsed.state,
          chunkCount: chunks.length,
          errMsg,
        },
      });
      if (chunks.length > 0) {
        await tx.knowledge.createMany({
          data: chunks.map((text, i) => ({
            title: `${check.filename} #${i + 1}`,
            content: text,
            source: "local",
            status: "active",
            baseId,
            fileId: f.id,
            chunkIndex: i,
          })),
        });
      }
      return f;
    });
    // V11-KB-01：解析成功即推送 Coze（异步，不阻塞上传响应）
    if (parsed.state === "ok" && parsed.text.trim()) {
      void pushFileToCoze(baseId, check.filename, parsed.text);
    }
    return { status: "created", file: fileRec, chunks: chunks.length };
  } catch (err) {
    // 事务失败：清理刚写的磁盘文件
    await fs.unlink(abs).catch(() => {});
    return { status: "error", message: err instanceof Error ? err.message : "文件入库失败" };
  }
}

/**
 * 重解析一个文件（C-06 `/api/knowledge-files/[id]/reparse`）：
 * 重新读取磁盘原文 → 解析 → 重建切片（删除旧切片，重建新切片）。
 * 未落盘/文件缺失 → error。
 */
export async function reparseFile(id: number): Promise<{ ok: boolean; chunkCount: number; localParse: string; message?: string }> {
  const f = await prisma.knowledgeFile.findUnique({ where: { id } });
  if (!f) return { ok: false, chunkCount: 0, localParse: "pending", message: "文件不存在" };
  const abs = path.join(kbDir(), f.storagePath);
  let buf: Buffer;
  try {
    buf = await fs.readFile(abs);
  } catch {
    return { ok: false, chunkCount: 0, localParse: "failed", message: "文件缺失，请重新上传" };
  }
  const parsed = await parseByExt(f.filename, new Uint8Array(buf));
  const chunks = parsed.state === "ok" ? chunkText(parsed.text) : [];
  await prisma.$transaction(async (tx) => {
    await tx.knowledge.deleteMany({ where: { fileId: id } });
    if (chunks.length > 0) {
      await tx.knowledge.createMany({
        data: chunks.map((text, i) => ({
          title: `${f.filename} #${i + 1}`,
          content: text,
          source: "local",
          status: "active",
          baseId: f.baseId,
          fileId: id,
          chunkIndex: i,
        })),
      });
    }
    await tx.knowledgeFile.update({
      where: { id },
      data: { localParse: parsed.state, chunkCount: chunks.length, errMsg: parsed.state === "ok" ? null : parsed.error },
    });
  });
  return { ok: true, chunkCount: chunks.length, localParse: parsed.state };
}

/**
 * 删除文件（级联）：事务内删除 Knowledge 切片 + KnowledgeFile，事务外尽力删除磁盘文件。
 * 返回被删除的文件记录（调用方可能需请求 Coze 删除远端文档）。
 */
export async function deleteFileCascade(id: number): Promise<{ ok: boolean; file?: KnowledgeFile; message?: string }> {
  const f = await prisma.knowledgeFile.findUnique({ where: { id } });
  if (!f) return { ok: false, message: "文件不存在" };
  await prisma.$transaction(async (tx) => {
    await tx.knowledge.deleteMany({ where: { fileId: id } });
    await tx.knowledgeFile.delete({ where: { id } });
  });
  // 磁盘清理（尽力而为，不阻塞响应）
  const abs = path.join(kbDir(), f.storagePath);
  try {
    await fs.unlink(abs);
  } catch {
    // 文件可能已不存在（如之前删除过），忽略
  }
  // 目录清理：baseId 目录为空则删除
  try {
    const dir = path.dirname(abs);
    const rest = await fs.readdir(dir);
    if (rest.length === 0) await fs.rmdir(dir);
  } catch {
    // ignore
  }
  return { ok: true, file: f };
}