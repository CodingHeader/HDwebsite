/**
 * W2-02 契约测试固定装置（fixtures.ts）
 *
 * 背景（本次修复的根因）：
 *   原实现所有 `:id` 路由统一用 id=1，而 ok 用例会真实执行 PUT/DELETE：
 *     - `DELETE /categories/:id` 删掉 id=1 → 后续 `POST /courses`（categoryId=1）外键悬空 400
 *     - `PUT /roles/:id` 打 id=1（createActor 建的超管角色，slug=role-super 而非 super-admin，
 *       绕过内置超管保护）→ zod4 `.partial()` 仍套用 `isSuper` 的 default(false)，
 *       超管被降级 → 之后所有依赖 isSuper 的鉴权全部 403（60+ 例级联失败）
 *     - `DELETE /content-items/:id` 删掉 id=1 → `POST /publish-jobs`（itemId=1）404
 *
 * 解法：为每个模型按「用途」分配互不重叠的显式 id，任何用例都不删「被引用行」：
 *   - 1..  区间：被其他用例引用的稳定行（分类/专业/内容条目…），**永不删除**
 *   - 901  ：GET 详情用例的读取目标
 *   - 902  ：PUT 更新用例的写入目标
 *   - 903  ：DELETE 用例的删除目标
 *   - 904+ ：同一资源的额外动作端点（cancel/retry/balance/test…）各用独立行
 * 显式 id 保证顺序无关：即使 vitest 打乱用例顺序，结果也一致。
 */
import type { PrismaClient } from "@prisma/client";
import path from "node:path";
import fs from "node:fs";
import { kbDir } from "@/lib/storage";

/** 被其他用例引用的稳定 id（永不删除） */
export const REF = { category: 1, major: 1, partner: 1, campus: 1, contentItem: 1 } as const;

/** 契约测试用的「一次性」id 分配 */
export const SAC = {
  get: 901,
  put: 902,
  del: 903,
  extra: 904,
  extra2: 905,
} as const;

export type SeedContext = { superUserId: number };

/**
 * 写入契约测试全部前置数据。要求先行调用（roles/users 由 createActor 建，这里只做业务数据）。
 * 说明：所有金额/URL/文本均为明显的测试值，不涉及真实凭据。
 */
