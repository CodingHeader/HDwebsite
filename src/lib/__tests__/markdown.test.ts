import { describe, expect, it } from "vitest";
import {
  extractFirstImage,
  markdownExcerpt,
  applyContentHooks,
  sanitizeRichContent,
} from "@/lib/markdown";

describe("markdown 管线", () => {
  it("提取首图：markdown 图片", () => {
    expect(extractFirstImage("前文\n![封面](https://example.com/a.png)\n后文")).toBe(
      "https://example.com/a.png"
    );
  });

  it("提取首图：内嵌 html 图片", () => {
    expect(extractFirstImage('<p>text</p><img src="https://x.com/b.jpg">')).toBe(
      "https://x.com/b.jpg"
    );
  });

  it("无图返回 null", () => {
    expect(extractFirstImage("# 没有图片")).toBeNull();
  });

  it("摘要剥离 markdown 标记与代码块", () => {
    const md = "# 标题\n\n这是**正文**段落，包含 `code` 与[链接](https://x)。\n\n```js\nconst a=1;\n```";
    const excerpt = markdownExcerpt(md);
    expect(excerpt).toContain("正文");
    expect(excerpt).not.toContain("const a=1");
    expect(excerpt.length).toBeLessThanOrEqual(200);
  });

  it("入库钩子：显式 excerpt/cover 优先", () => {
    const hooks = applyContentHooks({
      contentType: "markdown",
      content: "![a](https://x.com/i.png)\n内容",
      excerpt: "手动摘要",
      coverImage: "https://x.com/manual.png",
    });
    expect(hooks.excerpt).toBe("手动摘要");
    expect(hooks.coverImage).toBe("https://x.com/manual.png");
  });

  it("入库钩子：缺省自动生成", () => {
    const hooks = applyContentHooks({
      contentType: "markdown",
      content: "![a](https://x.com/i.png)\n这是正文内容，足够生成摘要的一段文字。",
    });
    expect(hooks.coverImage).toBe("https://x.com/i.png");
    expect(hooks.excerpt).toContain("这是正文内容");
  });

  it("净化：script 与事件属性被移除", () => {
    const dirty = '<p onclick="alert(1)">ok</p><script>alert(1)</script>';
    const clean = sanitizeRichContent(dirty);
    expect(clean).not.toContain("script");
    expect(clean).not.toContain("onclick");
    expect(clean).toContain("ok");
  });

  it("净化：实体编码 javascript: 被拦截（P0 回归）", () => {
    for (const dirty of [
      '<a href="jav&#x09;ascript:alert(1)">click</a>',
      '<a href="&#106;avascript:alert(1)">click</a>',
      '<a href="java&Tab;script:alert(1)">click</a>',
      '<a href="JaVaScRiPt:alert(1)">click</a>',
    ]) {
      expect(sanitizeRichContent(dirty)).toContain("#blocked");
    }
  });

  it("净化：https 链接放行", () => {
    expect(sanitizeRichContent('<a href="https://example.com">x</a>')).toContain(
      'href="https://example.com"'
    );
  });

  it("净化：保留 pre 内部空白（不压平代码块）", () => {
    expect(sanitizeRichContent("<pre>a\n  b</pre>")).toContain("a\n  b");
  });
});
