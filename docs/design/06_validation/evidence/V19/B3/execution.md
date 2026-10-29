---
task: V19-B3
date: 2026-10-29
head: 87dd2c7
status: done
---
# B3 375px 验收 · execution.md

## 5W1H

- **What**：B3 375px 验收，43 页 × M1~M4 = 172 格（视口 375×812）。
- **Why**：管理端移动可用性门禁（V1.9 B 验收闭环第 3 卡；依赖 B2 done）。
- **Where**：`E:/Code/Demo/HDwebsite/hdwebsite_1011` · 分支 `upgrade` · HEAD `87dd2c7`。
- **When**：2026-10-29。
- **Who**：执行助手（product-development Skill）。
- **How**：Playwright chromium + `adminState`（storageState 注入，登录接口 0 次）+ `viewport:{width:375,height:812}`；生产构建 `node scripts/start-next.mjs` 于 `127.0.0.1:6791`。

## 环境

- node v24.12.0 · playwright 1.59.1。
- 生产服务守护运行（PID 6584，`DATABASE_URL=file:.../prisma/e2e.db`，`ENCRYPTION_KEY`/`APP_ORIGIN` 已设）。
- `mobile-375.spec.ts` 路由数组已从 3 扩至 **43**（仅数组，断言行未动）。

## 执行步骤

- **STEP-B3-1（扩展 spec）**：`tests/e2e/mobile-375.spec.ts`「整页无横向溢出」路由数组 3→43。`toBeLessThanOrEqual(375)` 行未改（git diff 0 命中）。
- **STEP-B3-2（M1 数值）**：跑 `mobile-375` 4 测试全 PASS；另写探针逐页记录 `scrollWidth`（43 页全部 =375）。
- **STEP-B3-3（M2/M3/M4 逐页）**：探针 `b3mm`/`b3m2`/`b3m3`/`b3m2f` 逐页测核心操作可达、命中区、卡片模式。

## M1 细节（41 PASS / 2 N-A）

- 43 页 `documentElement.scrollWidth` 全 = **375**（`b3-m1.json`），无横向溢出；`mobile-375.spec.ts` 43 路由断言全过。
- N-A：`ai-config`/`news`（纯 redirect，同 B2 口径）。

## M2 细节（36 PASS / 7 N-A）

- 29 页 `新建` Enter 触发 FormDialog；`home-blocks`（恢复默认）、`dashboard`（写文章导航）、`content-hub`（新建内容）、`knowledge-bases`（新建知识库）、`llm-providers`（新建供应商）、`publish-jobs`（新建任务）、`wechat-accounts`（新建账号）。
- `collect-items`（审阅）、`notify-rules`（编辑）375 下 `click()` 弹窗 0→1（可达且生效）。
- `media`（上传文件→文件选择器）、`settings`（保存）、`login`（登录）——B2 K2 已验证生效，375 下控件可见可达。
- 搜索框在列表页均可见（343×36）。
- N-A：只读 5 页（`collect-tasks`/`logs`/`notify-records`/`user-actions`/`chat-history`）+ `ai-config`/`news`。

## M3 细节（1 PASS / 40 FAIL / 2 N-A）

- **40 FAIL**：核心控件命中区 32–40px <44×44（详见 defects.md I-B3-01）。
- **1 PASS**：`/manager`（仪表盘）`写文章` 快捷入口卡 343×73 ≥44×44。
- N-A：`ai-config`/`news`。

## M4 细节（38 PASS / 5 N-A）

- 37 表格页 `hScroll=0`（无表格横向滚动，多数渲染移动端卡片 `ul[aria-label]`）；`media` 网格卡片无横滚。
- N-A：`dashboard`/`login`/`settings`（表单/仪表盘无数据列表）+ `ai-config`/`news`。

## 验收逐条

| 验收 | 结果 |
|---|---|
| `mobile-375.spec.ts` 覆盖 43 路由 | PASS（数组 43，4 测试全过） |
| `toBeLessThanOrEqual(375)` 未改 | PASS（git diff 该行 0 命中） |
| `matrix.md` 43 行 × M1~M4，无空、无待核 | PASS（grep 43；待核 0） |
| M1 每格为具体数值 | PASS（41 格 scrollWidth=375 数字） |
| 计数自洽 PASS+FAIL+N-A=172 | PASS（116+40+16=172） |
| `src/**` 未改 | PASS（仅改 `tests/e2e/mobile-375.spec.ts` 路由数组） |

## 命令输出摘要

- `npx playwright test --config .cache/v19/b3m1c.config.ts`：M1 43 页全 sw=375（1 passed）。
- `npx playwright test --config .cache/v19/b3mm.config.ts`：M2/M3/M4 布局（1 passed）。
- `npx playwright test --config .cache/v19/b3m2c.config.ts`：M2 精确（1 passed）。
- `npx playwright test --config .cache/v19/b3m3c.config.ts`：M3 精确（1 passed）。
- `npx playwright test --config .cache/v19/b3m2fc.config.ts`：M2 click 复核（collect-items/notify-rules 弹窗 0→1）。
- `mobile-375.spec.ts`：4 测试全 PASS（43 路由无溢出）。
- 计数：`cells.json` → `{"PASS":116,"FAIL":40,"N-A":16}`，`PASS+FAIL+N-A=172`。

## 改动文件

- `tests/e2e/mobile-375.spec.ts`（路由数组 3→43，断言行未动）。
- `docs/design/06_validation/evidence/V19/B3/{matrix.md,cells.json,defects.md,execution.md}`（本卡输出）。
- `.cache/v19/{b3m1,b3mm,b3m2,b3m3,b3m2f}.spec.ts`（临时探针，gitignore，不提交）。

## UNKNOWN

- **无 UNKNOWN**。M1/M2/M3/M4 全部可实测（生产服务 + e2e.db 就绪）。

## 收尾

- 发现 **I-B3-01**（触达区 <44px，40 页）→ 已登记 defects.md，建议 FIX 卡 / V2.0 backlog。
- B3 状态 → `done`（40 FAIL 属验收发现，不阻塞本卡完成；缺陷由后续 FIX 卡处理）。
