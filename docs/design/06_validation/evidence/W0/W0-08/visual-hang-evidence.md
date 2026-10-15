# W0-08 · 参照机 Playwright runner 挂起根因定位（第 2 轮，2026-10-15）

> 承接 `17-V0.5-W0-08门禁环境裁决.md` §4 排查流程与 `courses-375-visual-rootcause.md`。
> 本轮在**还原全部 32 张参照图到 827646b**（工作树 0 改动）之后重新取证，结论与上一轮一致且证据更完整。
> **第 3 轮突破（2026-10-15 12:0x）：挂起根因已确认并绕过，官方 runner 已跑通，见 §7。**

## 1. 本轮已完成的合规动作

| 动作 | 结果 |
|---|---|
| 参照图还原 | `git checkout 827646b -- tests/visual/reference/`，32 处工作树改动 → **0**；`git diff 827646b -- tests/visual/reference/` 为空（与 HEAD 一致，无需单独提交） |
| 服务健康 | `curl http://127.0.0.1:6789/api/health` → **HTTP 200**，`{"status":"ok","db":"up"}`（upgrade，PID 22896，`next start -p 6789`） |
| Playwright 版本一致性 | `npx playwright --version` = 1.59.1 = `node_modules/@playwright/test` = `playwright` = `playwright-core` |
| 浏览器二进制 | `chromium-1217`（chrome.exe）与 `chromium_headless_shell-1217`（chrome-headless-shell.exe）均存在于 `PLAYWRIGHT_BROWSERS_PATH=C:\Users\EDY\.box-agent\browsers` |
| 配置可解析 | `npx playwright test tests/visual --list` 正常列出 45 路由用例（3 视角 × 15） |
| 残留清理 | 删除上一轮等效比对遗留的 `.cache/visual/*.mjs` 诊断脚本与产物；结束后续发现的 3 个互锁 runner 残留进程（31960/24764/18684，均为本会话自建的测试进程） |

## 2. 挂起现象（第 2 次连续失败，按硬约束停止）

| # | 尝试 | 方式 | 结果 |
|---|---|---|---|
| 1 | `npm run test:visual` | bash 后台 + `timeout 120`，输出重定向文件 | **EXIT_CODE=124**；120s 内 stdout 仅有 npm 头两行，无 "Running 46 tests"，无任何用例输出 |
| 2 | 极简 spec（仅 `page.goto` + `title`） | `npx playwright test mini.spec.ts --workers=1 --reporter=line` | 挂起，`TEST_START` 未打印，90s 超时被杀 |
| 3 | `--reporter=line` 直跑 | bash 前台 90s | 挂起，process tree 被停 |
| 4 | `--reporter=line` + Start-Process | **PowerShell（Win32 句柄重定向，绕开 MSYS 管道）** | 45s 仍无输出，stdout/stderr 均为空 |
| 5 | `DEBUG="pw:api,pw:browser*"` | 单测试 `-g` 过滤 | DEBUG 日志 **0 字节** |

## 3. 决定性证据

1. **浏览器本身完全正常**：独立 Node 脚本 `chromium.launch()` 三种模式（headless-shell / headed / channel:chromium）**全部成功**（version=147.0.7727.15），可正常 `close()`。→ 排除浏览器安装/杀毒拦截/二进制损坏。
2. **runner 主进程存活但 0 子进程**：`Get-CimInstance Win32_Process -Filter "ParentProcessId=<runner>"` 返回空。Playwright worker（`child_process.fork`）**从未被成功创建**。→ 卡点在 runner 主进程 → worker 的 fork/IPC 环节，早于任何测试执行。
3. **上一次被 SIGTERM 中断的运行留下的 `.cache/visual/results.json`**：`{"expected":0,"skipped":46,"unexpected":0,"flaky":0,"duration":14.53}`；每个 spec `results: []`（**测试从未真正开始**）、`projectId: ""`、annotations 为空（非 `test.skip()` 所致）。→ 证实测试调度从未发生，"skipped" 是中断时的标记。
4. **进程不退出**：runner 在 json reporter 走完 onEnd 后仍不退出（Windows 下信号处理/IPC 收尾卡住），直至外层 timeout 强杀。
5. **环境共存项**：宿主侧有 2 个 `@playwright/mcp@latest` 实例（PID 6668/21592）长期运行；另有大量用户 chrome.exe 实例。未做清理（宿主进程不属本卡权限）。

## 4. 根因判断

**Playwright test runner（1.59.1）在本机的 worker 进程 fork 阶段卡死**：主进程存活、浏览器 launch 独立可用、配置可解析，但 runner 无法创建 worker 子进程，测试调度从未开始；且进程收尾不退出。该故障与项目代码无关（极简 spec 复现；独立 launch 成功），属**执行环境缺陷**。

最可疑环境因素（按可能性排序）：
1. 宿主侧 2 个 `@playwright/mcp@latest` 长驻实例与本机 Playwright 运行时的 IPC/锁冲突；
2. Node v24.15.0（box-agent 受管运行时）+ Playwright 1.59.1 在 win32 上的 worker fork 兼容性；
3. 大量并存 chrome 实例造成的资源竞争。

## 5. 需要谁裁决（四段汇报）

