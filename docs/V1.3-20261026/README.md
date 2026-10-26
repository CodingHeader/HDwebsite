# HDwebsite 规划 V1.3（2026-10-26）

**基线**：`upgrade@cbaaf55`（本机实测，local = origin/upgrade = 0 0）。
**上一轮**：`docs/V1.2-20261026/`（门禁归零轮，7 卡：4 done / 2 ready / 1 blocked）。
**本版定位**：**需求闭环轮**——V1.1 交付了功能、V1.2 收敛了 E2E，但"功能写了"≠"需求被证明实现了"。V1.3 做三件事：
① 把**测试基础设施自身的可信度**补上（否则后续所有 PASS 都可以是假的）；
② 把**已发现的双源限频实现缺陷**收口（这是实现缺陷，不是产品裁决）；
③ 把 **102 条未勾选的需求验收条目**逐条判定为 PASS / UNKNOWN / N/A。

> 不新增业务功能。不做前台视觉变更。不动冻结契约、迁移、依赖。

## 一、本轮实测事实（本机，2026-10-26，全部为本次亲自运行）

| # | 门禁 | 结果 | 命令 |
|---|---|---|---|
| F1 | lint | **PASS**（exit 0，--max-warnings 0） | `npm run lint` |
| F2 | typecheck | **PASS**（exit 0） | `npm run typecheck` |
| F3 | 单测 | **PASS 90 文件 / 1853 用例** | `npm test` |
| F4 | build | **PASS** | `npm run build` |
| F5 | 资源/根目录/审计 | **PASS**（8 资源 / 48 条白名单 / 0 漏洞，官方 registry） | `check:assets`+`check:root`+`check:audit` |
| F6 | e2e | **PASS 79/79**（**重建后**；重建前 apply-chat 失败，见 §二.1） | `npm run test:e2e` |
| F7 | a11y | **PASS 12/12**（但**未接入 CI**，见 §二.3） | `npx playwright test -c tests/a11y/playwright.config.ts` |
| F8 | visual（CI） | **FAIL**（run 40303786917，visual job failure） | GitHub API |
| F9 | seed-visual 自检 | **FAIL**（Article 期望 25 / 实际 26，exit 1） | `npx tsx prisma/seed-visual.ts --check` |
| F10 | 双端同步 | **0 0** | `git rev-list --left-right --count` |

## 二、本轮发现的实现缺陷（V1.3 的设计依据，均有代码行号或命令证据）

1. **测试基础设施会"测到旧构建"（已实证）**：`tests/e2e/global-setup.ts:70` 的 `if (!useStandalone) return null;` 早于 `:73` 的构建新鲜度检查，而 win32 恒为 `!useStandalone` → **Windows 上永不校验**。本次现场：`BUILD_ID` 17:54，`src/lib/chat-session.ts` 18:13 → e2e 跑出 apply-chat 失败；`npm run build`（19:00）后同一代码 **79/79 全绿**。**这意味着 V1.2 台账里的 e2e 结论必须附带构建时间才可信。**
2. **限频双源并存（既遂缺陷）**：`src/app/api/chat/stream/route.ts:22` 硬编码 `RATE_LIMIT_PER_MINUTE = 10`（按 **IP** count DB），`src/lib/llm/guard.ts:27` 另有 `GUARD_DEFAULT_RATE_LIMIT = 20`（按 **scene:identifier** 进程内滑窗）。**阈值、粒度、可配置性三重不一致**：实际有效阈值 = 两者取先到，后台设置键 `chatGuardRateLimitPerMin` 对硬编码通道**完全无效**，且按 IP 聚合会误伤同一 NAT 下的多个真实用户。
3. **a11y 门禁是"孤儿测试"**：`tests/a11y/**` 12/12 全绿，但 `package.json` 无 a11y script、`.github/workflows/ci.yml` 无该步骤 → REQ-F-015 / REQ-NF-003 的 axe 验收**无任何守卫**。
4. **visual 红灯归因未决**：基线提交 `0728c46`（10-24），其后 33 个提交；期间 `src/app/(web)` + `src/components/web` 的 **className 变更行数 = 0**，唯一结构变更是 `ChatWidget.tsx`（+29/-8，会话逻辑）。→ 强指向"基线/数据口径漂移"而非样式回归；但 CI artifact 匿名不可下载（401/403），**保持 UNKNOWN，不得当 PASS**。
5. **需求验收台账欠账**：16 个需求文档共 **102 条 `- [ ]`** 未勾选，其中包含已实现项 → 文档层面无法回答"剩余什么没做"。

## 三、切片总览（7 切片 / 12 卡）

| 切片 | 目标 | 卡 |
|---|---|---|
| S0 基线 | 固化可信基线（含构建时间戳口径） | V13-BASE-01 |
| S1 测试基建可信化 | 消灭"测旧构建""孤儿测试""基线漂移""种子漂移" | V13-E2E-FRESH-01、V13-GATE-A11Y-01、V13-VIS-01、V13-SEEDVIS-01 |
| S2 限频收口 | 单一限流源 + 设置驱动 + 契约测试 | V13-RL-01 |
| S3 管理端 UI 深耕 | 原生控件清零 + 设计系统一致性抽检 | V13-UI-HUB-01、V13-UI-CONSIST-01 |
| S4 需求反勾 | 102 条逐条判定并入档 | V13-REQ-01 |
| S5 性能门禁 | 性能基线可复现 | V13-PERF-01 |
| S6 收口 | 台账 + changelog + 双端 | V13-REL-01 |
| 待裁决 | 限频 10 vs 20 | V13-Q2-01（blocked） |

## 四、读这个

| 文件 | 内容 |
|---|---|
| `00-事实基线.md` | cbaaf55 快照 + 10 条实测门禁 + 构建时间戳口径 |
| `01-需求复核与辩证分析.md` | 5W1H + 双向钢人论证 + 第三轮重构 |
| `02-未实现需求清单.md` | **本轮核心交付**：G1~G10 缺口台账（含代码行号） |
| `03-契约与迁移增量.md` | 0 契约 / 0 迁移，冻结面说明 |
| `04-剩余可执行大纲.md` | **三级带序号大纲**（S→卡→步骤） |
| `05-连续执行协议.md` | 单主线取卡循环 + 构建新鲜度前置 |
| `06-任务索引.md`、`tasks/` | 12 卡定义 |
| `07-DAG-所有权-档位.md` | DAG + 所有权 + 难度档位 |
| `08-基线指标与门禁.md` | 门禁矩阵与判定口径 |
| `09-风险与待裁决.md` | 待用户裁决 + 风险登记 |
| `10-自检与局限.md` | 本包自检与已知局限 |
| `steps/STEP-S0..S6.md` | **每步一个计划文件** |

## 五、第一刀

`V13-BASE-01` → `V13-E2E-FRESH-01`（最高优先：它决定后续所有 PASS 是否可信）→ `V13-RL-01` → 其余按 DAG 并行。
