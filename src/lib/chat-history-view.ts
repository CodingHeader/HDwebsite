export interface ChatHistoryMessageLike {
  id: number;
  sessionId: string;
  role: string;
  message: string;
  createdAt: string | Date;
}

export interface ChatTranscriptSummary {
  messageCount: number;
  userMessageCount: number;
  assistantMessageCount: number;
  startedAt: string | null;
  endedAt: string | null;
}

function toIsoString(value: string | Date): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function formatTranscriptTimestamp(value: string | Date): string {
  return toIsoString(value).replace("T", " ").slice(0, 19);
}

export function buildChatTranscriptSummary(
  messages: ChatHistoryMessageLike[],
): ChatTranscriptSummary {
  const startedAt = messages[0] ? toIsoString(messages[0].createdAt) : null;
  const endedAt = messages[messages.length - 1]
    ? toIsoString(messages[messages.length - 1].createdAt)
    : null;

  return {
    messageCount: messages.length,
    userMessageCount: messages.filter((message) => message.role === "user").length,
    assistantMessageCount: messages.filter((message) => message.role === "assistant").length,
    startedAt,
    endedAt,
  };
}

export function buildChatTranscript(messages: ChatHistoryMessageLike[]): string {
  return messages
    .map((message) => {
      const role = message.role.toUpperCase();
      const timestamp = formatTranscriptTimestamp(message.createdAt);
      return `[${role}] ${timestamp}\n${message.message.trim()}`;
    })
    .join("\n\n");
}