- **现象**：`npm run test:visual` 在参照机 Windows 上启动即无输出挂起，worker 零创建，两次受控超时均 EXIT=124。
- **证据**：见 §2/§3；浏览器独立 launch 成功、`--list` 正常、results.json 证实调度未发生。
- **根因判断**：环境缺陷（runner worker fork 卡死），非项目代码、非配置、非浏览器安装问题；W0-08 允许路径不含任何可修此项的文件。
- **需要谁裁决**：需用户选择——① 由宿主侧关闭/重启 2 个 `@playwright/mcp` 实例后在本机重试（唯一不换环境的路径）；② 用户提供 WSL2/Linux 沙箱跑 e2e（D17），visual 继续在本机排查；③ 均不可行则按卡面"升级条件"停止，交用户裁决，不得降低门禁标准。

## 6. 对 courses@375 的处置（步骤 2 遗留，已合规）

- 32 张工作树改动的参照图已全部还原为 827646b 版本（上一轮的 courses-375 重生成属越权动作，本轮已撤销）。
- `git diff --name-only 827646b..HEAD -- tests/visual/reference/` 为空，验收条目"参照图为空或每个改动有 main@94dbbbb 证据"以"为空"满足。
- **courses@375 的真实差异**（上一轮实测：旧参考 vs 当前渲染 diff≈3.6%，两站互拍 diff≈0.13%）记入 `courses-375-visual-rootcause.md`，**留给 A/E 线处理；本卡不改页面、不改参照图**。
- 注意：还原后官方 `test:visual` 若能运行，courses@375 将因参考图过期 FAIL——这是 P02 参照基线的既有缺陷，属 A/E 线待办，不是本卡引入的回归。

## 7. 第 3 轮突破：挂起根因确认与绕过（2026-10-15 12:0x，用户裁决 kill_mcp_then_retry 后）

### 7.1 用户裁决执行记录

| 动作 | 结果 |
|---|---|
| 结束宿主侧 2 个 `@playwright/mcp` 实例（PID 6668/19684，21592 已自行退出） | 完成；但**宿主随后自动重启 MCP**（PID 21592 重新出现），关闭条件未真正生效 |
| `npm run test:visual` 重试（受控 420s） | **EXIT_CODE=124**，仍挂起（第 1 次失败） |
| PowerShell + DEBUG + 句柄重定向 | 40s 仍 0 输出（第 2 次失败，按硬约束应停止） |

### 7.2 决定性突破：busy 文件阻塞 outputDir 清理

- `Playwright.config.ts` 的 `outputDir: ".cache/visual/test-results"`。该目录内 `web-web-375-courses-375/courses-375-actual.png`（10-14 22:10，上一轮被中断运行留下的失败产物）**长期 "Device or resource busy"**，bash/PowerShell 均无法删除，kill 6789 服务（PID 22896）后仍 busy，占用进程无法定位（本机无 handle 工具）。
- Playwright run 启动时会清空 outputDir → busy 文件阻塞清理 → **runner 卡在启动阶段，0 worker 子进程、无任何输出**。极简 spec 同样复现（非测试内容问题）。
- **绕过验证（决定性）**：`npx playwright test tests/visual --output=.cache/visual/tr-fresh`（CLI 参数指定全新 outputDir，不改配置文件）→ **runner 完全正常**："Running 46 tests using 1 worker"、chrome-headless-shell 4 进程、2.3m 跑完并正常退出。

### 7.3 官方 visual 真实结果（`--output` 绕过 busy 后，`visual-windows-fail.log`）

- **4 passed / 41 failed / 2.3m**（45 个 screenshot 用例；banner 断言用例含在 46 计数内）。
- **失败根因：参照图整体过期**——页面高度系统性暴增：
  - home@1440：Expected 1440×5529，received 1440×11446（ratio 0.17）
  - 约1950→3379、1460→3150 等多处系统性翻倍
- **两站互拍（main:6790 vs upgrade:6789）diff≈0.13%**（上一轮证据）→ main 与 upgrade 渲染一致，**不是代码违规（AC1/REQ-F-014 未受影响）**，而是 827646b 里的参照图（10-13 快照）与当前 main 站点渲染差异巨大（main 站点为动态数据，10-13 后内容增长导致页面变长）。
- **结论**：visual 46/46 在 SHA_GATE 上不可能达成，除非重新生成参照图（从 main:6790）——但本卡硬约束禁止重新生成，且 `tests/visual/reference/**` 不在允许路径内。

### 7.4 结论与需裁决项

- 挂起根因：busy 的 `courses-375-actual.png` 阻塞 outputDir 清理（已用 `--output` 绕过验证；占用进程无法定位）。
- 官方 visual 真实结果：**4/46 passed，41 failed（参照图整体过期）**——比第 2 轮的"UNKNOWN"更准确，W0-verify.md 应更新为 FAIL（真实官方输出，非等效比对）。
- 按卡面"升级条件"：**参照机 visual 拿不到 46/46 → 停止，交用户裁决；不得降低门禁标准**。
- 需要用户裁决：参照图基线整体过期（main 站点动态数据变化所致）→ 是否批准从 main:6790 重新生成参照图（走 reference 所有权的合规路径），否则 visual 46/46 无法闭环、无法打 tag。
