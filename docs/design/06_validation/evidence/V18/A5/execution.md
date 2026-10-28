# A5 执行证据：默认态回归

## 5W1H

- **What**：证明 A3/A4 补配置能力后，默认渲染与改动前完全一致；并跑本轮唯一一次全量门禁。
- **Why**：A3 改 9 个前台组件、A4 改 5 个入口文件，全部触碰 `REQ-F-014` 前台视觉冻结面。本卡是唯一能证明「改动没破坏视觉」的环节。
- **Where**：只读验证 + 运行时闭环，不产生代码改动（除下述 1 处缺陷修复）。
- **Who**：main-agent。
- **How**：静态三项（className 值 / 基线 / 阈值）+ 管理端可见性 + 前台闭环 + 全量门禁。
- **What if**：若视觉失败无法归因 → 停手上报，不得靠重建基线掩盖。

## 一、静态验证

| # | 项 | 命令 | 结果 |
|---|---|---|---|
| 1 | className **值**零变更 | 见 §二 | PASS（2 处模板字面量，默认输出逐字一致） |
| 2 | 基线图未动 | `git status --short tests/visual/reference` | PASS（0 条改动，45 张） |
| 3 | 阈值未放宽 | `git diff --exit-code playwright.config.ts` | PASS（未变） |
| 4 | 用例数未减 | `npx playwright test tests/visual --list` | PASS（46 tests） |

## 二、className 值变更分析

基线 `84216e8` → HEAD 的 className 值集合差：

```
className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 max-w-5xl mx-auto"
className="relative flex-1"
```

两处均为**模板字面量拼接**，已实测默认输出逐字一致：

```
grid : "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 max-w-5xl mx-auto"
原文 : "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 max-w-5xl mx-auto"
一致 : true

text : "relative flex-1"
一致 : true
```

**执行中修正**：A4 初版给 `FloatingContact` 二维码容器加了 `overflow-hidden`，属改动既有元素 className 值，已还原（commit `646b513`）。`object-contain` 已足以约束图片。

## 三、管理端可见性（运行时验证）

启动服务（`npx next start -p 6791`，DATABASE_URL=file:./prisma/e2e.db），登录 admin 后查 `/api/settings/definitions`：

```
分组数: 18
ALL 11 在 definitions 中可见
分组名: site,topbar,banner,stats,cards,footer,company,contact,seo,other,
        email,wechat-mp,collect,kb,llm,notify,publish,display
```

| 分组 | 中文标签 | 条目数 |
|---|---|---:|
| topbar | 顶栏 | 3 |
| stats | 统计 | 9 |
| cards | 首页卡片 | 14 |
| contact | 联系 | 6 |
| **display** | **展示** | **1** |

**11 键全部进入 definitions API**，`display` 分组已带中文标签「展示」（A2 补的 GROUP_LABELS 生效）。

## 四、前台闭环（2 项）

### 闭环 1 · `showImageOverlays` → campus

| 步骤 | 操作 | 结果 |
|---|---|---|
| 1 | 改前统计 campus 图片说明数 | 2 |
| 2 | `PUT {"showImageOverlays":"false"}` | 200 |
| 3 | 等待 3s 后复查 | **0**（说明消失） |
| 4 | 页头「校区环境」仍在 | 5（未受影响） |
| 5 | 还原 `"true"` 后复查 | **2**（恢复） |

**PASS** —— 配置真实生效且可逆。

### 闭环 2 · `bannerShowExtraBtn` → 首页 Banner 第二按钮

**首次测试失败**：设为 `true` 后首页 `了解更多</a>` 仍为 0。

**根因（真实缺陷）**：A4 把 3 个 banner extraBtn 字段加在了 `HomeData` **顶层**，但 `page.tsx` 传给 Banner 的是 `d.bannerSettings`：

```tsx
<Banner banners={d.banners} settings={d.bannerSettings} />
```

顶层字段**从未被消费**，配置永远到不了 Banner。

**修复**：把 3 个字段移入 `bannerSettings` 接口与 return 对象，删除顶层死字段。

**修复后验证**：

| 设置值 | DOM 中 `了解更多</a>` 数 | 轮询稳定性 |
|---|---:|---|
| `"true"` | **1** | 5 次轮询均为 1 |
| `"false"` | **0** | 第 1 次读到旧缓存 1，第 2~4 次为 0 |

**PASS** —— 与 `setSettings` 的设计一致（`RESOURCE_TO_TAGS.setting = [settings, home]`，≤5s 可见，首读可能命中旧缓存）。

## 五、全量门禁（本轮唯一一次，串行）

| # | 门禁 | 命令 | 结果 |
|---|---|---|---|
| 1 | lint | `npm run lint` | **exit 0** |
| 2 | typecheck | `npx tsc --noEmit` | **exit 0** |
| 3 | 单测 | `npm test -- --no-file-parallelism` | **exit 0（91 文件 / 1859 用例全通过）** |
| 4 | build | `npm run build` | **exit 0** |
| 5 | check:assets | `npm run check:assets` | exit 0（9 引用全存在） |
| 6 | check:root | `npm run check:root` | exit 0（48 条白名单） |
| 7 | check:audit | `npm run check:audit` | exit 0（critical 0 / high 0） |
| 8 | check-frozen | `node scripts/check-frozen.mjs` | exit 0（CCR-3 豁免） |

**BUILD_ID 新鲜度**：`2026-10-28 16:38:00` > src 最新 `16:34` → **fresh**

### 关于 `npm test` 默认并发下的失败（重要）

首次 `npm test`（默认并发）报 **12 个套件失败**，全部为 `Hook timed out in 10000ms`（卡在 `beforeAll → initTestDb()`）。

**归属判定（三重证据）**：

1. **基线同样失败**：`git stash` 暂存我的全部改动后跑 `npm test` → **14 个套件失败**，同类 `Hook timed out`。改动后是 12 个，**比基线更少**。
2. **串行全通过**：`npm test -- --no-file-parallelism` → **91 文件 / 1859 用例全通过，exit 0**。
3. **失败用例与改动无关**：`v11-compat-old-api` / `v13-rl-01` / `lane-c/chat-scene` 等均不 import `components/web` 或 `app/(web)`（`grep -c` = 0）。

**结论**：这是**预先存在的并发争用问题**（多 worker 同时 `initTestDb()` 争同一 SQLite 文件），非本次改动引入。与 V1.3 记录的「并行 build+test 产 Hook timeout 假红」同源。

**处置**：本卡以串行结果为准（1859 全通过）。并发问题登记为独立待办，不在本轮修复。

## 六、UNKNOWN

| 项 | 原因 | 后续 |
|---|---|---|
| `test:visual` 本机结论 | win32 无法生成 Linux 基线（`next.config.ts:7` 关闭 standalone） | 记 `UNKNOWN(需 Linux CI)`；静态三项已 PASS |
| `test:e2e` 本机结论 | 同上 | 同上 |

## 七、提交

- `fix(V18/A4): 还原 FloatingContact 二维码容器的 overflow-hidden`（`646b513`）
- `fix(V18/A5): Banner 第二按钮接线位置修正 —— 移入 bannerSettings`