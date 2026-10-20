/**
 * 发布渠道注册表（B-05，ADR-030）
 *
 * 目标：publish-executor 只做状态机/审核门/提醒/退避；渠道实现按 kind 注册，
 * 经 getChannel(kind) 调用，新增渠道只加 channels/ 内一个文件 + 注册表一行，
 * 不改 executor 的状态机。channel 类型用 contracts/kinds 的 CHANNEL_KINDS 派生。
 */
import { CHANNEL_KINDS, type ChannelKind } from "@/contracts/kinds";
import { publishToWebsite } from "./website";
import { publishToWechat } from "./wechat";
import type { PublishJob } from ".prisma/client";

/** 渠道发布结果（统一语义：成功 = "published"；失败抛错由 executor markFailed 兜底） */
export type ChannelPublishOutcome = "published" | "failed";

/** 渠道实现契约：发布动作 + 渠道能力声明（供 executor / content-workflow 决策复用） */
export interface ChannelImpl {
  kind: ChannelKind;
  label: string;
  /** 单次发布动作；成功返回 "published"，失败抛错（executor markFailed 兜底） */
  publish(job: PublishJob): Promise<ChannelPublishOutcome>;
  /** 该渠道是否需要预先绑定公众号账号（wechat=true；website=false） */
  requiresAccount: boolean;
  /** 建发布任务时的默认 contentType（wechat="wechat"；website="article"） */
  defaultContentType: string;
}

const REGISTRY: Record<ChannelKind, ChannelImpl> = {
  website: {
    kind: "website",
    label: "官网",
    publish: publishToWebsite,
    requiresAccount: false,
    defaultContentType: "article",
  },
  wechat: {
    kind: "wechat",
    label: "公众号",
    publish: publishToWechat,
    requiresAccount: true,
    defaultContentType: "wechat",
  },
};

/** 取渠道实现；未知 kind 抛明确错误（不再静默回退，见 ADR-030） */
export function getChannel(kind: ChannelKind | string): ChannelImpl {
  const impl = REGISTRY[kind as ChannelKind];
  if (!impl) throw new Error(`未知发布渠道：${kind}（支持 ${CHANNEL_KINDS.join("/")}）`);
  return impl;
}

/** 已注册渠道种类（供 UI / 校验复用） */
export function registeredChannelKinds(): readonly ChannelKind[] {
  return CHANNEL_KINDS;
}

/** 判定字符串是否为已注册渠道 kind（供配置校验/UI 复用，避免就地写枚举字面量） */
export function isChannelKind(kind: unknown): kind is ChannelKind {
  return typeof kind === "string" && (CHANNEL_KINDS as readonly string[]).includes(kind);
}