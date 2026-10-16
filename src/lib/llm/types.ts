/**
 * LLM 适配器接口（C-01 / WPC.1 模型供应商可扩展）
 * - llm-gateway 只保留路由/熔断/统计；按 kind 的调用细节全部收敛到适配器（registry.ts 注册表）
 * - 新增供应商类型：实现 LLMProviderAdapter + 在 registry.ts 注册；llm-gateway 无需改动
 */
import type { LLMProvider } from ".prisma/client";

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

/** 非流式对话结果：reply 与用量（tokensIn/tokensOut 用于 LLMUsage 统计） */
export type AdapterChatResult = { reply: string; tokensIn: number; tokensOut: number };

export interface LLMProviderAdapter {
  /** 供应商类型（= kinds.ts 的 LLM_KINDS 取值） */
  readonly kind: string;
  /** 非流式对话（测试端点/内部调用） */
  chat(provider: LLMProvider, apiKey: string, messages: ChatMessage[], timeoutMs: number): Promise<AdapterChatResult>;
  /** 流式对话（SSE 网关）；返回文本增量流（上层把 Uint8Array 增量转为事件帧） */
  stream(provider: LLMProvider, apiKey: string, messages: ChatMessage[], timeoutMs: number): Promise<ReadableStream<Uint8Array>>;
}
