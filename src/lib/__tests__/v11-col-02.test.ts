/**
 * V11-COL-02：cron 语义、开关解绑与时区配置。
 * 1) 图片转存独立开关 collectTransferImages（默认 true）：
 *    - 与源级 autoToKb（采集后自动入知识库）互不影响（两开关 2×2 行为断言）；
 *    - 原 collectDefaultKnowledge 键已随解绑移除（其唯一读取点即图片转存）。
 * 2) 源级 cron 门控关系在管理端文案明示（轻方案：resource-meta specs 的 cron help）。
 * 3) TZ=Asia/Shanghai 落 Dockerfile/compose/.env.example（容器内 date 实测见证据）。
 */
process.env.COLLECT_ALLOW_PRIVATE_TARGETS = "1"; // V11-SEC-04：本套件用本地 mock 服务器当采集源

import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.hoisted(() => {
  const tmp = process.env.TMPDIR || "/tmp";
  process.env.DATABASE_URL = `file:${tmp}/hdw-contract-v11col02-${process.pid}-${Date.now()}.db`;
});

import { prisma } from "@/lib/prisma";
import { cleanupTestDb, initTestDb } from "./api-contract/harness";
import { runSource } from "@/lib/collect-engine";
import { getDefaultValues, getSettingDefinition } from "@/lib/settings-registry";
import { resourceMetas } from "@/components/manager/resource-meta/specs";

vi.setConfig({ testTimeout: 30_000, hookTimeout: 30_000 });

const ORIGINAL_DATADIR = process.env.DATA_DIR;
const ORIGINAL_APPORIGIN = process.env.APP_ORIGIN;

let tmpRoot: string;
let server: http.Server;
let base = "";

/** 1x1 合法 PNG（转存链路 sharp 可正常处理） */
const TINY_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64"
);

