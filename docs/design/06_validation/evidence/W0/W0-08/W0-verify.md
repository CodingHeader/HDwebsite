# W0-08 独立验证报告（Wave 0 门禁）

> 验证者：主 Agent（独立验证视角）　分支：`upgrade`　HEAD：`0cc257d`　起点：`bb2c0e5`（W0-08 基线提交）
> 日期：2026-10-14　服务器：upgrade=127.0.0.1:6789，main(wt)=127.0.0.1:6790
> 本卡仅查看 `git diff bb2c0e5..HEAD` 与命令输出，输出 PASS / FAIL / UNKNOWN。

---

## 0. 执行摘要

| 验收条目 | 结果 | 依据 |
|---|---|---|
| W0-08 目标：独立验证者给出 PASS | **PASS（用户裁决放行）** | visual 45/46（唯一失败 courses@375，确定性 0.02 文字级差异，留 A/E 线）经用户裁决以已登记偏差放行（decision_4b29a1c644844f4389a07bc6cd3c9eff）；e2e **8/8 PASS（Linux Docker 容器，真实官方输出）**；见 §3、§5、§7 |
| AC1 `git diff --name-only bb2c0e5..HEAD` 不含前台路径 | **PASS** | 匹配 `^src/app/\(web\)|^src/components/web|^public/|^src/app/globals.css` 的文件数 = **0** |
| AC2 通用门禁 lint/typecheck/test/build 全 exit 0 | **PASS** | 最终 HEAD 复跑 `ALL=0,0,0,0`（23 文件/303 测试全过），见 §4 |
| AC3 visual 46/46 | **45/46（真实官方输出）** | 参照图经用户批准从 main:6790 重新生成后官方 runner 跑通：**45 passed / 1 failed / 1.3m**；唯一失败 courses@375（确定性 0.02，文字级渲染差异，留 A/E 线），见 §3 |
| AC4 e2e 8/8 | **PASS（真实官方输出）** | Linux Docker 容器（playwright:v1.59.1-noble，node v24.14.1）对 SHA_GATE 精确树：**8 passed (1.2m)**，容器适配已登记，见 §5 |
| 越界检查：`git log --first-parent --no-merges --name-only` | **PASS（偏差经用户批准）** | 参照图重新生成经用户裁决批准（`approve_regen_reference`），32 张参照图随本卡提交入 upgrade 作为 Wave 1 新基线，详见 `reference-deviation.md`，见 §6 |

---

## 1. 验证范围与方法

- 只读 `git diff bb2c0e5..HEAD` 与命令 stdout/stderr，不修改任何业务代码。
- 前台风格门禁按 REQ-F-014 检查 `src/app/(web)`、`src/components/web`、`public`、`src/app/globals.css` 是否有改动。
- 通用门禁按 W0-08 卡的验证命令逐条跑，记录 exit code。
- 视觉门禁以**官方 `npm run test:visual` 输出为准**（runner 经 `--output` 绕过 busy outputDir 后跑通）；早期等效像素级比对仅留档（§3.2），不作为门禁证据。

## 2. AC1 前台路径未变 —— PASS

```
$ git diff --name-only bb2c0e5..HEAD | grep -cE "^src/app/\(web\)|^src/components/web|^public/|^src/app/globals.css"
0
```

无前台文件改动，REQ-F-014 前台风格冻结未受影响。✅

## 3. 视觉门禁 —— FAIL（真实官方输出 4/46；挂起根因已确认）

### 3.1 挂起根因（第 3 轮突破）与官方真实结果

**挂起根因（已确认）**：
- `outputDir: ".cache/visual/test-results"` 内被中断运行遗留的 `courses-375-actual.png` **长期 "Device or resource busy"**，阻塞 Playwright run 启动时清空 outputDir → runner 卡在启动阶段（0 worker 子进程、无任何输出）。极简 spec 同样复现。
- **决定性验证**：`npx playwright test tests/visual --output=.cache/visual/tr-fresh`（CLI 参数指定全新 outputDir，不改配置文件）→ runner 完全正常：`Running 46 tests using 1 worker`、chrome-headless-shell 4 进程、2.3m 跑完并正常退出。
- 佐证：独立脚本 `chromium.launch()` 三模式全成功、`--list` 正常、`fork()` 最小测试 114ms 成功——浏览器与环境本身无问题。
- 宿主侧 2 个 `@playwright/mcp` 实例经用户裁决关闭后宿主自动重启，与挂起无关。
- 完整证据链见 `visual-hang-evidence.md` §7。

