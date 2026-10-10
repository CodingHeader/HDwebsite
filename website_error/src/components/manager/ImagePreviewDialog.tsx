"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, X } from "lucide-react";

interface ImagePreviewDialogProps {
  open: boolean;
  src: string;
  alt?: string;
  filename?: string;
  size?: string;
  onClose: () => void;
}

export function ImagePreviewDialog({
  open,
  src,
  alt = "预览",
  filename,
  size,
  onClose,
}: ImagePreviewDialogProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="bg-[#161922] border-white/[0.06] text-white max-w-3xl p-0 overflow-hidden">
        <DialogTitle className="sr-only">图片预览</DialogTitle>
        <div className="relative flex flex-col items-center justify-center min-h-[200px] p-4">
          <button
            onClick={onClose}
            className="absolute top-2 right-2 z-10 p-1 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>

          {loading && !error && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          )}

          {error ? (
            <div className="text-gray-400 text-sm">图片加载失败</div>
          ) : (
            <img
              src={src}
              alt={alt}
              className="max-w-full max-h-[70vh] object-contain rounded"
              onLoad={() => setLoading(false)}
              onError={() => { setLoading(false); setError(true); }}
            />
          )}
        </div>

        {(filename || size) && (
          <div className="px-4 py-3 border-t border-white/[0.06] flex items-center justify-between text-sm">
            <span className="text-gray-300 truncate max-w-[60%]">{filename || alt}</span>
            {size && <span className="text-gray-500">{size}</span>}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
