# V11-UI-05 执行证据（2026-10-25）
**改动**：src/app/manager/news/page.tsx 新建——redirect("/manager/articles")（main 的 news 已并入 Article，ADR-001）。
**验收**：build 绿；构建产物含 /manager/news 路由（redirect 由 Next 处理）。
