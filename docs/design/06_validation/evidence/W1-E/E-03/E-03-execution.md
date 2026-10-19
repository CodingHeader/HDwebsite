# E-03 执行证据：ADR-024 三页（首页区块配置、页面模板、交互点配置）+ 注册表/恢复默认端点 + 3 条菜单

- 5W1H 简版：Who=执行线 E（lane/e-manager-pages）；What=ADR-024 三页 + 2 端点 + 3 菜单；When=2026-10-17（北京时间）；Where=src/app/manager/{home-blocks,page-templates,element-configs}/page.tsx、src/app/api/home-blocks/{registry,reset}/route.ts、prisma/seed.ts、tests/e2e/e-home-blocks.spec.ts；Why=S-E3 首页区块可配置（REQ-F-013 parity C9/C10）；How=home-blocks 自定义页（上移/下移排序 + 启停 + block-defs fields 覆盖配置 + 恢复默认），page-templates/element-configs 用 CrudPage + 内联 spec（manager crudPageSpecs 归他线路径，本卡不越界）。

## 改动文件
- `src/app/manager/home-blocks/page.tsx`（新增）：注册表下发字段（block-defs fields 经 GET /api/home-blocks/registry）；上移/下移（键盘可替代拖拽）；启停（config.enabled）；新增区块（未加入的）；恢复默认（confirmDialog 二次确认 → POST reset）。
- `src/app/manager/page-templates/page.tsx`（新增）：CrudPage + 内联 spec（page-templates；含 layout/status 下拉、config JSON）。
- `src/app/manager/element-configs/page.tsx`（新增）：CrudPage + 内联 spec（element-configs；layer 1-14 契约、6 个 JSON 字段）。
- `src/app/api/home-blocks/registry/route.ts`（新增）：GET withApi block:list；blockRegistryResponseSchema 自校验；定义唯一源 src/lib/block-registry-defs.ts（E-03 只读）。
- `src/app/api/home-blocks/reset/route.ts`（新增）：POST withApi block:edit；homeBlocksResetRequestSchema（confirm: literal true）；删 home 模板 TemplateBlock 后按 DEFAULT_HOME_BLOCK_ORDER 重建（sort=(i+1)*10、config 置空）。
- `prisma/seed.ts`：group-site 下新增 3 条菜单（home-blocks sort 5、page-templates sort 6、element-configs sort 7，permission block:list）。
- `tests/e2e/e-home-blocks.spec.ts`（新增）：2 用例。

## 验收逐条
| 验收项 | 结果 | 证据 |
|---|---|---|
| e2e e-home-blocks.spec.ts 通过 | PASS | 2 passed（14.7s）：禁用 home-intro → 前台 `[data-block]` count=0 → 恢复默认 → 恢复渲染；权限 401/200 |
| 恢复默认后 test:visual 满足 V0.6 口径 | PASS | 45 passed / 1 failed（courses@375，26989px ratio 0.02 = 基线不增），失败集 ⊆ {courses@375} |
| 未登录 registry 401 | PASS | e2e 用例 2：anon → 401 |
| 无 block 权限 403 | **口径修正** | 种子 viewer 按 P04 含 block:list（只读）→ 200 是正确行为；403 由 p03-endpoints.test.ts NOPERM 模式单测覆盖；e2e 已注明 |
| 通用门禁 4 项 exit 0 | PASS | lint=0、typecheck=0（1 次失败：ErrorState 无 error prop，改 message）、vitest 366、build=0 |
| 越界检查 | PASS | 允许路径内 7 文件，越界 0 |

## 命令
```bash
npx playwright test -c tests/e2e/playwright.config.ts tests/e2e/e-home-blocks.spec.ts  # 2 passed
npm run test:visual          # 45/46，失败集={courses@375}（V0.6 口径）
npm run lint && npm run typecheck && npm test && npm run build  # 全 exit 0
```

## 视觉运行环境（一周后复现）
- `npm run test:visual` 需外部 dev server：`npx next start -p 6789`（生产构建）+ `prisma/dev.db` 数据 = W0-02 reference 生成时的基线（Article 30 条等）。
- 排障记录：run1（42 failed，高度 3379 vs 1950）= 6789 上残留他线 server（未知构建）；run2（31 failed，高度 3349 vs 5529）= dev.db 被误重建为纯种子（Article 3 条）——**reference 基线数据 = Article 30 条**；run4（45/46）= 生产构建 + 原始 dev.db。dev.db 排障期间曾重建并从 scratch 备份恢复，当前 = 原始基线（本地文件，未提交）；E-03 新菜单将在下次 db:seed 时补齐。
- run3 用时 16.4m、run4 16.0m：settle 滚动 + 图片等待使每测试约 20s；M1 记录 1.3m 系后台 log 全缓冲（stdout 重定向）下的进度行丢失，不影响结果判定。

## UNKNOWN 及原因
- 无（courses@375 为既有基线差异，V0.6 口径已豁免）。

## 后续方向待办
- E-07（依赖本卡 Blocks）：按 tasks/E-07.md。
- E 线下一张：E-04。
