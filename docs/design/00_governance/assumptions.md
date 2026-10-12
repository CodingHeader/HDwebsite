---
id: ASM-REG-001
type: assumption
title: 假设登记册
status: active
owner: AI Agent
created: 2026-10-10
updated: 2026-10-12
---

# Assumptions（假设登记）

> 假设 = 当前认为成立但尚未完全验证的前提。假设被证伪时：更新关联文档 + 记录 ADR（如引发决策）。

| ID | 假设 | 依据 | 关联 | 验证方式 | 证伪影响（推断） |
| --- | --- | --- | --- | --- | --- |
| ASM-001 | 站点为低并发内容型流量（学历提升机构区域客群），SQLite 单写者足够 | 现状运行良好；10-性能 P1 判定"低并发够用" | REQ-C-001、RISK-007、ADR-019 | S4/S5 上线后观察任务耗时与接口延迟 | 写竞争实锤 → 提前触发 ICE-PG 评估，影响排期 |
| ASM-002 | 公众号将为已认证服务号（或订阅号），具备草稿/发布/客服消息 API 能力 | C2/ADR-002 决策"按官方 API 设计，凭证后补" | REQ-C-002、SOL-006、ADR-013 | 凭证配置时核验接口权限（认证类型已确认：已认证服务号，ADR-013） | 接口权限差异 → 调整 SOL-006 范围 |
| ASM-003 | OpenAI 兼容大模型端点起步沿用 Modelscope（ADR-014），服务持续可用且可配置多个备用 | C5/ADR-005 多 Provider 设计 | REQ-F-008/010、RISK-003 | 连通性测试按钮 + 兜底路由演练 | 服务不可用 → 依赖兜底模型与余额监控，AI 可用率指标受损 |
| ASM-004 | 运营方会及时维护：采集源清单、提醒收件人、采集内容审核队列 | C3/ADR-003、C4/ADR-004"后台可配置，后补" | REQ-F-002/011 | 上线后审核队列积压监控（可加提醒） | 运营缺位 → 采集积压、提醒空转；需积压监控与催办 |
| ASM-005 | 内容以中文为主，Markdown 按 GFM 处理即可满足展示需求 | 现状 TipTap 中文内容；N4 需求未提多语言 | REQ-F-004 | Markdown 管线验收时核验中文排版 | GFM 不满足 → 管线扩展自定义插件 |
| ASM-006 | 部署切换可在停机/低峰窗口完成，无需灰度双跑 | 单机部署、自主可控；ADR-011 平行新仓（切换归 M4 方案） | REQ-C-003、ADR-011 | M4 切换方案演练计时 | 无法停机切换 → 改双跑过渡方案 |
| ASM-007 | 服务器出口 IP 固定，满足微信 IP 白名单要求 | 宝塔单机部署形态 | REQ-C-002 | 凭证配置时以白名单校验接口验证 | IP 不固定 → 需固定出口或代理，M4 联调阻塞 |
| ASM-008 | 成功指标转化类可由 UserAction 最小埋点承接统计 | Q7 轮产品所有者选定（2026-10-11）：表单提交 + 关键页浏览写入 UserAction | success-metrics.md、backlog S1-埋点 | M1 验收时核对埋点数据完整性 | 埋点数据不完整 → 转化类指标改人工抽样（success-metrics §1 注） |

> 证伪影响列为推断设计（Q7 轮确认推断内容可写入并标注），用于假设被证伪时的预案索引。

## 本轮（2026-10-12，current-plan §3.4 NON_BLOCKING A-1~A-7）

> 来源：current-plan.md §3.4；本轮全量重构 P0~P15。被证伪时更新 current-plan 与对应方向提示词。

| ID | 假设 | 依据 | 关联 | 验证方式 | 证伪影响（推断） |
| --- | --- | --- | --- | --- | --- |
| A-1 | 视觉对比参照环境：用 main@94dbbbb 自带 `prisma/dev.db` 启动 main，与 upgrade 导入同等数据后截图对比 | main 已提交 dev.db，可本地 npm ci 运行 | REQ-F-014、P02 | P02 首步生成参照截图并入库 | main 无法运行 → 改用静态导出或人工基准截图，visual 门禁记 UNKNOWN |
| A-2 | 截图差异阈值 `maxDiffPixelRatio 0.01`，动画禁用、字体本地化 | M-2 需机器可校验 | REQ-F-014 | P02 visual 套件稳定性（连续 3 次同结果） | 阈值过严导致抖动 → 按区块 mask 动态内容，不放宽整体阈值 |
| A-3 | "自动发布"= 审核通过后按排期自动执行；采集源可选 `autoApprove`（默认 false） | K5：ADR-017 审核门 + ADR-008 发布前仅通知 | REQ-F-003/005、P06 | P06 发布状态机测试 | 用户要求免审直发 → 修订 ADR-017 |
| A-4 | 管理端以 main 品牌红（`--color-brand-600 oklch(0.505 0.213 27.5)`）为强调色、中性灰为主 | 统一风格 | REQ-F-015、P02 | P02 设计系统评审 | 用户另定管理端主色 → 仅改 `[data-theme="manager"]` 令牌 |
| A-5 | 允许新增依赖：`@playwright/test`、`@tiptap/*`、`@axe-core/playwright`；2026-10-12 补充：docx 解析库 1 个（ADR-025，P12 说明理由）；其余需在任务卡说明 | main 曾用前三者 | P02/P07/P12 | 各方向证据列出依赖与理由 | 依赖不可用 → 方向升级条件 |
| A-6 | CI/验证用 node 22 跑通即可，生产按 engines node>=24 | K6；沙箱 node v22 | REQ-C-001、P11 | 每方向 lint/typecheck/test/build 在 node 22 通过 | node 22 出现不兼容 → P11 处理 |
| A-7 | 低余额阈值沿用 Setting `llmBalanceThreshold`，后台可改 | registry 现值 | REQ-F-011、P06 | P06 通知测试 | 供应商余额 API 可用 → COULD 自动查询 |

已关闭（2026-10-12 用户裁决，转为决策）：U-B2 → ADR-024（恢复首页区块配置与 ElementConfig）；U-B3 → ADR-025（Coze 集成，Word/Markdown/TXT，拒 PDF/图片）；U-B1/U-B4 → 无凭证，完整实现 + mock 测试，真实联调 UNKNOWN。
