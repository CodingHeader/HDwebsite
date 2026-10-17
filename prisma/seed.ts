/**
 * M1 基线 seed（幂等：upsert update 分支为空 {}，重跑不覆盖手工修改）
 * 范围：角色/管理员/菜单/设置/分类/标签/示例文章/聊天场景/调度任务行/服务指南/通知默认
 * 注意：Registry（src/lib/settings-registry.ts）为设置唯一真相源；此处仅落关键公开项。
 */
import { PrismaClient } from '@prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';
import * as bcrypt from 'bcryptjs';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// P04：允许 DATABASE_URL 覆盖（用于在库副本上验证 seed/迁移），默认仍为本地 dev.db
const adapter = new PrismaLibSql({ url: process.env.DATABASE_URL ?? 'file:./prisma/dev.db' });
const prisma = new PrismaClient({ adapter });

/**
 * P04：权限目录断言。seed 以 ts-node(ESM) 运行，无法直接 import src/contracts（无扩展名解析失败），
 * 故在运行时解析 `src/contracts/auth.ts` 的 permissionCatalog 字面量（唯一源），
 * 所有角色/菜单权限必须 ∈ 目录，否则 seed 失败（防止 seed 绕过目录写权限，I4）。
 */
function loadPermissionCatalog(): Set<string> {
  const src = readFileSync(join(process.cwd(), 'src/contracts/auth.ts'), 'utf8');
  const start = src.indexOf('export const permissionCatalog = {');
  const end = src.indexOf('} as const;', start);
  if (start < 0 || end < 0) throw new Error('seed: 无法解析 permissionCatalog');
  const set = new Set<string>();
  for (const m of src.slice(start, end).matchAll(/^\s*([a-z]+):\s*\[([^\]]*)\]/gm)) {
    for (const a of m[2].matchAll(/"([a-z]+)"/g)) set.add(`${m[1]}:${a[1]}`);
  }
  if (set.size === 0) throw new Error('seed: permissionCatalog 为空');
  return set;
}
const CATALOG = loadPermissionCatalog();
function assertInCatalog(perms: (string | undefined | null)[], where: string) {
  const bad = perms.filter((p): p is string => !!p && p !== '*' && !CATALOG.has(p));
  if (bad.length) throw new Error(`seed: ${where} 含目录外权限 ${bad.join(', ')}`);
}

/**
 * 角色 upsert：create 写默认权限；update 只做"并集补齐"（保留后台手工增加的权限，补入新版默认权限），
 * 结果排序后比较，相同则不写 → 重跑幂等。代价：后台手工移除的默认权限会在重跑 seed 时被补回（见 P04 证据）。
 */
async function upsertRole(r: { name: string; slug: string; description: string; permissions: string[]; isSuper: boolean }) {
  assertInCatalog(r.permissions, `角色 ${r.slug}`);
  const existing = await prisma.role.findUnique({ where: { slug: r.slug } });
  if (!existing) {
    await prisma.role.create({ data: { ...r, permissions: JSON.stringify(r.permissions) } });
    return;
  }
  let current: string[] = [];
  try { current = JSON.parse(existing.permissions || '[]'); } catch { current = []; }
  if (current.includes('*')) return;
  const merged = Array.from(new Set([...current, ...r.permissions])).sort();
  if (merged.length !== current.length) {
    await prisma.role.update({ where: { id: existing.id }, data: { permissions: JSON.stringify(merged) } });
  }
}

