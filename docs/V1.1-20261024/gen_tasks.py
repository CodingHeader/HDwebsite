#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
V1.1 任务卡唯一源（gen_tasks.py，V0.8 先例）。
- 生成 docs/V1.1-20261024/tasks/*.md（16 字段）与 steps/STEP-S*.md
- 内建检查：依赖环检测、允许修改路径两两重叠检测（同一所有权段内允许共享，跨 lane 冲突即报错）
用法：python gen_tasks.py
"""
import json, os, sys, itertools

OUT = os.path.join(os.path.dirname(__file__))
TASKS = os.path.join(OUT, "tasks")
STEPS = os.path.join(OUT, "steps")
os.makedirs(TASKS, exist_ok=True)
os.makedirs(STEPS, exist_ok=True)

# 每卡字段：id, slice, owner, title, goal, deps(list), paths(list), steps(list), accept(list),
#           verify(str), evidence(str), forbid(list), grade, size, source
C = []
def card(**k): C.append(k)

# ───────────────────────── S0 ─────────────────────────
card(id="V11-G-01", slice="S0", owner="P2", title="门禁基线与快照复测",
 goal="在 0728c46 上固化 V1.1 起点门禁基线（本地全绿），登记沙箱与本机环境差异",
 deps=[], paths=["docs/design/06_validation/evidence/V11/G-01/**"],
 steps=["本地跑 lint/typecheck/test/check-assets/build/check-root 五连并记录",
        "复核沙箱三项声明：crud.ts F-01 在树（已核实 crud.ts:74-96）、zz-dbg 已删、check-root 51 条 PASS",
        "记录 build 的 no such table 只出现在未 migrate 沙箱（本机 dev.db 已迁移，build 绿），写入证据"],
 accept=["五连全绿（lint 0 warning / tsc / 1712 / build / check-root）",
         "三项声明在证据中有本机复核结论",
         "基线数值表入 evidence"],
 verify="npm run lint && npx tsc --noEmit && npm test && npm run build && npm run check:root",
 evidence="docs/design/06_validation/evidence/V11/G-01/", forbid=["src/**", "tests/**", "prisma/**"],
 grade="低", size="小", source="V1.1 审计 §一")

# ───────────────────────── S1 安全 ─────────────────────────
card(id="V11-SEC-01", slice="S1", owner="Hark", title="XSS 净化器不闭合标签放行修复",
 goal="净化器对不闭合标签（如 <img onerror=...>）不再原样放行；文章/服务/课程详情共链路全部覆盖",
 deps=["V11-G-01"], paths=["src/lib/security/xss-filter.ts", "src/lib/__tests__/xss*.test.ts", "docs/design/06_validation/evidence/V11/SEC-01/**"],
 steps=["写复现单测：<img onerror=alert(1)>、<img src=x onerror、<svg onload= 等不闭合/畸形输入进入 sanitizeRichContent",
        "定位放行原因（容错解析分支）并修复：畸形标签按白名单解析器整体拒绝或强制闭合后再过滤",
        "回归文章/服务/课程详情渲染（共用净化入口），确认合法内容不受影响",
        "证据含修复前后行为对照"],
 accept=["畸形不闭合标签经净化后不含事件属性/脚本向量（单测断言）",
         "既有合法富文本渲染不回归（既有净化单测全绿 + 详情页冒烟）",
         "净化入口唯一：三个详情页走同一函数（grep 证实无旁路）"],
 verify="npx vitest run src/lib/__tests__ && npm run build",
 evidence="docs/design/06_validation/evidence/V11/SEC-01/", forbid=["src/contracts/**", "prisma/**"],
 grade="高", size="中", source="V1.1 审计 §安全.1（已二次核实）")

card(id="V11-SEC-02", slice="S1", owner="P2", title="限流真实 IP 与登录限流 429",
 goal="限流 IP 取值不可被 x-forwarded-for 伪造；登录限流返回 429 + Retry-After",
 deps=["V11-G-01"], paths=["src/lib/**/rate*、src/lib/api-handler.ts（如涉）", "src/app/api/auth/**", "src/lib/__tests__/*rate*.test.ts", "docs/design/06_validation/evidence/V11/SEC-02/**"],
 steps=["梳理限流取 IP 链路，改为仅在可信反代配置（env TRUST_PROXY）下读 x-forwarded-for 首跳，否则取 socket 地址",
        "登录限流响应改 429 + Retry-After 头（同步契约测试）",
        "单测：伪造 XFF 不改变限流键；429 语义断言"],
 accept=["伪造 X-Forwarded-For 不能绕过限流（单测）",
         "登录被限流返回 429（原 400）",
         "契约测试相应更新且全绿"],
 verify="npx vitest run src/lib/__tests__ && npx tsc --noEmit",
 evidence="docs/design/06_validation/evidence/V11/SEC-02/", forbid=["src/contracts/**（测试内 mock 除外）"],
 grade="中", size="中", source="V1.1 审计 §安全.2/3")

card(id="V11-SEC-03", slice="S1", owner="P2", title="user-actions 频控、上传魔数校验与安全响应头",
 goal="公开埋点端点加频控；上传补魔数正向校验（K2 默认：容量维持 20MB 不变）；全站安全响应头",
 deps=["V11-G-01"], paths=["src/app/api/user-actions/route.ts", "src/app/api/media/**（上传路径）", "next.config.ts（headers 段）", "src/lib/__tests__/*", "docs/design/06_validation/evidence/V11/SEC-03/**"],
 steps=["/api/user-actions 加 IP+类型频控（复用限流器）",
        "媒体上传补魔数校验（JPEG/PNG/GIF/WebP/按扩展白名单）；与既有伪装检测口径对齐；容量限制不动（K2）",
        "next.config.ts 加 X-Content-Type-Options/X-Frame-Options/Referrer-Policy/HSTS(可选 env) 响应头",
        "单测 + 手工 curl 证据"],
 accept=["user-actions 超频返回 429", "伪造扩展名的非图片文件被拒（魔数断言）",
         "响应含全部目标安全头", "K2 决议（保持 20MB）写入证据"],
 verify="npx vitest run src/lib/__tests__ && npm run build",
 evidence="docs/design/06_validation/evidence/V11/SEC-03/", forbid=["package.json", "prisma/**"],
 grade="中", size="中", source="V1.1 审计 §安全.4/5；K2 默认方案")

card(id="V11-SEC-04", slice="S1", owner="P2", title="chat 会话归属与采集 SSRF 防护",
 goal="chat 会话改服务端签发可校验；采集抓取目标禁私网/环回地址",
 deps=["V11-G-01"], paths=["src/lib/chat-service.ts", "src/app/api/chat/**", "src/lib/collect-engine.ts", "src/lib/__tests__/*", "docs/design/06_validation/evidence/V11/SEC-04/**"],
 steps=["chat：首次访问由服务端签发 httpOnly 会话 cookie（签名 sessionId），请求校验签名，替代裸信 body.sessionId；历史读写按会话隔离",
        "采集 fetch 前 DNS 解析并校验目标 IP 非私网/环回/链路本地（含重定向后复检或禁跟随跨源重定向）",
        "单测：伪造他人 sessionId 取不到历史；采集 http://169.254.169.254/ 127.0.0.1/10.x 被拒"],
 accept=["未签名/他人 sessionId 无法读写会话", "SSRF 目标黑名单生效（单测）",
         "正常 chat/采集流程不回归（e2e 冒烟）"],
 verify="npx vitest run src/lib/__tests__ && npm run test:e2e",
 evidence="docs/design/06_validation/evidence/V11/SEC-04/", forbid=["src/contracts/**"],
 grade="高", size="中", source="V1.1 审计 §安全.6/7")

# ───────────────────────── S2 公众号发布 ─────────────────────────
card(id="V11-WX-01", slice="S2", owner="Hark", title="发布前置：封面与摘要生成链",
 goal="内容中枢/采集审核入库时生成封面与摘要，公众号草稿 thumb_media_id 有稳定来源",
 deps=["V11-G-01"], paths=["src/lib/wechat.ts", "src/lib/publish*（如涉）", "src/lib/content*（入库链路）", "src/lib/__tests__/*", "docs/design/06_validation/evidence/V11/WX-01/**"],
 steps=["核实草稿 API 对 thumb_media_id 的必填性（微信文档口径写入证据）",
        "入库/审核通过钩子：无封面取正文首图或生成占位封面；摘要取正文截断（既有口径）",
        "单测：无封面文章入库后 cover 非空"],
 accept=["新建/采集入库的内容 cover 与 summary 字段必有值", "既有内容不回填破坏（幂等）"],
 verify="npx vitest run src/lib/__tests__",
 evidence="docs/design/06_validation/evidence/V11/WX-01/", forbid=["prisma/**", "src/contracts/**"],
 grade="高", size="中", source="V1.1 审计 §公众号.1")

card(id="V11-WX-02", slice="S2", owner="Hark", title="正文站内图转存 uploadimg",
 goal="发布前把正文里 /uploads 站内图经素材 uploadimg 转存并替换为微信 URL，公众号不裂图",
 deps=["V11-WX-01"], paths=["src/lib/wechat.ts", "src/lib/publish*（渠道执行器）", "src/lib/__tests__/*", "docs/design/06_validation/evidence/V11/WX-02/**"],
 steps=["发布前解析正文 <img src=\"/uploads/...\"> 列表，逐张 uploadimg（复用 B-07 既有转存），替换 URL",
        "幂等：已替换过的微信 URL 跳过；失败标记渠道错误",
        "mock 测试覆盖替换与幂等"],
 accept=["mock 发布后正文不含 /uploads 引用", "重复发布不重复转存"],
 verify="npx vitest run src/lib/__tests__",
 evidence="docs/design/06_validation/evidence/V11/WX-02/", forbid=["src/contracts/**"],
 grade="高", size="中", source="V1.1 审计 §公众号.2")

card(id="V11-WX-03", slice="S2", owner="Hark", title="发布模式与请求参数修正",
 goal="去除 freepublishEnabled 强制门槛；请求 accountId 生效；「仅草稿箱」模式可达",
 deps=["V11-WX-01"], paths=["src/lib/wechat.ts", "src/lib/publish*（渠道执行器）", "src/app/api/publish-jobs/**（如涉）", "src/lib/__tests__/*", "docs/design/06_validation/evidence/V11/WX-03/**"],
 steps=["发布模式判定改为按渠道配置/请求显式选择 draft_only | draft_and_publish",
        "任务请求的 accountId 覆盖默认值并校验存在性",
        "mock 测试：仅草稿箱模式走 draft 提交且不调 freepublish"],
 accept=["无 freepublishEnabled 也可建任务并发布到草稿箱", "accountId 传错返回明确 4xx 而非忽略"],
 verify="npx vitest run src/lib/__tests__",
 evidence="docs/design/06_validation/evidence/V11/WX-03/", forbid=["src/contracts/**（如必须改走 CCR）"],
 grade="高", size="中", source="V1.1 审计 §公众号.3/4")

card(id="V11-WX-04", slice="S2", owner="Hark", title="发布状态如实回写与重发幂等",
 goal="freepublish/get 查得失败态回写 failed；官网渠道重发不重复建文章",
 deps=["V11-WX-03"], paths=["src/lib/wechat.ts", "src/lib/publish*（website 渠道）", "src/lib/__tests__/*", "docs/design/06_validation/evidence/V11/WX-04/**"],
 steps=["freepublish/get 轮询结果失败/审核不通过 → job 状态 failed + 错误详情（不再恒 published）",
        "website 渠道发布按 externalId/标题+渠道 upsert 幂等",
        "mock 测试：失败回写、重发去重"],
 accept=["mock 失败态 job=failed 且错误可见", "同任务重发官网不产生第二篇文章"],
 verify="npx vitest run src/lib/__tests__",
 evidence="docs/design/06_validation/evidence/V11/WX-04/", forbid=["src/contracts/**"],
 grade="中", size="中", source="V1.1 审计 §公众号.5/6")

# ───────────────────────── S3 内容中枢 UI ─────────────────────────
card(id="V11-HUB-01", slice="S3", owner="Hark", title="内容中枢编辑/新建/审核界面",
 goal="补齐编辑、新建、提交审核、审核（通过/拒绝）界面，接通 /review 端点",
 deps=["V11-WX-01"], paths=["src/app/manager/content-items/**（或实际目录）", "src/components/manager/**（如涉）", "tests/e2e/*content*", "docs/design/06_validation/evidence/V11/HUB-01/**"],
 steps=["现状盘点：内容中枢页面与 /api/content-items 端点能力对照",
        "补编辑/新建表单（复用管理端规范组件）与「提交审核」动作；审核界面（通过/拒绝+理由）调 /review",
        "e2e：新建→提交→审核通过/拒绝 闭环"],
 accept=["UI 全流程可用（e2e 闭环）", "权限口径不变（content:edit / 审核权独享 ADR-017）"],
 verify="npm run test:e2e && npm run build",
 evidence="docs/design/06_validation/evidence/V11/HUB-01/", forbid=["src/contracts/**"],
 grade="高", size="大", source="V1.1 审计 §内容中枢.1/3")

card(id="V11-HUB-02", slice="S3", owner="Hark", title="预览渲染、渠道状态机与 externalId 契约",
 goal="预览走 MarkdownRenderer；渠道状态补 scheduled/publishing 写入；externalId 契约变更（CCR-1 已预批）",
 deps=["V11-HUB-01"], paths=["src/app/manager/content-items/**", "src/contracts/**（externalId 最小增量）", "src/lib/**（状态写入点）", "docs/design/06_validation/evidence/V11/HUB-02/**"],
 steps=["预览组件替换为 MarkdownRenderer（与前台同管线）",
        "发布执行器在排队/执行期写入 scheduled/publishing 状态（渠道状态表）",
        "契约最小增量：内容条目补 externalId 字段（CCR-1：用户在 V1.1 指令中已预批），契约测试同步"],
 accept=["预览与前台渲染一致（抽查）", "状态机含 scheduled/publishing 且可观测", "契约增量最小且测试全绿"],
 verify="npx vitest run && npm run build",
 evidence="docs/design/06_validation/evidence/V11/HUB-02/", forbid=["prisma/**（externalId 若已有列则不动表；若缺列→停止并上报）"],
 grade="高", size="中", source="V1.1 审计 §内容中枢.2/4/5；CCR-1")

# ───────────────────────── S4 采集与调度 ─────────────────────────
card(id="V11-COL-01", slice="S4", owner="P1", title="调度锁语义与手动执行并发保护",
 goal="锁过期时间覆盖单批最长执行；手动「立即执行」防并发；失败告警接入 notify",
 deps=["V11-G-01"], paths=["src/lib/collect-engine.ts", "src/lib/scheduler*（如涉）", "src/app/api/collect*/**", "src/lib/__tests__/*", "docs/design/06_validation/evidence/V11/COL-01/**"],
 steps=["锁 TTL 与单批上限对齐（10min < 30min 的重复启动窗口消除：心跳续期或 TTL=批次上限+余量）",
        "手动执行入口加运行中互斥（同任务/同源）",
        "采集失败事件接入 notify（collect_failed 已有事件，接手动执行路径）"],
 accept=["单批 30 分钟内不会被重复调度（单测/时间推进）", "手动连点不产生并发执行", "失败有告警记录"],
 verify="npx vitest run src/lib/__tests__",
 evidence="docs/design/06_validation/evidence/V11/COL-01/", forbid=["prisma/**"],
 grade="中", size="中", source="V1.1 审计 §采集.1/2")

card(id="V11-COL-02", slice="S4", owner="P1", title="cron 语义、开关解绑与时区配置",
 goal="源级 cron 语义修正或文档化；图片转存开关独立；部署件时区 Asia/Shanghai",
 deps=["V11-G-01"], paths=["src/lib/collect-engine.ts", "src/lib/**（开关读取点）", "Dockerfile", "docker-compose.yml", ".env.example", "src/lib/__tests__/*", "docs/design/06_validation/evidence/V11/COL-02/**"],
 steps=["采集源 cron 受总任务门控的语义：实现「源启用即按自身 cron」或在管理端明示门控关系（择一，证据说明）",
        "图片转存开关与「默认入知识库」解绑（独立设置键）",
        "Dockerfile/compose/.env.example 加 TZ=Asia/Shanghai"],
 accept=["源 cron 行为与其 UI 提示一致", "两开关互不影响（单测）", "容器内 date 为 CST"],
 verify="npx vitest run src/lib/__tests__ && npm run build",
 evidence="docs/design/06_validation/evidence/V11/COL-02/", forbid=["prisma/**"],
 grade="低", size="小", source="V1.1 审计 §采集.3/4/5")

# ───────────────────────── S5 知识库 ─────────────────────────
card(id="V11-KB-02", slice="S5", owner="Hark", title="Coze 请求形态对齐官方文档",
 goal="上传/推送/检索的 Coze 请求形态与官方文档一致，mock 测试改为验证正确形态",
 deps=["V11-G-01"], paths=["src/lib/kb/**（coze 客户端）", "src/lib/__tests__/*", "docs/design/06_validation/evidence/V11/KB-02/**"],
 steps=["对照官方文档列出每个端点的正确请求/响应形态（入证据）",
        "修正客户端请求构造与响应解析",
        "mock 测试重写为断言正确形态（原测试反向后修正）"],
 accept=["mock 请求体逐字段符合文档", "既有 dry-run 冒烟（INT-01 脚本）通过"],
 verify="npx vitest run src/lib/__tests__ && node scripts/smoke-coze.mjs",
 evidence="docs/design/06_validation/evidence/V11/KB-02/", forbid=["src/contracts/**"],
 grade="高", size="中", source="V1.1 审计 §知识库.2")

card(id="V11-KB-01", slice="S5", owner="Hark", title="上传文件推送 Coze 接入",
 goal="本地上传的 KB 文件入库后推送 Coze（pushDocument 接入调用链），幂等可重试",
 deps=["V11-KB-02"], paths=["src/lib/kb/**", "src/app/api/knowledge-files/**（如涉钩子）", "src/lib/__tests__/*", "docs/design/06_validation/evidence/V11/KB-01/**"],
 steps=["上传入库成功钩子 → pushDocument（绑定 base 的 cozeDatasetId 时）",
        "幂等：重复上传/已推送跳过；失败标记 + 重试路径（复用 kb-sync 队列若适配）",
        "mock 测试：上传后 pushDocument 被调且参数正确"],
 accept=["上传后 Coze 收到文件（mock 断言）", "无 datasetId 的库不推送", "失败不影响上传主流程（异步/标记）"],
 verify="npx vitest run src/lib/__tests__",
 evidence="docs/design/06_validation/evidence/V11/KB-01/", forbid=["prisma/**"],
 grade="高", size="中", source="V1.1 审计 §知识库.1")

card(id="V11-KB-03", slice="S5", owner="Hark", title="检索测试页返回结构修复",
 goal="检索测试页按接口真实返回 {local, coze} 渲染，不再恒报「检索失败」",
 deps=["V11-G-01"], paths=["src/app/manager/knowledge-bases/**（测试页）", "src/lib/__tests__/*（如涉）", "docs/design/06_validation/evidence/V11/KB-03/**"],
 steps=["核对检索接口返回结构与页面读取字段差异",
        "页面改读 {local, coze} 并分区展示；空结果与失败态区分",
        "e2e/组件级断言"],
 accept=["测试页对真实返回正确渲染（无假失败）", "失败态仅在接口真错时出现"],
 verify="npm run test:e2e && npm run build",
 evidence="docs/design/06_validation/evidence/V11/KB-03/", forbid=["src/contracts/**"],
 grade="低", size="小", source="V1.1 审计 §知识库.3")

card(id="V11-KB-04", slice="S5", owner="Hark", title="拒审失效与上传正向校验",
 goal="审核拒绝后知识条目失效（回收站切片不可被检索）；上传文件头正向校验（docx=PK zip、md/txt=UTF-8 文本）",
 deps=["V11-G-01"], paths=["src/lib/kb/**（检索过滤与回收站）", "src/app/api/knowledge-files/**", "src/lib/__tests__/*", "docs/design/06_validation/evidence/V11/KB-04/**"],
 steps=["检索查询排除已拒审/回收站条目的切片",
        "上传：黑名单之外补正向魔数（PK\x03\x04 docx；文本类 UTF-8 有效校验）",
        "单测：拒审条目检索不可见；伪造 docx（非 zip）被拒"],
 accept=["拒审/回收站内容检索不到（断言）", "魔数不符上传被 4xx 拒绝"],
 verify="npx vitest run src/lib/__tests__",
 evidence="docs/design/06_validation/evidence/V11/KB-04/", forbid=["prisma/**", "src/contracts/**"],
 grade="中", size="中", source="V1.1 审计 §知识库.4/5")

# ───────────────────────── S6 LLM 与客服 ─────────────────────────
card(id="V11-LLM-01", slice="S6", owner="P2", title="流式超时语义修正",
 goal="30s 限制改为「空闲超时」（相邻 chunk 间），长回复不再被整流截断",
 deps=["V11-G-01"], paths=["src/lib/llm-gateway.ts", "src/app/api/chat/**", "src/lib/__tests__/*", "docs/design/06_validation/evidence/V11/LLM-01/**"],
 steps=["把整流 30s 定时器改为 last-chunk 空闲计时（如 30s 无新 chunk 才断）",
        "总时长上限另设（如 5 分钟）防挂死，写入证据",
        "mock 流测试：>30s 持续输出不被截断"],
 accept=["长回复（mock 60s 流）完整送达", "真挂死连接仍会被空闲超时切断"],
 verify="npx vitest run src/lib/__tests__",
 evidence="docs/design/06_validation/evidence/V11/LLM-01/", forbid=["src/contracts/**"],
 grade="中", size="小", source="V1.1 审计 §LLM.1")

card(id="V11-LLM-02", slice="S6", owner="P2", title="流式 tokens 计量修正",
 goal="流式调用 usage 从流尾帧取值；失败重试不重复计数",
 deps=["V11-G-01"], paths=["src/lib/llm-gateway.ts", "src/lib/llm/**（usage 记录）", "src/lib/__tests__/*", "docs/design/06_validation/evidence/V11/LLM-02/**"],
 steps=["流式 usage 解析：有 usage 帧用之；无则估算口径写入证据（保持 ADR-034 偏差）",
        "失败重试路径的 usage 只记最终成功一次",
        "单测：mock 流 usage 正确、重试不双计"],
 accept=["mock 流 tokens=流尾值", "重试场景无重复记录"],
 verify="npx vitest run src/lib/__tests__",
 evidence="docs/design/06_validation/evidence/V11/LLM-02/", forbid=["prisma/**（沿用 ADR-034 偏差，不动表）"],
 grade="中", size="小", source="V1.1 审计 §LLM.2")

card(id="V11-LLM-03", slice="S6", owner="P2", title="兜底可达性与客服安全模式",
 goal="限频/配额命中时兜底模型仍被尝试；公众号客服支持安全模式 AES 解密；默认场景与风控频率对齐需求",
 deps=["V11-G-01"], paths=["src/lib/llm-gateway.ts", "src/lib/wechat.ts（客服消息）", "src/lib/chat-service.ts（场景/频率）", "src/lib/__tests__/*", "docs/design/06_validation/evidence/V11/LLM-03/**"],
 steps=["限频/配额判断只作用于当前模型，不短路后续兜底链",
        "公众号加密模式：AES 解密支持（配置驱动 safe/compatible/safe 模式）",
        "默认场景与风控频率按需求文档核对并修正（差异入证据）"],
 accept=["主模型限频时兜底仍被调用（mock）", "AES 密文消息可解密回复（mock）", "默认场景/频率与需求一致"],
 verify="npx vitest run src/lib/__tests__",
 evidence="docs/design/06_validation/evidence/V11/LLM-03/", forbid=["src/contracts/**"],
 grade="中", size="中", source="V1.1 审计 §LLM.3/4/5")

# ───────────────────────── S7 邮件 ─────────────────────────
card(id="V11-MAIL-01", slice="S7", owner="P1", title="SMTP 发送异步化",
 goal="邮件发送移出主请求路径（后台队列/异步），发布与余额填报不再被 SMTP 阻塞",
 deps=["V11-G-01"], paths=["src/lib/notify-gateway.ts", "src/lib/**（调用点）", "src/lib/__tests__/*", "docs/design/06_validation/evidence/V11/MAIL-01/**"],
 steps=["梳理同步 await 发送点，改为入队后台处理（复用既有 defer/flushDeferred 机制）",
        "发送超时上限（如 10s）+ 失败标记",
        "单测：主流程不被 SMTP 慢速阻塞（mock 计时）"],
 accept=["SMTP 挂起时主流程 <100ms 返回", "邮件仍会送达（后台）"],
 verify="npx vitest run src/lib/__tests__",
 evidence="docs/design/06_validation/evidence/V11/MAIL-01/", forbid=["prisma/**"],
 grade="中", size="中", source="V1.1 审计 §邮件.1")

card(id="V11-MAIL-02", slice="S7", owner="P1", title="失败重试、HTML 模板与分组一致性",
 goal="failed 记录重启后重试；模板改 HTML 且按事件选择；分组提示与种子规则一致",
 deps=["V11-MAIL-01"], paths=["src/lib/notify-gateway.ts", "src/lib/**（模板/重试）", "prisma/seed.ts（种子规则文案，如涉）", "src/lib/__tests__/*", "docs/design/06_validation/evidence/V11/MAIL-02/**"],
 steps=["启动/定时扫描 failed 记录重试（次数上限 + 退避）",
        "HTML 模板按事件类型选择（before_publish/failed/balance/collect）",
        "管理端分组提示文案与 seed 规则对齐（逐条核对入证据）"],
 accept=["重启后 failed 被重试（单测）", "邮件为 HTML 且事件对应", "按提示配置的收件人能收到对应事件邮件（规则核对表）"],
 verify="npx vitest run src/lib/__tests__",
 evidence="docs/design/06_validation/evidence/V11/MAIL-02/", forbid=["prisma/migrations/**"],
 grade="中", size="中", source="V1.1 审计 §邮件.2/3/4")

# ───────────────────────── S8 管理端体验 ─────────────────────────
card(id="V11-UI-01", slice="S8", owner="Hark", title="文章编辑字段补齐",
 goal="文章编辑表单补 slug、标签、置顶、推荐、热门、SEO 字段（接口已支持的直通；缺的按契约）",
 deps=["V11-G-01"], paths=["src/app/manager/articles/**", "src/components/manager/**（如涉）", "src/lib/__tests__/*（如涉）", "docs/design/06_validation/evidence/V11/UI-01/**"],
 steps=["对照 API/契约列出表单缺失字段清单（入证据）",
        "补表单控件（slug 自动生成+可改、标签多选、三开关、SEO 区）",
        "e2e：编辑并保存全字段回读一致"],
 accept=["全部字段可编辑且保存回读一致", "slug 冲突有明确报错"],
 verify="npm run test:e2e && npm run build",
 evidence="docs/design/06_validation/evidence/V11/UI-01/", forbid=["src/contracts/**（字段已有则不动）"],
 grade="中", size="中", source="V1.1 审计 §管理端.1")

card(id="V11-UI-02", slice="S8", owner="Hark", title="媒体库能力补齐",
 goal="媒体库补内置图并入、缺失文件标记、搜索、分类",
 deps=["V11-G-01"], paths=["src/app/manager/media/**", "src/app/api/media/**（如涉）", "src/lib/__tests__/*", "docs/design/06_validation/evidence/V11/UI-02/**"],
 steps=["内置图并入（复制 public 内置资源入库并去重）",
        "孤儿/缺失扫描接入列表标记（D-14 既有孤儿扫描复用）",
        "列表加搜索与分类筛选"],
 accept=["四能力可用（e2e 或组件断言）", "缺失标记与真实文件状态一致"],
 verify="npm run test:e2e && npm run build",
 evidence="docs/design/06_validation/evidence/V11/UI-02/", forbid=["prisma/**"],
 grade="中", size="中", source="V1.1 审计 §管理端.2")

card(id="V11-UI-03", slice="S8", owner="Hark", title="关联字段选择器",
 goal="表单中的数字 ID 关联字段（categoryId/majorId 等）改为搜索下拉选择",
 deps=["V11-G-01"], paths=["src/components/manager/**（通用选择器组件）", "src/app/manager/**（各表单接入）", "docs/design/06_validation/evidence/V11/UI-03/**"],
 steps=["实现通用 RelationSelect（远程搜索 + 缓存 + 可清空）",
        "接入全部手填 ID 的表单（盘点清单入证据）",
        "e2e：选分类保存成功"],
 accept=["无任何表单再需手填数字 ID（盘点表全勾）", "选择器有防抖与空态"],
 verify="npm run test:e2e && npm run build",
 evidence="docs/design/06_validation/evidence/V11/UI-03/", forbid=["src/contracts/**"],
 grade="中", size="中", source="V1.1 审计 §管理端.3")

card(id="V11-UI-04", slice="S8", owner="Hark", title="排序全量生效",
 goal="列表排序操作对全量数据生效（非仅当前页）",
 deps=["V11-G-01"], paths=["src/app/manager/**（排序调用点）", "src/app/api/**（排序端点，如涉）", "src/lib/__tests__/*", "docs/design/06_validation/evidence/V11/UI-04/**"],
 steps=["定位排序实现（按当前页 id 集合排序的缺陷点）",
        "改为按全量条件排序（后端按 sort 字段整体调整或拖拽权重重算）",
        "单测：跨页排序后顺序全局正确"],
 accept=["跨页排序结果全局有序", "既有分页不受影响"],
 verify="npx vitest run src/lib/__tests__",
 evidence="docs/design/06_validation/evidence/V11/UI-04/", forbid=["prisma/**"],
 grade="中", size="小", source="V1.1 审计 §管理端.4")

card(id="V11-UI-05", slice="S8", owner="Hark", title="文章编辑/列表对旧 /manager/news 兼容",
 goal="/manager/news 入口重定向到文章管理（旧链接可达）",
 deps=["V11-G-01"], paths=["src/app/manager/news/**", "docs/design/06_validation/evidence/V11/UI-05/**"],
 steps=["新建 /manager/news 页面永久重定向至 /manager/articles"],
 accept=["旧链接 308/302 到新址（e2e 或 curl 证据）"],
 verify="npm run build && curl -s -o /dev/null -w \"%{http_code} %{redirect_url}\" http://127.0.0.1:6789/manager/news",
 evidence="docs/design/06_validation/evidence/V11/UI-05/", forbid=["src/contracts/**"],
 grade="低", size="极小", source="V1.1 审计 §管理端.6")

# ───────────────────────── S9 招生 ─────────────────────────
card(id="V11-ENR-01", slice="S9", owner="P1", title="招生同步与学费回写移植 + 唯一性防重",
 goal="main 的招生同步与最低学费回写逻辑移植到 upgrade；唯一键含空值导致的重复写入加应用层防重",
 deps=["V11-G-01"], paths=["src/lib/enrollment*（或实际模块）", "src/app/api/enrollment*/**", "src/lib/__tests__/*", "docs/design/06_validation/evidence/V11/ENR-01/**"],
 steps=["对照 main（hdwebsite_0429）盘点同步/回写逻辑与字段映射",
        "移植为 upgrade 模块（契约/组件规范适配），补测试",
        "唯一键空值防重：应用层 upsert 键（含空值归一化）或部分索引替代方案（不动表则应用层）"],
 accept=["同步与回写行为与 main 对齐（对照表）", "重复推送不产生重复行（单测）"],
 verify="npx vitest run src/lib/__tests__",
 evidence="docs/design/06_validation/evidence/V11/ENR-01/", forbid=["prisma/schema.prisma", "prisma/migrations/**"],
 grade="高", size="大", source="V1.1 审计 §招生.1/2")

card(id="V11-ENR-02", slice="S9", owner="Hark", title="K1 决议执行：招生前台边界",
 goal="按 K1 默认方案：前台不加招生费用表（维持 REQ-F-014）；管理端招生模块体验完善（列表/详情可用性走查）",
 deps=["V11-ENR-01"], paths=["src/app/manager/**（招生相关页）", "docs/V1.1-20261024/**（K1 决议记录）", "docs/design/06_validation/evidence/V11/ENR-02/**"],
 steps=["管理端招生页走查并修交互小缺陷（空态/加载/错误态对齐五态规范）",
        "K1 决议（默认不加前台表）写入 08 与 state，标为可逆的用户后续选项"],
 accept=["管理端五态齐备（走查表）", "K1 决议留痕（未自裁扩权）"],
 verify="npm run build",
 evidence="docs/design/06_validation/evidence/V11/ENR-02/", forbid=["src/app/(web)/**"],
 grade="低", size="小", source="K1 默认方案；审计 §招生.3")

# ───────────────────────── S10 兼容与 SEO ─────────────────────────
card(id="V11-COMPAT-01", slice="S10", owner="P2", title="旧 API 入口兼容",
 goal="/api/ai-config、/api/chat/completion 等旧入口重定向/别名到现役端点（不复活死代码）",
 deps=["V11-G-01"], paths=["src/app/api/ai-config/**", "src/app/api/chat/completion/**", "src/lib/__tests__/*", "docs/design/06_validation/evidence/V11/COMPAT-01/**"],
 steps=["盘点旧入口的原语义（main 对照），映射到现役端点（307/308 或适配转发）",
        "每入口一条契约级测试（状态码+落点）"],
 accept=["旧入口不再裸 404（映射表逐条核）", "现役端点行为不受影响"],
 verify="npx vitest run src/lib/__tests__",
 evidence="docs/design/06_validation/evidence/V11/COMPAT-01/", forbid=["src/contracts/**"],
 grade="低", size="小", source="V1.1 审计 §管理端.7")

card(id="V11-SEO-01", slice="S10", owner="P2", title="OG 标签、JSON-LD 绝对地址与 sitemap 扩展",
 goal="K4=加：全站 OG meta（视觉零变化）；JSON-LD 绝对 URL；sitemap 收录导航类页面",
 deps=["V11-G-01"], paths=["src/app/(web)/**（layout/页面 metadata）", "src/app/sitemap.ts", "src/lib/__tests__/*", "docs/design/06_validation/evidence/V11/SEO-01/**"],
 steps=["layout metadata 加 openGraph（title/description/url/image 用绝对地址，读 APP_ORIGIN）",
        "JSON-LD url/image 改绝对地址",
        "sitemap 补关于/课程/服务等静态导航页",
        "单测：metadata 输出含 og:*；sitemap 快照"],
 accept=["og:title/og:image/og:url 全站存在（构建产物断言）", "JSON-LD 无相对地址", "sitemap 条目扩展有清单"],
 verify="npx vitest run src/lib/__tests__ && npm run build",
 evidence="docs/design/06_validation/evidence/V11/SEO-01/", forbid=["tests/visual/reference/**（OG 不可见，基线不变）"],
 grade="低", size="小", source="K4 默认方案（加）；审计 §运维.3")

card(id="V11-E2E-375", slice="S10", owner="P2", title="375 宽度管理端 CRUD e2e",
 goal="补 375 视口的管理端关键 CRUD e2e（登录/文章/媒体/招生），保证移动管理可用",
 deps=["V11-UI-01", "V11-UI-02", "V11-UI-03"], paths=["tests/e2e/*375*", "docs/design/06_validation/evidence/V11/E2E-375/**"],
 steps=["新增 375 视口 e2e 套件：登录→列表→新建/编辑→保存→删除",
        "失败即修 UI（响应式缺陷清单入证据）"],
 accept=["375 套件全绿", "发现的响应式缺陷逐条修复或登记"],
 verify="npm run test:e2e",
 evidence="docs/design/06_validation/evidence/V11/E2E-375/", forbid=["src/app/(web)/**"],
 grade="中", size="中", source="V1.1 审计 §管理端.5")

# ───────────────────────── S11 运维与性能 ─────────────────────────
card(id="V11-OPS-01", slice="S11", owner="P1", title="备份恢复演练",
 goal="真实执行一次备份→恢复→校验闭环，更新恢复手册（D-15 既有）",
 deps=["V11-G-01"], paths=["scripts/**（如涉）", "docs/design/**（手册）", "docs/design/06_validation/evidence/V11/OPS-01/**"],
 steps=["用 backup 接口/脚本做一次全备份（db+uploads+kb）",
        "在临时目录恢复并抽查内容一致性（行数/文件数）",
        "手册补演练步骤与本次实测输出"],
 accept=["恢复后应用可启动并读取数据（证据）", "手册含可复现步骤"],
 verify="npm test（backup 相关）+ 演练命令入证据",
 evidence="docs/design/06_validation/evidence/V11/OPS-01/", forbid=["prisma/**"],
 grade="中", size="小", source="V1.1 审计 §运维.1")

card(id="V11-PERF-01", slice="S11", owner="P1", title="性能基线修复与测量",
 goal="measure-baseline 在生产模式可用；建立 LCP/Lighthouse 本地基线（记录口径）",
 deps=["V11-G-01"], paths=["scripts/measure-baseline.mjs", "docs/design/06_validation/evidence/V11/PERF-01/**"],
 steps=["修 D-03 env 强校验导致的启动即退（脚本注入所需 env 或改用健康接口探测）",
        "对 5 个关键路由跑 Lighthouse（本地生产模式），记录 LCP/CLS/TBT 基线",
        "异常值登记（不追求优化，V1.1 只建基线）"],
 accept=["脚本可复跑（exit 0）", "基线表入证据"],
 verify="node scripts/measure-baseline.mjs",
 evidence="docs/design/06_validation/evidence/V11/PERF-01/", forbid=["src/**"],
 grade="低", size="小", source="V1.1 审计 §运维.2")

# ───────────────────────── S12 终审 ─────────────────────────
card(id="V11-V-01", slice="S12", owner="subagent-verifier", title="V1.1 全卡独立验收",
 goal="每张已执行卡有 verify.md（PASS/FAIL/UNKNOWN + 命令输出），独立子代理出具",
 deps=["V11-SEC-01","V11-SEC-02","V11-SEC-03","V11-SEC-04","V11-WX-04","V11-HUB-02","V11-KB-04","V11-LLM-03","V11-MAIL-02","V11-UI-05","V11-ENR-02","V11-COMPAT-01","V11-SEO-01","V11-E2E-375","V11-OPS-01","V11-PERF-01","V11-COL-02"],
 paths=["docs/design/06_validation/evidence/V11/**/verify.md"],
 steps=["逐卡 git show + 重跑验收命令（CI 类以 run 结论为准）",
        "结论一词 + 证据路径；FAIL 入返工清单"],
 accept=["verify.md 数 = 已执行卡数", "0 FAIL 遗留（或全部转 blocked 有因）"],
 verify="ls docs/design/06_validation/evidence/V11/*/verify.md | wc -l",
 evidence="docs/design/06_validation/evidence/V11/V-01/", forbid=["src/**", "tests/**"],
 grade="高", size="中", source="AGENTS §6")

