---
task: V19-FIX-03
date: 2026-10-29
head: 7567581
status: done
---
# FIX-03 · collect-tasks 搜索字段 · 执行记录

## 5W1H
- **What**：修复 `/manager/collect-tasks` 搜索框无效（F-05）
- **Why**：B1 实测输入 `zzz-no-match-zzz` 仍返回 1 行（实际全量），无空态 —— 根因 `searchFields: []`
- **Where**：`E:/Code/Demo/HDwebsite/hdwebsite_1011` · 分支 `upgrade` · HEAD `7567581`（FIX-02 之后）
- **When**：2026-10-29
- **Who**：执行助手（product-development Skill · EXECUTE 模式）
- **How**：读 `CollectTask` 模型字段 + `crud.ts` where 构造 → 定路径 → 改码 → tsc → 生产构建验证（后端 API + 前端空态）

## 模型与根因
- `CollectTask` 自有 `String` 字段：`status`、`stat`、`errMsg`（`source.name` 为关联，非标量）
- `src/lib/crud.ts:124`：`where.OR = searchFields.map(f => ({ [f]: { contains: keyword } }))` —— **仅标量**；关联字段（如 `source`）会生成非法 Prisma 过滤，需改通用构造器（禁止 → CCR），故关联 `source.name` 不可行
- 原 `searchFields: []` → `if (keyword && spec.searchFields.length)` 为假 → 无 `where.OR` → 返回全量

## 路径裁决
- **路径 A（首选）**：有自有文本字段 `errMsg` → `searchFields: ["errMsg"]`（卡步骤 2 明确指示）
- 路径 B（隐藏搜索框）/ 路径 C（改判据）不采用

## 改动（1 文件，允许路径内）
- `src/lib/crud-resources/collect.ts`：`collect-tasks.searchFields: []` → `["errMsg"]`（`publish-jobs` 的 `searchFields: []` 未动）

## 验证

### tsc + 冻结面
- `npx tsc --noEmit` → exit 0
- `git diff --stat src/contracts/ prisma/` → 空（未触碰冻结面）

### 后端 API（生产构建 `next start -p 6791`，`DATABASE_URL=e2e.db`）
| 请求 | total |
|---|---|
| `/api/collect-tasks?limit=100`（无 keyword） | 10 |
| `/api/collect-tasks?limit=100&keyword=zzz-no-match-zzz` | **0** |

### 前端（`verify.json`，PASS）
`/manager/collect-tasks`：
- 搜索前：`data-table` 数据行 10，无 empty-state
- 输入 `zzz-no-match-zzz` → 数据行 **0**，`empty-state` **可见**

## 判据逐条
| 判据 | 结果 |
|---|---|
| 搜索 `zzz-no-match-zzz` → 返回 0 行 | PASS（后端 API 0 / 前端数据行 0） |
| empty-state 可见 | PASS |

## 门禁
- tsc 0 ✓ · 冻结面未触碰 ✓ · 仅改 1 文件 ✓ · 后端 0 行 ✓ · 前端空态可见 ✓

## 越界检查
- 未触碰 `src/contracts/**`、`prisma/**`（模型不改）、`package.json`、`tests/**`、前台路径、历史 V1.8/V18 证据、通用 Crud 查询构造器
- 改动仅限：`src/lib/crud-resources/collect.ts` + `docs/design/06_validation/evidence/V19/FIX-03/**`
- `.cache/v19/`（探针）未提交

## UNKNOWN / 遗留
- 搜索按 `errMsg`（错误信息）过滤，非关联采集源名 `source.name`。关联搜索需改通用 where 构造器（`src/lib/crud.ts`），超出本卡范围，需 CCR。若业务更关心"按采集源名搜索"，另行提卡。
- 探针验证用生产构建（dev Turbopack 在本机 Windows 出现 watch/HMR 无限重载循环，已改生产构建规避）。