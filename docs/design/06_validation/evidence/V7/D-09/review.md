# D-09 独立复审报告（review.md）

> 复审方：主代理独立执行（子智能体调度连续 2 次无结果，按熔断规则改为主代理独立验证；证据登记见 §七）
> 分支：`upgrade`　HEAD 复审起点 `5e5fa38`，复审后追加修复提交 `8a24fd1`（HEAD 现为 `8a24fd1`）
> 复审结论：**PASS 有条件**（完成度 95%），放行 D-10

## 一、复审结论

**PASS 有条件**，完成度 **95%**。D-09 卡实现与验收标准一致，未触碰冻结面；但复审独立发现 1 个 P1 回归缺陷（`.png` Content-Type 丢失）与 1 个 P2 代码卫生问题（两个文件末尾缺换行符），已在复审后追加 `fix(V7-D-09)` 提交 `8a24fd1` 修复并回归验证。修复后四项门禁仍全绿。

## 二、审查方法与证据范围

- 工具：`git show/diff/status`、`grep`、`read_file`、`npx vitest run`、`npm run lint/typecheck/test/build`
- 已读文件：
  - `git show --stat 5e5fa38`、`git diff 023ab68 5e5fa38 -- src/lib/kb/ingest.ts`（越界核实）
  - `git diff 023ab68 5e5fa38 -- next.config.ts / src/lib/storage.ts / src/app/api/upload/route.ts / src/app/api/file/[...path]/route.ts / src/lib/collect-engine.ts / src/lib/jobs/backup.ts`
  - `src/lib/storage.ts`、`src/lib/kb/ingest.ts`、`src/lib/jobs/backup.ts`、`src/lib/collect-engine.ts`、`src/app/api/upload/route.ts`、`src/app/api/file/[...path]/route.ts`、`next.config.ts`（当前 HEAD 全文）
  - `src/lib/__tests__/lane-d/storage.test.ts`（109 行，7 用例全文）
  - `docs/V0.7-20261019/tasks/D-09.md`、`docs/design/06_validation/evidence/V7/D-09/execution.md`

## 三、提交范围与冻结面核对表

| 检查项 | 结果 | 证据 |
|---|---|---|
| `src/contracts/**` 未触碰 | PASS | `git diff --name-only` 无 `src/contracts/` 条目 |
| `prisma/schema.prisma` / `prisma/migrations/**` 未触碰 | PASS | 同上 |
| `package.json` / 锁文件未触碰 | PASS | 同上（本次 diff 仅 9 文件） |
| `vitest.config.ts` / Playwright 配置未触碰 | PASS | 同上 |
| 前台视觉冻结（`src/app/(web)/**`、`src/components/web/**`、`public/**`、globals.css web 令牌、layout 字体 lang） | PASS | diff 文件列表无上述路径 |
| 允许路径：`next.config.ts`、`src/lib/storage.ts`、`src/app/api/**`、`src/lib/collect-engine.ts`、`src/lib/jobs/backup.ts`、`src/lib/__tests__/**`、`docs/**` | PASS | 均在 D 线允许范围 |
| 越界文件（`src/lib/kb/ingest.ts` 属 C 线） | **PASS（已登记）** | diff 仅 2 处内联 `/* turbopackIgnore: true */` + 2 行说明注释，**非注释行为 0**；执行者证据 §四 已登记理由 |

## 四、越界评估（kb/ingest.ts）

`git diff 023ab68 5e5fa38 -- src/lib/kb/ingest.ts` 显示 +6/-0：

```diff
+  // turbopackIgnore：`kbDir()` 是函数调用，Turbopack 无法静态解析其返回值，会过度追踪整个项目根（11991 文件）。
+  // 加 turbopackIgnore 注释使构建期不追踪该动态路径；运行时路径由 storage.ts 解析。
-  const dir = path.join(kbDir(), String(baseId));
+  const dir = path.join(/* turbopackIgnore: true */ kbDir(), String(baseId));
   const storagePath = `${baseId}/${sha}.${check.ext}`;
-  const abs = path.join(kbDir(), storagePath);
+  const abs = path.join(/* turbopackIgnore: true */ kbDir(), storagePath);
```

