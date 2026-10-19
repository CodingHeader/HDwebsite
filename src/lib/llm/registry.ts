/**
 * LLM 适配器注册表（C-01 / WPC.1）：kind → adapter 唯一注册点。
 * - 新增供应商类型：实现 LLMProviderAdapter（types.ts）后在此注册；llm-gateway 无需改动（开放/封闭）
 * - kind 取值 = kinds.ts 的 LLM_KINDS（openai/coze）；未知 kind 抛错（防误配静默失败）
 */
import type { LLMProviderAdapter } from "./types";
import { openaiAdapter } from "./openai";
import { cozeAdapter } from "./coze";

const ADAPTERS: Record<string, LLMProviderAdapter> = {
  openai: openaiAdapter,
  coze: cozeAdapter,
};

/** 取供应商类型的适配器；未知 kind 抛错（路由层录入已由 llmProviderCreateSchema 的 LLM_KINDS 枚举前置校验） */
export function getAdapter(kind: string): LLMProviderAdapter {
  const adapter = ADAPTERS[kind];
  if (!adapter) throw new Error(`未知的供应商类型：${kind}`);
  return adapter;
}

/** 全部已注册 kind（供后台下拉/校验展示） */
export function registeredKinds(): string[] {
  return Object.keys(ADAPTERS);
}
