# V7-V-B07 B-07 独立复审补登 · 执行证据

- 执行者：主代理（opus）· 分支：`upgrade` · HEAD 起点 `826d39a` · 2026-10-21
- 卡定义：`docs/V0.7-20261019/tasks/B-07.md`；对应 V7-V 系列"补登独立复审"
- 允许修改：`docs/design/06_validation/evidence/V7/B-07/review.md`

## 1. 目标

B-07（公众号图文发布闭环）执行证据齐全（`63e8f48` 主提交 + `5c81386` P2 节流重排），但缺独立复审 `review.md`。本任务补齐。

## 2. 提交边界核对

- `63e8f48`（B-07 主）：10 文件，919+/8- —— ADR-036、B-07/execution.md、`src/app/api/content-items/{,[id]}/route.ts`、`src/app/api/publish-jobs/route.ts`、`src/lib/__tests__/lane-b/{content-hub-api,wechat-publish}.test.ts`、`src/lib/channels/{content-hub-state,wechat}.ts`、`src/lib/wechat.ts`。**零触碰** contracts/schema/迁移/(web)/components.web/public/package/锁/vitest/playwright/.env*。
- `5c81386`（P2 节流重排）：5 文件 —— publish-throttle.test.ts、channels/errors.ts、channels/wechat.ts、publish-executor.ts、wechat.ts（合规）。
- `npx vitest run src/lib/__tests__/lane-b` → **9 files / 112 tests passed**（12:58:35）
- `npx eslint src/lib/wechat.ts src/lib/channels src/app/api/publish-jobs src/app/api/content-items` → **exit 0**（0 errors，1 warning：wechat.ts:23 unused eslint-disable）

## 3. 独立复审结论

子代理独立复审（验证者身份）判定：**B-07 → PASS-with-findings（完成度 96%）**

- 卡目标 ①~⑤ 全部经源码静态取证（uploadimg >1MB 跳过/magic bytes/MAX_IMG_TRANSFER=20/失败保留外链；externalUrl 回写；60s 节流持久化于 `ContentChannel(wechat).publishedAt` 跨进程有效；P2 markThrottled 重排 scheduled 且 attemptCount 不累计；POST /publish-jobs 显式 withApi+channels 优先+去重+每渠道账号校验+状态门禁+$transaction 整体回滚+201 {list}；列表/详情双端消费 buildItemChannels）。
- 扣分 4%：命令证据未独立复跑、typecheck 未单独登记、F4 观察项。

## 4. 主代理对 F4 的独立复核

子代理 F4：`publish-jobs/route.ts:29` 空 `channels` 会进 `$transaction([])` 建 0 条。

主代理复核 `src/contracts/resources.ts:340`：`channels: z.array(channelKindSchema).min(1).max(2).nullable().optional()` —— **`[]` 无法通过 `.min(1)`，safeParse 直接返回 `validationError`（400）**，走不到 `v.channels ?? [v.channel]` 与 `$transaction`。故 F4 属"契约单点兜底"观察项，**非真缺陷，不阻塞**；若未来放宽契约需在此路由补显式 `400`（登记为 W2-08 响应设计文档的可选加固项）。

## 5. UNKNOWN

- 真实公众号凭证联调（access_token / uploadimg / draft/add / freepublish）— 凭证缺失（ADR-002 即插桩），由后续联调任务承接。
- 真实 HTTP 冒烟由 V7-UI-02 / W2-05 承接。

## 6. 完成度

- B-07 复审证据补登 **100%**。
- B-07 代码实现 **PASS-with-findings 96%**（无真缺陷，剩余为观察项 + 真实凭证联调 UNKNOWN）。

## 7. git 状态

- HEAD：`826d39a` → 本次提交后 `(B-07 review)`
- 本地领先 origin/upgrade 62+ 提交；推送需用户批准。