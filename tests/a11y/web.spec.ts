/**
 * V14-A11Y-01：前台（web）代表页 axe 扫描 —— REQ-NF-003。
 *
 * 为什么需要本文件（V14 审计证据）：
 *   `tests/a11y/manager.spec.ts` 只覆盖 `/manager/**`；前台 `(web)/**` 此前**无任何 axe 用例**，
 *   前台无障碍覆盖率 = 0（V14 缺口清单 G5）。
 *
 * ══════════════════════════════════════════════════════════════════════
 * 判定口径：为什么不是"0 违规"，而是"0 违规 或 main 基线色对"
 * ══════════════════════════════════════════════════════════════════════
 *
 * 2026-10-27 实测（完整取证链）：
 *   1. 前台 serious/critical 违规**只有一条规则**：`color-contrast`
 *   2. 修复它**只能改 className**（如 `text-white/90`→`text-white`），
 *      而 REQ-F-014 要求"组件 JSX/className 与 main 逐字一致" → 直接冲突
 *   3. 冲突**不是 upgrade 引入的回归**。证据：
 *      `git show origin/main:src/components/web/Footer.tsx` 的根节点同样是
 *      `<footer className="bg-[#da251d] text-white/80">`，与当前完全一致；
 *      Navbar/Navigation 的 `text-white/90` 在 main 中分别命中 5 个文件。
 *   4. 因此按 `tasks/V14-A11Y-01.md`「若必须改样式 → 写明原因（冻结优先）」与
 *      `01-需求基线复核.md` §4.1 B2「只改 aria/role/label，其余登记上报，不得自行选方案 B」：
 *      **本卡不改前台样式**，改为按「main 基线色对」豁免并逐条登记，同时上报用户裁决。
 *
 * 为什么按"色对"而不是"class token"判定：
 *   axe 报的是**混合后**的 fg/bg 颜色。例如 `text-white/90`(#fff, 90%) 叠在 `#da251d` 上，
 *   axe 算出 fg=#fbe9e8；而 `#fbe9e8` 这个 hex 在 main 源码里 grep 不到（它是计算结果）。
 *   同时页脚是 `<footer class="text-white/80">` 内裸 `<span>` 继承颜色 —— 节点自身 HTML 无色类。
 *   ⇒ 只能按计算色对判定，按 token 判定会漏（已实测漏报）。
 *
 * ⚠️ 已知局限（如实记录，不隐瞒）：
 *   本白名单按色对放行，因此**无法区分**"main 原有该色对"与"upgrade 新增同色对用法"。
 *   即：新页面若也用 `text-gray-400` 于白底，会被放行。
 *   接受该局限的原因：唯一替代是改 className（违反冻结）或永久红灯（门禁失效）。
 *   收敛路径：待 B2 裁决后改为「对 main 基线实跑 axe 做逐节点 diff」的真正 ratchet。
 *
 * 除 `color-contrast` 外的任何规则（缺可读名、键盘不可达、aria 错误、label 缺失…）**照常阻断**。
 */
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

/** 前台代表页：首页 / 列表 / 表单页 / 静态页 */
const PAGES = [
  { path: "/", name: "首页" },
  { path: "/articles", name: "新闻资讯列表" },
  { path: "/courses", name: "课程中心" },
  { path: "/apply", name: "在线报名（含 AI 客服）" },
  { path: "/contact", name: "联系我们" },
] as const;

/**
 * main 基线低对比度**色对**白名单（fg|bg，小写十六进制）。
 *
 * 每对都标了它与 main 原生样式的对应关系，便于复核：
 *   - #fbe9e8 on #da251d ← `text-white/90` 叠品牌红（main Navbar:145/203、Navigation:85/105/151）
 *   - #f8d3d2 on #da251d ← `text-white/80` 叠品牌红（main Footer 根节点）
 *   - #f4bebb on #da251d ← `text-white/70` 叠品牌红（main Footer 次级文字）
 *   - #99a1af on #ffffff ← `text-gray-400` 于白底
 *   - #da251d on #fbe9e8 ← 品牌红文字于 `bg-[#da251d]/10` 浅粉徽标底
 *   - #da251d on #f6e5e5 ← 品牌红文字于更深一档浅粉底
 *   - #ffffff on #5b9bd5 ← 白字于蓝色底
 *   - #ffffff on #7bc142 ← 白字于绿色底
 */