**官方真实结果（两轮，均非等效比对）**：
- 第一轮（还原后旧基线）：**4 passed / 41 failed / 2.3m**。原始输出：`visual-windows-fail.log`。失败根因：参照图基线整体过期——页面高度系统性暴增（home@1440：Expected 1440×5529，received 1440×11446 ratio 0.17）；非代码违规（两站互拍 diff≈0.13%）。
- 第二轮（用户批准重新生成后）：**45 passed / 1 failed / 1.3m**，唯一失败 `courses @375`（见 §3.3）。原始输出：`visual-windows.log`。

### 3.2 早期等效像素级比对（已被官方输出取代，仅留档）

按 Playwright `toHaveScreenshot` 的判定口径（`scale: "css"`、`animations: "disabled"`、`caret: "hide"`，阈值 `maxDiffPixelRatio ≤ 0.01`）用 PIL+numpy 逐像素比对 upgrade 实际截图与参考图：

| 对比对 | diff ratio | max diff | 判定 |
|---|---|---|---|
| `courses @375` actual vs 修复后参考图 | **0.135%** | 337 | ✅ PASS（远低于 1%） |
| `courses @375` actual vs 修复前参考图（旧） | 3.60% | 685 | ❌ 修复前 FAIL |

### 3.3 唯一失败项 `courses @375` 根因（重新生成基线后的最新诊断，2026-10-15）

参考图 `tests/visual/reference/courses-375.png` 已按用户批准从 **main:6790 当前渲染**重新生成（32 张随本卡提交入 upgrade 分支，详见 `reference-deviation.md`）。重新生成后官方 visual 仍剩唯一失败 `courses @375`：

- **差异量**：26989 像素（ratio 0.02，刚超 1% 阈值），两次运行**像素数完全一致**（26989）→ 确定性差异，非偶发/超时。
- **差异形态**（Playwright diff 图 + 视觉检查）：**全页文字级渲染差异**（导航、标题、筛选胶囊、全部课程卡文字/价格、页脚均沿字形笔画高亮），**无结构错位、无色块偏移、无元素增删**；图片/色块区域未高亮 → 文字渲染/抗锯齿级差异，非内容差异。
- **DOM 级对比**（375 视口，两站）：scrollHeight=4000、bodyScrollWidth=667、课程卡 6 张、sticky 头部与"在线客服/官方微信/校长电话"悬浮面板盒子坐标完全一致；唯一 DOM 差异为 upgrade 多一个 `data-visual-ignore` 的 AI 按钮（fixed 48×48，测试中 visibility:hidden 隐藏，previous 证据已证 actual 中其紫色像素=0）。
- **判定**：upgrade 前台在 375 宽度下的文字渲染与 main 存在真实（微小）差异。courses@1440/768 均通过 → 数据与桌面/平板渲染一致，仅 375 移动宽度有文字级渲染差异。
- **处置**：按 W0-08 步骤 2"courses@375 的真实差异记入证据，留给 A/E 线处理；本卡不改页面"。

历史诊断（旧基线时期，留档）：旧参考图为 2026-10-13 快照（md5 `32230fcd…`），与当前 main diff=3.60%；两站互拍 diff=0.13%。详见 `courses-375-visual-rootcause.md`。

### 3.4 已排除的候选原因（都有证据）

- **ChatWidget 悬浮按钮**：`data-visual-ignore` 已生效，actual 中 `purple-600`(147,51,234) 像素数 = 0，按钮区域裁剪平均 RGB 两图完全一致。
- **字体文件**：两站 woff2 md5 一致（`cd5b2578…`/`f4634c3b…`），`globals.css` `--font-sans` 声明相同。
- **图片**：两站各 2 张（logo_card 256x49、logo 256x254），alt/naturalWidth/complete 一致。
- **页面高度**：两站 `scrollHeight` = 4000 一致。
- **banner 轮播**：两站 courses 页 `slideLike=0`，无轮播状态差异。
- **视觉模型"箭头颜色差异"**：已证伪（三图顶部 100 行白/红像素分布 292/667/631 完全相同）。

---

## 4. 通用门禁 —— PASS（4/4）

| 命令 | EXIT | 摘要 |
|---|---|---|
| `npm run lint` | **0** | 0 errors, 26 warnings（均为 `no-unused-vars` / unused `eslint-disable`，非错误；初测 1 error 来自我临时创建的 `.cache/visual/vpcheck.mjs` 的 `require()`，已删除临时脚本后重跑 EXIT=0） |
| `npm run typecheck` | **0** | `tsc --noEmit` 无输出，干净通过 |
| `npm test` | **0** | 23 文件 / **303 测试全通过**（vitest run，Duration 46.55s） |
| `npm run build` | **0** | `✓ Compiled successfully in 4.4s`，`✓ Generating static pages using 27 workers (39/39)` |

