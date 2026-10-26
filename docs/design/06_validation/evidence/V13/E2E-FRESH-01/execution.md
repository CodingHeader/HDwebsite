# V13-E2E-FRESH-01 执行证据：e2e 构建新鲜度守卫平台无关化

> 执行时间：2026-10-26
> 执行者：main-agent
> 起点：`upgrade@cbaaf55`

## 5W1H 简版

- **What**：修复 e2e 在 Windows 上"不校验构建新鲜度 → 静默测旧构建"的缺陷。
- **Why**：该缺陷使"e2e 全绿"在 win32 上无法作为验收证据；本轮已实测到 1 个假失败。
- **Where**：`tests/e2e/global-setup.ts`（`prepareStandalone()`）。
- **Who**：main-agent（测试基建正确性属核心项，不外包）。
- **How**：把新鲜度校验前移到平台分支之前；报错携带两侧时间戳。
- **What if**：若不修，后续每张卡都可能给出"假 PASS/假 FAIL"。

## 一、缺陷（修复前）

```ts
// 修复前 prepareStandalone()
const buildId = path.join(ROOT, ".next", "BUILD_ID");
if (!existsSync(buildId)) throw new Error("缺少生产构建：请先运行 npm run build");
if (!useStandalone) return null;                        // ← win32 恒命中，提前返回
const server = path.join(ROOT, ".next", "standalone", "server.js");
if (!existsSync(server)) throw new Error("缺少生产构建：请先运行 npm run build");
const builtAt = statSync(buildId).mtimeMs;              // ← 永远执行不到
if (latestMtime(path.join(ROOT, "src")) > builtAt) throw new Error("构建已过期…");
```

- `useStandalone = process.platform !== "win32"`（文件 `:27`）
- `next.config.ts:7` — `output: isWindows ? undefined : "standalone"` → win32 上无 standalone
- ⇒ **Windows 上新鲜度校验永不执行**

## 二、现场实证（修复前）

| 项 | 值 |
|---|---|
| `.next/BUILD_ID` mtime | 2026-10-26 **17:54:31** |
| `src/lib/chat-session.ts` mtime | 2026-10-26 **18:13:36** |
| `src/app/api/chat/session/route.ts` mtime | 2026-10-26 **18:13:36** |
| 关系 | **BUILD_ID 早于 src → stale** |

| 运行 | 结果 |
|---|---|
| `npm run test:e2e`（stale 构建） | **1 failed** — `apply-chat.spec.ts:47` `MOCK_REPLY` 30s 超时 |
| `npx playwright test ... apply-chat.spec.ts`（先单跑复现） | **1 failed**（同一断言） |
| `npm run build`（→ BUILD_ID 19:00:41） | PASS |
| `npx playwright test ... apply-chat.spec.ts`（fresh） | **1 passed**（1.9s） |
| `npm run test:e2e`（fresh，全量） | **79 passed**（2.3m） |

### trace 取证（排除了"修复失效"的误判）

```text
REQ GET  /api/chat/session  -> 200    (×4 并发)
REQ POST /api/chat/stream   -> 400
```

形态与 V12-E2E-01 记录的根因一致 → 若只看 trace 会误判"修复未生效"。
**真正区别在于被测构建是否是当前源码**，故必须比对 mtime。

## 三、修复（修复后）

`tests/e2e/global-setup.ts`：

```ts
function prepareStandalone(): string | null {
  const buildId = path.join(ROOT, ".next", "BUILD_ID");
  if (!existsSync(buildId)) throw new Error("缺少生产构建：请先运行 npm run build");
  // 平台无关的新鲜度校验（win32 也执行）
  const builtAt = statSync(buildId).mtimeMs;              // L79
  const srcLatest = latestMtime(path.join(ROOT, "src"));  // L80
  if (srcLatest > builtAt) {                              // L81
    throw new Error(
      `构建已过期（src 比 .next/BUILD_ID 新）：请先运行 npm run build\n` +
        `  src 最新修改：${new Date(srcLatest).toISOString()}\n` +
        `  BUILD_ID    ：${new Date(builtAt).toISOString()}`
    );
  }
  if (!useStandalone) return null;                        // L88：分支已在校验之后
  ...
}
```

并在函数头注释写入缺陷因果与现场证据，防止后人简化回原写法。

## 四、验收条目

| 验收 | 结果 | 证据 |
|---|---|---|
| win32 与 linux 都执行新鲜度校验 | **PASS** | 代码顺序 L79~L81 早于 L88 |
| stale 时报错含两侧时间戳 | **PASS** | 报错模板含 `src 最新修改` / `BUILD_ID` |
| fresh 时不误报 | **PASS** | BUILD_ID 19:00 > src 18:13 → 未抛错，e2e 79/79 |
| tsc | **PASS** | `npx tsc --noEmit` exit 0 |
| lint | **PASS** | `npx eslint tests/e2e/global-setup.ts` exit 0 |
| e2e 回归 | **PASS** | 修复后全量 **79 passed** |

## 五、影响与边界

- 仅测试基建；未触碰 `src/**`、`prisma/**`、冻结面配置。
- 新增行为：Windows 上若忘记 `npm run build`，e2e 会**直接报错**而不是静默测旧构建——这是**期望行为**。
- 未改变 Linux（standalone）路径语义。

## 六、UNKNOWN

无。
