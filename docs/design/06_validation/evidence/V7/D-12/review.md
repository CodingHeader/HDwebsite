# D-12 独立复审报告（V0.7）

- 复审对象：D-12「采集解析注册表 + 图片流式限长 + 批次超时中止」
- 起点：`543e320`（D-12 首个提交）；终点：`859f8e1`（D-12 提交 + P1 补齐）
- 执行证据：`docs/design/06_validation/evidence/V7/D-12/execution.md`
- 复审日期：2026-10-20
- 复审方式：子智能体独立复审（只读，无 bash → 部分命令未实测）+ 主代理用 bash 实测补齐

## 一、子智能体复审结论（首轮）

- 静态等价判定 PASS：5.12.6.1（`type === "rss"` 无命中）、5.12.6.2（`image/jpeg` 在 collect-engine/upload-route 均 0）
- UNKNOWN（无 bash）：5.12.6.3（vitest）、5.12.6.5（lint/typecheck/test/build）、5.12.6.6（git log 范围）
- 代码层面无 P0；发现 2 个 P1：
  - **P1-1**：RSS 源 `contentMd` 恒为空（`parseRss` 只取 `i.contentSnippet`，RSS 分支跳过 `fetchHtmlDetails`）
  - **P1-2**：`deadlineTimer` tick 到点 `abort()` 后未 `clearInterval` 自身（隐患）
- 完成度 85%（扣分来自门禁未实测）

## 二、主代理实测与复核

**P1-1 复核结论：误判（不成立）**

1. 证据链：`git show 543e320^:src/lib/collect-engine.ts`（D-12 之前版本）第 164 行开始的原 rss 分支，`items` 同样只映射 `contentMd: i.contentSnippet ?? undefined`——**D-12 之前就是同一口径**，非 D-12 引入的回归。
2. `contentSnippet` 是 `rss-parser` 对 `content:encoded` / `description` 的标准化字段，多数含 `<content:encoded>` 的 feed（WordPress / Blogger / 主流 CMS）有值；不含的 feed 本身就没有正文可抓，`fetchHtmlDetails` 抓的是 HTML 详情页，rss 条目的 `link` 指向 feed 内正文的 HTML 页面——理论上可抓，但 **main 蓝本未抓**，D-12 保持行为不变，符合「不改变既有功能」原则。
3. 结论：**维持不变**，不构成 D-12 的 P1（非本卡引入的回归）。但需登记为**既有功能缺口**：RSS 条目未走 HTML 详情页正文抓取，`contentSnippet` 缺失时正文为空。该缺口在 main 蓝本同样存在，按「不改变既有功能」原则 D-12 不改；建议后续新增卡增强 RSS 正文抓取能力。

**P1-2 复核结论：成立（真实隐患）**

- 已修复并提交 `6feb1ec`：tick 内 `if (Date.now() > deadline) { clearInterval(deadlineTimer); timer.abort(); }`；外层 `finally { clearInterval(deadlineTimer); }` 兜底保持不变（重复 clear 幂等无害）。
- 修复后门禁实测通过。

**门禁实测（主代理 bash 补跑）**

| 项 | 结果 |
|---|---|
| `grep -rn 'type === "rss"' src/lib scripts tests` | exit 1（无命中） |
| `grep -c "image/jpeg" src/lib/collect-engine.ts src/app/api/upload/route.ts` | 均 0 |
| `npx vitest run collect.test.ts collect-autokb.test.ts` | collect 10 + autokb 6 全过（706 total in `npm test`） |
| `npm run lint` | 0 errors（45 warnings，既有） |
| `npx tsc --noEmit` | exit 0 |
| `npm test` | 706 passed（57 files） |
| `npm run build` | exit 0（Compiled in 5.9s） |
| `git log --first-parent --no-merges --name-only 543e320^..859f8e1 \| sort -u` | 全部落在 D-12 允许路径内 |

**冻结面核对（git diff 543e320^..HEAD）**

未触碰：`src/contracts/**`、`prisma/schema.prisma`、`prisma/migrations/**`、`package.json` / `package-lock.json`、`vitest.config.ts`、`playwright.config.ts`、`tests/e2e/playwright.config.ts`、`src/app/(web)/**`、`src/components/web/**`、`public/**`、`src/app/globals.css`。

**允许路径核对**

D-12 允许路径清单包含 `src/lib/crud-resources/collect.ts`、`src/lib/collect/**`、`src/lib/collect-engine.ts`、`src/lib/collect-test.ts`、`src/lib/storage.ts`、`src/app/api/upload/**`、`src/app/api/collect-*/**`、`src/lib/__tests__/lane-d/**`、`docs/design/03_solution/decisions/ADR-032-*.md`——D-12 全部改动均落在此范围内，无越界。

## 三、最终判断

- **结论：PASS（完成度 95%）**
- 依据：门禁四连全部 exit 0（主代理实测）；验收 6 项全部 PASS；P1-2 已修复并提交 `6feb1ec`；P1-1 经证据链证明为误判；无越界；冻结面未触碰。
- 前提：RSS 正文抓取能力与 main 蓝本保持一致（`contentSnippet` 口径），`fetchHtmlDetails` 仅 html 类型调用。
- 局限性：
  - e2e `collect-publish.spec.ts` 未在本机实跑（无浏览器工具），归 W2-05 全量回归范围。
  - `transferImagesInMarkdown` 每次图片下载固定 `sleep(500)`，批量条目多时会拉长批次时长，由 30 分钟上限兜底；未做并发优化（不在 D-12 范围）。
- 允许进入下一阶段：**是**，推进 D-13。