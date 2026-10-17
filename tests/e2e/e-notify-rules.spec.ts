/**
 * E-02 e2e：通知规则页——切换 enabled 保存后刷新回读一致。
 * quietHours 回读一致（B-06 PATCH 合并前）标 skip：当前 [id]/route.ts 的 update data 不含
 * quietHours（DR-24），保存回读不变——待 B-06 合并后 W2-05 复跑取消 skip。
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

test.skip("静默时段保存后刷新回读一致（待 B-06：PATCH 合并 quietHours 后 W2-05 复跑）", async () => {
  // 当前 PATCH data 丢弃 quietHours（DR-24），保存回读不变——B-06 合并后取消本 skip。
});
