/**
 * Coze 知识库冒烟脚本（V8-INT-01）
 *
 * 走三步：建库（dataset）→ 上传 1 个 .md（document）→ 检索（retrieve）。
 *
 * 默认 dry-run：只打印请求摘要，**不出网**。
 * `--live` 才真正调用 Coze API。
 *
 * 凭证来源：数据库 `LLMProvider`（kind="coze"）的 endpoint + botId + apiKey，
 * 与运行时 `src/lib/kb-adapter.ts:searchViaCoze` 一致。
 *
 * 退出码：0 成功 / 1 断言失败 / 2 网络错误 / 3 缺凭证
 *
 * 用法：
 *   node scripts/smoke/coze.mjs            # dry-run
 *   node scripts/smoke/coze.mjs --live     # 真实调用（会真的建一个库）
 */
import { EXIT, exitMissingCreds, isLive, mask, openDb, pretend, step } from "./_shared.mjs";

const STEP_TOTAL = 3;
const db = openDb();

async function main() {
  console.log("== Coze 知识库冒烟 ==");
  console.log(`模式：${isLive() ? "LIVE（会真实调用 Coze API 并建库）" : "dry-run（不出网）"}`);

  // ── 前置：取 coze 供应商 ──
  const provider = await db.lLMProvider.findFirst({
    where: { kind: "coze" },
    orderBy: { priority: "asc" },
  });

  const missing = [];
  if (!provider) missing.push('LLMProvider（kind="coze" 的供应商）');
  else {
    if (!provider.apiKey) missing.push("LLMProvider.apiKey（Coze PAT）");
    if (!provider.endpoint) missing.push("LLMProvider.endpoint（如 https://api.coze.cn）");
    if (!provider.botId) missing.push("LLMProvider.botId");
  }
  if (missing.length) {
    exitMissingCreds(missing, [
      "在「管理后台 → 模型供应商」新增：类型选 Coze，填 Endpoint（https://api.coze.cn）、PAT、Bot ID",
      "PAT 需具备 dataset 读写与 document 上传权限",
      "真实调用会在你的 Coze 空间里创建一个名为 smoke-<时间戳> 的库，测完请手动删除",
    ]);
  }

  const base = (provider.endpoint || "https://api.coze.cn").replace(/\/+$/, "");
  console.log(`  endpoint=${base}  botId=${mask(provider.botId)}  PAT=${mask(provider.apiKey)}`);

  const pat = provider.apiKey.startsWith("v1:")
    ? (await import("../../src/lib/crypto.ts").catch(() => ({ decryptField: null }))).decryptField?.(provider.apiKey)
    : provider.apiKey;
  if (!pat) {
    console.error("\n✗ PAT 解密失败 —— 请用 `npx tsx scripts/smoke/coze.mjs` 运行（需要 ts 加载器）");
    process.exit(EXIT.ASSERT);
  }

  const headers = {
    authorization: `Bearer ${pat}`,
    "content-type": "application/json",
  };

  // ── 1. 建库 ──
  step(1, STEP_TOTAL, "创建知识库（dataset）");
  const datasetName = `smoke-${Date.now()}`;
  const createUrl = `${base}/v1/datasets`;
  pretend("POST", createUrl, { name: datasetName, format_type: 1 });

  let datasetId = null;
  if (isLive()) {
    const res = await fetch(createUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({ name: datasetName, format_type: 1, description: "V8-INT-01 冒烟，可删除" }),
    });
    const body = await res.json();
    if (body.code !== 0) {
      console.error(`  ✗ 建库失败：code=${body.code} msg=${body.msg}`);
      console.error("    常见原因：PAT 无 dataset 写权限／空间配额已满／endpoint 不是 api.coze.cn");
      process.exit(EXIT.ASSERT);
    }
    datasetId = body.data?.dataset_id ?? body.data?.id;
    console.log(`  ✓ dataset_id=${datasetId}  name=${datasetName}`);
  }

  // ── 2. 上传 1 个 .md ──
  step(2, STEP_TOTAL, "上传 1 个 Markdown 文件（document）");
  const uploadUrl = `${base}/v1/datasets/${datasetId ?? "<上一步的 id>"}/documents/upload`;
  pretend("POST", uploadUrl, "(multipart: smoke.md)");

  if (isLive()) {
    const md = `# 冒烟测试\n\n这是 V8-INT-01 的上传验证文档。关键词：弘道教育冒烟测试标记。\n`;
    const form = new FormData();
    form.append("file", new Blob([md], { type: "text/markdown" }), "smoke.md");
    form.append("data", JSON.stringify({ format_type: 0, separator: "\n\n", chunk_size: 800 }));
    const res = await fetch(uploadUrl, { method: "POST", headers: { authorization: `Bearer ${pat}` }, body: form });
    const body = await res.json();
    if (body.code !== 0) {
      console.error(`  ✗ 上传失败：code=${body.code} msg=${body.msg}`);
      process.exit(EXIT.ASSERT);
    }
    console.log(`  ✓ 已上传（document 处理是异步的，检索前可能需要等几十秒）`);
  }

  // ── 3. 检索 ──
  step(3, STEP_TOTAL, "检索验证（search / retrieve）");
  const searchUrl = `${base}/v1/datasets/${datasetId ?? "<id>"}/retrieve`;
  pretend("POST", searchUrl, { query: "冒烟测试标记", top_k: 3 });

  if (isLive()) {
    const res = await fetch(searchUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({ query: "冒烟测试标记", top_k: 3 }),
    });
    const body = await res.json();
    if (body.code !== 0) {
      console.error(`  ✗ 检索失败：code=${body.code} msg=${body.msg}`);
      process.exit(EXIT.ASSERT);
    }
    const hits = body.data?.chunks ?? body.data?.documents ?? [];
    console.log(`  ✓ 检索返回 ${hits.length} 条`);
    if (hits.length === 0) {
      console.log("    提示：0 条通常是文档仍在解析中，等 30~60s 重试即可");
    }
    console.log(`\n  清理：请在 Coze 空间删除 dataset「${datasetName}」`);
  }

  console.log("\n✓ 冒烟完成");
  await db.$disconnect();
}

main().catch(async (e) => {
  console.error("\n✗ 网络/协议错误：", e instanceof Error ? e.message : e);
  await db.$disconnect().catch(() => {});
  process.exit(EXIT.NETWORK);
});
