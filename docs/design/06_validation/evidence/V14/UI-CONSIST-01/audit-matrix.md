# V14-UI-CONSIST-01 管理端一致性审计矩阵

> 审计时间：2026-10-27 · 执行者：external-assistant · 范围：42 个 `src/app/manager/**/page.tsx`
> 5 项自动化判定 + 3 项人工待核（五态覆盖 / 键盘可达 / 375px 可用，由主控复核，不伪造判定）。

## 汇总

| 项 | 数值 |
|---|---|
| 审计页数 | 42 |
| 原生控件 FAIL | 0 |
| 原生反馈 FAIL | 0 |
| 令牌作用域 FAIL | 2 |
| PageHeader 缺失 | 29 |
| 前台零改动 | 0 |

## 矩阵（42 行 × 8 列 + 结论）

| 页面 | 原生控件 | 原生反馈 | 令牌作用域 | PageHeader | 前台零改动 | 五态覆盖 | 键盘可达 | 375px 可用 | 结论 |
|---|---|---|---|---|---|---|---|---|---|
| src/app/manager/articles/page.tsx | PASS | PASS | PASS | PASS | N-A(本卡仅 manager) | 待核 | 待核 | 待核 | 待主控复核人工项 |
| src/app/manager/banners/page.tsx | PASS | PASS | PASS | FAIL | N-A(本卡仅 manager) | 待核 | 待核 | 待核 | 缺 PageHeader |
| src/app/manager/campus/page.tsx | PASS | PASS | PASS | FAIL | N-A(本卡仅 manager) | 待核 | 待核 | 待核 | 缺 PageHeader |
| src/app/manager/categories/page.tsx | PASS | PASS | PASS | FAIL | N-A(本卡仅 manager) | 待核 | 待核 | 待核 | 缺 PageHeader |
| src/app/manager/chat-history/page.tsx | PASS | PASS | PASS | PASS | N-A(本卡仅 manager) | 待核 | 待核 | 待核 | 待主控复核人工项 |
| src/app/manager/chat-scenes/page.tsx | PASS | PASS | PASS | FAIL | N-A(本卡仅 manager) | 待核 | 待核 | 待核 | 缺 PageHeader |
| src/app/manager/collect-items/page.tsx | PASS | PASS | PASS | PASS | N-A(本卡仅 manager) | 待核 | 待核 | 待核 | 待主控复核人工项 |
| src/app/manager/collect-sources/page.tsx | PASS | PASS | PASS | FAIL | N-A(本卡仅 manager) | 待核 | 待核 | 待核 | 缺 PageHeader |
| src/app/manager/collect-tasks/page.tsx | PASS | PASS | PASS | FAIL | N-A(本卡仅 manager) | 待核 | 待核 | 待核 | 缺 PageHeader |
| src/app/manager/content-hub/page.tsx | PASS | PASS | FAIL | PASS | N-A(本卡仅 manager) | 待核 | 待核 | 待核 | 硬编码色值待修 |
| src/app/manager/courses/page.tsx | PASS | PASS | PASS | FAIL | N-A(本卡仅 manager) | 待核 | 待核 | 待核 | 缺 PageHeader |
| src/app/manager/element-configs/page.tsx | PASS | PASS | PASS | FAIL | N-A(本卡仅 manager) | 待核 | 待核 | 待核 | 缺 PageHeader |
| src/app/manager/enrollment-offerings/page.tsx | PASS | PASS | PASS | FAIL | N-A(本卡仅 manager) | 待核 | 待核 | 待核 | 缺 PageHeader |
| src/app/manager/gallery/page.tsx | PASS | PASS | PASS | FAIL | N-A(本卡仅 manager) | 待核 | 待核 | 待核 | 缺 PageHeader |
| src/app/manager/home-blocks/page.tsx | PASS | PASS | PASS | PASS | N-A(本卡仅 manager) | 待核 | 待核 | 待核 | 待主控复核人工项 |
| src/app/manager/home-cards/page.tsx | PASS | PASS | PASS | FAIL | N-A(本卡仅 manager) | 待核 | 待核 | 待核 | 缺 PageHeader |
| src/app/manager/hot-majors/page.tsx | PASS | PASS | PASS | FAIL | N-A(本卡仅 manager) | 待核 | 待核 | 待核 | 缺 PageHeader |
| src/app/manager/knowledge-bases/page.tsx | PASS | PASS | PASS | PASS | N-A(本卡仅 manager) | 待核 | 待核 | 待核 | 待主控复核人工项 |
| src/app/manager/knowledge/page.tsx | PASS | PASS | PASS | FAIL | N-A(本卡仅 manager) | 待核 | 待核 | 待核 | 缺 PageHeader |
| src/app/manager/llm-providers/page.tsx | PASS | PASS | PASS | PASS | N-A(本卡仅 manager) | 待核 | 待核 | 待核 | 待主控复核人工项 |
| src/app/manager/login/page.tsx | PASS | PASS | FAIL | FAIL | N-A(本卡仅 manager) | 待核 | 待核 | 待核 | 硬编码色值待修；缺 PageHeader |
| src/app/manager/logs/page.tsx | PASS | PASS | PASS | FAIL | N-A(本卡仅 manager) | 待核 | 待核 | 待核 | 缺 PageHeader |
| src/app/manager/majors/page.tsx | PASS | PASS | PASS | FAIL | N-A(本卡仅 manager) | 待核 | 待核 | 待核 | 缺 PageHeader |
| src/app/manager/media/page.tsx | PASS | PASS | PASS | PASS | N-A(本卡仅 manager) | 待核 | 待核 | 待核 | 待主控复核人工项 |
| src/app/manager/navigations/page.tsx | PASS | PASS | PASS | FAIL | N-A(本卡仅 manager) | 待核 | 待核 | 待核 | 缺 PageHeader |
| src/app/manager/news/page.tsx | PASS | PASS | PASS | FAIL | N-A(本卡仅 manager) | 待核 | 待核 | 待核 | 缺 PageHeader |
| src/app/manager/notify-recipients/page.tsx | PASS | PASS | PASS | FAIL | N-A(本卡仅 manager) | 待核 | 待核 | 待核 | 缺 PageHeader |
| src/app/manager/notify-records/page.tsx | PASS | PASS | PASS | FAIL | N-A(本卡仅 manager) | 待核 | 待核 | 待核 | 缺 PageHeader |
| src/app/manager/notify-rules/page.tsx | PASS | PASS | PASS | PASS | N-A(本卡仅 manager) | 待核 | 待核 | 待核 | 待主控复核人工项 |
| src/app/manager/notify-templates/page.tsx | PASS | PASS | PASS | FAIL | N-A(本卡仅 manager) | 待核 | 待核 | 待核 | 缺 PageHeader |
| src/app/manager/page-templates/page.tsx | PASS | PASS | PASS | FAIL | N-A(本卡仅 manager) | 待核 | 待核 | 待核 | 缺 PageHeader |
| src/app/manager/page.tsx | PASS | PASS | PASS | PASS | N-A(本卡仅 manager) | 待核 | 待核 | 待核 | 待主控复核人工项 |
| src/app/manager/partners/page.tsx | PASS | PASS | PASS | FAIL | N-A(本卡仅 manager) | 待核 | 待核 | 待核 | 缺 PageHeader |
| src/app/manager/publish-jobs/page.tsx | PASS | PASS | PASS | PASS | N-A(本卡仅 manager) | 待核 | 待核 | 待核 | 待主控复核人工项 |
| src/app/manager/roles/page.tsx | PASS | PASS | PASS | FAIL | N-A(本卡仅 manager) | 待核 | 待核 | 待核 | 缺 PageHeader |
| src/app/manager/service-guides/page.tsx | PASS | PASS | PASS | FAIL | N-A(本卡仅 manager) | 待核 | 待核 | 待核 | 缺 PageHeader |
| src/app/manager/settings/page.tsx | PASS | PASS | PASS | PASS | N-A(本卡仅 manager) | 待核 | 待核 | 待核 | 待主控复核人工项 |
| src/app/manager/students/page.tsx | PASS | PASS | PASS | FAIL | N-A(本卡仅 manager) | 待核 | 待核 | 待核 | 缺 PageHeader |
| src/app/manager/tags/page.tsx | PASS | PASS | PASS | FAIL | N-A(本卡仅 manager) | 待核 | 待核 | 待核 | 缺 PageHeader |
| src/app/manager/user-actions/page.tsx | PASS | PASS | PASS | FAIL | N-A(本卡仅 manager) | 待核 | 待核 | 待核 | 缺 PageHeader |
| src/app/manager/users/page.tsx | PASS | PASS | PASS | FAIL | N-A(本卡仅 manager) | 待核 | 待核 | 待核 | 缺 PageHeader |
| src/app/manager/wechat-accounts/page.tsx | PASS | PASS | PASS | PASS | N-A(本卡仅 manager) | 待核 | 待核 | 待核 | 待主控复核人工项 |
