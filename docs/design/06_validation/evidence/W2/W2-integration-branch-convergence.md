# Wave 2 集成 + 分支收敛 执行记录

> 分支：`upgrade`　日期：2026-10-17　起点：`4811fad`　终点：`bb4b32f`　触发：用户指令"只保留一个主分支和 upgrade 分支"
> 结论：**DONE**（Wave 1 五条 lane 全部合入 upgrade，8 条临时分支已删，远端仅剩 main + upgrade，门禁 4/4 全绿）

## 1. 背景与风险分析（5W1H 简版）

- **What**：用户要求 GitHub 仓库 `CodingHeader/HDwebsite` 只保留 `main`（老代码）与 `upgrade`（新改动）两个分支，删除其他分支。
- **Why**：Wave 1 并行编排产生了 5 条 lane 分支 + 3 条 w0 分支，共 8 条远端分支，用户希望收敛。
- **Where/When**：`upgrade` 分支，执行前远端已有 8 条多余分支。
- **Who**：C 线（当前 lane/c-ai-kb）+ 主代理（集成 + 清理）。
- **How**：先集成保全 → 门禁 → 推 upgrade → 删远端分支 → 清本地分支与凭据 → 复核。

### 关键风险（阻断级）
**直接 `git push --delete` 会永久丢失 Wave 1 全部工作成果。** 侦察确认：
- `lane/c-ai-kb` 领先 `upgrade` **16 commits**（C-01~C-12）
- `lane/e-manager-pages` 领先 `upgrade` **16 commits**（E-08/E-10/E-11）
- `lane/a-manager-ui` 领先 `upgrade` **18 commits**（A-08 a11y + E 线集）
- `lane/b-api-platform` 领先 `upgrade` **1 commit**（B-01）
- `lane/d-ops` 已由 `aea0c7b` 合入

**结论**：必须先做 Wave 2 集成，把未合入成果保全到 `upgrade`，跑门禁，推 `upgrade`，最后才删分支。

## 2. 冲突预判（merge-tree，只读）

| lane | merge-tree exit | 冲突 | 合并后 |
|---|---|---|---|
| lane/b-api-platform | 0 | 无 | 无冲突合入 |
| lane/c-ai-kb | 0 | 无 | 无冲突合入 |
| lane/e-manager-pages | 0 | 无 | 无冲突合入 |
| lane/a-manager-ui | 0 | 无 | 无冲突合入 |

4 条 lane 全部**无冲突**合入 `upgrade`。

## 3. 执行步骤与结果

### 3.1 集成（4 笔 --no-ff merge commit）
```
72c1e82 merge(W2): 合入 lane/b-api-platform（B-01 settings 读取单一语义 + 证据）
8a0301c merge(W2): 合入 lane/c-ai-kb（C-01~C-12 AI 与知识库全套，16 commits）
ee4abd8 merge(W2): 合入 lane/e-manager-pages（E-01~E-12 管理端页面全套，16 commits）
bb4b32f merge(W2): 合入 lane/a-manager-ui（A-01~A-08 管理端基础件与 a11y 修复，18 commits）
```
全部 exit 0，`git diff --name-only --diff-filter=U` = **0 冲突文件**。

### 3.2 门禁（upgrade 合并后）
```
$ npm run lint      → 36 problems (0 errors, 36 warnings 既有)    exit 0
$ npm run typecheck → (no output)                                 exit 0
$ npm test          → 43 files / 599 tests passed                 exit 0
$ npm run build     → ✓ Compiled successfully in 5.8s            exit 0
```

### 3.3 推送 upgrade
- 首次 askpass 推送失败：`Invalid username or token`（GitHub 对 x-access-token + askpass 组合不接受）。
- 改用 **HTTPS URL 内嵌 PAT** 方式：`git push origin upgrade` → `4811fad..bb4b32f upgrade -> upgrade`，exit 0。
- 用户随后指示用 **10808 代理**推送同步。后续操作均带 `https_proxy=http://127.0.0.1:10808`。
- 代理连通测试：`curl -x http://127.0.0.1:10808 https://github.com` → HTTP 200。

