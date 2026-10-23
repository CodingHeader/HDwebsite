# V8-UI-01 独立验证报告（V9-V-01）

- 验证者：子代理（与执行者上下文隔离；仅依据 diff + 可重跑命令）
- 验证日期：2026-10-23；代码基线：upgrade@fad1924
- 被验提交：a88a283（feat(V8-UI-01): 管理端五态补齐——7 页补 ErrorState、5 页补骨架屏）
- **结论：PASS**（附 findings：110 格矩阵为按页口径交付，见逐条表与备注）

## 逐条验收

| 验收条目（引自卡定义） | 结果 | 证据 |
| --- | --- | --- |
| 矩阵 110 格全部有组件（证据表） | PASS（按页口径，非逐格） | 执行证据 §3 给出按页核查表：27 页由 CrudPage 统一五态 + 13 自定义页逐页标注 F/E/S/M 四态实测值；2 处语义例外（login 公开页无鉴权态、settings 分组表单无列表空态）有书面理由。**非 22×5=110 逐格脚本断言**；卡前提「22 资源页」与仓库实际 40 个 page.tsx 不符，实际覆盖面更广。执行证据已如实登记「逐格断言未做」 |
| ux-states.spec 通过 | PASS | 验证者亲跑 `npm run test:e2e -- ux-states` → **20 passed (19.2s)**：6 代表页 × 403/500/空列表 + 骨架屏（拖慢接口 1.5s 断言 skeleton testid）+ 成功态（真实 7 条通知规则），全部 ok |
| a11y serious/critical=0 | PASS | 验证者亲跑 `npx playwright test -c tests/a11y/playwright.config.ts` → **12 passed (37.3s)**（manager 11 页 + smoke 登录页，逐条「无 serious/critical」） |
| /manager/articles gzip 不回涨超过 2% | PASS（引用证据） | 执行证据 §4.3：284,100 → 284,125 B（**+25 B，+0.01%**）。复测需 build + measure-baseline，超本验证预算未重跑；+25B 量级远低于 2%，与 diff 仅接线既有共享组件（ErrorState/PageSkeleton 已在 chunk 内）相符 |

## 允许修改路径核对

卡允许：`src/components/manager/**`、`src/app/manager/**`、`tests/e2e/ux-states.spec.ts`、证据目录。实改（git show --stat a88a283）：

| 文件 | 判定 |
| --- | --- |
| src/app/manager/{articles,collect-items,content-hub,knowledge-bases,llm-providers,notify-rules,publish-jobs,wechat-accounts}/page.tsx 共 8 文件 | 允许（diff 审阅：统一插入 `if (error && !isForbidden(error)) return <ErrorState .../>` 与 `loading && !error → PageSkeleton`，onRetry 接既有 reload；无权限态仍由 403 契约码驱动，未在前端猜权限——符合卡执行步骤 2） |
| tests/e2e/ux-states.spec.ts（新增 106 行） | 允许 |
| docs/design/06_validation/evidence/V8/UI-01/execution.md | 允许（证据） |
| docs/V0.8-20261022/state.json | 协议状态文件，按协议口径豁免 |

无越界（`src/components/manager/**` 本卡未改动，属正常）；未触碰冻结面。

## 未重跑/受限项

- gzip 复测未跑（需 build）；引用执行证据并注明。
- 卡验证命令 `npm run test:e2e -- ux-states a11y` 中的 a11y 过滤器在 tests/e2e 配置下无对应 spec（a11y 位于 tests/a11y 独立配置），验证者按其真实位置分别重跑两个套件，结果已合并计入上表。
- 未逐页起服务人工核对 40 页五态；以 ux-states 20 用例（route mock 驱动）+ 12 a11y + diff 审阅为据。

## 备注

1. 「110 格」交付口径偏差已在执行证据 §5 诚实登记（按页核查 + 语义例外，非逐格断言）；ux-states 仅覆盖 6 代表页。若需严格 110 格，建议扩为逐页 5 态断言（执行证据预估 +3 分钟 e2e 时长）。
2. 修补前缺陷定性属实：13 个自定义页多数仅处理 403，非 403 失败静默渲染空表——本卡以最小 diff 补齐 ErrorState/骨架，审阅认可。
3. 执行证据与重跑结果无冲突。
