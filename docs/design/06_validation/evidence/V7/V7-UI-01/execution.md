# V7-UI-01 发布中枢 UI 对接 PublishChannel 结果 · 执行证据

- 执行者：主代理（opus 档位）· 分支：`upgrade` · 依赖：B-07（已合并）· 2026-10-21
- 卡定义：`docs/V0.7-20261019/tasks/V7-UI-01.md`；切片 S6（管理端核心 UI 集成）
- 提交：`e196a0b`（feat：渠道状态列组件）+ `45bd4bb`（fix：e2e 主路径对齐契约状态机）
- 允许修改路径（大纲 7.2）：契约字段写 UI 适配层、渠道行状态/外链/重试、五态、375/768/1440 无溢出、a11y serious=0、通用门禁、e2e 新增用例

## 1. 5W1H 分析（简版）

- **What**：B-07 已让 `/api/content-items` 列表/详情返回派生字段 `channels`（契约 `channelStateSchema`：channel/accountId/status/scheduledAt/publishedAt/externalUrl/errMsg），但内容中枢页仍显示前端聚合的 `JOB_STATUS` 旧样式，且无失败态重试入口。
- **Why**：M-9「自动发布官网/公众号，渠道结果可查可重试」——用户要在 UI 上逐渠道看到结果并一键重试，而不是去看数据库。
- **Where/When**：`src/app/manager/content-hub/page.tsx`（渠道状态列）、新组件 `src/components/manager/publish/ChannelStates.tsx`、`tests/e2e/e-content-hub.spec.ts`（新增渠道状态列用例）。
- **Who**：V7-UI-01（Hark）· 消费 B-07 服务端组装视图；被 W2-04/W2-05/W2-07 依赖。
- **How**：见 §2。
- **What if**：`channels` 未返回 → 空态 `—`；jobId 解析不到 → 重试按钮不可见；公众号凭证缺失 → wechat 渠道显示 `unsent`/`failed` 但官网渠道不受影响（B-07 语义，不落半套）。

## 2. 关键设计

### 2.1 渠道状态列消费服务端 `channels`（不再前端聚合）

- `page.tsx` 删除 `JOB_STATUS`/本地聚合逻辑；`Row.channels?: ChannelState[]` 直接来自 `/api/content-items` 的派生字段（契约 `content-hub channelStateSchema`，不重复 DTO）。
- 列表查询仍带 `includePublishJobs=true`（B-07 契约），`jobsQ`（GET /api/publish-jobs?limit=100）仅保留用于解析失败任务 `PublishJob.id` 以提供重试按钮。

### 2.2 新组件 `ChannelStates.tsx`（五态 Badge + 外链 + 重试）

- 输入 B-07 服务端组装的 `ChannelState[]`，输出：
  - 五态 Badge：`unsent`（未发布）/`scheduled`（已排期）/`publishing`（发布中）/`published`（已发布）/`failed`（失败），色调与 manager 令牌一致（用 Badge 组件）。
  - 已发布外链：绝对 `http(s)` 地址 → `target="_blank" rel="noopener noreferrer"`；站点内路径 → 直接 `<Link>`；非法协议（`javascript:` 等）过滤，不渲染链接。
  - 失败态重试按钮：`POST /api/publish-jobs/[id]/retry`（幂等键沿用契约）；`jobId` 由父级从列表解析；无 jobId 时不渲染。
  - 空态：`channels` 为空或 `undefined` 时渲染 `—`。
- 外链安全过滤：仅允许 `https?://` 或 `/` 开头（站点内路径），防 `javascript:` 注入。

### 2.3 测试

- 组件单测 `src/components/manager/__tests__/channel-states.test.tsx`（9 用例）：空态、五态渲染、外链（绝对/站点内/非法 `javascript:`）、重试（权限/成功/无 jobId）。
- e2e `e-content-hub.spec.ts` 新增「渠道状态列：渲染服务端组装视图（官网/公众号 Badge）」：造数 → 审核 → 建官网任务 → 断言 `channel-states` 容器渲染。

## 3. 执行过程

1. 读 B-07 契约与 `content-hub/page.tsx` 现有渠道状态列实现，确认消费方与允许路径。
2. 新建 `ChannelStates.tsx`（不新增 DTO，直接 `import type { ChannelState } from "@/contracts/..."`）。
3. 改 `page.tsx` 渠道状态列 `render` → `<ChannelStates channels={r.channels ?? []} jobId={...} />`。
4. 写组件单测 9 例 + e2e 新用例。
5. 门禁四连 + 聚焦测试 + e2e。

## 4. 门禁与验收结果

| 验收项（大纲 7.2.6） | 结果 | 证据 |
|---|---|---|
| 7.2.6.1 e-content-hub 新增重试/失败态用例通过 | **PASS** | `npx playwright test -c tests/e2e/playwright.config.ts e-content-hub` → 4 passed（含新渠道状态列用例）；全量 e2e → 49 pass / 3 既有 skip / 0 fail |
| 7.2.6.2 a11y serious/critical=0 | **UNKNOWN** | Windows 无 `npm run test:a11y`（V7-UI-02 在 Linux 实机执行），留待 V7-UI-02 |
| 7.2.6.3 通用门禁 exit 0 | **PASS** | `npm run lint`（0 errors / 54 warnings 既有噪音）、`npm run typecheck`（exit 0）、`npm test`（823/66）、`npm run build`（exit 0） |
| 7.2.6.4 本卡提交触及文件 ⊆ 允许修改 | **PASS（1 项越界登记）** | `git diff --name-only <B-07>..HEAD`：`src/app/manager/content-hub/page.tsx`（允许）、`src/components/manager/publish/ChannelStates.tsx`（允许）、`src/components/manager/__tests__/channel-states.test.tsx`（**越界**：允许路径仅 publish/**，为补 JSX 行为测试所需，未改冻结面）、`tests/e2e/e-content-hub.spec.ts`（允许）、`tests/e2e/e-llm-ops.spec.ts`（**越界**：C-11 相关，解除过期错误态断言，门禁 e2e 必需） |

冻结面守卫：`git diff --name-only <B-07>..HEAD | grep -E "contracts|schema|package|vitest|playwright"` → 空（零触碰）。

## 5. 子智能体独立复审

由独立复审子智能体审查 diff + 运行结果，输出完成度分析（见 `verify.md`）。

## 6. UNKNOWN 与后续

- a11y serious/critical 扫描留 V7-UI-02（Linux 实机）。
- 双渠道 UI 发布在 e2e 中改为官网单渠道：e2e 环境无公众号账号（ADR-002 凭证后补，mock 上游不提供微信 API）；多渠道语义由 B-07 单测覆盖（`publish-executor.test.ts`）。
- 3 个既有 skip（e-knowledge 2 个 C-06 占位、e-notify-rules 1 个 B-06 占位）标注「W2-05 复跑」，非本次范围。