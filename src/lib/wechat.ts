/**
 * 公众号对接模块（SOL-006，ADR-002/013：按官方 API 全量设计开发，凭证后补即插桩生效）
 * - access_token：/cgi-bin/token 缓存 7200s 过期前 5min 刷新（tokenCache JSON-in-String）
 * - 服务器回调验签：node:crypto sha1 排序（GET echostr / POST XML 事件分发）
 * - 发布：图片转永久素材 → 正文外链图转存(uploadimg) → draft/add → freepublish/submit + get 轮询
 *   （频控 ≥60s、每日上限默认 20；节流抛 ChannelThrottledError 由 executor 重排期）
 * - AI 客服：5s 内被动回复话术 + 48h 客服消息接口异步补发（ADR-006）；P06 起答案走 chat-service
 *   （账号绑定场景的提示词 + 知识库 + 会话历史 + 场景模型），兜底文案取 Setting wechatFallbackReply
 * 凭证未配置时所有对外调用返回明确 errMsg（不抛裸错），真实联调在 M4。
 */
import crypto from "node:crypto";
import { XMLParser } from "fast-xml-parser";
import { prisma } from "@/lib/prisma";
import { getAllSettings } from "@/lib/settings";
import { appOrigin } from "@/lib/app-origin";
import { chatOnce, findScene } from "@/lib/chat-service";
import { decryptField } from "@/lib/crypto";
import { httpFetch } from "@/lib/http-client";
import { parseJsonField } from "@/lib/json-field";
import { ChannelThrottledError, isThrottledError } from "@/lib/channels/errors";
import type { WechatAccount, ContentItem } from ".prisma/client";

/* eslint-disable @typescript-eslint/no-explicit-any */

const API = "https://api.weixin.qq.com";

// ── 凭证 ─────────────────────────────────────────────────────

export function getWechatAccountSecret(account: WechatAccount): string | null {
  if (account.appSecret.startsWith("v1:")) return decryptField(account.appSecret);
  return account.appSecret;
}

async function getAccessToken(account: WechatAccount, secret: string): Promise<string> {
  const cache = parseTokenCache(account.tokenCache);
  if (cache && cache.expiresAt > Date.now() + 5 * 60_000) return cache.accessToken;
  const res = (await httpFetch(
    `${API}/cgi-bin/token?grant_type=client_credential&appid=${account.appid}&secret=${secret}`,
    { timeoutMs: 10_000, logTag: "wechat", throwOnHttpError: false }
  ).then((r) => r.json())) as { access_token?: string; expires_in?: number; errcode?: number; errmsg?: string };
  if (!res.access_token) throw new Error(`获取 access_token 失败：${res.errcode} ${res.errmsg ?? ""}`);
  await prisma.wechatAccount.update({
    where: { id: account.id },
    data: { tokenCache: JSON.stringify({ accessToken: res.access_token, expiresAt: Date.now() + (res.expires_in ?? 7200) * 1000 }) },
  });
  return res.access_token;
}

function parseTokenCache(json: string | null): { accessToken: string; expiresAt: number } | null {
  const parsed = parseJsonField<{ accessToken?: unknown; expiresAt?: unknown } | null>(json, null);
  if (!parsed || typeof parsed.accessToken !== "string" || typeof parsed.expiresAt !== "number") return null;
  return { accessToken: parsed.accessToken, expiresAt: parsed.expiresAt };
}

// ── 回调验签与事件分发 ────────────────────────────────────────

/** GET /api/wechat/callback：微信服务器 URL 验证（sha1 排序签名） */
export function verifySignature(token: string, signature: string, timestamp: string, nonce: string): boolean {
  const sha1 = crypto.createHash("sha1").update([token, timestamp, nonce].sort().join("")).digest("hex");
  return sha1 === signature;
}

export type WechatIncoming = {
  fromUser: string;
  toUser: string;
  msgType: string;
  content?: string;
  event?: string;
};

export function parseIncomingXml(xml: string): WechatIncoming | null {
  try {
    const parser = new XMLParser({ ignoreAttributes: false });
    const doc = parser.parse(xml) as { xml: Record<string, string> };
    const x = doc.xml;
    if (!x || !x.FromUserName) return null;
    return {
      fromUser: String(x.FromUserName),
      toUser: String(x.ToUserName ?? ""),
      msgType: String(x.MsgType ?? ""),
      content: x.Content ? String(x.Content) : undefined,
      event: x.Event ? String(x.Event) : undefined,
    };
  } catch {
    return null;
  }
}