async function seedRoles() {
  await upsertRole({
    name: 'SuperAdmin',
    slug: 'super-admin',
    description: '超级管理员（审核权独享，ADR-017）',
    permissions: ['*'],
    isSuper: true,
  });
  await upsertRole({
    name: 'Editor',
    slug: 'editor',
    description: '编辑：内容与招生数据维护',
    permissions: [
      'article:list', 'article:create', 'article:edit', 'article:publish',
      'category:list', 'category:create', 'category:edit',
      'tag:list', 'tag:create', 'tag:edit',
      'course:list', 'course:create', 'course:edit',
      'major:list', 'major:create', 'major:edit',
      'enrollment:list', 'enrollment:create', 'enrollment:edit',
      'student:list', 'student:edit',
      'banner:list', 'banner:edit',
      'media:list', 'media:create',
      'service:list', 'service:create', 'service:edit',
      // P04：P03 补入目录的内容生产链权限（内容中枢/采集/发布/知识库）；系统级（setting/log:delete/llm/wechat/notify）不授予编辑
      'content:list', 'content:create', 'content:edit', 'content:delete',
      'collect:list', 'collect:create', 'collect:edit', 'collect:delete',
      'publish:list', 'publish:create', 'publish:edit',
      'kb:list', 'kb:create', 'kb:edit', 'kb:delete',
      // P06：首页区块配置（ADR-024）——编辑可调整区块开关/顺序，不可增删区块与模板
      'block:list', 'block:edit',
    ],
    isSuper: false,
  });
  await upsertRole({
    name: 'Viewer',
    slug: 'viewer',
    description: '只读',
    permissions: [
      'article:list', 'category:list', 'tag:list', 'course:list',
      'major:list', 'enrollment:list', 'student:list', 'media:list',
      'banner:list', 'service:list', 'setting:list', 'log:list',
      // P04：只读角色补齐全部菜单的 list 权限（使每个菜单可见；不含任何写/删）
      'navigation:list', 'partner:list', 'gallery:list', 'campus:list',
      'content:list', 'collect:list', 'publish:list', 'kb:list', 'notify:list', 'llm:list', 'wechat:list',
      'block:list',
    ],
    isSuper: false,
  });
}

async function seedAdmin() {
  const role = await prisma.role.findUnique({ where: { slug: 'super-admin' } });
  if (!role) throw new Error('seed: SuperAdmin 角色缺失');
  await prisma.user.upsert({
    where: { username: 'admin' },
    update: {}, // 重跑不重置密码
    create: {
      username: 'admin',
      passwordHash: await bcrypt.hash('admin123', 10),
      nickname: '管理员',
      roleId: role.id,
      email: 'admin@hd1994.com',
    },
  });
}

