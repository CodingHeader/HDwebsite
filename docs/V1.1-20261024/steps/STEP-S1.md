# STEP S1（安全）

## V11-SEC-01 XSS 净化器不闭合标签放行修复（Hark，中）
目标：净化器对不闭合标签（如 <img onerror=...>）不再原样放行；文章/服务/课程详情共链路全部覆盖
步骤：写复现单测：<img onerror=alert(1)>、<img src=x onerror、<svg onload= 等不闭合/畸形输入进入 sanitizeRichContent；定位放行原因（容错解析分支）并修复：畸形标签按白名单解析器整体拒绝或强制闭合后再过滤；回归文章/服务/课程详情渲染（共用净化入口），确认合法内容不受影响；证据含修复前后行为对照
验收：畸形不闭合标签经净化后不含事件属性/脚本向量（单测断言）；既有合法富文本渲染不回归（既有净化单测全绿 + 详情页冒烟）；净化入口唯一：三个详情页走同一函数（grep 证实无旁路）

## V11-SEC-02 限流真实 IP 与登录限流 429（P2，中）
目标：限流 IP 取值不可被 x-forwarded-for 伪造；登录限流返回 429 + Retry-After
步骤：梳理限流取 IP 链路，改为仅在可信反代配置（env TRUST_PROXY）下读 x-forwarded-for 首跳，否则取 socket 地址；登录限流响应改 429 + Retry-After 头（同步契约测试）；单测：伪造 XFF 不改变限流键；429 语义断言
验收：伪造 X-Forwarded-For 不能绕过限流（单测）；登录被限流返回 429（原 400）；契约测试相应更新且全绿

## V11-SEC-03 user-actions 频控、上传魔数校验与安全响应头（P2，中）
目标：公开埋点端点加频控；上传补魔数正向校验（K2 默认：容量维持 20MB 不变）；全站安全响应头
步骤：/api/user-actions 加 IP+类型频控（复用限流器）；媒体上传补魔数校验（JPEG/PNG/GIF/WebP/按扩展白名单）；与既有伪装检测口径对齐；容量限制不动（K2）；next.config.ts 加 X-Content-Type-Options/X-Frame-Options/Referrer-Policy/HSTS(可选 env) 响应头；单测 + 手工 curl 证据
验收：user-actions 超频返回 429；伪造扩展名的非图片文件被拒（魔数断言）；响应含全部目标安全头；K2 决议（保持 20MB）写入证据

## V11-SEC-04 chat 会话归属与采集 SSRF 防护（P2，中）
目标：chat 会话改服务端签发可校验；采集抓取目标禁私网/环回地址
步骤：chat：首次访问由服务端签发 httpOnly 会话 cookie（签名 sessionId），请求校验签名，替代裸信 body.sessionId；历史读写按会话隔离；采集 fetch 前 DNS 解析并校验目标 IP 非私网/环回/链路本地（含重定向后复检或禁跟随跨源重定向）；单测：伪造他人 sessionId 取不到历史；采集 http://169.254.169.254/ 127.0.0.1/10.x 被拒
验收：未签名/他人 sessionId 无法读写会话；SSRF 目标黑名单生效（单测）；正常 chat/采集流程不回归（e2e 冒烟）
