/**
 * E-04 e2e：知识库管理页（V8-T-01：撤除 2 条过期 skip，C-06 已关闭）
 *
 * 原 skip 理由「C-06 未合并、端点 404」已不成立：
 *   /api/knowledge-bases、/api/knowledge-files 均已存在（src/app/api/knowledge-bases、knowledge-files）。
 * 本文件改为**真实断言**：
 *   - 上传 .md → 走真实 multipart 接口 → 文件表出现该文件
 *   - 上传 .pdf → 前端白名单拦截，显示 KB_REJECT_MESSAGE（不发请求）
 *
 * 组件级白名单拦截另有 src/app/manager/knowledge-bases/__tests__/kb-upload.test.tsx（6 用例）。
 */
import { expect, test } from "@playwright/test";
import { ADMIN, E2E_BASE_URL } from "./fixtures/env";
import { adminState } from "./fixtures/helpers";

test.use({ storageState: adminState() });

/** 进入第一个知识库的详情视图（详情里有上传区与文件表） */
async function openFirstBaseDetail(page: import("@playwright/test").Page) {
  await page.goto("/manager/knowledge-bases");
  const table = page.getByTestId("kb-bases-table");
  await expect(table).toBeVisible({ timeout: 20_000 });
  const firstRow = table.locator("tbody tr").first();
  await expect(firstRow).toBeVisible({ timeout: 20_000 });
  await firstRow.getByRole("button", { name: "详情" }).click();
  await expect(page.getByTestId("kb-upload")).toBeVisible({ timeout: 15_000 });
}

test("上传 .md → 文件条目出现在文件表（V8-T-01 撤 skip）", async ({ page }) => {
  await openFirstBaseDetail(page);

  const filesTable = page.getByTestId("kb-files-table");
  // 注意：空状态也会渲染 1 行（"暂无文件"），所以不能直接数 tbody tr。
  // 用真实文件名做断言：上传后该文件名必须出现在表内。
  const filename = `e2e-kb-${Date.now()}.md`;

  const input = page.locator('input[type="file"]');
  await input.setInputFiles({
    name: filename,
    mimeType: "text/markdown",
    buffer: Buffer.from("# e2e 知识库上传\n\n这是 V8-T-01 撤除 skip 后的真实上传用例。\n"),
  });

  // 上传成功 Toast（证明请求打到真实端点并返回 2xx）
  await expect(page.getByText("上传完成")).toBeVisible({ timeout: 30_000 });
  // 文件名进入文件表（证明落库并刷新）
  await expect(filesTable).toContainText(filename, { timeout: 30_000 });
});

test("上传 .pdf → 前端拦截并显示 KB_REJECT_MESSAGE（V8-T-01 撤 skip）", async ({ page }) => {
  await openFirstBaseDetail(page);

  const input = page.locator('input[type="file"]');
  await input.setInputFiles({
    name: "e2e-reject.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.4 e2e reject probe"),
  });

  // 前端白名单拦截：出现 role=alert 的拒绝区，文案与后端 KB_REJECT_MESSAGE 一致
  const reject = page.getByTestId("kb-upload-reject");
  await expect(reject).toBeVisible({ timeout: 10_000 });
  await expect(reject).toContainText("不支持 PDF 和图片");
});

test("e2e 账号可访问知识库接口（前置条件自检）", async ({ request }) => {
  // 防「用例因 401/404 而空过」：先证明接口真的可用
  const login = await request.post(`${E2E_BASE_URL}/api/auth/login`, {
    data: { username: ADMIN.username, password: ADMIN.password },
  });
  expect(login.ok()).toBeTruthy();
  const token = (await login.json()).data.token as string;

  const res = await request.get(`${E2E_BASE_URL}/api/knowledge-bases?page=1&limit=10`, {
    headers: { authorization: `Bearer ${token}` },
  });
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(Array.isArray(body.data.list)).toBe(true);
});
