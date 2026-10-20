/**
 * B-05 发布渠道注册表测试
 * - 验收1 的运行时侧：未知 kind → getChannel 抛明确错误，不再静默回退
 * - 注册的 website/wechat 具备正确能力（requiresAccount / defaultContentType）
 * - isChannelKind 判定不误判
 */
import { describe, expect, it } from "vitest";
import { getChannel, isChannelKind, registeredChannelKinds } from "@/lib/channels/registry";

describe("B-05 渠道注册表", () => {
  it("未知 kind → getChannel 抛明确错误（不再静默回退）", () => {
    expect(() => getChannel("unknown-type")).toThrow(/未知发布渠道：unknown-type/);
    expect(() => getChannel("")).toThrow();
  });

  it("已知 kind → 返回注册实现", () => {
    expect(getChannel("website").kind).toBe("website");
    expect(getChannel("wechat").kind).toBe("wechat");
  });

  it("渠道能力：website 不需账号 / wechat 需账号", () => {
    expect(getChannel("website").requiresAccount).toBe(false);
    expect(getChannel("wechat").requiresAccount).toBe(true);
    expect(getChannel("website").defaultContentType).toBe("article");
    expect(getChannel("wechat").defaultContentType).toBe("wechat");
  });

  it("isChannelKind 仅接受注册 kind", () => {
    expect(isChannelKind("website")).toBe(true);
    expect(isChannelKind("wechat")).toBe(true);
    expect(isChannelKind("unknown")).toBe(false);
    expect(isChannelKind(undefined)).toBe(false);
    expect(isChannelKind("")).toBe(false);
  });

  it("注册表与 contracts/kinds 的 CHANNEL_KINDS 一致", () => {
    expect(registeredChannelKinds()).toEqual(["website", "wechat"]);
  });
});