async function seedMenus() {
  // 一级直出
  const top: { code: string; label: string; icon?: string; path?: string; sort: number; permission?: string }[] = [
    { code: 'dashboard', label: '仪表盘', icon: 'LayoutDashboard', path: '/manager', sort: 0 },
    { code: 'articles', label: '文章管理', icon: 'FileText', path: '/manager/articles', sort: 10, permission: 'article:list' },
    { code: 'courses', label: '课程管理', icon: 'GraduationCap', path: '/manager/courses', sort: 20, permission: 'course:list' },
    { code: 'students', label: '报名管理', icon: 'UserPlus', path: '/manager/students', sort: 30, permission: 'student:list' },
    { code: 'media', label: '媒体库', icon: 'Image', path: '/manager/media', sort: 40, permission: 'media:list' },
  ];
  // 折叠分组
  const groups: { code: string; label: string; icon: string; sort: number }[] = [
    { code: 'group-content', label: '内容管理', icon: 'FolderEdit', sort: 50 },
    { code: 'group-enrollment', label: '招生管理', icon: 'School', sort: 60 },
    { code: 'group-site', label: '站点管理', icon: 'PanelsTopLeft', sort: 70 },
    { code: 'group-ai', label: 'AI 与自动化', icon: 'Bot', sort: 80 },
    { code: 'group-notify', label: '提醒通知', icon: 'BellRing', sort: 90 },
    { code: 'group-system', label: '系统管理', icon: 'Settings', sort: 100 },
  ];
  const children: { parent: string; code: string; label: string; path: string; sort: number; permission?: string }[] = [
    { parent: 'group-content', code: 'categories', label: '分类管理', path: '/manager/categories', sort: 1, permission: 'category:list' },
    { parent: 'group-content', code: 'tags', label: '标签管理', path: '/manager/tags', sort: 2, permission: 'tag:list' },
    { parent: 'group-content', code: 'service-guides', label: '服务指南', path: '/manager/service-guides', sort: 3, permission: 'service:list' },
    { parent: 'group-content', code: 'navigations', label: '导航管理', path: '/manager/navigations', sort: 4, permission: 'navigation:list' },
    { parent: 'group-enrollment', code: 'majors', label: '专业管理', path: '/manager/majors', sort: 1, permission: 'major:list' },
    { parent: 'group-enrollment', code: 'enrollment-offerings', label: '招生计划', path: '/manager/enrollment-offerings', sort: 2, permission: 'enrollment:list' },
    { parent: 'group-enrollment', code: 'partners', label: '合作院校', path: '/manager/partners', sort: 3, permission: 'partner:list' },
    { parent: 'group-enrollment', code: 'hot-majors', label: '热门专业位', path: '/manager/hot-majors', sort: 4, permission: 'course:list' },
    { parent: 'group-site', code: 'banners', label: '轮播图', path: '/manager/banners', sort: 1, permission: 'banner:list' },
    { parent: 'group-site', code: 'home-cards', label: '首页卡片', path: '/manager/home-cards', sort: 2, permission: 'banner:list' },
    { parent: 'group-site', code: 'campus', label: '校区管理', path: '/manager/campus', sort: 3, permission: 'campus:list' },
    { parent: 'group-site', code: 'gallery', label: '证书风采', path: '/manager/gallery', sort: 4, permission: 'gallery:list' },
    // E-03（ADR-024）：首页区块配置三页
    { parent: 'group-site', code: 'home-blocks', label: '首页区块', path: '/manager/home-blocks', sort: 5, permission: 'block:list' },
    { parent: 'group-site', code: 'page-templates', label: '页面模板', path: '/manager/page-templates', sort: 6, permission: 'block:list' },
    { parent: 'group-site', code: 'element-configs', label: '元素配置', path: '/manager/element-configs', sort: 7, permission: 'block:list' },
    { parent: 'group-ai', code: 'content-hub', label: '内容中枢', path: '/manager/content-hub', sort: 0, permission: 'content:list' },
    { parent: 'group-ai', code: 'chat-scenes', label: 'AI 场景', path: '/manager/chat-scenes', sort: 1, permission: 'setting:list' },
    { parent: 'group-ai', code: 'knowledge', label: '知识库', path: '/manager/knowledge', sort: 2, permission: 'kb:list' },
    { parent: 'group-ai', code: 'llm-providers', label: '模型供应商', path: '/manager/llm-providers', sort: 3, permission: 'llm:list' },
    { parent: 'group-ai', code: 'collect-sources', label: '采集源', path: '/manager/collect-sources', sort: 4, permission: 'collect:list' },
    { parent: 'group-ai', code: 'collect-items', label: '采集审核', path: '/manager/collect-items', sort: 5, permission: 'collect:list' },
    { parent: 'group-ai', code: 'publish-jobs', label: '发布任务', path: '/manager/publish-jobs', sort: 6, permission: 'publish:list' },
    { parent: 'group-ai', code: 'wechat-accounts', label: '公众号账号', path: '/manager/wechat-accounts', sort: 7, permission: 'wechat:list' },
    // E-02（P-2）：/manager/collect-tasks 页面已存在，补登记菜单（P-2 与 notify-rules 同批）
    { parent: 'group-ai', code: 'collect-tasks', label: '采集任务', path: '/manager/collect-tasks', sort: 8, permission: 'collect:list' },
    // E-02：通知规则页（规则配置入口，置于通知组首位）
    { parent: 'group-notify', code: 'notify-rules', label: '通知规则', path: '/manager/notify-rules', sort: 0, permission: 'notify:list' },
    { parent: 'group-notify', code: 'notify-recipients', label: '提醒接收人', path: '/manager/notify-recipients', sort: 1, permission: 'notify:list' },
    { parent: 'group-notify', code: 'notify-templates', label: '邮件模板', path: '/manager/notify-templates', sort: 2, permission: 'notify:list' },
    { parent: 'group-notify', code: 'notify-records', label: '通知记录', path: '/manager/notify-records', sort: 3, permission: 'notify:list' },
    { parent: 'group-system', code: 'users', label: '用户管理', path: '/manager/users', sort: 1, permission: 'user:list' },
    { parent: 'group-system', code: 'roles', label: '角色管理', path: '/manager/roles', sort: 2, permission: 'role:list' },
    { parent: 'group-system', code: 'settings', label: '站点设置', path: '/manager/settings', sort: 3, permission: 'setting:list' },
    { parent: 'group-system', code: 'logs', label: '操作日志', path: '/manager/logs', sort: 4, permission: 'log:list' },
    { parent: 'group-system', code: 'user-actions', label: '行为记录', path: '/manager/user-actions', sort: 5, permission: 'log:list' },
    // P04：P03 新建页面 /manager/chat-history 的菜单（notify-rules 由 P07 建页时登记）
    { parent: 'group-system', code: 'chat-history', label: '对话日志', path: '/manager/chat-history', sort: 6, permission: 'log:list' },
  ];
  assertInCatalog([...top.map((m) => m.permission), ...children.map((c) => c.permission)], '菜单');

  for (const m of top) {
    await prisma.managerMenu.upsert({
      where: { code: m.code },
      update: {},
      create: { code: m.code, label: m.label, icon: m.icon, path: m.path, level: 1, sort: m.sort, permission: m.permission },
    });
  }
  for (const g of groups) {
    await prisma.managerMenu.upsert({
      where: { code: g.code },
      update: {},
      create: { code: g.code, label: g.label, icon: g.icon, level: 1, sort: g.sort },
    });
  }
  for (const c of children) {
    const parent = await prisma.managerMenu.findUnique({ where: { code: c.parent } });
    if (!parent) throw new Error(`seed: 菜单分组缺失 ${c.parent}`);
    await prisma.managerMenu.upsert({
      where: { code: c.code },
      update: {},
      create: { code: c.code, label: c.label, path: c.path, parentId: parent.id, level: 2, sort: c.sort, permission: c.permission },
    });
  }
}

