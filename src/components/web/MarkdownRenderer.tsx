/**
 * MarkdownRenderer（SOL-001）：服务端渲染 markdown，GFM + 代码高亮 + 图片懒加载
 */
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";

export function MarkdownRenderer({ content }: { content: string }) {
  return (
    <div className="prose-hd">
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
