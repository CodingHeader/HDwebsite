/**
 * import-main-content.mjs（P02）：把 main 分支 sqlite 的"前台内容"导入 upgrade 本地库，
 * 用于前台视觉对比（同一份数据下 main vs upgrade 截图 ≤1%）与本地演示。
 *
 * 用法：
 *   node scripts/import-main-content.mjs --source ../hdw-main/prisma/dev.db            # dry-run（默认，只打印计数）
 *   node scripts/import-main-content.mjs --source ../hdw-main/prisma/dev.db --apply    # 写入
 *   可选：--target <upgrade 库路径>（默认 DATABASE_URL 或 prisma/dev.db）；--no-news（不导入 News）
 *
 * 口径：
 * - 内容表"整表替换"（先清空再按 main 原 id 写入）→ 天然幂等，重复执行结果一致；
 *   覆盖：Category/Tag/Article/ArticleTag/Banner/HomeCard/HotMajor/Partner/Campus/CampusImage/
 *         Gallery/ServiceGuide/Course/Navigation。
 * - 列取交集；upgrade 新增的非空列补默认（updatedAt=createdAt、Article.channel=info、contentType=html）。
 * - News → Article(channel=news, contentType=html)，id 固定为 100000+News.id（幂等、不撞 main Article id）。
 * - Article.authorId：main 作者在 upgrade 不存在时回落到 upgrade 第一个用户（不导入/不改动 User 凭据）。
 * - ChatScene（前台 /apply 场景文案）：按 code upsert（保留 upgrade 独有场景如 faq，不改其 id）。
 * - Setting：按 key upsert（不清表，保留 upgrade 的加密/新分组配置）；旧点分 key 先按
 *   scripts/migrate-setting-keys.mjs 的 KEY_MAP 映射为扁平 key（已存在扁平 key 时以 main 扁平值为准）。
 * - apply 前自动备份目标库到 backups/<db>.pre-import-main-<时间戳>（backups/ 已 gitignore）。
 */
import { createClient } from "@libsql/client";
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// 与 scripts/migrate-setting-keys.mjs 保持一致（旧点分 key → Registry 扁平 key）
const KEY_MAP = {
  "site.title": "siteName",
  "site.description": "siteDescription",
  "site.logo": "siteLogo",
  "school.full_name": "schoolFullName",
  "school.full-name": "schoolFullName",
  "school.short_name": "schoolShortName",
  "school.short-name": "schoolShortName",
  "contact.phone": "contactPhone",
  "contact.phone1": "contactPhone1",
  "contact.phone2": "contactPhone2",
  "contact.email": "contactEmail",
  "contact.address": "address",
  "seo.title": "seoTitle",
  "seo.keywords": "seoKeywords",
  "seo.description": "seoDescription",
  "site.icp": "icp",
  "contact.worktime": "workHours",
};

// 依赖顺序（父 → 子）；删除时逆序
const TABLES = [
  "Category",
  "Tag",
  "Article",
  "ArticleTag",
  "Banner",
  "HomeCard",
  "HotMajor",
  "Partner",
  "Campus",
  "CampusImage",
  "Gallery",
  "ServiceGuide",
  "Course",
  "Navigation",
];

function parseArgs(argv) {
  const get = (flag) => {
    const i = argv.indexOf(flag);
    return i >= 0 ? argv[i + 1] : undefined;
  };
  return {
    source: get("--source"),
    target: get("--target"),
    apply: argv.includes("--apply"),
    news: !argv.includes("--no-news"),
  };
}

function resolveDb(p) {
  if (!p) return null;
  if (p.startsWith("file:")) p = p.slice(5);
  return path.isAbsolute(p) ? p : path.resolve(process.cwd(), p);
}

async function columns(db, table) {
  const rows = (await db.execute(`PRAGMA table_info("${table}")`)).rows;
  return rows.map((r) => ({
    name: String(r.name),
    notnull: Number(r.notnull) === 1,
    dflt: r.dflt_value,
    pk: Number(r.pk) > 0,
  }));
}

async function tableExists(db, table) {
  const r = await db.execute({
    sql: "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
    args: [table],
  });
  return r.rows.length > 0;
}

