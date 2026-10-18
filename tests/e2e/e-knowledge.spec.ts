/**
 * E-04 e2e：知识库管理页——**依赖 C-06（C 线 /api/knowledge-bases、/api/knowledge-files 端点）**。
 * C-06 未合并前端点 404，全部用例 skip；W2-05（C 线合并后）取消 skip 并复跑：
 * - 上传 .md → 条目数>0；上传 .pdf → 400 提示（KB_REJECT_MESSAGE）
 * - 组件级白名单拦截已由 src/app/manager/knowledge-bases/__tests__/kb-upload.test.tsx 覆盖（6 用例）
 */
import { expect, test } from "@playwright/test";
import { adminState } from "./fixtures/helpers";

test.use({ storageState: adminState() });

test.skip("上传 .md → 文件条目出现（待 C-06：W2-05 复跑）", async ({ page }) => {
  await page.goto("/manager/knowledge-bases");
  await expect(page.getByTestId("kb-bases-table")).toBeVisible();
  // 详情 → 上传 .md → 文件列表条目数>0
});

test.skip("上传 .pdf → 拦截并显示后端同款中文提示（待 C-06：W2-05 复跑）", async ({ page }) => {
  await page.goto("/manager/knowledge-bases");
  // 前端拦截（不发请求）由组件测试覆盖；e2e 验证端到端 400 + KB_REJECT_MESSAGE
});
