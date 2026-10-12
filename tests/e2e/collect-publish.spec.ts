/**
 * E2E · 内容生产主链（P05）：
 * 新建通知收件人 → 新建采集源（指向 mock 站点）→ 试抓（不入库预览）→ 立即执行（入库待审）
 * → 采集审核"通过"（进入内容中枢 + 默认已入知识库 + 自动排期发布，P06）→ 新建发布任务（10 分钟后排期，发布前提醒）
 * → notify.scan（每分钟）触发 before_publish_news → 通知记录出现（SMTP 未配置 → skipped）
 */
import { expect, test } from "@playwright/test";
import { MOCK_BASE_URL } from "./fixtures/env";
import { MOCK_NEWS } from "./fixtures/mock-llm";
import { api, apiToken, dialog, expectToast, loginUI } from "./fixtures/helpers";

const STAMP = Date.now();
const SOURCE = `E2E 采集源 ${STAMP}`;
const EMAIL = `e2e-${STAMP}@example.com`;

/** Asia/Shanghai 本地时间（datetime-local 值） */
function localInput(msFromNow: number) {
  return new Date(Date.now() + msFromNow + 8 * 3600_000).toISOString().slice(0, 16);
}

test("采集源试抓 → 执行 → 审核通过 → 建发布任务 → 通知记录出现", async ({ page, request }) => {
  test.setTimeout(240_000);
  await loginUI(page);
  const dlg = dialog(page);

  // 1) 通知收件人（publish 组）
  await page.goto("/manager/notify-recipients");
  await page.getByTestId("crud-create").click();
  await dlg.getByLabel("姓名").fill("E2E 运营");
  await dlg.getByLabel("邮箱").fill(EMAIL);
  await dlg.getByLabel(/通知组/).fill("publish");
  await dlg.getByTestId("form-submit").click();
  await expect(dlg).toBeHidden();
  await expectToast(page, "success", "已创建");
  await expect(page.getByRole("row").filter({ hasText: EMAIL })).toBeVisible();

  // 2) 采集源
  await page.goto("/manager/collect-sources");
  await page.getByTestId("crud-create").click();
  await dlg.getByLabel(/^名称/).fill(SOURCE);
  await dlg.getByLabel(/^类型/).selectOption("html");
  await dlg.getByLabel("列表页 URL").fill(`${MOCK_BASE_URL}/news/list.html`);
  await dlg.getByLabel("Cron 表达式").fill("0 4 * * *");
  await dlg.getByTestId("form-submit").click();
  await expect(dlg).toBeHidden();
  await expectToast(page, "success", "已创建");
  const sourceRow = page.getByRole("row").filter({ hasText: SOURCE });
  await expect(sourceRow).toBeVisible();

  // 3) 试抓：信息对话框列出解析结果（不入库）
  await sourceRow.getByRole("button", { name: "试抓" }).click();
  const info = page.getByTestId("confirm-dialog");
  await expect(info).toContainText(`解析到 ${MOCK_NEWS.length} 条`);
  await expect(info.getByTestId("collect-test-result")).toContainText(MOCK_NEWS[0].title);
  await info.getByRole("button", { name: "知道了" }).click();
  await expect(info).toBeHidden();

  // 4) 立即执行（需确认）→ Toast 报告新增条数
  await sourceRow.getByRole("button", { name: "立即执行" }).click();
  await page.getByTestId("confirm-ok").click();
  await expectToast(page, "success", "采集执行完成");
  await expect(page.getByTestId("toast-success").filter({ hasText: `新增 ${MOCK_NEWS.length} 条` })).toBeVisible();

  // 5) 审核通过
  await page.goto("/manager/collect-items");
  await page.getByRole("button", { name: "待审核", pressed: false }).click();
  const itemRow = page.getByRole("row").filter({ hasText: MOCK_NEWS[0].title });
  await expect(itemRow).toBeVisible();
  await itemRow.getByRole("button", { name: `通过 ${MOCK_NEWS[0].title}` }).click();
  await expectToast(page, "success", "审核通过");
  await expect(page.getByRole("row").filter({ hasText: MOCK_NEWS[0].title })).toHaveCount(0); // 已离开待审列表

  // 6) 新建发布任务（10 分钟后排期 + 发布前提醒）
  await page.goto("/manager/publish-jobs");
  await page.getByTestId("publish-create").click();
  const itemSelect = dlg.getByLabel(/内容条目/);
  const option = itemSelect.locator("option", { hasText: MOCK_NEWS[0].title }).first();
  await expect(option).toBeAttached();
  await itemSelect.selectOption((await option.getAttribute("value"))!);
  await dlg.getByLabel("发布渠道").selectOption("website");
  await dlg.getByLabel("内容类型").selectOption("article");
  await dlg.getByLabel(/排期时间/).fill(localInput(10 * 60_000));
  await expect(dlg.getByLabel("发布前邮件提醒")).toBeChecked();
  await dlg.getByTestId("form-submit").click();
  await expect(dlg).toBeHidden();
  await expectToast(page, "success", "已创建");
  // P06：审核通过后已按设置自动排期 1 个官网任务（publishAutoChannels），此处手动任务为第 2 行
  await expect(page.getByRole("row").filter({ hasText: MOCK_NEWS[0].title })).toHaveCount(2);

  // 7) 通知记录：notify.scan 每分钟运行，最长等待 ~150s
  const token = await apiToken(request);
  await expect
    .poll(
      async () => {
        const res = await api<{ list: { event: string; toEmails: string; status: string }[] }>(
          request, token, "GET", "/api/notify-records?limit=50&event=before_publish_news"
        );
        return res.list.find((r) => r.toEmails.includes(EMAIL))?.status ?? "";
      },
      { timeout: 150_000, intervals: [5_000] }
    )
    .toMatch(/skipped|sent|pending|failed/);

  await page.goto("/manager/notify-records");
  const recordRow = page.getByRole("row").filter({ hasText: EMAIL });
  await expect(recordRow).toBeVisible();
  await expect(recordRow).toContainText("before_publish_news");
});
