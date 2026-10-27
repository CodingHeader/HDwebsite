---
id: EVD-V14-VIS-STAB-01
title: TASK V14-VIS-STAB-01 visual 门禁稳定性证明
status: accepted
module: validation
owner: main-agent
created: 2026-10-27
related: [TASK V14-VIS-STAB-01, REQ-F-014, PLAN-V014-05, PLAN-V014-06]
---

# V14-VIS-STAB-01 · visual 门禁稳定性证明

## 一、结论

**稳定得证。** 连续 **2 次**普通 CI run（非 `visual_update_ref`）的 visual job 均 success，且三次 job（gate / visual / docker）全绿。

| 次序 | commit | run id | visual | gate | docker | 说明 |
|---|---|---|---|---|---|---|
| #1 | `2348f3a` | `40471824511` | **success** | success | success | a/b/c 三源收敛后首次普通 run |
| #2 | `8c71228` | `40472734510` | **success** | success | success | 空提交触发，验证非侥幸 |

验收条目「连续 ≥2 次普通 CI run 的 visual job 均 PASS」→ **PASS**。

## 二、flake 确诊（本卡最关键的取证）

| 提交 | tree hash | run | visual |
|---|---|---|---|
| `48eb0b2` | `991586f45016fdf5dc616249701058d25581f046` | `40454848846` | success |
| `9efa2f5` | `991586f45016fdf5dc616249701058d25581f046` | `40455661938` | **failure** |

- `git diff --quiet 48eb0b2 9efa2f5` → **exit 0**（文件树完全相同）
- `9efa2f5` 为空提交（`git show --name-only` 无输出），仅用于触发第二次 run

**同一份代码、两次 run、结果相反 → flake 确诊，非样式回归。** 该结论不依赖任何 artifact，可复现。

### 2.1 历史失败链

| run | commit | visual | 失败原因 |
|---|---|---|---|
| `40425202421` | `a129bce` | FAIL | 初始矩阵 home@1440 ratio 0.10 |
| `40433104468` | `cb7b34d` | FAIL | 同图区，ratio 0.10 |
| `40453526485` | `4aef503` | FAIL | `TypeError: img.decode is not a function` |
| `40455661938` | `9efa2f5` | FAIL | 同树异果，flake 确诊点 |

## 三、收敛措施（a/b/c 一次性落地）

收敛额度仅剩 1 次（`48eb0b2` 的 decode 修复已用掉第一次，败于 `9efa2f5`），故三项一次全上。三项分属**正交**时序源，同时上不存在互相掩盖。

| 项 | 改动 | 针对的时序源 |
|---|---|---|
| **a** | 轮询 200ms → 100ms，且要求**连续 2 次**轮询都达标才返回 | 单次达标可能只是恰好赶上某渲染帧；复查一次可滤掉瞬时状态 |
| **b** | 就绪条件补 `currentSrc !== ""` | `next/image` 的 srcset 会让 `currentSrc` 晚于 `decode` 落定；只判 `complete` 会在「已解码但未选定源」的窗口里通过 |
| **c** | 截图前追加双 `requestAnimationFrame` | `decode → 布局 → 合成` 至少跨两帧，避免拍到中间态 |

**未动冻结面**（逐条实测）：
- `maxDiffPixelRatio` 仍为 `0.01`（`git diff 3e6a6b5..HEAD -- playwright.config.ts` 为空）
- 未手工编辑任何 `tests/visual/reference/*.png`（`git log 3e6a6b5..HEAD -- tests/visual/reference` 为空）
- `tests/visual/routes.ts` 未改（路由 15 条不变）
- 未跳过/禁用任何用例（`--list` 仍 46 例）
- 前台 `className` **值**零变更（见 §四修正公式）

## 四、失败自解释机制（D1 的替代方案）

### 4.1 为什么不读 artifact

| 路径 | 实测结果 |
|---|---|
| job 日志 `actions/jobs/<id>/logs` | **HTTP 403**（`Must have admin rights to Repository.`） |
| artifact `actions/artifacts/<id>/zip` | **HTTP 401**（`Requires authentication`） |
| `gh` CLI | **未安装**（`gh --version` → exit 127） |
| run 网页抓取 | 抓取失败 |

