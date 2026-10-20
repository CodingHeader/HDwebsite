/**
 * 轻量 tar.gz 打包工具（D-10）—— 不引入外部依赖（package.json 冻结），手写 ustar 头 + 流式 gzip。
 *
 * 用途：备份任务把 db + uploads + kb 三类归档为一个 tar.gz。
 * 设计约束：
 * - 流式输出（Readable 生成器），大目录不整体驻留内存。
 * - 纯函数式，便于 vitest 直接单测（buildTarGz + listTar 读回）。
 * - ustar 格式：512 字节头 + 内容按 512 对齐 + 两个 512 结尾零块。
 */
import { createReadStream, createWriteStream, readFileSync, readdirSync, statSync } from "node:fs";
import type { Writable, Readable as NodeReadable } from "node:stream";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { createGzip, gunzipSync } from "node:zlib";
import path from "node:path";

const BLOCK = 512;

/** 待归档条目（相对路径 + 磁盘绝对路径 + 类型） */
export interface TarEntry {
  /** 归档内相对路径，POSIX 风格（/ 分隔），不能以 / 开头、不能含 .. */
  rel: string;
  /** 磁盘上的绝对路径 */
  abs: string;
  type: "file" | "dir";
}

/** 十进制数转 tar 八进制字段（右对齐，左补 0，截断到 len） */
function octal(n: number, len: number): string {
  return n.toString(8).padStart(len, "0").slice(-len);
}

/**
 * 把相对路径拆成 ustar 的 name（≤100）+ prefix（≤155）。
 * tar 允许路径超过 100 字节时把左部目录放 prefix。
 */
export function splitTarPath(rel: string): { name: string; prefix: string } {
  if (Buffer.byteLength(rel) <= 100) return { name: rel, prefix: "" };
  const parts = rel.split("/");
  let prefix = "";
  while (parts.length > 1) {
    const first = parts.shift()!;
    const candidate = prefix ? `${prefix}/${first}` : first;
    const remaining = parts.join("/");
    if (Buffer.byteLength(remaining) <= 100 && Buffer.byteLength(candidate) <= 155) {
      return { name: remaining, prefix: candidate };
    }
    if (Buffer.byteLength(candidate) > 155) break;
    prefix = candidate;
  }
  // 兜底：截断 name（防御极端路径，实际项目内路径均 <100）
  return { name: rel.slice(-100), prefix: "" };
}

/** 生成一个 512 字节的 ustar 文件/目录头 */
function buildHeader(e: { rel: string; size: number; mtime: number; type: "file" | "dir" }): Buffer {
  const buf = Buffer.alloc(BLOCK, 0);
  const { name, prefix } = splitTarPath(e.rel);
  Buffer.from(name, "utf8").copy(buf, 0, 0, 100);
  buf.write(octal(0o644, 8), 100, "ascii"); // mode
  buf.write(octal(0, 8), 108, "ascii"); // uid
  buf.write(octal(0, 8), 116, "ascii"); // gid
  buf.write(octal(e.size, 12), 124, "ascii"); // size
  buf.write(octal(Math.max(0, Math.floor(e.mtime)), 12), 136, "ascii"); // mtime
  buf.write("        ", 148, "ascii"); // checksum 先置空格
  buf.write(e.type === "dir" ? "5" : "0", 156, "ascii"); // typeflag
  buf.write("ustar\0", 257, "ascii"); // magic
  buf.write("00", 263, "ascii"); // version
  // uname(265-296) / gname(297-328) / devmajor(329-336) / devminor(337-344) 留 0
  if (prefix) Buffer.from(prefix, "utf8").copy(buf, 345, 0, 155);
  // checksum：全部字节和，写为 "%06o\0 "
  let sum = 0;
  for (let i = 0; i < BLOCK; i++) sum += buf[i];
  buf.write(octal(sum, 6), 148, "ascii");
  buf[154] = 0;
  buf[155] = 0x20;
  return buf;
}

/** 逐条目产出 tar 块（头 + 内容 + 512 对齐填充） */
async function* tarChunks(entries: readonly TarEntry[]): AsyncGenerator<Buffer> {
  for (const e of entries) {
    const st = statSync(e.abs);
    const size = e.type === "dir" ? 0 : st.size;
    const mtime = st.mtimeMs / 1000;
    yield buildHeader({ rel: e.rel, size, mtime, type: e.type });
    if (e.type !== "dir") {
      const rs = createReadStream(e.abs);
      for await (const chunk of rs) yield Buffer.from(chunk);
      const pad = size % BLOCK === 0 ? 0 : BLOCK - (size % BLOCK);
      if (pad > 0) yield Buffer.alloc(pad, 0);
    }
  }
  // tar 结尾：两个全零块
  yield Buffer.alloc(BLOCK * 2, 0);
}

/** 流式管线：源 Readable →（可选 gzip）→ 目标 Writable */
type PipeSource = NodeReadable;
type PipeSink = Writable;

/**
 * 生成 tar.gz（或纯 tar，gzip=false）到目标文件。
 * 目标文件父目录必须已存在；文件会被覆盖。
 */
export async function buildTarGz(
  target: string,
  entries: readonly TarEntry[],
  opts: { gzip?: boolean } = {},
): Promise<void> {
  const gzip = opts.gzip !== false;
  const source: PipeSource = Readable.from(tarChunks(entries));
  const sink: PipeSink = createWriteStream(target);
  if (gzip) {
    await pipeline(source, createGzip(), sink);
  } else {
    await pipeline(source, sink);
  }
}

/** tar 条目名（解析用） */
export interface TarListedEntry {
  name: string;
  size: number;
  typeflag: string;
}

/**
 * 读回 tar（自动识别 gzip）并列出条目。
 * 供备份单测验证归档内容；也可作为人工检视工具。
 */
export function listTar(target: string): TarListedEntry[] {
  const raw = readFileSync(target);
  const buf = raw.length > 2 && raw[0] === 0x1f && raw[1] === 0x8b ? gunzipSync(raw) : raw;
  const out: TarListedEntry[] = [];
  let off = 0;
  while (off + BLOCK <= buf.length) {
    const block = buf.subarray(off, off + BLOCK);
    // 全零块 = 结尾
    if (block.every((b) => b === 0)) break;
    const sizeStr = block.subarray(124, 136).toString("ascii").replace(/\0.*$/, "").trim();
    const size = parseInt(sizeStr, 8) || 0;
    const typeflag = block.subarray(156, 157).toString("ascii");
    const nameBuf = block.subarray(0, 100).toString("utf8").replace(/\0.*$/, "");
    const prefixBuf = block.subarray(345, 500).toString("utf8").replace(/\0.*$/, "");
    const name = prefixBuf ? `${prefixBuf}/${nameBuf}` : nameBuf;
    out.push({ name, size, typeflag });
    off += BLOCK + Math.ceil(size / BLOCK) * BLOCK;
  }
  return out;
}

/** 从目录收集条目（相对路径前缀 + 磁盘根） */
export function collectDirEntries(rootAbs: string, prefix = ""): TarEntry[] {
  const out: TarEntry[] = [];
  const walk = (dirAbs: string, dirRel: string) => {
    for (const name of readdirSync(dirAbs)) {
      const abs = path.join(dirAbs, name);
      const rel = dirRel ? `${dirRel}/${name}` : name;
      const st = statSync(abs);
      if (st.isDirectory()) {
        out.push({ rel: `${rel}/`, abs, type: "dir" });
        walk(abs, rel);
      } else if (st.isFile()) {
        out.push({ rel, abs, type: "file" });
      }
    }
  };
  walk(rootAbs, prefix);
  return out;
}