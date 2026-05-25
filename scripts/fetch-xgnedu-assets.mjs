// 从 xgnedu.cn 抓取 HTML → 解析图片 → 下载到 public/images/*
// 执行：node scripts/fetch-xgnedu-assets.mjs
import fs from "node:fs";
import path from "node:path";

const BASE = "https://www.xgnedu.cn";
const ROOT = path.resolve(process.cwd(), "public/images");

const PAGES = [
  { url: `${BASE}/`, tag: "home" },
];

/** 创建目录 */
function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

/** 下载二进制到 dest，返回字节数 */
async function download(url, dest) {
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
      "Referer": BASE + "/",
    },
  });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  ensureDir(path.dirname(dest));
  fs.writeFileSync(dest, buf);
  return buf.length;
}

/** 从 HTML 提取 <img src=""> 和 background-image:url('') */
function extractImages(html) {
  const urls = new Set();
  // <img src="...">
  for (const m of html.matchAll(/<img[^>]+src=["']([^"']+)["']/gi)) {
    urls.add(m[1]);
  }
  // data-src / data-original
  for (const m of html.matchAll(/data-(?:src|original)=["']([^"']+)["']/gi)) {
    urls.add(m[1]);
  }
  // style="background-image:url(...)"
  for (const m of html.matchAll(/background-image:\s*url\(['"]?([^'")]+)['"]?\)/gi)) {
    urls.add(m[1]);
  }
  return Array.from(urls);
}

function toAbsolute(url) {
  if (!url) return null;
  if (url.startsWith("data:")) return null;
  if (url.startsWith("//")) return "https:" + url;
  if (url.startsWith("http")) return url;
  if (url.startsWith("/")) return BASE + url;
  return BASE + "/" + url;
}

async function fetchHtml(url) {
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
    },
  });
  return await res.text();
}

async function main() {
  ensureDir(ROOT);
  const all = new Set();
  const html = await fetchHtml(BASE + "/");
  const imgs = extractImages(html);
  for (const u of imgs) {
    const abs = toAbsolute(u);
    if (abs) all.add(abs);
  }

  console.log(`[discover] ${all.size} unique image URLs`);
  const manifest = [];
  for (const url of all) {
    const u = new URL(url);
    const rel = u.pathname.replace(/^\//, "");
    const dest = path.join(ROOT, "xgnedu", rel);
    try {
      const size = await download(url, dest);
      manifest.push({ url, local: "/images/xgnedu/" + rel, size });
      console.log(`  ✓ ${rel} (${size}B)`);
    } catch (e) {
      console.log(`  ✗ ${url} ${e.message}`);
    }
  }
  fs.writeFileSync(
    path.join(ROOT, "xgnedu-manifest.json"),
    JSON.stringify(manifest, null, 2)
  );
  console.log(`\n✅ manifest -> public/images/xgnedu-manifest.json (${manifest.length} assets)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
