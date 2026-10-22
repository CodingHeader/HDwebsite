# V8-G-01 执行证据：入口对齐 V0.8 + 连续执行协议落地

- 执行者：主代理 ｜ 分支 `upgrade` ｜ 日期 2026-10-22
- 允许修改：`AGENTS.md`、`CLAUDE.md`、`docs/design/04_planning/current-plan.md`

## 1. 起点

三处入口仍指向 V0.7：

```bash
grep -n 'V0.7-20261019' AGENTS.md
# 14: 2. docs/V0.7-20261019/README.md——当前轮规划入口…
# 15: 3. 当前方向任务定义 docs/V0.7-20261019/tasks/<卡号>.md…
# 16/41/42: 编排/冻结面段落亦引用 V0.7
```

`CLAUDE.md` 尾部有「使用说明」5 条，其中"每张规划卡完成后必须产出证据
（`docs/design/06_validation/evidence/V7/<卡号>/`）"与 V0.8 的 `evidence/V8/` 冲突——
属"与 AGENTS.md 不同的规则"。

## 2. 改动

### 2.1 `AGENTS.md` §1 读取顺序

| 项 | 改前 | 改后 |
| --- | --- | --- |
| 第 2 条 | `docs/V0.7-20261019/README.md`（V0.7 单主线） | **`docs/V0.8-20261022/README.md`**（V0.8 单主线，2026-10-22 起），并列出 `state.json`、`04-连续执行协议.md` |
| 第 3 条 | `docs/V0.7-20261019/tasks/<卡号>.md` | **`docs/V0.8-20261022/tasks/<卡号>.md`** |
| 第 3.1 条（新增） | — | **执行者按 `04-连续执行协议.md` 循环取卡**：拉代码 → 读 state → 领卡 → 执行 → 门禁 → 证据 → 推送 → 心跳；不阻塞；同卡连续 2 次 FAIL 熔断升档；**仅当剩余卡全部卡在外部条件时才允许停** |

V0.7/V0.6 包保留为"历史轮次包…仅供追溯"，未删除（历史只读原则）。

### 2.2 `CLAUDE.md`

改前：`@AGENTS.md` 之后再附 5 条「使用说明」，与 AGENTS 重复且在证据路径上冲突（`V7` vs `V8`）。

改后：只保留 3 件事——
1. 声明 **AGENTS.md 是唯一权威**；
2. 明确「本文件不重复、不覆盖；两处不一致一律以 AGENTS.md 为准，不得在此另立分支/端口/门禁规则」；
3. 「当前轮入口」指向 `docs/V0.8-20261022/`。

然后 `@AGENTS.md`。

> 这样既满足 parity E2（与 main 的 CLAUDE.md 对等：都只是指向 AGENTS.md 的薄壳），
> 又消除了两处规则分歧的来源。

### 2.3 `current-plan.md`

顶部新增 3 行「2026-10-22 V0.8 入口」小节，并显式声明：
下方「V0.7 终态」与各 P0~P15 章节**保留为历史追溯，不再作为执行依据**。

## 3. 验证

### 3.1 卡定义验收项

```bash
grep -c 'V0.8-20261022' AGENTS.md CLAUDE.md docs/design/04_planning/current-plan.md
# AGENTS.md:3
# CLAUDE.md:2
# docs/design/04_planning/current-plan.md:1
```

| 验收项 | 结果 |
| --- | --- |
| `grep -c 'V0.8-20261022' AGENTS.md ≥ 1` | **3** ✅ |
| `CLAUDE.md` 不再含与 AGENTS.md 不同的分支/端口规则 | ✅ 已删除全部重复条款，只保留指向声明 |
| 门禁全绿 | ✅ 见 §3.2 |

### 3.2 门禁

| 命令 | 结果 |
| --- | --- |
| `npm run lint`（`--max-warnings 0`） | exit 0 |
| `npm run typecheck` | exit 0 |
| `node scripts/check-root.mjs` | PASS |

（`npm test` / `build` 在同轮其他卡已多次验证为 1712 passed / exit 0；本卡仅改文档，不影响。）

## 4. 遗留

- AGENTS.md §4「编排」与「冻结面」两段仍引用 `docs/V0.7-20261019/` 的路径（作为历史 CCR 章程的存放位置）。
  这是**故意的**：那些是既成事实的归档位置，改写会让历史记录失效。
  但已在 §1 明确"V0.7 仅供追溯"，执行者不会误用。
- `CLAUDE.md` 现在极简。若后续需要工具专属说明，应加到 AGENTS.md 而非此处（保持单一权威）。
