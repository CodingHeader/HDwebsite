# E-12 执行记录：E2E global-setup 跨平台（portability）

分支 `lane/e-manager-pages`（自 w1-base-ccr-1 = f158501）。执行：本会话（Hark-E 角色）。

## 改动（全部在 allow 内，4 文件）

- `tests/e2e/fixtures/kill-tree.ts`（新）：`killTree(pid, signal)`——POSIX 保持 `process.kill(-pid)`（与 827646b 字节级一致）；win32 用 `taskkill /pid <pid> /T /F`（负 PID 进程组在 Windows 不存在）。`appSpawnArgs(root, serverJs, port)`——standalone 返回 `[node, server.js]`；win32 回退 `node node_modules/next/dist/bin/next start -p <port> -H 127.0.0.1`。
- `tests/e2e/fixtures/kill-tree.test.ts`（新，5 用例）+ `kill-tree.vitest.config.ts`（include 覆盖专用配置；冻结的 vitest.config.ts 未动）。
- `tests/e2e/global-setup.ts`：
  - `useStandalone = process.platform !== "win32"`；
  - `prepareStandalone`：win32 返回 null（新鲜度仍以 BUILD_ID 校验）；
  - `runNpx`：spawnSync 加 `shell: process.platform === "win32"`（Node ≥18.20.2 起 .cmd 必须 shell）；原 `run()` 无调用者已删除；
  - spawn 用 `appSpawnArgs(ROOT, serverJs, E2E_PORT)`；
  - 全部 `process.kill(-pid)` 替换为 `killTree(pid)`；
  - **dbUrl 平台分支**：win32 用相对形式 `file:prisma/e2e.db`（从 cwd=ROOT 解析）——Prisma schema engine 打不开 `file:///E:/...` 三斜线绝对 URL（os error 161 BAD_PATHNAME，与 dev 库 `file:./prisma/dev.db` 同款相对形式）；Linux 保持绝对 URL 字节级不变。
- **scripts/start-next.mjs 与 next.config.ts 未动**（`git diff 827646b -- ...` 为空）。

## 过程中定位的两个 Windows 根因

1. **`file:///E:/...` 绝对 URL 失败**（os error 161）：Prisma schema engine 在 win32 无法打开三斜线盘符 URL；修复为相对形式。
2. **`spawnSync("npx",…)` 无 shell**：Node ≥18.20.2 在 Windows 上 .cmd 必须带 shell（规划 F5 预判正确）。

## 验收结果

| 项 | 结果 |
|---|---|
| Windows `npm run test:e2e` 连续 3 次 | **8/8 × 3 全过**（各 1.2m，RUN1/2/3 EXIT=0，e2e-windows.log） |
| Linux `npm run test:e2e`（跨平台改造后复跑） | **8/8**（1.2m，E2E_EXIT=0，e2e-linux-e12.log）——Linux 路径行为与基线一致 |
| kill-tree 单测 | 5/5 PASS（`kill-tree.vitest.config.ts` 运行） |
| 套件全量 vitest | 343/343 PASS |
| `git diff 827646b -- next.config.ts scripts/start-next.mjs` | 空 ✅ |
| `grep "process.kill(-" global-setup.ts` | 空（全部走 killTree）✅ |
| 通用门禁 | lint 0 errors / typecheck / test / build 全 EXIT=0（gate-e12.log） |
| 越界检查 | 暂存 4 文件 ⊆ allow ✅ |
| 两环境 SHA | Windows 与 Linux e2e 均为 `f158501`（同一提交）✅ |

## 附注

- storageState 的 globalSetup 登录 3 次（+viewer 创建验证 1 次 fetch；卡面目标 2 次），语义一致已登记（ccr-1-verify §5 同款缺口）。
- app.log 无登录行：logOperation 落 DB（OperationLog）不落 stdout。
