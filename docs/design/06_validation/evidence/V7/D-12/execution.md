# D-12 执行记录（证据）

## 5W1H 简版
- **What**：把 `collect-engine.ts` 里的 `if (source.type === "rss")` 硬判断收敛为解析器注册表；采集图片下载改为流式累计限长；单个采集批次超过 30 分钟中止并标记失败 + 触发通知。
- **Why**：REQ-NF-001 §3 AC3 + 规划基线 M-7「注册表化未做」登记项。原实现新增源类型需同时改引擎/试抓预览/测试/UI 白名单，易漏改。
- **Where**：`src/lib/collect/parsers.ts`（新）、`src/lib/collect-engine.ts`、`src/lib/collect-test.ts`、`src/app/api/upload/route.ts`、`src/lib/storage.ts`。
- **Who**：D-12（P3·sonnect），依赖 D-09，上游 W2-05/W2-08。
- **How**：先建注册表 + 单测，再改引擎与试抓预览，最后跑门禁与独立复审。
- **When**：2026-10-20。

## 改动文件
- **新增** `src/lib/collect/parsers.ts`：`ParserType/ParserRule/ParsedItem/ParserFn` + `parseHtmlList` / `parseRss` / `fetchHtmlDetails` / `extractHtmlContent` + `getParser(type)` / `isKnownParserType`。`parseRss` 通过注入 `fetchText` 取 XML 后交给 `rss-parser.parseString`，与 html 路径共用同一超时/中止信号（修复复审 P1-1）。
- **改** `src/lib/collect-engine.ts`：
  - `runSource` 改用 `getParser(source.type)` + `fetchHtmlDetails`，不再有 `type === "rss"` 分叉；
  - 新增 `COLLECT_BATCH_TIMEOUT_MS = 30 * 60 * 1000`；
  - `fetchWithSignal`（文本）/ `fetchWithSignalResponse`（Response，供 transferImage 复用）——内部 `setTimeout(inner.abort)`，外部 `AbortSignal` 仅注册一次，finally 清理；
  - `transferImage` 流式累计 `total > COLLECT_IMAGE_MAX_SIZE` 立即 `reader.cancel()` 返回 null 留原链；白名单走 `COLLECT_IMAGE_TYPES`；
  - catch 把 abort 归一化为可读「采集批次超时（30 分钟）」；finally 统一 `clearInterval(deadlineTimer)`（修复复审 P1-2）。
- **改** `src/lib/collect-test.ts`：试抓预览复用注册表，移除 `rss-parser` / `cheerio` 与 `type === "rss"` 分叉。
- **改** `src/lib/storage.ts` / `src/app/api/upload/route.ts`：`UPLOAD_MIME_EXT` / `UPLOAD_MAX_SIZE` / `COLLECT_IMAGE_TYPES` / `COLLECT_IMAGE_MAX_SIZE` 单一来源，上传路由不再自持 `image/jpeg` 映射。
- **新增** `src/lib/__tests__/lane-d/collect.test.ts`（10 用例）。
- **新增** `docs/design/03_solution/decisions/ADR-032-采集解析器注册表.md`。

## 验收逐条结果
| 项 | 结果 | 证据 |
|---|---|---|
| 5.12.6.1 `grep -rn 'type === "rss"' src/lib` | PASS | `grep -rn ... src/ scripts/ tests/` 均 exit 1（无命中，注释亦已清理） |
| 5.12.6.2 `grep -c "image/jpeg" collect-engine.ts upload/route.ts` | PASS | 两文件均 0 |
| 5.12.6.3 collect-autokb 回归 | PASS | `npx vitest run collect-autokb.test.ts` → 6 passed |
| 5.12.6.4 批次超时单测 | PASS | fake timers 推进 31 分钟 → collectTask/collectSource 记 failed、不标 done、错误归一化为「采集批次超时（30 分钟）」 |
| 5.12.6.5 通用门禁 | PASS | `npm run lint` 0 errors / `npm run typecheck` 0 / `npm test` 702 passed（56 files）/ `npm run build` exit 0 |

## 独立复审
- 首轮：静态审查发现 P1-1（rss 未接批次超时信号）、P1-2（deadlineTimer 未 clearInterval），评分 78，结论 FAIL（门禁未实跑）。
- 修复：`parseRss` 改为注入 fetchText + `parseString`；catch/finally 归一化错误并清理 interval。
- 修复后：单测 10/10 通过、全量门禁全绿。

## UNKNOWN / 局限
- e2e `collect-publish.spec.ts` 依赖真实浏览器与登录态，本次未实跑（属 W2-05 全量回归范围）。
- `transferImagesInMarkdown` 每次图片下载固定 `sleep(500)`，批量条目多时会拉长批次时长，由 30 分钟上限兜底；未做并发优化（不在 D-12 范围）。