### 3.4 删除远端 8 条分支（10808 代理）
```
$ git push origin --delete lane/a-manager-ui lane/b-api-platform lane/c-ai-kb \
    lane/d-ops lane/e-manager-pages w0/ccr-1 w0/staging w0/test-infra
  → 8 条分支全部 [deleted]，exit 0
```

### 3.5 清理凭据与临时文件（安全铁律）
| 项 | 状态 |
|---|---|
| `git remote get-url origin` | `https://github.com/CodingHeader/HDwebsite.git`（**无凭据**） |
| `~/.git-askpass.sh` | 已删除 |
| `~/.git-pat` | 不存在 |
| `~/.git-credentials` | 不存在 |

### 3.6 清理本地多余分支
```
$ git branch -D lane/a-manager-ui lane/b-api-platform lane/c-ai-kb lane/d-ops \
    lane/e-manager-pages w0/ccr-1 w0/test-infra
  → 7 条本地分支删除
$ git branch → main, upgrade（仅 2 条）
```

## 4. 断点续跑验证（完整性复核）

异常中断后从断点完整继续，逐项复核成果未丢：

### 4.1 远端分支
```
$ https_proxy=... git ls-remote --heads origin
  94dbbbb  refs/heads/main
  bb4b32f  refs/heads/upgrade
```
**远端仅剩 main + upgrade**，且 `local upgrade == origin upgrade == bb4b32f`（双端一致）。

### 4.2 成果 commit 全部入 upgrade（merge-base --is-ancestor 逐一验证）
- A 线：`4ce9e16 adb64a9 38cd257 1df18b5 cbbcceb 632dc51 4170d7b ff0890e c6a2cb4 4811fad aea0c7b 9d5dc7a 788bb99 52c729f` 全部 **OK**
- C 线：`736bc56 c221eb4 242cea0 43a555e c4b1861 3b5519a f9d0b21 436c237` 全部 **OK**
- E 线：`52c729f b134633 247196b c80b53a 5d5c4cb 475ba42 b033b8a 911ad17 c04cdf6 1553e49` 全部 **OK**

### 4.3 关键文件存在性
| 文件 | 状态 |
|---|---|
| src/lib/kb/manage.ts（C-12） | OK |
| src/lib/llm/guard.ts（C-10） | OK |
| src/lib/llm/limits.ts（C-09） | OK |
| src/lib/chat-service.ts（C-07） | OK |
| src/app/api/knowledge-bases/[id]/export/route.ts | OK |
| src/app/manager/knowledge-bases/page.tsx（E-04） | OK |
| src/app/manager/llm-providers/page.tsx（E-06） | OK |
| src/app/manager/home-blocks/page.tsx（E-03） | OK |
| src/app/manager/element-configs/page.tsx（E-03） | OK |
| src/app/manager/page-templates/page.tsx（E-03） | OK |
| src/components/manager/DataTable.tsx（A-02） | OK（位于 `src/components/manager/`） |
| src/components/manager/CrudPage.tsx（A-04） | OK |
| src/components/manager/FormDialog.tsx | OK |

**A 线基础件布局说明**（非缺陷，避免误判）：
- `DateTimeInput`/`RadioGroup` → `src/components/manager/ui/input.tsx`
- `Skeleton`/`Badge`/`Kbd`/`Tabs` → `src/components/manager/ui/misc.tsx`
- 全部经 `src/components/manager/ui/index.ts` 统一导出

### 4.4 最终门禁（断点续跑复核）
```
$ npm run lint      → 0 errors（36 warnings 既有）   exit 0
$ npm run typecheck → exit 0
$ npm test          → 43 files / 599 tests passed     exit 0
```

## 5. 结论

- **远端分支收敛**：从 10 条 → **2 条**（`main` + `upgrade`），8 条多余分支（5 lane + 3 w0）已删除。
- **本地分支收敛**：从 9 条 → **2 条**（`main` + `upgrade`）。
- **成果零丢失**：Wave 1 全部 33+ 张卡（A 8 + B 1 + C 12 + D 2 + E 12）的 commit 与文件均完整在 `upgrade`。
- **双端一致**：local upgrade == origin upgrade == `bb4b32f`。
- **门禁全绿**：lint/typecheck/test/build 全部 exit 0。
- **凭据安全**：remote URL 无凭据，askpass/临时 PAT 文件均已清理。

## 6. UNKNOWN / 后续

