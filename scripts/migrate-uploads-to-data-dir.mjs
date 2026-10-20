#!/usr/bin/env node
/**
 * D-10 · migrate-uploads-to-data-dir：把 uploads/** 从 git 索引中移出（磁盘文件保留）。
 *
 * 目标：`git ls-files uploads` = 0，且磁盘上的上传文件不删除（运行时读取仍走 /uploads/:path*）。
 * 原因：uploads 为运行时写入（D-09 起 DATA_DIR 化），不应入版本库。
 *
 * 用法：
 *   node scripts/migrate-uploads-to-data-dir.mjs          # dry-run（默认）：只报告计数
 *   node scripts/migrate-uploads-to-data-dir.mjs --apply  # 执行 git rm --cached
 *
 * 退出码：0 = 通过；1 = 计数不一致（不执行 apply）/ 执行失败。
 *
 * 安全：
 *   - 只在 dry-run 计数与 git ls-files 完全一致时才允许 --apply。
 *   - 只执行 `git rm --cached -r -- uploads`（不动工作区文件）。
 */
import { execFileSync } from "node:child_process";

const APPLY = process.argv.includes("--apply");

/** 跑 git 并返回 stdout 文本 */
function git(args) {
  return execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] });
}

/** git ls-files 列出的 uploads 跟踪文件 */
function trackedUploads() {
  const out = git(["ls-files", "uploads"]);
  return out.split("\n").filter((l) => l.trim().length > 0);
}

function main() {
  const files = trackedUploads();
  const count = files.length;

  // 分目录统计
  const byDir = {};
  for (const f of files) {
    const dir = f.split("/").slice(0, 2).join("/");
    byDir[dir] = (byDir[dir] || 0) + 1;
  }

  console.log(`[D-10] uploads 被 git 跟踪文件数 = ${count}`);
  if (count === 0) {
    console.log("[D-10] 已无跟踪文件，无需处理。");
    return;
  }
  console.log("[D-10] 按目录分布：");
  for (const [dir, n] of Object.entries(byDir).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${dir}: ${n}`);
  }
  console.log(`[D-10] 磁盘文件总数（含未跟踪）由外部核对：find uploads -type f | wc -l`);

  if (!APPLY) {
    console.log("[D-10] dry-run：未执行任何改动。使用 --apply 执行 git rm --cached。");
    return;
  }

  // 与 git ls-files 二次核对
  const recheck = trackedUploads().length;
  if (recheck !== count) {
    console.error(`[D-10] 计数不一致（${count} vs ${recheck}），拒绝执行 --apply。`);
    process.exit(1);
  }

  console.log(`[D-10] 执行 git rm --cached -r -- uploads（磁盘文件保留）…`);
  git(["rm", "--cached", "-r", "--", "uploads"]);
  const after = trackedUploads().length;
  if (after !== 0) {
    console.error(`[D-10] 失败：执行后仍有 ${after} 个文件被跟踪。`);
    process.exit(1);
  }
  console.log(`[D-10] 完成：uploads 跟踪文件 = 0；磁盘文件未删除。`);
  console.log("[D-10] 提醒：需在 .gitignore 追加 uploads/ 以防重新入版本库。");
}

main();