async function seedFrontNavigation() {
  // P04 修复：仅在 Navigation 为空时种默认前台导航。
  // 原实现按 slug upsert，会在已导入 main 导航（slug 体系不同：education/majors/news…）的库上追加 5 条，
  // 使前台导航溢出、偏离 main 视觉（test:visual 768/375 横向溢出即由此发现）。
  if ((await prisma.navigation.count()) > 0) return;
  const navs: { slug: string; name: string; link: string; sort: number; level: number }[] = [
    { slug: 'home', name: '首页', link: '/', sort: 1, level: 1 },
    { slug: 'about', name: '关于我们', link: '/about', sort: 2, level: 1 },
    { slug: 'courses', name: '课程中心', link: '/courses', sort: 3, level: 1 },
    { slug: 'articles', name: '新闻资讯', link: '/articles', sort: 4, level: 1 },
    { slug: 'partners', name: '合作院校', link: '/partners', sort: 5, level: 1 },
    { slug: 'campus', name: '校区环境', link: '/campus', sort: 6, level: 1 },
    { slug: 'gallery', name: '证书风采', link: '/gallery', sort: 7, level: 1 },
    { slug: 'apply', name: '在线报名', link: '/apply', sort: 8, level: 1 },
    { slug: 'contact', name: '联系我们', link: '/contact', sort: 9, level: 1 },
  ];
  for (const n of navs) {
    await prisma.navigation.upsert({
      where: { slug: n.slug },
      update: {},
      create: { slug: n.slug, name: n.name, link: n.link, linkType: 'internal', sort: n.sort, level: n.level, isNav: true, isVisible: true },
    });
  }
}

async function seedSettings() {
  const items: { key: string; value: string; type: string; group: string; isPublic?: boolean; description?: string }[] = [
    { key: 'siteName', value: '弘道教育', type: 'string', group: 'site' },
    { key: 'siteDescription', value: '专注专升本学历提升', type: 'string', group: 'site' },
    { key: 'siteLogo', value: '/images/logo.png', type: 'string', group: 'site' },
    { key: 'topNoticeText', value: '2026成人高考火热报名中', type: 'string', group: 'topbar' },
    { key: 'topNoticePhone', value: '132-1945-5550', type: 'string', group: 'topbar' },
    { key: 'contactPhone', value: '400-001-5729', type: 'string', group: 'contact' },
    { key: 'contactPhone2', value: '028-6167-5329', type: 'string', group: 'contact' },
    { key: 'address', value: '成都市青羊区大石西路12号', type: 'string', group: 'contact' },
    { key: 'seoTitle', value: '弘道教育 - 专升本学历提升', type: 'string', group: 'seo' },
    { key: 'seoKeywords', value: '专升本,学历提升,成人教育,自考,成考', type: 'string', group: 'seo' },
    { key: 'seoDescription', value: '弘道教育提供自考、成考、开放大学等学历提升服务。', type: 'string', group: 'seo' },
    { key: 'workHours', value: '周一至周日 9:00-18:00', type: 'string', group: 'footer' },
  ];
  for (const it of items) {
    await prisma.setting.upsert({
      where: { key: it.key },
      update: {},
      create: { ...it, isPublic: it.isPublic ?? true },
    });
  }
}

