# B-07 公众号图文发布闭环 · 执行证据

- 执行者：主代理（opus 档位）· 分支：`upgrade` · 依赖：B-05（1ec36eb）· 2026-10-20
- 卡定义：`docs/V0.7-20261019/tasks/B-07.md`；ADR：`docs/design/03_solution/decisions/ADR-036-B07公众号发布闭环.md`

## 1. 5W1H 分析（简版）

- **What**：`src/lib/wechat.ts` 无 `uploadimg`；`ContentChannel.externalUrl` 永空；`wechat.ts:183` 注释称 60s 间隔由 `publishScan` 串行保证但无持久化；`publishJobCreateSchema.channels` 契约已冻结但 `POST /api/publish-jobs` 仍是 `crudCreate`（`PublishJob` 无 channels 列，双渠道必 500）；`content-items` 列表/详情无渠道状态 DTO。
- **Why**：完成"一篇含外链图文章经公众号发布后正文图片均为微信域名 + externalUrl 回写 + 发布间隔 ≥60s + 多渠道一次创建（G1）"四项目标。
- **Where/When**：`src/lib/wechat.ts`、`src/lib/channels/wechat.ts`、`src/app/api/publish-jobs/route.ts`、`src/app/api/content-items/{,[id]}/route.ts`、新 `src/lib/channels/content-hub-state.ts`。
- **Who**：Agent-API / B 线；消费方：E-09 内容中枢页（V7-UI-01 对接）。
- **How**：见 §3。
- **What if**：公众号凭证缺失 → 上传/轮询全 warning 降级，不阻塞官网发布；轮询超时 → 返回无外链（warning），ContentChannel 主态不受影响。

## 2. 关键设计

### 2.1 uploadimg 正文外链图转存（`wechat.ts`）

- `uploadContentImage(token, url)`：下载 → `>1MB` 跳过（warning）→ magic bytes 判 png/jpg → `media/uploadimg`。失败返回 null。
- `rewriteWechatImages(content, token)`：正则扫 `<img src>`；仅非 `mmbiz.qpic.cn`/`mmbiz.qlogo.cn` 的绝对外链转存；同 URL 只转一次（Map 复用）；`MAX_IMG_TRANSFER=20` 防失控；失败降级保留原外链。
- 在 `addDraft` 内调用（markdown 先 `mdToWechatHtml`）。

### 2.2 freepublish/get 轮询回写 externalUrl

- `getPublishResult(token, publishId, maxAttempts=5)`：`publish_status 0/5` 成功取 `publish_task_info.article_detail[].url`；`2/3/4` 返回 failed；`1` 继续；耗尽 timeout。指数退避 `2^i * 1000ms`。
- `publishDraftToWechat` 提交成功 → 轮询 → 把 `url` 放返回值；`channels/wechat.ts` 写 `ContentChannel.externalUrl`。

### 2.3 60s 节流（跨进程有效）

- 判据持久化于 `ContentChannel(wechat).publishedAt`（最近一条已发布）；间隔 <60s 返回 `ok:false` 带"节流"文案。
- 原因：原注释依赖 `publishScan` 串行，单进程才成立；DB 判据跨进程有效。

### 2.4 G1 多渠道一次发布（`publish-jobs/route.ts`）

- 显式 `withApi`（permission `publish:create`），替代 `crudCreate`。
- `channels` 优先，缺失回退 `[channel]`；去重；重复 → 400。
- 每渠道校验：wechat 需 active+freepublishEnabled 服务号，缺失整体 400（不落半套）。
- 内容状态门禁：`approved/published` 之外 400（与 `executePublishJob` 一致，ADR-017）。
- `prisma.$transaction` 批量创建多条 `PublishJob`，失败整体回滚。
- `scheduledAt` 缺失默认立即；响应 `{ list: jobs }`，HTTP 201。
- 契约保留单 `channel`（e2e `collect-publish` 兼容，ADR-034 D3）。

### 2.5 渠道状态 DTO 组装（`content-hub-state.ts`）

