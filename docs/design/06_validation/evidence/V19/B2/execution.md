---
task: V19-B2
date: 2026-10-29
head: 7e01458
status: done
---
# B2 键盘验收 · execution.md

## 5W1H

- **What**：B2 键盘验收，43 页 × K1~K4 = 172 格，每格判 PASS / FAIL / N-A。
- **Why**：管理端键盘可达性门禁（V1.9 B 验收闭环第 2 卡；依赖 FIX-01/02/03 全部 done）。
- **Where**：`E:/Code/Demo/HDwebsite/hdwebsite_1011` · 分支 `upgrade` · HEAD `7e01458`。
- **When**：2026-10-29。
- **Who**：执行助手（product-development Skill）。
- **How**：Playwright chromium + `adminState`（`.cache/e2e/state-admin.json` storageState 注入，登录接口 0 次，防 `LOGIN_RATE_LIMIT=10/60s`）；生产构建经 `node scripts/start-next.mjs` 于 `127.0.0.1:6791`（dev Turbopack HMR 无限重载，改用生产）；探针 `.cache/v19/b2k*.spec.ts`。

## 环境

- node v24.12.0 · git 2.52.0 · playwright 1.59.1。
- 生产服务守护运行：PID 6584，`PORT=6791`，`DATABASE_URL=file:///E:/.../prisma/e2e.db`，`ENCRYPTION_KEY`/`APP_ORIGIN` 已设。
- 登录：storageState 注入，0 次登录接口；唯一例外为 `login` K2 实测（真实登录验证，1 次，未超限流）。

## 执行步骤

- **STEP-B2-1（K3 静态+运行时）**：打开 `articles`「新建文章」`FormDialog` → 按 Esc → 关闭无副作用（1.1s）。另补 `home-blocks`「恢复默认」`ConfirmDialog`（`role=alertdialog`）→ 按 Esc → 0→1→0 关闭。共享 `dialog-primitive`（base-ui）一次定性覆盖。
- **STEP-B2-2（K4 全局）**：`src/app/globals.css:365` `[data-theme="manager"] :where(a,button,input,select,textarea,[tabindex]):focus-visible { outline:2px solid; outline-offset:2px }`。40 页探针实测 `outline: 2px/solid` 全 PASS；另补 `dashboard`/`login` 同 2px/solid。
- **STEP-B2-3（K1/K2 逐页）**：40 页 K1 Tab 序列单调；K2 主操作 Enter 36 页 PASS（详见下）。
- **STEP-B2-Z（体检）**：43 行无空、无「待核」；PASS+FAIL+N-A=172；`git status --short src tests prisma` 为空。

## K1 细节

- **40 PASS**：首元素起 12 次 Tab，序列与文档序一致（校验 `tabSeq[i]===ids[i+1]` 对全部 39 页 k1k2k4 探针 + `dashboard` 全匹配），无跳跃/回跳。序列=侧栏（跳到主内容→首页→仪表盘→文章管理→课程管理→报名管理→媒体库→内容管理→…）→内容区。
- **3 N-A**：`ai-config`/`news`（纯 redirect 无 UI）、`login`（单表单页，卡判据）。

## K2 细节

- **36 PASS**：
  - 29 页「新建/新建文章/新建内容/新建知识库/新建供应商/新建任务/新建账号」Enter → `FormDialog` 打开（弹窗计数 0→1）：`articles` `banners` `campus` `categories` `chat-scenes` `collect-sources` `content-hub` `courses` `element-configs` `enrollment-offerings` `gallery` `home-cards` `hot-majors` `knowledge` `knowledge-bases` `llm-providers` `majors` `navigations` `notify-recipients` `notify-templates` `page-templates` `partners` `publish-jobs` `roles` `service-guides` `students` `tags` `users` `wechat-accounts`。
  - `home-blocks`「恢复默认」→ `confirm-dialog` 打开。
  - `notify-rules`「编辑」（行操作）→ `FormDialog` 打开。
  - `collect-items`「审阅」（行操作）→ `FormDialog` 打开（0→1）。
  - `media`「上传文件」→ Enter 触发 **filechooser** 事件（原生文件选择器，预期）。
  - `settings`「保存」→ 修改字段后按钮启用（`已是最新`→`保存修改（1）`），Enter → `toast-success`（含还原保存，双 toast）。
  - `dashboard`「写文章」（快捷入口 Link）→ Enter 导航 `/manager/articles`。
  - `login`「登录」→ 填 `admin/admin123` 按 Enter → 导航 `/manager`（真实提交验证）。
- **7 N-A**：`collect-tasks`/`logs`/`notify-records`/`user-actions`/`chat-history`（只读无主操作，见 defects.md 依据）+ `ai-config`/`news`（纯 redirect）。

## K3 细节

- **35 PASS**：共享 `Dialog` 组件（`dialog-primitive` = base-ui `Dialog`，保留焦点陷阱/Esc 关闭/遮罩关闭）一次定性 + `ConfirmDialog` 补验。
- **8 N-A**：只读 CrudPage 4 页（`collect-tasks`/`logs`/`notify-records`/`user-actions`）无弹窗 + `dashboard`/`login` 无 Dialog + `ai-config`/`news` 纯 redirect。

## K4 细节

- **41 PASS**：全局 `:focus-visible` outline 2px/solid，逐页实测一致。
- **2 N-A**：`ai-config`/`news` 纯 redirect。

## 验收逐条

| 验收 | 结果 |
|---|---|
| `matrix.md` 43 行 × K1~K4，无空、无「待核」 | PASS（`grep -c '^| src/app/manager'`=43；`grep 待核`=0） |
| 每格判据 ≥10 字符 | PASS（`cells.json` 172 格全 ≥10） |
| K3 有运行时验证记录 | PASS（articles FormDialog + home-blocks ConfirmDialog） |
| 计数自洽 PASS+FAIL+N-A=172 | PASS（152+0+20=172） |
| 未改 `src/**` | PASS（`git status --short src tests prisma` 为空） |

## 命令输出摘要

- 探针全 1 passed：`b2k.spec.ts`（39 页 K1/K2/K4）· `b2k2c.spec.ts`（K2 行操作盘点）· `b2k2e.spec.ts`（K2 精确）· `b2k2f.spec.ts`（dashboard+login K1/K2/K3/K4）· `b2login.spec.ts`（login 真实登录）· `b2k3.spec.ts`/`b2k3b.spec.ts`（K3 运行时）· `b2k2g.spec.ts`（settings Enter 保存）。
- `find src/app/manager -name page.tsx | wc -l` = **43**。
- 计数：`cells.json` → `{"PASS":152,"N-A":20}`，`PASS+FAIL+N-A=172`。

## UNKNOWN

- **无 UNKNOWN**。B2 判据全部可实测；Prisma 7 win32 建库限制不影响本卡（服务为外部守护生产进程，`e2e.db` 已存在）。

## 改动文件

- `docs/design/06_validation/evidence/V19/B2/{matrix.md,cells.json,defects.md,execution.md}`（本卡输出）。
- `.cache/v19/{b2k2e,b2k2f,b2login,b2k3b,b2k2g}.spec.ts`（临时探针，`.gitignore` 内，不提交）。

## 收尾

- B2 **FAIL=0**，无缺陷入 backlog；B2 状态 → `done`。
