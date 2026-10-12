/**
 * 公众号对接模块（SOL-006，ADR-002/013：按官方 API 全量设计开发，凭证后补即插桩生效）
 * - access_token：/cgi-bin/token 缓存 7200s 过期前 5min 刷新（tokenCache JSON-in-String）
 * - 服务器回调验签：node:crypto sha1 排序（GET echostr / POST XML 事件分发）
 * - 发布：图片转永久素材 → draft/add → freepublish/submit（频控 ≥60s、每日上限默认 20）
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
  const res = (await fetch(
    `${API}/cgi-bin/token?grant_type=client_credential&appid=${account.appid}&secret=${secret}`,
    { signal: AbortSignal.timeout(10_000) }
  ).then((r) => r.json())) as { access_token?: string; expires_in?: number; errcode?: number; errmsg?: string };
  if (!res.access_token) throw new Error(`获取 access_token 失败：${res.errcode} ${res.errmsg ?? ""}`);
  await prisma.wechatAccount.update({
    where: { id: account.id },
    data: { tokenCache: JSON.stringify({ accessToken: res.access_token, expiresAt: Date.now() + (res.expires_in ?? 7200) * 1000 }) },
  });
  return res.access_token;
}

function parseTokenCache(json: string | null): { accessToken: string; expiresAt: number } | null {
  if (!json) return null;
  try {
    const parsed = JSON.parse(json);
    if (typeof parsed.accessToken === "string" && typeof parsed.expiresAt === "number") return parsed;
    return null;
  } catch {
    return null;
  }
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
  const res = (await fetch(`${API}/cgi-bin/message/custom/send?access_token=${token}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ touser: openId, msgtype: "text", text: { content } }),
    signal: AbortSignal.timeout(10_000),
  }).then((r) => r.json())) as { errcode?: number; errmsg?: string };
  if (res.errcode && res.errcode !== 0) {
    throw new Error(`客服消息发送失败：${res.errcode} ${res.errmsg ?? ""}`);
  }
  await prisma.aIChatHistory.create({
    data: { sessionId: `wx-${openId.slice(-16)}`, channel: "wechat", role: "assistant", message: content, model: "wechat-cs" },
  }).catch(() => undefined);
}

// ── 发布链路：素材 → 草稿 → 发布 ─────────────────────────────

export type WechatPublishResult = { ok: boolean; mediaId?: string; publishId?: string; url?: string; errMsg?: string };

export async function publishDraftToWechat(account: WechatAccount, secret: string, item: ContentItem): Promise<WechatPublishResult> {
  try {
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
      const publishRes = (await fetch(`${API}/cgi-bin/freepublish/submit?access_token=${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ media_id: draftId }),
        signal: AbortSignal.timeout(15_000),
      }).then((r) => r.json())) as { errcode?: number; publish_id?: string; errmsg?: string };
      if (publishRes.errcode && publishRes.errcode !== 0) {
        return { ok: false, mediaId: draftId, errMsg: `freepublish 失败：${publishRes.errcode} ${publishRes.errmsg ?? ""}` };
      }
      return { ok: true, mediaId: draftId, publishId: publishRes.publish_id };
    }
    return { ok: true, mediaId: draftId };
  } catch (err) {
    return { ok: false, errMsg: err instanceof Error ? err.message : String(err) };
  }
}

async function uploadThumb(token: string, coverImage: string | null): Promise<string | null> {
  if (!coverImage) return null;
  try {
    const abs = coverImage.startsWith("http") ? coverImage : `${process.env.APP_ORIGIN ?? "http://localhost:6789"}${coverImage}`;
    const res = await fetch(abs, { signal: AbortSignal.timeout(15_000) });
    if (!res.ok) return null;
    const buffer = Buffer.from(await res.arrayBuffer());
    const form = new FormData();
    form.append("media", new Blob([new Uint8Array(buffer)]), `cover${buffer.length % 2 ? ".jpg" : ".png"}`);
    const uploaded = (await fetch(`${API}/cgi-bin/material/add_material?access_token=${token}&type=image`, {
      method: "POST",
      body: form,
      signal: AbortSignal.timeout(30_000),
    }).then((r) => r.json())) as { media_id?: string; errcode?: number; errmsg?: string };
    return uploaded.media_id ?? null;
  } catch {
    return null;
  }
}

async function addDraft(token: string, item: ContentItem, thumbMediaId: string | null): Promise<string> {
  const content = item.contentType === "markdown" ? mdToWechatHtml(item.content) : item.content;
  const draft = (await fetch(`${API}/cgi-bin/draft/add?access_token=${token}`, {
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
    signal: AbortSignal.timeout(20_000),
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
