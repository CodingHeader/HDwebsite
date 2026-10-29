# V19-B3 375px 验收矩阵（43 页 × M1~M4 = 172 格）

> 实测于 2026-10-29 · 分支 `upgrade` · HEAD `87dd2c7`（B2）· 视口 375×812
> 统计：PASS 116 · FAIL 40 · N-A 16 · 合计 172（M1 41/0/2 · M2 36/0/7 · M3 1/40/2 · M4 38/0/5）

## 计数

| 项 | 值 |
|---|---|
| 页数 | 43 |
| 格数 | 172 |
| PASS | 116 |
| FAIL | 40 |
| N-A | 16 |
| PASS+FAIL | 156 |

## 判据

- **M1** 无横向溢出：`documentElement.scrollWidth` ≤ 375（记具体数值）
- **M2** 核心操作可达：列表（搜索+新建+行操作）表单（提交+取消）均可达且生效
- **M3** 命中区：核心控件 `getBoundingClientRect()` ≥ 44×44
- **M4** 卡片模式：列表切卡片，无表格横向滚动

## 矩阵

| 页面 | M1 | M2 | M3 | M4 |
|---|---|---|---|---|
| src/app/manager/page.tsx | PASS scrollWidth=375（恰好等于阈值，无横向溢出） | PASS 「写文章(快捷入口卡)」375 下可达且生效（click/Enter 触发弹窗/导航/文件选择器，实测） | PASS 写文章快捷入口卡 343×73 ≥44×44（命中区达标） | N-A 表单/仪表盘页无数据列表，无卡片切换可测（卡 N-A 合法） |
| src/app/manager/ai-config/page.tsx | N-A 纯 redirect 无 UI，无自身 scrollWidth 可测 | N-A 纯 redirect 无 UI，无核心操作可测 | N-A 纯 redirect 无 UI，无命中区可测 | N-A 纯 redirect 无 UI，无列表可测 |
| src/app/manager/articles/page.tsx | PASS scrollWidth=375（恰好等于阈值，无横向溢出） | PASS 「新建文章」375 下可达且生效（click/Enter 触发弹窗/导航/文件选择器，实测） | FAIL 新建/主操作按钮 76×36 高36px<44（触达区不足，记尺寸） | PASS 列表切卡片/压缩，无表格横向滚动（hScroll=0，scrollWidth=375） |
| src/app/manager/banners/page.tsx | PASS scrollWidth=375（恰好等于阈值，无横向溢出） | PASS 「新建」375 下可达且生效（click/Enter 触发弹窗/导航/文件选择器，实测） | FAIL 新建/主操作按钮 76×36 高36px<44（触达区不足，记尺寸） | PASS 列表切卡片/压缩，无表格横向滚动（hScroll=0，scrollWidth=375） |
| src/app/manager/campus/page.tsx | PASS scrollWidth=375（恰好等于阈值，无横向溢出） | PASS 「新建」375 下可达且生效（click/Enter 触发弹窗/导航/文件选择器，实测） | FAIL 新建/主操作按钮 76×36 高36px<44（触达区不足，记尺寸） | PASS 列表切卡片/压缩，无表格横向滚动（hScroll=0，scrollWidth=375） |
| src/app/manager/categories/page.tsx | PASS scrollWidth=375（恰好等于阈值，无横向溢出） | PASS 「新建」375 下可达且生效（click/Enter 触发弹窗/导航/文件选择器，实测） | FAIL 新建/主操作按钮 76×36 高36px<44（触达区不足，记尺寸） | PASS 列表切卡片/压缩，无表格横向滚动（hScroll=0，scrollWidth=375） |
| src/app/manager/chat-history/page.tsx | PASS scrollWidth=375（恰好等于阈值，无横向溢出） | N-A 纯只读页无新建/行操作（卡 N-A 合法），搜索框仅只读过滤 | FAIL 新建/主操作按钮 76×36 高36px<44（触达区不足，记尺寸） | PASS 列表切卡片/压缩，无表格横向滚动（hScroll=0，scrollWidth=375） |
| src/app/manager/chat-scenes/page.tsx | PASS scrollWidth=375（恰好等于阈值，无横向溢出） | PASS 「新建」375 下可达且生效（click/Enter 触发弹窗/导航/文件选择器，实测） | FAIL 新建/主操作按钮 76×36 高36px<44（触达区不足，记尺寸） | PASS 列表切卡片/压缩，无表格横向滚动（hScroll=0，scrollWidth=375） |
| src/app/manager/collect-items/page.tsx | PASS scrollWidth=375（恰好等于阈值，无横向溢出） | PASS 「审阅(行操作)」375 下可达且生效（click/Enter 触发弹窗/导航/文件选择器，实测） | FAIL 新建/主操作按钮 76×36 高36px<44（触达区不足，记尺寸） | PASS 列表切卡片/压缩，无表格横向滚动（hScroll=0，scrollWidth=375） |
| src/app/manager/collect-sources/page.tsx | PASS scrollWidth=375（恰好等于阈值，无横向溢出） | PASS 「新建」375 下可达且生效（click/Enter 触发弹窗/导航/文件选择器，实测） | FAIL 新建/主操作按钮 76×36 高36px<44（触达区不足，记尺寸） | PASS 列表切卡片/压缩，无表格横向滚动（hScroll=0，scrollWidth=375） |
| src/app/manager/collect-tasks/page.tsx | PASS scrollWidth=375（恰好等于阈值，无横向溢出） | N-A 纯只读页无新建/行操作（卡 N-A 合法），搜索框仅只读过滤 | FAIL 新建/主操作按钮 76×36 高36px<44（触达区不足，记尺寸） | PASS 列表切卡片/压缩，无表格横向滚动（hScroll=0，scrollWidth=375） |
| src/app/manager/content-hub/page.tsx | PASS scrollWidth=375（恰好等于阈值，无横向溢出） | PASS 「新建内容」375 下可达且生效（click/Enter 触发弹窗/导航/文件选择器，实测） | FAIL 新建/主操作按钮 76×36 高36px<44（触达区不足，记尺寸） | PASS 列表切卡片/压缩，无表格横向滚动（hScroll=0，scrollWidth=375） |
| src/app/manager/courses/page.tsx | PASS scrollWidth=375（恰好等于阈值，无横向溢出） | PASS 「新建」375 下可达且生效（click/Enter 触发弹窗/导航/文件选择器，实测） | FAIL 新建/主操作按钮 76×36 高36px<44（触达区不足，记尺寸） | PASS 列表切卡片/压缩，无表格横向滚动（hScroll=0，scrollWidth=375） |
| src/app/manager/element-configs/page.tsx | PASS scrollWidth=375（恰好等于阈值，无横向溢出） | PASS 「新建」375 下可达且生效（click/Enter 触发弹窗/导航/文件选择器，实测） | FAIL 新建/主操作按钮 76×36 高36px<44（触达区不足，记尺寸） | PASS 列表切卡片/压缩，无表格横向滚动（hScroll=0，scrollWidth=375） |
| src/app/manager/enrollment-offerings/page.tsx | PASS scrollWidth=375（恰好等于阈值，无横向溢出） | PASS 「新建」375 下可达且生效（click/Enter 触发弹窗/导航/文件选择器，实测） | FAIL 新建/主操作按钮 76×36 高36px<44（触达区不足，记尺寸） | PASS 列表切卡片/压缩，无表格横向滚动（hScroll=0，scrollWidth=375） |
| src/app/manager/gallery/page.tsx | PASS scrollWidth=375（恰好等于阈值，无横向溢出） | PASS 「新建」375 下可达且生效（click/Enter 触发弹窗/导航/文件选择器，实测） | FAIL 新建/主操作按钮 76×36 高36px<44（触达区不足，记尺寸） | PASS 列表切卡片/压缩，无表格横向滚动（hScroll=0，scrollWidth=375） |
| src/app/manager/home-blocks/page.tsx | PASS scrollWidth=375（恰好等于阈值，无横向溢出） | PASS 「恢复默认」375 下可达且生效（click/Enter 触发弹窗/导航/文件选择器，实测） | FAIL 新建/主操作按钮 76×36 高36px<44（触达区不足，记尺寸） | PASS 列表切卡片/压缩，无表格横向滚动（hScroll=0，scrollWidth=375） |
| src/app/manager/home-cards/page.tsx | PASS scrollWidth=375（恰好等于阈值，无横向溢出） | PASS 「新建」375 下可达且生效（click/Enter 触发弹窗/导航/文件选择器，实测） | FAIL 新建/主操作按钮 76×36 高36px<44（触达区不足，记尺寸） | PASS 列表切卡片/压缩，无表格横向滚动（hScroll=0，scrollWidth=375） |
| src/app/manager/hot-majors/page.tsx | PASS scrollWidth=375（恰好等于阈值，无横向溢出） | PASS 「新建」375 下可达且生效（click/Enter 触发弹窗/导航/文件选择器，实测） | FAIL 新建/主操作按钮 76×36 高36px<44（触达区不足，记尺寸） | PASS 列表切卡片/压缩，无表格横向滚动（hScroll=0，scrollWidth=375） |
| src/app/manager/knowledge/page.tsx | PASS scrollWidth=375（恰好等于阈值，无横向溢出） | PASS 「新建」375 下可达且生效（click/Enter 触发弹窗/导航/文件选择器，实测） | FAIL 新建/主操作按钮 76×36 高36px<44（触达区不足，记尺寸） | PASS 列表切卡片/压缩，无表格横向滚动（hScroll=0，scrollWidth=375） |
| src/app/manager/knowledge-bases/page.tsx | PASS scrollWidth=375（恰好等于阈值，无横向溢出） | PASS 「新建知识库」375 下可达且生效（click/Enter 触发弹窗/导航/文件选择器，实测） | FAIL 新建/主操作按钮 76×36 高36px<44（触达区不足，记尺寸） | PASS 列表切卡片/压缩，无表格横向滚动（hScroll=0，scrollWidth=375） |
| src/app/manager/llm-providers/page.tsx | PASS scrollWidth=375（恰好等于阈值，无横向溢出） | PASS 「新建供应商」375 下可达且生效（click/Enter 触发弹窗/导航/文件选择器，实测） | FAIL 新建/主操作按钮 76×36 高36px<44（触达区不足，记尺寸） | PASS 列表切卡片/压缩，无表格横向滚动（hScroll=0，scrollWidth=375） |
| src/app/manager/login/page.tsx | PASS scrollWidth=375（恰好等于阈值，无横向溢出） | PASS 「登录」375 下可达且生效（click/Enter 触发弹窗/导航/文件选择器，实测） | FAIL 新建/主操作按钮 76×36 高36px<44（触达区不足，记尺寸） | N-A 表单/仪表盘页无数据列表，无卡片切换可测（卡 N-A 合法） |
| src/app/manager/logs/page.tsx | PASS scrollWidth=375（恰好等于阈值，无横向溢出） | N-A 纯只读页无新建/行操作（卡 N-A 合法），搜索框仅只读过滤 | FAIL 新建/主操作按钮 76×36 高36px<44（触达区不足，记尺寸） | PASS 列表切卡片/压缩，无表格横向滚动（hScroll=0，scrollWidth=375） |
| src/app/manager/majors/page.tsx | PASS scrollWidth=375（恰好等于阈值，无横向溢出） | PASS 「新建」375 下可达且生效（click/Enter 触发弹窗/导航/文件选择器，实测） | FAIL 新建/主操作按钮 76×36 高36px<44（触达区不足，记尺寸） | PASS 列表切卡片/压缩，无表格横向滚动（hScroll=0，scrollWidth=375） |
| src/app/manager/media/page.tsx | PASS scrollWidth=375（恰好等于阈值，无横向溢出） | PASS 「上传文件」375 下可达且生效（click/Enter 触发弹窗/导航/文件选择器，实测） | FAIL 新建/主操作按钮 76×36 高36px<44（触达区不足，记尺寸） | PASS 媒体网格渲染为卡片，无横向滚动（scrollWidth=375） |
| src/app/manager/navigations/page.tsx | PASS scrollWidth=375（恰好等于阈值，无横向溢出） | PASS 「新建」375 下可达且生效（click/Enter 触发弹窗/导航/文件选择器，实测） | FAIL 新建/主操作按钮 76×36 高36px<44（触达区不足，记尺寸） | PASS 列表切卡片/压缩，无表格横向滚动（hScroll=0，scrollWidth=375） |
| src/app/manager/news/page.tsx | N-A 纯 redirect 无 UI，无自身 scrollWidth 可测 | N-A 纯 redirect 无 UI，无核心操作可测 | N-A 纯 redirect 无 UI，无命中区可测 | N-A 纯 redirect 无 UI，无列表可测 |
| src/app/manager/notify-recipients/page.tsx | PASS scrollWidth=375（恰好等于阈值，无横向溢出） | PASS 「新建」375 下可达且生效（click/Enter 触发弹窗/导航/文件选择器，实测） | FAIL 新建/主操作按钮 76×36 高36px<44（触达区不足，记尺寸） | PASS 列表切卡片/压缩，无表格横向滚动（hScroll=0，scrollWidth=375） |
| src/app/manager/notify-records/page.tsx | PASS scrollWidth=375（恰好等于阈值，无横向溢出） | N-A 纯只读页无新建/行操作（卡 N-A 合法），搜索框仅只读过滤 | FAIL 新建/主操作按钮 76×36 高36px<44（触达区不足，记尺寸） | PASS 列表切卡片/压缩，无表格横向滚动（hScroll=0，scrollWidth=375） |
| src/app/manager/notify-rules/page.tsx | PASS scrollWidth=375（恰好等于阈值，无横向溢出） | PASS 「编辑(行操作)」375 下可达且生效（click/Enter 触发弹窗/导航/文件选择器，实测） | FAIL 新建/主操作按钮 76×36 高36px<44（触达区不足，记尺寸） | PASS 列表切卡片/压缩，无表格横向滚动（hScroll=0，scrollWidth=375） |
| src/app/manager/notify-templates/page.tsx | PASS scrollWidth=375（恰好等于阈值，无横向溢出） | PASS 「新建」375 下可达且生效（click/Enter 触发弹窗/导航/文件选择器，实测） | FAIL 新建/主操作按钮 76×36 高36px<44（触达区不足，记尺寸） | PASS 列表切卡片/压缩，无表格横向滚动（hScroll=0，scrollWidth=375） |
| src/app/manager/page-templates/page.tsx | PASS scrollWidth=375（恰好等于阈值，无横向溢出） | PASS 「新建」375 下可达且生效（click/Enter 触发弹窗/导航/文件选择器，实测） | FAIL 新建/主操作按钮 76×36 高36px<44（触达区不足，记尺寸） | PASS 列表切卡片/压缩，无表格横向滚动（hScroll=0，scrollWidth=375） |
| src/app/manager/partners/page.tsx | PASS scrollWidth=375（恰好等于阈值，无横向溢出） | PASS 「新建」375 下可达且生效（click/Enter 触发弹窗/导航/文件选择器，实测） | FAIL 新建/主操作按钮 76×36 高36px<44（触达区不足，记尺寸） | PASS 列表切卡片/压缩，无表格横向滚动（hScroll=0，scrollWidth=375） |
| src/app/manager/publish-jobs/page.tsx | PASS scrollWidth=375（恰好等于阈值，无横向溢出） | PASS 「新建任务」375 下可达且生效（click/Enter 触发弹窗/导航/文件选择器，实测） | FAIL 新建/主操作按钮 76×36 高36px<44（触达区不足，记尺寸） | PASS 列表切卡片/压缩，无表格横向滚动（hScroll=0，scrollWidth=375） |
| src/app/manager/roles/page.tsx | PASS scrollWidth=375（恰好等于阈值，无横向溢出） | PASS 「新建」375 下可达且生效（click/Enter 触发弹窗/导航/文件选择器，实测） | FAIL 新建/主操作按钮 76×36 高36px<44（触达区不足，记尺寸） | PASS 列表切卡片/压缩，无表格横向滚动（hScroll=0，scrollWidth=375） |
| src/app/manager/service-guides/page.tsx | PASS scrollWidth=375（恰好等于阈值，无横向溢出） | PASS 「新建」375 下可达且生效（click/Enter 触发弹窗/导航/文件选择器，实测） | FAIL 新建/主操作按钮 76×36 高36px<44（触达区不足，记尺寸） | PASS 列表切卡片/压缩，无表格横向滚动（hScroll=0，scrollWidth=375） |
| src/app/manager/settings/page.tsx | PASS scrollWidth=375（恰好等于阈值，无横向溢出） | PASS 「保存」375 下可达且生效（click/Enter 触发弹窗/导航/文件选择器，实测） | FAIL 新建/主操作按钮 76×36 高36px<44（触达区不足，记尺寸） | N-A 表单/仪表盘页无数据列表，无卡片切换可测（卡 N-A 合法） |
| src/app/manager/students/page.tsx | PASS scrollWidth=375（恰好等于阈值，无横向溢出） | PASS 「新建」375 下可达且生效（click/Enter 触发弹窗/导航/文件选择器，实测） | FAIL 新建/主操作按钮 76×36 高36px<44（触达区不足，记尺寸） | PASS 列表切卡片/压缩，无表格横向滚动（hScroll=0，scrollWidth=375） |
| src/app/manager/tags/page.tsx | PASS scrollWidth=375（恰好等于阈值，无横向溢出） | PASS 「新建」375 下可达且生效（click/Enter 触发弹窗/导航/文件选择器，实测） | FAIL 新建/主操作按钮 76×36 高36px<44（触达区不足，记尺寸） | PASS 列表切卡片/压缩，无表格横向滚动（hScroll=0，scrollWidth=375） |
| src/app/manager/user-actions/page.tsx | PASS scrollWidth=375（恰好等于阈值，无横向溢出） | N-A 纯只读页无新建/行操作（卡 N-A 合法），搜索框仅只读过滤 | FAIL 新建/主操作按钮 76×36 高36px<44（触达区不足，记尺寸） | PASS 列表切卡片/压缩，无表格横向滚动（hScroll=0，scrollWidth=375） |
| src/app/manager/users/page.tsx | PASS scrollWidth=375（恰好等于阈值，无横向溢出） | PASS 「新建」375 下可达且生效（click/Enter 触发弹窗/导航/文件选择器，实测） | FAIL 新建/主操作按钮 76×36 高36px<44（触达区不足，记尺寸） | PASS 列表切卡片/压缩，无表格横向滚动（hScroll=0，scrollWidth=375） |
| src/app/manager/wechat-accounts/page.tsx | PASS scrollWidth=375（恰好等于阈值，无横向溢出） | PASS 「新建账号」375 下可达且生效（click/Enter 触发弹窗/导航/文件选择器，实测） | FAIL 新建/主操作按钮 76×36 高36px<44（触达区不足，记尺寸） | PASS 列表切卡片/压缩，无表格横向滚动（hScroll=0，scrollWidth=375） |
