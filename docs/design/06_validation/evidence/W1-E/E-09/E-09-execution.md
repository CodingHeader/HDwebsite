# E-09 执行证据：内容中枢统一管理（多渠道状态列、发布对话框、渠道预览 Tab）

- 5W1H 简版：Who=执行线 E（lane/e-manager-pages）；What=content-hub 自定义页（多渠道状态列 + 发布对话框渠道多选/立即/定时/发布前提醒 + 官网/公众号预览 Tab + 权限门禁）+ e-content-hub 3 用例；When=2026-10-17（北京时间）；Why=S-E9 内容中枢统一（REQ-F-015；CCR-1 多渠道契约）；How=DataTable + 前端渠道聚合 + FormDialog/DetailDialog。

## 改动文件
- `src/app/manager/content-hub/page.tsx`：CrudPage 包装 → 自定义页。列：标题/来源/状态/渠道状态（每渠道最近 job Badge）/作者/创建时间；行操作：发布（canPublish=SessionUser.role.isSuper || permissions 含 publish:create；无权限不渲染）/预览/删除；发布 FormDialog：渠道多选 Checkbox + 动作 select + scheduledAt（DateTimeInput，留空=立即，toIsoOffset 契约 datetime offset）+ preNotify switch；预览 DetailDialog：Tabs（官网=prose Markdown 语义样式，不引用 web 组件；公众号=简化样式卡片）。
- `tests/e2e/e-content-hub.spec.ts`（新）：3 用例。

## 过程暴露并修复
1. **React #31 崩溃（页面 "This page couldn't load"）**：`author` 字段是 User 对象（content-items API include author），render `r.author ?? "—"` 直接渲染对象 → "Objects are not valid as a React child ({id, username})"。定位：dev 模式（next dev 6793 完整错误）+ 二分（最小渲染/屏蔽 DataTable/删渠道列/删 rowActions）→ dev server 日志精确定位 `<DataTable>` → author 列对象渲染。修复：类型防御字符串化。**注意**：二分 2/3 走 6791 生产构建未 rebuild，结果无效——dev 模式实时编译才是有效二分路径（一周后复现请注意）。
2. **POST channels 500**：契约 publishJobCreateSchema（CCR-1）接受 channels，但 B-07 未实现落库（PublishJob 无 channels 列）→ prisma.create 传 channels 数组 500。修复：**按渠道逐条创建**（与 B-07 落库语义一致，现在即可用）；B-07 合并后可切单请求 channels（W2 复跑调整口径）。
3. 测试适配：test.use 必须在 describe 层（test body 内非法）；e2e.db 种子不产 ContentItem → 用例经 API 造数 + reload；`request` fixture 无登录态 → pageToken 注入。

## 验收逐条
| 验收项 | 结果 | 证据 |
|---|---|---|
| e-content-hub.spec.ts：双渠道定时发布创建 2 个 publish-job | PASS | 3 passed（11.2s）：双渠道 → 同一 itemId 的 job ≥ 2 条 |
| 无 publish 权限时发布按钮不可见 | PASS | viewer（只读，无 publish:create）→ 发布按钮 count=0 |
| a11y 扫描该页 0 critical | **待 E-08**（a11y 扫描在 E-08 统一执行） | — |
| 通用门禁 4 项 exit 0 | PASS | lint=0、typecheck=0、vitest 全过、build=0 |
| 越界检查 | PASS | content-hub/** + e-*.spec.ts，越界 0 |

## 命令
```bash
npx playwright test -c tests/e2e/playwright.config.ts tests/e2e/e-content-hub.spec.ts  # 3 passed
npm run lint && npm run typecheck && npm test && npm run build                          # 全 exit 0
npm run test:e2e                                                                        # 16 passed（全量）
```

## UNKNOWN 及原因
- 渠道状态列聚合：当前前端聚合（GET /api/publish-jobs 按 itemId）；契约聚合视图（/api/content-hub，B-07 服务端组装 channels）未合并——B-07 合并后 W2 切换口径。
- 单请求 channels 落库：B-07 范围。

## 后续方向待办
- W2-05：B-07 合并后渠道状态列切 /api/content-hub 契约视图并复跑。
- E 线下一张：E-10。
