/**
 * E-02 e2e：通知规则页（V8-T-01：撤除静默时段 skip）
 *
 * 原 skip 理由「PATCH 的 data 丢弃 quietHours（DR-24）」已不成立：
 *   src/app/api/notify-rules/[id]/route.ts 已合并 quietHours（B-06 落地）。
 * 本条改为真实断言：设置静默时段 → 保存 → 刷新 → 表格「静默时段」列回读一致。
 *
 * 依赖：admin storageState（globalSetup 注入）；e2e.db 种子含 7 条 NotifyRule。
 */
import { expect, test } from "@playwright/test";
import { adminState } from "./fixtures/helpers";

test.use({ storageState: adminState() });

test("切换 enabled 与收件人分组保存后刷新回读一致", async ({ page }) => {
  await page.goto("/manager/notify-rules");

  // 种子 7 条规则
  const rows = page.getByTestId("notify-rules-table").locator("tbody tr");
  await expect(rows).toHaveCount(7, { timeout: 15_000 });

  // 编辑第一条：取当前启用状态（表格渲染为 Badge 文本）并切换
  const first = rows.first();
  const firstEventLabel = (await first.locator("td").first().innerText()).split("\n")[0];
  const beforeState = (await first.innerText()).includes("启用") && !(await first.innerText()).includes("停用");
  await first.getByRole("button", { name: "编辑" }).click();

  const dlg = page.getByRole("dialog");
  await expect(dlg).toBeVisible();
  const enabledSwitch = dlg.getByTestId("notify-rule-enabled");
  await enabledSwitch.click();
  const groupsInput = dlg.getByTestId("notify-rule-groups");
  await groupsInput.fill("publish,ops");
  await dlg.getByRole("button", { name: "保存" }).click();

  // 保存 Toast + 弹窗关闭 + 回读
  await expect(page.getByText("规则已更新")).toBeVisible({ timeout: 10_000 });
  await expect(dlg).toBeHidden();

  // 刷新后回读一致：启用状态翻转、分组更新
  await page.reload();
  const firstAfter = page.getByTestId("notify-rules-table").locator("tbody tr").first();
  await expect(firstAfter.locator("td").first()).toContainText(firstEventLabel, { timeout: 15_000 });
  const afterText = await firstAfter.innerText();
  expect(afterText.includes("停用")).toBe(beforeState); // 启用 ↔ 停用 翻转
  await expect(firstAfter).toContainText("publish, ops");
});

test("静默时段保存后刷新回读一致（V8-T-01 撤 skip）", async ({ page }) => {
  await page.goto("/manager/notify-rules");

  const rows = page.getByTestId("notify-rules-table").locator("tbody tr");
  await expect(rows).toHaveCount(7, { timeout: 15_000 });

  // 取最后一条，避免与上一用例（改第一条）互相影响
  const target = rows.last();
  const eventLabel = (await target.locator("td").first().innerText()).split("\n")[0];
  await target.getByRole("button", { name: "编辑" }).click();

  const dlg = page.getByRole("dialog");
  await expect(dlg).toBeVisible();

  // 设一个固定的、非默认的静默时段
  await dlg.getByTestId("notify-rule-quiet-start").fill("22:00");
  await dlg.getByTestId("notify-rule-quiet-end").fill("07:00");
  await dlg.getByRole("button", { name: "保存" }).click();

  await expect(page.getByText("规则已更新")).toBeVisible({ timeout: 10_000 });
  await expect(dlg).toBeHidden();

  // 刷新后「静默时段」列必须回读到 22:00 – 07:00（证明 PATCH 真的持久化了 quietHours）
  await page.reload();
  const after = page.getByTestId("notify-rules-table").locator("tbody tr").last();
  await expect(after.locator("td").first()).toContainText(eventLabel, { timeout: 15_000 });
  await expect(after).toContainText("22:00");
  await expect(after).toContainText("07:00");
});