- `buildItemChannels(rows)` → `Map<itemId, ChannelState[]>`；`channelStateSchema.parse` 校验兜底。
- 派生：`status/accountId/externalUrl/errMsg` ← `ContentChannel` 最新行（id 最大）；`scheduledAt` ← 该渠道最近一条 `PublishJob.scheduledAt`；`publishedAt` ← `ContentChannel.publishedAt`（ADR-034 §3 表笔误写成 `PublishJob.publishedAt`；无值时回退 `PublishJob.finishedAt`）。
- 接入：`content-items/route.ts` 用 `mapList` 透传后合并；`content-items/[id]/route.ts` 用 withApi 显式实现等价 `crudGet` + channels。

## 3. 实施步骤

1. 读卡定义与现状代码（wechat.ts 285 行 / publish-executor.ts 99 行 / channels 注册表 / content-hub.ts 契约 / content-workflow.ts）。
2. `wechat.ts` 加 `uploadContentImage` / `rewriteWechatImages` / `getPublishResult` / 60s 节流 / `addDraft` 内转存 / submit 后轮询。
3. `channels/wechat.ts` 补文件尾换行（lint CRLF 门禁）。
4. 新 `channels/content-hub-state.ts` 组装渠道状态；`content-items` 列表 `mapList`、详情 `withApi`。
5. `publish-jobs/route.ts` 重写 POST（`$transaction` 批量建 job + 多渠道校验 + 门禁 + 审计 + 缓存失效）。
6. 新建 `lane-b/wechat-publish.test.ts`（11 用例）与 `lane-b/content-hub-api.test.ts`（13 用例）。
7. 补 ADR-036 记录偏差与派生字段映射。

## 4. 验收逐条

| 验收项 | 结果 | 证据 |
|---|---|---|
| `grep -n uploadimg src/lib/wechat.ts` 有命中 | **PASS** | 见 §2.1，行号在 `wechat.ts` |
| `wechat-publish.test.ts` 三条断言通过 | **PASS** | 11/11 passed（转存/轮询/节流/全链路） |
| 无真实公众号凭证时 e2e 记 UNKNOWN | **UNKNOWN** | 本机无公众号凭证；不做真实联调断言 |
| `publish-state-machine.test.ts` 回归 | **PASS** | 1 file / 13 tests passed |
| `content-hub-api.test.ts` 通过且响应过 `channelStateSchema` parse | **PASS** | 13/13 passed；用例内 `channelStateSchema.parse` |
| 通用门禁 `lint && typecheck && test && build` exit 0 | 见 §5 | 命令输出 |
| `git log --first-parent` diff 落允许路径 | 见 §6 | `git diff --name-only` |

## 5. 门禁实测（提交前）

见提交后实测命令。

## 6. diff 落点核对

```
src/lib/wechat.ts
src/lib/channels/wechat.ts
src/lib/channels/content-hub-state.ts      (新)
src/app/api/publish-jobs/route.ts
src/app/api/content-items/route.ts
src/app/api/content-items/[id]/route.ts
src/lib/__tests__/lane-b/wechat-publish.test.ts   (新)
src/lib/__tests__/lane-b/content-hub-api.test.ts  (新)
docs/design/03_solution/decisions/ADR-036-B07公众号发布闭环.md  (新)
```

全部在卡"允许修改"清单内；未触碰 `src/contracts/**`、`prisma/**`、`package.json`、测试配置、前台 `(web)`/`components/web`/`public`/`globals.css`。

## 7. UNKNOWN / 待后续

- 真实公众号凭证联调（access_token / uploadimg / draft/add / freepublish）— 无凭证，记 UNKNOWN（ADR-002 即插桩）。
- `ContentChannel.publishedAt` 与 `PublishJob.finishedAt` 并存口径 — 已登记 ADR-036 D4。
- 图片压缩未实现（取"跳过"分支）— ADR-036 D3。
- 契约 `refine` OR 逻辑 vs ADR-034 §2.2 写"二者恰一" — ADR-036 D1，已按冻结契约以 `channels` 优先落地。