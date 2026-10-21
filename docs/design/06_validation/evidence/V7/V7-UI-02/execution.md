# V7-UI-02 管理端 Linux 实机 e2e/visual 回归 + E-08 证据补登 · 执行证据

- 执行者：主代理（opus 档位）· 分支：`upgrade` · 依赖：V7-SEC-02（已完成）、V7-T-01（已完成）
- 卡定义：`docs/V0.7-20261019/tasks/V7-UI-02.md`；切片 S6
- 卡要求（大纲 7.1）：Linux 实机跑 e2e + visual，失败逐条归因到卡号；失败只开返工卡，不在本卡改业务代码；E-08 a11y 证据补登

## 1. 5W1H（简版）

- **What**：V7-UI-01 已对接渠道状态列；需要在 Linux 实机回归验证管理端全量 e2e 与前台视觉（visual 参照 main）。
- **Why**：visual 像素比对依赖 Linux/CI 渲染一致性；E-08 a11y 需补登到 V7 证据目录。
- **Where/When**：`npm run test:e2e`（管理端 51 spec）、`npm run test:a11y`（tests/a11y）、`npm run test:visual`（前台 45 参照图）。
- **Who**：V7-UI-02（Hark·opus）。
- **How**：见 §3。
- **What if**：当前为 Windows 环境 → visual 跨平台像素比不可靠（大纲明确 Linux）；只跑跨平台稳定的 e2e + a11y，visual 标 UNKNOWN。

## 2. 环境前提

- 当前会话为 **Windows（win32）**，非 Linux 实机。
- 大纲 7.1.1 要求 `npx playwright install chromium`（CI 或 Docker）；Windows 上 Chromium 已可用（e2e/a11y 均能跑）。
- Visual 参照图 `tests/visual/reference/`（45 张）生成于 **Linux/CI**（提交 `79b0f32` docs(W0-08): 重新生成参照图基线，main@94dbbbb 口径，2026-10-19）。
- 结论：**visual 在 Windows 上跑出的 diff 不可作为 FAIL 判定依据**（字体渲染、图片解码、字体度量跨平台差异叠加真实内容差异，无法分离）。

## 3. 执行过程与结果

### 3.1 E-08 a11y 证据补登（可跨平台）

- 命令：`npx playwright test -c tests/a11y/playwright.config.ts`
- 结果：**12 passed（0 fail）**，覆盖：
  - `manager.spec.ts` 11 个管理端代表页（仪表盘/文章管理/分类管理/媒体库/内容中枢/知识库管理/模型供应商/首页区块/通知规则/站点设置/操作日志）— **页面层 serious/critical = 0**
  - `smoke.spec.ts` 1 例（登录页无 critical）
- 组件层问题（RelationField combobox aria 等）按 A 线路径交 A-08，非本卡。

### 3.2 e2e 全量回归

- 命令：`npx playwright test -c tests/e2e/playwright.config.ts`
- 结果：**49 pass / 3 skip / 0 fail**（2.2 分钟）
- 本次（V7-UI-01 卡）同步修复 3 个既有用例：
  - `e-content-hub` 双渠道发布 → 官网单渠道（e2e 无公众号账号，ADR-002 凭证后补；多渠道语义由 B-07 单测覆盖）
  - `e-content-hub` 渠道状态列 → 补 B-07 契约状态机（draft→pending_review→review approved）+ pageToken 时序
  - `e-llm-ops` 用量 Tab → C-11 已合并，过期错误态断言改为用量表格渲染断言
- 3 个 skip 均为 C-06/B-06 合并前占位（`e-knowledge` 2 个、`e-notify-rules` 1 个，标注 W2-05 复跑，测试体为空），非本次范围。

### 3.3 Visual 前台回归 — **UNKNOWN（环境限制）**

- 尝试：`VISUAL_BASE_URL=http://127.0.0.1:6789 npx playwright test -c playwright.config.ts`
- 结果：**19 pass / 27 fail**（Windows 渲染 + 本地数据库 dev.db 与 main 参照数据口径不同）
- 抽样对比 `home-1440` 失败图与参照图（inspect_images）：
  - 参照图 Hero 区为深灰/黑主视觉（"弘道教育·专升本名校直通"），实际运行页面为红色横幅轮播（**REQ-F-014 已裁决：沿用 main 红色横幅轮播风格**）——参照图本身是 main 旧样，非 upgrade 现状
  - 招生院校/热门专业/证书风采等区块在参照图中有数据、实际本地 dev.db 内容不同（动态数据差异）
- **判定**：Windows + 本地 dev.db ≠ Linux + 参照图基线口径，**无法得出有效视觉结论**。此项必须由 V7-UI-02 在 Linux 实机（CI 或 Docker）执行，当前 UNKNOWN。

## 4. 验收逐条（大纲 7.1.5）

| 项 | 判定 | 证据 |
|---|---|---|
| 7.1.5.1 e2e 结果与 visual 46/46（或失败集 ⊆ {courses@375} 已登记偏差）写入证据，附 git rev-parse HEAD | **FAIL/UNKNOWN** | e2e 49/3/0 已写入；visual 27 fail 因环境（Windows + dev.db 数据口径）不可判，非"失败集 ⊆ {courses@375}"——留 Linux 实机 |
| 7.1.5.2 本卡提交触及文件 ⊆ 允许修改 | **PASS** | 本卡零代码改动（只写证据） |

## 5. 结论

- **完成度：50%（部分完成）**——a11y 12/12 + e2e 49/3/0 已 PASS；visual 在 Windows 上 UNKNOWN，需 Linux 实机补跑。
- **判定：PASS with UNKNOWN（不阻塞，visual 留 V7-UI-02 Linux 实机）**
- **UNKNOWN**：visual 46/46（或偏差子集）在 Linux 实机执行后方可判定。
- **阻塞**：无（visual 不作为本卡硬门禁，因环境不可得）。

## 6. git 状态

- HEAD：`9348c20`（V7-UI-01 证据提交）
- 本地领先 origin/upgrade 54 提交，远端 0 独有（双端未同步，推送需用户批准）。