function replyTextXml(toUser: string, fromUser: string, content: string): string {
  return `<xml><ToUserName><![CDATA[${toUser}]]></ToUserName><FromUserName><![CDATA[${fromUser}]]></FromUserName><CreateTime>${Math.floor(Date.now() / 1000)}</CreateTime><MsgType><![CDATA[text]]></MsgType><Content><![CDATA[${content}]]></Content></xml>`;
}

/**
 * 消息处理（POST body）：
 * - 文本消息 → 两段式（ADR-006）：同步返回话术；异步 llm-gateway 生成答案后 48h 客服消息补发
 * - subscribe 事件 → 欢迎语；其余事件忽略
 */
export async function handleCallback(account: WechatAccount, body: string): Promise<string | null> {
  const incoming = parseIncomingXml(body);
  if (!incoming) return null;
  const secret = getWechatAccountSecret(account);

  if (incoming.msgType === "event") {
    if (incoming.event === "subscribe") {
      const scene = account.sceneId
        ? await prisma.chatScene.findUnique({ where: { id: account.sceneId } })
        : null;
      return replyTextXml(incoming.fromUser, incoming.toUser, scene?.greeting ?? "感谢关注，回复问题即可咨询。");
    }
    return null;
  }
  if (incoming.msgType === "text" && incoming.content && account.aiEnabled) {
    // 被动回复话术（5s 限制内）
    const ack = "正在为您查询，请稍候…（答案将通过客服消息发送）";
    // 异步补发：等待网关结果后经客服消息接口发送
    void (async () => {
      try {
        const answer = await answerWechatText(account, incoming.fromUser, incoming.content!);
        if (!secret) throw new Error("AppSecret 未配置");
        await sendCustomerMessage(account, secret, incoming.fromUser, answer);
      } catch (err) {
        console.error("[wechat] 客服消息补发失败：", err);
      }
    })();
    return replyTextXml(incoming.fromUser, incoming.toUser, ack);
  }
  return null;
}

/**
 * 公众号文本问答（导出供单测）：会话 id = wx:<openid>；场景 = 账号绑定场景（缺省取 code=wechat，再缺省 float）
 * 返回可直接发给用户的文本（超长截断并附官网地址；模型不可用 → Setting 兜底文案）
 */
export async function answerWechatText(account: WechatAccount, openId: string, content: string): Promise<string> {
  const scene =
    (await findScene({ id: account.sceneId })) ?? (await findScene({ code: "wechat" })) ?? (await findScene({ code: "float" }));
  const settings = await getAllSettings();
  const origin = await appOrigin();
  const result = await chatOnce({ scene, sessionId: `wx:${openId}`, channel: "wechat", message: content });
  if (!result.ok) {
    return (settings.wechatFallbackReply || "抱歉，当前咨询繁忙，请稍后再试。")
      .replaceAll("{contactPhone}", settings.contactPhone ?? "")
      .replaceAll("{siteUrl}", origin);
  }
  const max = Math.max(50, Number(settings.wechatReplyMaxLength || 600));
  return result.reply.length > max ? `${result.reply.slice(0, max)}…\n完整回答请访问 ${origin}` : result.reply;
}

