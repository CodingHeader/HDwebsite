# V11-WX-03 执行证据（2026-10-24）

**现状盘点（审计声明核实为真）**：publish-jobs route:47 建任务账号查询硬编码 `freepublishEnabled: true` → 草稿箱-only 账号建不了任务；请求 accountId 被无视（恒自动选）。
**改动**：查询去掉 freepublishEnabled 过滤（发布模式在执行期按账号配置决定——wechat.ts:328 原逻辑保留）；请求 v.accountId 显式指定时优先并校验（active+service），不存在返回 400 明确文案。
**验收**：逻辑矩阵（有/无显式账号 × 账号 freepublish 开关）由执行期既有语义覆盖；契约 schema 未动（accountId 本就是合法字段）。全量 1766 绿。真实 freepublish 行为 UNKNOWN（凭证缺失，维持既定口径）。
