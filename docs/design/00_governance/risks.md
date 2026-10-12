---
id: RISK-REG-001
type: risk
title: 风险登记册（治理级）
status: active
owner: AI Agent
created: 2026-10-10
updated: 2026-10-12
---

# Risks（风险登记）

> 结构：§1 域内风险索引（SSOT：明细在各提取文档，此处只登记出处）；§2 治理级风险（跨域/流程/外部，全文登记）。
> 状态：`open / mitigated / accepted / closed`。

## 1. 域内风险索引（明细见权威来源文档）

| 域 | 编号 | 权威来源 |
| --- | --- | --- |
| 性能 | P1~P7（SQLite 单写者、viewCount 同步自增、contains 全表扫、无页面缓存、外域图片、AI 非流式、上传落 public） | [10-性能设计.md](../10-性能设计.md) §2 |
| 知识库 | K1~K5（单表扁平、LIKE 粗糙、不切片、无采集位、无批量操作） | [12-知识库设计.md](../12-知识库设计.md) §2 |
| 复用 | R1~R7（样板重复、双内容体系、双 CourseSection、无公共校验层等） | [08-复用设计.md](../08-复用设计.md) §2 |
| 存储 | S1~S5（standalone 耦合、凭据明文、无自动备份、采集存储、PG 迁移预留） | [14-存储设计.md](../14-存储设计.md) §5 |
| 决策遗留 | C2（凭证未提供）/ C3（采集源未录入）/ C4（SMTP 未配置） | [ADR-002](../03_solution/decisions/ADR-002-公众号官方API设计凭证后补.md)~[ADR-004](../03_solution/decisions/ADR-004-SMTP后台配置.md) |

## 2. 治理级风险登记

| ID | 风险 | 影响 | 概率 | 缓解/应对 | 触发信号（何时升级处置） | 状态 |
| --- | --- | --- | --- | --- | --- | --- |
| RISK-001 | News→Article 数据迁移（C1/ADR-001）期间数据不一致或丢数据 | 官网新闻栏目异常 | 中 | 迁移脚本 + 迁移前后计数核对 + 回滚备份（VAL 强制项，见 validation-plan） | dry-run 计数不平或抽样内容缺失 | open |
| RISK-002 | 微信 API 政策/频控变动导致 S6 功能失效 | 公众号发布/客服中断 | 低 | 能力封装单点（WechatAccount + 发布队列），策略可配；ADR-002 凭证后补不阻塞；已认证服务号（ADR-013）降低接口能力风险 | 微信 errcode 频控/权限类告警邮件 | open |
| RISK-003 | AI 供应商单点（起步沿用 Modelscope，ADR-014）：服务不可用/余额耗尽致客服瘫痪 | AI 咨询全停 | 中 | SOL-003 多模型网关 + 默认/兜底机制（REQ-F-010）+ 余额阈值邮件（REQ-F-011） | 网关连续失败或余额低于阈值邮件 | open |
| RISK-004 | 并发会话向同一目录产出，造成双体系冲突（C7 英文草稿事件复发） | 文档体系混乱、返工 | 中 | 单会话产出原则（document-standard §9.5）；产出前核对清单；发现即 ADR 处置 | 目录再次出现未知来源文件 | mitigated |
| RISK-005 | 采集内容质量/版权/合规风险（错误信息入库、原文转载授权） | 业务合规与品牌信誉 | 中 | 采集产物默认 pending 强制人工审核（REQ-F-006，SuperAdmin 独享审核 ADR-017）；来源登记；拒绝即 rejected 不删除 | 审核拒审率异常升高或版权投诉 | open |
| RISK-006 | 敏感凭据（微信 secret/SMTP/LLM Key）明文入库被拖库泄露 | 账号资产损失 | 中 | isEncrypted + AES 加解密、密钥走环境变量（S2 决策，SOL-001 落地）；上线改默认密码 | 安全巡检发现明文凭证或异常访问日志 | open |
| RISK-007 | SQLite 在采集/发布定时任务叠加下写竞争加剧（本期保持 SQLite，ADR-019） | 任务超时/接口变慢 | 低 | 任务串行 + 限速预算（10-性能 §3）；触发 P1 预案时评估 PG 迁移（14-存储 S5） | SQLITE_BUSY 报错或任务耗时超预算 | open |
| RISK-008 | 服务器单点（宝塔单机）：宕机即全站不可用 | 业务中断 | 低 | 每日自动备份（SOL-001 backup 任务）；监控告警走邮箱提醒（system_error 事件） | system_error 邮件或服务不可达 | open |
| RISK-009 | 新仓重写引入功能遗漏/偏差（对照旧仓 25 管理页 + 40 API，无自动化测试兜底） | 切换后功能缺失 | 高 | 平行新仓降低现网回归风险（ADR-011，切换前旧仓不受影响）；新仓对照旧仓功能清单逐项核验（VAL）；关键路径手工回归清单 | VAL 验收 fail 或切换后功能异常报告 | open |

