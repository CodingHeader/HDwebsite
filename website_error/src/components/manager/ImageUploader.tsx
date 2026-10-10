/**
 * @deprecated 使用 ImageField 组件替代。此组件不再被任何页面引用。
 */
"use client";

import { useState, useRef, useCallback } from "react";
import { Upload, X, Loader2, ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface ImageUploaderProps {
  value?: string;
  onChange: (url: string) => void;
  placeholder?: string;
  className?: string;
  accept?: string;
}

export function ImageUploader({
  value,
  onChange,
  placeholder = "点击或拖拽上传图片",
  className,
  accept = "image/jpeg,image/png,image/gif,image/webp",
}: ImageUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [preview, setPreview] = useState(value || "");
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    async (file: File) => {
      setError("");
      setIsUploading(true);

      try {
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.message || "上传失败");
        }

        const url = result.data?.url || result.url;
        if (!url) {
          throw new Error("上传成功但未返回图片地址");
        }

        setPreview(url);
        onChange(url);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "上传失败";
        setError(msg);
        console.error("Upload error:", err);
      } finally {
        setIsUploading(false);
      }
    },
    [onChange]
  );

  const handleClick = () => {
    inputRef.current?.click();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
    // 重置input，允许重复选择同一文件
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleRemove = () => {
    setPreview("");
    setError("");
    onChange("");
  };

  // 同步外部value变化
  useState(() => {
    if (value !== undefined && value !== preview) {
      setPreview(value);
    }
  });

  return (
    <div className={cn("space-y-2", className)}>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleChange}
        className="hidden"
      />

      {preview ? (
        <div className="relative group">
          <div className="rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
            <img
              src={preview}
              alt="预览"
              className="w-full h-48 object-contain"
              onError={() => {
                setError("图片加载失败，请重新上传");
                setPreview("");
              }}
            />
          </div>
          <button
            type="button"
            onClick={handleRemove}
            className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
            title="删除图片"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="absolute bottom-2 left-2 right-2 text-xs text-gray-500 bg-white/90 px-2 py-1 rounded truncate opacity-0 group-hover:opacity-100 transition-opacity">
            {preview}
          </div>
        </div>
      ) : (
        <div
          onClick={handleClick}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          className={cn(
            "relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
            "border-gray-300 hover:border-red-400 hover:bg-red-50/50",
            isUploading && "pointer-events-none opacity-60"
          )}
        >
          {isUploading ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-8 w-8 text-red-500 animate-spin" />
              <span className="text-sm text-gray-500">上传中...</span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <div className="p-3 rounded-full bg-red-50">
                <ImageIcon className="h-6 w-6 text-red-500" />
              </div>
              <span className="text-sm font-medium text-gray-700">
                {placeholder}
              </span>
              <span className="text-xs text-gray-400">
                支持 JPG、PNG、GIF、WebP，最大 5MB
              </span>
            </div>
          )}
        </div>
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
