/**
 * 冒烟脚本公共设施（V8-INT-01）
 *
 * 设计原则（三个脚本共用）：
 *   1. **默认 dry-run，不出网**：只打印将要发的请求摘要（方法/URL/关键字段，密钥一律掩码）。
 *      `--live` 才真正发起网络请求。
 *   2. **缺凭证 → exit 3**：列出**缺哪些键**（不打印值），不抛栈。
 *      退出码约定：0=成功；1=断言失败（连通但结果不符预期）；2=网络/协议错误；3=缺凭证。
 *   3. **凭证来自数据库，不来自 env**：
 *      微信 = WechatAccount.appSecret（可能 `v1:` 加密）、SMTP = Setting(emailHost/emailUsername/emailPassword)、
 *      Coze = LLMProvider(kind=coze).apiKey。这与真实运行时完全一致——
 *      若脚本从 env 读，即使跑通也证明不了"线上能用"。
 *   4. **不硬编码任何密钥**：CI 的 secret scan 必须通过。
 */
import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

export const EXIT = { OK: 0, ASSERT: 1, NETWORK: 2, MISSING_CREDS: 3 };

/** 是否是 live 模式 */
export const isLive = () => process.argv.includes("--live");

/** 掩码：只留前 4 位与长度，绝不打印原值 */
export function mask(s) {
  if (!s) return "(空)";
  const str = String(s);
  if (str.length <= 8) return `${"*".repeat(str.length)}（len=${str.length}）`;
  return `${str.slice(0, 4)}${"*".repeat(Math.max(4, str.length - 8))}${str.slice(-4)}（len=${str.length}）`;
}

/** 创建 DB 客户端（与运行时同一套 adapter） */
export function openDb() {
  const url = process.env.DATABASE_URL || "file:./prisma/dev.db";
  return new PrismaClient({ adapter: new PrismaLibSql({ url }) });
}

/**
 * 缺凭证的统一出口：打印缺失键清单后 exit 3。
 * @param {string[]} missing 缺失项名称（人可读，如 "WechatAccount.appSecret"）
 * @param {string[]} hints 补齐方式提示
 */
export function exitMissingCreds(missing, hints = []) {
  console.error("\n✗ 缺少必需凭证，无法执行（退出码 3）");
  console.error("  缺少：");
  for (const m of missing) console.error(`    - ${m}`);
  if (hints.length) {
    console.error("\n  补齐方式：");
    for (const h of hints) console.error(`    · ${h}`);
  }
  console.error("\n  提示：本脚本默认 dry-run（不出网）；凭证到位后加 --live 才真正调用。");
  process.exit(EXIT.MISSING_CREDS);
}

/** 统一的步骤日志 */
export function step(n, total, text) {
  console.log(`\n[${n}/${total}] ${text}`);
}

/** dry-run 时打印请求摘要 */
export function pretend(method, url, body) {
  console.log(`  [dry-run] ${method} ${url}`);
  if (body !== undefined) {
    const s = typeof body === "string" ? body : JSON.stringify(body);
    console.log(`  [dry-run] body: ${s.length > 300 ? s.slice(0, 300) + "…" : s}`);
  }
}
