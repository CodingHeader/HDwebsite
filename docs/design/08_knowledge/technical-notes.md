---
id: TECH-NOTES
type: knowledge
title: 技术备忘
status: active
created: 2026-10-10
updated: 2026-10-10
---

# 技术备忘（项目非显而易见的技术事实）

## TN-001：standalone 启动链

部署产物为 Next standalone：`server.js` 启动需 **BUILD_ID 同步**（构建后复制进 standalone）、`DATABASE_URL` 运行时注入。改动该链路需同步更新部署脚本。

## TN-002：AI 88s/15s 超时由来

前台 AI 等待宽限 88s（服务器请求超时）+ 15s（客户端提示阈值）为兼容 Modelscope 冷启动的历史值；重构后由 llm-gateway 统一 30s 可配（SOL-003 §3.1），88s 口径废弃。

## TN-003：/uploads 静态目录经 rewrite

上传目录不在 Next 静态约定路径内，靠 rewrite 规则映射；迁移服务器时须一并迁移 uploads 目录并保留 rewrite（04-部署）。

## TN-004：JSON-in-String 容错读法

Setting.value 等 JSON 以字符串存 SQLite，读取需双重解析且**必须 try/catch**：历史数据存在脏值，直抛会 500（站点页尤其敏感）。

## TN-005：品牌链残留

站点品牌从 xgnedu 克隆而来：`scripts/fix-brand-settings.mjs` 用于批量修正 Setting 品牌值；新增品牌相关 Setting 时检查该脚本是否需要同步（registry SSOT 模式）。页面可见文案已全量核查为弘道教育（无 xgnedu 残留）。

## TN-006：seed 幂等与默认口令

`prisma/seed.ts` 幂等可重跑（upsert）。默认口令 **admin/admin123** 仅限初始化，生产部署后必须立即改密（04-部署 §安全检查清单）。

## TN-007：registry SSOT 模式

页脚链接、品牌、菜单、设置项均由 registry 常量文件做单一事实源（06-逻辑 §registry）：新增配置项先改 registry 再接 UI，禁止散落硬编码。

## TN-008：迁移史与 PG 预留

Prisma 已有 9 份迁移；SQLite→PG 兼容性靠避免 SQLite 专有特性维持（14-存储 S2）；新增模型注意 `String` 长度与 `Json` 字段在 PG 的等价性，给 ICE-PG 留路。

## TN-009：调度循环初始化点（新仓保持）

Next 16 `instrumentation.ts` 的 `register()` 为进程启动钩子（server 端执行一次），调度基座循环在此启动，PM2 重启自动恢复；dev 热重载会重复触发——用全局符号（globalThis 锁）防重入。

## TN-010：zod schema 就近定义模式

路由级校验 schema 与 route handler 同文件定义（03-后端契约）；跨路由复用才提升至共享层。新仓新增 SOL API 沿用此模式，避免集中 schema 文件膨胀。

## TN-011：上传服务幂等链

upload-service：文件写入 + sharp 统一处理（缩略图/格式）+ Media 记录三位一体；迁移服务器时 /uploads 目录与 Media 表必须成对迁移，否则前台图片 404（关联 TN-003）。

## TN-012：AI 会话历史裁剪

AIChatHistory 注入模型前按 ≤40 条 / 4000 字裁剪（05-交互 §2）；新仓将该裁剪逻辑收敛进 llm-gateway 统一实现，双端（官网/公众号）一致。

## TN-013：双部署路径差异

宝塔 PM2 standalone（生产，80→6789）与 docker-compose（备选）并存：环境变量注入方式不同（PM2 走启动脚本/ecosystem，docker 走 compose env）；改部署相关配置需两处同步核验（11-配置）。

## TN-014：JWT 双 token 机制

accessToken + refreshToken 双令牌（06-逻辑认证流程）：refresh 端点轮换刷新；管理端 401 拦截统一走 api-auth 工具。新仓新增管理 API 必须复用该工具鉴权，禁止自行解码校验。

## TN-015：新仓 Next.js 版本 breaking changes 风险

新仓模板 AGENTS.md 明示：其 Next.js 版本较训练数据有 breaking changes（API、约定、文件结构可能均不同）。M1 新仓初始化后、写任何代码前必须先读 `node_modules/next/dist/docs/` 内对应指南，并据此核对 SOL-001~006 中的路由/组件/数据写法；禁止凭记忆套用旧版 App Router 约定（Q9 轮登记，M1 开工第一步）。