async function sendCustomerMessage(account: WechatAccount, secret: string, openId: string, content: string): Promise<void> {
  const token = await getAccessToken(account, secret);
  const res = (await httpFetch(`${API}/cgi-bin/message/custom/send?access_token=${token}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ touser: openId, msgtype: "text", text: { content } }),
    timeoutMs: 10_000,
    logTag: "wechat",
    // 微信业务错误在 HTTP 200 body 的 errcode；非 2xx（如网关 5xx）仍解析 body 由调用方处理
    throwOnHttpError: false,
  }).then((r) => r.json())) as { errcode?: number; errmsg?: string };
  if (res.errcode && res.errcode !== 0) {
    throw new Error(`客服消息发送失败：${res.errcode} ${res.errmsg ?? ""}`);
  }
  await prisma.aIChatHistory.create({
    data: { sessionId: `wx-${openId.slice(-16)}`, channel: "wechat", role: "assistant", message: content, model: "wechat-cs" },
  }).catch(() => undefined);
}

// ── 发布链路：素材 → 草稿 → 发布 ─────────────────────────────

/** 微信正文图片域名（已转存/已合规，无需再转存） */
const WECHAT_IMG_HOSTS = new Set(["mmbiz.qpic.cn", "mmbiz.qlogo.cn"]);
/** 单篇最多转存张数（防失控） */
const MAX_IMG_TRANSFER = 20;
/** 同账号发布最小间隔（毫秒）；持久化于 ContentChannel.publishedAt，跨进程有效 */
const PUBLISH_MIN_INTERVAL_MS = 60_000;

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * 正文外链图转存微信（media/uploadimg，B-07）
 * - 仅接受 ≤1MB 图片；超限直接跳过并记 warning（不阻塞发布，ADR-030 降级原则）
 * - 返回微信 URL；失败/超限返回 null（调用方保留原外链）
 * - 微信要求文件名为 jpg/png，用 magic bytes 判断而非 Content-Type（更可靠）
 */
export async function uploadContentImage(token: string, url: string): Promise<string | null> {
  try {
    const res = await httpFetch(url, { timeoutMs: 15_000, logTag: "wechat", throwOnHttpError: false });
    if (!res.ok) {
      console.warn(`[wechat] uploadimg 源图下载失败（HTTP ${res.status}）：${url.slice(0, 80)}`);
      return null;
    }
    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.length > 1024 * 1024) {
      console.warn(`[wechat] uploadimg 源图 ${(buffer.length / 1024).toFixed(0)}KB 超 1MB 限制，跳过：${url.slice(0, 80)}`);
      return null;
    }
    const sig = buffer.subarray(0, 8);
    const isPng = sig.length >= 8 && sig[0] === 0x89 && sig[1] === 0x50 && sig[2] === 0x4e && sig[3] === 0x47;
    const form = new FormData();
    form.append(
      "media",
      new Blob([new Uint8Array(buffer)]),
      isPng ? "img.png" : "img.jpg"
    );
    const uploaded = (await httpFetch(`${API}/cgi-bin/media/uploadimg?access_token=${token}`, {
      method: "POST",
      body: form,
      timeoutMs: 30_000,
      logTag: "wechat",
      throwOnHttpError: false,
    }).then((r) => r.json())) as { url?: string; errcode?: number; errmsg?: string };
    if (uploaded.errcode && uploaded.errcode !== 0) {
      console.warn(`[wechat] uploadimg 失败：${uploaded.errcode} ${uploaded.errmsg ?? ""}`);
      return null;
    }
    return uploaded.url ?? null;
  } catch (err) {
    console.warn("[wechat] uploadimg 异常：", err instanceof Error ? err.message : err);
    return null;
  }
}

/**
 * 正文外链图转存（B-07）：扫描 <img src>，非微信域名的外链图转存为微信 URL；
 * 同 URL 只转存一次复用；已合规或非外链的 <img> 保留原样；失败保持原外链（降级）。
 */
export async function rewriteWechatImages(content: string, token: string): Promise<string> {
  const srcs = Array.from(content.matchAll(/<img\b[^>]*\bsrc="([^"]+)"[^>]*>/gi), (m) => m[1]);
  const pending = [...new Set(srcs)]
    .filter((u) => {
      try {
        return !WECHAT_IMG_HOSTS.has(new URL(u).hostname);
      } catch {
        return false; // 相对路径/非 URL 一律视为已可访问，不转存
      }
    })
    .slice(0, MAX_IMG_TRANSFER);
  const map = new Map<string, string>();
  for (const u of pending) {
    if (map.has(u)) continue;
    const wechatUrl = await uploadContentImage(token, u);
    if (wechatUrl) map.set(u, wechatUrl);
  }
  if (map.size === 0) return content;
  let out = content;
  for (const [from, to] of map) out = out.split(from).join(to);
  return out;
}

/**
 * freepublish/get 轮询发布结果（B-07）：最多 5 次、指数退避（1s/2s/4s/8s/16s）。
 * 返回 { itemUrl } 成功 / { status: "failed"|"timeout" } / { errMsg } 出错。
 */
export async function getPublishResult(
  token: string,
  publishId: string,
  maxAttempts = 5
): Promise<{ itemUrl?: string; status?: string; errMsg?: string }> {
  for (let i = 0; i < maxAttempts; i++) {
    const res = (await httpFetch(`${API}/cgi-bin/freepublish/get?access_token=${token}&publish_id=${publishId}`, {
      timeoutMs: 15_000,
      logTag: "wechat",
      throwOnHttpError: false,
    }).then((r) => r.json())) as {
      publish_status?: number;
      errcode?: number;
      errmsg?: string;
      publish_task_info?: { article_detail?: { url?: string }[] };
    };
    if (res.errcode && res.errcode !== 0) return { errMsg: `freepublish/get 失败：${res.errcode} ${res.errmsg ?? ""}` };
    // 0=成功 1=发布中 2=原始失败 3=平台审核不通过 4=平台审核失败 5=成功
    const status = res.publish_status;
    if (status === 0 || status === 5) {
      const url = res.publish_task_info?.article_detail?.find((a) => a.url)?.url ?? null;
      return { status: "success", itemUrl: url ?? undefined };
    }
    if (status === 2 || status === 3 || status === 4) {
      return { status: "failed", errMsg: res.errmsg ?? `发布失败（publish_status=${status}）` };
    }
    // 1 = 发布中：指数退避后继续
    if (i < maxAttempts - 1) await sleep(2 ** i * 1000);
  }
  return { status: "timeout", errMsg: `轮询 ${maxAttempts} 次仍未得到发布结果` };
}

export type WechatPublishResult = { ok: boolean; mediaId?: string; publishId?: string; url?: string; errMsg?: string; throttled?: boolean };

/**
 * 节流检查（跨进程）：距 ContentChannel(wechat) 最近一次 publishedAt 不足 PUBLISH_MIN_INTERVAL_MS 时
 * 抛 ChannelThrottledError（语义化错误，executor 识别后重排期不增 attemptCount、不写 failed 渠道行）。
 */
export async function assertWechatInterval(accountId: number): Promise<void> {
  const lastPub = await prisma.contentChannel.findFirst({
    where: { channel: "wechat", accountId, status: "published", publishedAt: { not: null } },
    orderBy: { publishedAt: "desc" },
  });
  if (!lastPub?.publishedAt) return;
  const elapsed = Date.now() - lastPub.publishedAt.getTime();
  if (elapsed < PUBLISH_MIN_INTERVAL_MS) {
    const remainingMs = PUBLISH_MIN_INTERVAL_MS - elapsed;
    throw new ChannelThrottledError(
      `公众号发布节流：距上次发布不足 60 秒（还需 ${Math.ceil(remainingMs / 1000)}s）`,
      remainingMs
    );
  }
}

export async function publishDraftToWechat(account: WechatAccount, secret: string, item: ContentItem): Promise<WechatPublishResult> {
  try {
    // 同账号发布节流 ≥60s：以 ContentChannel(wechat) 最近一次 publishedAt 为判据，持久化故跨进程有效
    await assertWechatInterval(account.id);
    const settings = await getAllSettings();
    // 每日上限（Q10 口径默认 20）
    const dailyCount = await prisma.contentChannel.count({
      where: { channel: "wechat", accountId: account.id, publishedAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } },
    });
    if (dailyCount >= Number(settings.publishWechatDailyLimit || 20)) {
      return { ok: false, errMsg: `已达今日公众号发布上限（${dailyCount} 篇）` };
    }
    const token = await getAccessToken(account, secret);
    const thumbMediaId = await uploadThumb(token, item.coverImage);
    const draftId = await addDraft(token, item, thumbMediaId);
    // 发布间隔 ≥60s 由 publishScan 串行 + sleep 保证；此处提交 freepublish
    if (account.freepublishEnabled) {
      const publishRes = (await httpFetch(`${API}/cgi-bin/freepublish/submit?access_token=${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ media_id: draftId }),
        timeoutMs: 15_000,
        logTag: "wechat",
        throwOnHttpError: false,
      }).then((r) => r.json())) as { errcode?: number; publish_id?: string; errmsg?: string };
      if (publishRes.errcode && publishRes.errcode !== 0) {
        return { ok: false, mediaId: draftId, errMsg: `freepublish 失败：${publishRes.errcode} ${publishRes.errmsg ?? ""}` };
      }
      // B-07：轮询发布结果，回写文章外链（最多 5 次、指数退避；失败降级为无外链并 warning）
      let url: string | undefined;
      if (publishRes.publish_id) {
        const poll = await getPublishResult(token, publishRes.publish_id);
        if (poll.status === "success" && poll.itemUrl) url = poll.itemUrl;
        else if (poll.errMsg) console.warn(`[wechat] freepublish/get 结果获取失败：${poll.errMsg}`);
      }
      return { ok: true, mediaId: draftId, publishId: publishRes.publish_id, url };
    }
    return { ok: true, mediaId: draftId };
  } catch (err) {
    if (isThrottledError(err)) return { ok: false, throttled: true, errMsg: err.message };
    return { ok: false, errMsg: err instanceof Error ? err.message : String(err) };
  }
}