三条取数路全断。故放弃"下载 diff 图判 bbox"，改为让失败**自解释**。

### 4.2 实现

`settle()` 末尾输出结构化诊断行：

```text
[visual] home@1440 images=32/32 OK
[visual] home@1440 images=40/42 MISSING=[.../campus-3.webp, .../banner-1.webp]
```

未就绪时同时 `test.info().annotations.push({type: "images-not-ready", ...})`。

### 4.3 判据的改变

| | 旧判据 | 新判据 |
|---|---|---|
| 问法 | diff 图 bbox 是否落在 Gallery/Campus 图区？ | 失败路由的 DOM 里是否有未就绪图片？ |
| 回答者 | 人（需下载 artifact + 认证） | CI 日志直接回答 |

**分支判定**：
- 红 且 `loaded < total` → 同族 flake 未收敛 → 熔断上报
- 红 但 `loaded === total` → **真实样式差异** → 立即熔断，不动等待逻辑

## 五、验收逐条

| # | 验收条目 | 结果 | 证据 |
|---|---|---|---|
| 1 | 连续 ≥2 次普通 CI run 的 visual 均 PASS | **PASS** | `40471824511` + `40472734510`，均 success |
| 2 | `stability.md` 含每次 run 的 id/commit/结论/计数 | **PASS** | 本文 §一 |
| 3 | 未修改 `maxDiffPixelRatio`（仍 0.01） | **PASS** | `git diff` 为空 |
| 4 | 未手工编辑 `reference/*.png` | **PASS** | `git log 3e6a6b5..HEAD -- tests/visual/reference` 为空 |
| 5 | 收敛改动仅限等待逻辑，不含断言/阈值 | **PASS** | 仅改 `web.spec.ts` 的 `waitForLoadedImages` / `settle` |
| 6 | 前台 `className` 变更 0 行 | **PASS** | 见下方修正公式 |

### 5.1 原卡公式缺陷（已修正，替换原式）

原卡 `tasks/V14-VIS-STAB-01.md:63` 写：

```bash
git diff 3e6a6b5..HEAD -U0 -- "src/app/(web)" "src/components/web" | grep -c className
```

实测返回 **2**，但这是假阳性：A11Y-01 给 `<Send className="w-4 h-4" />` 加 `aria-hidden="true"` 时，整行被 `+`/`-` 各复制一次，`className` 的**值一个字都没变**。

若按原式执行，执行者会把 A11Y 的合规改动误判为前台违规，进而去"修"前台样式 —— 正是历史坑 H3。

**修正版**（只比对 className 的值）：

```bash
git diff 3e6a6b5..HEAD -U0 -- "src/app/(web)" "src/components/web" \
  | grep -oE 'className="[^"]*"' | sort | uniq -c | awk '$1 % 2 == 1'
# 输出为空 = 值未变
```

实测输出为空 → **PASS**。

## 六、本地验证（win32，说明局限）

| 项 | 结果 |
|---|---|
| `tsc --noEmit` | exit 0 |
| `eslint tests/visual/web.spec.ts --max-warnings 0` | exit 0 |
| `playwright test tests/visual --list` | 46 例（与基线一致，未增删） |
| 实跑 45 例诊断输出 | 全部 `images=N/N OK`，`MISSING` **0 例** |

**本地 36 例像素失败属环境差异**：参照图在 Linux/CI 生成，本机 win32 字体渲染差异（CI 注释 V0.4 已记录 11 处固定差异）。本地结果不作为达标判据，达标以 CI 两次普通 run 为准。

## 七、UNKNOWN 与局限

| 项 | 原因 | 后续 |
|---|---|---|
| 失败图区的精确 bbox | artifact 401 / 日志 403 / gh 未安装 | 已用"自解释日志"替代判据，不再依赖 |
| 本地 win32 下的 visual 结论 | 字体渲染差异不可分离 | 不采信；只认 Linux CI |

## 八、相关提交

| commit | 内容 |
|---|---|
| `48eb0b2` | 第一次收敛：修 `img.decode` 跨进程丢失（额度用尽前的一次尝试） |
| `675c6a3` | 第二次收敛：a/b/c 三源一次性全上 + 失败自解释 |
| `9efa2f5` / `8c71228` | 触发 run 的空提交 |
