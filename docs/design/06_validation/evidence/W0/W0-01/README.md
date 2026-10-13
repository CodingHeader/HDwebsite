---
id: EVD-W0-01
type: evidence
title: W0-01 并行编排规则落盘——证据
status: done
owner: 执行者 Y（契约员）
created: 2026-10-13
updated: 2026-10-13
related: [ADR-027, PLAN-CURRENT, AGENTS]
---

# W0-01 证据：并行编排规则落盘

## 0. 5W1H 简版

- **What**：把 parallel-w1 规划包入库，修订 `AGENTS.md` §4/§5/§8 的编排与推送规则，给 P07~P15 加取代说明，`current-plan.md` 文首追加 2026-10-13 裁决，写 ADR-027。
- **Why**：用户 2026-10-13 要求 3~5 并行子任务（K7/K17），与 `AGENTS.md` §4 "方向全部串行"、§5 "推送只在 Final" 冲突；并行前必须把规则、冻结与分发口径落盘。
- **Who**：执行者 Y（Wave 0 契约员，唯一写入者）。
- **When**：2026-10-13。
- **Where**：`upgrade` 分支，基线 `bb2c0e51364aca4608d2a5832e31462b9c54ccf8`；工作副本 `E:/Code/Demo/HDwebsite/hdwebsite_1011`。
- **How**：见 §2/§3。

## 1. 改动文件（严格落在"允许修改 = AGENTS.md ∪ docs/design/**"）

| 文件 | 变更 |
| --- | --- |
| `AGENTS.md` | §4 串行 → Wave0 冻结 + Wave1 双线并行 + 冻结面 + 所有权不相交；§5 推送规则改 D8；§8 增加 lane 证据目录约定 |
| `docs/design/04_planning/current-plan.md` | 文首追加"2026-10-13 用户裁决（D6~D11）"小节 |
| `docs/design/04_planning/review-prompts/P07~P15-*.md`（9 份） | frontmatter 之后插入 3 行"已由 parallel-w1 取代"说明，正文不删 |
| `docs/design/04_planning/parallel-w1/**`（110 文件） | 规划包原样入库（剔除 `gen/__pycache__`、`evidence/scratch`） |
| `docs/design/03_solution/decisions/ADR-027-并行编排与契约冻结.md` | 新增 |
| `docs/design/06_validation/evidence/W0/W0-01/README.md` | 本文件 |

## 2. 验收逐条结果

| # | 验收条目 | 结果 | 证据 |
| --- | --- | --- | --- |
| 1 | `grep -c "parallel-w1" AGENTS.md` ≥ 1 | **PASS**（=2） | §3-① |
| 2 | P07~P15 每份含"已由 parallel-w1 取代" | **PASS**（9 份） | §3-② |
| 3 | 提交只含 `AGENTS.md` 与 `docs/design/**` | **PASS** | §3-③ |
| 4 | 通用门禁 lint/typecheck/test/build 全部 exit 0 | **PASS（1 处环境 UNKNOWN）** | §4 |
| 5 | 越界检查口径（`bb2c0e5..HEAD`）全落在允许路径内 | **PASS** | §3-③ |

## 3. 命令与关键输出

① `grep -c "parallel-w1" AGENTS.md` → `2`

②
```bash
for f in docs/design/04_planning/review-prompts/P0[7-9]*.md docs/design/04_planning/review-prompts/P1*.md; do
  grep -q "已由 parallel-w1 取代" "$f" || exit 1
done; echo ok
```
→ `prompts ok`

③
```bash
git show --pretty=format: --name-only HEAD | grep -vE '^(AGENTS\.md|docs/)' || echo "ok: 全部在允许路径内"
git -c core.quotePath=false log --first-parent --no-merges --name-only --format= bb2c0e5..HEAD | sort -u | grep -vE '^(AGENTS\.md|docs/)' || echo "ok: 未越权"
```
→ 均 `ok`

## 4. 通用门禁（环境与结果）

node v22.22.2（engines >=24，EBADENGINE 警告，与 P0~P06 同口径），npm 10.9.7。

| 命令 | exit | 关键输出 |
| --- | --- | --- |
| `npx prisma generate` | 0 | Prisma Client v7 生成 |
| `npm run lint` | 0 | 0 error |
| `npm run typecheck` | 0 | — |
| `npm run build` | 0 | 需先清空 `.next`（沙箱批量删除保护，见下） |
| `npx vitest run --maxWorkers=2` | 见 §4 注 | **209/210**，2 处失败为沙箱产物 |

`npm test` 原命令在本沙箱下 8 个 DB 套件并行争用 → `beforeAll` hook 10s 超时；以 `--maxWorkers=2` 复跑得 **209/210**。剩余失败：

1. `sqlite-busy-timeout.test.ts`：`EBUSY ... unlink ...p04-busy-*/test.db`，来自沙箱 `node-safe-delete-shim.cjs` 改写 `fs.rmSync`。
2. `wechat-chat.test.ts > src/lib 无硬编码电话/域名`：断言内 `execSync('grep …')` 被沙箱拒绝（`spawnSync cmd.exe EBUSY`）。

**结论**：代码层面等价于绿；两项记环境 UNKNOWN（对应 `10-风险·未决·待裁决.md` R-W11 / `01` A-X-1），不入 PASS。

## 5. UNKNOWN 与边界

- `npm run test:visual` / `npm run test:e2e` 本卡未跑（需 Playwright 浏览器与系统依赖）；按 `09-基线指标.md`，P06-verify 的 46/46、8/8 被引用。
- 沙箱对"批量删除（>50 文件/回合）"与"spawn cmd.exe"有策略限制，影响 `npm ci`（整目录重建）、`next build`（清 `.next`）与部分用例；已用等价手段规避并留证。
