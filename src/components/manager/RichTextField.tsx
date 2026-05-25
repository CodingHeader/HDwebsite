"use client";

/**
 * RichTextField - 富文本编辑器平台组件
 *
 * 基于TipTap，支持：
 * - 基本格式：粗体/斜体/下划线/删除线
 * - 标题：H1-H4
 * - 列表：有序/无序
 * - 对齐：左/中/右/两端
 * - 链接：添加/编辑/删除
 * - 图片：插入（使用ImageField选择）
 * - 引用块
 *
 * 执行逻辑6步：
 * 1. 触发：文章编辑页面加载
 * 2. 路由：组件初始化TipTap编辑器
 * 3. 处理：工具栏点击→exec命令→更新HTML
 * 4. 请求：onChange输出HTML给父组件
 * 5. 数据库：文章content字段存储HTML
 * 6. 响应：父组件保存到API
 */

import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import TextAlign from "@tiptap/extension-text-align";
import Placeholder from "@tiptap/extension-placeholder";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Quote,
  Link as LinkIcon,
  Image as ImageIcon,
  Undo,
  Redo,
  Code,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ImageField } from "./ImageField";
import { Input } from "@/components/ui/input";

interface RichTextFieldProps {
  value?: string | object;
  onChange: (content: string) => void;
  outputFormat?: 'html' | 'json';
  placeholder?: string;
  className?: string;
  minHeight?: string;
}

