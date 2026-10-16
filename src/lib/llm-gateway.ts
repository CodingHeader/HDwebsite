/**
 * llm-gateway（SOL-003）：多供应商路由/降级/用量统计单点
 * 路由：[场景指定模型] → isDefault → 失败按 priority 升序遍历 active → 全败 → isFallback 必试
 * P06：按场景选模型——ChatScene.llmProviderId 作为 preferredProviderId 置顶（停用则忽略，仍按默认路由降级）
 * C-01：按 kind 的调用细节全部收敛到适配器注册表（./llm/registry）；本文件只保留路由/熔断/统计，
 *       供应商类型字面量比较归零（新增供应商类型只需实现 LLMProviderAdapter 并注册）。
 * 统计：LLMUsage(date+providerId 唯一) upsert；失败计数；余额人工填报（ADR-005）
 */
import { prisma } from "@/lib/prisma";
import { getAllSettings } from "@/lib/settings"; // P06：须含非公开键（collect*/llm*/publish* 均 isPublic=false）；C-01：去 as 别名（B-01 语义单一化）
import { decryptField } from "@/lib/crypto";
import type { LLMProvider } from ".prisma/client";
import type { ChatMessage } from "./llm/types";
import { getAdapter } from "./llm/registry";

export type { ChatMessage };

/* eslint-disable @typescript-eslint/no-explicit-any */

export type GatewayResult = {
  ok: boolean;
  reply: string;
  providerId?: number;
  providerName?: string;
  errMsg?: string;
  tokensUsed?: number;
};

const FAILURE_CIRCUIT = 3;

async function resolveKey(provider: LLMProvider): Promise<string> {
  if (provider.isEncrypted && provider.apiKey.startsWith("v1:")) {
    return decryptField(provider.apiKey) ?? "";
  }
  return provider.apiKey;
}

/** 活跃供应商：default 优先，其余按 priority 升序，fallback 殿后 */
export type RouteOptions = { preferredProviderId?: number | null };

export async function getRoutedProviders(opts: RouteOptions = {}): Promise<LLMProvider[]> {
  const rows = await prisma.lLMProvider.findMany({ where: { status: "active" }, orderBy: [{ priority: "asc" }, { id: "asc" }] });
  return orderProviders(rows, opts.preferredProviderId);
}

/** 纯函数（导出供单测）：场景指定 → default → priority 升序 → fallback 殿后 */
export function orderProviders<T extends { id: number; isDefault: boolean; isFallback: boolean }>(rows: T[], preferredId?: number | null): T[] {
  const preferred = preferredId ? rows.filter((r) => r.id === preferredId) : [];
  const others = rows.filter((r) => r.id !== preferredId);
  const byDefault = others.filter((r) => r.isDefault);
  const byFallback = others.filter((r) => r.isFallback && !r.isDefault);
  const rest = others.filter((r) => !r.isDefault && !r.isFallback);
  return [...preferred, ...byDefault, ...rest, ...byFallback];
}

async function recordUsage(providerId: number, tokensIn: number, tokensOut: number, failure: boolean): Promise<void> {
  const date = new Date().toISOString().slice(0, 10);
  const data: any = { calls: { increment: 1 }, tokensIn: { increment: tokensIn }, tokensOut: { increment: tokensOut } };
  if (failure) data.failures = { increment: 1 };
  await prisma.lLMUsage.upsert({
    where: { date_providerId: { date, providerId } },
    update: data,
    create: { date, providerId, calls: 1, tokensIn, tokensOut, failures: failure ? 1 : 0 },
  }).catch(() => undefined);
}

/** 流式路径中途失败时的失败计数（供路由层调用） */
export async function recordGatewayFailure(providerId: number): Promise<void> {
  await recordUsage(providerId, 0, 0, true);
}

async function failureCount(providerId: number): Promise<number> {
  const date = new Date().toISOString().slice(0, 10);
  const row = await prisma.lLMUsage.findUnique({
    where: { date_providerId: { date, providerId } },
    select: { failures: true },
  }).catch(() => null);
  return row?.failures ?? 0;
}

/**
 * 非流式对话（测试端点/内部调用）
 */
export async function gatewayChat(messages: ChatMessage[], opts: RouteOptions = {}): Promise<GatewayResult> {
  const providers = await getRoutedProviders(opts);
  if (providers.length === 0) {
    return { ok: false, reply: "", errMsg: "尚未配置可用的 AI 模型供应商" };
  }
  const settings = await getAllSettings();
  const timeoutMs = Number(settings.llmTimeoutMs || 30000);
  const errors: string[] = [];

  for (const provider of providers) {
    // 熔断：当日连续失败 ≥3 次的供应商跳过
    if ((await failureCount(provider.id)) >= FAILURE_CIRCUIT && !provider.isFallback) {
      errors.push(`${provider.name}: 今日失败次数达熔断阈值，已跳过`);
      continue;
    }
    try {
      const apiKey = await resolveKey(provider);
      if (!apiKey) throw new Error("API Key 解密失败");
      // C-01：按 kind 的调用细节收敛到适配器注册表（本文件无类型分支）
      const adapter = getAdapter(provider.kind);
      const r = await adapter.chat(provider, apiKey, messages, timeoutMs);
      await recordUsage(provider.id, r.tokensIn, r.tokensOut, false);
      return { ok: true, reply: r.reply, providerId: provider.id, providerName: provider.name };
    } catch (err) {
      await recordUsage(provider.id, 0, 0, true);
      errors.push(`${provider.name}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  return { ok: false, reply: "", errMsg: errors.join("；") || "全部供应商调用失败" };
}

/**
 * 流式对话：按路由逐个尝试，返回首个成功供应商的文本增量流。
 * 上层（SSE 路由）负责把 Uint8Array 增量转为事件帧。
 */
export async function gatewayChatStream(
  messages: ChatMessage[],
  opts: RouteOptions = {}
): Promise<{ ok: true; stream: ReadableStream<Uint8Array>; providerId: number; providerName: string } | { ok: false; errMsg: string }> {
  const providers = await getRoutedProviders(opts);
  if (providers.length === 0) {
    return { ok: false, errMsg: "尚未配置可用的 AI 模型供应商" };
  }
  const settings = await getAllSettings();
  const timeoutMs = Number(settings.llmTimeoutMs || 30000);
  const errors: string[] = [];

  for (const provider of providers) {
    if ((await failureCount(provider.id)) >= FAILURE_CIRCUIT && !provider.isFallback) {
      errors.push(`${provider.name}: 熔断跳过`);
      continue;
    }
    try {
      const apiKey = await resolveKey(provider);
      if (!apiKey) throw new Error("API Key 解密失败");
      // C-01：按 kind 的调用细节收敛到适配器注册表（本文件无类型分支）
      const stream = await getAdapter(provider.kind).stream(provider, apiKey, messages, timeoutMs);
      await recordUsage(provider.id, 0, 0, false);
      return { ok: true, stream, providerId: provider.id, providerName: provider.name };
    } catch (err) {
      await recordUsage(provider.id, 0, 0, true);
      errors.push(`${provider.name}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  return { ok: false, errMsg: errors.join("；") || "全部供应商调用失败" };
}
