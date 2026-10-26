# V13-PERF-01：性能基线可复现

## 归属
- 切片：S5
- 缺口：**G7**
- 执行者：P1
- 档位：中｜规模：中

## 目标
把 `REQ-NF-001` 的 4 条性能验收从"有历史记录"变成"当前可复现"，能进 CI 的进 CI，不能进的写清手工口径。

## 输入
- `docs/design/02_requirements/non-functional/REQ-NF-001-性能与响应.md`（4 条验收）
- `scripts/measure-baseline.mjs`
- `docs/design/06_validation/evidence/V8/PERF-01`、`evidence/V11/PERF-01`

## 四条验收现状（本轮核查）
| 条目 | 现状 |
|---|---|
| Lighthouse 移动端 Performance ≥ 基线 | 无当前数值，无 CI 步骤 |
| 网关超时 30s 生效（可配） | 需确认代码实现与配置键 |
| 采集限速与批次超时生效 | 有 `collectRateLimitMs`（`collect-engine.ts:248`），无验收证据 |
| 发布高峰（≤5 写任务/分）无 SQLite BUSY | 无压测证据 |

## 输出
- `docs/design/06_validation/evidence/V13/PERF-01/perf-baseline.md`（当前数值 + 四条判定）
- （可选）CI 步骤或 `scripts/` 下的可复现脚本
- 证据

## Execution Steps
1. [ ] 跑 `node scripts/measure-baseline.mjs`，记录首页/列表/详情页关键指标（TTFB、HTML 体积、查询数）
2. [ ] 逐条核对 4 条验收：
   - 超时：定位配置键与生效点（`grep -rn "timeout" src/lib/llm/`），写"键名 + 默认值 + 生效位置"
   - 采集限速：`collectRateLimitMs` 默认 2000ms，写"配置 → 生效"链路
   - SQLITE BUSY：并发 5 写任务压测 60s，记录 `SQLITE_BUSY` 次数
   - Lighthouse：若本机无 Chrome CI 环境，标 UNKNOWN 并写明需要的环境
3. [ ] 判定：`PASS` / `FAIL(数值)` / `UNKNOWN(原因)`
4. [ ] 能自动化的（如 BUSY 压测）写成脚本并考虑接入 CI
5. [ ] 证据：命令原文 + 输出数值 + 四条判定

## 验收标准
- [ ] 4 条逐条有判定（不得全标 UNKNOWN 敷衍）
- [ ] 每条判定附命令或代码路径
- [ ] 数值型条目给出**具体数字**（非"良好"）
- [ ] 未引入新依赖（`package.json` 不变）

## 验证命令
```bash
node scripts/measure-baseline.mjs
grep -rn "collectRateLimitMs" src/lib/collect-engine.ts
git diff --exit-code package.json
```

## 证据路径
`docs/design/06_validation/evidence/V13/PERF-01/`

## 允许修改
- `docs/design/06_validation/evidence/V13/PERF-01/**`
- `scripts/measure-baseline.mjs`（增强，不改依赖）
- `.github/workflows/ci.yml`（如需接入）

## 禁止修改
- `package.json`、`src/contracts/**`、`prisma/**`
- 前台任何文件

## 依赖与阻塞
- Depends on：V13-BASE-01
- 阻塞条件：Lighthouse 需真实浏览器环境且本机不可用 → 该条标 UNKNOWN，其余三条照做

## 升级条件
连续 2 次 FAIL → 熔断，只交现状数值不做优化。