/** 为 upgrade 独有的非空无默认列补值 */
function fillRequired(table, row, targetCols, ctx) {
  const out = { ...row };
  for (const c of targetCols) {
    if (c.name in out && out[c.name] !== null && out[c.name] !== undefined) continue;
    if (!c.notnull || c.dflt !== null || c.pk) continue;
    if (c.name === "updatedAt") out.updatedAt = row.createdAt ?? ctx.now;
    else if (c.name === "createdAt") out.createdAt = ctx.now;
    else if (c.name === "slug") out.slug = `${table.toLowerCase()}-${row.id}`;
    else if (c.name === "authorId") out.authorId = ctx.fallbackAuthorId;
  }
  if (table === "Article" && out.authorId != null && !ctx.userIds.has(Number(out.authorId))) {
    out.authorId = ctx.fallbackAuthorId;
  }
  return out;
}

export async function importMainContent({ source, target, apply = false, news = true, log = console.log }) {
  const src = createClient({ url: `file:${source}` });
  const dst = createClient({ url: `file:${target}` });
  const ctx = { now: new Date().toISOString().replace("Z", "+00:00"), userIds: new Set(), fallbackAuthorId: 1 };
  const users = (await dst.execute("SELECT id FROM User ORDER BY id")).rows.map((r) => Number(r.id));
  ctx.userIds = new Set(users);
  if (users.length) ctx.fallbackAuthorId = users[0];

  const plan = [];
  for (const table of TABLES) {
    if (!(await tableExists(src, table)) || !(await tableExists(dst, table))) {
      plan.push({ table, rows: [], cols: [], skipped: true });
      continue;
    }
    const srcCols = (await columns(src, table)).map((c) => c.name);
    const dstCols = await columns(dst, table);
    const common = dstCols.filter((c) => srcCols.includes(c.name));
    const rows = (await src.execute(`SELECT * FROM "${table}" ORDER BY rowid`)).rows.map((r) => {
      const base = {};
      for (const c of common) base[c.name] = r[c.name];
      return fillRequired(table, base, dstCols, ctx);
    });
    plan.push({ table, rows, cols: dstCols });
  }

  // News → Article(channel=news)
  if (news && (await tableExists(src, "News"))) {
    const articlePlan = plan.find((p) => p.table === "Article");
    const usedSlugs = new Set(articlePlan.rows.map((r) => String(r.slug)));
    const newsRows = (await src.execute("SELECT * FROM News ORDER BY id")).rows;
    for (const n of newsRows) {
      let slug = `news-${n.id}`;
      while (usedSlugs.has(slug)) slug = `${slug}-x`;
      usedSlugs.add(slug);
      articlePlan.rows.push(
        fillRequired(
          "Article",
          {
            id: 100000 + Number(n.id),
            title: n.title,
            slug,
            content: n.content ?? "",
            contentType: "html",
            channel: "news",
            coverImage: n.cover ?? null,
            authorId: ctx.fallbackAuthorId,
            status: n.status,
            viewCount: n.views ?? 0,
            publishedAt: n.createdAt,
            createdAt: n.createdAt,
            updatedAt: n.updatedAt ?? n.createdAt,
          },
          articlePlan.cols,
          ctx
        )
      );
    }
  }

  // ChatScene（upsert by code）
  let scenes = [];
  if ((await tableExists(src, "ChatScene")) && (await tableExists(dst, "ChatScene"))) {
    const srcCols = (await columns(src, "ChatScene")).map((c) => c.name);
    const dstCols = await columns(dst, "ChatScene");
    const common = dstCols.filter((c) => srcCols.includes(c.name) && c.name !== "id");
    scenes = (await src.execute("SELECT * FROM ChatScene ORDER BY id")).rows.map((r) => {
      const base = {};
      for (const c of common) base[c.name] = r[c.name];
      return fillRequired("ChatScene", base, dstCols, ctx);
    });
  }

  // Setting（upsert by key）
  const settingRows = (await tableExists(src, "Setting"))
    ? (await src.execute("SELECT key, value, type, `group`, description, isPublic FROM Setting")).rows
    : [];
  const flat = new Map();
  for (const r of settingRows) {
    const k = String(r.key);
    if (!KEY_MAP[k]) flat.set(k, r);
  }
  for (const r of settingRows) {
    const mapped = KEY_MAP[String(r.key)];
    if (mapped && !flat.has(mapped)) flat.set(mapped, { ...r, key: mapped });
  }

  for (const p of plan) {
    log(`${apply ? "[apply]" : "[dry-run]"} ${p.table.padEnd(13)} ${p.skipped ? "跳过（表不存在）" : `${p.rows.length} 行（整表替换）`}`);
  }
  log(`${apply ? "[apply]" : "[dry-run]"} ChatScene     ${scenes.length} 个场景（按 code upsert）`);
  log(`${apply ? "[apply]" : "[dry-run]"} Setting       ${flat.size} 个 key（upsert，旧点分 key 已映射）`);

  if (!apply) {
    log("dry-run 结束：未写入。加 --apply 执行。");
    return { plan, settings: flat.size, scenes: scenes.length };
  }

  // PRAGMA foreign_keys 在事务内无效，须在 BEGIN 之前设置（同一本地连接）
  await dst.execute("PRAGMA foreign_keys=OFF");
  await dst.execute("BEGIN IMMEDIATE");
  const tx = dst;
  try {
    for (const p of [...plan].reverse()) {
      if (!p.skipped) await tx.execute(`DELETE FROM "${p.table}"`);
    }
    for (const p of plan) {
      if (p.skipped) continue;
      for (const row of p.rows) {
        const keys = Object.keys(row);
        await tx.execute({
          sql: `INSERT INTO "${p.table}" (${keys.map((k) => `"${k}"`).join(",")}) VALUES (${keys.map(() => "?").join(",")})`,
          args: keys.map((k) => row[k] ?? null),
        });
      }
    }
    for (const sc of scenes) {
      const keys = Object.keys(sc).filter((k) => k !== "code");
      const upd = await tx.execute({
        sql: `UPDATE ChatScene SET ${keys.map((k) => `"${k}"=?`).join(",")} WHERE code=?`,
        args: [...keys.map((k) => sc[k] ?? null), sc.code],
      });
      if (upd.rowsAffected === 0) {
        const all = Object.keys(sc);
        await tx.execute({
          sql: `INSERT INTO ChatScene (${all.map((k) => `"${k}"`).join(",")}) VALUES (${all.map(() => "?").join(",")})`,
          args: all.map((k) => sc[k] ?? null),
        });
      }
    }
    for (const r of flat.values()) {
      await tx.execute({
        sql: "INSERT INTO Setting (key, value, type, `group`, description, isPublic, isEncrypted, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?) " +
          "ON CONFLICT(key) DO UPDATE SET value=excluded.value WHERE Setting.isEncrypted = 0",
        args: [String(r.key), r.value ?? null, String(r.type ?? "string"), String(r.group ?? "site"), r.description ?? null, r.isPublic ?? 1, ctx.now, ctx.now],
      });
    }
    await dst.execute("COMMIT");
  } catch (e) {
    await dst.execute("ROLLBACK");
    throw e;
  } finally {
    await dst.execute("PRAGMA foreign_keys=ON");
  }
  log("导入完成。");
  return { plan, settings: flat.size, scenes: scenes.length };
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const args = parseArgs(process.argv.slice(2));
  const source = resolveDb(args.source);
  const target = resolveDb(args.target ?? process.env.DATABASE_URL ?? "prisma/dev.db");
  if (!source) {
    console.log("用法：node scripts/import-main-content.mjs --source <main dev.db> [--target <upgrade dev.db>] [--apply] [--no-news]");
    process.exit(1);
  }
  for (const [label, p] of [["source", source], ["target", target]]) {
    if (!existsSync(p)) {
      console.error(`${label} 数据库不存在：${p}`);
      process.exit(1);
    }
  }
  if (args.apply) {
    // 备份落 backups/（已 gitignore），避免在 prisma/ 下留下可被误提交的库文件
    const backupDir = path.resolve(process.cwd(), "backups");
    mkdirSync(backupDir, { recursive: true });
    const backupPath = path.join(backupDir, `${path.basename(target)}.pre-import-main-${Date.now()}`);
    copyFileSync(target, backupPath);
    console.log(`已备份目标库 → ${backupPath}`);
  }
  await importMainContent({ source, target, apply: args.apply, news: args.news });
}