card(id="V11-REL-01", slice="S12", owner="main-agent", title="V1.1 终审交付",
 goal="changelog V1.1 段、parity 复核、zip、双端 0 0",
 deps=["V11-V-01"], paths=["docs/design/07_release/changelog.md", "docs/design/02_requirements/parity-matrix.md", "docs/V1.1-20261024/EXEC-*.md", "backups/release/**", "docs/design/06_validation/evidence/V11/REL-01/**"],
 steps=["汇总 verify；FAIL 清零方可收口",
        "changelog 补 V1.1 段；parity 复核（新卡功能并入 F 节口径）",
        "zip（docs/V1.1 + evidence/V11）+ SHA256；git fetch + rev-list 0 0"],
 accept=["双端 0 0", "changelog/parity 有 V1.1 记录", "zip SHA256 入证据"],
 verify="git fetch && git rev-list --left-right --count origin/upgrade...HEAD",
 evidence="docs/design/06_validation/evidence/V11/REL-01/", forbid=["src/**"],
 grade="中", size="小", source="用户指令")

# ── 校验与生成 ─────────────────────────────────────────────
ids = {c["id"] for c in C}
errs = []
for c in C:
    for d in c["deps"]:
        if d not in ids: errs.append(f"{c['id']} 依赖不存在的 {d}")
