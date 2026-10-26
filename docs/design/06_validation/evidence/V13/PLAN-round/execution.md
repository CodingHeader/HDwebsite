# V13 规划轮 · 执行证据（规划包落盘 + E2E-FRESH-01 修复）

> 执行时间：2026-10-26（本机 win32，node v24.15.0 / npm 11.12.1）
> 执行者：main-agent（规划 + 核心/高难卡）
> 起点：`upgrade@cbaaf55`（= origin/upgrade，0 0）
> 交付：`docs/V1.3-20261026/`（21 个 md + state.json）

## 5W1H 简版

- **What**：审计"未被实现的需求"并建立统一规划体系；交付 V1.3 规划包（12 卡 / 7 切片 / 8 步骤文件），并修复 1 个使验收证据失效的测试基建缺陷。
- **Why**：V1.1 交付功能、V1.2 收敛 E2E，但"功能已写"≠"需求已被证明"；本轮查出 12 条缺口（G1~G12），其中 3 条为实现缺陷。
- **Where/When**：`docs/V1.3-20261026/`；`tests/e2e/global-setup.ts`（唯一代码改动）。
- **Who**：main-agent 执行审计与核心卡；中等/简单卡（`06-任务索引.md` §二）发布后交其他 Agent。
- **How**：亲自跑七道门禁 → trace/DB/git diff 取证 → 反证排除（并发假红、旧构建）→ 缺口台账 → 分卡落盘。
- **What if**：若推送失败 → 输出 zip + state 标 blocked，不虚报双端一致。

## 一、本轮门禁实测

| 门禁 | 结果 | 命令 |
|---|---|---|
| lint | PASS | `npm run lint` |
| typecheck | PASS | `npm run typecheck` / `npx tsc --noEmit` |
| 单测 | PASS 90 文件 / 1853 用例 | `npm test`（独立串行） |
| build | PASS | `npm run build` |
| check:assets | PASS（8 引用） | `npm run check:assets` |
| check:root | PASS（48 条白名单） | `npm run check:root` |
| check:audit | PASS（0 漏洞，官方 registry） | `npm run check:audit` |
| e2e | PASS 79/79 | `npm run test:e2e`（**重建后**） |
| a11y | PASS 12/12 | `npx playwright test -c tests/a11y/playwright.config.ts` |
| visual（CI） | FAIL | GitHub API run `40303786917` |

## 二、关键取证链

### 2.1 "e2e 测得旧构建"的判定过程（含反证）

| 步骤 | 观察 | 结论 |
|---|---|---|
| ① 首次全量 e2e | 1 failed（`apply-chat`，`MOCK_REPLY` 30s 超时） | 疑似 V12-E2E-01 修复失效 |
| ② 解包 trace | **4×并发 `GET /api/chat/session` 200** + `POST /api/chat/stream` **400** | 与修复前根因完全一致 → 强烈支持"修复失效" |
| ③ 对照文件 mtime | `BUILD_ID`=**17:54:31** < `chat-session.ts`=**18:13:36** | 构建陈旧（最关键反证） |
| ④ `npm run build`（19:00）后单跑 | `apply-chat` **PASS**（1.9s） | 排除代码缺陷 |
| ⑤ 重建后全量 | **79/79 PASS**（2.3m） | 结论：旧构建所致 |

**若跳过 ③④⑤ 会得出什么错误结论**：会把"测试基建缺陷"误判为"V12-E2E-01 修复未生效"，从而让下一轮重复修一个已经修好的功能——这正是本轮把该缺陷列为 P0 的原因。

### 2.2 修复内容（`tests/e2e/global-setup.ts`）

修复前（问题顺序）：

```ts
if (!useStandalone) return null;                   // win32 恒命中 → 提前返回
const builtAt = statSync(buildId).mtimeMs;         // 新鲜度校验永远执行不到
if (latestMtime(...src) > builtAt) throw ...
```

修复后（现状 L79~L88）：