const MAIN_BASELINE_COLOR_PAIRS = new Set(
  [
    "#fbe9e8|#da251d", // text-white/90 on brand red  (4.20:1)
    "#f8d3d2|#da251d", // text-white/80 on brand red  (3.57:1)
    "#f4bebb|#da251d", // text-white/70 on brand red  (3.03:1)
    "#99a1af|#ffffff", // text-gray-400 on white      (2.60:1)
    "#da251d|#fbe9e8", // brand red on bg-[#da251d]/10 (4.20:1)
    "#da251d|#f6e5e5", // brand red on light pink      (4.04:1)
    "#ffffff|#5b9bd5", // white on blue                (2.96:1)
    "#ffffff|#7bc142", // white on green               (2.19:1)
    "#ffffff|#f5a623", // white on orange（校长电话浮动按钮；main FloatingContact.tsx:91 逐字一致）(2.02:1)
  ].map((s) => s.toLowerCase())
);

/** 仅此规则受白名单影响 */
const EXEMPTIBLE_RULE = "color-contrast";

type ContrastCheckData = { fgColor?: string; bgColor?: string };

/** 判断某 color-contrast 失败节点是否命中 main 基线色对 */
function isMainBaselineContrast(node: {
  any?: Array<{ data?: ContrastCheckData | ContrastCheckData[] }>;
}): boolean {
  const checks = node.any ?? [];
  for (const c of checks) {
    const data = Array.isArray(c.data) ? c.data[0] : c.data;
    if (!data?.fgColor || !data?.bgColor) continue;
    const key = `${data.fgColor.toLowerCase()}|${data.bgColor.toLowerCase()}`;
    if (MAIN_BASELINE_COLOR_PAIRS.has(key)) return true;
  }
  return false;
}

for (const p of PAGES) {
  test(`前台 a11y：${p.name} 无 serious/critical（main 基线对比度除外）`, async ({ page }) => {
    await page.goto(p.path, { waitUntil: "load" });
    // 等首屏渲染稳定（避免扫到骨架/加载态造成的伪违规）
    await page.waitForTimeout(1200);

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();

    const serious = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");

    let exemptedCount = 0;
    const unknownPairs = new Set<string>();

    const blocking = serious
      .map((v) => {
        const nodes = v.nodes.filter((n) => {
          if (v.id !== EXEMPTIBLE_RULE) return true; // 非对比度规则：一律阻断
          if (isMainBaselineContrast(n as never)) {
            exemptedCount++;
            return false;
          }
          // 记录未在白名单中的色对，便于失败时直接看到"差哪个色"
          const check = (n as { any?: Array<{ data?: ContrastCheckData }> }).any?.[0]?.data;
          if (check?.fgColor && check?.bgColor) {
            unknownPairs.add(`${check.fgColor}|${check.bgColor}`);
          }
          return true;
        });
        return { ...v, nodes };
      })
      .filter((v) => v.nodes.length > 0);

    if (exemptedCount > 0) {
      console.warn(
        `[a11y][main 基线遗留] ${p.path}：${exemptedCount} 个 color-contrast 节点属 main 原生低对比度色对，` +
          `已登记待裁决（修它须改 className，与 REQ-F-014 冲突）`
      );
    }

    expect(
      blocking,
      `${p.path} 存在前台 serious/critical a11y 问题（非 main 基线遗留）：\n` +
        blocking
          .map(
            (v) =>
              `${v.id} [${v.impact}]: ${v.help}（${v.nodes.length} 节点；示例 ${v.nodes[0]?.target?.join(" ")}）`
          )
          .join("\n") +
        (unknownPairs.size ? `\n未在白名单的色对：${[...unknownPairs].join(", ")}` : "")
    ).toHaveLength(0);
  });
}
