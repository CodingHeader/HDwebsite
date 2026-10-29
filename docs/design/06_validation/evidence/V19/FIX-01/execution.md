---
task: V19-FIX-01
date: 2026-10-29
head: 13bbcbd
status: done
---
# FIX-01 · 空态动作补齐（6 页）· 执行记录

## 5W1H
- **What**：为 6 个管理端页面空态补「下一步动作」（F-01/F-03/F-04/F-06/F-09/F-10）
- **Why**：B1 实测 F-01/F-03/F-04/F-06/F-09/F-10 空态无容器内动作，v2 判据 FAIL
- **Where**：`E:/Code/Demo/HDwebsite/hdwebsite_1011` · 分支 `upgrade` · HEAD `13bbcbd`
- **When**：2026-10-29
- **Who**：执行助手（product-development Skill · EXECUTE 模式）
- **How**：逐页读源码确认空态成因 → 复用已有 handler 补 `emptyAction` → tsc → 起服务（6791）→ Playwright 探针验证

## 改动清单（6 页，均在允许路径内）

| 页 | 空态成因 | 动作 | 复用 handler | 关键改动 |
|---|---|---|---|---|
| articles | 关键词/频道筛选 | 清除筛选 | setKeyword/setChannel/setPage | emptyAction 三态：filtered→清除筛选，否则→新建文章 |
| chat-history | 关键词筛选 | 清除筛选 | setKeyword/setChannel/setPage | 新增 emptyAction（filtered 时清除筛选） |
| collect-items | 状态 tab 为空 | 查看全部 | setStatus/setPage | 新增 emptyAction（重置 tab） |
| content-hub | 关键词筛选/无内容 | 清除筛选/新建内容 | setKeyword/setPage/openEdit | 新增 emptyAction 两态 |
| home-blocks | 无区块 | 恢复默认 | resetDefaults | 新增 emptyAction（确认框后重建） |
| knowledge-bases | 无知识库 | 新建知识库 | openCreate | 新增 emptyAction |

**搜索组件修复**：articles/chat-history/content-hub 原用 `SearchInput`（内部 draft 不随 value 同步，导致「清除筛选」点击后 keyword 被 SearchInput 的 debounce 回写为旧值）。已切至标准 `SearchField`（`src/components/manager/ui/input.tsx`，CrudPage 同款，`prev!==value` 时同步 text），「清除筛选」方可实际生效。SearchInput 仅此 3 页使用。

## 验证

### tsc + 越界
- `npx tsc --noEmit` → exit 0
- `git status --short src` → 仅 6 页（articles/chat-history/collect-items/content-hub/home-blocks/knowledge-bases），无越界

### 运行时（`verify.json`，6/6 PASS）
- 逐页：搜索 zzz-no-match-zzz 或拦截 API 空列表 → `empty-state` 可见 ∧ 容器内 button/a 数量 = 1
- `verify.json`：6 格全部 `containerActionCount:1`，动作文案分别为 清除筛选/清除筛选/清除筛选/查看全部/恢复默认/新建知识库

### 动作生效（click 验证，6/6 PASS）
- articles/chat-history/content-hub：点击清除筛选 → searchbox 值变空（keyword 重置）
- collect-items：点击查看全部 → 状态 tab 重置
- home-blocks：点击恢复默认 → 出现「恢复默认区块配置？」确认框
- knowledge-bases：点击新建知识库 → 表单对话框打开

## 判据逐条

| 判据 | 结果 |
|---|---|
| empty-state 可见 | PASS（6/6） |
| 容器内 button/a 数量 ≥ 1 | PASS（6/6，均为 1） |
| 动作能实际生效 | PASS（6/6，click 验证） |

## 门禁
- tsc 0 ✓ · 仅改 6 页 ✓ · verify.json 6/6 PASS ✓ · click 6/6 PASS ✓

## 越界检查
- 未触碰 `src/contracts/**`、`prisma/**`、`package.json`、`src/components/manager/DataTable.tsx`、`EmptyState.tsx`、`tests/**`、`docs/V1.8-20261027/**`、`evidence/V18/**`
- 改动仅限：6 页 `page.tsx`（允许路径）+ `docs/design/06_validation/evidence/V19/FIX-01/**`
- `.cache/v19/`（探针脚本与运行期产物）未提交

## UNKNOWN / 遗留
- `SearchInput` 的 draft 不同步属组件缺陷，仅 3 页使用；已绕过（切 SearchField），组件文件未改（越界保护）。建议后续评估是否修 SearchInput 或废弃。
- FIX-02 与 FIX-01 共改 content-hub（toast description），须串行（先 FIX-01 后 FIX-02），各自独立 commit。
