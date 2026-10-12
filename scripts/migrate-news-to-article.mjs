/**
 * News → Article 数据迁移（ADR-001，DEP-014 编排进 S1）
 * 用法：
 *   node scripts/migrate-news-to-article.mjs --db <旧库路径>              # dry-run（默认）
 *   node scripts/migrate-news-to-article.mjs --db <旧库路径> --apply      # 执行迁移
 *   node scripts/migrate-news-to-article.mjs --rollback <报告.json>       # 回滚
 * 口径：News → Article(channel=news, contentType=html)；保留 id/时间/浏览量；
 *       id 冲突则跳过并计数；执行后输出报告 JSON（含迁移 id 清单，供回滚）。
 * 安全：默认 dry-run 不写库；--apply 前自动复制库文件为 .pre-news-migrate 备份。
 */
import { createClient } from "@libsql/client";
import { copyFileSync, existsSync, readFileSync, writeFileSync, unlinkSync } from "node:fs";
import path from "node:path";

function parseArgs() {
  const args = process.argv.slice(2);
  const get = (flag) => {
    const i = args.indexOf(flag);
    return i >= 0 ? args[i + 1] : null;
  };
  return {
    db: get("--db"),
    rollback: get("--rollback"),
    apply: args.includes("--apply"),
  };
}

function resolveDbUrl(p) {
  const abs = path.isAbsolute(p) ? p : path.resolve(process.cwd(), p);
  if (!existsSync(abs)) {
    console.error(`数据库文件不存在：${abs}`);
    process.exit(1);
  }
  return abs;
}

async function migrate(dbPath) {
  const db = createClient({ url: `file:${dbPath}` });
  const backupPath = `${dbPath}.pre-news-migrate`;
  copyFileSync(dbPath, backupPath);
  console.log(`已备份数据库 → ${backupPath}`);

  const newsRows = await db.execute("SELECT id, title, content, cover, views, status, createdAt, updatedAt FROM News ORDER BY id");
  const existingArticles = await db.execute("SELECT id FROM Article");
  const existingIds = new Set(existingArticles.rows.map((r) => Number(r.id)));
  const admin = await db.execute("SELECT id FROM User ORDER BY id LIMIT 1");
  const authorId = admin.rows[0] ? Number(admin.rows[0].id) : 1;

  // News → Article 的 slug 化（与 lib/slug 同口径）
  const slugify = (title) => {
    const base = String(title).toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 100).replace(/-+$/g, "");
    return base || `news-${Date.now()}`;
  };

  const migratedIds = [];
  const skipped = [];
  const usedSlugs = new Set(
    (await db.execute("SELECT slug FROM Article")).rows.map((r) => String(r.slug))
  );

  for (const row of newsRows.rows) {
    const id = Number(row.id);
    if (existingIds.has(id)) {
      skipped.push({ id, reason: "article-id-conflict" });
      continue;
    }
    let slug = slugify(row.title);
    if (usedSlugs.has(slug) || !slug) slug = `news-${id}-${slug || "item"}`;
    let n = 2;
    while (usedSlugs.has(slug)) slug = `${slugify(row.title)}-${n++}`;
    usedSlugs.add(slug);

    const publishedAt = row.updatedAt ?? row.createdAt ?? new Date().toISOString();
    await db.execute({
      sql: `INSERT INTO Article (title, slug, content, contentType, channel, excerpt, coverImage, authorId, status, viewCount, publishedAt, createdAt, updatedAt)
            VALUES (?, ?, ?, 'html', 'news', NULL, ?, ?, ?, ?, ?, ?, ?)`,
      args: [String(row.title), slug, String(row.content ?? ""), row.cover ? String(row.cover) : null,
             authorId, "published", Number(row.views ?? 0), publishedAt, publishedAt, publishedAt],
    });
    migratedIds.push(id);
  }

  const before = { news: newsRows.rows.length, article: existingArticles.rows.length };
  const after = await db.execute("SELECT COUNT(*) AS c FROM Article");
  const afterNewsChannel = await db.execute("SELECT COUNT(*) AS c FROM Article WHERE channel='news'");
  const afterInfoChannel = await db.execute("SELECT COUNT(*) AS c FROM Article WHERE channel='info'");

  const report = {
    migratedAt: new Date().toISOString(),
    sourceDb: dbPath,
    mode: "apply",
    before,
    after: {
      articleTotal: Number(after.rows[0].c),
      newsChannel: Number(afterNewsChannel.rows[0].c),
      infoChannel: Number(afterInfoChannel.rows[0].c),
    },
    migratedIds,
    skipped,
    rollback: `node scripts/migrate-news-to-article.mjs --rollback <本报告路径>`,
  };
  const reportPath = path.resolve(process.cwd(), `backups/news-migrate-report-${Date.now()}.json`);
  writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log("迁移完成：", JSON.stringify(report, null, 2));
  console.log(`报告已写入：${reportPath}`);
  console.log(`News 表保留为只读（一个版本），确认无误后可下线（ADR-001）。`);
}

