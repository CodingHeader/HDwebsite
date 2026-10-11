"use client";

/** 全局悬浮联系条（电话/微信/报名），点击行为计入 UserAction */
import { useState } from "react";

export function FloatingContact({ phone }: { phone: string }) {
  const [open, setOpen] = useState(false);
  const track = (target: string) => {
    window.__hdTrack?.submit(target, { source: "floating" });
  };
  return (
    <div className="fixed bottom-6 right-5 z-40 flex flex-col items-end gap-2">
      {open && (
        <div className="rounded-lg border border-border bg-white p-4 text-sm shadow-lg">
          <p className="font-semibold">咨询热线</p>
          <p className="mt-1 text-primary">{phone}</p>
          <p className="mt-2 text-muted">工作日 9:00-18:00 也可以直接</p>
          <a href="/apply" onClick={() => track("apply")} className="mt-1 inline-block text-primary hover:underline">在线报名 →</a>
        </div>
      )}
      <div className="flex flex-col gap-2">
        <button
          onClick={() => {
            setOpen((v) => !v);
            track("phone");
          }}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg"
          aria-label="联系电话"
        >
          ☎
        </button>
        <a
          href="/apply"
          onClick={() => track("apply")}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-green-600 text-white shadow-lg"
          aria-label="在线报名"
        >
          ✎
        </a>
      </div>
    </div>
  );
}