async function seedCategoriesAndTags() {
  // P04 修复：示例内容仅种入空表（已导入 main 内容的库上按 slug upsert 会追加示例行，改变前台列表/视觉）
  if ((await prisma.category.count()) > 0 || (await prisma.tag.count()) > 0) return;
  const cats: { name: string; slug: string; type: string; sort: number }[] = [
    { name: '自考', slug: 'zikao', type: 'course', sort: 1 },
    { name: '成人高考', slug: 'chengkao', type: 'course', sort: 2 },
    { name: '开放大学', slug: 'kaifang', type: 'course', sort: 3 },
    { name: '招生政策', slug: 'zhaosheng-zhengce', type: 'article', sort: 1 },
    { name: '考试资讯', slug: 'kaoshi-zixun', type: 'article', sort: 2 },
  ];
  for (const c of cats) {
    await prisma.category.upsert({ where: { slug: c.slug }, update: {}, create: c });
  }
  const tags: { name: string; slug: string }[] = [
    { name: '招生政策', slug: 'policy' },
    { name: '考试资讯', slug: 'exam-news' },
    { name: '学习经验', slug: 'experience' },
  ];
  for (const t of tags) {
    await prisma.tag.upsert({ where: { slug: t.slug }, update: {}, create: t });
  }
}

async function seedArticles() {
  // P04 修复：示例内容仅种入空表（已导入 main 内容的库上按 slug upsert 会追加示例行，改变前台列表/视觉）
  if ((await prisma.article.count()) > 0) return;
  const admin = await prisma.user.findUnique({ where: { username: 'admin' } });
  const catInfo = await prisma.category.findUnique({ where: { slug: 'kaoshi-zixun' } });
  const catPolicy = await prisma.category.findUnique({ where: { slug: 'zhaosheng-zhengce' } });
  if (!admin) throw new Error('seed: admin 用户缺失');

  const articles = [
    {
      title: '2026 年四川省成人高考报名通知',
      slug: '2026-sichuan-chengkao-baoming',
      channel: 'news' as const,
      contentType: 'markdown' as const,
      categoryId: catPolicy?.id,
      content:
        '# 2026 年四川省成人高考报名通知\n\n根据省教育考试院安排，2026 年成人高考报名工作即将开始。\n\n## 报名时间\n\n- 网上报名：9 月上旬\n- 现场确认：9 月中旬\n\n## 注意事项\n\n1. 请提前准备身份证与学历证明\n2. 异地报考需提供社保或居住证明\n\n> 详细政策以省教育考试院官方通知为准。',
    },
    {
      title: '自考与成考的区别：一图看懂',
      slug: 'zikao-vs-chengkao',
      channel: 'info' as const,
      contentType: 'markdown' as const,
      categoryId: catInfo?.id,
      content:
        '# 自考与成考的区别\n\n很多同学在学历提升时都会问：**自考和成考到底选哪个？**\n\n| 维度 | 自考 | 成考 |\n| --- | --- | --- |\n| 入学方式 | 免试入学 | 全国统考 |\n| 学习方式 | 自学为主 | 业余/函授 |\n| 毕业时间 | 1.5-2 年 | 2.5 年 |\n\n欢迎点击「立即咨询」获取个性化建议。',
    },
    {
      title: '弘道教育 2026 春季开学典礼顺利举行',
      slug: '2026-spring-opening-ceremony',
      channel: 'news' as const,
      contentType: 'html' as const,
      categoryId: catInfo?.id,
      content: '<p>2026 年春季开学典礼在成都校区顺利举行，全体师生共同见证了新学期的开始。</p>',
    },
  ];
  for (const a of articles) {
    await prisma.article.upsert({
      where: { slug: a.slug },
      update: {},
      create: {
        title: a.title,
        slug: a.slug,
        content: a.content,
        contentType: a.contentType,
        channel: a.channel,
        authorId: admin.id,
        categoryId: a.categoryId ?? null,
        status: 'published',
        publishedAt: new Date(),
      },
    });
  }
}

async function seedChatScenes() {
  const scenes = [
    {
      code: 'apply',
      name: '报名咨询',
      greeting: '您好，我是弘道教育报考助手，请告诉我您想提升的学历层次与专业方向。',
      systemPrompt:
        '你是弘道教育的报考咨询师。面向四川专升本/成人学历提升学员，回答准确、简洁、合规，不承诺保过，涉及具体费用与政策时引导用户拨打 400-001-5729 或提交报名表单。',
    },
    {
      code: 'float',
      name: '悬浮客服',
      greeting: '您好，有什么可以帮您？',
      systemPrompt: '你是弘道教育官网客服助手，礼貌专业，优先使用知识库内容回答。',
    },
    {
      code: 'faq',
      name: '常见问题',
      greeting: '您好，请问您想了解自考、成考还是开放大学？',
      systemPrompt: '你是弘道教育 FAQ 助手，优先依据知识库回答学历提升常见问题。',
    },
  ];
  for (const s of scenes) {
    await prisma.chatScene.upsert({ where: { code: s.code }, update: {}, create: s });
  }
}

