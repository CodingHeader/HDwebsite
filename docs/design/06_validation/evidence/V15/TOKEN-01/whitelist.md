# V15-TOKEN-01 白名单：令牌作用域例外（2 处）

> 登记时间：2026-10-27 · 执行者：external-assistant
> 前置状态：`evidence/V14/UI-CONSIST-01/audit-matrix.md` 汇总 `令牌作用域 FAIL | 2`
> 范围：`src/app/manager/**` 硬编码色值，仅登记，不改任何 className / style。

## 判定口径
REQ-F-015 §5 要求管理端只用 `mgr-*` 令牌、无全局污染；但 `mgr-*` 令牌不覆盖"模拟第三方界面"与"反色语义"两类正当场景。本白名单登记 2 处经核实确属正当、不改动即可接受的例外。除本 2 处外，`node scripts/audit-manager-ui.mjs` 全量扫描未发现其他硬编码色值（令牌 FAIL = 2，无遗漏）。

---

## 例外 1 · 公众号阅读界面模拟预览

| 字段 | 内容 |
|---|---|
| 文件:行号 | `src/app/manager/content-hub/page.tsx:531-534` |
| 命中内容 | 531 `<div className="rounded-mgr-control bg-[#f7f7f7] p-4" style={{ fontFamily: "system-ui, sans-serif" }}>`<br>532 `<p className="mb-2 text-center text-[15px] font-bold text-black">{viewing.title}</p>`<br>533 `<p className="mb-3 text-center text-[11px] text-gray-400">点击上方蓝字关注我们</p>`<br>534 `<div className="text-[13px] leading-6 text-gray-800">` |
| 为何不能改 `mgr-*` | 这是微信公众号文章的**预览模拟**。真实公众号界面配色是微信原生固定配色（浅灰底 `#f7f7f7`、黑色标题、灰色正文），不随管理端主题变化。改用 `mgr-*`（管理端令牌）会使预览与实际公众号渲染不一致，预览失去"还原真实形态"的意义。 |
| 强行改的后果 | 违反 REQ-F-015 §5 的管理端顶级体验——预览必须准确反映内容真实呈现形态；功能上运营无法核对公众号最终视觉，且用 `mgr-*` 模拟第三方界面属语义错用。 |
| 批准结论 | 登记白名单，本轮不改（不改 className / style）。 |

## 例外 2 · 登录页品牌渐变反白

| 字段 | 内容 |
|---|---|
| 文件:行号 | `src/app/manager/login/page.tsx:63,68,73,77` |
| 命中内容 | 63 `"radial-gradient(circle at 20% 20%, #fff 0, transparent 40%), radial-gradient(circle at 80% 70%, #fff 0, transparent 35%)"`（内联 style 背景光斑，`#fff`）<br>68 `<span className="... bg-white/15 text-lg font-bold">弘</span>`（`bg-white/15`）<br>73 `<p className="mt-3 text-[14px] leading-relaxed text-white/80">`（`text-white/80`）<br>77 `<p className="relative flex items-center gap-2 text-[12px] text-white/70">`（`text-white/70`） |
| 为何不能改 `mgr-*` | 登录页品牌区是**深色品牌渐变**上的**反白文字/半透明白**叠加。`text-white/80`、`text-white/70`、`bg-white/15` 承担"反色语义"（白字压深底），`#fff` 光斑是品牌渐变装饰。管理端令牌无"反白"语义——`mgr-fg` / `mgr-primary-fg` 是正色前景，用于浅色表面；强行替换会失去反白对比。 |
| 强行改的后果 | 违反 REQ-F-015 §5 管理端顶级体验与品牌一致性；白字/白底在深色渐变上需保持反白，改 `mgr-*` 会导致文字与背景对比不足或色彩语义混乱，破坏品牌视觉。 |
| 批准结论 | 登记白名单，本轮不改（不改 className / style）。 |

---

## 登记后判定
- 令牌作用域 FAIL 仍为 2（本白名单不改判定，仅登记），`audit-matrix.md` 汇总表下方追加"已知例外"小节指向本文件。
- 未发现其他硬编码色值需登记；未发现无正当理由需改的色值。