- **test:e2e / test:visual**：Windows 环境无法运行（D16 裁决），与 W0-08 同口径，待 Linux/Docker 环境在 Wave 2 集成终审补齐。
- **Coze 真实端点 / 微信公众号 / SMTP**：凭据缺失，真实联调标 UNKNOWN（与 ADR-025/用户裁决同口径）。
- **后续**：`upgrade` 现为唯一开发主线，后续任务直接在 `upgrade` 上开展，不再新建 lane 分支。
---

## 7. 断点续跑（追加）：先拉再推 + tag 清理 + main 对齐（2026-10-19 续）

用户指令："仓库代码已更新，使用 10808 端口，先拉再推，使用标准流程完成双端一致；一并删除 w1-base / w1-base-ccr-1 / w1-ui-kit 三个残留 tag"。

### 7.1 先拉（10808 代理）
```
$ https_proxy=http://127.0.0.1:10808 git fetch origin --tags --prune
  → 4cbd9c1..4b9b788  upgrade -> origin/upgrade    exit 0
```
远端 `upgrade` 已更新至 `4b9b788 docs(V0.7): 统一规划 V0.7`（纯文档，38 张卡）。本地工作区干净，`git rev-list --left-right --count` = `1 0`（本地仅落后 1）。

### 7.2 upgrade fast-forward 同步
```
$ git merge --ff-only origin/upgrade   → exit 0
  local  upgrade: 4b9b788   origin upgrade: 4b9b788   diff=0/0
```

### 7.3 main 真分叉处置（关键判断）
- 本地 `main` 领先远端 5 commits（含 `5b72fb7 docs: 收录任务分配与完整规划指令（用户提供，623 行）`）。
- 首次 `push main` 报 `non-fast-forward`。
- `merge-tree --write-tree main origin/main` → **`fatal: refusing to merge unrelated histories`**。远端 `main` 根 commit 是 `c6ff40b chore: initial project sync - HDwebsite`，与本仓库 `0a09a2f` 无共同祖先——远端 `main` 是用户手动 sync 上来的老站代码快照。
- **保全**：先 `git tag tmp-local-main-backup main`（SHA `5b72fb7`）留退路。
- **内容已双重保全验证**：`git rev-parse upgrade:docs/design/规划总指令-任务分配与完整规划.md` = `271b109b`，与 `main:5b72fb7` 同一文件的 sha **完全相同**；`git merge-base --is-ancestor main upgrade` = YES，`git rev-list --count upgrade..main` = **0**（`upgrade` 已含本地 `main` 全部历史）。
- **执行**：`git branch -f main origin/main`（本地 main 对齐远端 94dbbbb 老站代码，符合"main 存老代码"意图）。

### 7.4 删 3 个 tag（10808 代理 + 内嵌 PAT）
```
$ git push origin --delete tag w1-base tag w1-base-ccr-1 tag w1-ui-kit
  → 3 个 tag 全部 [deleted]    exit 0
$ git tag -d w1-base w1-base-ccr-1 w1-ui-kit tmp-local-main-backup
  → 全部删除   本地 tag 列表为空
```
（`tmp-local-main-backup` 为临时保全，内容已确认落于 upgrade，一并删除。）

### 7.5 凭据清理（安全铁律）
```
remote URL: https://github.com/CodingHeader/HDwebsite.git（无凭据）✅
~/.git-askpass.sh 无  ✅   ~/.git-pat 无  ✅   ~/.git-credentials 无  ✅
```

### 7.6 最终双端一致性（10808 代理 `ls-remote` 实测）
```
$ git ls-remote --heads --tags origin
  94dbbbb  refs/heads/main
  4b9b788  refs/heads/upgrade
  （无 tag）
```
| 分支 | local | origin | diff |
|---|---|---|---|
| main | 94dbbbb | 94dbbbb | 0/0 |
| upgrade | 4b9b788 | 4b9b788 | 0/0 |

本地分支：`main` + `upgrade`（2 条）；本地 tag：空；工作区：干净。

### 7.7 结论
- 远端分支：`main` + `upgrade`（2 条），tag 全部清空。
- 双端完全一致：两分支 `diff=0/0`。
- 本地 main 那份规划文档内容 sha `271b109b` 已确认完整保全于 `upgrade`，无丢失。