async function seedCronJobs() {
  const jobs: { name: string; cron: string }[] = [
    { name: 'backup', cron: '0 3 * * *' },
    { name: 'collect.run', cron: '0 4 * * *' },
    { name: 'publish.scan', cron: '* * * * *' },
    { name: 'notify.scan', cron: '* * * * *' },
    { name: 'retry.failed', cron: '*/5 * * * *' },
    { name: 'llm.balance-check', cron: '0 9 * * *' },
  ];
  for (const j of jobs) {
    await prisma.cronJob.upsert({ where: { name: j.name }, update: {}, create: j });
  }
}

async function seedServiceGuide() {
  // P04 修复：示例内容仅种入空表（已导入 main 内容的库上按 slug upsert 会追加示例行，改变前台列表/视觉）
  if ((await prisma.serviceGuide.count()) > 0) return;
  const guides = [
    { slug: 'baoming-liucheng', title: '报名流程', content: '1. 咨询确认层次与专业\n2. 提交报名资料\n3. 签订协议缴费\n4. 复习备考\n5. 现场确认与考试', icon: 'ClipboardList', sort: 1 },
    { slug: 'xuexi-xingshi', title: '学习形式', content: '业余/函授/开放教育，手机 APP + 面授结合，工作学习两不误。', icon: 'BookOpen', sort: 2 },
  ];
  for (const g of guides) {
    await prisma.serviceGuide.upsert({
      where: { slug: g.slug },
      update: {},
      create: { ...g, contentType: 'markdown', link: `/services/${g.slug}` },
    });
  }
}

async function seedKnowledgeBases() {
  // W0-06 / P12：默认知识库种子（ADR-020 本地兜底 + ADR-025 Coze 集成）。
  // upsert update:{} 幂等，不覆盖手工修改；Knowledge.baseId 只回填空行。
  const bases = [
    { name: '通用知识', code: 'general', description: '站点问答通用知识库（招生政策、院校动态、常见问题）', isDefault: true, sort: 1 },
    { name: '采集资讯', code: 'collect', description: '内容采集自动入库的知识库（CollectSource 未指定库时的默认落点）', isDefault: false, sort: 2 },
  ];
  for (const b of bases) {
    await prisma.knowledgeBase.upsert({ where: { code: b.code }, update: {}, create: b });
    console.log('seed: 知识库已就绪 — ' + b.name + ' (' + b.code + ')');
  }
  const general = await prisma.knowledgeBase.findUnique({ where: { code: 'general' } });
  const collect = await prisma.knowledgeBase.findUnique({ where: { code: 'collect' } });
  if (!general || !collect) throw new Error('seed: 默认知识库缺失（general/collect）');
  const pending = await prisma.knowledge.findMany({ where: { baseId: null } });
  for (const k of pending) {
    const target = k.source === 'collect' ? collect.id : general.id;
    await prisma.knowledge.update({ where: { id: k.id }, data: { baseId: target } });
    console.log('seed: Knowledge#' + k.id + ' → 知识库 ' + (k.source === 'collect' ? 'collect' : 'general'));
  }
}

