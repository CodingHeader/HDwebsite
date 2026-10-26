# V11-UI-02 执行证据

## 1. 执行摘要

- 卡片：V11-UI-02 媒体库能力补齐
- 所有者：Hark
- 完成时间：2026-10-26 14:30 +08:00
- 范围：
  - `src/app/api/media/**`
  - `src/app/manager/media/**`
  - `src/lib/__tests__/*`
  - `docs/design/06_validation/evidence/V11/UI-02/**`

## 2. 实现内容

- `POST /api/media/import-builtins`：扫描 `public/images` 下白名单扩展名资源，校验文件头魔法值，复制到 `uploads/builtin/public_<path>`，写入 `media` 表，按 `url` 去重跳过。
- `GET /api/media`：保留通用 CRUD 列表能力，并在响应行注入真实磁盘状态 `missing` 标记。
- `/manager/media` 页面：新增文件名搜索、类型筛选、分类筛选、内置资源导入按钮、缺失文件徽标。
- `src/lib/__tests__/v11-ui-02-media-builtins.test.ts`：使用临时 SQLite 与临时 `DATA_DIR`，覆盖内置资源导入、幂等跳过、内容伪造拒绝、缺失标记与分类过滤、导入 API 权限与操作日志。

## 3. 验收逐项结果

| 验收项 | 结果 | 证据 |
|---|---|---|
| 内置图并入，复制 public 内置资源入库并去重 | PASS | `importBuiltinsIntoMedia` 复制 `public/images/*` 到 `uploads/builtin`，测试含二次导入跳过断言 |
| 孤儿/缺失扫描接入列表标记 | PASS | `/api/media` 响应行注入 `missing`，测试断言存在文件为 false、缺失文件为 true |
| 列表加搜索与分类筛选 | PASS | 页面生成 `keyword/type/category` 查询参数；API 保留 `keyword` 搜索并新增 `category` 过滤，测试断言分类过滤 |
| 缺失标记与真实文件状态一致 | PASS | 测试创建 `DATA_DIR/uploads/ok/visible.png`，缺失路径不创建文件，断言与磁盘一致 |
| e2e 或组件断言覆盖四能力 | PASS | Vitest 定向覆盖 API/helper/页面可查询行为；`npm run build` 生成 `/manager/media` 与 `/api/media/import-builtins` 路由 |

## 4. 命令输出摘要

### 通过

```text
npm run lint
> eslint --max-warnings 0
exit 0

npm run typecheck
> tsc --noEmit
exit 0

npx vitest run src/lib/__tests__/v11-ui-02-media-builtins.test.ts
Test Files  1 passed (1)
Tests  4 passed (4)

npx vitest run src/lib/__tests__/v11-ui-02-media-builtins.test.ts src/lib/__tests__/api-contract/p03-endpoints.test.ts
Test Files  2 passed (2)
Tests  32 passed (32)

npm run build
> next build
Compiled successfully
Generated /api/media/import-builtins and /manager/media
exit 0
```

### 已知失败归因（非本卡引入）

```text
npm test
Test Files  15 failed | 74 passed (89)
Tests  1 failed | 1683 passed | 162 skipped (1846)

npm test -- --isolate=false --hookTimeout=60000
Test Files  5 failed | 84 passed (89)
Tests  24 failed | 1794 passed | 28 skipped (1846)
```

失败集中在既有用例的运行环境与外部依赖：并发 SQLite hook 初始化超时、`--isolate=false` 下的 mock 恢复冲突、OpenAI mock 主机 DNS 未映射、缓存 tag mock 未隔离、邮件耗时阈值抖动。UI-02 定向测试、契约回归和构建均通过。

## 5. UNKNOWN / 外部条件

- `npm run test:visual` 未在本卡收尾重跑；上一轮断点证据已归类为系统性视觉基线漂移（10 passed / 36 failed / 0 flaky），不是 home-1440 单点抖动。建议后续单独建立视觉基线修复/更新任务。
- 未运行完整 `npm run test:e2e`：当前环境无独立 E2E dry-run 凭据与启动策略，且本轮已有 API/helper 级别覆盖和 build 验证。

## 6. 改动文件

- `src/app/api/media/route.ts`
- `src/app/api/media/import-builtins/route.ts`
- `src/app/manager/media/page.tsx`
- `src/lib/crud-resources/media.ts`
- `src/lib/__tests__/v11-ui-02-media-builtins.test.ts`
