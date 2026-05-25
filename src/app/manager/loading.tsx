"use client";

import { Loader2 } from "lucide-react";

export default function ManagerLoading() {
  return (
    <div className="dark flex min-h-screen items-center justify-center bg-[#0f1117]">
      <div className="flex items-center gap-3 text-white/60">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span>加载中...</span>
      </div>
    </div>
  );
}
