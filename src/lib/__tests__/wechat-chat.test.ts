/**
 * P06 评审 #5：公众号 AI 客服走 chat-service（场景提示词 + 知识库 + 会话历史 + 场景模型），
 * 兜底文案来自 Setting（wechatFallbackReply，电话引用 contactPhone），src/lib 无硬编码电话/域名。
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join, relative, sep } from "node:path";

const calls = vi.hoisted(() => {
  const tmp = process.env.TMPDIR || "/tmp";
  process.env.DATABASE_URL = `file:${tmp}/hdw-contract-p06wx-${process.pid}-${Date.now()}.db`;
  return { list: [] as { messages: { role: string; content: string }[]; opts?: { preferredProviderId?: number | null } }[], fail: false };
});

vi.mock("@/lib/llm-gateway", async (orig) => {
  const real = await orig<typeof import("@/lib/llm-gateway")>();
  return {
    ...real,
    gatewayChat: async (messages: { role: string; content: string }[], opts?: { preferredProviderId?: number | null }) => {
      calls.list.push({ messages, opts });
      if (calls.fail) return { ok: false, reply: "", errMsg: "down" };
      return { ok: true, reply: "您好，专升本报名请携带身份证。", providerId: 1, providerName: "mock" };
    },
  };
});

import { prisma } from "@/lib/prisma";
import { cleanupTestDb, initTestDb } from "./api-contract/harness";
import { answerWechatText } from "@/lib/wechat";

/**
 * W0-09（DEF-X-01a）：替代 POSIX 依赖的命令行 grep。
 * 原 `grep -rn "<pattern>" src/lib || true` 依赖 POSIX shell，Windows（PowerShell/cmd）无 grep。
 * 此处用 node:fs 递归遍历 src/lib（同 grep 语义：递归、逐行匹配、输出 path:line: content），
 * 未匹配返回 ""，与原 `|| true` + `expect(out.trim()).toBe("")` 断言语义等价。
 *
 * CCR-1（W0-11）：正则构造修正为 `[phone, domain].map(escape).join("|")` 口径——
 * 原实现对整串转义，把交替符 `|` 也转成 `\|`，"电话|域名"退化为字面量匹配，守卫失效（V0.6 核验 F8）。
 * 修正：按 `|` 分段，各段独立转义后用未转义的 `|` 拼回交替语义。
 */
function assertNoSrcLibMatch(patternText: string): string {
  const escaped = patternText
    .split("|")
    .map((seg) => seg.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("|");
  const re = new RegExp(escaped);
  const root = join(process.cwd(), "src/lib");
  const hits: string[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const full = join(dir, name);
      if (statSync(full).isDirectory()) {
        // CCR-1（W0-11）：守卫只看业务代码；__tests__ 内是守卫自身的探针/反证字符串（自引用会误命中）
        if (name === "__tests__") continue;
        walk(full);
        continue;
      }
      const lines = readFileSync(full, "utf8").split("\n");
      for (let i = 0; i < lines.length; i++) {
        re.lastIndex = 0;
        if (re.test(lines[i])) {
          hits.push(`${relative(process.cwd(), full).split(sep).join("/")}:${i + 1}: ${lines[i]}`);
        }
      }
    }
  };
  walk(root);
  return hits.join("\n");
}

let accountId = 0;
let providerId = 0;

beforeAll(async () => {
  await initTestDb();
  providerId = (await prisma.lLMProvider.create({ data: { name: "场景模型", endpoint: "http://x", apiKey: "k", model: "m" } })).id;
  const scene = await prisma.chatScene.create({
    data: { code: "wechat", name: "公众号客服", greeting: "你好", systemPrompt: "你是公众号场景客服SCENEPROMPT", knowledgeTags: "报名", llmProviderId: providerId },
  });
  await prisma.knowledge.create({ data: { title: "报名材料", content: "报名需要身份证与毕业证KBCONTENT", tags: "报名" } });
  await prisma.setting.create({ data: { key: "contactPhone", value: "028-0000-0000", group: "contact" } });
  const acc = await prisma.wechatAccount.create({
    data: { name: "服务号", type: "service", appid: "wx1", appSecret: "", verifyToken: "t", aiEnabled: true, sceneId: scene.id },
  });
  accountId = acc.id;
});
afterAll(async () => {
  await prisma.$disconnect();
  cleanupTestDb();
});