**结论**：纯注释修改，不含任何运行时逻辑变化。`kbDir()` 调用仍存在，只是给 Turbopack 加了一个静态分析提示。理由充分（Turbopack 过度追踪整个项目根正是 standalone 携带 218M uploads 的根因，而该根因唯一入口就是 kb/ingest.ts 的这两处 `path.join`）。同意越界豁免。

**反对论证**（自问）：C 线 C-03 后续会接管知识库文件路径，如果它把 `kbDir()` 改成静态字符串，这个注释会失效吗？——不会，`turbopackIgnore` 是构建期提示，多余时 Turbopack 直接忽略；如果 C-03 重构路径为静态，注释无害。若 C-03 改为 `path.join(DATA_DIR, ...)` 则可能重新引入过度追踪，届时由 C-03 自行处理，非本卡范围。

## 五、核心验收项逐条结果

| # | 验收项 | 结果 | 证据 |
|---|---|---|---|
| 1 | 生产代码无 `process.cwd(), "uploads"/"backups"` 字面量 | **PASS** | `grep -rn 'cwd()' src` 命中 5 处全在 `__tests__/`（storage.test.ts:36,37,53 与 w0-shared.test.ts:151,152），用于断言"未设 DATA_DIR 回退 cwd"的默认行为，属测试必要 |
| 2 | `src/lib` 生产代码无 `@/app/...` import | **PASS** | `grep -rn "@/app/" src/lib --include="*.ts" \| grep -v __tests__` → 空；collect-engine 已改为 import `@/lib/storage` |
| 3 | `dataRoot()` 正确解析 `DATA_DIR` | **PASS** | 源码：`function dataRoot()` 读 `process.env.DATA_DIR`，`typeof dir === "string" && dir.trim().length > 0` 时 `path.resolve(dir.trim())`，否则 `process.cwd()`；单测 7/7 覆盖未设置/绝对/相对/变更重读/chdir 独立性 |
| 4 | `outputFileTracingExcludes` 已写入且不冲突 | **PASS** | `next.config.ts` diff +4：`outputFileTracingExcludes: { "*": ["uploads/**/*", "backups/**/*", "data/**/*"] }`，插在 `experimental` 块与 `images` 块之间；`output: isWindows ? undefined : "standalone"` 行 7 未改，语法无冲突，typecheck 通过 |
| 5 | 新增单测覆盖 | **PASS** | 7 用例：①未设 DATA_DIR 四根相对 cwd ②绝对路径 ③相对路径归一化 ④DATA_DIR 变化重读 ⑤chdir 后不变 ⑥resolveInside 接受合法路径 ⑦resolveInside 拒绝 14 种非法/穿越形态（含 `.hidden`、`a/.hidden`、`a//b`、`a/\0b`、`C:\windows`、`a\b`） |
| 6 | kb/ingest.ts 越界纯注释 | **PASS** | 见 §四 |
| 7 | 无 `UPLOAD_ROOT` 残留 | **PASS** | `grep -rn "UPLOAD_ROOT" src` → 空；upload route 已删常量，file route 与 collect-engine 均改调 `uploadsDir()` |

### 门禁命令结果（当前 HEAD `8a24fd1`）

| 命令 | 退出码 | 关键输出 |
|---|---|---|
| `npx vitest run src/lib/__tests__/lane-d/storage.test.ts` | 0 | 1 file / 7 passed |
| `npm run lint` | 0 | 0 errors, 37 warnings（历史残留） |
| `npm run typecheck` | 0 | `tsc --noEmit` 干净 |
| `npm test` | 0 | 52 files / **682 passed** |
| `npm run build` | 0 | `✓ Compiled successfully in 5.3s`；55 路由生成；**无 `warnings:` 段**（Turbopack 过度追踪警告归零达成） |

## 六、独立发现的问题

### P1：`.png` Content-Type 丢失（已修复）

- **现象**：`src/app/api/file/[...path]/route.ts` 的 `CONTENT_TYPES` 丢失 `.png` 条目。
- **影响**：上传 PNG 后 `/uploads/xxx.png` 直读返回 `application/octet-stream`（浏览器直接下载而非内联显示）。属对 main 功能的对等性回归（main 的 CONTENT_TYPES 含 `.png`）。
- **定位**：`git diff 023ab68 5e5fa38` 中该文件把 3 行映射压缩成 2 行时误删 `.png`。
- **修复**：`8a24fd1` 恢复 `.png` 条目，同时补齐该文件与 `storage.ts` 末尾缺失换行符。
- **验证**：typecheck 0，`npm test` 682 passed（无回归）。

