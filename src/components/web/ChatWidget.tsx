"use client";

/**
 * ChatWidget（SOL-003）：全局可挂载 AI 客服，SSE 流式 + 会话续传（localStorage sessionId）
 * 默认右下角悬浮展开；场景 faq。
 * P05（仅交互逻辑，样式/className 不变）：
 * - 会话 id 持久化到 localStorage `hd_chat_session_id`（与 /apply 及 main 同键；兼容旧键 hd_session_id）
 * - 会话恢复：最近 30 条消息存 localStorage，刷新/重开后恢复
 * - 停止生成：流式输出中"发送"按钮变为"停止"，中断当前请求并保留已生成内容
 * - 重试：上次请求失败且输入框为空时，按钮变为"重试"，重新发送上一条提问
 */
import { useEffect, useRef, useState } from "react";
import { parseSseFrame, reduceSseError } from "@/lib/llm/sse";

type Msg = { role: "user" | "assistant"; content: string };

const SESSION_KEY = "hd_chat_session_id";
const LEGACY_SESSION_KEY = "hd_session_id";
const HISTORY_KEY = "hd_chat_widget_messages";

function ensureSessionId(): string {
  let id = localStorage.getItem(SESSION_KEY) ?? localStorage.getItem(LEGACY_SESSION_KEY);
  if (!id || id.length < 8) id = `c-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  localStorage.setItem(SESSION_KEY, id);
  return id;
}

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState("");
  const [lastQuestion, setLastQuestion] = useState("");
  const listRef = useRef<HTMLDivElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // 会话恢复：挂载时从 localStorage（外部系统）读取最近消息
  useEffect(() => {
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      const saved = raw ? (JSON.parse(raw) as Msg[]) : [];
      // eslint-disable-next-line react-hooks/set-state-in-effect -- 挂载时从外部存储同步一次
      if (Array.isArray(saved) && saved.length) setMessages(saved.filter((m) => m && typeof m.content === "string" && m.content));
    } catch {
      /* 存储损坏时忽略 */
    }
  }, []);

  useEffect(() => {
    if (streaming) return;
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(messages.filter((m) => m.content).slice(-30)));
    } catch {
      /* 存储满/隐私模式时忽略 */
    }
  }, [messages, streaming]);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, streaming]);

  useEffect(() => () => abortRef.current?.abort(), []);

  function stop() {
    abortRef.current?.abort();
  }

  async function send(retryText?: string) {
    const text = (retryText ?? input).trim();
    if (!text || streaming) return;
    if (!retryText) setInput("");
    setError("");
    setLastQuestion(text);
    setMessages((m) => {
      // 重试（P06）：复用末尾同一问题气泡，丢弃失败/中断的回答，不重复追加问题
      if (retryText) {
        let base = m;
        while (base.length && base[base.length - 1].role === "assistant") base = base.slice(0, -1);
        const last = base[base.length - 1];
        if (last && last.role === "user" && last.content === text) return [...base, { role: "assistant", content: "" }];
      }
      return [...m, { role: "user", content: text }, { role: "assistant", content: "" }];
    });
    setStreaming(true);
    const sessionId = ensureSessionId();
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const res = await fetch("/api/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, sceneCode: "faq", message: text }),
        signal: controller.signal,
      });
      if (!res.ok || !res.body) {
        const errBody = (await res.json().catch(() => null)) as { message?: string } | null;
        throw new Error(errBody?.message ?? `服务不可用（${res.status}）`);
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let sseError: string | null = null;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const frames = buffer.split("\n\n");
        buffer = frames.pop() ?? "";
        for (const frame of frames) {
          // C-07：SSE 帧统一走契约 chatSseEventSchema 解析（非法帧忽略，不抛错）
          const evt = parseSseFrame(frame);
          if (!evt) continue;
          if (evt.event === "delta") {
            const chunk = evt.data.text;
            setMessages((m) => {
              const next = [...m];
              next[next.length - 1] = { role: "assistant", content: next[next.length - 1].content + chunk };
              return next;
            });
          } else if (evt.event === "error") {
            // C-07：同一流可能出现两条 error（route 的 catch 与 finally），只保留第一条
            sseError = reduceSseError(sseError, evt.data.message);
          }
        }
      }
      if (sseError) setError(sseError);
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") {
        // 用户主动停止：保留已生成内容，不视为错误
      } else {
        setError(e instanceof Error ? e.message : "请求失败");
      }
    } finally {
      abortRef.current = null;
      setStreaming(false);
      // 去掉未生成任何内容的空回复气泡
      setMessages((m) => (m.length && m[m.length - 1].role === "assistant" && !m[m.length - 1].content ? m.slice(0, -1) : m));
    }
  }

  const canRetry = !streaming && !!error && !input.trim() && !!lastQuestion;
  function onPrimary() {
    if (streaming) stop();
    else if (canRetry) void send(lastQuestion);
    else void send();
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
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.nativeEvent.isComposing) void send();
                else if (e.key === "Escape") setOpen(false);
              }}
              disabled={streaming}
            />
            <button onClick={onPrimary} disabled={!streaming && !canRetry && !input.trim()} className="rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-50">
              {streaming ? "停止" : canRetry ? "重试" : "发送"}
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
