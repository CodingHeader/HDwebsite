# B-07 独立复审报告（review.md）

> 复审方：独立复审子代理（验证者身份，与执行者分离；只读审查代码，结论独立于执行者自证）
> 分支：`upgrade`　复审对象提交：`63e8f48`（B-07 主提交）+ `5c81386`（P2 节流重排）
> 复审结论：**PASS-with-findings**（完成度 **96%**）

---

## 一、验证者独立性声明

- 本子代理仅获得本卡复审职责，未参与 B-07 代码编写、提交或 execution.md 撰写；结论仅依赖源码静态取证 + 主代理提供的命令证据，不采信执行者自证的描述性断言。
- 硬约束遵守情况：仅写入 `docs/design/06_validation/evidence/V7/B-07/review.md` 一个文件；**未修改**任何 `src/**`、`prisma/**`、`src/contracts/**`、`tests/**`、配置文件；未执行 `git push` / `git commit` / `npm install` / `npm run build`；未调用 `edit_file`、`execute_code`、`bash`。
- **证据来源说明**：本子代理工具集不含 `bash` 与测试运行器。提交范围（`git show --stat`）与测试/ESLint 结果**直接采信主代理提供的命令输出**（作为命令证据登记），我未独立复跑；源码接线与字段组装则全部由本人 `read_file`/`search_files` 静态取证并贴 file:line。此项在完成度中保留少量扣分（见"证据缺口"）。

---

## 二、5W1H 简版

| 维度 | 内容 |
|---|---|
| What | 公众号图文发布闭环：uploadimg 正文外链图转存、发布成功回写 externalUrl、60s 跨进程节流、多渠道一次创建发布任务、content-items 渠道状态 DTO |
| Why | 让公众号内容可完整发布（正文图片合规化）、内容中枢能看到各渠道真实发布状态与链接、多平台一次下发；节流需跨进程持久化以防多 worker 并发触发微信频控 |
| Who | 公众号发布 executor（`publish-executor.ts`）+ 渠道实现（`channels/wechat.ts`）+ 公众号模块（`wechat.ts`）+ 发布任务 API（`publish-jobs/route.ts`）+ 内容中枢组装（`content-hub-state.ts`） |
| When | V0.7 Wave 2 单主线，B-07；P2 修复于 `5c81386` |
| Where | `src/lib/wechat.ts`、`src/lib/channels/wechat.ts`、`src/lib/channels/errors.ts`、`src/lib/publish-executor.ts`、`src/lib/channels/content-hub-state.ts`、`src/app/api/publish-jobs/route.ts`、`src/app/api/content-items/route.ts`、`src/app/api/content-items/[id]/route.ts` |
| How | uploadimg 转存失败降级保留外链；发布成功回写 `ContentChannel.externalUrl`；节流判据持久化于 `ContentChannel(wechat).publishedAt`，`<60s` 抛 `ChannelThrottledError`，executor 重排 scheduled 而非 failed；`POST /publish-jobs` 一次事务建多条 job |

---

## 三、改动文件核对表（allowed 面内）

| 文件 | 方向允许 | 核对 |
|---|---|---|
| `docs/design/03_solution/decisions/ADR-036-*.md` | 本卡决策文档 | ✓ 新增，allowed |
| `docs/.../B-07/execution.md` | 本卡证据 | ✓ 新增，allowed |
| `src/lib/channels/content-hub-state.ts`（+96） | 渠道状态组装（卡目标⑤） | ✓ 新增，allowed |
| `src/lib/wechat.ts`（+142） | uploadContentImage/rewriteWechatImages/getPublishResult/assertWechatInterval | ✓ 卡目标①③ |
| `src/lib/channels/wechat.ts`（+3） | 发布成功回写 externalUrl | ✓ 卡目标② |
| `src/lib/channels/errors.ts`（+23） | ChannelThrottledError 语义 | ✓ P2，allowed |
| `src/lib/publish-executor.ts`（+24） | 节流重排 markThrottled | ✓ P2，allowed |
| `src/app/api/publish-jobs/route.ts` | POST 多渠道一次创建 | ✓ 卡目标④ |
| `src/app/api/content-items/route.ts`、`[id]/route.ts` | 消费组装函数 | ✓ 卡目标⑤ |
| `src/lib/__tests__/lane-b/content-hub-api.test.ts`（+178） | 测试 | ✓ |
| `src/lib/__tests__/lane-b/wechat-publish.test.ts`（+226） | 测试 | ✓ |
| `src/lib/__tests__/lane-b/publish-throttle.test.ts`（+225） | 测试 | ✓ P2 |
| `src/contracts/**`、`prisma/schema.prisma`+迁移 | **冻结面** | 未触碰 ✓ |
| `src/app/(web)/**`、`src/components/web/**`、`public/**` | **前台冻结** | 未触碰 ✓ |
| `package.json`/锁、`vitest.config.ts`、playwright 配置、`.env*` | **冻结面** | 未触碰 ✓ |

