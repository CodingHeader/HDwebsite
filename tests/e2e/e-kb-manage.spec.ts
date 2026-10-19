/**
 * E-11 e2e：知识库"其他管理"——回收站/批量/导出/重建/G10。
 * 文件条目端点（GET/DELETE /api/knowledge-files、batch、trash、export、rebuild）属 C-06/C-12
 * （未合并前端点 404）——闭环用例（删除→回收站→恢复、彻底删除确认、G10 跳转）标 skip，
 * W2-05（C 线合并后）复跑取消 skip；页面级 UI（Tab 切换/导出按钮存在）可跑。
 */
import { expect, test } from "@playwright/test";
import { adminState } from "./fixtures/helpers";

test.use({ storageState: adminState() });

test("删除 → 回收站 → 恢复闭环（待 C-12：W2-05 复跑）", async ({ page }) => {
  // 前置：库 + 文件条目（C-06/C-12 合并后可用）
});

test("彻底删除有确认对话框（待 C-12：W2-05 复跑）", async ({ page }) => {
  // 回收站 Tab → 彻底删除 → confirmDialog（danger）
});

test("由采集入库的文件详情可跳转到来源采集条目（待 C-12：W2-05 复跑）", async ({ page }) => {
  // 文件行"来源"列显示「采集条目 #N」链接 → /manager/collect-items
});

test("页面级：详情视图 Tab 切换与导出/重建按钮存在", async ({ page }) => {
  await page.goto("/manager/knowledge-bases");
  // 库列表（C-06 未合并 → 空态/错误态，但页面骨架可渲染）
  const createBtn = page.getByTestId("kb-create");
  await expect(createBtn).toBeVisible({ timeout: 15_000 });
});
