"use client";

/**
 * 对话日志收集工具
 * 用于在客户端收集对话记录并发送到后端
 */

export interface LogMessage {
  role: "user" | "assistant" | "system";
  content: string;
  metadata?: Record<string, unknown>;
}

export interface ConversationLoggerOptions {
  sessionId?: string;
  userId?: string;
  userName?: string;
  pageUrl?: string;
  pageTitle?: string;
  apiEndpoint?: string;
}

class ConversationLogger {
  private sessionId: string;
  private userId?: string;
  private userName?: string;
  private pageUrl: string;
  private pageTitle: string;
  private apiEndpoint: string;
  private messages: LogMessage[] = [];
  private conversationId: string | null = null;

  constructor(options: ConversationLoggerOptions = {}) {
    this.sessionId = options.sessionId || this.generateSessionId();
    this.userId = options.userId;
    this.userName = options.userName;
    this.pageUrl = options.pageUrl || (typeof window !== "undefined" ? window.location.href : "");
    this.pageTitle = options.pageTitle || (typeof document !== "undefined" ? document.title : "");
    this.apiEndpoint = options.apiEndpoint || "/api/conversations";
  }

  private generateSessionId(): string {
    return `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 添加消息到当前对话
   */
  addMessage(message: LogMessage): void {
    this.messages.push(message);
  }

  /**
   * 添加用户消息
   */
  addUserMessage(content: string, metadata?: Record<string, unknown>): void {
    this.addMessage({
      role: "user",
      content,
      metadata,
    });
  }

  /**
   * 添加AI助手消息
   */
  addAssistantMessage(content: string, metadata?: Record<string, unknown>): void {
    this.addMessage({
      role: "assistant",
      content,
      metadata,
    });
  }

  /**
   * 添加系统消息
   */
  addSystemMessage(content: string, metadata?: Record<string, unknown>): void {
    this.addMessage({
      role: "system",
      content,
      metadata,
    });
  }

  /**
   * 生成对话摘要（取前50字符）
   */
  private generateSummary(): string {
    const firstUserMessage = this.messages.find((m) => m.role === "user");
    if (firstUserMessage) {
      return firstUserMessage.content.slice(0, 50) + (firstUserMessage.content.length > 50 ? "..." : "");
    }
    return "新对话";
  }

  /**
   * 保存对话到服务器
   */
  async save(): Promise<{ success: boolean; conversationId?: string; error?: string }> {
    if (this.messages.length === 0) {
      return { success: false, error: "没有消息可保存" };
    }

    try {
      const response = await fetch(this.apiEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionId: this.sessionId,
          userId: this.userId,
          userName: this.userName,
          pageUrl: this.pageUrl,
          pageTitle: this.pageTitle,
          summary: this.generateSummary(),
          messages: this.messages.map((m) => ({
            role: m.role,
            content: m.content,
            metadata: m.metadata ? JSON.stringify(m.metadata) : null,
          })),
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      if (result.code === 200) {
        this.conversationId = result.data.id;
        return { success: true, conversationId: result.data.id };
      } else {
        throw new Error(result.message || "保存失败");
      }
    } catch (err) {
      console.error("Failed to save conversation:", err);
      return {
        success: false,
        error: err instanceof Error ? err.message : "保存失败",
      };
    }
  }

  /**
   * 清空当前对话
   */
  clear(): void {
    this.messages = [];
    this.conversationId = null;
  }

  /**
   * 获取当前会话ID
   */
  getSessionId(): string {
    return this.sessionId;
  }

  /**
   * 获取当前对话ID
   */
  getConversationId(): string | null {
    return this.conversationId;
  }

  /**
   * 获取消息数量
   */
  getMessageCount(): number {
    return this.messages.length;
  }

  /**
   * 获取所有消息
   */
  getMessages(): LogMessage[] {
    return [...this.messages];
  }
}

// 全局实例（单例模式）
let globalLogger: ConversationLogger | null = null;

/**
 * 获取或创建对话日志记录器
 */
export function getConversationLogger(options?: ConversationLoggerOptions): ConversationLogger {
  if (!globalLogger) {
    globalLogger = new ConversationLogger(options);
  }
  return globalLogger;
}

/**
 * 重置全局记录器
 */
export function resetConversationLogger(): void {
  globalLogger = null;
}

export { ConversationLogger };
