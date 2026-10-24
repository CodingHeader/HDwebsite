/**
 * ContentMarkdown（V11-HUB-01）：管理端内容预览渲染。
 * 与前台 MarkdownRenderer（SOL-001）同一管线（react-markdown + GFM + 代码高亮），
 * 管理端不直接引用 web 组件（隔离约定），此处为同管线的管理端壳。
 * html 型内容经 sanitizeRichContent 净化后渲染（REQ-NF-002：富内容出口必经净化）。
 */
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { sanitizeRichContent } from "@/lib/markdown";

export function ContentMarkdown({ content, contentType }: { content: string; contentType: string }) {
  if (contentType === "html") {
    return (
      <div className="prose-hd max-w-none" data-testid="content-markdown-html">
        <div dangerouslySetInnerHTML={{ __html: sanitizeRichContent(content) }} />
      </div>
    );
  }
  return (
    <div className="prose-hd max-w-none" data-testid="content-markdown-md">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          img: (props) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img {...props} loading="lazy" alt={props.alt ?? ""} />
          ),
          a: (props) => (
            <a {...props} target="_blank" rel="noopener noreferrer">
              {props.children}
            </a>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
