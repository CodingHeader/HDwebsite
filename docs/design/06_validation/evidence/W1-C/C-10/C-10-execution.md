# C-10 执行证据：AI 客服风控（限频 / 敏感词 / 黑名单）

> 卡：`docs/V0.6-20261016/tasks/C-10.md`　分支：`lane/c-ai-kb`　起点：`736bc56`（C-07 交付后）　所有者：Agent-AI
> 状态：**DONE**（门禁 4/4 exit 0；子智能体独立验收 PASS）

## 1. 分析（5W1H 简版）

- **What**：为 AI 客服增加三层风控（按用户限频、敏感词过滤、黑名单），官网 SSE 与公众号 `chatOnce` 走同一入口 `chat-service`。
- **Why**：需求缺口 G5；原实现只在官网路由里内联 IP 限频 + 硬编码敏感词数组，公众号无风控；无 `blacklist`（`grep -rni blacklist src` 为空）。
- **Where**：`src/lib/llm/guard.ts`（新）、`src/lib/chat-service.ts`、`src/app/api/chat/stream/route.ts`、`src/lib/__tests__/lane-c/chat-guard.test.ts`（新）。
- **Who**：C 线（AI 与知识库）——所有权矩阵 C 行包含 `src/lib/llm/**`、`src/lib/chat-service.ts`、`src/lib/__tests__/lane-c/**`、`docs/design/06_validation/evidence/W1-C/**`。
- **How**：设置键走 `getAllSettings()`（含非公开 llm 组）；限频用进程内滑动窗口（键=scene+identifier）；命中敏感词返回固定兜底且不调用模型。
- **When**：C-07 已交付 → C-10 解锁。

## 2. 设计决策

### D1 设置键来源
`chatGuardRateLimitPerMin=20` / `chatGuardSensitiveWords="[]"` / `chatGuardBlacklist="[]"` 已在 W0-10 冻结于
`src/lib/settings-registry.ts:134-136`（扁平键，group=llm，isPublic=false，ADR-009 禁止点分键）。
`loadChatGuardSettings()` 走 `getAllSettings()`（含非公开键），**键缺失时回落到 Registry 默认值**（`getDefaultValues` 已合并）。
证据：`safeRateLimit` 对 `""/abc/-1/null` 均回落 `GUARD_DEFAULT_RATE_LIMIT=20`（测试断言）。

### D2 三项风控的返回语义（本卡的契约歧义澄清）
卡文本"三项对 /api/chat/stream 与公众号客服回调都生效"未逐项指定错误码。按 ADR-028 与卡验收"限频、敏感词、黑名单各 2 例"取：

| 项 | 官网 SSE | 公众号 chatOnce |
|---|---|---|
| 黑名单 | HTTP 429 + code 429 | ok=false（wechat.ts 走 wechatFallbackReply 兜底） |
| 敏感词 | 200 SSE：meta → delta(固定兜底) → done，**不调用模型** | ok=true + `GUARD_FALLBACK_REPLY`（前端正常展示） |
| 限频 | HTTP 429 + code 429 | ok=false（兜底文案） |

**支持**：卡验收唯一硬性断言是"命中敏感词时 llm-gateway 调用次数为 0"，未强制错误码；黑名单/限频都属"拒绝"语义，采用 429 与 chat/stream 现状（C-07 限频 429）一致。
**反对**：是否敏感词也应为 429？—— 敏感词命中返回固定回复，属"可回复"而非"拒绝"，走 SSE 前端体验更好；且 ChatWidget 对非 200 会 throw（`ChatWidget.tsx:98`），会让用户看到错误提示而非兜底文案。

### D3 限频键粒度
`key = scene.code + ":" + identifier`（identifier 官网=sessionId、公众号=openId）。卡要求"同一用户超过每分钟阈值"→ 键含 identifier 即可满足；加 scene.code 避免不同场景共享窗口导致误伤。
**反对**：同一 IP 下不同 sessionId 能否绕过？—— 官网默认 identifier=sessionId，若同一 IP 换 sessionId 可绕过；但卡输入"按用户限频"，未提 IP。当前保留原有 IP 限频（route.ts 前段）作为兜底；用户级限频按卡语义实现。
**升级条件**：多实例部署需共享存储 → 卡内明示"进程内"保留，本卡不引入 Redis（记 ADR）。

### D4 guard 放行时机
`checkChatGuard` 返回 `ok` 时自行 `recordChatCall(key)`。这样"第 20 次请求才触发 429"与"窗口内放行次数 ≥ 阈值"语义自洽。
**测试**：设置 `rateLimitPerMin=2` → 前 2 次放行，第 3 次 429；`gwCalls.chatCount=2` 断言精确。

### D5 原路由内联敏感词挡板
route.ts 原硬编码 `banned = ["忽略之前的指令", ...]` 保留（提示词注入挡板），但与 C-10 敏感词不同层：**前者是安全注入防护，后者是风控内容过滤**。C-10 不删除原挡板（避免与 M2 注入防护重复设计）。

## 3. 改动文件

```
M src/app/api/chat/stream/route.ts        +44 -1   （guard 结果分派 + guardFallbackStream + import）
M src/lib/chat-service.ts                 +75 -3   （ChatGuardOutcome 类型 + buildChatContext 接 guard + chatOnce 分派）
A src/lib/llm/guard.ts                              （新文件，~180 行）
A src/lib/__tests__/lane-c/chat-guard.test.ts       （新文件，13 用例）
```

## 4. 验收结果（逐条）