async function rollback(reportPath) {
  const report = JSON.parse(readFileSync(reportPath, "utf8"));
  if (!Array.isArray(report.migratedIds)) {
    console.error("报告格式错误：缺少 migratedIds");
    process.exit(1);
  }
  const db = createClient({ url: `file:${resolveDbUrl(report.sourceDb)}` });
  let removed = 0;
  for (const id of report.migratedIds) {
    const res = await db.execute({ sql: "DELETE FROM Article WHERE id=? AND channel='news'", args: [id] });
    removed += res.rowsAffected;
  }
  console.log(`回滚完成：删除 ${removed}/${report.migratedIds.length} 条迁移文章。`);
  unlinkSync(reportPath);
  console.log("已删除报告文件（回滚一次性）。");
}

async function dryRun(dbPath) {
  const db = createClient({ url: `file:${dbPath}` });
  const newsCount = await db.execute("SELECT COUNT(*) AS c FROM News");
  const articleCount = await db.execute("SELECT COUNT(*) AS c FROM Article");
  const sample = await db.execute("SELECT id, title, views, status FROM News ORDER BY id LIMIT 5");
  // P04：dry-run 先校验目标库是否为 upgrade schema（apply 需 Article.channel/contentType 列）。
  // main@94dbbbb 原库无这些列 → apply 必失败；main 存量应走 scripts/import-main-content.mjs（News→Article id=100000+News.id）。
  const cols = (await db.execute("PRAGMA table_info(Article)")).rows.map((r) => String(r.name));
  const missingCols = ["channel", "contentType"].filter((c) => !cols.includes(c));
  const ids = (await db.execute("SELECT n.id FROM News n JOIN Article a ON a.id = n.id")).rows.map((r) => Number(r.id));
  const report = {
    mode: "dry-run",
    schemaReady: missingCols.length === 0,
    missingArticleColumns: missingCols,
    idConflicts: ids,
    wouldInsert: Number(newsCount.rows[0].c) - ids.length,
    sourceDb: dbPath,
    newsTotal: Number(newsCount.rows[0].c),
    articleTotal: Number(articleCount.rows[0].c),
    sample: sample.rows,
    note: "dry-run 未写入；--apply 执行迁移（自动备份为 .pre-news-migrate）",
  };
  console.log(JSON.stringify(report, null, 2));
}

const { db, rollback: rollbackPath, apply } = parseArgs();
if (rollbackPath) {
  await rollback(rollbackPath);
} else if (db) {
  const dbPath = resolveDbUrl(db);
  if (apply) await migrate(dbPath);
  else await dryRun(dbPath);
} else {
  console.log("用法：node scripts/migrate-news-to-article.mjs --db <旧库路径> [--apply | --rollback <报告>]");
  process.exit(1);
}
