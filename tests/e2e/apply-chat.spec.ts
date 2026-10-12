/**
 * E2E · 访客 /apply AI 咨询（P05 / parity A6）：
 * 管理员在后台新建 OpenAI 兼容供应商（指向本地 mock LLM）→ 访客打开 /apply → 发送消息 → 收到流式回复；
 * 会话 id 持久化在 localStorage `hd_chat_session_id`，后台「对话日志」可查到该会话。
 */
import { expect, test } from "@playwright/test";
import { MOCK_BASE_URL, MOCK_REPLY } from "./fixtures/env";
import { api, apiToken, dialog, expectToast, loginUI } from "./fixtures/helpers";

const PROVIDER = `E2E Mock LLM ${Date.now()}`;

test("访客在 /apply 发送消息收到 AI 流式回复", async ({ page, browser, request }) => {
  // 1) 后台配置供应商（UI，覆盖模型供应商新建表单）
  await loginUI(page);
  await page.goto("/manager/llm-providers");
  await page.getByTestId("llm-create").click();
  const dlg = dialog(page);
  await dlg.getByLabel(/^名称/).fill(PROVIDER);
  await dlg.getByLabel(/^类型/).selectOption("openai");
  await dlg.getByLabel(/^端点/).fill(`${MOCK_BASE_URL}/v1`);
  await dlg.getByLabel(/API Key/).fill("sk-e2e-mock");
  await dlg.getByLabel(/模型名/).fill("mock-model");
  await dlg.getByLabel(/优先级/).fill("1");
  await dlg.getByLabel(/默认模型/).check();
  await dlg.getByTestId("form-submit").click();
  await expect(dlg).toBeHidden();
  await expectToast(page, "success", "已创建");
  const row = page.getByRole("row").filter({ hasText: PROVIDER });
  await expect(row).toBeVisible();

  // 连通性测试（mock 非流式接口）
  await row.getByRole("button", { name: "测试" }).click();
  await expectToast(page, "success", "连通正常");

  // 2) 访客（全新上下文，无后台登录）
  const ctx = await browser.newContext({ locale: "zh-CN", timezoneId: "Asia/Shanghai" });
  const visitor = await ctx.newPage();
  await visitor.goto("/apply");
  const input = visitor.getByPlaceholder(/输入/).first();
  await expect(input).toBeVisible();
  const question = "自考什么时候报名？";
  await input.fill(question);
  await input.press("Enter");
  await expect(visitor.getByText(question).last()).toBeVisible();
  await expect(visitor.getByText(MOCK_REPLY)).toBeVisible({ timeout: 30_000 });

  const sessionId = await visitor.evaluate(() => localStorage.getItem("hd_chat_session_id"));
  expect(sessionId, "会话 id 应持久化到 localStorage").toBeTruthy();
  await ctx.close();

  // 3) 服务端已持久化（对话日志可查）
  const token = await apiToken(request);
  const detail = await api<{ messages: { role: string; message: string }[] }>(
    request, token, "GET", `/api/chat-history/${encodeURIComponent(sessionId!)}`
  );
  expect(detail.messages.some((m) => m.role === "user" && m.message === question)).toBe(true);
  expect(detail.messages.some((m) => m.role === "assistant" && m.message === MOCK_REPLY)).toBe(true);
});
