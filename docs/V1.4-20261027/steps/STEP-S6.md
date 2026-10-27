# STEP-S6：性能基线可复现

## 目标
`REQ-NF-001` 四条逐条判定，数值型给具体数字。

## 卡
- `V14-PERF-01`（P1，`sonnect`，中）

## 四条验收与现状

| # | 条目 | 现状 | 判定方式 |
|---|---|---|---|
| 1 | Lighthouse 移动端 Performance ≥ 基线 | 无当前数值、无 CI 步骤 | 无环境则 UNKNOWN（写明需要什么） |
| 2 | 网关超时 30s 生效（可配） | 需确认实现与配置键 | `grep` 定位键名+默认值+生效点 |
| 3 | 采集限速与批次超时生效 | `collectRateLimitMs` 默认 2000（`collect-engine.ts:248`） | 写"配置→生效"链路 |
| 4 | 发布高峰（≤5 写/分）无 SQLITE BUSY | 无压测 | 并发 5 写 × 60s，记 BUSY 次数 |

## 执行步骤
1. `node scripts/measure-baseline.mjs` 记 TTFB / HTML 体积 / 查询数
2. 条目 2：`grep -rn "timeout" src/lib/llm-gateway.ts` 定位并写清链路
3. 条目 3：`grep -n "collectRateLimitMs" src/lib/collect-engine.ts` 写链路
4. 条目 4：先读 `src/lib/__tests__/sqlite-busy-timeout.test.ts` 的断言口径，再设计并发压测
5. 条目 1：无 Chrome/lighthouse 包 → UNKNOWN（**不得为它改 `package.json`**，需装包走 CCR）
6. 四项判定写入 `perf-baseline.md`

## 完成判据
- [ ] 4 条逐条有判定（不得全 UNKNOWN 敷衍）
- [ ] 每条附命令或代码路径
- [ ] 数值型给具体数字
- [ ] `git diff --exit-code package.json` 通过
- [ ] UNKNOWN 写明需要的环境/依赖

## 验证命令
```bash
node scripts/measure-baseline.mjs
grep -rn "collectRateLimitMs" src/lib/collect-engine.ts
npx vitest run src/lib/__tests__/sqlite-busy-timeout.test.ts
git diff --exit-code package.json
```

## 关键约束
- 只测量不优化（本轮无优化任务）
- 不得为跑 Lighthouse 改依赖

## 证据落点
`evidence/V14/PERF-01/perf-baseline.md`
