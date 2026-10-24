/**
 * XSS Filter - HTML内容安全过滤模块
 *
 * 采用白名单策略，只允许安全的HTML标签和属性。
 * 服务端和客户端均可使用。
 *
 * 使用场景：
 * 1. 富文本编辑器内容保存前过滤（API层）
 * 2. 前台页面渲染富文本内容时过滤
 * 3. RSS/API输出时过滤
 */

// 允许的标签白名单
const ALLOWED_TAGS = new Set([
  // 文本格式
  "p", "br", "hr",
  "b", "strong", "i", "em", "u", "s", "strike", "del",
  "span", "mark", "small", "sub", "sup",
  "code", "pre", "blockquote", "q", "cite",

  // 标题
  "h1", "h2", "h3", "h4", "h5", "h6",

  // 列表
  "ul", "ol", "li", "dl", "dt", "dd",

  // 表格
  "table", "thead", "tbody", "tfoot", "tr", "th", "td", "caption",

  // 媒体
  "img", "figure", "figcaption",

  // 链接
  "a",

  // 布局
  "div", "section", "article", "aside", "header", "footer", "main", "nav",
]);

// 允许的属性白名单（按标签）
const ALLOWED_ATTRS: Record<string, Set<string>> = {
  "*": new Set(["class", "id", "style", "dir", "lang", "title"]),
  a: new Set(["href", "target", "rel", "download"]),
  img: new Set(["src", "alt", "title", "width", "height", "loading"]),
  table: new Set(["border", "cellpadding", "cellspacing", "width"]),
  th: new Set(["colspan", "rowspan", "scope"]),
  td: new Set(["colspan", "rowspan"]),
  ol: new Set(["start", "type", "reversed"]),
  ul: new Set(["type"]),
  blockquote: new Set(["cite"]),
  q: new Set(["cite"]),
  pre: new Set(["class"]),
  code: new Set(["class"]),
};

// 安全 scheme 白名单：解码后仍带 scheme 的 URL 必须命中其一，否则 #blocked
const SAFE_PROTOCOLS = /^(https?:|mailto:)/i;

// 事件处理器属性正则
const EVENT_HANDLER_ATTR = /^on/i;

// CSS危险值正则
const DANGEROUS_CSS = /(expression|javascript|vbscript|data:|@import)/i;

/**
 * HTML 实体解码（防御 &#x6A;avascript: / java&Tab;script: 等编码绕过）：
 * 覆盖 &#xHH; / &#DDD; 与常见命名实体（colon/Tab/NewLine/sol 等）。
 */
export function decodeHtmlEntities(input: string): string {
  const NAMED: Record<string, string> = {
    colon: ":",
    Tab: "\t",
    NewLine: "\n",
    sol: "/",
    semi: ";",
    lpar: "(",
    rpar: ")",
    amp: "&",
    lt: "<",
    gt: ">",
    quot: '"',
    apos: "'",
  };
  return input
    .replace(/&#x([0-9a-f]+);?/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);?/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/&([a-zA-Z][a-zA-Z0-9]*);/g, (m, name) => NAMED[name] ?? m);
}

/**
 * 检查URL是否安全（P0 修复：先实体解码 + 去除 scheme 内空白/控制字符，再做白名单判定）
 */
function isSafeUrl(url: string): boolean {
  if (!url) return true;
  const decoded = decodeHtmlEntities(url)
    .replace(/[\x00-\x20\x7f]/g, "")
    .toLowerCase();
  const schemeMatch = decoded.match(/^([a-z][a-z0-9+.-]*):/);
  if (!schemeMatch) return true; // 相对路径/锚点
  if (SAFE_PROTOCOLS.test(schemeMatch[0])) return true;
  return false; // 其余一切 scheme（javascript/data/vbscript/file/about/未知）一律拦截
}

/**
 * 清理属性值
 */
function sanitizeAttrValue(tag: string, attr: string, value: string): string | null {
  // 去除null字节和控制字符
  value = value.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, "");

  // 事件处理器直接移除
  if (EVENT_HANDLER_ATTR.test(attr)) {
    return null;
  }

  // href/src 检查协议
  if ((attr === "href" || attr === "src") && !isSafeUrl(value)) {
    return "#blocked";
  }

  // style检查危险CSS
  if (attr === "style" && DANGEROUS_CSS.test(value)) {
    return null;
  }

  return value;
}

/**
 * 服务端安全过滤：基于正则
 * 适用于API层保存前的过滤
 *
 * V11-SEC-01 修复：改为主扫描——只有"完整成形且命中白名单"的标签会被重建输出，
 * 两次匹配之间的残余文本里的一切 `<` 一律转义为 &lt;。旧实现用 replace 只处理
 * 匹配项、不处理残余段，导致不闭合标签（如 `<img onerror=alert(1)`，无 `>`）
 * 原样放行——浏览器会借用后续合法标签的 `>` 把它拼成真标签（借闭包 XSS）。
 */