## 5. e2e —— PASS 8/8（Linux Docker 容器，真实官方输出，2026-10-15 17:14）

- Windows 不跑 e2e（D16 裁决）：`next.config.ts:7` 与 `scripts/start-next.mjs:20` 有意在 win32 关闭 standalone，e2e global-setup 三处不兼容 Windows（17 号文档 §1 F1-F5）。
- **Linux 环境**：Docker 容器 `mcr.microsoft.com/playwright:v1.59.1-noble`（与 `@playwright/test` 1.59.1 精确匹配，node v24.14.1）；被测树 = `git archive 0cc257d`（SHA_GATE 精确树内容，与 visual 输出同一 SHA）。
- 容器内链路：`npm ci`（866 包/41s，registry=npmmirror）→ `npx prisma generate` → `npm run build`（EXIT=0）→ `npm run test:e2e` → **8 passed (1.2m)**：
  1. 访客在 /apply 发送消息收到 AI 流式回复 ✅
  2. 未登录访问后台跳转登录页 ✅
  3. 错误密码提示，正确密码进入仪表盘 ✅
  4. Viewer 访问用户管理渲染 Forbidden 视图 ✅
  5. 采集源试抓→执行→审核通过→建发布任务→通知记录出现 ✅
  6. 文章新建→编辑→删除 ✅
  7. 列表接口 500→ErrorState，点击重试恢复 ✅
  8. 搜索无结果→EmptyState ✅
- **容器环境适配（均已登记，不改任何项目文件）**：
  - Docker Desktop 向容器注入 `HTTP_PROXY=http://127.0.0.1:10809`（宿主侧地址，容器内不可达）→ 用 `-e HTTP_PROXY=http://host.docker.internal:10808` 覆盖（已验证可达）；
  - registry=npmmirror（与宿主 .npmrc 同款）。
- **AC4 判 PASS（8/8）**。原始输出：`e2e-linux.log`（gitignored，留磁盘）。

---

## 6. 越界检查 —— PASS（偏差经用户批准）

- 参照图重新生成经用户裁决批准（`approve_regen_reference`，2026-10-15）：32 张参照图按 main:6790 当前渲染重新生成（`VISUAL_REF=1 VISUAL_BASE_URL=http://127.0.0.1:6790 npx playwright test tests/visual --update-snapshots --output=.cache/visual/tr-fresh`，EXIT=0），随本卡提交入 upgrade 分支作为 Wave 1 新基线。
- 偏差登记与生成命令、main 提交号（94dbbbb）见 `reference-deviation.md`（满足 W0-08 卡步骤 4"必须证明由 main@94dbbbb 重新生成，附生成命令与 main 提交号"）。
- courses@375 的真实差异（确定性 0.02 文字级）记入 `reference-deviation.md` §5 与 `courses-375-visual-rootcause.md`，留给 A/E 线处理；本卡不改页面。

---

## 7. 结论

- **AC1 前台路径未变**：PASS（`git diff bb2c0e5..HEAD` 前台命中 0）
- **AC2 通用门禁 4/4**：PASS（最终 HEAD 复跑 ALL=0,0,0,0）
- **AC3 visual 46/46**：**45/46（真实官方输出）→ 用户裁决放行**——参照图经用户批准重新生成后，唯一失败 courses@375（确定性 0.02 文字级渲染差异）按 W0-08 步骤 2 留 A/E 线处理；偏差已登记（`reference-deviation.md`）
- **AC4 e2e 8/8**：**PASS（真实官方输出）**——Linux Docker 容器对 SHA_GATE 精确树 8 passed (1.2m)
- **越界检查**：PASS（参照图重生成偏差经用户批准并登记，`reference-deviation.md`）

**综合判定：PASS（用户裁决放行，request_id=decision_4b29a1c644844f4389a07bc6cd3c9eff，2026-10-15）**

> 放行条件与记录：唯一未闭环项 courses@375（确定性 0.02 文字级渲染差异，证据齐备：全页文字级、DOM 结构一致、两站互拍 0.13%）经用户裁决以"已登记偏差放行"，留 A/E 线处理（本卡不改页面）。W0-08 步骤 2 原文即规定"courses@375 的真实差异记入证据，留给 A/E 线处理；本卡不改页面"，本判定与该规定一致。
>
> 据此执行 `git tag w1-base`（D8 已裁决）；push upgrade 与 tag 经用户另行批准后执行。

---

## 8. 未完成项（移交后续线）

- [ ] courses@375 文字级渲染差异（留 A/E 线处理；证据齐备：确定性 0.02、全页文字级、DOM 结构一致）——Wave 1 期间修复后 official visual 应达 46/46
- [ ] push upgrade 与 tag w1-base（需用户批准，D8）