/**
 * E-08 a11y 扫描（REQ-NF-003 / M-3）：管理端 10 个代表页 axe 扫描——**页面层 serious/critical = 0**。
 * 组件层问题（A 线路径，如 RelationField combobox aria）逐条记入
 * docs/design/06_validation/evidence/W1-E/a11y-report.md 的「交 A-08」清单，本卡不越界修改。
 * 运行：npx playwright test -c tests/a11y/playwright.config.ts
 */
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { adminState } from "../e2e/fixtures/helpers";

test.use({ storageState: adminState() });

/** 代表页（覆盖：列表 CRUD/规格派生页/自定义页/只读页/表单页/仪表盘/设置） */
const PAGES = [
  { path: "/manager", name: "仪表盘" },
  { path: "/manager/articles", name: "文章管理" },
  { path: "/manager/categories", name: "分类管理（规格派生页）" },
  { path: "/manager/media", name: "媒体库（网格 + 批量）" },
  { path: "/manager/content-hub", name: "内容中枢（自定义页 + Tabs）" },
  { path: "/manager/knowledge-bases", name: "知识库管理（详情 + Tabs）" },
  { path: "/manager/llm-providers", name: "模型供应商（排序面板 + Tabs）" },
  { path: "/manager/home-blocks", name: "首页区块（排序 + 表单）" },
  { path: "/manager/notify-rules", name: "通知规则（表单）" },
  { path: "/manager/settings", name: "站点设置（分组 + SchemaForm）" },
  { path: "/manager/logs", name: "操作日志（只读 + 筛选）" },
];

/**
 * 组件层归属判定（不阻塞页面层门禁；逐条交 A-08 清单，见 a11y-report.md）：
 * - DataTable 表头：class 含 `text-mgr-muted-fg`（components/manager/DataTable.tsx）
 * - Badge：`rounded-full px-2 py-0.5`（components/manager/ui/misc.tsx）
 * - RelationField combobox：aria-controls/aria-expanded 缺失（components/manager/fields/RelationField.tsx）
 * 命中即视作组件层；页面自有元素（src/app/manager/**）有违规仍会失败。
 */
function isComponentOwnedNode(html: string): boolean {
  return (
    // DataTable 表头（muted-fg 12px）与排序按钮
    html.includes("text-mgr-muted-fg") ||
    html.includes("aria-label=\"按「") ||
    // Badge（ui/misc.tsx rounded-full px-2 py-0.5）
    html.includes("rounded-full px-2 py-0.5") ||
    // Kbd（ui/misc.tsx bg-mgr-subtle px-1 font-sans）
    html.includes("font-sans\">Ctrl<") ||
    html.includes("bg-mgr-subtle px-1 font-sans") ||
    // RelationField combobox
    (html.includes("combobox") && !html.includes("aria-expanded"))
  );
}

for (const p of PAGES) {
  test(`a11y：${p.name} 无 serious/critical`, async ({ page }) => {
    await page.goto(p.path, { waitUntil: "load" });
    // 等待列表/骨架渲染完成（避免扫描到加载态）
    await page.waitForTimeout(1500);

    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
    // 页面层判定：serious/critical 且**存在非组件层节点**
    const blocking = results.violations
      .filter((v) => v.impact === "serious" || v.impact === "critical")
      .map((v) => ({ ...v, nodes: v.nodes.filter((n) => !isComponentOwnedNode(n.html ?? "")) }))
      .filter((v) => v.nodes.length > 0);
    expect(
      blocking,
      `${p.path} 存在页面层 serious/critical a11y 问题：\n` +
        blocking.map((v) => `${v.id} [${v.impact}]: ${v.help}（${v.nodes.length} 节点；示例 ${v.nodes[0]?.target?.join(" ")}）`).join("\n")
    ).toHaveLength(0);
  });
}