export function sanitizeHtmlServer(html: string): string {
  if (!html) return "";

  // 1. 移除script/style标签及其内容
  html = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
  html = html.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "");

  // 2. 移除注释
  html = html.replace(/<!--[\s\S]*?-->/g, "");

  // 3. 主扫描：逐个成形标签 → 白名单重建；残余文本 → 转义 <（借闭包修复）
  const tagRe = /<\/?([a-zA-Z][a-zA-Z0-9]*)\b[^>]*>/g;
  const escapeResidual = (t: string) => t.replace(/</g, "&lt;");
  let out = "";
  let last = 0;
  for (let m = tagRe.exec(html); m !== null; m = tagRe.exec(html)) {
    out += escapeResidual(html.slice(last, m.index));
    out += sanitizeTag(m[0], m[1]);
    last = m.index + m[0].length;
  }
  out += escapeResidual(html.slice(last));
  html = out;

  // 4. 收敛标签间空白（保留文本节点内部空白，避免破坏 <pre>/<code> 排版）
  html = html.replace(/>\s+</g, "><").trim();

  return html;
}

/** 单个成形标签的白名单重建（V11-SEC-01：自 replace 回调抽出，逻辑不变） */
function sanitizeTag(match: string, tagName: string): string {
  const tag = tagName.toLowerCase();

  // 不在白名单的标签直接移除（保留内容）
  if (!ALLOWED_TAGS.has(tag)) {
    // 如果是自闭合或结束标签，直接移除
    if (match.startsWith("</")) return "";
    return " "; // 替换为空格，避免单词粘连
  }

  // 解析属性
  const attrRegex = /\s([a-zA-Z_:][-a-zA-Z0-9_:.]*)=(?:"([^"]*)"|'([^']*)'|([^\s>]*))/g;
  let sanitizedAttrs = "";
  let attrMatch;

  while ((attrMatch = attrRegex.exec(match)) !== null) {
    const attrName = attrMatch[1].toLowerCase();
    const attrValue = attrMatch[2] ?? attrMatch[3] ?? attrMatch[4] ?? "";

    // 检查全局允许的属性
    const globalAllowed = ALLOWED_ATTRS["*"]?.has(attrName) ?? false;
    const tagAllowed = ALLOWED_ATTRS[tag]?.has(attrName) ?? false;

    if (!globalAllowed && !tagAllowed) continue;

    // 清理属性值
    const cleanValue = sanitizeAttrValue(tag, attrName, attrValue);
    if (cleanValue !== null) {
      sanitizedAttrs += ` ${attrName}="${cleanValue.replace(/"/g, "&quot;")}"`;
    }
  }

  if (match.startsWith("</")) {
    return `</${tag}>`;
  }

  // 自闭合标签处理
  const selfClosing = ["img", "br", "hr"].includes(tag);
  if (selfClosing) {
    return `<${tag}${sanitizedAttrs} />`;
  }

  return `<${tag}${sanitizedAttrs}>`;
}

/**
 * 客户端安全过滤：基于DOM API（更精确）
 * 适用于浏览器端渲染前
 */
export function sanitizeHtmlClient(html: string): string {
  if (typeof window === "undefined") {
    return sanitizeHtmlServer(html);
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  function walk(node: Node): Node | null {
    if (node.nodeType === Node.TEXT_NODE) {
      return node.cloneNode(true);
    }

    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as HTMLElement;
      const tag = el.tagName.toLowerCase();

      // 不在白名单的标签 → unwrap（保留子节点）
      if (!ALLOWED_TAGS.has(tag)) {
        const fragment = document.createDocumentFragment();
        el.childNodes.forEach((child) => {
          const cleaned = walk(child);
          if (cleaned) fragment.appendChild(cleaned);
        });
        return fragment;
      }

      // 创建新元素（防止原型链污染）
      const newEl = document.createElement(tag);

      // 复制允许的属性
      const allowedAttrs = new Set([
        ...(ALLOWED_ATTRS["*"] || []),
        ...(ALLOWED_ATTRS[tag] || []),
      ]);

      Array.from(el.attributes).forEach((attr) => {
        const attrName = attr.name.toLowerCase();

        if (!allowedAttrs.has(attrName)) return;
        if (EVENT_HANDLER_ATTR.test(attrName)) return;

        const attrValue = attr.value;
        const cleanValue = sanitizeAttrValue(tag, attrName, attrValue);
        if (cleanValue !== null) {
          newEl.setAttribute(attrName, cleanValue);
        }
      });

      // 递归处理子节点
      el.childNodes.forEach((child) => {
        const cleaned = walk(child);
        if (cleaned) newEl.appendChild(cleaned);
      });

      return newEl;
    }

    return null;
  }

  const body = doc.body;
  const result = document.createElement("div");
  body.childNodes.forEach((child) => {
    const cleaned = walk(child);
    if (cleaned) result.appendChild(cleaned);
  });

  return result.innerHTML;
}

/**
 * 纯文本提取（用于摘要/预览）
 */
export function stripHtml(html: string): string {
  if (!html) return "";
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * 截断文本并添加省略号
 */
export function truncateText(text: string, maxLength: number): string {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength) + "...";
}

/**
 * 生成HTML摘要
 */
export function generateExcerpt(html: string, maxLength: number = 200): string {
  const plainText = stripHtml(html);
  return truncateText(plainText, maxLength);
}
