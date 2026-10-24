/**
 * V11-SEC-01：XSS 净化器对"不闭合标签"的放行缺陷回归测试。
 *
 * 缺陷（V1.1 审计 §安全.1，本文件 TDD 复现）：
 *   sanitizeHtmlServer 的标签正则 /<\/?tag\b[^>]*>/ 要求闭合 `>`，
 *   不闭合的 `<img onerror=alert(1)` 不匹配 → 原样进入输出；
 *   浏览器解析时会"借用"后续合法标签的 `>` 把它拼成真标签 → XSS。
 * 修复口径：白名单标签之外的一切残余 `<` 一律转义为 &lt;。
 */
import { describe, expect, it } from "vitest";
import { decodeHtmlEntities, sanitizeHtmlServer } from "@/lib/security/xss-filter";

describe("V11-SEC-01：不闭合标签/畸形输入", () => {
  it("不闭合的 <img onerror=...> 不再原样放行（借闭包攻击面）", () => {
    const out = sanitizeHtmlServer('<img onerror=alert(1)');
    // 安全语义：不允许出现任何"未转义"的标签形态；&lt;img onerror=… 是纯文本、无害
    expect(out).not.toMatch(/<img/i);
    expect(out).toContain("&lt;img");
    expect(out).not.toMatch(/<[^>]*onerror/i);
  });

  it("合法标签后跟不闭合标签：后文正常渲染，畸形部分被转义", () => {
    const out = sanitizeHtmlServer('<p>正文</p><img src=x onerror=alert(1)');
    expect(out).toContain("<p>正文</p>");
    expect(out).not.toMatch(/<img/i);
    expect(out).not.toMatch(/<[^>]*onerror/i);
  });

  it("借后续标签的 > 闭合：不产生可执行标签", () => {
    // 正则会把 `<img onerror=alert(1) <p>` 整体当一个 img 标签消费，
    // 重建时白名单剥掉 onerror → 输出 `<img />后文</p>`（安全；被吞的 <p> 开标签是排版小瑕疵非安全面）
    const out = sanitizeHtmlServer('<img onerror=alert(1) <p>后文</p>');
    expect(out).not.toMatch(/<[^>]*onerror/i);
    expect(out).not.toMatch(/<[^>]*(script|svg|iframe)/i);
    expect(out).toContain("后文");
  });

  it("非白名单标签（svg onload）整段拒绝且不残留事件属性", () => {
    const out = sanitizeHtmlServer('<svg onload=alert(1)>x</svg>');
    expect(out).not.toMatch(/onload|<svg/i);
  });

  it("残余 < 一律转义（文本中的 < 不再可能拼成标签）", () => {
    const out = sanitizeHtmlServer("a < b and <weird attrs here");
    expect(out).not.toMatch(/<(?!\/?(p|br|hr|b|strong|i|em|u|s|strike|del|span|mark|small|sub|sup|code|pre|blockquote|q|cite|h[1-6]|ul|ol|li|dl|dt|dd|table|thead|tbody|tfoot|tr|th|td|caption|img|figure|figcaption|a|div|section|article|aside|header|footer|main|nav)\b)/i);
  });

  it("合法富文本不回归（对齐既有净化口径）", () => {
    const html = '<p class="x">段</p><a href="https://e.com" target="_blank">链</a><img src="/uploads/a.png" alt="图" onerror="alert(1)"><table><tr><td colspan="2">t</td></tr></table>';
    const out = sanitizeHtmlServer(html);
    expect(out).toContain('<p class="x">段</p>');
    expect(out).toContain('href="https://e.com"');
    expect(out).toContain('<img src="/uploads/a.png" alt="图" />'); // onerror 被剥
    expect(out).toContain('colspan="2"');
    expect(out).not.toMatch(/onerror/i);
  });

  it("javascript: 与实体编码 scheme 仍被拦截（既有能力不回退）", () => {
    expect(sanitizeHtmlServer('<a href="javascript:alert(1)">x</a>')).toContain("#blocked");
    expect(sanitizeHtmlServer('<a href="&#x6A;avascript:alert(1)">x</a>')).toContain("#blocked");
    expect(decodeHtmlEntities("&#x3A;")).toBe(":");
  });
});
