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
import { join } from "node:path";

const root = process.cwd();

/** 根目录污染守卫：只允许白名单内的条目 */
const WHITELIST = new Set([
  // 工程文件
  ".dockerignore",
  ".env",
  ".env.example",
  ".env.local",
  ".git",
  ".github", // D-13：CI workflow（工程文件）
  ".gitattributes",
  ".gitignore",
  ".box-agent",
  ".box-agent-scratch",
  // AI 编码助手（box-agent / openclaw）的运行时档案，非项目交付物；
  // 由工具在会话启动时写入根目录，无法通过配置改路径。按「存疑文件不删」保留，登记为白名单。
  ".openclaw",
  "IDENTITY.md",
  "USER.md",
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
const violations = entries.filter((e) => !WHITELIST.has(e));

if (violations.length === 0) {
  console.log(`check-root PASS：根目录 ${entries.length} 条全部在白名单内。`);
  process.exit(0);
} else {
  console.error(`check-root FAIL：${violations.length} 条不在白名单：`);
  for (const v of violations) console.error(`  ✗ ${v}`);
  console.error(`\n白名单定义见 scripts/check-root.mjs 的 WHITELIST；新增运行时文件请更新白名单或删除。`);
  process.exit(1);
}