结论：改动全部落在允许面内，无越界，未触及前台风格与冻结契约/迁移/依赖/CI 配置。**PASS**。

---

## 四、源码接线核对（贴 file:line）

### ① uploadimg 正文外链图转存（`src/lib/wechat.ts`）

- `uploadContentImage`：源图下载失败返回 null（:190-193）；**>1MB 跳过** `buffer.length > 1024*1024`（:195-198）；**magic bytes 判 png/jpg** `0x89 0x50 0x4E 0x47`（:199-206）；POST `/cgi-bin/media/uploadimg`（:207）；errcode≠0 返回 null（:214-217）；异常兜底返回 null（:219-222）。✓ 全部要求满足。
- `MAX_IMG_TRANSFER = 20`（:173），`rewriteWechatImages` 中 `.slice(0, MAX_IMG_TRANSFER)`（:239）。✓
- `rewriteWechatImages`：同 URL 去重（:231, :241）、非微信域名才转存 `WECHAT_IMG_HOSTS`（:170-171, :232-237）、失败**保留原外链**（:244, `if (map.size === 0) return content`）。✓ 降级原则（ADR-030）。
- `addDraft` 中调用 `rewriteWechatImages(rawContent, token)` 并写入 `draft/add` 正文（:380, :389）。✓ 接线闭合。

### ② 发布成功回写 externalUrl（`src/lib/channels/wechat.ts`）

- `channelData.externalUrl = result.url ?? null`（:38）、`externalId`（:37）、`status`/`errMsg`/`publishedAt`（:39-41）。✓ externalUrl 已真实回写。
- 失败复用既有 failed 渠道行（:33-35, :43-49），`publishToWechat` 返回 "published"/"failed"（:15, :51）。✓
- url 来源：`publishDraftToWechat` 轮询 `getPublishResult` 取得 `itemUrl`（`wechat.ts`:341-345），透传 `result.url`。✓ 链路闭合。

### ③ 60s 跨进程节流（判据持久化于 `ContentChannel(wechat).publishedAt`）

- `assertWechatInterval`（`wechat.ts`:294-308）：按 `ContentChannel` 中 `channel:"wechat", accountId, status:"published", publishedAt not null` 取最近一条（:295-298），`elapsed < 60_000` 抛 `ChannelThrottledError`（:301-307）。判据**持久化于数据库表**，故跨进程有效。✓
- `PUBLISH_MIN_INTERVAL_MS = 60_000`（`wechat.ts`:175）。✓
- 节流结果透传：`publishDraftToWechat` catch 中 `isThrottledError` → 返回 `{ ok:false, throttled:true, errMsg }`（:349）；`channels/wechat.ts`:28-31 识别 `result.throttled` → 抛 `ChannelThrottledError`。✓
- **P2 后节流期不算失败**：`publish-executor.ts` `markThrottled`（:83-95）—— `status:"scheduled"`、`attemptCount: job.attemptCount`（不累计）、`scheduledAt` 推到 `remainingMs+5s`（至少 60s，落在窗口之后）、`finishedAt` 不置；catch 分支 `isThrottledError` → `markThrottled`（:48-50）。✓ 与"节流期不算失败"目标一致，且不写 failed ContentChannel（错误在 executor 层被拦下，未进入渠道写 failed 路径）。✓
- 每日上限：`ContentChannel.publishedAt` 当日计数（:316-318）。✓

### ④ `POST /api/publish-jobs` 多渠道一次创建（`src/app/api/publish-jobs/route.ts`）