describe("公众号 AI 客服", () => {
  it("带入场景 systemPrompt、知识上下文、场景模型与会话历史", async () => {
    const account = (await prisma.wechatAccount.findUnique({ where: { id: accountId } }))!;
    const a1 = await answerWechatText(account, "openid-1", "报名需要什么材料");
    expect(a1).toContain("身份证");
    const first = calls.list.at(-1)!;
    const sys = first.messages.find((m) => m.role === "system")!.content;
    expect(sys).toContain("SCENEPROMPT");
    expect(sys).toContain("KBCONTENT");
    expect(first.opts?.preferredProviderId).toBe(providerId);
    expect(first.messages.at(-1)).toEqual({ role: "user", content: "报名需要什么材料" });

    await answerWechatText(account, "openid-1", "学费多少");
    const second = calls.list.at(-1)!;
    expect(second.messages.some((m) => m.role === "assistant" && m.content.includes("身份证"))).toBe(true);
    expect(await prisma.aIChatHistory.count({ where: { sessionId: "wx:openid-1", channel: "wechat" } })).toBe(4);
  });

  it("模型不可用 → Setting 兜底文案（引用 contactPhone）", async () => {
    calls.fail = true;
    const account = (await prisma.wechatAccount.findUnique({ where: { id: accountId } }))!;
    const a = await answerWechatText(account, "openid-2", "在吗");
    expect(a).toContain("028-0000-0000");
    calls.fail = false;
  });

  it("src/lib 无硬编码电话/域名", () => {
    // W0-09：替代 POSIX 命令 grep（Windows PowerShell/cmd 无 grep，原实现不具可移植性）
    const pattern = ["400-001-" + "5729", "hd1994" + ".com"].join("|");
    expect(assertNoSrcLibMatch(pattern)).toBe("");
  });

  // CCR-1（W0-11）：反证用例——守卫必须"能失败"。故意构造只含电话的命中串，
  // 若正则交替失效（原整串转义 bug），该用例会得到空串而失败。
  it("反证：只含电话的源码行必须命中（守卫能失败）", () => {
    const pattern = ["400-001-" + "5729", "hd1994" + ".com"].join("|");
    const fakeSrc = "src/lib/__fake-guard-probe__.ts:1: const phone = \"400-001-5729\";";
    // 直接构造命中行交给匹配函数不可行（函数遍历真实文件系统），
    // 因此这里直接验证正则交替语义本身：转义后的 pattern 必须匹配"只含电话"的字符串。
    const escaped = pattern
      .split("|")
      .map((seg) => seg.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
      .join("|");
    const re = new RegExp(escaped);
    expect(re.test(fakeSrc)).toBe(true); // 电话单独出现必须命中
    expect(re.test("const host = \"hd1994.com\";")).toBe(true); // 域名单独出现必须命中
    expect(re.test("完全无关的行")).toBe(false);
  });

  // CCR-1（W0-11）：守卫实现与断言语义绑定——assertNoSrcLibMatch 走修正后的分段转义口径，
  // 若未来有人改回整串转义，上面的反证用例与这条"电话独现"探针会同时失败。
  it("反证（实现级）：assertNoSrcLibMatch 的正则对电话单独出现可命中", () => {
    // 临时把探测文件写入 src/lib（守卫遍历的是真实 fs），断言命中后立即删除（try/finally 保证清理）。
    const probe = join(process.cwd(), "src/lib", "__w011-probe__.ts");
    const probeLine = "// W0-11 反证探针 const phone = \"400-001-5729\";\nexport {};\n";
    try {
      writeFileSync(probe, probeLine, "utf8");
      const pattern = ["400-001-" + "5729", "hd1994" + ".com"].join("|");
      const hits = assertNoSrcLibMatch(pattern);
      expect(hits).toContain("__w011-probe__.ts:1");
    } finally {
      rmSync(probe, { force: true });
    }
  });
});
