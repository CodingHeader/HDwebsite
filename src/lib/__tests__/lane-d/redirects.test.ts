/**
 * D-07 redirects 回归测试：守住 upgrade 的服务端 3xx 重定向与 main@94dbbbb 逐条一致。
 * - fixture：从 main 的 next.config.ts 提取（29 条，见本文件 EXP_MAIN）
 * - 运行时：import upgrade 的 nextConfig（默认导出），调用 redirects() 拿到实际列表
 * - 断言：条数一致、逐条 source/destination/permanent 一致
 */
import { describe, expect, it } from "vitest";
import nextConfig from "../../../../next.config";

/** main@94dbbbb 的服务端 redirects（29 条，307 temporary） */
const EXP_MAIN: { source: string; destination: string; permanent: boolean }[] = [
  // 关于我们 二级菜单
  { source: "/about/:slug+", destination: "/about", permanent: false },
  // 学历提升 / 热门专业 二级菜单
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
  // 热门院校 二级菜单
  { source: "/partners/:slug+", destination: "/partners", permanent: false },
  // 资讯中心 二级菜单
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
  // /news 根路径
  { source: "/news", destination: "/articles", permanent: false },
  // /news/:id → /articles/:id
  { source: "/news/:id(\\d+)", destination: "/articles/:id", permanent: false },
  // 缓存残留 banner 图片
  { source: "/images/banners/reference1.webp", destination: "/images/seed/banner/banner-1.svg", permanent: false },
  { source: "/images/banners/reference2.webp", destination: "/images/seed/banner/banner-2.svg", permanent: false },
  { source: "/images/banners/reference3.webp", destination: "/images/seed/banner/banner-3.svg", permanent: false },
  { source: "/images/banners/reference4.webp", destination: "/images/seed/banner/banner-1.svg", permanent: false },
];

async function getRedirects(): Promise<{ source: string; destination: string; permanent: boolean }[]> {
  if (typeof nextConfig.redirects !== "function") {
    throw new Error("next.config.ts 未导出 redirects()");
  }
  return (await nextConfig.redirects()) as { source: string; destination: string; permanent: boolean }[];
}

describe("D-07 redirects 与 main 一致", () => {
  it("redirects 条数 = main 的 29 条", async () => {
    const got = await getRedirects();
    expect(got.length).toBe(EXP_MAIN.length);
  });

  it("逐条 source/destination/permanent 与 main 一致", async () => {
    const got = await getRedirects();
    const norm = got.map((r) => ({ ...r, permanent: !!r.permanent }));
    expect(norm).toEqual(EXP_MAIN);
  });

  it("关键重定向存在（about 二级菜单、news→articles、banner 缓存清理）", async () => {
    const got = await getRedirects();
    const srcs = got.map((r) => r.source);
    expect(srcs).toContain("/about/:slug+");
    expect(srcs).toContain("/news/:id(\\d+)");
    expect(srcs).toContain("/images/banners/reference1.webp");
  });

  it("redirects 全部为 307 temporary（permanent=false）", async () => {
    const got = await getRedirects();
    for (const r of got) expect(r.permanent).toBe(false);
  });
});