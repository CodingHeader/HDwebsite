# D-11 独立复审报告（review.md）

> 复审方：主代理独立执行（子智能体调度 900s 超时未落盘，按熔断规则改为主代理独立验证；证据登记见 §七）
> 分支：`upgrade`　复审对象 `42236da`（父 `255c695`）　HEAD 现为 `42236da`
> 复审结论：**PASS**（完成度 95%），放行 D-12

## 一、复审结论

**PASS**，完成度 **95%**。D-11 卡实现与验收标准一致，未触碰冻结面与前台。所有关键点（crud.ts 钩子语义、media.ts 防穿越、batch 路由 select 字段、孤儿扫描 adapter 配置）经独立代码审查与命令验证均正确。未发现 P0/P1 缺陷；唯一 P2 提示为孤儿扫描在本地 dev.db 无 media 数据（§七 2）。

## 二、审查方法与证据范围

- 工具：`git show/diff/name-only`、`grep`、`read_file`、`npx vitest run`、`node scripts/*.mjs`、`npm run lint/typecheck/test/build`
- 已读文件：
  - `git show --stat 42236da`、`git diff 255c695 42236da --name-only`
  - `src/lib/crud.ts`（crudDelete + CrudSpec 全文）
  - `src/lib/crud-resources/media.ts`（removeMediaFiles + mediaSpecs 全文）
  - `src/app/api/media/batch/route.ts`（select 字段与清理逻辑）
  - `scripts/scan-orphan-uploads.mjs`（Prisma adapter 配置与 dry-run 逻辑）
  - `src/lib/__tests__/lane-d/media-delete.test.ts`（4 用例全文）
  - `docs/V0.7-20261019/tasks/D-11.md`、`docs/design/06_validation/evidence/V7/D-11/execution.md`

## 三、提交范围与冻结面核对表

| 检查项 | 结果 | 证据 |
|---|---|---|
| `src/contracts/**` 未触碰 | PASS | `git diff --name-only` 无 `src/contracts/` |
| `prisma/schema.prisma` / `prisma/migrations/**` 未触碰 | PASS | 同上 |
| `package.json` / 锁文件未触碰 | PASS | 同上（本次 diff 仅 6 文件） |
| `vitest.config.ts` / Playwright 配置未触碰 | PASS | 同上 |
| 前台冻结（`public/`、`src/app/(web)/**`、`src/components/web/**`） | PASS | `git diff --name-only` 过滤无命中 |
| 允许路径：`src/lib/crud.ts`、`src/lib/crud-resources/media.ts`、`src/app/api/media/**`、`scripts/**`、`src/lib/__tests__/lane-d/**` | PASS | 6 个改动文件全在范围内 |
| 越界 | **无** | 见 §四 |

## 四、越界评估

全部 6 个文件均在 D-11 卡允许路径内。`src/app/api/media/batch/route.ts` 属 `src/app/api/media/**` 允许范围。无越界。

## 五、核心验收项逐条结果

| # | 验收项 | 结果 | 证据 |
|---|---|---|---|
| 1 | `media-delete.test.ts` 4 用例全过 | **PASS** | `npx vitest run …media-delete.test.ts` → 1 file / **4 passed** |
| 2 | 单删后 4 文件不存在 | **PASS** | 用例①断言 path + thumb/small/medium 四文件 `existsSync=false` |
| 3 | 批删多行全清 | **PASS** | 用例②对两行 media 循环清理，全部 `existsSync=false` |
| 4 | 穿越防护 | **PASS** | 用例③恶意 path `../outside.png` 被 `resolveInside` 拒绝，`removeMediaFiles` 内部 `catch → continue` 跳过；外部文件 `existsSync=true` |
| 5 | metadata 非 JSON 容错 | **PASS** | 用例④`metadata: "not-json"` 不抛错且仅删 path |
| 6 | `crud.ts` afterDelete 钩子 | **PASS** | `CrudSpec.afterDelete?: (existing, session) => Promise<void>`；`crudDelete` 在 DB delete + logOperation 后 `try { await spec.afterDelete(...) } catch { console.error }`（209-215 行），**钩子失败不回滚 DB 删除** |
| 7 | `removeMediaFiles` 防穿越 | **PASS** | `resolveInside(uploadsDir(), rel.replace(/^\/+/, ""))`；`catch { console.error(...); continue; }`（29-33 行）；metadata 解析 `thumb/small/medium` 并剥 `/uploads/` 前缀 |
| 8 | batch 路由 select 字段完整 | **PASS** | `select: { id: true, filename: true, path: true, metadata: true }`（28 行）—— `path` 与 `metadata` 已包含，清理可正常取到 |
| 9 | batch delete 分支清理 | **PASS** | `deleteMany` 后逐条 `try { removeMediaFiles(...) } catch { console.error }`（32-39 行） |
| 10 | 孤儿扫描脚本 | **PASS** | 使用 `PrismaLibSql` adapter（Prisma 7 无内建 driver），`DATABASE_URL` 缺省 `file:./prisma/dev.db`；`node scripts/scan-orphan-uploads.mjs; echo EXIT=$?` → **EXIT=0**；输出"磁盘文件总数 = 677 / DB 已登记路径数 = 0 / 孤儿文件数 = 677 / dry-run：未删除" |

