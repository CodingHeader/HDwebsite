# V13-E2E-FRESH-01：e2e 构建新鲜度守卫平台无关化

## 归属
- 切片：S1
- 缺口：**G2**
- 执行者：main-agent（核心/高难，自做）
- 档位：中｜规模：小
- **状态：done（2026-10-26，本卡随规划包一并提交）**

## 目标
让 e2e 在**所有平台**都无法测到陈旧构建，从而让"e2e 全绿"重新成为可信验收证据。

## 输入
- 文档：`00-事实基线.md` §3.1
- 前置：V13-BASE-01

## 问题（取证）
`tests/e2e/global-setup.ts` 原实现：

```ts
if (!useStandalone) return null;                       // :70  ← win32 恒命中
const builtAt = statSync(buildId).mtimeMs;             // :73  ← 新鲜度校验在 return 之后
if (latestMtime(path.join(ROOT,"src")) > builtAt) throw ...
```

`useStandalone = process.platform !== "win32"`（`:27`），`next.config.ts:7` 在 win32 上 `output: undefined`
→ **Windows 上新鲜度校验永不执行**。

现场证据：
- `.next/BUILD_ID` mtime = 17:54:31
- `src/lib/chat-session.ts` + `src/app/api/chat/session/route.ts` mtime = 18:13:36
- `npm run test:e2e` → **1 failed**（apply-chat，trace 显示 4×并发 `GET /api/chat/session` + `POST /api/chat/stream` 400）
- `npm run build`（19:00）→ apply-chat 单跑 PASS、全量 **79/79 PASS**

## 输出
- `tests/e2e/global-setup.ts`（新鲜度校验前移）
- `docs/design/06_validation/evidence/V13/E2E-FRESH-01/execution.md`

## Execution Steps
1. [x] 把 `builtAt` + `latestMtime(src)` 的新鲜度校验移到 `if (!useStandalone) return null` **之前**
2. [x] 报错信息携带 `src 最新修改` 与 `BUILD_ID` 两个 ISO 时间戳，便于定位
3. [x] `useStandalone` 分支保持原语义（win32 仍回退 `next start`），仅"校验已提前"
4. [x] 回归：`npx tsc --noEmit` PASS、`npx eslint tests/e2e/global-setup.ts` PASS
5. [x] 回归：`npm run test:e2e` → **79/79 PASS**
6. [x] 在文件头注释中写入缺陷因果与现场证据，防止后人简化回原写法

## 验收标准
- [x] win32 与 linux 都会执行新鲜度校验（代码顺序可证）
- [x] stale 时报错含两侧时间戳
- [x] fresh 时不误报（本次 BUILD_ID 19:00 > src 18:13 → 不抛错，79/79 通过）
- [x] tsc + lint + e2e 三绿

## 验证命令
```bash
npx tsc --noEmit
npx eslint tests/e2e/global-setup.ts
npm run build && npm run test:e2e     # 必须串行
```

## 证据路径
`docs/design/06_validation/evidence/V13/E2E-FRESH-01/execution.md`

## 允许修改
- `tests/e2e/global-setup.ts`
- `docs/design/06_validation/evidence/V13/E2E-FRESH-01/**`

## 禁止修改
- `playwright.config.ts`、`vitest.config.ts`、`src/**`、`prisma/**`

## 依赖与阻塞
- Depends on：V13-BASE-01
- 无阻塞

## 升级条件
若修复后 e2e 仍出非确定性失败 → 立即熔断，转 `V13-VIS-01` 同级的根因取证流程。
