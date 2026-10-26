# STEP-S5：性能门禁

## 目标
把 `REQ-NF-001` 的 4 条性能验收从"有历史记录"变成"当前可复现"。

## 卡
- `V13-PERF-01`（P1，中档，中）

## 四条验收与现状
| # | 条目 | 现状 | 判定方式 |
|---|---|---|---|
| 1 | Lighthouse 移动端 Performance ≥ 基线 | 无当前数值、无 CI 步骤 | 无环境则 `UNKNOWN`（写明需要什么环境） |
| 2 | 网关超时 30s 生效（可配） | 需确认实现与配置键 | `grep` 定位键名 + 默认值 + 生效点 |
| 3 | 采集限速与批次超时生效 | `collectRateLimitMs` 默认 2000（`collect-engine.ts:248`） | 写"配置 → 生效"链路 |
| 4 | 发布高峰（≤5 写/分）无 SQLite BUSY | 无压测 | 并发 5 写 × 60s，记 BUSY 次数 |

## 执行步骤
1. `node scripts/measure-baseline.mjs` → 记首页/列表/详情 TTFB、HTML 体积、查询数
2. 逐条核对：超时键（`grep -rn "timeout" src/lib/llm/`）、采集限速链路、SQLITE BUSY 压测
3. 判定 `PASS` / `FAIL(数值)` / `UNKNOWN(原因)`，**给出具体数字**
4. 能自动化的（如 BUSY 压测）写脚本并考虑接入 CI
5. 落证据

## 完成判据
- [ ] 4 条逐条有判定（不得全 UNKNOWN 敷衍）
- [ ] 每条附命令或代码路径
- [ ] 数值型条目给出**具体数字**
- [ ] `git diff --exit-code package.json` 通过（不引入依赖）

## 验证命令
```bash
node scripts/measure-baseline.mjs
grep -rn "collectRateLimitMs" src/lib/collect-engine.ts
git diff --exit-code package.json
```

## 证据落点
`evidence/V13/PERF-01/perf-baseline.md`