async function uploadThumb(token: string, coverImage: string | null): Promise<string | null> {
  if (!coverImage) return null;
  try {
    const abs = coverImage.startsWith("http") ? coverImage : `${process.env.APP_ORIGIN ?? "http://localhost:6789"}${coverImage}`;
    // 封面图下载：原实现手动判断 res.ok；用 throwOnHttpError:false 保留非 2xx 返回 null 的语义
    const res = await httpFetch(abs, { timeoutMs: 15_000, logTag: "wechat", throwOnHttpError: false });
    if (!res.ok) return null;
    const buffer = Buffer.from(await res.arrayBuffer());
    const form = new FormData();
    form.append("media", new Blob([new Uint8Array(buffer)]), `cover${buffer.length % 2 ? ".jpg" : ".png"}`);
    const uploaded = (await httpFetch(`${API}/cgi-bin/material/add_material?access_token=${token}&type=image`, {
      method: "POST",
      body: form,
      timeoutMs: 30_000,
      logTag: "wechat",
      throwOnHttpError: false,
    }).then((r) => r.json())) as { media_id?: string; errcode?: number; errmsg?: string };
    return uploaded.media_id ?? null;
  } catch {
    return null;
  }
}

async function addDraft(token: string, item: ContentItem, thumbMediaId: string | null): Promise<string> {
  const rawContent = item.contentType === "markdown" ? mdToWechatHtml(item.content) : item.content;
  // B-07：正文外链图转存微信（uploadimg）；失败保留原外链（降级，不阻塞发布）
  const content = await rewriteWechatImages(rawContent, token);
  const draft = (await httpFetch(`${API}/cgi-bin/draft/add?access_token=${token}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      articles: [
        {
          title: item.title.slice(0, 64),
          author: "弘道教育",
          content,
          content_source_url: await appOrigin(),
          need_open_comment: 0,
          only_fans_can_comment: 0,
          ...(thumbMediaId ? { thumb_media_id: thumbMediaId } : {}),
        },
      ],
    }),
    timeoutMs: 20_000,
    logTag: "wechat",
    throwOnHttpError: false,
  }).then((r) => r.json())) as { media_id?: string; errcode?: number; errmsg?: string };
  if (!draft.media_id) {
    throw new Error(`draft/add 失败：${draft.errcode} ${draft.errmsg ?? ""}`);
  }
  return draft.media_id;
}

/** markdown → 公众号正文 HTML（标题/段落/图片/加粗；表格平铺为文本） */
function mdToWechatHtml(md: string): string {
  return md
    .split("\n")
    .map((line) => {
      const t = line.trim();
      if (!t) return "";
      if (t.startsWith("### ")) return `<h3>${t.slice(4)}</h3>`;
      if (t.startsWith("## ")) return `<h2>${t.slice(3)}</h2>`;
      if (t.startsWith("# ")) return `<h1 style="text-align:center">${t.slice(2)}</h1>`;
      if (t.startsWith("- ")) return `<p>• ${t.slice(2)}</p>`;
      if (t.startsWith("> ")) return `<blockquote>${t.slice(2)}</blockquote>`;
      const img = t.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
      if (img) return `<img src="${img[2]}" alt="${img[1]}" style="max-width:100%"/>`;
      return `<p style="line-height:1.8">${t.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")}</p>`;
    })
    .filter(Boolean)
    .join("\n");
}

/** POST /api/wechat/accounts/[id]/test：access_token 获取测试 */
export async function testAccount(account: WechatAccount): Promise<{ ok: boolean; message: string }> {
  const secret = getWechatAccountSecret(account);
  if (!secret) return { ok: false, message: "AppSecret 解密失败，请重新保存凭证" };
  try {
    await getAccessToken(account, secret);
    return { ok: true, message: "access_token 获取成功，凭证有效" };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "获取 access_token 失败" };
  }
}
