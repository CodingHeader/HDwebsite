# STEP S10（兼容入口与 SEO/e2e）

## V11-COMPAT-01 旧 API 入口兼容（P2，小）
目标：/api/ai-config、/api/chat/completion 等旧入口重定向/别名到现役端点（不复活死代码）
步骤：盘点旧入口的原语义（main 对照），映射到现役端点（307/308 或适配转发）；每入口一条契约级测试（状态码+落点）
验收：旧入口不再裸 404（映射表逐条核）；现役端点行为不受影响

## V11-SEO-01 OG 标签、JSON-LD 绝对地址与 sitemap 扩展（P2，小）
目标：K4=加：全站 OG meta（视觉零变化）；JSON-LD 绝对 URL；sitemap 收录导航类页面
步骤：layout metadata 加 openGraph（title/description/url/image 用绝对地址，读 APP_ORIGIN）；JSON-LD url/image 改绝对地址；sitemap 补关于/课程/服务等静态导航页；单测：metadata 输出含 og:*；sitemap 快照
验收：og:title/og:image/og:url 全站存在（构建产物断言）；JSON-LD 无相对地址；sitemap 条目扩展有清单

## V11-E2E-375 375 宽度管理端 CRUD e2e（P2，中）
目标：补 375 视口的管理端关键 CRUD e2e（登录/文章/媒体/招生），保证移动管理可用
步骤：新增 375 视口 e2e 套件：登录→列表→新建/编辑→保存→删除；失败即修 UI（响应式缺陷清单入证据）
验收：375 套件全绿；发现的响应式缺陷逐条修复或登记