# 环检测（DFS）
color = {}
def dfs(u, stack):
    color[u] = 1; stack.append(u)
    for c in C:
        if c["id"] == u:
            for d in c["deps"]:
                if color.get(d) == 1: errs.append(f"环: {'→'.join(stack+[d])}")
                elif color.get(d) is None: dfs(d, stack)
    color[u] = 2; stack.pop()
for c in C:
    if color.get(c["id"]) is None: dfs(c["id"], [])
# 路径重叠（粗粒度：同 owner 允许；跨 owner 报警列出人工确认）
def norm(p): return p.split("/**")[0].split("（")[0].strip()
overlap_warn = []
for a, b in itertools.combinations(C, 2):
    if a["owner"] == b["owner"]: continue
    pa = {norm(p) for p in a["paths"]}; pb = {norm(p) for p in b["paths"]}
    inter = {x for x in pa & pb if x and x not in ("docs/design/06_validation/evidence/V11/**",)}
    if inter: overlap_warn.append(f"跨owner路径重叠 {a['id']}({a['owner']}) × {b['id']}({b['owner']}): {sorted(inter)}")

if errs:
    print("CHECK FAILED:"); [print(" -", e) for e in errs]; sys.exit(1)

state = {}
for c in C:
    state[c["id"]] = {"status": "ready" if c["id"] in ("V11-G-01","V11-SEC-01") else "pending",
                      "owner": c["owner"], "verify": None, "blocked_reason": None,
                      "commits": [], "note": c["title"]}
