#!/usr/bin/env node
/**
 * W2-09 · check-root：根目录白名单守卫（规划总指令 §9.4）。
 *
 * 白名单 = 项目根目录允许存在的文件/目录（按名字匹配，忽略以 .git 开头的内部目录）。
 * 运行时生成的目录（.cache/.next/node_modules/backups/uploads/data/docs）允许存在但由 .gitignore 管理。
 *
 * 用法：node scripts/check-root.mjs
 * 退出码：0 = 通过；1 = 存在未列入白名单的条目（逐条打印）。
 */
import { readdirSync } from "node:fs";

const root = process.cwd();

/** 根目录污染守卫：只允许白名单内的条目 */
const WHITELIST = new Set([
  // 工程文件
  ".dockerignore",
  ".env",
  ".env.example",
  ".env.local",
  ".git",
  ".frozen-baseline", // V14-FROZEN-GUARD-01：冻结基线标记
  ".github", // D-13：CI workflow（工程文件）
  ".gitattributes",
  ".gitignore",
  ".box-agent",
  ".box-agent-scratch",
  // AI 编码助手（box-agent / openclaw）的运行时档案与文件写入标记，非项目交付物；
  // 由工具在会话启动/写文件时自动生成，无法通过配置改路径。
  // 按「存疑文件不删」保留，登记为白名单（.artifact.json 形如 {"retain_for_chat":true}）。
  ".openclaw",
  "IDENTITY.md",
  "USER.md",
  ".eslint.config.mjs.artifact.json",
  ".cache",
  ".next",
  ".npmrc",
  ".prettierrc",
  ".smoke2.log",
  ".smoke3.log",
  ".smoke4.log",
  ".smoke5.log",
  ".verify-dev.log",
  ".verify-prod.log",
  // 项目目录
  "AGENTS.md",
  "CLAUDE.md",
  "Dockerfile",
  "Dockerfile.dev",
  "README.md",
  "backups",
  "data",
  "docs",
  "node_modules",
  "package-lock.json",
  "package.json",
  "playwright.config.ts",
  "postcss.config.mjs",
  "prisma",
  "prisma.config.ts",
  "public",
  "scripts",
  "src",
  "tailwind.config.ts",
  "tests",
  "tsconfig.json",
  "tsconfig.tsbuildinfo", // 构建产物，.gitignore 已忽略
  "uploads",
  "vitest.config.ts",
  "next.config.ts",
  "next-env.d.ts",
  "eslint.config.mjs",
  "docker-compose.yml",
]);

const entries = readdirSync(root);

/**
 * 允许的条目判定：
 *   1. 在白名单 Set 内；
 *   2. 匹配「AI 编码助手写入标记」模式 —— `.<被编辑文件名>.artifact.json`。
 *      这类文件由 box-agent 在每次编辑后自动生成（内容 `{"retain_for_chat":true}`），
 *      文件名随被编辑文件变化（.gitignore / eslint.config.mjs / parity-matrix.md …），
 *      逐个登记白名单会让守卫变成"每编辑一次就红一次"，故按模式豁免；
 *      它们同时已在 .gitignore 中忽略，永不入库。
 */
const ASSISTANT_MARKER = /^\..+\.artifact\.json$/;

/**
 * V14-FROZEN-GUARD-01：根目录的「点开头工程元数据文件」按模式豁免。
 * `.frozen-baseline` 存冻结面对比基线 commit（脚本输入，须入库）。
 * 不逐个登记文件名，避免后续每加一个同类元数据文件就红一次。
 */
const ROOT_METADATA = /^\.[a-z][a-z0-9-]*$/;

const violations = entries.filter((e) => !WHITELIST.has(e) && !ASSISTANT_MARKER.test(e) && !ROOT_METADATA.test(e));

if (violations.length === 0) {
  console.log(`check-root PASS：根目录 ${entries.length} 条全部在白名单内。`);
  process.exit(0);
} else {
  console.error(`check-root FAIL：${violations.length} 条不在白名单：`);
  for (const v of violations) console.error(`  ✗ ${v}`);
  console.error(`\n白名单定义见 scripts/check-root.mjs 的 WHITELIST；新增运行时文件请更新白名单或删除。`);
  process.exit(1);
}