**反证自问**：会不会是 `ALLOWED_TYPES` 已限制 png 上传，所以直读不需要 png？——不成立。`ALLOWED_TYPES`（upload route）含 `"image/png": ".png"`，说明 PNG **可以**上传落盘，那么直读路径必须能映射 `.png`，否则上传成功但展示错乱。这是真实回归。

### P2：文件末尾缺换行符（已修复）

- `src/lib/storage.ts` 与 `src/app/api/file/[...path]/route.ts` diff 末尾显示 `\ No newline at end of file`。
- 影响：POSIX 兼容性与 diff 噪音；不影响运行。
- 修复：`8a24fd1` 补上。

## 七、证据缺口与局限

1. **standalone 排除 uploads 无法本地复现**：`next.config.ts` 行 7 `output: isWindows ? undefined : "standalone"`，本机 win32 构建不产出 standalone。执行者证据 §七 记录其曾在强制 `isWindows=false` 下验证过 standalone 仅含 5 项且 uploads/backups/data 排除，但**该验证属临时改配置**，交付代码还原后**尚未在 Linux 环境再确认**。此项标 **UNKNOWN**，需 D-14 部署演练在 Linux/Docker 侧复跑 `npm run build && test ! -d .next/standalone/uploads`。
2. **子智能体独立复审调度中断**：本次复审连续 2 次派发子智能体均未返回结果/未落盘（熔断触发）。复审改由主代理独立执行，**独立性有所下降**（主代理了解执行意图）。作为补偿，本报告所有结论均附具体命令输出与 diff 行号证据，避免自证循环。
3. **Turbopack warning 归零**：`npm run build` 已确认无 `warnings:` 段，但 build log 未逐次抓取完整输出（本次仅抓 `grep -iE "warnings|warning"` 为空 + 尾部无警告段）。属可接受确认强度。

## 八、放行条件（转 D-10 及后续）

1. **D-14 部署演练（Linux）**：必须在 Linux 环境跑 `npm run build`，确认 `.next/standalone/` 不含 `uploads/backups/data/docs/scripts/tests/AGENTS.md/CLAUDE.md/Dockerfile/docker-compose.yml`，同时确认 `instrumentation.js.nft.json` 未把运行目录带回 trace。此项是本卡核心目标 I14 的唯一闭环验证，当前仅 `UNKNOWN`。
2. **D-10 存储/媒体收尾**：`collect-engine` 的 `transferImage` 中 `await sharp(...).then(...).catch(...)` 的 promise 链在 `catch` 后仍会执行 `prisma.media.create`（`await` 已捕获错误），无资源泄漏风险；但建议 D-10 检查该函数对 `sharp` 失败时的回退（当前 `contentType` 未回退，若 `sharp` 抛错则 `.catch(() => undefined)` 后仍写入原始 buffer，行为正确）。此项为提示非阻塞。
3. **V7-SEC-02/review.md 未提交**：`git status` 中 `docs/design/06_validation/evidence/V7/V7-SEC-02/review.md` 仍为未跟踪状态，属上一卡 V7-SEC-02 遗留（非本卡范围），建议集成者随下一轮 docs 提交一并纳入。

## 九、最终判断

- **结论**：D-09 卡 PASS（完成度 95%），放行 D-10。复审发现的 P1/P2 缺陷已由 `8a24fd1` 修复并回归验证。
- **依据**：§三冻结面核对全部 PASS；§五验收 7 项全部 PASS；门禁 lint/typecheck/test/build 全部 exit 0；唯一 UNKNOWN 是 standalone 需 Linux 环境复跑（已登记放行条件 1）。
- **前提**：`outputFileTracingExcludes` 的 `"*"` 键按 Next 16 语义匹配所有 route；`output: isWindows ? undefined : "standalone"` 保持 win32 下不出 standalone 的行为。
- **局限性**：本次复审未在 Linux/Docker 实机复现 standalone 排除效果；子智能体调度中断导致复审独立性降低。
- **允许进入下一阶段**：**是**，建议推进 D-10（存储/媒体/采集收尾）。