export function RichTextField({
  value = "",
  onChange,
  outputFormat = 'html',
  placeholder = "请输入内容...",
  className,
  minHeight = "300px",
}: RichTextFieldProps) {
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");

  const normalizedContent = typeof value === "string" ? value : JSON.stringify(value);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4] },
        // StarterKit 3.x 已内置 underline/link，禁用后再加载定制配置版本
        link: false,
        underline: false,
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        autolink: true,
      }),
      Image.configure({
        allowBase64: true,
      }),
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      Placeholder.configure({
        placeholder,
      }),
    ],
    content: normalizedContent,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      const output = outputFormat === "json"
        ? JSON.stringify(editor.getJSON())
        : editor.getHTML();
      onChange(output);
    },
  });

  useEffect(() => {
    if (!editor) {
      return;
    }

    const current = outputFormat === "json"
      ? JSON.stringify(editor.getJSON())
      : editor.getHTML();

    if (current !== normalizedContent) {
      editor.commands.setContent(normalizedContent, { emitUpdate: false });
    }
  }, [editor, normalizedContent, outputFormat]);

  if (!editor) {
    return null;
  }

  const insertImage = (url: string) => {
    if (url) {
      editor.chain().focus().setImage({ src: url }).run();
    }
    setImageDialogOpen(false);
  };

  const insertLink = () => {
    if (linkUrl) {
      editor.chain().focus().setLink({ href: linkUrl }).run();
    }
    setLinkUrl("");
    setLinkDialogOpen(false);
  };

  return (
    <div className={cn("border border-white/[0.08] rounded-lg overflow-hidden bg-[#0f1117]", className)}>
      {/* 工具栏 */}
      <div className="flex flex-wrap items-center gap-1 p-2 border-b border-white/[0.06] bg-white/[0.03]">
        {/* 格式 */}
        <ToolbarGroup>
          <ToolbarButton
            editor={editor}
            command={() => editor.chain().focus().toggleBold().run()}
            isActive={editor.isActive("bold")}
            icon={<Bold className="h-4 w-4" />}
            title="粗体"
          />
          <ToolbarButton
            editor={editor}
            command={() => editor.chain().focus().toggleItalic().run()}
            isActive={editor.isActive("italic")}
            icon={<Italic className="h-4 w-4" />}
            title="斜体"
          />
          <ToolbarButton
            editor={editor}
            command={() => editor.chain().focus().toggleUnderline().run()}
            isActive={editor.isActive("underline")}
            icon={<UnderlineIcon className="h-4 w-4" />}
            title="下划线"
          />
          <ToolbarButton
            editor={editor}
            command={() => editor.chain().focus().toggleStrike().run()}
            isActive={editor.isActive("strike")}
            icon={<Strikethrough className="h-4 w-4" />}
            title="删除线"
          />
          <ToolbarButton
            editor={editor}
            command={() => editor.chain().focus().toggleCode().run()}
            isActive={editor.isActive("code")}
            icon={<Code className="h-4 w-4" />}
            title="代码"
          />
        </ToolbarGroup>

        <ToolbarDivider />

        {/* 标题 */}
        <ToolbarGroup>
          <ToolbarButton
            editor={editor}
            command={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            isActive={editor.isActive("heading", { level: 1 })}
            icon={<Heading1 className="h-4 w-4" />}
            title="标题1"
          />
          <ToolbarButton
            editor={editor}
            command={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            isActive={editor.isActive("heading", { level: 2 })}
            icon={<Heading2 className="h-4 w-4" />}
            title="标题2"
          />
          <ToolbarButton
            editor={editor}
            command={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            isActive={editor.isActive("heading", { level: 3 })}
            icon={<Heading3 className="h-4 w-4" />}
            title="标题3"
          />
          <ToolbarButton
            editor={editor}
            command={() => editor.chain().focus().toggleHeading({ level: 4 }).run()}
            isActive={editor.isActive("heading", { level: 4 })}
            icon={<Heading4 className="h-4 w-4" />}
            title="标题4"
          />
        </ToolbarGroup>

        <ToolbarDivider />

        {/* 列表 */}
        <ToolbarGroup>
          <ToolbarButton
            editor={editor}
            command={() => editor.chain().focus().toggleBulletList().run()}
            isActive={editor.isActive("bulletList")}
            icon={<List className="h-4 w-4" />}
            title="无序列表"
          />
          <ToolbarButton
            editor={editor}
            command={() => editor.chain().focus().toggleOrderedList().run()}
            isActive={editor.isActive("orderedList")}
            icon={<ListOrdered className="h-4 w-4" />}
            title="有序列表"
          />
        </ToolbarGroup>

        <ToolbarDivider />

        {/* 对齐 */}
        <ToolbarGroup>
          <ToolbarButton
            editor={editor}
            command={() => editor.chain().focus().setTextAlign("left").run()}
            isActive={editor.isActive({ textAlign: "left" })}
            icon={<AlignLeft className="h-4 w-4" />}
            title="左对齐"
          />
          <ToolbarButton
            editor={editor}
            command={() => editor.chain().focus().setTextAlign("center").run()}
            isActive={editor.isActive({ textAlign: "center" })}
            icon={<AlignCenter className="h-4 w-4" />}
            title="居中"
          />
          <ToolbarButton
            editor={editor}
            command={() => editor.chain().focus().setTextAlign("right").run()}
            isActive={editor.isActive({ textAlign: "right" })}
            icon={<AlignRight className="h-4 w-4" />}
            title="右对齐"
          />
          <ToolbarButton
            editor={editor}
            command={() => editor.chain().focus().setTextAlign("justify").run()}
            isActive={editor.isActive({ textAlign: "justify" })}
            icon={<AlignJustify className="h-4 w-4" />}
            title="两端对齐"
          />
        </ToolbarGroup>

        <ToolbarDivider />

        {/* 其他 */}
        <ToolbarGroup>
          <ToolbarButton
            editor={editor}
            command={() => editor.chain().focus().toggleBlockquote().run()}
            isActive={editor.isActive("blockquote")}
            icon={<Quote className="h-4 w-4" />}
            title="引用"
          />
          <ToolbarButton
            editor={editor}
            command={() => setLinkDialogOpen(true)}
            isActive={editor.isActive("link")}
            icon={<LinkIcon className="h-4 w-4" />}
            title="链接"
          />
          <ToolbarButton
            editor={editor}
            command={() => setImageDialogOpen(true)}
            isActive={false}
            icon={<ImageIcon className="h-4 w-4" />}
            title="插入图片"
          />
        </ToolbarGroup>

        <ToolbarDivider />

        {/* 撤销重做 */}
        <ToolbarGroup>
          <ToolbarButton
            editor={editor}
            command={() => editor.chain().focus().undo().run()}
            isActive={false}
            icon={<Undo className="h-4 w-4" />}
            title="撤销"
            disabled={!editor.can().undo()}
          />
          <ToolbarButton
            editor={editor}
            command={() => editor.chain().focus().redo().run()}
            isActive={false}
            icon={<Redo className="h-4 w-4" />}
            title="重做"
            disabled={!editor.can().redo()}
          />
        </ToolbarGroup>
      </div>

      {/* 编辑区 - 深色主题适配 */}
      <div
        className="p-4 prose prose-sm prose-invert max-w-none focus:outline-none tiptap-editor-dark"
        style={{ minHeight }}
      >
        <EditorContent editor={editor} />
      </div>

      {/* 图片选择对话框 */}
      <Dialog open={imageDialogOpen} onOpenChange={setImageDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>插入图片</DialogTitle>
            <DialogDescription>选择或上传要插入的图片</DialogDescription>
          </DialogHeader>
          <ImageField
            value=""
            onChange={insertImage}
            placeholder="选择或上传图片"
          />
        </DialogContent>
      </Dialog>

      {/* 链接对话框 */}
      <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>添加链接</DialogTitle>
            <DialogDescription>输入链接地址并确认插入</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="https://example.com"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && insertLink()}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setLinkDialogOpen(false)}>
                取消
              </Button>
              <Button onClick={insertLink} className="bg-red-600 hover:bg-red-700">
                确认
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── 工具栏子组件 ────────────────────────────────────

function ToolbarGroup({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center gap-0.5">{children}</div>;
}

function ToolbarDivider() {
  return <div className="w-px h-6 bg-white/[0.08] mx-1" />;
}

interface ToolbarButtonProps {
  editor: Editor;
  command: () => void;
  isActive: boolean;
  icon: React.ReactNode;
  title: string;
  disabled?: boolean;
}

function ToolbarButton({
  editor,
  command,
  isActive,
  icon,
  title,
  disabled = false,
}: ToolbarButtonProps) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={command}
      disabled={disabled}
      className={cn(
        "h-8 w-8 p-0 text-gray-400 hover:text-white hover:bg-white/[0.08]",
        isActive && "bg-red-500/20 text-red-400 hover:bg-red-500/25 hover:text-red-300",
        disabled && "opacity-50 cursor-not-allowed"
      )}
      title={title}
    >
      {icon}
    </Button>
  );
}
