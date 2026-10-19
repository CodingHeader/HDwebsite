import type { NextConfig } from "next";

const isWindows = process.platform === "win32";

const nextConfig: NextConfig = {
  // Windows 本机构建/运行使用 next start；Linux 生产生成 standalone（start-next.mjs 启动）。
  output: isWindows ? undefined : "standalone",
  devIndicators: false,
  experimental: {
    optimizeCss: false,
    cssChunking: false,
  },
  images: {
    // 图片域名白名单（SOL-001 §3.3）：本站 + 已知采集/微信域随切片收紧，不再全放行 https
    remotePatterns: [
      { protocol: "https", hostname: "mmbiz.qpic.cn" },
      { protocol: "https", hostname: "www.hd1994.com" },
      { protocol: "http", hostname: "localhost" },
    ],
  },
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  onDemandEntries: {
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 4,
  },
  async rewrites() {
    return [
      // /uploads/:path* → /api/file/:path*（路径白名单文件服务）
      {
        source: "/uploads/:path*",
        destination: "/api/file/:path*",
      },
    ];
  },
  async redirects() {
    // P03：恢复 main@94dbbbb 的全部服务端 3xx 重定向（逐条对齐，307 temporary）；
    // 取代 P02 的 (web)/about/[...slug]、partners/[...slug] 页面内 redirect()（200+meta）。
    return [
      // ── 关于我们 二级菜单 ──
      { source: "/about/:slug+", destination: "/about", permanent: false },
      // ── 学历提升 / 热门专业 二级菜单 ──
      { source: "/courses/self-study", destination: "/courses", permanent: false },
      { source: "/courses/adult-exam", destination: "/courses", permanent: false },
      { source: "/courses/open-university", destination: "/courses", permanent: false },
      { source: "/courses/business", destination: "/courses", permanent: false },
      { source: "/courses/technology", destination: "/courses", permanent: false },
      { source: "/courses/humanities", destination: "/courses", permanent: false },
      { source: "/courses/education", destination: "/courses", permanent: false },
      { source: "/courses/medicine", destination: "/courses", permanent: false },
      { source: "/courses/law", destination: "/courses", permanent: false },
      { source: "/courses/art", destination: "/courses", permanent: false },
      { source: "/courses/other", destination: "/courses", permanent: false },
      // ── 热门院校 二级菜单 ──
      { source: "/partners/:slug+", destination: "/partners", permanent: false },
      // ── 资讯中心 二级菜单 (slug → /articles 列表页) ──
      { source: "/news/self-study", destination: "/articles", permanent: false },
      { source: "/news/adult-exam", destination: "/articles", permanent: false },
      { source: "/news/policy", destination: "/articles", permanent: false },
      { source: "/news/experience", destination: "/articles", permanent: false },
      { source: "/news/self-help", destination: "/articles", permanent: false },
      { source: "/news/self-info", destination: "/articles", permanent: false },
      { source: "/news/adult-guide", destination: "/articles", permanent: false },
      { source: "/news/adult-info", destination: "/articles", permanent: false },
      { source: "/news/adult-tips", destination: "/articles", permanent: false },
      { source: "/news/adult-policy", destination: "/articles", permanent: false },
      // /news 根路径 → 文章列表页
      { source: "/news", destination: "/articles", permanent: false },
      // /news/:id 文章详情 → 保留ID重定向到 /articles/:id
      { source: "/news/:id(\\d+)", destination: "/articles/:id", permanent: false },
      // ── 缓存残留 banner 图片 ──
      { source: "/images/banners/reference1.webp", destination: "/images/seed/banner/banner-1.svg", permanent: false },
      { source: "/images/banners/reference2.webp", destination: "/images/seed/banner/banner-2.svg", permanent: false },
      { source: "/images/banners/reference3.webp", destination: "/images/seed/banner/banner-3.svg", permanent: false },
      { source: "/images/banners/reference4.webp", destination: "/images/seed/banner/banner-1.svg", permanent: false },
    ];
  },
  async headers() {
    return [
      {
        // SSE 与公开 GET 接口所需；管理接口鉴权在应用层 requireAuth 控制
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: process.env.APP_ORIGIN ?? "http://localhost:6789" },
          { key: "Access-Control-Allow-Methods", value: "GET,POST,PUT,PATCH,DELETE,OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type, Authorization" },
        ],
      },
    ];
  },
};

export default nextConfig;