async function seedCollectSources() {
  // 采集源（用户 2026-10-11 指定 + 强关联补选；URL 已核实真实可达；选择器可经"试抓预览"校准）
  const sources: { name: string; type: 'html' | 'rss'; url: string; parser: string; autoTags: string[]; cron: string }[] = [
    {
      name: '四川省教育考试院 · 招考动态',
      type: 'html',
      url: 'https://www.sceea.cn/List/NewsList_1.html',
      parser: JSON.stringify({ listSelector: 'ul.list li', titleSelector: 'a', linkSelector: 'a', contentSelector: '.content, #content, .article-content, main' }),
      autoTags: ['招生政策', '四川'],
      cron: '0 4 * * *',
    },
    {
      name: '四川大学继续教育学院',
      type: 'html',
      url: 'https://cce.scu.edu.cn/',
      parser: JSON.stringify({ listSelector: '.news-list li', titleSelector: 'a', linkSelector: 'a' }),
      autoTags: ['院校动态', '四川大学'],
      cron: '0 4 * * *',
    },
    {
      name: '电子科技大学继续教育学院 · 通知公告',
      type: 'html',
      url: 'https://jxjy.uestc.edu.cn/xwzx/tzgg.htm',
      parser: JSON.stringify({ listSelector: 'div[class*=list-box] li, .list li', titleSelector: 'a', linkSelector: 'a', contentSelector: '#vsb_content, .v_news_content, .content' }),
      autoTags: ['院校动态', '电子科技大学'],
      cron: '0 4 * * *',
    },
    {
      name: '电子科技大学继续教育学院 · 学院新闻',
      type: 'html',
      url: 'https://jxjy.uestc.edu.cn/xwzx/xyxw.htm',
      parser: JSON.stringify({ listSelector: 'div[class*=list-box] li, .list li', titleSelector: 'a', linkSelector: 'a', contentSelector: '#vsb_content, .v_news_content, .content' }),
      autoTags: ['院校动态', '电子科技大学'],
      cron: '30 4 * * *',
    },
    {
      name: '四川省教育厅 · 通知公告',
      type: 'html',
      url: 'http://edu.sc.gov.cn/scedu/c100495/xwzx_list.shtml',
      parser: JSON.stringify({ listSelector: 'ul li, .news_list li', titleSelector: 'a', linkSelector: 'a', contentSelector: '.TRS_Editor, #zoom, .content' }),
      autoTags: ['招生政策', '四川教育厅'],
      cron: '0 5 * * *',
    },
  ];
  for (const s of sources) {
    const exists = await prisma.collectSource.findFirst({ where: { url: s.url } });
    if (!exists) {
      await prisma.collectSource.create({
        data: { name: s.name, type: s.type, url: s.url, parser: s.parser, cron: s.cron, autoTags: JSON.stringify(s.autoTags), enabled: true },
      });
      console.log('seed: 采集源已登记 — ' + s.name);
    }
  }
  // 川大继教为 JS 渲染站（设计文档已知限制）：试抓为空属预期，选择器待校准或走前端渲染扩展
  console.log('seed: 注意 — cce.scu.edu.cn 为 JS 渲染站，若试抓为空需人工校准解析规则');
}

async function seedNotifyDefaults() {
  const events = [
    'before_publish_news',
    'before_publish_info',
    'before_publish_wechat',
    'llm_balance_low',
    'job_failed',
    'system_error',
    'collect_failed',
  ];
  const template = await prisma.notifyTemplate.findFirst({ where: { isDefault: true } });
  const defaultTemplate =
    template ??
    (await prisma.notifyTemplate.create({
      data: {
        name: '默认通知模板',
        subject: '【弘道教育】{title}',
        body: '时间：{time}\n事项：{title}\n详情：{detail}\n链接：{link}',
        isDefault: true,
      },
    }));
  for (const event of events) {
    const existing = await prisma.notifyRule.findUnique({ where: { event } });
    if (!existing) {
      await prisma.notifyRule.create({
        // P06：错误/余额/任务失败类提醒同时发给 admin 组（多收件人）；发布前提醒发 publish 组
        data: {
          event,
          enabled: true,
          templateId: defaultTemplate.id,
          recipientGroups: ['system_error', 'job_failed', 'llm_balance_low', 'collect_failed'].includes(event) ? '["publish","admin"]' : '["publish"]',
        },
      });
    }
  }
}

/**
 * ADR-024（取代 ADR-012）：页面模板 / 内容块 / 首页区块配置，按 main@94dbbbb prisma/seed.ts:451-485 恢复。
 * - main 原 4 模板 + 4 内容块：字段逐字照搬，upsert update:{}（幂等，不覆盖后台修改）。
 * - 另建 `home` 模板 + 首页 12 区块（code = P02 首页 `data-block` 锚点，顺序 = main 首页实际渲染顺序，默认全部启用）；
 *   `home-banner` 复用 main 原有内容块行。TemplateBlock 以 (templateId, blockId) 查重后再建，重跑不重复。
 * - ElementConfig 不种数据（main dev.db 为 0 行）。
 */
