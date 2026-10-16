/**
 * A11y 冒烟（CCR-1 / W0-11；REQ-NF-003）：
 * 登录页 axe 扫描 critical=0。保证 --list 非空，为 E-08/A-08 提供守卫基线。
 */
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("登录页无 critical 可访问性问题", async ({ page }) => {
  await page.goto("/manager/login");
  const results = await new AxeBuilder({ page }).analyze();
  const critical = results.violations.filter((v) => v.impact === "critical");
  expect(
    critical,
    `发现 critical 级 a11y 问题：\n${critical.map((v) => `${v.id}: ${v.help} (${v.nodes.length} 节点)`).join("\n")}`
  ).toHaveLength(0);
});
