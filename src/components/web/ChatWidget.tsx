"use client";

/**
 * ChatWidget（SOL-003）：全局可挂载 AI 客服，SSE 流式 + 会话续传（localStorage sessionId）
 * 默认右下角悬浮展开；场景 faq。
 */
import { useEffect, useRef, useState } from "react";

type Msg = { role: "user" | "assistant"; content: string };

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState("");
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, streaming]);

  async function send() {
    const text = input.trim();
    if (!text || streaming) return;
    setInput("");
    setError("");
    setMessages((m) => [...m, { role: "user", content: text }, { role: "assistant", content: "" }]);
    setStreaming(true);
    const sessionId = localStorage.getItem("hd_session_id") ?? `c-${Date.now().toString(36)}`;
    try {
      const res = await fetch("/api/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, sceneCode: "faq", message: text }),
      });
      if (!res.ok || !res.body) {
        const errBody = (await res.json().catch(() => null)) as { message?: string } | null;
        throw new Error(errBody?.message ?? `服务不可用（${res.status}）`);
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const frames = buffer.split("\n\n");
        buffer = frames.pop() ?? "";
        for (const frame of frames) {
          const eventLine = frame.split("\n").find((l) => l.startsWith("event:"));
          const dataLine = frame.split("\n").find((l) => l.startsWith("data:"));
          if (!eventLine || !dataLine) continue;
          const event = eventLine.slice(6).trim();
          let payload: Record<string, unknown> = {};
          try {
            payload = JSON.parse(dataLine.slice(5).trim());
          } catch {
            continue;
          }
          if (event === "delta" && typeof payload.text === "string") {
            const chunk = payload.text;
            setMessages((m) => {
              const next = [...m];
              next[next.length - 1] = { role: "assistant", content: next[next.length - 1].content + chunk };
              return next;
            });
          } else if (event === "error" && typeof payload.message === "string") {
            setError(payload.message);
          }
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "请求失败");
    } finally {
      setStreaming(false);
    }
  }

  return (
    <>
      {open && (
        <div data-visual-ignore className="fixed bottom-24 right-5 z-40 flex h-[480px] w-[360px] flex-col overflow-hidden rounded-xl border border-border bg-white shadow-2xl">
          <div className="flex items-center justify-between bg-primary px-4 py-3 text-white">
            <span className="font-semibold">智能客服</span>
            <button onClick={() => setOpen(false)} aria-label="关闭">✕</button>
          </div>
          <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto p-4 text-sm">
            {messages.length === 0 && (
              <p className="text-muted">您好，我是弘道教育智能客服，关于自考/成考/开放大学的问题都可以问我。</p>
            )}
            {messages.map((m, i) => (
              <div key={i} className={m.role === "user" ? "text-right" : ""}>
                <span className={`inline-block max-w-[85%] whitespace-pre-wrap rounded-lg px-3 py-2 ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-background"}`}>
                  {m.content || (streaming && i === messages.length - 1 ? "…" : "")}
                </span>
              </div>
            ))}
            {error && <p className="text-xs text-red-600">{error}</p>}
          </div>
          <div className="flex gap-2 border-t border-border p-3">
            <input
              className="flex-1 rounded-md border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              value={input}
              placeholder="输入您的问题…"
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              disabled={streaming}
            />
            <button onClick={send} disabled={streaming || !input.trim()} className="rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-50">
              发送
            </button>
          </div>
        </div>
      )}
      <button
        onClick={() => setOpen((v) => !v)}
        data-visual-ignore
        className="fixed bottom-6 left-5 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-purple-600 text-lg text-white shadow-lg"
        aria-label="AI 客服"
      >
        AI
      </button>
    </>
  );
}
