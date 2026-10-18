# E-05 执行证据：特殊页迁移 A（articles 接 PATCH 一键上下线、publish-jobs、collect-items、content-hub）

- 5W1H 简版：Who=执行线 E（lane/e-manager-pages）；What=四页原生控件替换为设计系统组件 + 文章行操作「上线/下线」（PATCH /api/articles/[id]）+ crud-article 持久化断言；When=2026-10-17（北京时间）；Where=src/app/manager/{articles,publish-jobs,collect-items}/page.tsx、src/components/manager/crud-specs.tsx、tests/e2e/crud-article.spec.ts；Why=S-E5 内容链页面统一（REQ-F-015；P03-execution:104 B3 文章 PATCH 前端未接）；How=逐页迁移保留 testid 与 aria-label（e2e 选择器不破）。

## 改动文件
- `src/app/manager/articles/page.tsx`：手写 `<table>`+TableState → **DataTable**（含分页/移动卡片视图）；`<select>` 频道筛选 → **Select**；`<button>`/`<a>` → **Button/LinkButton**；状态 Badge 化；行操作新增「上线/下线」→ PATCH `{status: "published"|"draft"}`（首次发布写 publishedAt，main parity B3）；保留 article-create testid 与全部 aria-label。
- `src/app/manager/publish-jobs/page.tsx`：table→DataTable（状态列含 errMsg 副行）、button→Button、Pagination→DataTable 内置；行操作重试/取消条件渲染逻辑不变。
- `src/app/manager/collect-items/page.tsx`：table→DataTable、审阅弹窗 input/textarea/button→Input/Textarea/Button；审阅/通过/拒绝行操作保留 aria-label。
- `src/components/manager/crud-specs.tsx`：**collect-sources 加 `defaults: { autoApprove: false }`**——E-05 回归修复（见下）。
- `tests/e2e/crud-article.spec.ts`：+保存后 reload 重新 GET 断言持久化（P05-verify:41 承接）+「下线→上线」用例（PATCH 断言状态 Badge 翻转）；500/EmptyState 断言适配 DataTable 双渲染（first()）。

## 关键回归修复（E-01 引入，E-05 发现并修复）
- `CrudPage.defaultValues` 对所有 switch 字段新建默认 `true`（既有行为）× E-01 新增 `autoApprove` switch → **新建采集源 autoApprove 默认开启**，违反 ADR-017「默认关闭」（契约 resources.ts:316 default false）→ 采集条目跳过人工审核 → collect-publish e2e 待审列表空、失败两次。
- 修复：spec.defaults 显式覆盖（CrudPage.tsx:63/129 机制）；重跑 collect-publish 1 passed（1.2m）。
- 排障链：失败 2 次（4.0m×2 超时）→ e2e.db 查证 CollectItem 全部 approved + Source.autoApprove=1 → 临时诊断 spec 复现（待审列表 0 行）→ 定位 defaultValues → 修复 → 复跑通过。

## 验收逐条
| 验收项 | 结果 | 证据 |
|---|---|---|
| 严格正则四页 0 原生控件 | PASS | `grep -rnE "<(table\|input\|select\|button\|textarea)(\s\|>\|$)" …{articles,publish-jobs,collect-items,content-hub}` 无匹配（content-hub 为 CrudPage 包装本就无） |
| e2e crud-article/collect-publish 通过 | PASS | collect-publish 1 passed（1.2m，修复后）；crud-article 3 passed；**全量 test:e2e 13 passed（1.4m）** |
| 通用门禁 4 项 exit 0 | PASS | lint=0、typecheck=0、vitest 全过（含 spec-drift 6/6）、build=0（17:30 构建含 autoApprove 修复） |
| 越界检查 | PASS | 允许路径内 5 文件，越界 0 |

## 命令
```bash
npm run test:e2e                    # 13 passed
npm run lint && npm run typecheck && npm test && npm run build  # 全 exit 0
```

## 测试适配说明（非功能变更）
- DataTable 桌面（table 内）与移动卡片（md:hidden）双渲染 stateBlock → error-state/empty-state/error-retry 各 2 个 DOM；spec 断言改 `.first()`（桌面视口下 table 内那份可见）。
- crud-article 的上下线用例：新建时已选 published → 行操作为「下线」→ 调整为先下线后上线。

## UNKNOWN 及原因
- 无。

## 后续方向待办
- E-07/E-09（依赖本卡 Blocks）；E 线下一张：E-06。
