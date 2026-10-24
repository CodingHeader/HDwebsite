# V11-HUB-01 执行证据（2026-10-24）

**现状盘点（审计声明核实为真）**：内容中枢只有 发布/预览/删除 三个动作；/review 端点（review:edit）无任何前端调用；预览对话框把 content 当裸文本渲染（{detail.content}），无 markdown 渲染。
**改动**：
1. `src/components/manager/ContentMarkdown.tsx`（新）：管理端 markdown/html 预览组件——与前台 MarkdownRenderer 同管线（react-markdown+GFM+rehype-highlight），html 型经 sanitizeRichContent 净化（REQ-NF-002）。管理端不引 web 组件的隔离约定保持。
2. `content-hub/page.tsx`：新建/编辑对话框（标题/类型/正文/摘要/封面；留空自动派生）；行动作补 编辑（draft/rejected）+ 提交审核（draft→pending_review，PUT）+ 审核（pending_review→POST /review {decision,remark}，通过/拒绝）；预览两 Tab 换 ContentMarkdown。权限口子 canEdit=content:edit、canReview=review:edit（ADR-017）。
**验收**：
- e2e `tests/e2e/hub-content.spec.ts` 2/2：新建→提交审核→审核通过→预览（h1/strong/li 结构化渲染断言）；拒绝流程（备注理由→rejected）。
- tsc/build/lint 全绿。
**插曲**：管理端更新方法为 PUT 非 PATCH（e2e 首跑 405 暴露）；FormField 为 render-prop API；Select 为 options 数组 API——均按既有组件契约适配。
