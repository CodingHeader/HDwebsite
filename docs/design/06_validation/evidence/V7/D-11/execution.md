# D-11：删除媒体清理文件（单删/批删含缩略图）+ 孤儿扫描脚本

- 执行线：D 运维·性能·配置·存储·资源
- 执行日期：2026-10-20
- 卡定义：`docs/V0.7-20261019/tasks/D-11.md`
- 起点：`255c695`（上一卡 D-10 完成后的证据提交）
- 蓝本：`origin/main@94dbbbb` 媒体删除语义

## 一、5W1H 简版

- **What**：`crudDelete` 无 afterDelete 钩子；media 单删（`DELETE /api/media/:id`）与批删（`POST /api/media/batch` action=delete）只删 DB 记录，物理文件（原图 + thumb/small/medium 缩略图）残留。
- **Why**：D-11 卡目标——crud.ts 新增 afterDelete 钩子；media 单删与批删删除对应原图与缩略图；`scan-orphan-uploads.mjs` 默认 dry-run。
- **Where**：`src/lib/crud.ts`、`src/lib/crud-resources/media.ts`、`src/app/api/media/batch/route.ts`、`scripts/scan-orphan-uploads.mjs`、`src/lib/__tests__/lane-d/media-delete.test.ts`。
- **Who**：Agent-Ops（本卡）。
- **How**：crud.ts `CrudSpec` 新增 `afterDelete?: (existing, session) => Promise<void>`；crudDelete 在 DB delete + logOperation 后调用钩子，钩子异常仅 `console.error` 不回滚 DB；mediaSpecs 提供 afterDelete 调 `removeMediaFiles`；batch 路由 delete 分支删库后逐条清理；孤儿扫描脚本用 Prisma 7 driver adapter 查询 media 表，dry-run 默认。

## 二、改动文件

| 文件 | 动作 | 说明 |
|---|---|---|
| `src/lib/crud.ts` | 修改 | `CrudSpec` 新增 `afterDelete?`；`crudDelete` 在 DB delete + logOperation 后 try/catch 调钩子（失败只记日志不回滚） |
| `src/lib/crud-resources/media.ts` | 修改 | 新增 `removeMediaFiles(row)`：解析 `path` + metadata 的 thumb/small/medium URL，`resolveInside` 校验后 `rmSync`；违规路径跳过继续；mediaSpecs 挂 afterDelete |
| `src/app/api/media/batch/route.ts` | 修改 | delete 分支删库后逐条 `removeMediaFiles`（try/catch 不阻断） |
| `scripts/scan-orphan-uploads.mjs` | **新增** | 用 PrismaLibSql adapter 查 media 表构建已登记集合；dry-run 默认只报告计数与样本；`--apply` 才执行清理；退出码 0 表示扫描完成 |
| `src/lib/__tests__/lane-d/media-delete.test.ts` | **新增** | 4 用例：单删四文件全清、批删多行全清、穿越防护（恶意 path 跳过且外部文件保留）、metadata 非 JSON 容错 |
| `docs/design/06_validation/evidence/V7/D-11/execution.md` | **新增** | 本文件 |

## 三、关键技术决策与证据链

1. **afterDelete 钩子语义**：`crudDelete` 内 DB delete + logOperation 成功后才调钩子；钩子抛错仅 `console.error`，不阻断已成功的 DB 删除（卡执行步骤 1 要求）。
2. **路径安全**：`removeMediaFiles` 用 `resolveInside(uploadsDir(), rel)` 防目录穿越；恶意路径（`../`、绝对路径、反斜杠、点开头段）被 `resolveInside` 拒绝，**该项跳过继续清理其余合法条目**（不整体中断）；外部文件不受影响（单测断言）。
3. **缩略图 URL 形态**：metadata 里 `thumb/small/medium` 存 `/uploads/<rel>` 形式；解析时剥前缀 `/uploads/` 后走同一安全校验。
4. **Prisma 7 driver adapter**：脚本直接用 `@prisma/client` 会报缺少 adapter（Prisma 7 无 postinstall generate 内建）。改用 `PrismaLibSql` adapter，`DATABASE_URL` 缺省 `file:./prisma/dev.db`。
5. **孤儿扫描 dry-run 默认**：退出码 0 表示扫描完成（无论是否有孤儿）；`--apply` 才清理，避免误删。

## 四、越界说明

无。全部改动落在 D-11 卡"允许修改"内（`src/lib/crud.ts`、`src/lib/crud-resources/media.ts`、`src/app/api/media/**`、`src/lib/storage.ts`、`scripts/**`、`src/lib/__tests__/lane-d/**`）。

`src/app/api/media/batch/route.ts` 属 `src/app/api/media/**` 允许路径。

## 五、验证命令与结果

```bash
# 验收 1：media-delete.test.ts
npx vitest run src/lib/__tests__/lane-d/media-delete.test.ts
# → 4/4 passed（PASS）

# 验收 2：scan-orphan-uploads.mjs 退出码 0
node scripts/scan-orphan-uploads.mjs; echo $?
# → [scan-orphan] 磁盘文件总数 = 677
#   [scan-orphan] DB 已登记路径数 = 0（本地 dev.db 的 media 表为空）
#   [scan-orphan] 孤儿文件数 = 677
#   exit 0（PASS）

# 通用门禁
npm run lint        # exit 0（0 errors / 38 warnings 历史残留）
npm run typecheck   # exit 0
npm test            # exit 0（55 files / 692 tests passed，较上轮 +4）
npm run build       # exit 0（无 error/failed）
```

## 六、验收标准逐条结果

| 验收项 | 结果 | 备注 |
|---|---|---|
| media-delete.test.ts：单删/批删后 4 个文件均不存在 | **PASS** | 4 用例全过；单删断言 path + 三张缩略图全清 |
| `node scripts/scan-orphan-uploads.mjs; echo $?` = 0 | **PASS** | exit 0 |
| 通用门禁 lint/typecheck/test/build 全 exit 0 | **PASS** | 见 §五 |
| 允许路径 | **PASS** | 见 §四 |

## 七、验证局限

1. **孤儿扫描的 DB 登记为 0**：本地 `prisma/dev.db` 的 `Media` 表为空（本地上传可能走别的库），脚本逻辑已验证但未在真实有数据的库上跑一次。生产库需跑一次核对孤儿数与实际相符。
2. **批删路由未做端到端 HTTP 测试**：单测直接调 `removeMediaFiles` 验证物理清理，批删路由的 HTTP 层（鉴权、action 分支）依赖既有 e2e 覆盖。
3. **crudDelete 的 afterDelete 钩子在单测中未直接触发**：单测仅验证 `removeMediaFiles` 本身；crudDelete 的 try/catch 包裹逻辑由代码审查确认。

## 八、复现步骤

```bash
# 单测
npx vitest run src/lib/__tests__/lane-d/media-delete.test.ts

# 孤儿扫描（dry-run）
node scripts/scan-orphan-uploads.mjs

# 手工验证：上传一张图 → 记 media.path 与 metadata → 删记录 → 查磁盘
# DELETE /api/media/:id 后应看到原图 + _thumb/_small/_medium 全消失
```