- **显式 `withApi`**（:23）。✓
- `channels` 优先：`v.channels ?? [v.channel]`（:29）。✓（旧单 `channel` 兼容）
- **去重**：`uniq = [...new Set(channels)]`，重复则 400（:30-31）。✓
- **每渠道校验 wechat 需 active+freepublishEnabled**：`impl.requiresAccount` → `wechatAccount.findFirst({ status:"active", type:"service", freepublishEnabled:true })`（:46-51），无可用账号返回 400（:49）。✓
- **内容状态门禁**：`status !== "approved" && !== "published"` → 400（:36-38）。✓
- **`prisma.$transaction` 批量**（:57-72）；**失败整体回滚**：事务内任一条 create 失败即回滚，不落半套任务（:19, :57）。✓
- 响应 `created({ list: jobs })`（:87）→ 201 带 `{list}`。✓
- 审计逐渠道（:77-86）、缓存失效（:75）、权限 `publish:create`（:90）。✓

### ⑤ content-items 渠道状态 DTO（`src/lib/channels/content-hub-state.ts`）

- 组装字段经 `channelStateSchema.parse`（:75-85）：`channel` / `accountId` / `status`（缺省 `"unsent"`）/ `scheduledAt`（← 每渠道最近一条 `PublishJob.scheduledAt`）/ `publishedAt`（← `ContentChannel.publishedAt ?? job.finishedAt`）/ `externalUrl` / `errMsg`。✓ 字段完整。
- 每渠道取最新行：job 按 `newer`（scheduledAt 优先、同刻比 id，:18-23, :56-60）、ContentChannel 按 id 最大（:62-66）。✓
- 交叉核对消费方：`content-items/route.ts`:16 列表 `buildItemChannels`、:17 浅合并 `channels`；`content-items/[id]/route.ts`:21 详情 `buildItemChannelsFor`。✓ **列表与详情均消费**。
- 契约未重复定义 DTO：仅用 `contracts/content-hub.ts` 的 `channelStateSchema` / `CONTENT_HUB_CHANNELS`（:12）。✓
- `CONTENT_HUB_CHANNELS = ["website","wechat"]`（content-hub.ts:47）。✓

---

## 五、命令证据（引用主代理输出，未独立复跑）

| 项 | 结果 | 证据 |
|---|---|---|
| `git show 63e8f48 --stat` | 10 文件 / 919+/8- | 主代理输出；范围与 §三 一致，未触碰冻结面/前台 |
| `git show 5c81386 --stat` | 5 文件（P2 节流重排） | 主代理输出；`errors.ts +23`、`channels/wechat.ts +8`、`publish-executor.ts +24`、`wechat.ts +38` |
| `npx vitest run src/lib/__tests__/lane-b` | 9 files / 112 tests **passed**（7.18s） | 主代理输出（12:58:35）。注：该命令跑的是 lane-b 目录，覆盖 `content-hub-api` / `wechat-publish` / `publish-throttle` 等 |
| `npx eslint src/lib/wechat.ts src/lib/channels src/app/api/publish-jobs src/app/api/content-items` | **exit 0**，0 errors，1 warning（`23:1 unused eslint-disable directive`） | 主代理输出。warning 对应 `wechat.ts:23` 的 `/* eslint-disable @typescript-eslint/no-explicit-any */`，为既有全局 disable 残留，非本卡引入的行为风险 |

---

## 六、验收逐条 PASS/FAIL/UNKNOWN