```ts
const builtAt = statSync(buildId).mtimeMs;         // L79  平台无关
const srcLatest = latestMtime(path.join(ROOT,"src"));// L80
if (srcLatest > builtAt) throw new Error(...);     // L81  含两侧 ISO 时间戳
if (!useStandalone) return null;                    // L88  分支已在校验之后
```

### 2.3 限频双源（G1）取证

```text
src/app/api/chat/stream/route.ts:22   const RATE_LIMIT_PER_MINUTE = 10;
src/app/api/chat/stream/route.ts:74   const recent = await prisma.aIChatHistory.count({  // by ipAddress, 60s
src/app/api/chat/stream/route.ts:77   if (recent >= RATE_LIMIT_PER_MINUTE) return tooManyRequests();

src/lib/llm/guard.ts:27               export const GUARD_DEFAULT_RATE_LIMIT = 20;
src/lib/llm/guard.ts:150              const key = `${sceneCode}:${identifier}`;   // 滑窗
src/lib/settings-registry.ts:162      def("chatGuardRateLimitPerMin", ..., "20", ...)
```

→ 阈值/粒度/可配置性三重不一致；后台设置对 IP 通道无效。

### 2.4 seed-visual 自检失败定位

```text
counts.json: Article = 25
seed-visual.ts: id = ID_BASE + 200 + i  (i=1..25)  →  9201..9225
dev.db 实测   : visual id 26 条，多出 9226 = ('测试文章','draft')   ← 人工残留
种子缺失      : 0
```

→ 种子 25 条齐全；`--check` 因全表 `count(*)` 多 1 而 exit 1，属口径问题。

## 三、交付物

| 类别 | 文件 |
|---|---|
| 入口 | `README.md` |
| 分析 | `00-事实基线.md`、`01-需求复核与辩证分析.md`、`02-未实现需求清单.md` |
| 约束 | `03-契约与迁移增量.md`（0 契约 / 0 迁移） |
| 大纲 | `04-剩余可执行大纲.md`（3 级 12 卡） |
| 协议 | `05-连续执行协议.md`、`07-DAG-所有权-档位.md`、`08-基线指标与门禁.md` |
| 台账 | `06-任务索引.md`、`state.json`、`09-风险与待裁决.md`、`10-自检与局限.md` |
| 卡 | `tasks/V13-*.md` × 12 |
| 分步 | `steps/00-执行计划-20261026.md`、`STEP-S0..S6.md` × 7 |

## 四、验收条目

- [x] 检查未实现需求：G1~G12 共 12 条，每条带文件行号或命令证据
- [x] 建立统一规划体系：3 级大纲（S→卡→步骤）+ DAG + 所有权 + 档位 + 状态机
- [x] 每个步骤一个 md：`steps/STEP-S0..S6.md` 共 7 个
- [x] 自动新建目录递进版本：`V1.2-20261026` → `V1.3-20261026`
- [x] 未新建分支（全程 `upgrade`）
- [x] 0 契约 / 0 迁移
- [x] MUST 冲突不替用户裁决（`V13-Q2-01` 保持 blocked）
- [x] 门禁四连绿（tsc / lint / check:root，另 test/build 已在前序运行通过）

## 五、UNKNOWN 与后续

| 项 | 原因 | 承接卡 |
|---|---|---|
| visual 红灯归因 | CI artifact 匿名 401/403；本机 Windows 不可判 | `V13-VIS-01` |
| 真实微信/SMTP/Coze 联调 | 凭证缺失（AGENTS.md §2 已授权 mock） | 不排卡 |
| 限频默认值 10 vs 20 | MUST 冲突，须用户裁决 | `V13-Q2-01`（blocked） |

## 六、后续待办（按顺序）

1. `V13-BASE-01`（基线复核，P2）
2. `V13-RL-01`（限频单源化，main-agent）
3. `V13-SEEDVIS-01` → `V13-VIS-01`（串行）
4. `V13-UI-HUB-01` → `V13-UI-CONSIST-01`
5. `V13-GATE-A11Y-01`、`V13-PERF-01`
6. `V13-REQ-01` → `V13-REL-01`
