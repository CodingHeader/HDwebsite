// 从 xgnedu.cn 各大学详情页抓取校徽
import fs from "node:fs";
import path from "node:path";

const BASE = "https://www.xgnedu.cn";
const ROOT = path.resolve(process.cwd(), "public/images/xgnedu");

const PARTNERS = [
  { slug: "chuanda", name: "四川大学" },
  { slug: "xihua", name: "西华大学" },
  { slug: "ligong", name: "成都理工大学" },
  { slug: "dianke", name: "电子科技大学" },
  { slug: "xicai", name: "西南财经大学" },
  { slug: "chuanshi", name: "四川师范大学" },
  { slug: "neishi", name: "内江师范学院" },
  { slug: "chuannong", name: "四川农业大学" },
  { slug: "chengda", name: "成都大学" },
];

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

async function fetchHtml(url) {
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    },
  });
  return await res.text();
}

async function download(url, dest) {
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      Referer: BASE + "/",
    },
  });
  if (!res.ok) throw new Error(`${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  ensureDir(path.dirname(dest));
  fs.writeFileSync(dest, buf);
  return buf.length;
}

function extractBig(html) {
  const urls = new Set();
  for (const m of html.matchAll(/<img[^>]+src=["']([^"']+\.(?:jpg|jpeg|png))["']/gi)) {
    urls.add(m[1]);
  }
  for (const m of html.matchAll(/background-image:\s*url\(['"]?([^'")]+)['"]?\)/gi)) {
    urls.add(m[1]);
  }
  return Array.from(urls);
}

function toAbsolute(url) {
  if (url.startsWith("http")) return url;
  if (url.startsWith("//")) return "https:" + url;
  if (url.startsWith("/")) return BASE + url;
  return BASE + "/" + url;
}

async function main() {
  const out = [];
  for (const p of PARTNERS) {
    try {
      const html = await fetchHtml(`${BASE}/${p.slug}/`);
      const imgs = extractBig(html).map(toAbsolute);
      // 选出 logo 候选：尺寸小、出现早的图
      const candidate =
        imgs.find((u) => /logo|校徽|校标|xiao/i.test(u)) ||
        imgs.find((u) => /[\/_]\d{6,}[a-z]*\.png/i.test(u)) || // 形如 12345abc.png 的首图
        imgs[0];
      if (!candidate) {
        console.log(`  [skip] ${p.name} no image`);
        continue;
      }
      const ext = path.extname(new URL(candidate).pathname) || ".png";
      const dest = path.join(ROOT, "partners", `${p.slug}${ext}`);
      const size = await download(candidate, dest);
      out.push({ slug: p.slug, name: p.name, url: candidate, local: `/images/xgnedu/partners/${p.slug}${ext}`, size });
      console.log(`  ✓ ${p.name}: ${candidate} (${size}B)`);
    } catch (e) {
      console.log(`  ✗ ${p.name}: ${e.message}`);
    }
  }
  fs.writeFileSync(path.join(ROOT, "partners.json"), JSON.stringify(out, null, 2));
  console.log(`\n✅ ${out.length}/${PARTNERS.length} partner logos`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
