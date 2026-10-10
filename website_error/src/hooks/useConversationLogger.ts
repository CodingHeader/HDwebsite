"use client";

import { useCallback, useRef, useEffect, useState } from "react";
import { getConversationLogger, LogMessage, ConversationLoggerOptions } from "@/lib/conversation-logger";

export interface UseConversationLoggerReturn {
  /**
   * 添加用户消息
   */
  addUserMessage: (content: string, metadata?: Record<string, unknown>) => void;
  /**
   * 添加AI助手消息
   */
  addAssistantMessage: (content: string, metadata?: Record<string, unknown>) => void;
  /**
   * 添加系统消息
   */
  addSystemMessage: (content: string, metadata?: Record<string, unknown>) => void;
  /**
   * 保存对话到服务器
   */
  saveConversation: () => Promise<{ success: boolean; conversationId?: string; error?: string }>;
  /**
   * 清空当前对话
   */
  clearConversation: () => void;
  /**
   * 获取消息数量
   */
  messageCount: number;
  /**
   * 获取所有消息
   */
  messages: LogMessage[];
  /**
   * 当前会话ID
   */
  sessionId: string;
  /**
   * 对话ID（保存后才有）
   */
  conversationId: string | null;
  /**
   * 是否正在保存
   */
  isSaving: boolean;
}

/**
 * React Hook: 对话日志记录器
 * 
 * 使用示例:
 * ```tsx
 * function ChatComponent() {
 *   const { addUserMessage, addAssistantMessage, saveConversation, messages } = useConversationLogger({
 *     userId: "user_123",
 *     userName: "张三"
 *   });
 * 
 *   const handleSend = async (message: string) => {
 *     addUserMessage(message);
 *     // ... 调用AI接口获取回复
 *     addAssistantMessage("AI回复内容");
 *     // ... 对话结束后保存
 *     await saveConversation();
 *   };
 * 
 *   return (...);
 * }
 * ```
 */
export function useConversationLogger(
  options: ConversationLoggerOptions = {}
): UseConversationLoggerReturn {
  const loggerRef = useRef(getConversationLogger(options));
  const [messages, setMessages] = useState<LogMessage[]>([]);
  const [messageCount, setMessageCount] = useState(0);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // 同步状态
  const syncState = useCallback(() => {
    setMessages(loggerRef.current.getMessages());
    setMessageCount(loggerRef.current.getMessageCount());
    setConversationId(loggerRef.current.getConversationId());
  }, []);

  // 初始化
  useEffect(() => {
    syncState();
  }, [syncState]);

  const addUserMessage = useCallback(
    (content: string, metadata?: Record<string, unknown>) => {
      loggerRef.current.addUserMessage(content, metadata);
      syncState();
    },
    [syncState]
  );

  const addAssistantMessage = useCallback(
    (content: string, metadata?: Record<string, unknown>) => {
      loggerRef.current.addAssistantMessage(content, metadata);
      syncState();
    },
    [syncState]
  );

  const addSystemMessage = useCallback(
    (content: string, metadata?: Record<string, unknown>) => {
      loggerRef.current.addSystemMessage(content, metadata);
      syncState();
    },
    [syncState]
  );

  const saveConversation = useCallback(async () => {
    setIsSaving(true);
    try {
      const result = await loggerRef.current.save();
      if (result.success) {
        setConversationId(result.conversationId || null);
      }
      return result;
    } finally {
      setIsSaving(false);
    }
  }, []);

  const clearConversation = useCallback(() => {
    loggerRef.current.clear();
    syncState();
  }, [syncState]);

  return {
    addUserMessage,
    addAssistantMessage,
    addSystemMessage,
    saveConversation,
    clearConversation,
    messageCount,
    messages,
    sessionId: loggerRef.current.getSessionId(),
    conversationId,
    isSaving,
  };
}
