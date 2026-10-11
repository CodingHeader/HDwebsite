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
      // R0 接入 /api/file/[...path]（路径白名单文件服务）后生效；当前为预留
      {
        source: "/uploads/:path*",
        destination: "/api/file/:path*",
      },
    ];
  },
  async redirects() {
    return [
      // 历史新闻路径收敛（C1：News 并入 Article）
      { source: "/news", destination: "/articles", permanent: false },
      { source: "/news/:id(\\d+)", destination: "/articles/:id", permanent: false },
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
