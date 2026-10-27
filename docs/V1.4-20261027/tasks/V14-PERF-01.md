# TASK V14-PERF-01：性能基线可复现（REQ-NF-001 四条）

## 归属
- 所属切片：S6
- 来源需求：`REQ-NF-001-性能与响应.md`（4 条验收）
- 来源方案：V1.4 `04-垂直切片清单.md` S6

## 目标
把 4 条性能验收从"有历史记录"变成"当前可复现"：每条有判定 + 证据路径，数值型给具体数字。

## 输入
- 文档：`REQ-NF-001-性能与响应.md`
- 契约：无
- 前置任务：V14-BASE-01
- 前置状态：基线门禁全绿

## 四条验收现状（实测核查）

| # | 验收原文 | 现状 | 判定方式 |
|---|---|---|---|
| 1 | Lighthouse 移动端 Performance ≥ 现状基线 | **无当前数值、无 CI 步骤** | 无浏览器环境则 `UNKNOWN`（写明需要什么环境） |
| 2 | 网关超时 30s 生效（可配），不再出现 88s 空等 | 需确认实现与配置键 | `grep` 定位键名 + 默认值 + 生效点 |
| 3 | 采集限速与批次超时生效 | 已知 `collectRateLimitMs` 默认 2000（`collect-engine.ts:248`） | 写"配置 → 生效"链路 |
| 4 | 发布/入库高峰（≤5 写任务/分）无 SQLite BUSY | 无压测证据 | 并发 5 写 × 60s，记 BUSY 次数 |

## 输出
- `docs/design/06_validation/evidence/V14/PERF-01/perf-baseline.md`
- 可选：`scripts/measure-baseline.mjs` 增强（不改依赖）

## Execution Steps
1. [ ] 跑 `node scripts/measure-baseline.mjs`，记录首页/列表/详情页：TTFB、HTML 体积、SQL 查询次数（脚本已有输出则直接引用）
2. [ ] **条目 2**：`grep -rn "timeout" src/lib/llm-gateway.ts src/lib/llm/*.ts` 定位超时键；写清「键名 + 默认值 + 生效位置 + 是否可配」
3. [ ] **条目 3**：`grep -n "collectRateLimitMs" src/lib/collect-engine.ts`；写「设置键 → 读取 → 实际 sleep」链路
4. [ ] **条目 4**：并发压测
   - 用 5 个并发写请求（如 5 个不同的 `POST /api/articles` 或直连 prisma 写）持续 60s
   - 记录日志中 `SQLITE_BUSY` 出现次数
   - 若脚本里已有 `sqlite-busy-timeout` 相关单测（`src/lib/__tests__/sqlite-busy-timeout.test.ts`），先读其断言口径再设计压测
5. [ ] **条目 1**：尝试 Lighthouse
   - 若无 Chrome/无 `lighthouse` 包 → 标 `UNKNOWN`，写明"需 Linux CI + `npm i -D lighthouse`（属依赖变更，需 CCR）"
   - **不得**为了跑 Lighthouse 而改 `package.json`
6. [ ] 四项判定：`PASS` / `FAIL(数值)` / `UNKNOWN(原因)`，写进 `perf-baseline.md`
7. [ ] 若条目 4 可脚本化，考虑加入 CI（与 A11Y/FROZEN 串行，避免 ci.yml 冲突）

## 验收标准
- [ ] 4 条**逐条**有判定（不得全 UNKNOWN 敷衍）（人工判断）
- [ ] 每条判定附命令或代码路径（可自动化：检查文件含路径）
- [ ] 数值型条目给出**具体数字**，非"良好""可接受"（人工判断）
- [ ] `git diff --exit-code package.json` 通过（可自动化）
- [ ] 若标 UNKNOWN，写明"需要什么环境/依赖"（人工判断）

## 验证命令
```bash
node scripts/measure-baseline.mjs
grep -rn "collectRateLimitMs" src/lib/collect-engine.ts
grep -rn "timeout" src/lib/llm-gateway.ts | head
npx vitest run src/lib/__tests__/sqlite-busy-timeout.test.ts
git diff --exit-code package.json
```

## 证据路径
`docs/design/06_validation/evidence/V14/PERF-01/perf-baseline.md`

## 允许修改
- `docs/design/06_validation/evidence/V14/PERF-01/**`
- `scripts/measure-baseline.mjs`（增强，不改依赖）
- `.github/workflows/ci.yml`（**仅当**要接压测步骤，且须在 FROZEN-GUARD-01 之后）

## 禁止修改
- `package.json`（不得为 Lighthouse 装包；需要则走 CCR）
- `src/**`（本卡只测量不优化）
- `src/contracts/**`、`prisma/**`

## 依赖与阻塞
- Depends on：V14-BASE-01
- Blocks：无
- 阻塞条件：Lighthouse 无环境 → 该条标 UNKNOWN，其余三条照做（**不得因此整卡 blocked**）

## 建议执行档位
`sonnect`　理由：取数 + 链路梳理，规则明确。

## 升级条件
连续 2 次 FAIL → 熔断，只交现状数值不做优化。

## 预估规模
中　（3~4 小时，含压测）