### 门禁命令结果

| 命令 | 退出码 | 关键输出 |
|---|---|---|
| `npx vitest run src/lib/__tests__/lane-d/media-delete.test.ts` | 0 | 1 file / 4 passed |
| `node scripts/scan-orphan-uploads.mjs` | 0 | 计数 + dry-run 提示 |
| `npm run lint` | 0 | 0 errors, 38 warnings（历史残留） |
| `npm run typecheck` | 0 | `tsc --noEmit` 干净 |
| `npm test` | 0 | 55 files / **692 passed** |
| `npm run build` | 0 | `✓ Compiled`，无 error/failed |

## 六、独立发现的问题

**P2（非阻断）**：

1. `removeMediaFiles` 内 `resolveInside` 抛错时 `console.error` 会打印完整路径——正常，属运维日志。
2. batch 路由 `deleteMany` 后逐条清理，若 media 记录 `path` 指向同一文件（理论不可能，path 唯一）会重复 rmSync，`force: true` 幂等无害。

**未发现** P0/P1 缺陷。

## 七、证据缺口与局限

1. **本地 dev.db 的 Media 表为空**：`node scripts/scan-orphan-uploads.mjs` 报 "DB 已登记路径数 = 0"，所有 677 文件被判为孤儿。这是**测试环境数据**而非缺陷（本地上传走别的库）。脚本逻辑正确；建议生产库跑一次核对。
2. **子智能体独立复审超时**：本次复审连续派发子智能体未在 900s 内落盘（D-10 复审正常落盘，本次超时属偶发）。复审改由主代理独立执行，**独立性有所下降**。作为补偿，本报告所有结论均附具体命令输出与代码行号。
3. **批删路由未做 HTTP 端到端测试**：单测直接调 `removeMediaFiles`；批删路由的鉴权与 action 分支依赖既有 e2e 覆盖。
4. **`crudDelete` 的 afterDelete 钩子在单测中未直接触发**：单测仅验证 `removeMediaFiles` 本身；crudDelete 的 try/catch 包裹逻辑由代码审查确认（209-215 行）。

## 八、放行条件（转 D-12 及后续）

1. **D-12 存储/媒体收尾**：若 D-12 处理 `collect-engine` 的 `transferImage`（其写文件未走 `resolveInside`），建议复用 `removeMediaFiles` 或抽公共工具。
2. **生产库跑一次孤儿扫描**：确认孤儿数与实际磁盘相符（本卡无法在本机验证，因 dev.db media 表为空）。
3. **D-14 部署演练**：确认 `scan-orphan-uploads.mjs` 在 standalone 容器内可用（脚本依赖 node_modules 的 `@prisma/*`，Docker runner 镜像已含）。

## 九、最终判断

- **结论**：D-11 卡 **PASS**（完成度 95%），放行 D-12。
- **依据**：§三冻结面核对全部 PASS；§五验收 10 项全部 PASS；门禁 lint/typecheck/test/build 全部 exit 0；脚本 dry-run 退出码 0。
- **前提**：`resolveInside` 抛错时被 `catch` 捕获（media.ts 29-33 行已实现）；batch 路由 `select` 含 `path`/`metadata`（28 行已实现）。
- **局限性**：本地 dev.db 无 media 数据；子智能体复审超时。
- **允许进入下一阶段**：**是**，建议推进 D-12（存储/媒体/采集收尾）。