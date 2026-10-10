"use client";

/**
 * ImageField - 平台化图片字段组件
 *
 * 统一三种模式：
 * 1. Upload - 本地上传（使用统一upload-service）
 * 2. Select - 从媒体库选择
 * 3. URL - 外部URL兜底
 *
 * 执行逻辑6步：
 * 1. 触发：表单图片字段点击
 * 2. 路由：切换Tab（upload/select/url）
 * 3. 处理：根据模式执行不同操作
 * 4. 请求：POST /api/upload 或 GET /api/v2/media 或直接输入
 * 5. 数据库：Media表（上传/选择时）
 * 6. 响应：返回URL给onChange
 */

import { useState, useCallback, useEffect } from "react";
import { Upload, X, Loader2, ImageIcon, Link, Grid, Search, Check, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { managerFetch } from "@/lib/manager-fetch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

interface MediaItem {
  id: number;
  url: string;
  filename: string;
  size: number;
  createdAt: string;
  missing?: boolean;
}

interface ImageFieldProps {
  value?: string;
  onChange: (url: string) => void;
  placeholder?: string;
  className?: string;
  accept?: string;
  showModeTabs?: boolean; // 是否显示模式切换Tab
}

export function ImageField({
  value,
  onChange,
  placeholder = "添加图片",
  className,
  accept = "image/jpeg,image/png,image/gif,image/webp",
  showModeTabs = true,
}: ImageFieldProps) {
  const [error, setError] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [previewBroken, setPreviewBroken] = useState(false);
  const preview = value || "";
  // 使用 key 策略替代 useEffect 中的 setState，避免级联渲染警告
  const previewKey = preview || "";

  const handleRemove = () => {
    setError("");
    setPreviewBroken(false);
    onChange("");
  };

  const handleSelect = (url: string) => {
    setError("");
    setPreviewBroken(false);
    onChange(url);
    setDialogOpen(false);
  };

  return (
    <div className={cn("space-y-2", className)}>
      {preview && !previewBroken ? (
        <div className="relative group">
          <div className="rounded-lg overflow-hidden border border-white/[0.08] bg-white/[0.04]">
            <img
              key={previewKey}
              src={preview}
              alt="预览"
              className="w-full h-40 object-contain"
              onError={() => {
                setPreviewBroken(true);
                setError("图片加载失败");
              }}
            />
          </div>
          <button
            type="button"
            onClick={handleRemove}
            className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="absolute bottom-2 left-2 right-2 text-xs text-gray-300 bg-black/60 backdrop-blur-sm px-2 py-1 rounded truncate opacity-0 group-hover:opacity-100 transition-opacity">
            {preview.startsWith("http") ? preview.split("/").pop() : preview}
          </div>
        </div>
      ) : (
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <div
              className={cn(
                "relative border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
                "border-white/[0.12] hover:border-red-400/60 hover:bg-red-500/[0.05]"
              )}
            >
              <div className="flex flex-col items-center gap-2">
                <div className="p-2 rounded-full bg-red-500/10">
                  <ImageIcon className="h-5 w-5 text-red-400" />
                </div>
                <span className="text-sm font-medium text-gray-200">{placeholder}</span>
                <span className="text-xs text-gray-500">点击选择上传方式</span>
              </div>
            </div>
          </DialogTrigger>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>选择图片</DialogTitle>
              <DialogDescription>请从本地上传、媒体库或外部链接中选择图片</DialogDescription>
            </DialogHeader>
            <ImageFieldSelector
              accept={accept}
              onSelect={handleSelect}
              showModeTabs={showModeTabs}
            />
          </DialogContent>
        </Dialog>
      )}

      {error && (
        <p className="text-sm text-red-500 flex items-center gap-1">
          <X className="h-3 w-3" />
          {error}
        </p>
      )}
    </div>
  );
}

// ─── 选择器组件（内部）──────────────────────────────────

interface ImageFieldSelectorProps {
  accept: string;
  onSelect: (url: string) => void;
  showModeTabs: boolean;
}

function ImageFieldSelector({ accept, onSelect, showModeTabs }: ImageFieldSelectorProps) {
  const [activeTab, setActiveTab] = useState("upload");

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="grid h-auto w-full grid-cols-3 gap-2">
        <TabsTrigger value="upload" className="h-10 min-h-10 flex-none items-center gap-2 px-3 py-2">
          <Upload className="h-4 w-4" />
          本地上传
        </TabsTrigger>
        <TabsTrigger value="select" className="h-10 min-h-10 flex-none items-center gap-2 px-3 py-2">
          <Grid className="h-4 w-4" />
          媒体库
        </TabsTrigger>
        <TabsTrigger value="url" className="h-10 min-h-10 flex-none items-center gap-2 px-3 py-2">
          <Link className="h-4 w-4" />
          外部链接
        </TabsTrigger>
      </TabsList>

      <TabsContent value="upload" className="mt-4">
        <UploadTab accept={accept} onSelect={onSelect} />
      </TabsContent>

      <TabsContent value="select" className="mt-4">
        <MediaLibraryTab onSelect={onSelect} />
      </TabsContent>

      <TabsContent value="url" className="mt-4">
        <UrlTab onSelect={onSelect} />
      </TabsContent>
    </Tabs>
  );
}

