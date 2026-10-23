# V9-E2E-01 执行证据（2026-10-24）

## 5W1H 简版

- **What**：E2E 套件首次在 Linux CI 跑通后暴露 3 例失败（run 39982327648：70/73）；本轮定位根因并全部修复，本地全量 e2e **73/73 全绿**。
- **Why**：三例均为此前不可见的既有健壮性/应用缺陷（E2E 此前从未在 CI 执行过——所有历史 run 死在更早步骤），非本轮改动引入。
- **Where**：`tests/e2e/collect-publish.spec.ts`、`tests/e2e/e-kb-manage.spec.ts`（测试健壮性）+ `src/app/api/knowledge-files/route.ts`（**生产缺陷**）。
- **Who**：修复子代理（三例根因分析+测试修复，因并发上限中断后由主代理接手验证与 API 修复）。
- **When**：2026-10-23 深夜 ~ 10-24 凌晨。
- **How**：逐例 error-context.md 页面快照分析 → 最小修复 → 本地复现验证。

## 三例根因与修复

### 1. collect-publish.spec.ts:24（通知行断言严格模式冲突）
- 根因：CI 无外网 → 种子采集源执行失败 → 同一收件人产生 3 条 `collect_failed` 通知行 + 1 条 `before_publish_news` 行；测试仅按邮箱过滤行 → strict mode violation（4 elements）。
- 修复：行选择器追加 `.filter({ hasText: "before_publish_news" })` 收窄到目标事件行。断言意图不变。
- 本地验证：单文件 1/1 通过。

### 2. e-kb-manage.spec.ts:40/70（确认框等待超时）
- 根因 A（对话框选择器）：`getByRole("dialog")` 会先匹配到上传成功的 base-ui toast（priority=low，role="dialog"，存活 3.5s）——它内部没有「移入回收站」按钮，toast 卸载后匹配归零，表现为 180s 点击超时。ConfirmDialog 实际是 `role="alertdialog"` + `data-testid="confirm-dialog"`。
- 修复：确认框定位统一改为 `page.getByTestId("confirm-dialog")`（3 处）。
- 根因 B（上传去重碰撞）：服务端按 `baseId+sha256` 去重且不排除软删行——固定内容的重复上传会命中前一个用例留下的记录，新文件名永不出现。
- 修复：`uploadMarkdown` 的 buffer 嵌入唯一文件名，保证每次上传内容唯一。

### 3. src/app/api/knowledge-files/route.ts（生产缺陷，由 2 修复后暴露）
- 根因：GET 路由硬编码 `where.deletedAt = null` 且**完全忽略 `trash=1` 查询参数**——管理端回收站视图请求 `?baseId=X&trash=1`，服务端仍只返回未删除行 → **回收站恒为空**。用户"移入回收站"后无法查看/恢复/彻底删除任何文件。
- 修复：`searchParams.get("trash") === "1"` 时改查 `deletedAt: { not: null }`；默认行为不变。与既有 `baseId` 同走 searchParams 直读，**不触冻结契约面**（listQuerySchema 未动）。
- 说明：修复后需 `npm run build` 才在 `next start`（win32 e2e 回退路径）下生效——首次验证未生效即此原因，重建后通过。

## 验收逐条结果

| 条目 | 结果 | 证据 |
|---|---|---|
| 本地 `npm run test:e2e` 全绿 | **PASS** | **73 passed (2.3m)**，0 failed |
| 单测/静态门禁不回退 | **PASS** | lint exit 0（--max-warnings 0）、tsc exit 0、vitest 1712/1712 |
| 无用例删除/跳过、断言不放松 | **PASS** | diff 仅收紧选择器 + 上传内容唯一化 + API 补实现；无 timeout 调大、无 skip |
| CI E2E (Linux) 全绿 | 待本次推送后的 CI run 确认（回填 EXEC-round1） |

## 所有权扩展声明（AGENTS §4 越界报备）

`src/app/api/knowledge-files/route.ts` 超出本卡原允许路径（tests/e2e/**）。理由：该文件缺陷是本卡目标（E2E 全绿）的直接阻断项，属 e2e 门禁抓出的生产缺陷修复（V0.8 T-01"撤 skip 修复生产缺陷"同一性质）；契约面/迁移面零触碰。state.json note 同步。

## 复现命令

```bash
npm run build && npm run test:e2e          # 73/73
npx vitest run && npm run lint && npx tsc --noEmit
# 回收站修复的直接验证：管理端移入回收站后，GET /api/knowledge-files?baseId=<id>&trash=1 应返回该文件
```
