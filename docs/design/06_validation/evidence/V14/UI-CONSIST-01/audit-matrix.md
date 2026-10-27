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
| PageHeader 缺失 | 0 |
| 前台零改动 | 0 |

## 已知例外（令牌作用域）

经 V15-TOKEN-01 核实，令牌作用域 FAIL 2 处均为正当例外，已登记白名单，本轮不改 className / style。详见 [`whitelist.md`](../../V15/TOKEN-01/whitelist.md)。

| 文件:行号 | 场景 | 判定 |
|---|---|---|
| `src/app/manager/content-hub/page.tsx:531-534` | 公众号阅读界面模拟预览（微信原生配色） | 已登记，不改 |
| `src/app/manager/login/page.tsx:63,68,73,77` | 登录页品牌渐变反白文字 | 已登记，不改 |

## 矩阵（42 行 × 8 列 + 结论）

| 页面 | 原生控件 | 原生反馈 | 令牌作用域 | PageHeader | 前台零改动 | 五态覆盖 | 键盘可达 | 375px 可用 | 结论 |
|---|---|---|---|---|---|---|---|---|---|
| src/app/manager/articles/page.tsx | PASS | PASS | PASS | PASS(direct) | N-A(本卡仅 manager) | 待核 | 待核 | 待核 | 待主控复核人工项 |
| src/app/manager/banners/page.tsx | PASS | PASS | PASS | PASS(CrudPage 间接) | N-A(本卡仅 manager) | 待核 | 待核 | 待核 | 待主控复核人工项 |
| src/app/manager/campus/page.tsx | PASS | PASS | PASS | PASS(CrudPage 间接) | N-A(本卡仅 manager) | 待核 | 待核 | 待核 | 待主控复核人工项 |
| src/app/manager/categories/page.tsx | PASS | PASS | PASS | PASS(CrudPage 间接) | N-A(本卡仅 manager) | 待核 | 待核 | 待核 | 待主控复核人工项 |
| src/app/manager/chat-history/page.tsx | PASS | PASS | PASS | PASS(direct) | N-A(本卡仅 manager) | 待核 | 待核 | 待核 | 待主控复核人工项 |
| src/app/manager/chat-scenes/page.tsx | PASS | PASS | PASS | PASS(CrudPage 间接) | N-A(本卡仅 manager) | 待核 | 待核 | 待核 | 待主控复核人工项 |
| src/app/manager/collect-items/page.tsx | PASS | PASS | PASS | PASS(direct) | N-A(本卡仅 manager) | 待核 | 待核 | 待核 | 待主控复核人工项 |
| src/app/manager/collect-sources/page.tsx | PASS | PASS | PASS | PASS(CrudPage 间接) | N-A(本卡仅 manager) | 待核 | 待核 | 待核 | 待主控复核人工项 |
| src/app/manager/collect-tasks/page.tsx | PASS | PASS | PASS | PASS(CrudPage 间接) | N-A(本卡仅 manager) | 待核 | 待核 | 待核 | 待主控复核人工项 |
| src/app/manager/content-hub/page.tsx | PASS | PASS | FAIL | PASS(direct) | N-A(本卡仅 manager) | 待核 | 待核 | 待核 | 硬编码色值待修 |
| src/app/manager/courses/page.tsx | PASS | PASS | PASS | PASS(CrudPage 间接) | N-A(本卡仅 manager) | 待核 | 待核 | 待核 | 待主控复核人工项 |
| src/app/manager/element-configs/page.tsx | PASS | PASS | PASS | PASS(CrudPage 间接) | N-A(本卡仅 manager) | 待核 | 待核 | 待核 | 待主控复核人工项 |
| src/app/manager/enrollment-offerings/page.tsx | PASS | PASS | PASS | PASS(CrudPage 间接) | N-A(本卡仅 manager) | 待核 | 待核 | 待核 | 待主控复核人工项 |
| src/app/manager/gallery/page.tsx | PASS | PASS | PASS | PASS(CrudPage 间接) | N-A(本卡仅 manager) | 待核 | 待核 | 待核 | 待主控复核人工项 |
| src/app/manager/home-blocks/page.tsx | PASS | PASS | PASS | PASS(direct) | N-A(本卡仅 manager) | 待核 | 待核 | 待核 | 待主控复核人工项 |
| src/app/manager/home-cards/page.tsx | PASS | PASS | PASS | PASS(CrudPage 间接) | N-A(本卡仅 manager) | 待核 | 待核 | 待核 | 待主控复核人工项 |
| src/app/manager/hot-majors/page.tsx | PASS | PASS | PASS | PASS(CrudPage 间接) | N-A(本卡仅 manager) | 待核 | 待核 | 待核 | 待主控复核人工项 |
| src/app/manager/knowledge-bases/page.tsx | PASS | PASS | PASS | PASS(direct) | N-A(本卡仅 manager) | 待核 | 待核 | 待核 | 待主控复核人工项 |
| src/app/manager/knowledge/page.tsx | PASS | PASS | PASS | PASS(CrudPage 间接) | N-A(本卡仅 manager) | 待核 | 待核 | 待核 | 待主控复核人工项 |
| src/app/manager/llm-providers/page.tsx | PASS | PASS | PASS | PASS(direct) | N-A(本卡仅 manager) | 待核 | 待核 | 待核 | 待主控复核人工项 |
| src/app/manager/login/page.tsx | PASS | PASS | FAIL | PASS(例外) | N-A(本卡仅 manager) | 待核 | 待核 | 待核 | 硬编码色值待修 |
| src/app/manager/logs/page.tsx | PASS | PASS | PASS | PASS(CrudPage 间接) | N-A(本卡仅 manager) | 待核 | 待核 | 待核 | 待主控复核人工项 |
| src/app/manager/majors/page.tsx | PASS | PASS | PASS | PASS(CrudPage 间接) | N-A(本卡仅 manager) | 待核 | 待核 | 待核 | 待主控复核人工项 |
| src/app/manager/media/page.tsx | PASS | PASS | PASS | PASS(direct) | N-A(本卡仅 manager) | 待核 | 待核 | 待核 | 待主控复核人工项 |
| src/app/manager/navigations/page.tsx | PASS | PASS | PASS | PASS(CrudPage 间接) | N-A(本卡仅 manager) | 待核 | 待核 | 待核 | 待主控复核人工项 |
| src/app/manager/news/page.tsx | PASS | PASS | PASS | PASS(例外) | N-A(本卡仅 manager) | 待核 | 待核 | 待核 | 待主控复核人工项 |
| src/app/manager/notify-recipients/page.tsx | PASS | PASS | PASS | PASS(CrudPage 间接) | N-A(本卡仅 manager) | 待核 | 待核 | 待核 | 待主控复核人工项 |
| src/app/manager/notify-records/page.tsx | PASS | PASS | PASS | PASS(CrudPage 间接) | N-A(本卡仅 manager) | 待核 | 待核 | 待核 | 待主控复核人工项 |
| src/app/manager/notify-rules/page.tsx | PASS | PASS | PASS | PASS(direct) | N-A(本卡仅 manager) | 待核 | 待核 | 待核 | 待主控复核人工项 |
| src/app/manager/notify-templates/page.tsx | PASS | PASS | PASS | PASS(CrudPage 间接) | N-A(本卡仅 manager) | 待核 | 待核 | 待核 | 待主控复核人工项 |
| src/app/manager/page-templates/page.tsx | PASS | PASS | PASS | PASS(CrudPage 间接) | N-A(本卡仅 manager) | 待核 | 待核 | 待核 | 待主控复核人工项 |
| src/app/manager/page.tsx | PASS | PASS | PASS | PASS(direct) | N-A(本卡仅 manager) | 待核 | 待核 | 待核 | 待主控复核人工项 |
| src/app/manager/partners/page.tsx | PASS | PASS | PASS | PASS(CrudPage 间接) | N-A(本卡仅 manager) | 待核 | 待核 | 待核 | 待主控复核人工项 |
| src/app/manager/publish-jobs/page.tsx | PASS | PASS | PASS | PASS(direct) | N-A(本卡仅 manager) | 待核 | 待核 | 待核 | 待主控复核人工项 |
| src/app/manager/roles/page.tsx | PASS | PASS | PASS | PASS(CrudPage 间接) | N-A(本卡仅 manager) | 待核 | 待核 | 待核 | 待主控复核人工项 |
| src/app/manager/service-guides/page.tsx | PASS | PASS | PASS | PASS(CrudPage 间接) | N-A(本卡仅 manager) | 待核 | 待核 | 待核 | 待主控复核人工项 |
| src/app/manager/settings/page.tsx | PASS | PASS | PASS | PASS(direct) | N-A(本卡仅 manager) | 待核 | 待核 | 待核 | 待主控复核人工项 |
| src/app/manager/students/page.tsx | PASS | PASS | PASS | PASS(CrudPage 间接) | N-A(本卡仅 manager) | 待核 | 待核 | 待核 | 待主控复核人工项 |
| src/app/manager/tags/page.tsx | PASS | PASS | PASS | PASS(CrudPage 间接) | N-A(本卡仅 manager) | 待核 | 待核 | 待核 | 待主控复核人工项 |
| src/app/manager/user-actions/page.tsx | PASS | PASS | PASS | PASS(CrudPage 间接) | N-A(本卡仅 manager) | 待核 | 待核 | 待核 | 待主控复核人工项 |
| src/app/manager/users/page.tsx | PASS | PASS | PASS | PASS(CrudPage 间接) | N-A(本卡仅 manager) | 待核 | 待核 | 待核 | 待主控复核人工项 |
| src/app/manager/wechat-accounts/page.tsx | PASS | PASS | PASS | PASS(direct) | N-A(本卡仅 manager) | 待核 | 待核 | 待核 | 待主控复核人工项 |



