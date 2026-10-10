"use client";

import { cn } from "@/lib/utils";

interface ArticleContentProps {
  content: string | object;
  className?: string;
}

interface ContentMark {
  type?: string;
  attrs?: {
    href?: string;
    target?: string;
  };
}

interface ContentNode {
  type?: string;
  content?: ContentValue[];
  attrs?: {
    textAlign?: "left" | "center" | "right" | "justify";
    level?: number;
    src?: string;
    alt?: string;
  };
  text?: string;
  marks?: ContentMark[];
}

type ContentValue = string | ContentNode | ContentValue[] | null | undefined;

function isContentNode(value: ContentValue): value is ContentNode {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function ArticleContent({ content, className }: ArticleContentProps) {
  // Parse JSON content if it's a string
  let jsonContent: ContentValue;
  try {
    jsonContent = typeof content === 'string' ? JSON.parse(content) : content;
  } catch {
    // Fallback to HTML rendering if not valid JSON
    return (
      <div 
        className={cn("prose prose-lg max-w-none", className)}
        dangerouslySetInnerHTML={{ __html: String(content) }}
      />
    );
  }

  // Render JSON content safely
  return (
    <div className={cn("prose prose-lg max-w-none", className)}>
      {renderNode(jsonContent)}
    </div>
  );
}

function renderNode(node: ContentValue): React.ReactNode {
  if (!node) return null;
  
  if (typeof node === 'string') {
    return escapeHtml(node);
  }
  if (Array.isArray(node)) {
    return node.map((child, i) => <span key={i}>{renderNode(child)}</span>);
  }

  if (!isContentNode(node)) {
    return null;
  }

  const { type, content, attrs, text, marks } = node;

  // Text node
  if (text !== undefined) {
    let element: React.ReactNode = escapeHtml(text);
    
    if (marks) {
      marks.forEach((mark) => {
        switch (mark.type) {
          case 'bold':
          case 'strong':
            element = <strong key={mark.type}>{element}</strong>;
            break;
          case 'italic':
          case 'em':
            element = <em key={mark.type}>{element}</em>;
            break;
          case 'underline':
            element = <u key={mark.type}>{element}</u>;
            break;
          case 'strike':
            element = <s key={mark.type}>{element}</s>;
            break;
          case 'code':
            element = <code key={mark.type} className="bg-gray-100 px-1 rounded">{element}</code>;
            break;
          case 'link':
            const href = mark.attrs?.href || '#';
            // Validate URL
            const safeHref = href.startsWith('http') || href.startsWith('/') 
              ? href 
              : '#';
            element = (
              <a 
                key={mark.type} 
                href={safeHref}
                target={mark.attrs?.target || '_self'}
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                {element}
              </a>
            );
            break;
        }
      });
    }
    return element;
  }

  // Element nodes
  const children = content?.map((child, i: number) => (
    <span key={i}>{renderNode(child)}</span>
  ));

  switch (type) {
    case 'doc':
      return <>{children}</>;
    case 'paragraph':
      const align = attrs?.textAlign;
      return <p style={{ textAlign: align }} className="mb-4">{children}</p>;
    case 'heading':
      const level = attrs?.level || 1;
      const headings: Record<number, React.ReactNode> = {
        1: <h1 className="text-3xl font-bold mb-4 mt-6">{children}</h1>,
        2: <h2 className="text-2xl font-bold mb-4 mt-6">{children}</h2>,
        3: <h3 className="text-xl font-bold mb-4 mt-6">{children}</h3>,
        4: <h4 className="text-lg font-bold mb-4 mt-6">{children}</h4>,
      };
      return <>{headings[level] || headings[1]}</>;
    case 'bulletList':
      return <ul className="list-disc pl-6 mb-4 space-y-1">{children}</ul>;
    case 'orderedList':
      return <ol className="list-decimal pl-6 mb-4 space-y-1">{children}</ol>;
    case 'listItem':
      return <li>{children}</li>;
    case 'blockquote':
      return <blockquote className="border-l-4 border-gray-300 pl-4 italic my-4">{children}</blockquote>;
    case 'codeBlock':
      return <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto mb-4"><code>{children}</code></pre>;
    case 'image':
      const src = attrs?.src || '';
      const alt = escapeHtml(attrs?.alt || '');
      // Only allow http/https URLs
      const safeSrc = src.startsWith('http') || src.startsWith('/') ? src : '';
      return safeSrc ? (
        <img 
          src={safeSrc} 
          alt={alt} 
          className="max-w-full h-auto rounded-lg my-4"
          loading="lazy"
        />
      ) : null;
    case 'hardBreak':
      return <br />;
    case 'horizontalRule':
      return <hr className="my-6 border-gray-200" />;
    default:
      return <>{children}</>;
  }
}

// Basic HTML escaping for text content
function escapeHtml(text: string): string {
  const div = typeof document !== 'undefined' ? document.createElement('div') : null;
  if (div) {
    div.textContent = text;
    return div.innerHTML;
  }
  // Server-side fallback
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