async function seedTemplatesAndBlocks() {
  const templateData = [
    { code: 'list', name: '列表页模板', layout: 'sidebar', contentType: 'article', templateFile: 'app/(web)/templates/list.tsx', isDefault: true },
    { code: 'article', name: '文章详情页模板', layout: 'sidebar', contentType: 'article', templateFile: 'app/(web)/templates/article.tsx' },
    { code: 'partner-grid', name: '合作院校网格模板', layout: 'fullwidth', contentType: 'partner', templateFile: 'app/(web)/templates/partner-grid.tsx' },
    { code: 'course-list', name: '课程列表模板', layout: 'sidebar', contentType: 'course', templateFile: 'app/(web)/templates/course-list.tsx' },
    { code: 'home', name: '首页模板', description: '首页区块配置（ADR-024）：TemplateBlock.sort 决定顺序，ContentBlock.status 决定启用', layout: 'fullwidth', templateFile: 'app/(web)/page.tsx' },
  ];
  for (const t of templateData) {
    await prisma.pageTemplate.upsert({ where: { code: t.code }, update: {}, create: t });
  }

  const blockData = [
    { code: 'home-banner', name: '首页轮播图', type: 'banner', contentType: 'query', query: JSON.stringify({ model: 'Banner', where: { status: 'active' }, orderBy: { sort: 'asc' } }), limit: 5 },
    { code: 'news-list', name: '新闻列表', type: 'list', contentType: 'query', query: JSON.stringify({ model: 'Article', where: { status: 'published' }, orderBy: { publishedAt: 'desc' } }), limit: 10 },
    { code: 'sidebar-hot', name: '侧边栏热门文章', type: 'sidebar', contentType: 'query', query: JSON.stringify({ model: 'Article', where: { isHot: true }, take: 10 }), style: JSON.stringify({ bgColor: '#f9f9f9', padding: '15px' }) },
    { code: 'course-recommend', name: '推荐课程', type: 'grid', contentType: 'query', query: JSON.stringify({ model: 'Course', where: { status: 'active' }, orderBy: { sort: 'asc' } }), limit: 6 },
    // 首页区块（name/type 取 main src/lib/block-registry.ts，registry 未列出的按组件语义补齐）
    { code: 'home-cards', name: '四宫格入口', type: 'grid', contentType: 'query' },
    { code: 'home-topbar', name: '顶部通知栏', type: 'banner', contentType: 'settings' },
    { code: 'home-entrance', name: '三栏内容区', type: 'list', contentType: 'query' },
    { code: 'home-stats', name: '统计横幅', type: 'stats', contentType: 'settings' },
    { code: 'home-partners', name: '合作院校', type: 'grid', contentType: 'query' },
    { code: 'home-courses', name: '热门课程', type: 'list', contentType: 'query' },
    { code: 'home-intro', name: '公司简介', type: 'intro', contentType: 'settings' },
    { code: 'home-news', name: '最新资讯', type: 'list', contentType: 'query' },
    { code: 'home-certificates', name: '证书风采', type: 'grid', contentType: 'query' },
    { code: 'home-campus', name: '学院风采', type: 'grid', contentType: 'query' },
    { code: 'home-cta', name: '报名行动号召', type: 'cta', contentType: 'static' },
  ];
  for (const b of blockData) {
    await prisma.contentBlock.upsert({ where: { code: b.code }, update: {}, create: b });
  }

  // 首页区块顺序 = src/app/(web)/page.tsx HOME_BLOCK_ORDER（= main 首页实际顺序）
  const HOME_ORDER = [
    'home-banner', 'home-cards', 'home-topbar', 'home-entrance', 'home-stats', 'home-partners',
    'home-courses', 'home-intro', 'home-news', 'home-certificates', 'home-campus', 'home-cta',
  ];
  const home = await prisma.pageTemplate.findUnique({ where: { code: 'home' } });
  if (!home) throw new Error('seed: home 模板缺失');
  for (const [i, code] of HOME_ORDER.entries()) {
    const block = await prisma.contentBlock.findUnique({ where: { code } });
    if (!block) throw new Error(`seed: 内容块缺失 ${code}`);
    const exists = await prisma.templateBlock.findFirst({ where: { templateId: home.id, blockId: block.id } });
    if (!exists) {
      await prisma.templateBlock.create({ data: { templateId: home.id, blockId: block.id, sort: (i + 1) * 10 } });
    }
  }
}

async function main() {
  console.log('seed: 开始写入基线数据…');
  await seedRoles();
  await seedAdmin();
  await seedMenus();
  await seedFrontNavigation();
  await seedTemplatesAndBlocks();
  await seedSettings();
  await seedCategoriesAndTags();
  await seedArticles();
  await seedKnowledgeBases();
  await seedChatScenes();
  await seedCronJobs();
  await seedServiceGuide();
  await seedCollectSources();
  await seedNotifyDefaults();
  console.log('seed: 完成。管理员账号 admin / admin123（上线必须修改）');
}

main()
  .catch((e) => {
    console.error('seed 失败：', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