export async function seedFixtures(prisma: PrismaClient, ctx: SeedContext): Promise<void> {
  const base = { createdAt: new Date(), updatedAt: new Date() };

  // ── 分类：1=article（被课程引用）、2=course、901/902/903=一次性 ──
  await prisma.category.createMany({
    data: [
      { id: 1, name: "分类A", slug: "cat-a", type: "article", sort: 1, ...base },
      { id: 2, name: "分类B", slug: "cat-b", type: "course", sort: 2, ...base },
      { id: 901, name: "分类GET", slug: "cat-get", type: "article", sort: 3, ...base },
      { id: 902, name: "分类PUT", slug: "cat-put", type: "article", sort: 4, ...base },
      { id: 903, name: "分类DEL", slug: "cat-del", type: "article", sort: 5, ...base },
    ],
  });

  // ── 标签 ──
  await prisma.tag.createMany({
    data: [
      { id: 1, name: "标签A", slug: "tag-a", ...base },
      { id: 2, name: "标签B", slug: "tag-b", ...base },
      { id: 901, name: "标签GET", slug: "tag-get", ...base },
      { id: 902, name: "标签PUT", slug: "tag-put", ...base },
      { id: 903, name: "标签DEL", slug: "tag-del", ...base },
    ],
  });

  // ── 专业：1 被课程/招生计划/热门专业引用；901-903 一次性 ──
  await prisma.major.createMany({
    data: [
      { id: 1, name: "专业A", slug: "major-a", categoryId: 2, ...base },
      { id: 901, name: "专业GET", slug: "major-get", categoryId: 2, ...base },
      { id: 902, name: "专业PUT", slug: "major-put", categoryId: 2, ...base },
      { id: 903, name: "专业DEL", slug: "major-del", categoryId: 2, ...base },
    ],
  });

  // ── 合作院校（招生计划引用） ──
  await prisma.partner.createMany({
    data: [
      { id: 1, name: "院校A", ...base },
      { id: 901, name: "院校GET", ...base },
      { id: 902, name: "院校PUT", ...base },
      { id: 903, name: "院校DEL", ...base },
    ],
  });

  // ── 课程（报名线索引用） ──
  await prisma.course.createMany({
    data: [
      { id: 1, title: "课程A", categoryId: 2, majorId: 1, ...base },
      { id: 901, title: "课程GET", categoryId: 2, majorId: 1, ...base },
      { id: 902, title: "课程PUT", categoryId: 2, majorId: 1, ...base },
      { id: 903, title: "课程DEL", categoryId: 2, majorId: 1, ...base },
    ],
  });

  // ── 招生计划（组合唯一键 → 用不同 majorCode 区分） ──
  await prisma.enrollmentOffering.createMany({
    data: [
      { id: 901, majorId: 1, partnerId: 1, majorCode: "GET", ...base },
      { id: 902, majorId: 1, partnerId: 1, majorCode: "PUT", ...base },
      { id: 903, majorId: 1, partnerId: 1, majorCode: "DEL", ...base },
    ],
  });

  // ── 报名线索 ──
  await prisma.student.createMany({
    data: [
      { id: 901, name: "线索GET", phone: "13800000901", courseId: 1, ...base },
      { id: 902, name: "线索PUT", phone: "13800000902", courseId: 1, ...base },
      { id: 903, name: "线索DEL", phone: "13800000903", courseId: 1, ...base },
    ],
  });

  // ── 校区 + 校区图片（嵌套路由 /campus/:id/images 用 campus=901） ──
  await prisma.campus.createMany({
    data: [
      { id: 1, name: "校区A", address: "地址A", ...base },
      { id: 901, name: "校区GET", address: "地址GET", ...base },
      { id: 902, name: "校区PUT", address: "地址PUT", ...base },
      { id: 903, name: "校区DEL", address: "地址DEL", ...base },
    ],
  });
  await prisma.campusImage.createMany({
    data: [
      { id: 901, campusId: 901, image: "/uploads/ci-get.png", ...base },
      // 902 供扁平路由 PUT、903 供扁平路由 DELETE 与嵌套 DELETE
      { id: 902, campusId: 901, image: "/uploads/ci-put.png", ...base },
      { id: 903, campusId: 901, image: "/uploads/ci-del.png", ...base },
      // 904/905 专供嵌套路由（扁平 PUT 会改写 902，嵌套若共用会互相干扰）
      { id: 904, campusId: 901, image: "/uploads/ci-nested-put.png", ...base },
      { id: 905, campusId: 901, image: "/uploads/ci-nested-del.png", ...base },
    ],
  });

  // ── 图库 / 横幅 / 首页卡片 ──
  await prisma.gallery.createMany({
    data: [
      { id: 901, title: "图库GET", image: "/uploads/g1.png", ...base },
      { id: 902, title: "图库PUT", image: "/uploads/g2.png", ...base },
      { id: 903, title: "图库DEL", image: "/uploads/g3.png", ...base },
    ],
  });
  await prisma.banner.createMany({
    data: [
      { id: 901, image: "/uploads/b-get.png", ...base },
      { id: 902, image: "/uploads/b-put.png", ...base },
      { id: 903, image: "/uploads/b-del.png", ...base },
    ],
  });
  await prisma.homeCard.createMany({
    data: [
      { id: 901, title: "卡片GET", ...base },
      { id: 902, title: "卡片PUT", ...base },
      { id: 903, title: "卡片DEL", ...base },
    ],
  });

  // ── 热门专业（引用 major 1） ──
  await prisma.hotMajor.createMany({
    data: [
      { id: 901, title: "热门GET", majorId: 1, ...base },
      { id: 902, title: "热门PUT", majorId: 1, ...base },
      { id: 903, title: "热门DEL", majorId: 1, ...base },
    ],
  });

  // ── 服务指南（slug 唯一） ──
  await prisma.serviceGuide.createMany({
    data: [
      { id: 901, slug: "sg-get", title: "指南GET", ...base },
      { id: 902, slug: "sg-put", title: "指南PUT", ...base },
      { id: 903, slug: "sg-del", title: "指南DEL", ...base },
    ],
  });

  // ── 导航树：1=根（被 :id 用例引用）、2=子级、901-903 一次性 ──
  await prisma.navigation.createMany({
    data: [
      { id: 1, name: "关于", slug: "about", link: "/about", sort: 2, ...base },
      { id: 2, name: "简介", slug: "about-intro", link: "/about/intro", parentId: 1, level: 2, ...base },
      { id: 901, name: "导航GET", slug: "nav-get", link: "/nav-get", ...base },
      { id: 902, name: "导航PUT", slug: "nav-put", link: "/nav-put", ...base },
      { id: 903, name: "导航DEL", slug: "nav-del", link: "/nav-del", ...base },
    ],
  });

  // ── 页面模板 / 内容区块 / 模板区块 / 元素配置（首页区块 reset 依赖 home 模板） ──
  await prisma.pageTemplate.createMany({
    data: [
      { id: 1, code: "home", name: "首页模板", templateFile: "home.tsx", ...base },
      { id: 901, code: "tpl-get", name: "模板GET", templateFile: "list.tsx", ...base },
      { id: 902, code: "tpl-put", name: "模板PUT", templateFile: "list.tsx", ...base },
      { id: 903, code: "tpl-del", name: "模板DEL", templateFile: "list.tsx", ...base },
    ],
  });
  // 区块注册表默认顺序（block-registry-defs）：home-blocks/reset 需要这些 code 真实存在
  await prisma.contentBlock.createMany({
    data: [
      { id: 1, code: "home-banner", name: "轮播横幅", type: "hero", ...base },
      { id: 2, code: "home-cards", name: "四宫格入口", type: "grid", ...base },
      { id: 3, code: "home-topbar", name: "顶部通知栏", type: "banner", ...base },
      { id: 4, code: "home-entrance", name: "三栏内容区", type: "list", ...base },
      { id: 5, code: "home-stats", name: "统计横幅", type: "stats", ...base },
      { id: 6, code: "home-partners", name: "合作院校", type: "grid", ...base },
      { id: 7, code: "home-courses", name: "热门专业", type: "list", ...base },
      { id: 8, code: "home-intro", name: "公司简介", type: "intro", ...base },
      { id: 9, code: "home-news", name: "资讯中心", type: "list", ...base },
      { id: 10, code: "home-certificates", name: "证书风采", type: "grid", ...base },
      { id: 11, code: "home-campus", name: "学院风采", type: "grid", ...base },
      { id: 12, code: "home-cta", name: "报名行动号召", type: "cta", ...base },
      { id: 901, code: "block-get", name: "区块GET", type: "list", ...base },
      { id: 902, code: "block-put", name: "区块PUT", type: "list", ...base },
      { id: 903, code: "block-del", name: "区块DEL", type: "list", ...base },
    ],
  });
  // TemplateBlock 无 createdAt/updatedAt 列，不能套 base。
  // 关键：901-903 必须挂在 templateId=901（而非 1）。`/home-blocks/reset` 会对
  // templateId=1 执行 `deleteMany` 后重建，若这批行挂在 1 下，reset 会把它们抹掉
  // → `/template-blocks/:id` 的 GET/PUT/DELETE 变 404（打乱用例顺序即复现）。
  await prisma.templateBlock.createMany({
    data: [
      { id: 901, templateId: 901, blockId: 1, sort: 10 },
      { id: 902, templateId: 901, blockId: 2, sort: 20 },
      { id: 903, templateId: 901, blockId: 3, sort: 30 },
    ],
  });
  await prisma.elementConfig.createMany({
    data: [
      { id: 901, elementId: "el-get", elementName: "元素GET", layer: 1, layerName: "TopBar", ...base },
      { id: 902, elementId: "el-put", elementName: "元素PUT", layer: 1, layerName: "TopBar", ...base },
      { id: 903, elementId: "el-del", elementName: "元素DEL", layer: 1, layerName: "TopBar", ...base },
    ],
  });

  // ── 媒体 ──
  await prisma.media.createMany({
    data: [
      { id: 901, filename: "m-get.png", path: "/uploads/m-get.png", url: "/uploads/m-get.png", mimeType: "image/png", size: 10, ...base },
      { id: 902, filename: "m-put.png", path: "/uploads/m-put.png", url: "/uploads/m-put.png", mimeType: "image/png", size: 10, ...base },
      { id: 903, filename: "m-del.png", path: "/uploads/m-del.png", url: "/uploads/m-del.png", mimeType: "image/png", size: 10, ...base },
    ],
  });

  // ── 文章（作者=超管用户） ──
  await prisma.article.createMany({
    data: [
      { id: 901, title: "文章GET", slug: "art-get", content: "内容GET", authorId: ctx.superUserId, ...base },
      { id: 902, title: "文章PUT", slug: "art-put", content: "内容PUT", authorId: ctx.superUserId, ...base },
      { id: 903, title: "文章DEL", slug: "art-del", content: "内容DEL", authorId: ctx.superUserId, ...base },
      { id: 904, title: "文章PATCH", slug: "art-patch", content: "内容PATCH", authorId: ctx.superUserId, ...base },
    ],
  });

  // ── 操作日志 / 行为记录 / 对话历史 ──
  await prisma.operationLog.createMany({
    data: [
      { username: "super", module: "article", action: "create", title: "A1" },
      { username: "super", module: "media", action: "delete", title: "M1" },
    ],
  });
  await prisma.aIChatHistory.createMany({
    data: [
      // GET 用例的会话（保留）
      { sessionId: "sess-get-0001", channel: "website", role: "user", message: "怎么报名自考？" },
      { sessionId: "sess-get-0001", channel: "website", role: "assistant", message: "您好，自考报名……" },
      // DELETE 用例的会话（独立，避免删掉 GET 的数据）
      { sessionId: "sess-del-0903", channel: "website", role: "user", message: "待删除会话" },
    ],
  });

  // ── 通知：接收人 / 模板 / 规则 ──
  await prisma.notifyRecipient.createMany({
    data: [
      { id: 901, name: "接收人GET", email: "r-get@test.com", ...base },
      { id: 902, name: "接收人PUT", email: "r-put@test.com", ...base },
      { id: 903, name: "接收人DEL", email: "r-del@test.com", ...base },
    ],
  });
  await prisma.notifyTemplate.createMany({
    data: [
      { id: 1, name: "模板A", event: "article_created", subject: "主题A", body: "正文A", ...base },
      { id: 2, name: "模板B", event: "article_published", subject: "主题B", body: "正文B", ...base },
      { id: 901, name: "模板GET", subject: "主题GET", body: "正文GET", ...base },
      { id: 902, name: "模板PUT", subject: "主题PUT", body: "正文PUT", ...base },
      { id: 903, name: "模板DEL", subject: "主题DEL", body: "正文DEL", ...base },
    ],
  });
  await prisma.notifyRule.createMany({
    data: [
      { id: 901, event: "before_publish_news", templateId: 1, enabled: true, ...base },
      { id: 902, event: "before_publish_info", templateId: 2, enabled: true, ...base },
    ],
  });

  // ── 公众号账号（发布任务 requiresAccount 时取 status=active&freepublishEnabled） ──
  await prisma.wechatAccount.createMany({
    data: [
      { id: 901, name: "公众号GET", appid: "wx-app-get", appSecret: "secret-get", type: "service", ...base },
      { id: 902, name: "公众号PUT", appid: "wx-app-put", appSecret: "secret-put", type: "service", ...base },
      { id: 903, name: "公众号DEL", appid: "wx-app-del", appSecret: "secret-del", type: "service", ...base },
      { id: 904, name: "公众号TEST", appid: "wx-app-test", appSecret: "secret-test", type: "service", ...base },
    ],
  });

  // ── LLM 供应商（status 非 enabled） ──
  await prisma.lLMProvider.createMany({
    data: [
      { id: 901, name: "模型GET", kind: "openai", endpoint: "https://api.example.com/v1", apiKey: "sk-get", model: "gpt-4o", isEncrypted: false, priority: 1, ...base },
      { id: 902, name: "模型PUT", kind: "openai", endpoint: "https://api.example.com/v1", apiKey: "sk-put", model: "gpt-4o", isEncrypted: false, priority: 2, ...base },
      { id: 903, name: "模型DEL", kind: "openai", endpoint: "https://api.example.com/v1", apiKey: "sk-del", model: "gpt-4o", isEncrypted: false, priority: 3, ...base },
      { id: 904, name: "模型BAL", kind: "openai", endpoint: "https://api.example.com/v1", apiKey: "sk-bal", model: "gpt-4o", isEncrypted: false, priority: 4, ...base },
      { id: 905, name: "模型TEST", kind: "openai", endpoint: "https://api.example.com/v1", apiKey: "sk-test", model: "gpt-4o", isEncrypted: false, priority: 5, ...base },
    ],
  });

  // ── 知识库 / 文件 / 切片 ──
  await prisma.knowledgeBase.createMany({
    data: [
      { id: 901, name: "知识库GET", code: "kb-get", ...base },
      { id: 902, name: "知识库PUT", code: "kb-put", ...base },
      { id: 903, name: "知识库DEL", code: "kb-del", ...base },
      { id: 904, name: "知识库REBUILD", code: "kb-rebuild", ...base },
    ],
  });
  // 磁盘文件：/api/knowledge-bases/[id]/export 需真实文件才能打包
  const kbRoot = path.join(kbDir(), "901");
  fs.mkdirSync(kbRoot, { recursive: true });
  const mdBody = "# 测试文档\n\n这是契约测试用的 Markdown 内容。\n";
  fs.writeFileSync(path.join(kbRoot, "seed.md"), mdBody, "utf8");
  await prisma.knowledgeFile.createMany({
    data: [
      { id: 901, baseId: 901, filename: "seed.md", ext: "md", mimeType: "text/markdown", size: Buffer.byteLength(mdBody), sha256: "a".repeat(64), storagePath: "901/seed.md", localParse: "ok", chunkCount: 1, ...base },
      // 注意：902-905 放在 baseId=902，使 baseId=901 只含 1 个「磁盘文件真实存在」的记录，
      // 否则 GET /knowledge-bases/901/export 打包 5 个文件时有 4 个磁盘缺失 → 400。
      { id: 902, baseId: 902, filename: "put.md", ext: "md", mimeType: "text/markdown", size: 10, sha256: "b".repeat(64), storagePath: "902/put.md", ...base },
      { id: 903, baseId: 902, filename: "del.md", ext: "md", mimeType: "text/markdown", size: 10, sha256: "c".repeat(64), storagePath: "902/del.md", ...base },
      { id: 904, baseId: 902, filename: "batch.md", ext: "md", mimeType: "text/markdown", size: 10, sha256: "d".repeat(64), storagePath: "902/batch.md", ...base },
      { id: 905, baseId: 902, filename: "trash.md", ext: "md", mimeType: "text/markdown", size: 10, sha256: "e".repeat(64), storagePath: "902/trash.md", ...base },
    ],
  });
  // 切片：PATCH /knowledge-files/[id]/chunks/[chunkId] 要求 Knowledge.fileId 非空。
  // ── 知识切片 ─────────────────────────────────────────────────
  // 关键：跨表级联。以下路由都会 `knowledge.deleteMany({ where: { fileId } })`：
  //   - POST /knowledge-files/901/reparse   （reparse，删光 fileId=901 再重建）
  //   - DELETE /knowledge-files/903         （deleteFileCascade，连带删 fileId=903）
  //   - PUT  /knowledge-files/902/chunks/902（updateChunk 只改内容，不删）
  // 因此 /knowledge/:id 的目标行**必须不被任何被操作文件引用**，否则打乱顺序即 404。
  // 906/907/908 的 fileId 置 null：不被任何文件槽引用，任何级联都碰不到它们。
  await prisma.knowledge.createMany({
    data: [
      // 供 /knowledge/:id 的 GET / PUT / DELETE（fileId=null，无级联风险）
      { id: 906, title: "知识GET", content: "知识GET正文。", source: "local", baseId: 901, fileId: null, ...base },
      { id: 907, title: "知识PUT", content: "知识PUT正文。", source: "local", baseId: 901, fileId: null, ...base },
      { id: 908, title: "知识DEL", content: "知识DEL正文。", source: "local", baseId: 901, fileId: null, ...base },
      // 供 reparse 重建用（会被删并重建，故只给 reparse 用例，不供 :id 路由）
      { id: 901, title: "seed.md #1", content: "这是契约测试用的 Markdown 内容。", source: "local", baseId: 901, fileId: 901, chunkIndex: 0, ...base },
      // 供切片在线编辑（updateChunk 要求 fileId 非空；902 不被 reparse/delete 触碰）
      { id: 902, title: "put.md #1", content: "可编辑切片内容。", source: "local", baseId: 902, fileId: 902, chunkIndex: 0, ...base },
      // 供 deleteFileCascade 连带删除验证（903 属文件 DELETE 槽）
      { id: 903, title: "del.md #1", content: "随文件删除的切片。", source: "local", baseId: 902, fileId: 903, chunkIndex: 0, ...base },
    ],
  });

  // ── 内容条目（发布任务引用 itemId=1，目录下 DELETE 用 903 不影响） ──
  await prisma.contentItem.createMany({
    data: [
      { id: 1, title: "内容A", content: "内容A正文", status: "approved", authorId: ctx.superUserId, ...base },
      // 901 供审核用例：draft 不能直接→approved，必须 pending_review
      { id: 901, title: "内容GET", content: "内容GET正文", status: "pending_review", authorId: ctx.superUserId, ...base },
      { id: 902, title: "内容PUT", content: "内容PUT正文", status: "draft", authorId: ctx.superUserId, ...base },
      { id: 903, title: "内容DEL", content: "内容DEL正文", status: "draft", authorId: ctx.superUserId, ...base },
    ],
  });

  // ── 发布任务：GET/PUT/DELETE/cancel/retry 各独占一行 ──
  await prisma.publishJob.createMany({
    data: [
      { id: 901, itemId: 1, channel: "website", contentType: "article", action: "publish", status: "scheduled", ...base },
      { id: 902, itemId: 1, channel: "website", contentType: "article", action: "publish", status: "scheduled", ...base },
      { id: 903, itemId: 1, channel: "website", contentType: "article", action: "publish", status: "scheduled", ...base },
      { id: 904, itemId: 1, channel: "website", contentType: "article", action: "publish", status: "scheduled", ...base },
      { id: 905, itemId: 1, channel: "website", contentType: "article", action: "publish", status: "failed", ...base },
    ],
  });

  // ── AI 场景（chat-scenes 的 GET/PUT/DELETE 各占一行；code 唯一） ──
  await prisma.chatScene.createMany({
    data: [
      { id: 901, code: "scene-get", name: "场景GET", greeting: "你好", systemPrompt: "你是助手", ...base },
      { id: 902, code: "scene-put", name: "场景PUT", greeting: "你好", systemPrompt: "你是助手", ...base },
      { id: 903, code: "scene-del", name: "场景DEL", greeting: "你好", systemPrompt: "你是助手", ...base },
    ],
  });

  // ── 采集：源 / 任务 / 条目 ──
  await prisma.collectSource.createMany({
    data: [
      { id: 901, name: "采集源GET", type: "html", url: "https://example.com/list", cron: "", ...base },
      { id: 902, name: "采集源PUT", type: "html", url: "https://example.com/put", cron: "", ...base },
      { id: 903, name: "采集源DEL", type: "html", url: "https://example.com/del", cron: "", ...base },
    ],
  });
  // CollectTask 无 updatedAt 列
  await prisma.collectTask.createMany({
    data: [{ id: 1, sourceId: 901, status: "done", createdAt: new Date() }],
  });
  await prisma.collectItem.createMany({
    data: [
      { id: 901, sourceId: 901, url: "https://example.com/a1", urlHash: "hash-901", title: "采集条目GET", status: "new", ...base },
    ],
  });

  // ── 角色/用户的一次性行（超级管理员角色由 createActor 建，不在此处触碰） ──
  // role 901 供 GET、902 供 PUT（非超管，避免 isSuper 自污染）、903 供 DELETE（无用户，可删）
  await prisma.role.createMany({
    data: [
      { id: 901, name: "角色GET", slug: "role-get", permissions: "[]", isSuper: false, status: "active", ...base },
      { id: 902, name: "角色PUT", slug: "role-put", permissions: "[]", isSuper: false, status: "active", ...base },
      { id: 903, name: "角色DEL", slug: "role-del", permissions: "[]", isSuper: false, status: "active", ...base },
    ],
  });
  await prisma.user.createMany({
    data: [
      { id: 901, username: "u-get", passwordHash: "x", roleId: 901, ...base },
      { id: 902, username: "u-put", passwordHash: "x", roleId: 902, ...base },
      // 注意：不能挂在 role 903 下——DELETE /roles/903 会被「该角色下仍有用户」拦成 400
      { id: 903, username: "u-del", passwordHash: "x", roleId: 901, ...base },
    ],
  });

  // ── 站点设置（GET 公开字段 / PUT 合法键） ──
  await prisma.setting.createMany({
    data: [
      { key: "siteName", value: "弘道教育", ...base },
      { key: "siteKeywords", value: "自考,成考", ...base },
    ],
  });
}
