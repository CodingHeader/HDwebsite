# 测试轮问题台账（EVD-VERIFY，2026-10-11）

> 三段式：问题 → 修复 → 复测。测试环境：dev :6789（修复热载）+ prod :6790（决定性对照）。

## 已修复

| # | 级别 | 问题 | 修复 | 复测 |
| --- | --- | --- | --- | --- |
| V1-F3 | P1 | **埋点 POST /api/user-actions 405**：R0 CRUD 生成器把 M1 公开 POST 覆盖为只读 GET，全站 page_view/submit 埋点断流 | user-actions/route.ts 恢复公开 POST（保留工厂 GET） | curl POST 200 + DB UserAction 落库 1 条；浏览器报名提交后 submit+page_view 双记录 ✓ |
| V4-F1 | P1 | **表单校验缺陷三连**：①必填 select 空值未拦截（zod 英文原样抛给用户，违反契约②中文口径）；②`.optional()` 字符串字段收 null 被拒（92 处）；③number 字段默认 0 触发 positive 校验（parentId=0） | ①normalizeFormValues 对 select 空值删键；②resources.ts 全量 `.nullable().optional()`；③defaultValues number→""；④validationError 英文 zod 消息统一转"参数校验失败：字段" | 分类新建→编辑→删除全闭环浏览器实测通过（中途每修一步复测一次） |
| V4-F2 | P1 | **slug 契约与 slugify 口径不一致**（resources.ts 未含中文集，编辑中文 slug 资源必 400）——上轮审查 P2 漏网 | 7 处 slug regex 加 `\u4e00-\u9fa5` | 中文 slug 资源编辑保存 200 ✓ |

## 非缺陷（登记说明）

| # | 现象 | 结论 |
| --- | --- | --- |
| V1-F1 | fullPage 截图出现重复平铺 | IAB 截图工具拼接伪影（视口截图正常），非站点问题 |
| V1-F2 | dev 模式 /articles 首次访问偶发卡"加载中" | dev 按需编译延迟 + 流式渲染时序；8s 后正常，**生产环境全程无此现象**（:6790 决定性对照） |
| V3-F1 | 后台昵称乱码 | 测试工具污染：Git Bash curl 以 GBK 发送中文 JSON（11:43 的 user:update 日志为证）；浏览器 UTF-8 全链路正常（V2 落库"浏览器测试员"无误）。已修数据；后续中文测试数据一律走浏览器/node |
| V5-F1 | 采集"跳过 8" | 非重复执行 bug：调度器启动补跑已入库（urlHash 去重正确生效的正面证据） |

## 验证通过清单（无修复必要）

- V1 前台 9 类页面 200 + 内容正确（导航表驱动/文章 Markdown 含 GFM 表格/SEO lang=zh-CN）
- V2 报名表单浏览器闭环（成功态+Student 落库+双层频控代码路径）/ 埋点三件套 / ChatWidget 打开-发送-降级错误展示清晰
- V3 登录守卫（未登录跳转）/ 错误密码提示 / 登录进仪表盘
- V4 31 管理页 UI 全渲染 + 31 API 登录态探针 200 + 分类 CRUD 闭环 + 设置分组保存（siteDescription 写入回读）
- V5 **真实采集**：试抓 8 条省考试院真实标题（选择器命中）；调度器启动补跑自动采集教育厅源；urlHash 去重（跳过 8）；审核事务化双写（ContentItem#2 + Knowledge#1）
- V6 **发布端到端闭环**：内容中枢→发布任务→执行器→Article(channel=news)→前台列表第一篇真实公示（prod 渲染确认）
- V7 SMTP 未配置降级：email/test 明确提示 + NotifyRecord skipped 通道（未触发真实发信，符合设计）
- V8 安全：无 token 写接口 401×5、Editor 越权 403×4 + 有权 200、file 路径穿越 404、上传白名单（txt 拒/png 过）+ 文件可访问
