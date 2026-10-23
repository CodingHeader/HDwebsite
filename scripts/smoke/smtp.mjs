/**
 * SMTP 冒烟脚本（V8-INT-01）
 *
 * 做两件事：
 *   1. 连接 + 认证（`transporter.verify()`）
 *   2. 发 1 封测试邮件到 `SMOKE_TO`（收件人由环境变量指定，**不从 DB 猜**）
 *
 * 默认 dry-run：只打印将要连接的 host/port 与收件人，**不出网**。
 * `--live` 才真正连接并发信。
 *
 * 凭证来源：数据库 `Setting`（emailHost / emailPort / emailSecure / emailUsername / emailPassword），
 * 与运行时 `notify-gateway` 完全一致。
 *
 * 退出码：0 成功 / 1 断言失败 / 2 网络错误 / 3 缺凭证
 *
 * 用法：
 *   node scripts/smoke/smtp.mjs                 # dry-run
 *   SMOKE_TO=you@example.com node scripts/smoke/smtp.mjs --live
 */
import { EXIT, exitMissingCreds, isLive, mask, openDb, pretend, step } from "./_shared.mjs";

const STEP_TOTAL = 2;
const db = openDb();

async function main() {
  console.log("== SMTP 冒烟 ==");
  console.log(`模式：${isLive() ? "LIVE（会真实连接并发信）" : "dry-run（不出网）"}`);

  // ── 前置：读设置 ──
  const keys = ["emailHost", "emailPort", "emailSecure", "emailUsername", "emailPassword"];
  const rows = await db.setting.findMany({ where: { key: { in: keys } } });
  const m = Object.fromEntries(rows.map((r) => [r.key, r.value]));

  const missing = [];
  if (!m.emailHost) missing.push("Setting.emailHost");
  if (!m.emailUsername) missing.push("Setting.emailUsername");
  if (!m.emailPassword) missing.push("Setting.emailPassword");
  const to = process.env.SMOKE_TO || "";
  if (!to) missing.push("环境变量 SMOKE_TO（测试收件人邮箱）");

  if (missing.length) {
    exitMissingCreds(missing, [
      "在「管理后台 → 站点设置 → 邮件」填写：服务器地址 / 端口 / 是否 SSL / 账号 / 密码（或授权码）",
      "密码保存后加密存储，脚本会自动解密",
      "运行时指定收件人：SMOKE_TO=you@example.com node scripts/smoke/smtp.mjs --live",
    ]);
  }

  const port = Number(m.emailPort || 465);
  const secure = m.emailSecure !== "false";

  console.log(`  host=${m.emailHost}:${port}  secure=${secure}`);
  console.log(`  user=${mask(m.emailUsername)}  pass=${mask(m.emailPassword)}`);
  console.log(`  收件人=${to}`);

  // ── 1. 连接 + 认证 ──
  step(1, STEP_TOTAL, "连接并认证（verify）");
  pretend("SMTP", `${secure ? "smtps" : "smtp"}://${m.emailHost}:${port}`, "AUTH + NOOP");

  if (isLive()) {
    const nodemailer = (await import("nodemailer")).default;
    let password = m.emailPassword;
    if (password.startsWith("v1:")) {
      const { decryptField } = await import("../../src/lib/crypto.ts").catch(() => ({ decryptField: null }));
      if (!decryptField) {
        console.error("\n✗ 密码是加密存储的，但无法加载解密模块 —— 请用 `npx tsx scripts/smoke/smtp.mjs` 运行");
        process.exit(EXIT.ASSERT);
      }
      password = decryptField(password) ?? "";
    }
    const transporter = nodemailer.createTransport({
      host: m.emailHost,
      port,
      secure,
      auth: { user: m.emailUsername, pass: password },
      connectionTimeout: 10_000,
    });
    try {
      await transporter.verify();
      console.log("  ✓ 连接与认证成功");
    } catch (e) {
      console.error(`  ✗ 连接失败：${e instanceof Error ? e.message : e}`);
      console.error("    常见原因：端口被封（25/465/587）／授权码而非登录密码／需要 STARTTLS");
      process.exit(EXIT.ASSERT);
    }

    // ── 2. 发信 ──
    step(2, STEP_TOTAL, `发送测试邮件到 ${to}`);
    try {
      const info = await transporter.sendMail({
        from: m.emailFrom || m.emailUsername,
        to,
        subject: "【冒烟测试】HDwebsite SMTP 连通性验证",
        text: `这是一封冒烟测试邮件，由 V8-INT-01 脚本发出。\n时间：${new Date().toISOString()}\n收到即说明 SMTP 链路可用，可删除本邮件。`,
      });
      console.log(`  ✓ 已发送：messageId=${mask(info.messageId)}`);
    } catch (e) {
      console.error(`  ✗ 发信失败：${e instanceof Error ? e.message : e}`);
      process.exit(EXIT.ASSERT);
    }
  } else {
    step(2, STEP_TOTAL, `发送测试邮件到 ${to}（dry-run 跳过）`);
    pretend("SMTP", "MAIL FROM / RCPT TO / DATA", { to, subject: "【冒烟测试】HDwebsite SMTP 连通性验证" });
  }

  console.log("\n✓ 冒烟完成");
  await db.$disconnect();
}

main().catch(async (e) => {
  console.error("\n✗ 网络/协议错误：", e instanceof Error ? e.message : e);
  await db.$disconnect().catch(() => {});
  process.exit(EXIT.NETWORK);
});
