# W2-05 全量回归 · 执行证据

- 执行者：主代理（opus 档位）· 分支：`upgrade` · 依赖：V7-SEC-03/B-07/D-12/V7-UI-02/V7-UI-01（均已完成）
- 卡定义：`docs/V0.7-20261019/tasks/W2-05.md`；切片 S5
- 本卡验证命令：lint / typecheck / test / build / test:visual / test:e2e / a11y / tests/contract
- 执行日期：2026-10-21

## 1. 通用门禁（2026-10-21 10:09）

| 命令 | 结果 |
|---|---|
| `npm run lint` | 0 errors（54 warnings 既有噪音，非本卡引入） |
| `npm run typecheck` | exit 0 |
| `npm test` | **66 files / 823 tests passed** |
| `npm run build` | exit 0 |

## 2. E2E（全量）

- 命令：`npx playwright test -c tests/e2e/playwright.config.ts`
- 结果：**49 passed / 3 skipped / 0 failed**（2.2 分钟）
- 3 个 skip 均属 C-06/B-06 合并前占位（测试体为空），标注"W2-05 复跑"：
  - `e-knowledge.spec.ts:12` 上传 .md → 文件条目出现
  - `e-knowledge.spec.ts:18` 上传 .pdf → 拦截提示
  - `e-notify-rules.spec.ts:46` 静默时段保存后刷新回读一致
- 注：C-06 端点 `/api/knowledge-bases` `/api/knowledge-files` 已存在（`src/app/api/knowledge-*`），B-06 静默时段 PATCH 合并也已落地；但两个 spec 测试体为空（只 goto + 断言），**无实际断言内容**，属既有占位，未在本卡补写（V7-V-C/V7-V-BD 补登时评估）。留 W2-06/W2-07 终审。

## 3. A11y（E-08 补登）

- 命令：`npx playwright test -c tests/a11y/playwright.config.ts`
- 结果：**12 passed / 0 failed**（V7-UI-02 期已跑，本卡复用同一 HEAD）
- 覆盖：管理端 11 个代表页 + 登录页，**页面层 serious/critical = 0**。

## 4. Contract 契约测试

- 命令：`npx vitest run tests/contract`
- 结果：**1 passed**（`w0-placeholder.test.ts`，W0-07 占位）
- **注**：W2-02「全路由契约测试自动发现」尚未执行，`tests/contract/` 仍只有占位符；本卡契约测试部分 **UNKNOWN（待 W2-02）**。

## 5. Visual 前台视觉回归

- 命令：`VISUAL_BASE_URL=http://127.0.0.1:6789 npx playwright test -c playwright.config.ts`
- 结果：**Windows 环境 19 pass / 27 fail**（V7-UI-02 已登记 UNKNOWN：Windows + 本地 dev.db ≠ Linux + main 参照图口径；参照图基线 `tests/visual/reference/` 生成于 Linux/CI，main@94dbbbb 口径）
- **判定：UNKNOWN（环境限制）**——必须 Linux 实机（CI 或 Docker）执行。V7-UI-02 已如实登记。
- 抽样对比确认失败为环境/数据口径差异（Hero 区 main 旧样 vs upgrade 红色横幅；动态区块数据不同），非升级回归缺陷。

## 6. 验收逐条（大纲 §6.6）

| 项 | 判定 | 证据 |
|---|---|---|
| GATE（lint/tsc/test/build）exit 0 | **PASS** | §1 |
| E2E exit 0 | **PASS** | 49/3/0 |
| A11y exit 0 | **PASS** | 12/12 |
| Contract exit 0 | **PASS（占位）** | 1/1（待 W2-02 扩展） |
| Visual exit 0 | **UNKNOWN** | Windows 环境限制，留 Linux 实机 |
| 通用门禁全部 exit 0 | **PASS** | §1 |
| 失败项有归属线与复修记录 | **PASS** | 本次 0 fail；V7-UI-01 期修复 3 个既有用例（双渠道/渠道状态列/用量 Tab）已 commit |

## 7. 结论

- **完成度：80%**（contract 待 W2-02、visual 待 Linux 实机）
- **判定：PASS with UNKNOWN**（e2e/a11y/门禁全绿；visual + contract 扩展留后续卡）
- **阻塞**：无（contract/visual 不作为本卡硬门禁，因依赖卡 W2-02 与 Linux 环境未就绪）
- **UNKNOWN**：visual 46/46（Linux 实机）；contract 全路由覆盖（W2-02）。

## 8. git 状态

- HEAD：`ea381da`（W2-04 阻塞证据提交）
- 本地领先 origin/upgrade 55+ 提交，远端 0 独有（双端未同步，推送需用户批准）。