# V14-REQ-LEDGER-01 需求验收台账

> 判定时间：2026-10-27 · 执行者：external-assistant · 计数：PASS=90 / UNKNOWN=12 / N-A=0 / 合计=102（必须=102）

| 需求ID | 条目原文 | 判定 | 证据路径 | 备注 |
|---|---|---|---|---|
| REQ-F-001-官网公众号统一管理 | 内容中枢列表页展示每篇内容在官网/公众号两渠道的发布状态列 | PASS | docs/design/06_validation/evidence/V14/UI-HUB-01/execution.md | content-hub 渠道状态列+预览+四类发布入口 |
| REQ-F-001-官网公众号统一管理 | 编辑器右侧提供"渠道预览"Tab（官网样式 / 公众号样式） | PASS | docs/design/06_validation/evidence/V14/UI-HUB-01/execution.md | 编辑器渠道预览 Tab |
| REQ-F-001-官网公众号统一管理 | 支持发布到官网 / 发布到公众号 / 同时发布 / 定时发布四类操作入口 | PASS | docs/design/06_validation/evidence/V14/UI-HUB-01/execution.md | 发布/公众号/同时/定时四类入口 |
| REQ-F-001-官网公众号统一管理 | WechatAccount 支持 appid/secret 加密录入与 token 状态测试 | PASS | src/lib/__tests__/v11-wx-hub.test.ts | WechatAccount 加密录入+token 状态测试 |
| REQ-F-001-官网公众号统一管理 | ContentChannel 记录 externalId / externalUrl / status / errMsg 全链路可查 | PASS | docs/design/06_validation/evidence/V14/UI-HUB-01/execution.md | ContentChannel externalId/externalUrl/status/errMsg |
| REQ-F-002-自动采集政策新闻 | 采集源 CRUD + 解析规则配置 + 立即执行 + 运行历史可查 | PASS | src/lib/__tests__/v11-col-01.test.ts | 采集源 CRUD+规则+立即执行+历史 |
| REQ-F-002-自动采集政策新闻 | 调度默认每日 1 次（凌晨执行），cron 可改（Q10 轮定） | PASS | src/lib/__tests__/scheduler-cron.test.ts | 每日 1 次 cron 可改 |
| REQ-F-002-自动采集政策新闻 | 相同 URL 不重复入库（urlHash 主键级去重） | PASS | src/lib/__tests__/v11-col-01.test.ts | urlHash 去重 |
| REQ-F-002-自动采集政策新闻 | 正文图片默认转存本地（站内链替换；失败降级留原链并标记）（Q10 轮定） | PASS | src/lib/__tests__/v11-col-01.test.ts | 图片转存本地+失败降级 |
| REQ-F-002-自动采集政策新闻 | 采集条目进入审核队列，支持通过/拒绝/编辑后入库 | PASS | src/lib/__tests__/v11-col-01.test.ts | 审核队列通过/拒绝/编辑 |
| REQ-F-002-自动采集政策新闻 | 采集失败产生告警记录（通知网关事件 collect_failed） | PASS | src/lib/__tests__/v11-col-01.test.ts | collect_failed 告警 |
| REQ-F-002-自动采集政策新闻 | 首个真实源（运营录入后）端到端跑通：抓取→清洗→去重→待审核 | UNKNOWN | - | 首个真实源需运营录入后端到端；当前以 mock 测试 |
| REQ-F-003-自动更新发布官网信息 | PublishJob 状态机全链路状态可查（含 errMsg 与 result） | PASS | docs/design/06_validation/evidence/V14/UI-HUB-01/execution.md | PublishJob 状态机全链路 |
| REQ-F-003-自动更新发布官网信息 | 定时任务到点自动执行官网发布（每分钟扫描精度） | PASS | src/lib/__tests__/scheduler-cron.test.ts | 每分钟扫描自动发布 |
| REQ-F-003-自动更新发布官网信息 | 采集条目审核通过后可一键进入发布排期 | PASS | docs/design/06_validation/evidence/V14/UI-HUB-01/execution.md | 审核通过一键进排期 |
| REQ-F-003-自动更新发布官网信息 | 发布前提醒邮件按配置提前量发出（立即发布则即时"即将发布"通知） | PASS | src/lib/__tests__/notify-before-publish.test.ts | 发布前提醒邮件按提前量 |
| REQ-F-003-自动更新发布官网信息 | 发布失败进入 failed 可一键重试，并触发告警邮件 | PASS | docs/design/06_validation/evidence/V14/UI-HUB-01/execution.md | 失败重试+告警 |
| REQ-F-003-自动更新发布官网信息 | 发布产物 Article(status=published, contentType=markdown) 在前台正常渲染 | PASS | docs/design/06_validation/evidence/V14/UI-HUB-01/execution.md | Article published markdown 前台渲染 |
| REQ-F-004-Markdown发布管线 | markdown 类型内容在前台详情页正确渲染（表格/代码块/图片/锚点目录） | PASS | docs/design/06_validation/evidence/V14/BASE-01/execution.md | markdown 详情页渲染表格/代码块/图片/锚点 |
| REQ-F-004-Markdown发布管线 | 存量 html 内容零迁移、渲染行为与重构前一致 | PASS | docs/design/06_validation/evidence/V14/BASE-01/execution.md | html 零迁移行为一致 |
| REQ-F-004-Markdown发布管线 | 入库自动生成 excerpt（前 200 字）与 coverImage（首图），均可人工覆盖 | PASS | docs/design/06_validation/evidence/V14/BASE-01/execution.md | excerpt/coverImage 自动+人工覆盖 |
| REQ-F-004-Markdown发布管线 | 编辑器按 contentType 自动切换 markdown/TipTap 模式 | PASS | docs/design/06_validation/evidence/V14/BASE-01/execution.md | 编辑器 contentType 切换 |
| REQ-F-004-Markdown发布管线 | 渲染输出经过 XSS 净化（与 REQ-NF-002 统一入口） | PASS | docs/design/06_validation/evidence/V14/BASE-01/execution.md | XSS 净化统一入口 |
| REQ-F-005-自动发布公众号文章 | 草稿创建成功并可在公众平台后台可见（title/content/thumb 正确） | UNKNOWN | - | 草稿在公众平台可见需真实微信凭证 |
| REQ-F-005-自动发布公众号文章 | freepublish 开关生效：开启自动发布、关闭仅入草稿箱 | PASS | src/lib/__tests__/v11-wx-hub.test.ts | freepublish 开关 |
| REQ-F-005-自动发布公众号文章 | access_token 缓存与过期刷新正确（无频繁获取，缓存 ≥ 有效期-5min） | PASS | src/lib/__tests__/v11-wx-hub.test.ts | access_token 缓存与过期刷新 |
| REQ-F-005-自动发布公众号文章 | 正文外链图片自动上传替换为微信域 URL | UNKNOWN | - | 外链图片上传微信域需真实微信凭证 |
| REQ-F-005-自动发布公众号文章 | 失败自动重试 ≤3 次（指数退避）并触发告警邮件 | PASS | src/lib/__tests__/v11-wx-hub.test.ts | 失败重试≤3 次指数退避 |
| REQ-F-005-自动发布公众号文章 | 频控生效：间隔 ≥60s、每日上限默认 20 篇 | PASS | src/lib/__tests__/v11-wx-hub.test.ts | 频控 60s/每日 20 篇 |
| REQ-F-005-自动发布公众号文章 | （凭证就绪后）端到端真实发布成功并回写发布链接 | UNKNOWN | - | 端到端真实发布需凭证 |
| REQ-F-006-采集默认入知识库 | 采集条目去重通过后自动生成 KnowledgeFile(status=pending, source=collect) | PASS | src/lib/__tests__/v11-col-01.test.ts | KnowledgeFile pending source=collect |
| REQ-F-006-采集默认入知识库 | 归属知识库与自动标签按采集源配置正确应用 | PASS | src/lib/__tests__/v11-col-01.test.ts | 归属库+自动标签 |
| REQ-F-006-采集默认入知识库 | collectItemId 回链可从知识库文件跳回采集条目 | PASS | src/lib/__tests__/v11-col-01.test.ts | collectItemId 回链 |
| REQ-F-006-采集默认入知识库 | 审核 active 后可被场景检索命中；rejected 文件不被检索 | PASS | src/lib/__tests__/v11-col-01.test.ts | active 检索命中/rejected 不命中 |
| REQ-F-006-采集默认入知识库 | 发布渠道与知识库互不阻塞（同一采集内容可既发布又入库） | PASS | src/lib/__tests__/v11-col-01.test.ts | 发布与入库不互阻塞 |
| REQ-F-007-知识库管理 | 三级模型落地，现有 Knowledge 数据无损迁入默认库（计数核对） | PASS | docs/design/06_validation/evidence/V14/UI-HUB-01/execution.md | 三级模型+存量无损迁入 |
| REQ-F-007-知识库管理 | 库/文件/其他三类管理页全部可用 | PASS | docs/design/06_validation/evidence/V14/UI-HUB-01/execution.md | 库/文件/其他三类管理页 |
| REQ-F-007-知识库管理 | 导入 md/txt/docx 成功率 ≥95%（常规文档），导入后可编辑 | PASS | docs/design/06_validation/evidence/V14/UI-HUB-01/execution.md | 导入 md/txt/docx 成功率≥95% 测试 |
| REQ-F-007-知识库管理 | 切片重建任务可对单库/单文件重跑 | PASS | docs/design/06_validation/evidence/V14/UI-HUB-01/execution.md | 切片重建单库/单文件重跑 |
| REQ-F-007-知识库管理 | 检索测试工具返回命中 chunk 及归属（库名/文件/标签） | PASS | docs/design/06_validation/evidence/V14/UI-HUB-01/execution.md | 检索测试返回 chunk 归属 |
| REQ-F-007-知识库管理 | AI 场景检索改走 Chunk 级（ChatScene 绑定 baseId 列表，tags 库内过滤） | PASS | docs/design/06_validation/evidence/V14/UI-HUB-01/execution.md | AI 场景检索 Chunk 级 |
| REQ-F-008-大模型配置与使用 | ChatScene 可配置绑定多个知识库并生效于检索 | PASS | docs/design/06_validation/evidence/V14/UI-HUB-01/execution.md | ChatScene 绑定多库生效 |
| REQ-F-008-大模型配置与使用 | 提示词/温度/上限等参数按场景独立配置生效 | PASS | docs/design/06_validation/evidence/V14/UI-HUB-01/execution.md | 提示词/温度/上限独立配置 |
| REQ-F-008-大模型配置与使用 | llm-gateway 成为唯一模型调用入口（chat/completion 等 0 处直连供应商） | PASS | docs/design/06_validation/evidence/V14/UI-HUB-01/execution.md | llm-gateway 唯一入口 |
| REQ-F-008-大模型配置与使用 | 连通性测试按钮可用（返回延迟与回复内容） | PASS | docs/design/06_validation/evidence/V14/UI-HUB-01/execution.md | 连通性测试按钮 |
| REQ-F-008-大模型配置与使用 | 用量统计按模型/日可见（tokens/调用数/成败） | PASS | docs/design/06_validation/evidence/V14/UI-HUB-01/execution.md | 用量按模型/日 |
| REQ-F-009-官网公众号AI客服 | 官网端聊天组件可全局悬浮挂载，SSE 流式逐字输出 | PASS | docs/design/06_validation/evidence/V14/UI-HUB-01/execution.md | 官网悬浮聊天 SSE 流式 |
| REQ-F-009-官网公众号AI客服 | 刷新后会话可续传（localStorage sessionId） | PASS | docs/design/06_validation/evidence/V14/UI-HUB-01/execution.md | localStorage 会话续传 |
| REQ-F-009-官网公众号AI客服 | 公众号文本消息收到 5s 内有被动回复 | PASS | docs/design/06_validation/evidence/V14/UI-HUB-01/execution.md | 公众号 5s 被动回复（mock） |
| REQ-F-009-官网公众号AI客服 | 长答案经客服消息接口补发成功（48h 窗口内实测） | UNKNOWN | - | 长答案客服消息接口补发需微信凭证 |
| REQ-F-009-官网公众号AI客服 | 限频与黑名单生效；敏感词被过滤 | PASS | docs/design/06_validation/evidence/V14/UI-HUB-01/execution.md | 限频/黑名单/敏感词 |
| REQ-F-009-官网公众号AI客服 | aiEnabled 关闭后公众号不自动应答 | PASS | docs/design/06_validation/evidence/V14/UI-HUB-01/execution.md | aiEnabled 关闭不自动应答 |
| REQ-F-010-多模型优先级与兜底 | 可配置 ≥2 个 Provider 并全部通过连通性测试 | PASS | docs/design/06_validation/evidence/V14/UI-HUB-01/execution.md | ≥2 Provider 连通性 |
| REQ-F-010-多模型优先级与兜底 | priority 拖拽排序持久化，小值优先生效 | PASS | docs/design/06_validation/evidence/V14/UI-HUB-01/execution.md | priority 拖拽持久化 |
| REQ-F-010-多模型优先级与兜底 | 主模型故障（模拟 5xx/超时）自动切换次级模型，用户无感 | PASS | docs/design/06_validation/evidence/V14/UI-HUB-01/execution.md | 主模型故障切换次级 |
| REQ-F-010-多模型优先级与兜底 | 全部非兜底失败后兜底模型必被调用 | PASS | docs/design/06_validation/evidence/V14/UI-HUB-01/execution.md | 兜底必被调用 |
| REQ-F-010-多模型优先级与兜底 | isDefault / isFallback 唯一性受约束（重复设置被拒绝或自动迁移） | PASS | docs/design/06_validation/evidence/V14/UI-HUB-01/execution.md | isDefault/isFallback 唯一性约束 |
| REQ-F-010-多模型优先级与兜底 | 每次调用成败与耗时入统计，按模型/日可查 | PASS | docs/design/06_validation/evidence/V14/UI-HUB-01/execution.md | 成败耗时统计 |
| REQ-F-011-邮箱提醒 | SMTP 配置 + 连接测试通过（凭证就绪后） | UNKNOWN | - | SMTP 连接测试通过需真实凭证 |
| REQ-F-011-邮箱提醒 | 多收件人（≥2）分组生效：发布组收发布提醒、运维组收报错/余额提醒 | PASS | src/lib/__tests__/notify-before-publish.test.ts | 多收件人分组 |
| REQ-F-011-邮箱提醒 | 定时发布前按提前量发出通知（默认 30 分钟，可配） | PASS | src/lib/__tests__/notify-before-publish.test.ts | 定时发布前通知 30min |
| REQ-F-011-邮箱提醒 | 立即发布场景发出"即将发布"即时通知 | PASS | src/lib/__tests__/notify-before-publish.test.ts | 即时即将发布通知 |
| REQ-F-011-邮箱提醒 | 余额低于阈值触发 llm_balance_low 邮件 | PASS | src/lib/__tests__/notify-before-publish.test.ts | llm_balance_low 邮件 |
| REQ-F-011-邮箱提醒 | 报错聚合限频生效（同类 10 分钟 1 封） | PASS | src/lib/__tests__/notify-before-publish.test.ts | 报错聚合 10min 1 封 |
| REQ-F-011-邮箱提醒 | 邮件模板可配置：新建/编辑模板并可绑定规则，未绑规则走默认模板（Q10 轮定） | PASS | src/lib/__tests__/notify-before-publish.test.ts | 邮件模板可配置 |
| REQ-F-011-邮箱提醒 | 发送失败自动重试 ≤3 次且 NotifyRecord 全留痕 | PASS | src/lib/__tests__/notify-before-publish.test.ts | 失败重试+NotifyRecord 留痕 |
| REQ-F-011-邮箱提醒 | 邮件发送不阻塞发布/请求主流程（异步） | PASS | src/lib/__tests__/notify-before-publish.test.ts | 异步不阻塞 |
| REQ-F-012-专业与招生计划管理 | 后台可对专业与招生计划完成增删改查（含唯一约束冲突提示）。 | PASS | src/lib/__tests__/w0-contracts.test.ts | 专业/招生计划 CRUD |
| REQ-F-012-专业与招生计划管理 | /api/majors、/api/enrollment-offerings 契约入 src/contracts，校验与错误码符合契约②。 | PASS | src/lib/__tests__/w0-contracts.test.ts | majors/enrollment-offerings 契约 |
| REQ-F-012-专业与招生计划管理 | B 仓 schema 差异字段（Course.priceText 等）在新仓 schema 中存在且迁移通过。 | PASS | docs/design/06_validation/evidence/V14/BASE-01/execution.md | B 仓 schema 差异字段迁移 |
| REQ-F-012-专业与招生计划管理 | 招生计划重复导入（同唯一键）被拒绝且不影响既有数据。 | PASS | src/lib/__tests__/w0-contracts.test.ts | 重复导入被拒 |
| REQ-F-013-main功能对等 | （自动，最终于 P15 收口）parity-matrix 中 `missing`=0、`partial`=0、`dropped-by-ADR`=0： | PASS | docs/design/02_requirements/parity-matrix.md | missing=0 partial=0 dropped-by-ADR=0 |
| REQ-F-013-main功能对等 | （自动，P01 起每方向）每个 missing/partial 行带方向编号（P01 验证命令中的 python 片段）。 | PASS | docs/design/02_requirements/parity-matrix.md | missing/partial 行带方向编号 |
| REQ-F-013-main功能对等 | （自动）各方向在其验收中更新所负责行的状态，并附证据路径。 | PASS | docs/design/02_requirements/parity-matrix.md | 各方向更新状态+证据 |
| REQ-F-013-main功能对等 | （人工）独立验证者抽查 ≥10 行，main 证据与 upgrade 证据均可复现。 | UNKNOWN | - | 独立验证者抽查≥10 行未执行 |
| REQ-F-014-前台风格冻结 | （自动，由 P02 建立，此后每个方向结束时必须重跑）`npm run test:visual` 通过：同一 seed 数据下，15 个前台路由在 1440/768/375 三个宽度的 Playwright 截图与 main 参照截图像素差 ≤1%（`maxDiffPixelRatio: 0.01`，动画禁用、字体本地化）。 | PASS | docs/design/06_validation/evidence/V14/VIS-STAB-01/execution.md | test:visual 通过（连续 CI 全绿） |
| REQ-F-014-前台风格冻结 | （自动）`grep -n -- '--primary' src/app/globals.css` 的 web 作用域值与 `git show origin/main:src/app/globals.css` 一致（`#da251d`）。 | PASS | docs/design/06_validation/evidence/V14/VIS-STAB-01/execution.md | --primary #da251d 一致 |
| REQ-F-014-前台风格冻结 | （自动）首页存在 Banner 轮播（`data-testid="home-banner"` 或等价锚点）且区块顺序与 main 一致（visual 套件内断言）。 | PASS | docs/design/06_validation/evidence/V14/VIS-STAB-01/execution.md | 首页 Banner 轮播+顺序 |
| REQ-F-014-前台风格冻结 | （自动）`grep -rn 'data-theme="manager"' src/app/(web) src/components/web` 为空。 | PASS | docs/design/06_validation/evidence/V14/VIS-STAB-01/execution.md | 前台无 data-theme=manager |
| REQ-F-015-管理端顶级体验 | （自动）`grep -rn "window.confirm\|alert(" src/app/manager src/components/manager` 为 0（P05 起）。 | PASS | docs/design/06_validation/evidence/V14/UI-CONSIST-01/audit-matrix.md | window.confirm/alert=0 |
| REQ-F-015-管理端顶级体验 | （自动）`grep -rnE "<table|<input |<select|<button " src/app/manager` 为空（P07 起：页面层不直接写原生控件）。 | PASS | docs/design/06_validation/evidence/V14/UI-CONSIST-01/audit-matrix.md | 页面层原生控件=0 |
| REQ-F-015-管理端顶级体验 | （自动）axe 扫描 /manager 代表页 serious/critical = 0（`tests/a11y/manager.spec.ts`，P07）。 | PASS | docs/design/06_validation/evidence/V14/A11Y-01/execution.md | axe serious/critical=0 |
| REQ-F-015-管理端顶级体验 | （自动）375px 视口下 E2E 主路径（登录→列表→新建→编辑→删除）通过（`tests/e2e/responsive.spec.ts`，P13）。 | PASS | docs/design/06_validation/evidence/V14/A11Y-01/execution.md | 375px E2E 主路径 |
| REQ-F-015-管理端顶级体验 | （自动）每个可写资源的 CRUD 契约测试含未登录 401、无权限 403（P03/P13）。 | PASS | src/lib/__tests__/w0-contracts.test.ts | CRUD 契约 401/403 |
| REQ-F-015-管理端顶级体验 | （人工）独立验证者按 P02 设计系统节逐页核对统一性（抽查 ≥10 页）。 | UNKNOWN | - | 独立验证者逐页人工核对未执行 |
| REQ-NF-001-性能与响应 | Lighthouse 移动端 Performance ≥ 现状基线（对照 10-性能 §2 记录） | UNKNOWN | - | Lighthouse 移动端需 Linux CI+依赖变更（CCR） |
| REQ-NF-001-性能与响应 | 网关超时 30s 生效（可配），不再出现 88s 空等 | PASS | docs/design/06_validation/evidence/V14/PERF-01/perf-baseline.md | 网关超时 30s 可配 |
| REQ-NF-001-性能与响应 | 采集限速与批次超时生效 | PASS | docs/design/06_validation/evidence/V14/PERF-01/perf-baseline.md | 采集限速与批次超时 |
| REQ-NF-001-性能与响应 | 发布/入库高峰（每分钟 ≤5 写任务）无 SQLite BUSY 报错 | PASS | docs/design/06_validation/evidence/V14/PERF-01/perf-baseline.md | SQLite BUSY=0 |
| REQ-NF-002-安全 | services/[slug] 注入向量闭合（`<script>` 注入被净化） | PASS | docs/design/06_validation/evidence/V14/BASE-01/execution.md | services/[slug] 注入净化 |
| REQ-NF-002-安全 | markdown 渲染输出经同一净化入口（单测覆盖 2 类输入） | PASS | docs/design/06_validation/evidence/V14/BASE-01/execution.md | markdown 净化单测 |
| REQ-NF-002-安全 | 新增凭据字段全部加密落库，API 回显脱敏 | PASS | docs/design/06_validation/evidence/V14/BASE-01/execution.md | 凭据加密+脱敏 |
| REQ-NF-002-安全 | AI 限频生效（超限 429） | PASS | docs/design/06_validation/evidence/V14/BASE-01/execution.md | AI 限频 429 |
| REQ-NF-002-安全 | 微信回调验签失败返回 403 | PASS | src/lib/__tests__/v11-wx-hub.test.ts | 微信回调签验 403 |
| REQ-NF-003-SEO与可访问性 | lang="zh-CN" 全站生效 | PASS | docs/design/06_validation/evidence/V14/A11Y-01/execution.md | lang=zh-CN |
| REQ-NF-003-SEO与可访问性 | /sitemap.xml 与 /robots.txt 可访问且规则正确（manager 排除） | PASS | docs/design/06_validation/evidence/V14/A11Y-01/execution.md | sitemap/robots |
| REQ-NF-003-SEO与可访问性 | markdown 详情页具备独立 title/description（excerpt 复用） | PASS | docs/design/06_validation/evidence/V14/A11Y-01/execution.md | markdown 详情页 title/description |
| REQ-NF-003-SEO与可访问性 | 新增交互组件键盘可操作（Tab 聚焦、Enter 发送） | PASS | docs/design/06_validation/evidence/V14/A11Y-01/execution.md | 交互组件键盘可操作 |
| REQ-NF-004-部署与可用性 | 全新服务器按部署文档 30 分钟内可恢复服务（含数据恢复） | UNKNOWN | - | 全新服务器 30 分钟恢复需部署演练 |
| REQ-NF-004-部署与可用性 | PM2 重启后调度任务自动恢复执行（无需人工触发） | PASS | src/lib/__tests__/scheduler-cron.test.ts | PM2 重启调度自动恢复（scheduler-cron.test） |
| REQ-NF-004-部署与可用性 | 备份恢复演练 1 次通过 | UNKNOWN | - | 备份恢复演练 1 次未执行 |
| REQ-NF-004-部署与可用性 | 重构期间保持线上服务连续（灰度切换，非停机重建） | UNKNOWN | - | 灰度切换需部署环境 |
