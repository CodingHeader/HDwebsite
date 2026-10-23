/**
 * 微信公众号冒烟脚本（V8-INT-01）
 *
 * 走真实发布链路的关键 4 步：
 *   1. 取 access_token（`/cgi-bin/token`）
 *   2. 上传正文外链图（`/cgi-bin/media/uploadimg`，B-07 的正文图转存）
 *   3. 建草稿（`/cgi-bin/draft/add`）
 *   4. 发布（`/cgi-bin/freepublish/submit`）
 *
 * 默认 dry-run：只打印请求摘要，**不出网**（断网也能跑）。
 * `--live` 才真正调用微信 API。
 *
 * 凭证来源：数据库 `WechatAccount`（appid + appSecret，appSecret 可能 `v1:` 加密），
 * 与运行时一致。**不从 env 读**——否则跑通也证明不了线上可用。
 *
 * 退出码：0 成功 / 1 断言失败 / 2 网络错误 / 3 缺凭证
 *
 * 用法：
 *   node scripts/smoke/wechat.mjs            # dry-run
 *   node scripts/smoke/wechat.mjs --live     # 真实调用（需要有效凭证 + 白名单 IP）
 */
import { EXIT, exitMissingCreds, isLive, mask, openDb, pretend, step } from "./_shared.mjs";

const STEP_TOTAL = 4;
const API = "https://api.weixin.qq.com/cgi-bin";

const db = openDb();

async function main() {
  console.log("== 微信公众号冒烟 ==");
  console.log(`模式：${isLive() ? "LIVE（会真实调用微信 API）" : "dry-run（不出网）"}`);

  // ── 前置：取账号 ──
  const account = await db.wechatAccount.findFirst({
    where: { status: "active" },
    orderBy: { id: "asc" },
  });

  const missing = [];
  if (!account) missing.push("WechatAccount（status=active 的公众号账号）");
  else {
    if (!account.appid) missing.push("WechatAccount.appid");
    if (!account.appSecret) missing.push("WechatAccount.appSecret");
  }
  if (missing.length) {
    exitMissingCreds(missing, [
      "在「管理后台 → 公众号账号」新增一条：名称 + AppID + AppSecret，状态设为启用",
      "AppSecret 保存后由 crypto 加密存储（v1: 前缀），脚本会自动解密",
      "真实调用还需把本机公网 IP 加入微信后台的 IP 白名单",
    ]);
  }

  // 解密 appSecret（与 src/lib/wechat.ts:getWechatAccountSecret 同逻辑）
  let secret = account.appSecret;
  if (secret.startsWith("v1:")) {
    const { decryptField } = await import("../../src/lib/crypto.ts").catch(() => ({ decryptField: null }));
    if (!decryptField) {
      console.error("\n✗ appSecret 是加密存储的，但无法加载解密模块 —— 请用 `npx tsx scripts/smoke/wechat.mjs` 运行");
      process.exit(EXIT.ASSERT);
    }
    secret = decryptField(secret) ?? "";
  }
  if (!secret) exitMissingCreds(["WechatAccount.appSecret（解密失败）"], ["重新保存一次 AppSecret"]);

  console.log(`  账号：${account.name}（appid=${mask(account.appid)}）`);
  console.log(`  appSecret：${mask(secret)}`);

  // ── 1. access_token ──
  step(1, STEP_TOTAL, "获取 access_token");
  const tokenUrl = `${API}/token?grant_type=client_credential&appid=${account.appid}&secret=***`;
  pretend("GET", tokenUrl);

  let accessToken = null;
  if (isLive()) {
    const url = `${API}/token?grant_type=client_credential&appid=${encodeURIComponent(account.appid)}&secret=${encodeURIComponent(secret)}`;
    const res = await fetch(url);
    const body = await res.json();
    if (!body.access_token) {
      console.error(`  ✗ 获取失败：errcode=${body.errcode} errmsg=${body.errmsg}`);
      console.error("    常见原因：IP 不在白名单（40164）／AppSecret 错误（40125）／账号未认证");
      process.exit(EXIT.ASSERT);
    }
    accessToken = body.access_token;
    console.log(`  ✓ access_token=${mask(accessToken)}  expires_in=${body.expires_in}s`);
  }

  // ── 2. uploadimg（正文外链图转存）──
  step(2, STEP_TOTAL, "上传正文图（uploadimg）");
  const uploadUrl = `${API}/media/uploadimg?access_token=***`;
  pretend("POST", uploadUrl, "(multipart: 1 张 16x16 PNG)");

  let uploadedUrl = null;
  if (isLive()) {
    // 生成一张最小 PNG（与 seed-visual 同款手写编码，无第三方依赖）
    const { buildTinyPng } = await import("./_png.mjs");
    const png = buildTinyPng();
    const form = new FormData();
    form.append("media", new Blob([png], { type: "image/png" }), "smoke.png");
    const res = await fetch(`${API}/media/uploadimg?access_token=${encodeURIComponent(accessToken)}`, {
      method: "POST",
      body: form,
    });
    const body = await res.json();
    if (!body.url) {
      console.error(`  ✗ 上传失败：errcode=${body.errcode} errmsg=${body.errmsg}`);
      process.exit(EXIT.ASSERT);
    }
    uploadedUrl = body.url;
    console.log(`  ✓ 得到正文图 URL：${uploadedUrl}`);
  }

  // ── 3. draft/add ──
  step(3, STEP_TOTAL, "创建草稿（draft/add）");
  const draftBody = {
    articles: [
      {
        title: "【冒烟测试】请忽略",
        author: "HDwebsite",
        digest: "V8-INT-01 连通性验证，可删除",
        content: `<p>这是一条冒烟测试。</p><p><img src="${uploadedUrl ?? "https://example.com/smoke.png"}"/></p>`,
        content_source_url: process.env.APP_ORIGIN || "https://example.com",
        need_open_comment: 0,
        only_fans_can_comment: 0,
      },
    ],
  };
  pretend("POST", `${API}/draft/add?access_token=***`, draftBody);

  let mediaId = null;
  if (isLive()) {
    const res = await fetch(`${API}/draft/add?access_token=${encodeURIComponent(accessToken)}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(draftBody),
    });
    const body = await res.json();
    if (!body.media_id) {
      console.error(`  ✗ 建草稿失败：errcode=${body.errcode} errmsg=${body.errmsg}`);
      process.exit(EXIT.ASSERT);
    }
    mediaId = body.media_id;
    console.log(`  ✓ media_id=${mask(mediaId)}`);
  }

  // ── 4. freepublish/submit ──
  step(4, STEP_TOTAL, "提交发布（freepublish/submit）");
  pretend("POST", `${API}/freepublish/submit?access_token=***`, { media_id: mediaId ?? "<上一步的 media_id>" });

  if (isLive()) {
    const res = await fetch(`${API}/freepublish/submit?access_token=${encodeURIComponent(accessToken)}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ media_id: mediaId }),
    });
    const body = await res.json();
    if (!body.publish_id) {
      console.error(`  ✗ 发布失败：errcode=${body.errcode} errmsg=${body.errmsg}`);
      process.exit(EXIT.ASSERT);
    }
    console.log(`  ✓ publish_id=${mask(body.publish_id)}`);
    console.log("    提示：发布是异步的，可用 freepublish/get 查状态；本条测试稿请到后台删除");
  }

  console.log("\n✓ 冒烟完成");
  await db.$disconnect();
}

main().catch(async (e) => {
  console.error("\n✗ 网络/协议错误：", e instanceof Error ? e.message : e);
  await db.$disconnect().catch(() => {});
  process.exit(EXIT.NETWORK);
});
