"use client";

/**
 * RichTextEditorCore（A-05 懒加载拆分）：TipTap 富文本编辑器主体（仅编辑时动态加载）。
 * 标题/加粗/斜体/下划线/删除线/列表/引用/对齐/链接/图片（从媒体库选择或上传）/撤销重做。
 * 输出 HTML；提交前由 SchemaForm 统一 sanitizeRichContent 净化（REQ-NF-002）。
 * 由 RichTextField 以 next/dynamic(ssr:false) 包装——/manager 首屏包体不因 TipTap 增长。
 */
import { useEffect, useState } from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import TextAlign from "@tiptap/extension-text-align";
import Underline from "@tiptap/extension-underline";
import Placeholder from "@tiptap/extension-placeholder";
import {
  AlignCenter, AlignLeft, AlignRight, Bold, Heading2, Heading3, Image as ImageIcon, Italic, Link as LinkIcon,
  List, ListOrdered, Quote, Redo, Strikethrough, Underline as UnderlineIcon, Undo,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { MediaPicker } from "./MediaPicker";
import { promptDialog } from "@/components/manager/feedback/ConfirmDialog";

function Tool({ label, active, onClick, disabled, children }: { label: string; active?: boolean; onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={active}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex h-8 w-8 items-center justify-center rounded text-mgr-muted-fg transition-colors hover:bg-mgr-subtle hover:text-mgr-fg disabled:pointer-events-none disabled:opacity-50",
        active && "bg-mgr-primary-soft text-mgr-primary"
      )}
    >
      {children}
    </button>
  );
}

function Toolbar({ editor, onImage }: { editor: Editor; onImage: () => void }) {
  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-mgr-border px-2 py-1.5" role="toolbar" aria-label="富文本工具栏">
      <Tool label="标题二" active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
        <Heading2 />
      </Tool>
      <Tool label="标题三" active={editor.isActive("heading", { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
        <Heading3 />
      </Tool>
      <span className="mx-1 h-5 w-px bg-mgr-border" aria-hidden="true" />
      <Tool label="加粗" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}>
        <Bold />
      </Tool>
      <Tool label="斜体" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}>
        <Italic />
      </Tool>
      <Tool label="下划线" active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()}>
        <UnderlineIcon />
      </Tool>
      <Tool label="删除线" active={editor.isActive("strike")} onClick={() => editor.chain().focus().toggleStrike().run()}>
        <Strikethrough />
      </Tool>
      <span className="mx-1 h-5 w-px bg-mgr-border" aria-hidden="true" />
      <Tool label="无序列表" active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()}>
        <List />
      </Tool>
      <Tool label="有序列表" active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
        <ListOrdered />
      </Tool>
      <Tool label="引用" active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
        <Quote />
      </Tool>
      <span className="mx-1 h-5 w-px bg-mgr-border" aria-hidden="true" />
      <Tool label="左对齐" active={editor.isActive({ textAlign: "left" })} onClick={() => editor.chain().focus().setTextAlign("left").run()}>
        <AlignLeft />
      </Tool>
      <Tool label="居中" active={editor.isActive({ textAlign: "center" })} onClick={() => editor.chain().focus().setTextAlign("center").run()}>
        <AlignCenter />
      </Tool>
      <Tool label="右对齐" active={editor.isActive({ textAlign: "right" })} onClick={() => editor.chain().focus().setTextAlign("right").run()}>
        <AlignRight />
      </Tool>
      <span className="mx-1 h-5 w-px bg-mgr-border" aria-hidden="true" />
      <Tool label="链接" active={editor.isActive("link")} onClick={() => {
        const url = editor.getAttributes("link").href as string | undefined;
        if (url) {
          editor.chain().focus().extendMarkRange("link").unsetLink().run();
          return;
        }
        void promptDialog({
          title: "插入链接",
          label: "链接地址",
          placeholder: "https://…",
          confirmText: "插入",
        }).then((href) => {
          if (href) editor.chain().focus().setLink({ href }).run();
        });
      }}>
        <LinkIcon />
      </Tool>
      <Tool label="图片（媒体库）" onClick={onImage}>
        <ImageIcon />
      </Tool>
      <span className="mx-1 h-5 w-px bg-mgr-border" aria-hidden="true" />
      <Tool label="撤销" onClick={() => editor.chain().focus().undo().run()}>
        <Undo />
      </Tool>
      <Tool label="重做" onClick={() => editor.chain().focus().redo().run()}>
        <Redo />
      </Tool>
    </div>
  );
}

/** TipTap 编辑器主体（仅编辑时经 next/dynamic 加载） */
export default function EditorCore({
  id,
  value,
  onChange,
  placeholder = "开始输入正文…",
  invalid,
  describedBy,
}: {
  id: string;
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  invalid?: boolean;
  describedBy?: string;
}) {
  const [picking, setPicking] = useState(false);
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3, 4] }, link: false, underline: false }),
      Underline,
      Link.configure({ openOnClick: false, autolink: true }),
      Image,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Placeholder.configure({ placeholder }),
    ],
    content: value || "",
    editorProps: {
      attributes: {
        id,
        role: "textbox",
        "aria-multiline": "true",
        ...(invalid ? { "aria-invalid": "true" } : {}),
        ...(describedBy ? { "aria-describedby": describedBy } : {}),
        class: "prose-mgr min-h-[260px] max-h-[520px] overflow-y-auto px-4 py-3 text-[14px] leading-7 outline-none",
      },
    },
    onUpdate: ({ editor: ed }) => onChange(ed.isEmpty ? "" : ed.getHTML()),
  });

  // 外部值变化（如加载详情后回填）时同步编辑器内容
  useEffect(() => {
    if (!editor) return;
    const current = editor.isEmpty ? "" : editor.getHTML();
    if ((value || "") !== current) editor.commands.setContent(value || "", { emitUpdate: false });
  }, [value, editor]);

  return (
    <div
      className={cn(
        "overflow-hidden rounded-mgr-control border bg-mgr-surface shadow-mgr-sm focus-within:border-mgr-primary focus-within:ring-2 focus-within:ring-mgr-primary/20",
        invalid ? "border-mgr-danger" : "border-mgr-border"
      )}
      data-testid="richtext"
    >
      {editor && <Toolbar editor={editor} onImage={() => setPicking(true)} />}
      <EditorContent editor={editor} />
      <MediaPicker
        open={picking}
        onClose={() => setPicking(false)}
        onPick={(url) => {
          editor?.chain().focus().setImage({ src: url }).run();
          setPicking(false);
        }}
      />
    </div>
  );
}
