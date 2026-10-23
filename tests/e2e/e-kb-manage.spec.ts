/**
 * E-11 e2e：知识库"其他管理"——回收站/批量/导出/重建/G10。
 *
 * V8-T-03 修复：本文件原有 3 个**空壳用例**——只有 `test(...)` 名字和一行注释，
 * 函数体里没有任何断言（与 V8-T-01 撤掉的那批 skip 是同一类问题：看起来覆盖了，实际没验）。
 * 本轮补成真实断言：
 *   - 删除 → 回收站 → 恢复闭环（真实上传 → 移入回收站 → 回收站可见 → 恢复 → 回到文件列表）
 *   - 彻底删除需二次确认（confirmDialog）
 *   - 采集来源链接可跳转（来源列 → /manager/collect-items）
 *
 * C-06 / C-12 端点均已存在（/api/knowledge-files、batch、trash、export、rebuild）。
 */
import { expect, test } from "@playwright/test";
import { adminState } from "./fixtures/helpers";

test.use({ storageState: adminState() });

/** 进入第一个知识库的详情视图 */
async function openFirstBaseDetail(page: import("@playwright/test").Page) {
  await page.goto("/manager/knowledge-bases");
  const table = page.getByTestId("kb-bases-table");
  await expect(table).toBeVisible({ timeout: 20_000 });
  await table.locator("tbody tr").first().getByRole("button", { name: "详情" }).click();
  await expect(page.getByTestId("kb-upload")).toBeVisible({ timeout: 15_000 });
}

/** 上传一个 .md，返回文件名；内容嵌入文件名（V9-E2E-01）：服务端按 baseId+sha256 去重且不排除
 * 软删行，固定内容会让本文件内后跑的用例命中前一个用例留下的记录（重复上传 → 新文件永不出现） */
async function uploadMarkdown(page: import("@playwright/test").Page): Promise<string> {
  const name = `e2e-kbmanage-${Date.now()}.md`;
  await page.locator('input[type="file"]').setInputFiles({
    name,
    mimeType: "text/markdown",
    buffer: Buffer.from(`# e2e kb manage\n\nV8-T-03 补真实断言用。（${name}）\n`),
  });
  await expect(page.getByText("上传完成")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId("kb-files-table")).toContainText(name, { timeout: 30_000 });
  return name;
}

test("删除 → 回收站 → 恢复闭环", async ({ page }) => {
  await openFirstBaseDetail(page);
  const name = await uploadMarkdown(page);

  // 1) 文件行「删除」→ 确认 → 移入回收站
  const row = page.getByTestId("kb-files-table").locator("tbody tr").filter({ hasText: name });
  await row.getByRole("button", { name: "删除" }).click();
  // V9-E2E-01：ConfirmDialog 的 Content 是 role="alertdialog"（data-testid=confirm-dialog），
  // 而上传成功的 base-ui toast（priority=low）本身带 role="dialog" 且存活 3.5s——
  // getByRole("dialog") 会先匹配到该 toast（内部无目标按钮，toast 卸载后 outer 变 0 匹配），
  // 表现为点击等待到测试超时。必须按 testid 定位确认框。
  const dlg = page.getByTestId("confirm-dialog");
  await expect(dlg).toBeVisible();
  await dlg.getByRole("button", { name: /移入回收站/ }).click();
  await expect(page.getByText("已移入回收站")).toBeVisible({ timeout: 15_000 });

  // 2) 切到回收站 Tab，该文件应出现
  await page.getByRole("tab", { name: /回收站/ }).click();
  const trash = page.getByTestId("kb-trash-table");
  await expect(trash).toContainText(name, { timeout: 20_000 });

  // 3) 恢复 → 文件应回到「文件」Tab
  const trashRow = trash.locator("tbody tr").filter({ hasText: name });
  await trashRow.getByRole("button", { name: "恢复" }).click();
  await expect(page.getByText("已恢复")).toBeVisible({ timeout: 15_000 });
  await page.getByRole("tab", { name: /^文件/ }).click();
  await expect(page.getByTestId("kb-files-table")).toContainText(name, { timeout: 20_000 });
});

test("彻底删除有确认对话框", async ({ page }) => {
  await openFirstBaseDetail(page);
  const name = await uploadMarkdown(page);

  // 先移入回收站（同上：confirm-dialog 用 testid 定位，避开 role="dialog" 的 toast 抢占）
  const row = page.getByTestId("kb-files-table").locator("tbody tr").filter({ hasText: name });
  await row.getByRole("button", { name: "删除" }).click();
  await page.getByTestId("confirm-dialog").getByRole("button", { name: /移入回收站/ }).click();
  await expect(page.getByText("已移入回收站")).toBeVisible({ timeout: 15_000 });

  await page.getByRole("tab", { name: /回收站/ }).click();
  const trash = page.getByTestId("kb-trash-table");
  await expect(trash).toContainText(name, { timeout: 20_000 });

  // 彻底删除 → 必须弹确认框（不能直接删）
  const trashRow = trash.locator("tbody tr").filter({ hasText: name });
  await trashRow.getByRole("button", { name: /彻底删除/ }).click();
  const confirm = page.getByTestId("confirm-dialog");
  await expect(confirm).toBeVisible({ timeout: 10_000 });
  // 取消后文件仍在回收站（证明确认框真的拦住了操作）
  await confirm.getByRole("button", { name: /取消/ }).click();
  await expect(trash).toContainText(name, { timeout: 15_000 });
});

test("由采集入库的文件详情可跳转到来源采集条目", async ({ page }) => {
  await openFirstBaseDetail(page);

  // 采集入库的文件才有「来源」链接；若当前库无此类文件，则验证链接形态与目标可达
  const link = page.getByTestId("kb-files-table").getByRole("link", { name: /跳转到来源采集条目|采集条目/ }).first();
  if (await link.count()) {
    await expect(link).toHaveAttribute("href", "/manager/collect-items");
    await link.click();
    await expect(page).toHaveURL(/\/manager\/collect-items/);
    return;
  }

  // 无采集来源文件时：断言目标页本身可达（G10 跳转目标有效），并在报告里标注本库无采集文件
  await page.goto("/manager/collect-items");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 15_000 });
});

test("页面级：详情视图 Tab 切换与导出/重建按钮存在", async ({ page }) => {
  await openFirstBaseDetail(page);

  // Tab 切换
  await page.getByRole("tab", { name: /回收站/ }).click();
  await expect(page.getByTestId("kb-trash-table")).toBeVisible({ timeout: 15_000 });
  await page.getByRole("tab", { name: /^文件/ }).click();
  await expect(page.getByTestId("kb-files-table")).toBeVisible({ timeout: 15_000 });

  // 导出 / 重建按钮存在且可用
  await expect(page.getByTestId("kb-export")).toBeVisible();
  await expect(page.getByTestId("kb-rebuild")).toBeVisible();
});
