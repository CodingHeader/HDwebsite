# V11-UI-01 执行证据（2026-10-25）
**现状盘点（审计属实，但契约早已支持）**：articleCreateSchema 本就含 slug/tagIds/isTop/isRecommend/isHot/seoTitle/seoKeywords/seoDescription——缺口纯在文章表单（8 字段未接线）。
**改动**：articles/page.tsx 表单补 slug（留空自动生成）、标签（multiselect，options=/api/tags，回读映射 tags[].id）、置顶/推荐/热门三开关、SEO 三字段（advanced 折叠区）；save() body 同步；EMPTY_FORM 与 openEdit 回读扩展。
**验收**：tsc/build/lint 全绿；全量单测无回归（1766+新增）。e2e 见 E2E-375/HUB 用例。