// ─── 上传Tab ──────────────────────────────────────────

function UploadTab({ accept, onSelect }: { accept: string; onSelect: (url: string) => void }) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState("");

  const handleFile = useCallback(
    async (file: File) => {
      setError("");
      setIsUploading(true);

      try {
        const formData = new FormData();
        formData.append("file", file);

        const response = await managerFetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.message || "上传失败");
        }

        const url = result.data?.url;
        if (!url) {
          throw new Error("上传成功但未返回图片地址");
        }

        onSelect(url);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "上传失败";
        setError(msg);
      } finally {
        setIsUploading(false);
      }
    },
    [onSelect]
  );

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  return (
    <div className="space-y-4">
      <label
        htmlFor="imagefield-file-upload"
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        className={cn(
          "block border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors",
          "border-white/[0.12] hover:border-red-400/60 hover:bg-red-500/[0.05]",
          isUploading && "pointer-events-none opacity-60"
        )}
      >
        <input
          id="imagefield-file-upload"
          type="file"
          accept={accept}
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          className="hidden"
        />
        {isUploading ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 text-red-400 animate-spin" />
            <span className="text-sm text-gray-400">上传中...</span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <div className="p-4 rounded-full bg-red-500/10">
              <Upload className="h-8 w-8 text-red-400" />
            </div>
            <span className="text-sm font-medium text-gray-200">点击或拖拽上传图片</span>
            <span className="text-xs text-gray-500">支持 JPG、PNG、GIF、WebP，最大 5MB</span>
          </div>
        )}
      </label>

      {error && <p className="text-sm text-red-400 text-center">{error}</p>}
    </div>
  );
}

// ─── 媒体库Tab ────────────────────────────────────────

function MediaLibraryTab({ onSelect }: { onSelect: (url: string) => void }) {
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let isMounted = true;

    const loadMedia = async () => {
      setLoading(true);

      try {
        const res = await managerFetch("/api/media");
        const result = await res.json();

        if (isMounted && result.code === 200) {
          setMedia(result.data?.items || []);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void loadMedia();

    return () => {
      isMounted = false;
    };
  }, []);

  const filteredMedia = media.filter((m) =>
    m.filename.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="搜索媒体文件..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <ScrollArea className="h-80">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-6 w-6 animate-spin text-red-500" />
          </div>
        ) : filteredMedia.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <ImageIcon className="h-12 w-12 mb-2" />
            <p>暂无媒体文件</p>
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-3 p-1">
            {filteredMedia.map((item) => (
              <div
                key={item.id}
                onClick={() => {
                  if (!item.missing) {
                    onSelect(item.url);
                  }
                }}
                className={cn(
                  "relative group rounded-lg overflow-hidden border transition-colors",
                  item.missing
                    ? "cursor-not-allowed border-amber-500/40 bg-amber-500/5 opacity-80"
                    : "cursor-pointer border-white/[0.08] hover:border-red-400/60"
                )}
              >
                {item.missing ? (
                  <div className="flex h-24 w-full items-center justify-center bg-amber-500/10 px-2 text-center text-xs text-amber-300">
                    文件已丢失
                  </div>
                ) : (
                  <>
                    <img
                      src={item.url}
                      alt={item.filename}
                      className="w-full h-24 object-cover"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Check className="h-6 w-6 text-white" />
                    </div>
                  </>
                )}
                <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs px-2 py-1 truncate">
                  {item.filename}{item.missing ? "（已失效）" : ""}
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

// ─── URL Tab ──────────────────────────────────────────

function UrlTab({ onSelect }: { onSelect: (url: string) => void }) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");

  const handleConfirm = () => {
    if (!url.trim()) {
      setError("请输入图片URL");
      return;
    }
    if (!url.match(/^https?:\/\//)) {
      setError("请输入有效的URL（以http://或https://开头）");
      return;
    }
    onSelect(url.trim());
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-300">图片URL</label>
        <div className="flex gap-2">
          <Input
            placeholder="https://example.com/image.jpg"
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              setError("");
            }}
            onKeyDown={(e) => e.key === "Enter" && handleConfirm()}
          />
          <Button onClick={handleConfirm} className="bg-red-600 hover:bg-red-700">
            确认
          </Button>
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <p className="text-xs text-gray-500">支持外部图片链接，建议使用HTTPS</p>
      </div>

      {url && (
        <div className="rounded-lg border border-white/[0.08] p-4">
          <p className="text-sm text-gray-400 mb-2">预览：</p>
          <img
            src={url}
            alt="预览"
            className="max-h-40 object-contain mx-auto"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        </div>
      )}
    </div>
  );
}
