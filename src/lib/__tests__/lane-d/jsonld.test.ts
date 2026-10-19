/**
 * D-15 单测：文章详情 NewsArticle JSON-LD 纯函数
 * - 字段齐全（headline、datePublished、dateModified、author、image、mainEntityOfPage）
 * - `</script>` 被转义，防 HTML 注入
 */
import { describe, expect, it } from "vitest";
import {
  buildArticleJsonLd,
  buildArticleJsonLdScript,
  escapeScriptClosing,
  type JsonLdArticleInput,
} from "@/app/(web)/articles/[id]/json-ld";

const BASE: JsonLdArticleInput = {
  id: 42,
  title: "弘道教育 2026 秋季招生简章",
  excerpt: "面向成人的学历提升项目",
  coverImage: "https://www.hd1994.com/uploads/cover-1.png",
  publishedAt: new Date("2026-09-01T08:00:00Z"),
  updatedAt: new Date("2026-09-10T10:00:00Z"),
  authorName: "教务中心",
  categoryName: "招生资讯",
};

describe("buildArticleJsonLd", () => {
  it("包含 NewsArticle 必需字段", () => {
    const d = buildArticleJsonLd(BASE);
    expect(d["@context"]).toBe("https://schema.org");
    expect(d["@type"]).toBe("NewsArticle");
    expect(d.headline).toBe(BASE.title);
    expect(d.mainEntityOfPage).toBe("/articles/42");
    expect(d.datePublished).toBe("2026-09-01T08:00:00.000Z");
    expect(d.dateModified).toBe("2026-09-10T10:00:00.000Z");
  });

  it("author 为 Person 且含 image 数组", () => {
    const d = buildArticleJsonLd(BASE);
    expect(d.author).toEqual([{ "@type": "Person", name: "教务中心" }]);
    expect(d.image).toEqual([BASE.coverImage]);
  });

  it("articleSection 用分类名", () => {
    const d = buildArticleJsonLd(BASE);
    expect(d.articleSection).toBe("招生资讯");
  });

  it("缺可选字段时不产生 undefined 键", () => {
    const d = buildArticleJsonLd({ id: 1, title: "标题" });
    expect(d.author).toBeUndefined();
    expect(d.image).toBeUndefined();
    expect(d.description).toBeUndefined();
    expect(JSON.stringify(d)).not.toContain('"undefined"');
  });

  it("无 publishedAt 时用 updatedAt 兜底", () => {
    const d = buildArticleJsonLd({
      id: 1,
      title: "T",
      publishedAt: null,
      updatedAt: new Date("2026-01-02T03:04:05Z"),
    });
    expect(d.datePublished).toBe("2026-01-02T03:04:05.000Z");
  });
});

describe("escapeScriptClosing", () => {
  it("转义 </ 防止提前闭合 script", () => {
    expect(escapeScriptClosing("</script>")).toBe("<\\/script>");
    expect(escapeScriptClosing("a<!--b")).toBe("a<\\!--b");
  });
});

describe("buildArticleJsonLdScript", () => {
  it("生成可解析 JSON，且不含未转义的 </script>", () => {
    const html = buildArticleJsonLdScript(BASE);
    expect(html).not.toContain("</script");
    const parsed = JSON.parse(html) as Record<string, unknown>;
    expect(parsed["@type"]).toBe("NewsArticle");
  });

  it("标题含 </script> 时不产生 HTML 注入", () => {
    const evil = buildArticleJsonLdScript({
      id: 99,
      title: 'x</script><script>alert(1)</script>',
    });
    expect(evil).not.toContain("</script");
    // 解析回来标题仍是原文
    const parsed = JSON.parse(evil) as Record<string, unknown>;
    expect(parsed.headline).toBe('x</script><script>alert(1)</script>');
  });
});