json.dump(state, open(os.path.join(OUT, "state.json"), "w", encoding="utf8"), ensure_ascii=False, indent=1)

for c in C:
    md = f"""# {c['id']}：{c['title']}

## 归属
- 所属切片：{c['slice']}
- 来源需求/证据：{c['source']}
- 执行者：{c['owner']}

## 目标
{c['goal']}

## 输入
- 文档：`docs/V1.1-20261024/00-事实基线.md`、`04-连续执行协议.md`
- 前置：{('、'.join(c['deps']) if c['deps'] else '无')}

## 输出
- {chr(10).join('- ' + p for p in c['paths'])}

## Execution Steps
{chr(10).join(f"{i+1}. [ ] {s}" for i, s in enumerate(c['steps']))}

## 验收标准
{chr(10).join(f"- [ ] {a}" for a in c['accept'])}

## 验证命令
```bash
{c['verify']}
```

## 证据路径
{c['evidence']}（execution.md + 命令原始输出；verify.md 由独立验证者写）

## 允许修改
{chr(10).join('- ' + p for p in c['paths'])}

## 禁止修改
{chr(10).join('- ' + f for f in c['forbid'])}
- docs/V0.7-20261019/**、docs/V0.8-20261022/**、docs/V0.9-20261023/**、docs/V1.0-20261024/**（历史只读）
- 其他卡的允许修改路径

## 依赖与阻塞
- Depends on：{('、'.join(c['deps']) if c['deps'] else '无')}
- Blocks：见 06-DAG
- 阻塞条件：遇外部条件 → state.json 标 blocked + 原因，转下一张就绪卡

## 建议执行档位
{c['grade']}

## 升级条件
同卡连续 2 次验收 FAIL → 熔断 blocked，升档重写任务书

## 预估规模
{c['size']}
"""
    open(os.path.join(TASKS, c["id"] + ".md"), "w", encoding="utf8").write(md)

# STEP 文件（每切片一份）
slices = {}
for c in C: slices.setdefault(c["slice"], []).append(c)
for s, cards in sorted(slices.items()):
    lines = [f"# STEP {s}（{ {'S0':'门禁与基线','S1':'安全','S2':'公众号发布','S3':'内容中枢 UI','S4':'采集与调度','S5':'知识库','S6':'LLM 与客服','S7':'邮件','S8':'管理端体验','S9':'招生','S10':'兼容入口与 SEO/e2e','S11':'运维与性能','S12':'终审发布'}.get(s, s)}）", ""]
    for c in cards:
        lines += [f"## {c['id']} {c['title']}（{c['owner']}，{c['size']}）",
                  f"目标：{c['goal']}", "步骤：" + "；".join(c["steps"]), "验收：" + "；".join(c["accept"]), ""]
    open(os.path.join(STEPS, f"STEP-{s}.md"), "w", encoding="utf8").write("\n".join(lines))

print(f"OK: {len(C)} 张卡生成；0 环；跨 owner 路径重叠警告 {len(overlap_warn)} 条")
for w in overlap_warn: print("  !", w)
print("state.json + tasks/*.md + steps/*.md 已写入")