beforeAll(async () => {
  await initTestDb();
  // 默认采集落库（kb-sync DEFAULT_COLLECT_BASE_CODE="collect"）；autoToKb=true 用例依赖
  await prisma.knowledgeBase.create({
    data: { name: "采集资讯", code: "collect", description: "默认采集落库", isDefault: false, sort: 2 },
  });
  await prisma.setting.createMany({
    data: [
      { key: "collectRateLimitMs", value: "0", group: "collect" },
      { key: "collectTimeoutMs", value: "5000", group: "collect" },
    ],
  });
  server = http.createServer((rq, rs) => {
    const url = rq.url ?? "/";
    if (url === "/tz/img.png") {
      rs.writeHead(200, { "Content-Type": "image/png" });
      return rs.end(TINY_PNG);
    }
    const m = url.match(/^\/(tz[a-z]?)(\d)?\/list\.html$/);
    if (m) {
      rs.setHeader("content-type", "text/html; charset=utf-8");
      const tag = `${m[1]}${m[2] ?? ""}`;
      return rs.end(
        `<html><body><ul class="list"><li><a href="/${tag}/1.html">转存测试条目一</a></li>` +
          `<li><a href="/${tag}/2.html">转存测试条目二</a></li></ul></body></html>`
      );
    }
    const d = url.match(/^\/(tz[a-z]?)(\d)?\/(\d)\.html$/);
    if (d) {
      rs.setHeader("content-type", "text/html; charset=utf-8");
      return rs.end(`<html><body><div class="content"><p>正文${d[3]}</p><img src="/tz/img.png"></div></body></html>`);
    }
    rs.statusCode = 404;
    rs.end("nf");
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", () => r()));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  process.env.APP_ORIGIN = base; // appOrigin / 图片绝对化基准
});

afterAll(async () => {
  server.closeAllConnections?.();
  await new Promise<void>((r) => server.close(() => r()));
  if (ORIGINAL_DATADIR === undefined) delete process.env.DATA_DIR;
  else process.env.DATA_DIR = ORIGINAL_DATADIR;
  if (ORIGINAL_APPORIGIN === undefined) delete process.env.APP_ORIGIN;
  else process.env.APP_ORIGIN = ORIGINAL_APPORIGIN;
  await prisma.$disconnect();
  cleanupTestDb();
});

/** 造源 + 跑一次采集，返回条目 contentMd 全集 */
async function collectOnce(name: string, tag: string, opts: { autoToKb?: boolean } = {}) {
  const source = await prisma.collectSource.create({
    data: { name, type: "html", url: `${base}/${tag}/list.html`, parser: '{"contentSelector":".content"}', autoToKb: opts.autoToKb ?? false },
  });
  const r = await runSource(source);
  const items = await prisma.collectItem.findMany({ where: { sourceId: source.id } });
  return { stat: r, items };
}

/** 当前转存产物：uploads/collect 下的文件相对路径集合（按 DATA_DIR 隔离，套件独占临时目录） */
function collectUploadFiles(): string[] {
  const dir = path.join(tmpRoot, "uploads", "collect");
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { recursive: true }) as string[];
}

describe("V11-COL-02：图片转存独立开关", () => {
  it("注册表：collectTransferImages 存在（默认开、collect 组、非公开）；collectDefaultKnowledge 已移除", () => {
    const def = getSettingDefinition("collectTransferImages");
    expect(def).toBeDefined();
    expect(def?.group).toBe("collect");
    expect(def?.type).toBe("boolean");
    expect(def?.defaultValue).toBe("true");
    expect(def?.isPublic).toBe(false);
    expect(getSettingDefinition("collectDefaultKnowledge")).toBeUndefined();
    expect(getDefaultValues().collectTransferImages).toBe("true");
  });

  it("两开关互不影响：autoToKb=true 且转存默认开 → 转存 + 入知识库同时发生", async () => {
    tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "hdw-col02-on-"));
    process.env.DATA_DIR = tmpRoot;
    const { stat, items } = await collectOnce("转存默认开源", "tza", { autoToKb: true });
    expect(stat.newCount).toBe(2);
    expect(items.every((i) => i.contentMd?.includes("/uploads/collect/"))).toBe(true);
    expect(items.every((i) => i.knowledgeId !== null)).toBe(true); // autoToKb 独立生效
    expect(items.every((i) => i.contentMd?.includes(`${base}/tz/img.png`))).toBe(false); // 原链已被替换
    expect(collectUploadFiles().some((f) => f.endsWith(".png"))).toBe(true);
  });

  it("转存关（collectTransferImages=false）不影响 autoToKb：不转存、仍入知识库", async () => {
    tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "hdw-col02-off-"));
    process.env.DATA_DIR = tmpRoot;
    await prisma.setting.create({ data: { key: "collectTransferImages", value: "false", group: "collect", type: "boolean", isPublic: false } });
    const before = collectUploadFiles();
    const { stat, items } = await collectOnce("转存关闭源", "tzb", { autoToKb: true });
    expect(stat.newCount).toBe(2);
    expect(items.every((i) => i.contentMd?.includes(`${base}/tz/img.png`))).toBe(true); // 保留原链
    expect(items.every((i) => i.knowledgeId !== null)).toBe(true); // 知识库开关不受影响
    expect(collectUploadFiles()).toEqual(before); // 无新转存产物
  });

  it("autoToKb=false 不影响转存：仍转存（旧实现挂在「默认入知识库」下会漏转）", async () => {
    // 清掉上一用例的显式关闭行，回到「无配置 → 注册表默认开」路径
    await prisma.setting.deleteMany({ where: { key: "collectTransferImages" } });
    tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "hdw-col02-kboff-"));
    process.env.DATA_DIR = tmpRoot;
    const { stat, items } = await collectOnce("不入库但转存源", "tzc", { autoToKb: false });
    expect(stat.newCount).toBe(2);
    expect(items.every((i) => i.contentMd?.includes("/uploads/collect/"))).toBe(true);
    expect(items.every((i) => i.knowledgeId === null)).toBe(true);
    expect(collectUploadFiles().some((f) => f.endsWith(".png"))).toBe(true);
  });
});

describe("V11-COL-02：cron 门控语义明示（轻方案）", () => {
  it("采集源 cron 字段帮助文案说明与系统任务 collect.run 的门控关系", () => {
    const help = resourceMetas["collect-sources"].labels.cron?.help ?? "";
    expect(help).toContain("collect.run");
    expect(help).toContain("门控");
    expect(help).toContain("留空表示仅手动执行");
  });
});