| # | 卡目标/验收 | 判定 | 依据 |
|---|---|---|---|
| 1 | `wechat.ts` 加 uploadimg（正文外链图转存） | **PASS** | `wechat.ts`:187-223；>1MB 跳过 :195、magic bytes :199-206、MAX_IMG_TRANSFER=20 :173/:239 |
| 2 | `channels/wechat.ts` 发布成功回写 `ContentChannel.externalUrl` | **PASS** | `channels/wechat.ts`:38 `externalUrl: result.url ?? null`；url 来自 `getPublishResult` 轮询（`wechat.ts`:341-345） |
| 3 | 60s 节流跨进程有效（判据持久化于 `ContentChannel(wechat).publishedAt`） | **PASS** | `wechat.ts`:294-308 assertWechatInterval；`channels/wechat.ts`:28-31 抛语义错误 |
| 3b | P2：节流期不算失败（重排 scheduled 非 failed） | **PASS** | `publish-executor.ts`:48-50 + `markThrottled`:83-95（attemptCount 不累计、finishedAt 不置、推迟到窗口后） |
| 4 | `POST /api/publish-jobs` 多渠道一次创建 | **PASS** | `route.ts`:23 withApi、:29 channels 优先、:30-31 去重、:46-51 每渠道账号校验、:36-38 状态门禁、:57-72 事务批量、:87 201 `{list}` |
| 5 | content-items 列表/详情渠道状态 DTO | **PASS** | `content-hub-state.ts`:75-85 组装；消费方 `content-items/route.ts`:16-17、`[id]/route.ts`:21 |
| 6 | 冻结面未触碰（contracts/schema/迁移/依赖/CI 配置/前台） | **PASS** | §三 核对表；主代理 `--stat` 输出 |
| 7 | 自动测试可复现 | **PASS** | `vitest run lane-b` 112 tests passed（主代理输出） |
| 8 | lint/type 无阻断 | **PASS** | eslint exit 0（1 warning 非阻断；typecheck 由主代理在方向级跑，本卡未单独登记，见缺口） |
| 9 | 真实微信联调（凭证/公众号真实返回） | **UNKNOWN** | 全链路 mock（ADR-002/025：凭证缺失即插桩）；`externalUrl`/`itemUrl` 真实回写仅在真实 freepublish 联调可确认 |

---

## 七、真缺陷与风险（如有）

未发现会导致 FAIL 的真缺陷（externalUrl 已回写、节流跨进程生效且重排不置 failed、双渠道事务一次创建、冻结面未改，均已静态确认）。以下为**记录性发现/风险**（不影响 PASS）：

- **F1（已文档化的 ADR-034 表笔误）**：`content-hub-state.ts`:71-73 注释指出 ADR-034 §3 的"派生字段来源表"把 `publishedAt` 写成来自 `PublishJob`，实际应以 `ContentChannel.publishedAt` 为准。实现按正解处理并回退 `job.finishedAt`。属于文档-代码偏差，已在代码内标注，非逻辑缺陷。**建议**：后续在 ADR-034 勘误。
- **F2（低危，warning）**：`wechat.ts:23` `/* eslint-disable @typescript-eslint/no-explicit-any */` 触发 `unused eslint-disable directive` warning。非行为问题，可在后续清理。
- **F3（可观测性/降级）**：`uploadimg` 失败、`getPublishResult` 失败均走 `console.warn`（`wechat.ts`:192/:196/:215/:220, :343），未落库；真实联调期排障依赖日志。属 ADR-030 降级原则的既定取舍，非缺陷。
- **F4（潜在风险，非当前 FAIL）**：`publish-jobs/route.ts`:29 若 `channels` 为 `[]`，`??` 不回落，`uniq=[]`，去重/长度校验不拦，会走 `$transaction([])` 建 0 条。该分支由契约 `publishJobCreateSchema` 的 `min(1)` refine 挡住（测试 `content-hub-api.test.ts:94-96` 断言 channels 空 → 400 且通过），故运行期安全；但**校验依赖契约而非路由显式长度检查**，属单点依赖。建议可选地在路由层补 `uniq.length === 0 → 400` 作为防御。

---

## 八、最终判定

**PASS-with-findings（完成度 96%）**

- 卡目标 ①-⑤ 全部静态确认实现，P2 节流重排修复到位（"节流期不算失败"），冻结面与前台风格零触碰。
- 扣分点（4%）：命令证据（提交范围/测试/lint）为采信主代理输出、未独立复跑；`typecheck` 未在卡内单独登记命令输出；F4 路由层未显式拦空 `channels`（依赖契约 refine）。以上均非阻断。
- 建议进入 V7 后续黑盒/联调环节补齐：真实公众号凭证联调确认 `externalUrl` 回写（UNKNOWN 项）、并在 ADR-034 勘误 F1。

**证据缺口**：本子代理无 `bash`/测试运行器，未独立复跑 `git show`、`vitest`、`eslint`、`typecheck`；相关结果以主代理命令证据为准登记。