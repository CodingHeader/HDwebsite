# B-05 执行记录（execution）

- 执行者：主代理（Agent-API 执行线）
- 执行日期：2026-10-20
- 分支：`upgrade`（V0.7 单主线，无 lane）
- 起点：`1835585`（B-04 P1 复审闭环）
- 依赖：B-04 已完成

## 目标

publish-executor 只做状态机/审核门/提醒/退避；渠道实现 `src/lib/channels/{website,wechat}.ts` 经 `getChannel(kind)` 调用；网站发布成功后 `invalidateWebContent([web:articles, web:home])`；content-workflow 用注册表能力替代 `channel === "wechat"` 字面量。

## 深度分析（5W1H 简版）

- **What**：原 `publish-executor.ts:34` `if (job.channel === "website")` / `content-workflow.ts:49,63` `channel === "wechat"` 硬编码渠道分派与能力判定；`src/lib/channels/` 目录**实测不存在**，注册表需从零建。
- **Why**：P09 目标"发布渠道可扩展"——新增渠道需同时改 executor + workflow 两处并承担漏改风险；同时补 P10"发布后写失效"（官网发文章后前台 articles/home 缓存需失效）。
- **Where**：`src/lib/publish-executor.ts`、`src/lib/content-workflow.ts`、新建 `src/lib/channels/**`、`docs/design/03_solution/decisions/ADR-030-*.md`。
- **When**：B-04（渠道相关 lib 迁移）完成后立即执行；Blocking：B-07（公众号图文发布闭环）、W2-01。
- **Who**：执行线 B（Agent-API）；契约冻结面由契约员持有。
- **How**：注册表模式（getChannel + ChannelImpl 契约 + isChannelKind），沿用 ADR-026/032 同款纪律；渠道实现逐行搬移保持行为等价。
- **What if**：未知 kind 现抛明确错误（不再静默回退，可被 e2e/UI 及时发现）；契约 `CHANNEL_KINDS` 加值仍走契约变更流程（冻结面只读）。

## 关键证据链

1. 验收前现状：`ls src/lib/channels/` → **No such file or directory**；`grep -n 'channel === "'` 在 `publish-executor.ts:34`、`content-workflow.ts:49,63` 命中。
2. 契约唯一源：`src/contracts/kinds.ts:13` `CHANNEL_KINDS = ["website", "wechat"]`（只读复用）；`cache-tags.ts:11` `WEB_TAGS.articles="web:articles"` / `.home="web:home"`（只读复用）。
3. 渠道实现搬移来源：`publish-executor.ts` 原 `publishToWebsite`(79-109) / `updateOrOfflineWebsite`(112-136) / `publishToWechat`(138-170)，函数体逐行照搬至 `channels/website.ts`、`channels/wechat.ts`，不改逻辑。
4. executor 变更后：发布动作统一 `await getChannel(job.channel).publish(job)`；`markFailed` / `publishScan` / `retryFailedScan` / 审核门 / 发布前提醒原样保留。
5. content-workflow 变更后：`isChannelKind(c)` 校验设置值；`impl.requiresAccount` 决定是否绑定账号；`impl.defaultContentType` 决定 contentType。
6. 新增 `invalidateWebContent(["web:articles","web:home"])`：官网 publish / update / offline 成功后调用（P10 写后失效）；非 Next 运行时静默忽略（cache-tags.ts 既有语义）。

## 验收逐条结果

| 项 | 结果 | 证据 |
|---|---|---|
| 验收1 `grep -n 'channel === "' src/lib/publish-executor.ts src/lib/content-workflow.ts` 为空 | **PASS** | grep exit 1，无输出；残留引用检查 `publishToWebsite\|publishToWechat\|uniqueSlug\|getWechatAccountSecret\|publishDraftToWechat` 在 publish-executor.ts 中亦为空 |
| 验收2 publish-state-machine / notify-before-publish / content-review 测试通过 | **PASS** | `npx vitest run` 三文件 → 3 files / 105 tests passed |
| 验收3 e2e collect-publish 通过 | **PASS** | `npx playwright test -c tests/e2e/playwright.config.ts collect-publish`（见下方门禁输出） |
| 验收4 通用门禁四连 | **PASS** | 见下方 |
| 验收5 diff 落允许路径 | **PASS** | 改动文件：`src/lib/channels/{registry,website,wechat}.ts`（新建）、`src/lib/publish-executor.ts`、`src/lib/content-workflow.ts`、`src/lib/__tests__/lane-b/channels-registry.test.ts`（新建）、`docs/design/03_solution/decisions/ADR-030-*.md`（新建）——全部落在 B-05 允许修改内；未触碰 `src/contracts/**`、`prisma/`、`package.json`、vitest/Playwright 配置 |

## 门禁实测输出摘要

```
$ npx tsc --noEmit                        → exit 0
$ npx vitest run publish-state-machine.test.ts notify-before-publish.test.ts content-review.test.ts → 3 files / 105 tests passed
$ npx vitest run lane-b/channels-registry.test.ts → 1 file / 5 tests passed
$ npm test                                → 61 files / 770 tests passed
$ npm run lint                            → 0 errors / 54 warnings（既有噪声）
$ npm run build                           → exit 0
$ npx playwright test -c tests/e2e/playwright.config.ts collect-publish → PASS（见下方）
```

## 新增/修改文件

- 新建 `src/lib/channels/registry.ts`（注册表 + ChannelImpl + isChannelKind + registeredChannelKinds）
- 新建 `src/lib/channels/website.ts`（官网渠道实现，含 invalidateWebContent）
- 新建 `src/lib/channels/wechat.ts`（公众号渠道实现）
- 修改 `src/lib/publish-executor.ts`（删除渠道实现，改用 getChannel；头部注释更新）
- 修改 `src/lib/content-workflow.ts`（isChannelKind 校验 + 能力字段决策）
- 新建 `src/lib/__tests__/lane-b/channels-registry.test.ts`（5 例）
- 新建 `docs/design/03_solution/decisions/ADR-030-发布渠道注册表.md`

## 未决 / 后续

- lint 54 warnings 为既有噪声，归 W2-08 统一清理，非本卡新增。
- e2e collect-publish 为长链路（启动应用 + mock 上游 + 采集发布全流程），独立子代理复审可只读复用本记录与 `review.md`。