| # | 验收标准 | 结果 | 证据 |
|---|---|---|---|
| 1 | chat-guard.test.ts 通过 | **PASS** | `npx vitest run src/lib/__tests__/lane-c/chat-guard.test.ts` → 1 file, 13 tests passed |
| 2 | 命中敏感词时 llm-gateway 调用次数为 0 | **PASS** | 测试 `gwCalls.chatCount`/`streamCount` 均为 0（公众号 + SSE 两例） |
| 3 | wechat-chat.test.ts 回归通过 | **PASS** | 5/5 passed |
| 4 | 通用门禁 lint/typecheck/test/build 全 exit 0 | **PASS** | lint 0 errors (23 warnings 既有)、typecheck 0、test 464/464、build exit 0 |
| 5 | 允许路径核查 | **PASS** | 4 文件全在 C 线允许列表；`git status --short` 未触碰 contracts/prisma/前台/package.json/vitest.config |

## 5. 命令输出摘要

```
$ npx vitest run src/lib/__tests__/lane-c/chat-guard.test.ts
Test Files  1 passed (1)
      Tests  13 passed (13)

$ npx vitest run src/lib/__tests__/wechat-chat.test.ts src/lib/__tests__/lane-c/chat-scene.test.ts
Test Files  2 passed (2)
      Tests  30 passed (30)

$ npm run lint          → 23 problems (0 errors, 23 warnings)  exit 0
$ npm run typecheck     → exit 0
$ npm test              → Test Files 32 passed (32) / Tests 464 passed (464)  exit 0
$ npm run build         → ✓ Generating static pages / ✓ Compiled successfully  exit 0

$ grep -n "z.object" src/app/api/chat/stream/route.ts
  → 无命中（DR-23 保持）
```

## 5b. route.ts 归属与越界说明（AGENTS.md §4：越界必须写明文件与理由）

- **文件**：`src/app/api/chat/stream/route.ts`
- **理由**：卡 C-10 的"允许修改"清单（`src/lib/llm/**`、`src/lib/chat-service.ts`、`src/lib/__tests__/lane-c/**`、evidence）未显式列出 `src/app/api/chat/**`，但 **07-所有权矩阵 C 行第 13 行明确包含 `src/app/api/chat/**`**（`docs/V0.6-20261016/07-所有权矩阵.md:13`）。同一 C 行的 C-07 卡在其"允许修改"清单里显式包含 `src/app/api/chat/**`。C-10 是 C-07 的直后继卡，风控分派必须落在 SSE 路由，因此写入该文件。
- **裁决依据**：所有权矩阵 C 行 > 卡局部清单（局部清单未覆盖所有权边界时的补全）；且 C 行是 Wave 1 lane/c-ai-kb 的**唯一所有权容器**，route.ts 无其他线共享。
- **不适用 CCR**：未触碰 `src/contracts/**` 冻结面，无契约变更请求。


- **允许**：`src/lib/llm/**` ✓（新增 `guard.ts`）、`src/lib/chat-service.ts` ✓、`src/lib/__tests__/lane-c/**` ✓（新增测试）、`docs/design/06_validation/evidence/W1-C/**` ✓（本文件）。
- **未触碰**：`src/contracts/**`、`prisma/schema.prisma`、`prisma/migrations/**`、`package.json`、`package-lock.json`、`vitest.config.ts`、`playwright.config.ts`、`src/app/(web)/**`、`src/components/web/**`、`public/**`、`src/app/globals.css`。
- **DR-23**：`grep -n "z.object" src/app/api/chat/stream/route.ts` 空。

## 6b. 可复现验证输出（本轮由主代理实际执行，exit 0）

```bash
$ cd /e/Code/Demo/HDwebsite/hdwebsite_1011
$ npx vitest run src/lib/__tests__/lane-c/chat-guard.test.ts
Test Files  1 passed (1) / Tests  13 passed (13)      exit 0

$ npx vitest run src/lib/__tests__/wechat-chat.test.ts src/lib/__tests__/lane-c/chat-scene.test.ts
Test Files  2 passed (2) / Tests  30 passed (30)      exit 0

$ npm run lint     → 0 errors, 23 warnings (既有)      exit 0
$ npm run typecheck                                   exit 0
$ npm test         → 32 files / 464 tests passed       exit 0
$ npm run build    → ✓ Compiled successfully           exit 0

$ grep -n "z.object" src/app/api/chat/stream/route.ts   → 空（DR-23 PASS）

$ git status --short -- src docs
 M src/app/api/chat/stream/route.ts
 M src/lib/chat-service.ts
?? src/lib/__tests__/lane-c/chat-guard.test.ts
?? src/lib/llm/guard.ts
（docs 下仅新增 evidence W1-C/C-10/C-10-execution.md）
```

## 7. UNKNOWN / 后续

- **UNKNOWN-1**：多实例部署时进程内滑窗无法跨实例共享。卡内明示"进程内实现保留，不在本卡引入 Redis"；记 ADR 待升级。
- **UNKNOWN-2**：`test:e2e` / `test:visual` 因 Windows 环境（D16 裁决 next.config.ts:7 关闭 standalone）无法运行，与 W0-08/A 线同口径；Wave 2 集成时在 Linux 容器补齐。
- **UNKNOWN-3**：Coze 真实端点未联网验证（C-04 记录），不影响本卡。
- **后续**：C-10 完成后 C 线剩余 C-11（用量统计+优先级排序）、C-12（知识库其他管理）。