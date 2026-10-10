#!/usr/bin/env node
/**
 * B1-B5：一次性生成 Banner/Partner/Gallery/Campus/HotMajor 的 SVG 素材。
 *   - 100% 本地生成，无外部依赖，法律安全
 *   - 后台仍可上传真实图覆盖（image / logo / iconImage 字段）
 * 输出：
 *   public/images/seed/banner/banner-{1..3}.svg
 *   public/images/seed/partner/{scu|xhu|cdut|uestc|swufe|sicnu|sicau|swjtu}.svg
 *   public/images/seed/gallery/cert-{1..8}.svg
 *   public/images/seed/campus/{dashixi|shuangdian}-{1..3}.svg
 *   public/images/seed/major/{hywx|xqjy|kjx|gsgl|jsjkx|fx|xlx|jrx}.svg
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve("public/images/seed");

function mkdir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function write(p, content) {
  mkdir(path.dirname(p));
  fs.writeFileSync(p, content, "utf8");
}

// ---------- 共享样式 ----------
const FONT =
  "font-family=\"'PingFang SC','Microsoft YaHei','Hiragino Sans GB',system-ui,sans-serif\"";

// ============== Banner ==============
function bannerSvg({ id, title, subtitle, gradFrom, gradTo }) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 500" preserveAspectRatio="xMidYMid slice">
  <defs>
    <linearGradient id="bg${id}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${gradFrom}"/>
      <stop offset="100%" stop-color="${gradTo}"/>
    </linearGradient>
    <pattern id="dots${id}" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
      <circle cx="20" cy="20" r="1.3" fill="rgba(255,255,255,0.18)"/>
    </pattern>
  </defs>
  <rect width="1600" height="500" fill="url(#bg${id})"/>
  <rect width="1600" height="500" fill="url(#dots${id})"/>
  <g transform="translate(80,120)">
    <rect x="0" y="0" width="70" height="6" fill="#ffffff" rx="3"/>
    <text x="0" y="80" ${FONT} fill="#ffffff" font-size="64" font-weight="800" letter-spacing="2">${title}</text>
    <text x="0" y="140" ${FONT} fill="rgba(255,255,255,0.92)" font-size="28" font-weight="500">${subtitle}</text>
    <g transform="translate(0,200)">
      <rect x="0" y="0" width="180" height="54" rx="27" fill="#ffffff"/>
      <text x="90" y="35" ${FONT} fill="${gradFrom}" font-size="18" font-weight="700" text-anchor="middle">立即咨询 →</text>
    </g>
  </g>
</svg>`;
}

const banners = [
  { id: 1, title: "弘道教育 · 学历提升", subtitle: "自考 · 成考 · 开放大学 一站直达名校", from: "#0b5394", to: "#2a84c9" },
  { id: 2, title: "8 所 985/211 合作院校", subtitle: "四川大学 / 电子科大 / 西南财大 官方校外学习中心", from: "#0f766e", to: "#22c5a6" },
  { id: 3, title: "2026 秋季招生启动", subtitle: "正规学信网可查 · 国家认可学历", from: "#9f1239", to: "#e04a75" },
];
for (const b of banners) {
  write(
    path.join(ROOT, "banner", `banner-${b.id}.svg`),
    bannerSvg({ id: b.id, title: b.title, subtitle: b.subtitle, gradFrom: b.from, gradTo: b.to })
  );
}

// ============== Partner ==============
function partnerSvg({ code, label, g1, g2 }) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240">
  <defs>
    <linearGradient id="p${code}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${g1}"/>
      <stop offset="100%" stop-color="${g2}"/>
    </linearGradient>
    <filter id="s${code}" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="4" stdDeviation="4" flood-color="${g2}" flood-opacity="0.3"/>
    </filter>
  </defs>
  <circle cx="120" cy="120" r="108" fill="url(#p${code})" filter="url(#s${code})"/>
  <circle cx="120" cy="120" r="96" fill="none" stroke="rgba(255,255,255,0.4)" stroke-width="2"/>
  <text x="120" y="140" ${FONT} fill="#ffffff" font-size="56" font-weight="800" text-anchor="middle" letter-spacing="-1">${label}</text>
</svg>`;
}

const partners = [
  { code: "scu", label: "川大", g1: "#c02121", g2: "#ff6b6b" },
  { code: "xhu", label: "西华", g1: "#1d4ed8", g2: "#60a5fa" },
  { code: "cdut", label: "理工", g1: "#059669", g2: "#34d399" },
  { code: "uestc", label: "电科", g1: "#7c3aed", g2: "#c084fc" },
  { code: "swufe", label: "西财", g1: "#c2410c", g2: "#fb923c" },
  { code: "sicnu", label: "师大", g1: "#0891b2", g2: "#22d3ee" },
  { code: "sicau", label: "川农", g1: "#15803d", g2: "#4ade80" },
  { code: "swjtu", label: "交大", g1: "#9a3412", g2: "#f97316" },
];
for (const p of partners) {
  write(path.join(ROOT, "partner", `${p.code}.svg`), partnerSvg(p));
}

// ============== Gallery 证书 ==============
function certSvg({ id, school, type, g1, g2 }) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300">
  <defs>
    <linearGradient id="c${id}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${g1}"/>
      <stop offset="100%" stop-color="${g2}"/>
    </linearGradient>
    <pattern id="grid${id}" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
      <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(255,255,255,0.15)" stroke-width="0.5"/>
    </pattern>
  </defs>
  <rect width="400" height="300" fill="#f9fafb"/>
  <rect x="12" y="12" width="376" height="276" fill="url(#c${id})" rx="6"/>
  <rect x="12" y="12" width="376" height="276" fill="url(#grid${id})" rx="6"/>
  <rect x="24" y="24" width="352" height="252" fill="none" stroke="rgba(255,255,255,0.6)" stroke-width="2" rx="4"/>
  <!-- 国徽 -->
  <g transform="translate(200,80)">
    <circle r="28" fill="#fee2e2"/>
    <circle r="22" fill="#dc2626"/>
    <polygon points="0,-12 3.5,-3.7 14,-3.7 5.7,2.5 9,12 0,6 -9,12 -5.7,2.5 -14,-3.7 -3.5,-3.7" fill="#fbbf24"/>
  </g>
  <text x="200" y="150" ${FONT} fill="#ffffff" font-size="18" font-weight="700" text-anchor="middle" letter-spacing="2">${school}</text>
  <text x="200" y="180" ${FONT} fill="rgba(255,255,255,0.92)" font-size="22" font-weight="800" text-anchor="middle" letter-spacing="3">${type}</text>
  <text x="200" y="230" ${FONT} fill="rgba(255,255,255,0.82)" font-size="12" font-weight="500" text-anchor="middle">中华人民共和国教育部 学信网可查</text>
  <circle cx="320" cy="250" r="26" fill="none" stroke="#ffffff" stroke-width="2" opacity="0.7"/>
  <text x="320" y="256" ${FONT} fill="#ffffff" font-size="11" font-weight="700" text-anchor="middle" opacity="0.7">印 章</text>
</svg>`;
}

const certs = [
  { id: 1, school: "四川师范大学", type: "自考毕业证书", g1: "#1e40af", g2: "#3b82f6" },
  { id: 2, school: "西华师范大学", type: "自考学位证书", g1: "#047857", g2: "#10b981" },
  { id: 3, school: "电子科技大学", type: "自考毕业证书", g1: "#6d28d9", g2: "#8b5cf6" },
  { id: 4, school: "四川农业大学", type: "自考毕业证书", g1: "#166534", g2: "#22c55e" },
  { id: 5, school: "西南交通大学", type: "自考学位证书", g1: "#9a3412", g2: "#ea580c" },
  { id: 6, school: "成都大学", type: "自考毕业证书", g1: "#a21caf", g2: "#d946ef" },
  { id: 7, school: "四川省教育厅", type: "教师资格证书", g1: "#0e7490", g2: "#06b6d4" },
  { id: 8, school: "人社部认证", type: "心理咨询师证", g1: "#b91c1c", g2: "#ef4444" },
];
for (const c of certs) {
  write(path.join(ROOT, "gallery", `cert-${c.id}.svg`), certSvg(c));
}

// ============== Campus 校区 ==============
function campusSvg({ id, name, idx, g1, g2 }) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500">
  <defs>
    <linearGradient id="cp${id}${idx}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${g1}"/>
      <stop offset="100%" stop-color="${g2}"/>
    </linearGradient>
  </defs>
  <rect width="800" height="500" fill="url(#cp${id}${idx})"/>
  <!-- 简化楼体 -->
  <g transform="translate(100,${220 + idx * 8})">
    <rect x="0" y="0" width="200" height="180" fill="rgba(255,255,255,0.15)" rx="3"/>
    <rect x="210" y="-40" width="260" height="220" fill="rgba(255,255,255,0.22)" rx="3"/>
    <rect x="480" y="20" width="150" height="160" fill="rgba(255,255,255,0.15)" rx="3"/>
    <!-- 窗户 -->
    ${Array.from({ length: 5 }).map((_, r) =>
      Array.from({ length: 8 }).map((_, c) =>
        `<rect x="${30 + c * 22}" y="${20 + r * 32}" width="14" height="18" fill="rgba(255,230,170,0.85)" rx="1"/>`
      ).join("")
    ).join("")}
    ${Array.from({ length: 6 }).map((_, r) =>
      Array.from({ length: 10 }).map((_, c) =>
        `<rect x="${236 + c * 22}" y="${-20 + r * 32}" width="14" height="18" fill="rgba(255,230,170,0.9)" rx="1"/>`
      ).join("")
    ).join("")}
  </g>
  <!-- 地面 -->
  <rect x="0" y="400" width="800" height="100" fill="rgba(0,0,0,0.15)"/>
  <!-- 树 -->
  <g>
    <circle cx="70" cy="400" r="30" fill="#166534" opacity="0.75"/>
    <rect x="67" y="400" width="6" height="20" fill="#78350f"/>
    <circle cx="720" cy="410" r="26" fill="#14532d" opacity="0.75"/>
    <rect x="717" y="410" width="6" height="18" fill="#78350f"/>
  </g>
  <text x="40" y="60" ${FONT} fill="#ffffff" font-size="28" font-weight="700">${name} · 校区实景 ${idx}</text>
  <text x="40" y="90" ${FONT} fill="rgba(255,255,255,0.75)" font-size="14" font-weight="500">Sichuan HongDao Education</text>
</svg>`;
}

const campuses = [
  { id: "dashixi", name: "大石西路总校", g1: "#1e3a8a", g2: "#3b82f6" },
  { id: "shuangdian", name: "双店路分校", g1: "#7f1d1d", g2: "#ef4444" },
];
for (const cp of campuses) {
  for (let i = 1; i <= 3; i++) {
    write(path.join(ROOT, "campus", `${cp.id}-${i}.svg`), campusSvg({ id: cp.id, name: cp.name, idx: i, g1: cp.g1, g2: cp.g2 }));
  }
}

// ============== HotMajor 专业图标 ==============
function majorSvg({ code, label, g1, g2 }) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
  <defs>
    <linearGradient id="m${code}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${g1}"/>
      <stop offset="100%" stop-color="${g2}"/>
    </linearGradient>
    <filter id="mf${code}" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="6" stdDeviation="6" flood-color="${g2}" flood-opacity="0.45"/>
    </filter>
  </defs>
  <circle cx="100" cy="100" r="84" fill="url(#m${code})" filter="url(#mf${code})"/>
  <circle cx="100" cy="100" r="74" fill="none" stroke="rgba(255,255,255,0.35)" stroke-width="1.5"/>
  <text x="100" y="118" ${FONT} fill="#ffffff" font-size="58" font-weight="700" text-anchor="middle" letter-spacing="-2">${label}</text>
</svg>`;
}

const majors = [
  { code: "hywx", label: "汉", g1: "#0ea5e9", g2: "#38bdf8" },
  { code: "xqjy", label: "学", g1: "#059669", g2: "#34d399" },
  { code: "kjx",  label: "会", g1: "#ea580c", g2: "#fb923c" },
  { code: "gsgl", label: "商", g1: "#dc2626", g2: "#f87171" },
  { code: "jsjkx",label: "计", g1: "#0891b2", g2: "#22d3ee" },
  { code: "fx",   label: "法", g1: "#7c3aed", g2: "#a78bfa" },
  { code: "xlx",  label: "心", g1: "#db2777", g2: "#f472b6" },
  { code: "jrx",  label: "金", g1: "#ca8a04", g2: "#eab308" },
];
for (const m of majors) {
  write(path.join(ROOT, "major", `${m.code}.svg`), majorSvg(m));
}

// ============== 汇总 ==============
const counters = {};
for (const dir of ["banner", "partner", "gallery", "campus", "major"]) {
  counters[dir] = fs
    .readdirSync(path.join(ROOT, dir))
    .filter((f) => f.endsWith(".svg")).length;
}
console.log("✅ SVG 素材已生成");
for (const [k, v] of Object.entries(counters)) {
  console.log(`  ${k.padEnd(8)} = ${v}`);
}
console.log(`  总计 = ${Object.values(counters).reduce((a, b) => a + b, 0)} 张`);
