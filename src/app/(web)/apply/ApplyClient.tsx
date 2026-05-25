"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { Phone, MapPin, Clock, CheckCircle, Send, Bot, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useSettings } from "@/hooks/useSettings";
import { Breadcrumb } from "@/components/web/Breadcrumb";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface ChatScene {
  id: number;
  code: string;
  name: string;
  greeting: string;
  starters: string | null;
  pageTitle: string | null;
  pageSubtitle: string | null;
  headerTip: string | null;
  sidebarTitle: string | null;
  processSteps: string | null;
  promiseList: string | null;
  contactCardTitle: string | null;
  useKnowledgeBase: boolean | null;
}

interface ProcessStep { title: string; desc?: string }

/** 安全解析 JSON 数组，失败返回 [] */
function parseList<T = unknown>(raw: string | null | undefined): T[] {
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? (arr as T[]) : [];
  } catch {
    return [];
  }
}

/** 场景默认兜底（当后台没填新字段时保证 UI 不崩溃） */
const SCENE_FALLBACK: Record<string, Partial<ChatScene>> = {
  apply: {
    pageTitle: "在线报名",
    pageSubtitle: "AI 智能客服已为您接入，正在为您提供咨询服务",
    headerTip: "AI 客服在线为您服务",
    sidebarTitle: "报名流程",
    processSteps: JSON.stringify([
      { title: "在线咨询", desc: "填写报名信息 / AI 问答" },
      { title: "电话确认", desc: "1 对 1 顾问沟通需求" },
      { title: "方案确认", desc: "院校 / 专业 / 学费" },
      { title: "正式报名", desc: "签约缴费 · 启动学习" },
    ]),
    promiseList: JSON.stringify([
      "24 小时内响应咨询",
      "专业课程顾问一对一服务",
      "免费试听课程",
      "学费透明无隐形收费",
    ]),
    contactCardTitle: "联系我们",
  },
  float: {
    pageTitle: "在线客服",
    pageSubtitle: "专业顾问 2 分钟内响应，帮您快速定位院校 / 专业 / 学费",
    headerTip: "短平快回答 · 留下电话由顾问回访",
    sidebarTitle: "咨询热点",
    processSteps: JSON.stringify([
      { title: "告诉我您的起点", desc: "高中 / 大专 / 本科" },
      { title: "想要的终点", desc: "学历 / 职称 / 证书" },
      { title: "AI 智能匹配", desc: "基于 8 所院校资源" },
      { title: "电话深度沟通", desc: "留联系方式由顾问主动回访" },
    ]),
    promiseList: JSON.stringify([
      "2 分钟内响应",
      "专属顾问一对一",
      "信息严格保密",
      "不接受强制推销",
    ]),
    contactCardTitle: "马上联系顾问",
  },
  guide: {
    pageTitle: "政策解答",
    pageSubtitle: "关于报名条件 / 学费 / 考试时间 / 免考政策的权威解读",
    headerTip: "政策类问题请直接提问，AI 会给出权威答案",
    sidebarTitle: "办理流程",
    processSteps: JSON.stringify([
      { title: "查询政策", desc: "AI 检索最新学历政策" },
      { title: "确认资格", desc: "高中学历 / 18 周岁即可" },
      { title: "选择方案", desc: "自考 · 成考 · 开放大学" },
      { title: "办理手续", desc: "注册 · 缴费 · 开学" },
    ]),
    promiseList: JSON.stringify([
      "政策解读以教育部官方为准",
      "学信网终身可查",
      "国家承认学历",
      "院校官方助学点合作",
    ]),
    contactCardTitle: "服务支持",
  },
};