> 触发信号列为监控落地的推断设计（Q7 轮确认推断内容可写入并标注），里程碑复审时可调整。

## 2.1 本轮风险（2026-10-12，current-plan §12 R-P1~R-P9）

| ID | 风险 | 影响 | 概率 | 缓解/应对 | 触发信号 | 状态 |
| --- | --- | --- | --- | --- | --- | --- |
| R-P1 | 前台恢复后视觉仍与 main 有偏差 | 违反 REQ-F-014 | 中 | 直接移植 main 组件与 globals.css，数据适配层隔离；字体/动画在测试中固定 | 截图 diff >1% | open |
| R-P2 | 管理端令牌污染前台 | 前台外观漂移 | 中 | 管理端令牌仅在 `[data-theme="manager"]`；P02 之后每方向跑 `npm run test:visual` | 前台截图 diff 回升 | open |
| R-P3 | 沙箱无法安装 Playwright 浏览器 | visual/E2E 无法执行 | 中 | 改用系统 chromium 路径或在可联网环境执行；验证记 UNKNOWN 不记 PASS | `npx playwright install` 失败 | open |
| R-P4 | 迁移顺序被打乱 | 迁移冲突/数据风险 | 低 | 仅 P04/P06/P12 可新增迁移；验证命令检查 migrations 路径归属 | 非 P04/P06/P12 出现迁移 | open |
| R-P5 | 无凭证导致公众号/邮件/Coze 知识库仅 mock 验证 | 真实联调问题后置 | 高 | 契约测试 + 显式 UNKNOWN；拿到凭证后补联调留证 | U-B1/U-B4 无凭证；Coze PAT 无 dataset 权限 | open |
| R-P6 | uploads 移出 git 造成现有图片丢失 | 前台/后台图片 404 | 中 | P14 先导出到运行时目录并写迁移说明，再 `git rm --cached` | 图片 404 | open |
| R-P7 | SQLite 写并发（调度+请求） | SQLITE_BUSY | 低 | 短事务；P04 设 busy_timeout | SQLITE_BUSY 报错 | open |
| R-P8 | 恢复首页区块配置后默认配置与 main 不一致或被误改（ADR-024） | 前台外观漂移 | 中 | 默认配置复现 main 且受 visual 门禁保护；管理页提供"恢复默认" | visual diff 回升；区块顺序断言失败 | open |
| R-P9 | Coze 接口/权限限制：md 不被接受（按 txt 上传）、单文件上限未知、PAT 有效期约 30 天、需 createDocument 权限（ADR-025） | 知识库同步失败 | 中 | 封装单模块 + 明确权限提示 + 本地兜底双轨；联调时核实上限 | Coze 返回非 0 code / document status=9 | open |

## 3. 风险审查节奏

- 每个里程碑（M1~M4）验收时复查本登记册：新风险入册、已缓解转状态。
- 触发式：任何 blocked 任务、任何 ADR 新增时检查关联风险。
