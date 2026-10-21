// @vitest-environment jsdom
/**
 * V7-UI-01 渠道状态列组件测试（jsdom）
 * 覆盖：空态、五态 Badge、已发布外链（绝对地址/站点内路径）、失败态重试按钮（含权限关闭）、
 *       重试触发 POST /api/publish-jobs/[id]/retry 并回调 onRetried、外链安全过滤（javascript: 不渲染）。
 * mock：manager-fetch（记录调用）、feedback.toast（记录成功/错误文案）。
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { ChannelStates } from "@/components/manager/publish/ChannelStates";
import type { ChannelState } from "@/contracts/content-hub";

const calls: { url: string; init?: { method?: string } }[] = [];
vi.mock("@/lib/manager-fetch", () => ({
  managerFetch: vi.fn(async (url: string, init?: { method?: string }) => {
    calls.push({ url, init });
    return { result: "published", message: "ok" };
  }),
  errorMessage: (e: unknown) => (e instanceof Error ? e.message : String(e)),
}));

const toasts: { title: string; kind: string }[] = [];
vi.mock("@/components/manager/feedback", async (orig) => {
  const actual = await orig<typeof import("@/components/manager/feedback")>();
  return {
    ...actual,
    toast: {
      success: (t: string) => toasts.push({ title: t, kind: "success" }),
      error: (t: string) => toasts.push({ title: t, kind: "error" }),
      info: (t: string) => toasts.push({ title: t, kind: "info" }),
      warning: (t: string) => toasts.push({ title: t, kind: "warning" }),
    },
  };
});

function st(over: Partial<ChannelState>): ChannelState {
  return {
    channel: "website",
    accountId: null,
    status: "unsent",
    scheduledAt: null,
    publishedAt: null,
    externalUrl: null,
    errMsg: null,
    ...over,
  };
}

beforeEach(() => {
  cleanup();
  calls.length = 0;
  toasts.length = 0;
});

describe("ChannelStates 渲染", () => {
  it("空数组 → 渲染占位 —", () => {
    render(<ChannelStates itemId={1} channels={[]} canRetry={false} resolveJobId={() => null} onRetried={() => {}} />);
    expect(screen.getByText("—")).toBeTruthy();
  });

  it("五态 Badge 齐全（unsent/scheduled/publishing/published/failed）", () => {
    const channels: ChannelState[] = [
      st({ channel: "website", status: "unsent" }),
      st({ channel: "wechat", status: "scheduled", accountId: 1 }),
      st({ channel: "website", status: "publishing" }),
      st({ channel: "wechat", status: "published", accountId: 1, externalUrl: "https://mp.weixin.qq.com/s/abc" }),
      st({ channel: "website", status: "failed", errMsg: "freepublish 失败" }),
    ];
    render(<ChannelStates itemId={1} channels={channels} canRetry={true} resolveJobId={() => 7} onRetried={() => {}} />);
    expect(screen.getByText("官网·未发布")).toBeTruthy();
    expect(screen.getByText("公众号·已排期")).toBeTruthy();
    expect(screen.getByText("官网·发布中")).toBeTruthy();
    expect(screen.getByText("公众号·已发布")).toBeTruthy();
    expect(screen.getByText("官网·失败")).toBeTruthy();
  });

  it("已发布且外链为绝对地址 → 渲染外链并 target=_blank", () => {
    render(
      <ChannelStates
        itemId={1}
        channels={[st({ status: "published", channel: "wechat", accountId: 1, externalUrl: "https://mp.weixin.qq.com/s/x" })]}
        canRetry={false}
        resolveJobId={() => null}
        onRetried={() => {}}
      />
    );
    const link = screen.getByTestId("channel-link-wechat") as HTMLAnchorElement;
    expect(link.getAttribute("href")).toBe("https://mp.weixin.qq.com/s/x");
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toBe("noreferrer");
  });

  it("外链为站点内路径 → 渲染但不开新窗", () => {
    render(
      <ChannelStates
        itemId={1}
        channels={[st({ status: "published", channel: "website", externalUrl: "/articles/12" })]}
        canRetry={false}
        resolveJobId={() => null}
        onRetried={() => {}}
      />
    );
    const link = screen.getByTestId("channel-link-website") as HTMLAnchorElement;
    expect(link.getAttribute("href")).toBe("/articles/12");
    expect(link.getAttribute("target")).toBeNull();
  });

  it("外链为 javascript: 等非法值 → 不渲染链接（安全过滤）", () => {
    render(
      <ChannelStates
        itemId={1}
        channels={[st({ status: "published", channel: "wechat", accountId: 1, externalUrl: "javascript:alert(1)" })]}
        canRetry={false}
        resolveJobId={() => null}
        onRetried={() => {}}
      />
    );
    expect(screen.queryByTestId("channel-link-wechat")).toBeNull();
  });

  it("失败态且有权限 → 渲染重试按钮；无权限 → 不渲染", () => {
    const { rerender } = render(
      <ChannelStates itemId={1} channels={[st({ status: "failed", channel: "website", errMsg: "x" })]} canRetry={false} resolveJobId={() => null} onRetried={() => {}} />
    );
    expect(screen.queryByTestId("channel-retry-website")).toBeNull();
    rerender(<ChannelStates itemId={1} channels={[st({ status: "failed", channel: "website", errMsg: "x" })]} canRetry={true} resolveJobId={() => 7} onRetried={() => {}} />);
    expect(screen.getByTestId("channel-retry-website")).toBeTruthy();
  });

  it("已发布但无外链 → 只渲染 Badge，不渲染外链", () => {
    render(<ChannelStates itemId={1} channels={[st({ status: "published", channel: "website", externalUrl: null })]} canRetry={false} resolveJobId={() => null} onRetried={() => {}} />);
    expect(screen.queryByTestId("channel-link-website")).toBeNull();
    expect(screen.getByText("官网·已发布")).toBeTruthy();
  });
});

describe("ChannelStates 重试交互", () => {
  it("点击重试 → POST /api/publish-jobs/[id]/retry 并回调 onRetried", async () => {
    const onRetried = vi.fn();
    render(
      <ChannelStates
        itemId={3}
        channels={[st({ status: "failed", channel: "website", errMsg: "凭证失效" })]}
        canRetry={true}
        resolveJobId={() => 42}
        onRetried={onRetried}
      />
    );
    fireEvent.click(screen.getByTestId("channel-retry-website"));
    await waitFor(() => expect(calls.length).toBe(1));
    expect(calls[0].url).toBe("/api/publish-jobs/42/retry");
    expect(calls[0].init?.method).toBe("POST");
    await waitFor(() => expect(onRetried).toHaveBeenCalled());
    expect(toasts.some((t) => t.kind === "success" && t.title === "重试成功")).toBe(true);
  });

  it("resolveJobId 返回 null（无失败任务）→ 提示错误，不发请求", async () => {
    render(
      <ChannelStates itemId={3} channels={[st({ status: "failed", channel: "wechat", accountId: 1, errMsg: "x" })]} canRetry={true} resolveJobId={() => null} onRetried={() => {}} />
    );
    fireEvent.click(screen.getByTestId("channel-retry-wechat"));
    await waitFor(() => expect(toasts.some((t) => t.kind === "error")).toBe(true));
    expect(calls.length).toBe(0);
  });
});