/** 生成/读取持久化 sessionId（浏览器本地保留，便于后台将同一访客的对话聚合为一次会话） */
function getOrCreateSessionId(): string {
  if (typeof window === "undefined") return "";
  const KEY = "hd_chat_session_id";
  let id = window.localStorage.getItem(KEY);
  if (!id) {
    id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `sess_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    window.localStorage.setItem(KEY, id);
  }
  return id;
}

/** 根据 URL source 参数推断场景 code：/apply 默认 "apply"，悬浮来源为 "float"，服务指南 "guide" */
function resolveSceneCode(search: string): string {
  const sp = new URLSearchParams(search);
  const src = sp.get("source");
  if (src === "float") return "float";
  if (src === "guide") return "guide";
  return "apply";
}

interface ApplyClientProps {
  sceneCode: string;
  initialScene: ChatScene | null;
}

export default function ApplyClient({ sceneCode, initialScene }: ApplyClientProps) {
  const { getSetting } = useSettings();
  const schoolShortName = getSetting("schoolShortName", "弘道经理学院");

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [sessionId, setSessionId] = useState<string>("");
  const [scene] = useState<ChatScene | null>(initialScene);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 仅客户端：初始化 sessionId
  useEffect(() => {
    setSessionId(getOrCreateSessionId());
  }, []);

  /** 异步持久化单条消息到后台（失败不打断聊天流） */
  const persistMessage = useCallback(
    async (role: "user" | "assistant", content: string) => {
      if (!sessionId) return;
      try {
        await fetch("/api/chat-history", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId,
            role,
            message: content,
            pageUrl: window.location.pathname + window.location.search,
            pageTitle: document.title || null,
            metadata: JSON.stringify({ source: sceneCode, sceneName: scene?.name }),
          }),
        });
      } catch (err) {
        console.warn("[chat-history] persist failed", err);
      }
    },
    [sessionId, sceneCode, scene?.name]
  );

  // 场景加载后，自动展示场景欢迎语（无需调用 AI，避免首屏使用 token）
  useEffect(() => {
    if (!sessionId || !scene) return;
    setMessages((prev) => {
      if (prev.length > 0) return prev; // 已有历史不重复插入
      const greeting = scene.greeting || `您好！欢迎来到${schoolShortName}。`;
      persistMessage("assistant", greeting);
      return [
        {
          id: `${Date.now()}-greeting`,
          role: "assistant",
          content: greeting,
          timestamp: new Date(),
        },
      ];
    });
  }, [sessionId, scene, schoolShortName, persistMessage]);

  // 只滚动聊天容器内部，避免触发 window 级滚动
  useEffect(() => {
    const el = chatScrollRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages, isTyping]);

  // Focus input on mount
  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus({ preventScroll: true }), 300);
    return () => clearTimeout(t);
  }, []);

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    const content = inputMessage;
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content,
      timestamp: new Date(),
    };

    // 先落本地 + 持久化 + 清空输入
    setMessages((prev) => [...prev, userMessage]);
    setInputMessage("");
    persistMessage("user", content);

    setIsTyping(true);
    // F2：前端 95s timeout，容纳 Modelscope 冷启动的 90s 峰值
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 95_000);
    try {
      const history = [...messages, userMessage].slice(-16).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch("/api/chat/completion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history, sceneCode, sessionId }),
        signal: controller.signal,
      });
      const json = await res.json().catch(() => null);
      const reply =
        json?.code === 200 && typeof json?.data?.reply === "string"
          ? json.data.reply
          : (json?.message || `AI 暂时不可用（HTTP ${res.status}），请稍后重试或拨打 139-0809-1091。`);

      setMessages((prev) => [
        ...prev,
        {
          id: `${Date.now()}-ai`,
          role: "assistant",
          content: reply,
          timestamp: new Date(),
        },
      ]);
      persistMessage("assistant", reply);
    } catch (err) {
      const isAbort = (err as Error | undefined)?.name === "AbortError";
      console.warn("[chat/completion] failed", err);
      const fallback = isAbort
        ? "AI 响应超时（可能模型冷启动），已为您转接人工。请拨打 139-0809-1091 咨询。"
        : "网络异常，请稍后重试。如需加急可拨打 139-0809-1091。";
      setMessages((prev) => [
        ...prev,
        {
          id: `${Date.now()}-err`,
          role: "assistant",
          content: fallback,
          timestamp: new Date(),
        },
      ]);
    } finally {
      clearTimeout(timeoutId);
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // 合并 scene 实际值 + fallback
  const fb = SCENE_FALLBACK[sceneCode] || SCENE_FALLBACK.apply;
  const pageTitle = scene?.pageTitle || fb.pageTitle || "在线咨询";
  const pageSubtitle = scene?.pageSubtitle || fb.pageSubtitle || "AI 智能客服为您服务";
  const headerTip = scene?.headerTip || fb.headerTip || "AI 客服在线";
  const sidebarTitle = scene?.sidebarTitle || fb.sidebarTitle || "服务流程";
  const processSteps = parseList<ProcessStep>(scene?.processSteps || fb.processSteps);
  const promiseList = parseList<string>(scene?.promiseList || fb.promiseList);
  const contactCardTitle = scene?.contactCardTitle || fb.contactCardTitle || "联系我们";

  return (
    <div className="min-h-screen bg-gray-50">
      <Breadcrumb items={[{ label: pageTitle }]} />
      <div className="py-6">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
            {pageTitle}
          </h1>
          <p className="text-gray-500 max-w-xl mx-auto text-sm">
            {pageSubtitle}
          </p>
          <div className="mt-3 inline-flex items-center gap-2 px-4 py-1.5 bg-[#da251d]/10 text-[#da251d] rounded-full text-sm">
            <Bot className="w-4 h-4 animate-pulse" />
            <span>{headerTip}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* AI Chat Area */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden h-[520px] flex flex-col">
              {/* Chat Header */}
              <div className="bg-[#da251d] text-white p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                    <Bot className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="font-bold">AI课程顾问</h2>
                    <p className="text-xs text-white/80">{schoolShortName}智能客服</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                  <span className="text-sm">在线</span>
                </div>
              </div>

              {/* Chat Messages */}
              <div ref={chatScrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                {/* Welcome Message */}
                {messages.length === 0 && (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 rounded-full bg-[#da251d]/10 flex items-center justify-center mx-auto mb-4">
                      <Bot className="w-8 h-8 text-[#da251d]" />
                    </div>
                    <p className="text-gray-500">正在为您连接AI课程顾问...</p>
                  </div>
                )}

                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={cn(
                      "flex gap-3",
                      message.role === "user" ? "flex-row-reverse" : ""
                    )}
                  >
                    <div
                      className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                        message.role === "user"
                          ? "bg-[#da251d]"
                          : "bg-gray-200"
                      )}
                    >
                      {message.role === "user" ? (
                        <User className="w-4 h-4 text-white" />
                      ) : (
                        <Bot className="w-4 h-4 text-gray-600" />
                      )}
                    </div>
                    <div
                      className={cn(
                        "max-w-[70%] rounded-2xl px-4 py-3 text-sm",
                        message.role === "user"
                          ? "bg-[#da251d] text-white rounded-tr-none"
                          : "bg-white border border-gray-200 text-gray-700 rounded-tl-none shadow-sm"
                      )}
                    >
                      {message.content}
                    </div>
                  </div>
                ))}

                {/* Typing Indicator */}
                {isTyping && (
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                      <Bot className="w-4 h-4 text-gray-600" />
                    </div>
                    <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-none px-4 py-3 shadow-sm">
                      <div className="flex gap-1">
                        <span
                          className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                          style={{ animationDelay: "0ms" }}
                        />
                        <span
                          className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                          style={{ animationDelay: "150ms" }}
                        />
                        <span
                          className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                          style={{ animationDelay: "300ms" }}
                        />
                      </div>
                    </div>
                  </div>
                )}

              </div>

              {/* Chat Input */}
              <div className="p-4 bg-white border-t border-gray-200">
                <div className="flex gap-2">
                  <Input
                    ref={inputRef}
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="输入您的问题..."
                    className="flex-1 bg-white border-gray-300 text-gray-900 placeholder:text-gray-400 focus-visible:ring-[#da251d]/30"
                  />
                  <Button
                    onClick={handleSendMessage}
                    className="bg-[#da251d] hover:bg-[#b91d1d]"
                    disabled={!inputMessage.trim() || isTyping}
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-xs text-gray-400 mt-2 text-center">
                  AI客服为您提供24小时在线咨询服务
                </p>
              </div>
            </div>
          </div>

          {/* Sidebar - 按 scene 差异化渲染 */}
          <div className="lg:col-span-1">
            <div className="space-y-6">
              {/* Process */}
              {processSteps.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h3 className="font-bold text-gray-900 mb-4">{sidebarTitle}</h3>
                  <div className="space-y-4">
                    {processSteps.map((step, idx) => (
                      <div key={idx} className="flex items-start gap-3">
                        <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-bold text-red-600">{idx + 1}</span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{step.title}</p>
                          {step.desc && <p className="text-xs text-gray-500">{step.desc}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Contact */}
              <div className="bg-red-600 rounded-xl p-6 text-white">
                <h3 className="font-bold mb-4">{contactCardTitle}</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    <span>{getSetting("contactPhone", "139-0809-1091")}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    <span>{getSetting("workHours", "周一至周日 9:00-18:00")}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 mt-0.5" />
                    <span>{getSetting("address", "四川省成都市高新区天府大道1700号新世界环球中心N2区601室")}</span>
                  </div>
                </div>
              </div>

              {/* Promise */}
              {promiseList.length > 0 && (
                <div className="bg-green-50 rounded-xl p-6">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span className="font-bold text-green-800">服务承诺</span>
                  </div>
                  <ul className="text-sm text-green-700 space-y-1">
                    {promiseList.map((item, idx) => (
                      <li key={idx}>• {item}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
    </div>
  );
}
