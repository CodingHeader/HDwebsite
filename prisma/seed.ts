/**
 * M1 基线 seed（幂等：upsert update 分支为空 {}，重跑不覆盖手工修改）
 * 范围：角色/管理员/菜单/设置/分类/标签/示例文章/聊天场景/调度任务行/服务指南/通知默认
 * 注意：Registry（src/lib/settings-registry.ts）为设置唯一真相源；此处仅落关键公开项。
 */
import { PrismaClient } from '@prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';
import * as bcrypt from 'bcryptjs';

const adapter = new PrismaLibSql({ url: 'file:./prisma/dev.db' });
const prisma = new PrismaClient({ adapter });

async function seedRoles() {
  await prisma.role.upsert({
    where: { slug: 'super-admin' },
    update: {},
    create: {
      name: 'SuperAdmin',
      slug: 'super-admin',
      description: '超级管理员（审核权独享，ADR-017）',
      permissions: JSON.stringify(['*']),
      isSuper: true,
    },
  });
  await prisma.role.upsert({
    where: { slug: 'editor' },
    update: {},
    create: {
      name: 'Editor',
      slug: 'editor',
      description: '编辑：内容与招生数据维护',
      permissions: JSON.stringify([
        'article:list', 'article:create', 'article:edit',
        'category:list', 'category:create', 'category:edit',
        'tag:list', 'tag:create', 'tag:edit',
        'course:list', 'course:create', 'course:edit',
        'major:list', 'major:create', 'major:edit',
        'enrollment:list', 'enrollment:create', 'enrollment:edit',
        'student:list', 'student:edit',
        'banner:list', 'banner:edit',
        'media:list', 'media:create',
        'service:list', 'service:create', 'service:edit',
        'content:edit',
      ]),
      isSuper: false,
    },
  });
  await prisma.role.upsert({
    where: { slug: 'viewer' },
    update: {},
    create: {
      name: 'Viewer',
      slug: 'viewer',
      description: '只读',
      permissions: JSON.stringify([
        'article:list', 'category:list', 'tag:list', 'course:list',
        'major:list', 'enrollment:list', 'student:list', 'media:list',
        'banner:list', 'service:list', 'setting:list', 'log:list',
      ]),
      isSuper: false,
    },
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
  const menus: { code: string; label: string; icon?: string; path?: string; level: number; sort: number; permission?: string; parentId?: number }[] = [
    { code: 'dashboard', label: '仪表盘', icon: 'LayoutDashboard', path: '/manager', level: 1, sort: 0 },
    { code: 'articles', label: '文章管理', icon: 'FileText', path: '/manager/articles', level: 1, sort: 10, permission: 'article:list' },
    // R0 基线重建时补齐：categories/tags/courses/majors/enrollment-offerings/students/
    // banners/partners/gallery/campus/home-cards/hot-majors/service-guides/media/
    // content-hub/collect-sources/collect-items/publish-jobs/knowledge/llm-providers/
    // notify/wechat-accounts/users/roles/settings/logs/chat-scenes 等（ManagerMenu 表驱动）
  ];
  for (const m of menus) {
    await prisma.managerMenu.upsert({
      where: { code: m.code },
      update: {},
      create: { code: m.code, label: m.label, icon: m.icon, path: m.path, level: m.level, sort: m.sort, permission: m.permission },
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
        data: { event, enabled: true, templateId: defaultTemplate.id, recipientGroups: '["publish"]' },
      });
    }
  }
}

async function main() {
  console.log('seed: 开始写入基线数据…');
  await seedRoles();
  await seedAdmin();
  await seedMenus();
  await seedSettings();
  await seedCategoriesAndTags();
  await seedArticles();
  await seedChatScenes();
  await seedCronJobs();
  await seedServiceGuide();
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
