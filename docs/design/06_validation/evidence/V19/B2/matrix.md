# V19-B2 键盘验收矩阵（43 页 × K1~K4 = 172 格）

> 实测于 2026-10-29 · 分支 `upgrade` · HEAD `7e01458`（FIX-03）
> 统计：PASS 152 · FAIL 0 · N-A 20 · 合计 172（K1 40/0/3 · K2 36/0/7 · K3 35/0/8 · K4 41/0/2）

## 计数

| 项 | 值 |
|---|---|
| 页数 | 43 |
| 格数 | 172 |
| PASS | 152 |
| FAIL | 0 |
| N-A | 20 |
| PASS+FAIL | 152 |

## 判据

- **K1** Tab 顺序：首元素起 12 次 Tab，序列与文档序一致、无跳跃/回跳 → PASS
- **K2** 主操作可聚焦：Tab 到主操作（新建/保存/行操作）按 Enter → 焦点可见 + 触发成功（弹窗计数增/URL 变/文件选择器触发）
- **K3** Esc 关弹窗：打开弹窗按 Esc → 关闭无副作用（共享 Dialog 组件一次定性）
- **K4** 焦点可见：`[data-theme="manager"] :focus-visible { outline:2px solid }` 全局规则，逐页实测

## 矩阵

| 页面 | K1 | K2 | K3 | K4 |
|---|---|---|---|---|
| src/app/manager/page.tsx | PASS 12 次 Tab 序列单调无跳跃/回跳（侧栏→内容，实测 40 页一致） | PASS 「写文章(快捷入口)」聚焦 Enter 触发成功（弹窗/导航/文件选择器，实测） | N-A 页面无弹窗（仪表盘/登录均无 Dialog） | PASS 焦点可见 outline 2px solid（全局 CSS 实测 41 页一致） |
| src/app/manager/ai-config/page.tsx | N-A 纯 redirect 无 UI，无焦点序列可测 | N-A 纯 redirect 无 UI，无主操作可测 | N-A 纯 redirect 无 UI，无弹窗可测 | N-A 纯 redirect 无 UI，无焦点可见可测 |
| src/app/manager/articles/page.tsx | PASS 12 次 Tab 序列单调无跳跃/回跳（侧栏→内容，实测 40 页一致） | PASS 「新建文章」聚焦 Enter 触发成功（弹窗/导航/文件选择器，实测） | PASS 共享 Dialog 组件 Esc 关闭（articles FormDialog + home-blocks ConfirmDialog 运行时验证） | PASS 焦点可见 outline 2px solid（全局 CSS 实测 41 页一致） |
| src/app/manager/banners/page.tsx | PASS 12 次 Tab 序列单调无跳跃/回跳（侧栏→内容，实测 40 页一致） | PASS 「新建」聚焦 Enter 触发成功（弹窗/导航/文件选择器，实测） | PASS 共享 Dialog 组件 Esc 关闭（articles FormDialog + home-blocks ConfirmDialog 运行时验证） | PASS 焦点可见 outline 2px solid（全局 CSS 实测 41 页一致） |
| src/app/manager/campus/page.tsx | PASS 12 次 Tab 序列单调无跳跃/回跳（侧栏→内容，实测 40 页一致） | PASS 「新建」聚焦 Enter 触发成功（弹窗/导航/文件选择器，实测） | PASS 共享 Dialog 组件 Esc 关闭（articles FormDialog + home-blocks ConfirmDialog 运行时验证） | PASS 焦点可见 outline 2px solid（全局 CSS 实测 41 页一致） |
| src/app/manager/categories/page.tsx | PASS 12 次 Tab 序列单调无跳跃/回跳（侧栏→内容，实测 40 页一致） | PASS 「新建」聚焦 Enter 触发成功（弹窗/导航/文件选择器，实测） | PASS 共享 Dialog 组件 Esc 关闭（articles FormDialog + home-blocks ConfirmDialog 运行时验证） | PASS 焦点可见 outline 2px solid（全局 CSS 实测 41 页一致） |
| src/app/manager/chat-history/page.tsx | PASS 12 次 Tab 序列单调无跳跃/回跳（侧栏→内容，实测 40 页一致） | N-A 只读列表无新建/保存主操作（CrudPage readOnly 无 rowActions） | PASS 共享 Dialog 组件 Esc 关闭（articles FormDialog + home-blocks ConfirmDialog 运行时验证） | PASS 焦点可见 outline 2px solid（全局 CSS 实测 41 页一致） |
| src/app/manager/chat-scenes/page.tsx | PASS 12 次 Tab 序列单调无跳跃/回跳（侧栏→内容，实测 40 页一致） | PASS 「新建」聚焦 Enter 触发成功（弹窗/导航/文件选择器，实测） | PASS 共享 Dialog 组件 Esc 关闭（articles FormDialog + home-blocks ConfirmDialog 运行时验证） | PASS 焦点可见 outline 2px solid（全局 CSS 实测 41 页一致） |
| src/app/manager/collect-items/page.tsx | PASS 12 次 Tab 序列单调无跳跃/回跳（侧栏→内容，实测 40 页一致） | PASS 「审阅(行操作)」聚焦 Enter 触发成功（弹窗/导航/文件选择器，实测） | PASS 共享 Dialog 组件 Esc 关闭（articles FormDialog + home-blocks ConfirmDialog 运行时验证） | PASS 焦点可见 outline 2px solid（全局 CSS 实测 41 页一致） |
| src/app/manager/collect-sources/page.tsx | PASS 12 次 Tab 序列单调无跳跃/回跳（侧栏→内容，实测 40 页一致） | PASS 「新建」聚焦 Enter 触发成功（弹窗/导航/文件选择器，实测） | PASS 共享 Dialog 组件 Esc 关闭（articles FormDialog + home-blocks ConfirmDialog 运行时验证） | PASS 焦点可见 outline 2px solid（全局 CSS 实测 41 页一致） |
| src/app/manager/collect-tasks/page.tsx | PASS 12 次 Tab 序列单调无跳跃/回跳（侧栏→内容，实测 40 页一致） | N-A 只读列表无新建/保存主操作（CrudPage readOnly 无 rowActions） | N-A 只读列表无弹窗（CrudPage readOnly 无 dialog/detail） | PASS 焦点可见 outline 2px solid（全局 CSS 实测 41 页一致） |
| src/app/manager/content-hub/page.tsx | PASS 12 次 Tab 序列单调无跳跃/回跳（侧栏→内容，实测 40 页一致） | PASS 「新建内容」聚焦 Enter 触发成功（弹窗/导航/文件选择器，实测） | PASS 共享 Dialog 组件 Esc 关闭（articles FormDialog + home-blocks ConfirmDialog 运行时验证） | PASS 焦点可见 outline 2px solid（全局 CSS 实测 41 页一致） |
| src/app/manager/courses/page.tsx | PASS 12 次 Tab 序列单调无跳跃/回跳（侧栏→内容，实测 40 页一致） | PASS 「新建」聚焦 Enter 触发成功（弹窗/导航/文件选择器，实测） | PASS 共享 Dialog 组件 Esc 关闭（articles FormDialog + home-blocks ConfirmDialog 运行时验证） | PASS 焦点可见 outline 2px solid（全局 CSS 实测 41 页一致） |
| src/app/manager/element-configs/page.tsx | PASS 12 次 Tab 序列单调无跳跃/回跳（侧栏→内容，实测 40 页一致） | PASS 「新建」聚焦 Enter 触发成功（弹窗/导航/文件选择器，实测） | PASS 共享 Dialog 组件 Esc 关闭（articles FormDialog + home-blocks ConfirmDialog 运行时验证） | PASS 焦点可见 outline 2px solid（全局 CSS 实测 41 页一致） |
| src/app/manager/enrollment-offerings/page.tsx | PASS 12 次 Tab 序列单调无跳跃/回跳（侧栏→内容，实测 40 页一致） | PASS 「新建」聚焦 Enter 触发成功（弹窗/导航/文件选择器，实测） | PASS 共享 Dialog 组件 Esc 关闭（articles FormDialog + home-blocks ConfirmDialog 运行时验证） | PASS 焦点可见 outline 2px solid（全局 CSS 实测 41 页一致） |
| src/app/manager/gallery/page.tsx | PASS 12 次 Tab 序列单调无跳跃/回跳（侧栏→内容，实测 40 页一致） | PASS 「新建」聚焦 Enter 触发成功（弹窗/导航/文件选择器，实测） | PASS 共享 Dialog 组件 Esc 关闭（articles FormDialog + home-blocks ConfirmDialog 运行时验证） | PASS 焦点可见 outline 2px solid（全局 CSS 实测 41 页一致） |
| src/app/manager/home-blocks/page.tsx | PASS 12 次 Tab 序列单调无跳跃/回跳（侧栏→内容，实测 40 页一致） | PASS 「恢复默认」聚焦 Enter 触发成功（弹窗/导航/文件选择器，实测） | PASS 共享 Dialog 组件 Esc 关闭（articles FormDialog + home-blocks ConfirmDialog 运行时验证） | PASS 焦点可见 outline 2px solid（全局 CSS 实测 41 页一致） |
| src/app/manager/home-cards/page.tsx | PASS 12 次 Tab 序列单调无跳跃/回跳（侧栏→内容，实测 40 页一致） | PASS 「新建」聚焦 Enter 触发成功（弹窗/导航/文件选择器，实测） | PASS 共享 Dialog 组件 Esc 关闭（articles FormDialog + home-blocks ConfirmDialog 运行时验证） | PASS 焦点可见 outline 2px solid（全局 CSS 实测 41 页一致） |
| src/app/manager/hot-majors/page.tsx | PASS 12 次 Tab 序列单调无跳跃/回跳（侧栏→内容，实测 40 页一致） | PASS 「新建」聚焦 Enter 触发成功（弹窗/导航/文件选择器，实测） | PASS 共享 Dialog 组件 Esc 关闭（articles FormDialog + home-blocks ConfirmDialog 运行时验证） | PASS 焦点可见 outline 2px solid（全局 CSS 实测 41 页一致） |
| src/app/manager/knowledge/page.tsx | PASS 12 次 Tab 序列单调无跳跃/回跳（侧栏→内容，实测 40 页一致） | PASS 「新建」聚焦 Enter 触发成功（弹窗/导航/文件选择器，实测） | PASS 共享 Dialog 组件 Esc 关闭（articles FormDialog + home-blocks ConfirmDialog 运行时验证） | PASS 焦点可见 outline 2px solid（全局 CSS 实测 41 页一致） |
| src/app/manager/knowledge-bases/page.tsx | PASS 12 次 Tab 序列单调无跳跃/回跳（侧栏→内容，实测 40 页一致） | PASS 「新建知识库」聚焦 Enter 触发成功（弹窗/导航/文件选择器，实测） | PASS 共享 Dialog 组件 Esc 关闭（articles FormDialog + home-blocks ConfirmDialog 运行时验证） | PASS 焦点可见 outline 2px solid（全局 CSS 实测 41 页一致） |
| src/app/manager/llm-providers/page.tsx | PASS 12 次 Tab 序列单调无跳跃/回跳（侧栏→内容，实测 40 页一致） | PASS 「新建供应商」聚焦 Enter 触发成功（弹窗/导航/文件选择器，实测） | PASS 共享 Dialog 组件 Esc 关闭（articles FormDialog + home-blocks ConfirmDialog 运行时验证） | PASS 焦点可见 outline 2px solid（全局 CSS 实测 41 页一致） |
| src/app/manager/login/page.tsx | N-A 单表单页无列表 Tab 序列语义（卡判据） | PASS 「登录」聚焦 Enter 触发成功（弹窗/导航/文件选择器，实测） | N-A 页面无弹窗（仪表盘/登录均无 Dialog） | PASS 焦点可见 outline 2px solid（全局 CSS 实测 41 页一致） |
| src/app/manager/logs/page.tsx | PASS 12 次 Tab 序列单调无跳跃/回跳（侧栏→内容，实测 40 页一致） | N-A 只读列表无新建/保存主操作（CrudPage readOnly 无 rowActions） | N-A 只读列表无弹窗（CrudPage readOnly 无 dialog/detail） | PASS 焦点可见 outline 2px solid（全局 CSS 实测 41 页一致） |
| src/app/manager/majors/page.tsx | PASS 12 次 Tab 序列单调无跳跃/回跳（侧栏→内容，实测 40 页一致） | PASS 「新建」聚焦 Enter 触发成功（弹窗/导航/文件选择器，实测） | PASS 共享 Dialog 组件 Esc 关闭（articles FormDialog + home-blocks ConfirmDialog 运行时验证） | PASS 焦点可见 outline 2px solid（全局 CSS 实测 41 页一致） |
| src/app/manager/media/page.tsx | PASS 12 次 Tab 序列单调无跳跃/回跳（侧栏→内容，实测 40 页一致） | PASS 「上传文件」聚焦 Enter 触发成功（弹窗/导航/文件选择器，实测） | PASS 共享 Dialog 组件 Esc 关闭（articles FormDialog + home-blocks ConfirmDialog 运行时验证） | PASS 焦点可见 outline 2px solid（全局 CSS 实测 41 页一致） |
| src/app/manager/navigations/page.tsx | PASS 12 次 Tab 序列单调无跳跃/回跳（侧栏→内容，实测 40 页一致） | PASS 「新建」聚焦 Enter 触发成功（弹窗/导航/文件选择器，实测） | PASS 共享 Dialog 组件 Esc 关闭（articles FormDialog + home-blocks ConfirmDialog 运行时验证） | PASS 焦点可见 outline 2px solid（全局 CSS 实测 41 页一致） |
| src/app/manager/news/page.tsx | N-A 纯 redirect 无 UI，无焦点序列可测 | N-A 纯 redirect 无 UI，无主操作可测 | N-A 纯 redirect 无 UI，无弹窗可测 | N-A 纯 redirect 无 UI，无焦点可见可测 |
| src/app/manager/notify-recipients/page.tsx | PASS 12 次 Tab 序列单调无跳跃/回跳（侧栏→内容，实测 40 页一致） | PASS 「新建」聚焦 Enter 触发成功（弹窗/导航/文件选择器，实测） | PASS 共享 Dialog 组件 Esc 关闭（articles FormDialog + home-blocks ConfirmDialog 运行时验证） | PASS 焦点可见 outline 2px solid（全局 CSS 实测 41 页一致） |
| src/app/manager/notify-records/page.tsx | PASS 12 次 Tab 序列单调无跳跃/回跳（侧栏→内容，实测 40 页一致） | N-A 只读列表无新建/保存主操作（CrudPage readOnly 无 rowActions） | N-A 只读列表无弹窗（CrudPage readOnly 无 dialog/detail） | PASS 焦点可见 outline 2px solid（全局 CSS 实测 41 页一致） |
| src/app/manager/notify-rules/page.tsx | PASS 12 次 Tab 序列单调无跳跃/回跳（侧栏→内容，实测 40 页一致） | PASS 「编辑(行操作)」聚焦 Enter 触发成功（弹窗/导航/文件选择器，实测） | PASS 共享 Dialog 组件 Esc 关闭（articles FormDialog + home-blocks ConfirmDialog 运行时验证） | PASS 焦点可见 outline 2px solid（全局 CSS 实测 41 页一致） |
| src/app/manager/notify-templates/page.tsx | PASS 12 次 Tab 序列单调无跳跃/回跳（侧栏→内容，实测 40 页一致） | PASS 「新建」聚焦 Enter 触发成功（弹窗/导航/文件选择器，实测） | PASS 共享 Dialog 组件 Esc 关闭（articles FormDialog + home-blocks ConfirmDialog 运行时验证） | PASS 焦点可见 outline 2px solid（全局 CSS 实测 41 页一致） |
| src/app/manager/page-templates/page.tsx | PASS 12 次 Tab 序列单调无跳跃/回跳（侧栏→内容，实测 40 页一致） | PASS 「新建」聚焦 Enter 触发成功（弹窗/导航/文件选择器，实测） | PASS 共享 Dialog 组件 Esc 关闭（articles FormDialog + home-blocks ConfirmDialog 运行时验证） | PASS 焦点可见 outline 2px solid（全局 CSS 实测 41 页一致） |
| src/app/manager/partners/page.tsx | PASS 12 次 Tab 序列单调无跳跃/回跳（侧栏→内容，实测 40 页一致） | PASS 「新建」聚焦 Enter 触发成功（弹窗/导航/文件选择器，实测） | PASS 共享 Dialog 组件 Esc 关闭（articles FormDialog + home-blocks ConfirmDialog 运行时验证） | PASS 焦点可见 outline 2px solid（全局 CSS 实测 41 页一致） |
| src/app/manager/publish-jobs/page.tsx | PASS 12 次 Tab 序列单调无跳跃/回跳（侧栏→内容，实测 40 页一致） | PASS 「新建任务」聚焦 Enter 触发成功（弹窗/导航/文件选择器，实测） | PASS 共享 Dialog 组件 Esc 关闭（articles FormDialog + home-blocks ConfirmDialog 运行时验证） | PASS 焦点可见 outline 2px solid（全局 CSS 实测 41 页一致） |
| src/app/manager/roles/page.tsx | PASS 12 次 Tab 序列单调无跳跃/回跳（侧栏→内容，实测 40 页一致） | PASS 「新建」聚焦 Enter 触发成功（弹窗/导航/文件选择器，实测） | PASS 共享 Dialog 组件 Esc 关闭（articles FormDialog + home-blocks ConfirmDialog 运行时验证） | PASS 焦点可见 outline 2px solid（全局 CSS 实测 41 页一致） |
| src/app/manager/service-guides/page.tsx | PASS 12 次 Tab 序列单调无跳跃/回跳（侧栏→内容，实测 40 页一致） | PASS 「新建」聚焦 Enter 触发成功（弹窗/导航/文件选择器，实测） | PASS 共享 Dialog 组件 Esc 关闭（articles FormDialog + home-blocks ConfirmDialog 运行时验证） | PASS 焦点可见 outline 2px solid（全局 CSS 实测 41 页一致） |
| src/app/manager/settings/page.tsx | PASS 12 次 Tab 序列单调无跳跃/回跳（侧栏→内容，实测 40 页一致） | PASS 「保存」聚焦 Enter 触发成功（弹窗/导航/文件选择器，实测） | PASS 共享 Dialog 组件 Esc 关闭（articles FormDialog + home-blocks ConfirmDialog 运行时验证） | PASS 焦点可见 outline 2px solid（全局 CSS 实测 41 页一致） |
| src/app/manager/students/page.tsx | PASS 12 次 Tab 序列单调无跳跃/回跳（侧栏→内容，实测 40 页一致） | PASS 「新建」聚焦 Enter 触发成功（弹窗/导航/文件选择器，实测） | PASS 共享 Dialog 组件 Esc 关闭（articles FormDialog + home-blocks ConfirmDialog 运行时验证） | PASS 焦点可见 outline 2px solid（全局 CSS 实测 41 页一致） |
| src/app/manager/tags/page.tsx | PASS 12 次 Tab 序列单调无跳跃/回跳（侧栏→内容，实测 40 页一致） | PASS 「新建」聚焦 Enter 触发成功（弹窗/导航/文件选择器，实测） | PASS 共享 Dialog 组件 Esc 关闭（articles FormDialog + home-blocks ConfirmDialog 运行时验证） | PASS 焦点可见 outline 2px solid（全局 CSS 实测 41 页一致） |
| src/app/manager/user-actions/page.tsx | PASS 12 次 Tab 序列单调无跳跃/回跳（侧栏→内容，实测 40 页一致） | N-A 只读列表无新建/保存主操作（CrudPage readOnly 无 rowActions） | N-A 只读列表无弹窗（CrudPage readOnly 无 dialog/detail） | PASS 焦点可见 outline 2px solid（全局 CSS 实测 41 页一致） |
| src/app/manager/users/page.tsx | PASS 12 次 Tab 序列单调无跳跃/回跳（侧栏→内容，实测 40 页一致） | PASS 「新建」聚焦 Enter 触发成功（弹窗/导航/文件选择器，实测） | PASS 共享 Dialog 组件 Esc 关闭（articles FormDialog + home-blocks ConfirmDialog 运行时验证） | PASS 焦点可见 outline 2px solid（全局 CSS 实测 41 页一致） |
| src/app/manager/wechat-accounts/page.tsx | PASS 12 次 Tab 序列单调无跳跃/回跳（侧栏→内容，实测 40 页一致） | PASS 「新建账号」聚焦 Enter 触发成功（弹窗/导航/文件选择器，实测） | PASS 共享 Dialog 组件 Esc 关闭（articles FormDialog + home-blocks ConfirmDialog 运行时验证） | PASS 焦点可见 outline 2px solid（全局 CSS 实测 41 页一致） |
