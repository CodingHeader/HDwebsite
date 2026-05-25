import { PrismaClient } from '@prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';
import * as bcrypt from 'bcryptjs';

const adapter = new PrismaLibSql({
  url: 'file:./prisma/dev.db',
});
const prisma = new PrismaClient({ adapter });

// 类型定义
type NavItem = {
  parentId: number | null;
  level: number;
  name: string;
  slug: string;
  link?: string;
  linkType: string;
  target?: string;
  sort: number;
};

type CategoryItem = {
  id: number;
  name: string;
  slug: string;
  type: string;
  sort: number;
};

type SettingItem = {
  key: string;
  value: string;
  type: string;
  group: string;
};

type TemplateItem = {
  code: string;
  name: string;
  layout: string;
  contentType: string;
  templateFile: string;
  isDefault?: boolean;
};

type BlockItem = {
  code: string;
  name: string;
  type: string;
  contentType: string;
  query?: string;
  limit?: number;
  style?: string;
};

type SubMenuItem = {
  code: string;
  label: string;
  icon: string;
  path?: string;
  sort: number;
  permission?: string;
};

type RoleItem = {
  name: string;
  slug: string;
  description: string;
  permissions: string;
  isSuper: boolean;
  status: string;
};

type MenuDataItem = {
  code: string;
  label: string;
  icon: string;
  path?: string;
  level: number;
  sort: number;
  permission?: string;
};

type ContentSubMenuItem = {
  code: string;
  label: string;
  icon: string;
  path: string;
  sort: number;
  permission: string;
};

type SystemSubMenuItem = {
  code: string;
  label: string;
  icon: string;
  path: string;
  sort: number;
  permission: string;
};

async function main() {
  // ============================================
  // Phase 1.1.1: 创建Role角色
  // ============================================
  const superAdminRole = await prisma.role.upsert({
    where: { slug: 'super-admin' },
    update: {},
    create: {
      name: 'SuperAdmin',
      slug: 'super-admin',
      description: '超级管理员，拥有所有权限',
      permissions: JSON.stringify(['*']),
      isSuper: true,
      status: 'active',
    },
  });

  const editorRole = await prisma.role.upsert({
    where: { slug: 'editor' },
    update: {},
    create: {
      name: 'Editor',
      slug: 'editor',
      description: '编辑，可以管理内容',
      permissions: JSON.stringify([
        'navigation:list',
        'article:*',
        'category:*',
        'tag:*',
        'media:*',
      ]),
      isSuper: false,
      status: 'active',
    },
  });

  const viewerRole = await prisma.role.upsert({
    where: { slug: 'viewer' },
    update: {},
    create: {
      name: 'Viewer',
      slug: 'viewer',
      description: '查看者，只能查看',
      permissions: JSON.stringify([
        'navigation:list',
        'article:list',
        'category:list',
      ]),
      isSuper: false,
      status: 'active',
    },
  });

  // ============================================
  // Phase 1.1.1: 创建User管理员
  // ============================================
  const adminPassword = await bcrypt.hash('admin123', 10);
  await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      passwordHash: adminPassword,
      email: 'admin@example.com',
      nickname: '超级管理员',
      roleId: superAdminRole.id,
      isActive: true,
      status: 'active',
    },
  });

  // ============================================
  // Phase 1.1.2: 创建Navigation导航
  // ============================================
  const navData = [
    { parentId: null, level: 1, name: '网站首页', slug: 'home', link: '/', linkType: 'internal', sort: 1 },
    { parentId: null, level: 1, name: '关于我们', slug: 'about', linkType: 'dropdown', sort: 2 },
    { parentId: null, level: 1, name: '学历提升', slug: 'education', link: '/courses', linkType: 'internal', sort: 3 },
    { parentId: null, level: 1, name: '热门院校', slug: 'partners', link: '/partners', linkType: 'internal', sort: 4 },
    { parentId: null, level: 1, name: '热门专业', slug: 'majors', linkType: 'dropdown', sort: 5 },
    { parentId: null, level: 1, name: '资讯中心', slug: 'news', linkType: 'dropdown', sort: 6 },
    { parentId: null, level: 1, name: '学习中心', slug: 'learning', link: '/learning', linkType: 'internal', sort: 7 },
    { parentId: null, level: 1, name: '党建专栏', slug: 'party', link: '/party', linkType: 'internal', sort: 8 },
    { parentId: null, level: 1, name: '联系我们', slug: 'contact', link: '/contact', linkType: 'internal', sort: 9 },
  ];

  for (const nav of navData) {
    await prisma.navigation.upsert({
      where: { slug: nav.slug },
      update: {},
      create: nav as NavItem,
    });
  }

  // ============================================
  // Phase 1.1.3: 创建Category分类
  // ============================================
  const categoryData = [
    // 课程分类
    { id: 1, name: '经管类', slug: 'jingguan', type: 'course', sort: 1 },
    { id: 2, name: '理工类', slug: 'ligong', type: 'course', sort: 2 },
    { id: 3, name: '文史类', slug: 'wenshi', type: 'course', sort: 3 },
    { id: 4, name: '教育类', slug: 'jiaoyu', type: 'course', sort: 4 },
    { id: 5, name: '医学类', slug: 'yixue', type: 'course', sort: 5 },
    { id: 6, name: '法学类', slug: 'faxue', type: 'course', sort: 6 },
    { id: 7, name: '艺术类', slug: 'yishu', type: 'course', sort: 7 },
    // 文章分类
    { id: 8, name: '学校新闻', slug: 'school-news', type: 'article', sort: 1 },
    { id: 9, name: '通知公告', slug: 'announcements', type: 'article', sort: 2 },
    { id: 10, name: '政策法规', slug: 'policies', type: 'article', sort: 3 },
    { id: 11, name: '行业动态', slug: 'industry', type: 'article', sort: 4 },
    { id: 12, name: '考试资讯', slug: 'exams', type: 'article', sort: 5 },
  ];

  for (const cat of categoryData) {
    await prisma.category.upsert({
      where: { id: cat.id },
      update: {},
      create: cat as CategoryItem,
    });
  }

  // 创建测试课程
  await Promise.all([
    prisma.course.upsert({
      where: { id: 1 },
      update: {},
      create: {
        id: 1,
        title: '行政管理专业（专升本）',
        description: '自考专升本热门专业，考试通过率高，就业前景广阔。培养具备现代行政管理理论知识和实践能力的高级管理人才。',
        price: 5800,
        duration: '2-3年',
        outline: '<h3>课程设置</h3><ul><li>中国近现代史纲要</li><li>马克思主义基本原理概论</li><li>英语（二）</li><li>社会学概论</li><li>当代中国政治制度</li><li>西方政治制度</li></ul>',
        categoryId: 1,
        status: 'active',
      },
    }),
    prisma.course.upsert({
      where: { id: 2 },
      update: {},
      create: {
        id: 2,
        title: '工商管理专业（专升本）',
        description: '成考专升本经典专业，适合在职人员提升学历。系统学习企业管理理论与方法，提升综合管理能力。',
        price: 6200,
        duration: '2.5年',
        outline: '<h3>核心课程</h3><ul><li>管理学原理</li><li>会计学原理</li><li>市场营销学</li><li>人力资源管理</li><li>财务管理</li><li>战略管理</li></ul>',
        categoryId: 1,
        status: 'active',
      },
    }),
    prisma.course.upsert({
      where: { id: 3 },
      update: {},
      create: {
        id: 3,
        title: '计算机科学与技术（专升本）',
        description: '理工类热门专业，培养具有计算机软硬件基础理论和应用能力的高素质技术人才。',
        price: 6800,
        duration: '2-3年',
        outline: '<h3>主要课程</h3><ul><li>高等数学</li><li>数据结构</li><li>操作系统</li><li>计算机网络</li><li>数据库原理</li><li>软件工程</li></ul>',
        categoryId: 2,
        status: 'active',
      },
    }),
    prisma.course.upsert({
      where: { id: 4 },
      update: {},
      create: {
        id: 4,
        title: '汉语言文学（专升本）',
        description: '文史类经典专业，培养具有扎实的汉语言文学基础和较高文学素养的复合型人才。',
        price: 5200,
        duration: '2-3年',
        outline: '<h3>核心课程</h3><ul><li>中国现代文学史</li><li>中国古代文学史</li><li>外国文学史</li><li>文学概论</li><li>语言学概论</li><li>美学</li></ul>',
        categoryId: 3,
        status: 'active',
      },
    }),
    prisma.course.upsert({
      where: { id: 5 },
      update: {},
      create: {
        id: 5,
        title: '学前教育专业（专升本）',
        description: '教育类热门专业，培养具备学前教育专业知识和实践能力的教师。',
        price: 5500,
        duration: '2-3年',
        outline: '<h3>专业课程</h3><ul><li>学前心理学</li><li>学前教育学</li><li>学前卫生学</li><li>幼儿园课程</li><li>幼儿游戏指导</li><li>儿童文学</li></ul>',
        categoryId: 4,
        status: 'active',
      },
    }),
    prisma.course.upsert({
      where: { id: 6 },
      update: {},
      create: {
        id: 6,
        title: '护理学专业（专升本）',
        description: '医学类核心专业，培养具备护理学理论知识和临床护理能力的高级护理人才。',
        price: 7200,
        duration: '3年',
        outline: '<h3>主干课程</h3><ul><li>人体解剖学</li><li>生理学</li><li>病理学</li><li>药理学</li><li>基础护理学</li><li>内科护理学</li></ul>',
        categoryId: 5,
        status: 'active',
      },
    }),
  ]);

  // 创建测试新闻
  await Promise.all([
    prisma.news.upsert({
      where: { id: 1 },
      update: {},
      create: {
        id: 1,
        title: '2026年四川省统招专升本考试报名时间公布',
        content: '<p>根据四川省教育考试院通知，2026年四川省统招专升本考试报名时间为2025年12月1日至12月15日。考生可通过四川省教育考试院官网进行网上报名。</p><p><strong>报名注意事项：</strong></p><ul><li>考生须为四川省普通高校全日制专科应届毕业生</li><li>考生须持有居民身份证</li><li>每名考生限报一所本科院校</li></ul>',
        status: 'published',
        views: 1250,
      },
    }),
    prisma.news.upsert({
      where: { id: 2 },
      update: {},
      create: {
        id: 2,
        title: '自学考试专升本：如何选择适合自己的专业',
        content: '<p>选择适合自己的专升本专业，需要考虑以下几个因素：</p><h3>1. 职业规划</h3><p>选择与未来职业发展方向一致的专业，能够为职业发展奠定基础。</p><h3>2. 个人兴趣</h3><p>兴趣是最好的老师，选择自己感兴趣的专业，学习过程会更加轻松愉快。</p><h3>3. 考试难度</h3><p>不同专业的考试科目和难度不同，需要根据自身基础合理选择。</p><h3>4. 就业前景</h3><p>了解各专业的就业情况，选择市场需求较大的专业。</p>',
        status: 'published',
        views: 890,
      },
    }),
    prisma.news.upsert({
      where: { id: 3 },
      update: {},
      create: {
        id: 3,
        title: '成人高考专升本备考攻略：零基础也能上岸',
        content: '<p>成人高考专升本考试虽然难度相对较低，但对于离开学校多年的考生来说，仍然需要认真备考。以下是零基础考生的备考建议：</p><h3>制定学习计划</h3><p>根据考试科目和自身基础，制定详细的学习计划，每天保证2-3小时的学习时间。</p><h3>重视历年真题</h3><p>通过练习历年真题，了解考试题型和难度，掌握答题技巧。</p><h3>参加辅导班</h3><p>如果自学有困难，可以考虑参加专业的辅导班，获得系统的学习指导。</p>',
        status: 'published',
        views: 720,
      },
    }),
    prisma.news.upsert({
      where: { id: 4 },
      update: {},
      create: {
        id: 4,
        title: '弘道经理学院2026年春季专升本课程招生简章',
        content: '<p>弘道经理学院2026年春季专升本课程招生工作正式启动，欢迎广大专科毕业生咨询报名。</p><h3>招生专业</h3><ul><li>自考专升本：行政管理、汉语言文学、工商管理、会计</li><li>成考专升本：工商管理、计算机科学、学前教育、护理学</li></ul><h3>报名方式</h3><p>可通过学院官网在线报名，或拨打咨询热线：139-0809-1091</p><p>学院地址：四川省成都市高新区天府大道1700号新世界环球中心N2区601室</p>',
        status: 'published',
        views: 560,
      },
    }),
    prisma.news.upsert({
      where: { id: 5 },
      update: {},
      create: {
        id: 5,
        title: '专升本学历对职业发展的影响有多大',
        content: '<p>专升本学历对职业发展有着重要影响，主要体现在以下几个方面：</p><h3>就业门槛</h3><p>越来越多的企业在招聘时要求本科及以上学历，专升本是跨越这一门槛的重要途径。</p><h3>晋升空间</h3><p>在事业单位和大型企业中，学历往往是晋升的重要条件，本科学历能够获得更多的晋升机会。</p><h3>薪资待遇</h3><p>统计数据显示，本科毕业生的平均薪资普遍高于专科毕业生。</p><h3>考证资格</h3><p>很多职业资格证书的报考条件要求本科及以上学历，专升本可以打开这些考证通道。</p>',
        status: 'published',
        views: 430,
      },
    }),
  ]);

  // 创建轮播图
  await Promise.all([
    prisma.banner.upsert({
      where: { id: 1 },
      update: {},
      create: {
        id: 1,
        image: '/uploads/banners/banner1.jpg',
        link: '/courses',
        sort: 1,
        status: 'active',
      },
    }),
    prisma.banner.upsert({
      where: { id: 2 },
      update: {},
      create: {
        id: 2,
        image: '/uploads/banners/banner2.jpg',
        link: '/apply',
        sort: 2,
        status: 'active',
      },
    }),
    prisma.banner.upsert({
      where: { id: 3 },
      update: {},
      create: {
        id: 3,
        image: '/uploads/banners/banner3.jpg',
        link: '/news',
        sort: 3,
        status: 'active',
      },
    }),
  ]);

  // ============================================
  // Phase 1.1.5: 创建Setting系统配置
  // ============================================
  const settingData = [
    // 基本站点信息
    { key: 'site.title', value: '弘道经理学院', type: 'string', group: 'basic' },
    { key: 'site.subtitle', value: '弘道经理学院学历提升服务平台', type: 'string', group: 'basic' },
    { key: 'site.logo', value: '/images/logo.png', type: 'string', group: 'basic' },
    // 学校名称配置（用于全站统一显示）
    { key: 'schoolFullName', value: '弘道经理学院', type: 'string', group: 'school' },
    { key: 'schoolShortName', value: '弘道经理学院', type: 'string', group: 'school' },
    { key: 'schoolSlogan', value: '弘道经理学院，百年大计，教育为本！', type: 'string', group: 'school' },
    // 公司简介
    { key: 'companyIntro', value: '弘道经理学院成立于2004年2月，是一家专注于学历提升、职业证书考试培训的成人教育机构。学校位于四川省成都市高新区天府大道1700号新世界环球中心N2区601室，教学及办公设施设备齐全，设有标准化教室和多功能教室，可为学员提供稳定、规范的学习支持服务。\n\n学校坚持与时俱进、务实创新、诚信办学，长期围绕成人继续教育需求，形成了学历继续教育为主、兼顾职业能力提升的办学特色。我们持续优化课程体系、教学服务和学习支持流程，帮助不同基础的学员稳步完成学习目标。\n\n学校采用线下辅导与线上学习相结合的教学支持方式，为学员提供从咨询、报读、学习到毕业的全流程服务，持续输出规范、可靠、可追踪的学习成果。', type: 'text', group: 'school' },
    { key: 'statsText', value: '办学26年培养输送各类人才11万余人', type: 'string', group: 'stats' },
    // 联系方式
    { key: 'contact.phone1', value: '13908091091', type: 'string', group: 'contact' },
    { key: 'contact.phone2', value: '02885329903', type: 'string', group: 'contact' },
    { key: 'contact.email', value: '2360618023@qq.com', type: 'string', group: 'contact' },
    { key: 'contact.address', value: '四川省成都市高新区天府大道1700号新世界环球中心N2区601室', type: 'string', group: 'contact' },
    { key: 'contact.worktime', value: '周一至周日 9:00-18:00', type: 'string', group: 'contact' },
    // SEO设置
    { key: 'seo.title', value: '专升本_成人高考_自考_网络教育', type: 'string', group: 'seo' },
    { key: 'seo.keywords', value: '专升本,成人高考,自考,网络教育,学历提升', type: 'string', group: 'seo' },
    { key: 'seo.description', value: '弘道经理学院提供专升本、成人高考、自考等学历提升服务', type: 'string', group: 'seo' },
    // 社交链接
    { key: 'social.wechat', value: 'hongdaoedu', type: 'string', group: 'social' },
    { key: 'social.weibo', value: 'https://weibo.com/hongdaoedu', type: 'string', group: 'social' },
    { key: 'social.douyin', value: 'hongdaoedu', type: 'string', group: 'social' },
    // ICP备案
    { key: 'site.icp', value: '蜀ICP备14008479号-2', type: 'string', group: 'basic' },
    { key: 'site.copyright', value: '© 2026 弘道经理学院 版权所有', type: 'string', group: 'basic' },
  ];

  for (const setting of settingData) {
    await prisma.setting.upsert({
      where: { key: setting.key },
      update: {},
      create: setting as SettingItem,
    });
  }

  // ============================================
  // Phase 2.1: 创建PageTemplate模板
  // ============================================
  const templateData = [
    { code: 'list', name: '列表页模板', layout: 'sidebar', contentType: 'article', templateFile: 'app/(web)/templates/list.tsx', isDefault: true },
    { code: 'article', name: '文章详情页模板', layout: 'sidebar', contentType: 'article', templateFile: 'app/(web)/templates/article.tsx' },
    { code: 'partner-grid', name: '合作院校网格模板', layout: 'fullwidth', contentType: 'partner', templateFile: 'app/(web)/templates/partner-grid.tsx' },
    { code: 'course-list', name: '课程列表模板', layout: 'sidebar', contentType: 'course', templateFile: 'app/(web)/templates/course-list.tsx' },
  ];

  for (const template of templateData) {
    await prisma.pageTemplate.upsert({
      where: { code: template.code },
      update: {},
      create: template as TemplateItem,
    });
  }

  // ============================================
  // Phase 2.1: 创建ContentBlock内容块
  // ============================================
  const blockData = [
    { code: 'home-banner', name: '首页轮播图', type: 'banner', contentType: 'query', query: JSON.stringify({ model: 'Banner', where: { status: 'active' }, orderBy: { sort: 'asc' } }), limit: 5 },
    { code: 'news-list', name: '新闻列表', type: 'list', contentType: 'query', query: JSON.stringify({ model: 'Article', where: { status: 'published' }, orderBy: { publishedAt: 'desc' } }), limit: 10 },
    { code: 'sidebar-hot', name: '侧边栏热门文章', type: 'sidebar', contentType: 'query', query: JSON.stringify({ model: 'Article', where: { isHot: true }, take: 10 }), style: JSON.stringify({ bgColor: '#f9f9f9', padding: '15px' }) },
    { code: 'course-recommend', name: '推荐课程', type: 'grid', contentType: 'query', query: JSON.stringify({ model: 'Course', where: { status: 'active' }, orderBy: { sort: 'asc' } }), limit: 6 },
  ];

  for (const block of blockData) {
    await prisma.contentBlock.upsert({
      where: { code: block.code },
      update: {},
      create: block as BlockItem,
    });
  }

  // ============================================
  // Phase 3.4: 创建ManagerMenu后台菜单
  // ============================================
  // 新设计：混合模式 - 仪表盘+常用功能一级直出，其他分组折叠
  
  // 先创建一级菜单获取ID
  const dashboardMenu = await prisma.managerMenu.upsert({
    where: { code: 'dashboard' },
    update: {},
    create: { code: 'dashboard', label: '仪表盘', icon: 'LayoutDashboard', path: '/manager', level: 1, sort: 1 },
  });

  // 常用功能 - 一级直出
  const coursesMenu = await prisma.managerMenu.upsert({
    where: { code: 'courses' },
    update: {},
    create: { code: 'courses', label: '课程管理', icon: 'BookOpen', path: '/manager/courses', level: 1, sort: 2, permission: 'course:list' },
  });

  const newsMenu = await prisma.managerMenu.upsert({
    where: { code: 'news' },
    update: {},
    create: { code: 'news', label: '新闻管理', icon: 'Newspaper', path: '/manager/news', level: 1, sort: 3, permission: 'news:list' },
  });

  const studentsMenu = await prisma.managerMenu.upsert({
    where: { code: 'students' },
    update: {},
    create: { code: 'students', label: '学员管理', icon: 'Users', path: '/manager/students', level: 1, sort: 4, permission: 'student:list' },
  });

  const articlesMenu = await prisma.managerMenu.upsert({
    where: { code: 'articles' },
    update: {},
    create: { code: 'articles', label: '文章管理', icon: 'FileText', path: '/manager/articles', level: 1, sort: 5, permission: 'article:list' },
  });

  const bannersMenu = await prisma.managerMenu.upsert({
    where: { code: 'banners' },
    update: {},
    create: { code: 'banners', label: '轮播图管理', icon: 'Image', path: '/manager/banners', level: 1, sort: 6, permission: 'banner:list' },
  });

  // 内容管理分组（折叠）
  const contentMenu = await prisma.managerMenu.upsert({
    where: { code: 'content' },
    update: {},
    create: { code: 'content', label: '内容管理', icon: 'FolderOpen', level: 1, sort: 7 },
  });

  // 内容管理子菜单
  const contentSubMenus = [
    { code: 'categories', label: '分类管理', icon: 'FolderTree', path: '/manager/categories', sort: 1, permission: 'category:list' },
    { code: 'navigations', label: '导航管理', icon: 'Navigation', path: '/manager/navigations', sort: 2, permission: 'navigation:list' },
    { code: 'tags', label: '标签管理', icon: 'Tags', path: '/manager/tags', sort: 3, permission: 'tag:list' },
    { code: 'media', label: '媒体管理', icon: 'Images', path: '/manager/media', sort: 4, permission: 'media:list' },
  ];

  for (const menu of contentSubMenus) {
    await prisma.managerMenu.upsert({
      where: { code: menu.code },
      update: {},
      create: { ...menu, parentId: contentMenu.id, level: 2 } as SubMenuItem & { parentId: number; level: number },
    });
  }

  // 系统管理分组（折叠）
  const systemMenu = await prisma.managerMenu.upsert({
    where: { code: 'system' },
    update: {},
    create: { code: 'system', label: '系统管理', icon: 'Settings', level: 1, sort: 8 },
  });

  // AI 配置 - 一级直出
  const aiConfigMenu = await prisma.managerMenu.upsert({
    where: { code: 'ai-config' },
    update: {},
    create: { code: 'ai-config', label: 'AI 配置', icon: 'Bot', path: '/manager/ai-config', level: 1, sort: 9, permission: 'setting:list' },
  });

  // 学员招生分组（折叠）
  const enrollmentMenu = await prisma.managerMenu.upsert({
    where: { code: 'enrollment' },
    update: {},
    create: { code: 'enrollment', label: '招生管理', icon: 'GraduationCap', level: 1, sort: 10 },
  });

  const enrollmentSubMenus = [
    { code: 'partners', label: '合作院校', icon: 'School', path: '/manager/partners', sort: 1, permission: 'partner:list' },
    { code: 'gallery', label: '证书风采', icon: 'Award', path: '/manager/gallery', sort: 2, permission: 'gallery:list' },
    { code: 'hot-majors', label: '热门专业', icon: 'Flame', path: '/manager/hot-majors', sort: 3, permission: 'content:edit' },
    { code: 'enrollment-offerings', label: '招生计划', icon: 'BookOpen', path: '/manager/enrollment-offerings', sort: 4, permission: 'course:list' },
    { code: 'campus', label: '校区环境', icon: 'MapPin', path: '/manager/campus', sort: 5, permission: 'campus:list' },
    { code: 'service-guides', label: '服务指南', icon: 'HelpCircle', path: '/manager/service-guides', sort: 6, permission: 'service:list' },
  ];

  for (const menu of enrollmentSubMenus) {
    await prisma.managerMenu.upsert({
      where: { code: menu.code },
      update: {},
      create: { ...menu, parentId: enrollmentMenu.id, level: 2 } as SubMenuItem & { parentId: number; level: number },
    });
  }

  // 创建系统管理子菜单
  const systemSubMenus = [
    { code: 'users', label: '用户管理', icon: 'Users', path: '/manager/users', sort: 1, permission: 'user:list' },
    { code: 'roles', label: '角色管理', icon: 'Shield', path: '/manager/roles', sort: 2, permission: 'role:list' },
    { code: 'settings', label: '系统设置', icon: 'Settings', path: '/manager/settings', sort: 3, permission: 'setting:list' },
    { code: 'logs', label: '操作日志', icon: 'ScrollText', path: '/manager/logs', sort: 4, permission: 'log:list' },
    { code: 'user-actions', label: '埋点日志', icon: 'MousePointerClick', path: '/manager/user-actions', sort: 5, permission: 'log:list' },
    { code: 'chat-history', label: '对话日志', icon: 'MessageSquare', path: '/manager/chat-history', sort: 6, permission: 'log:list' },
  ];

  for (const menu of systemSubMenus) {
    await prisma.managerMenu.upsert({
      where: { code: menu.code },
      update: {},
      create: { ...menu, parentId: systemMenu.id, level: 2 } as SubMenuItem & { parentId: number; level: number },
    });
  }

  // ============================================
  // Phase 2.4: 创建HomeCard首页服务卡片
  // ============================================
  const homeCardData = [
    {
      title: '自学考试',
      subtitle: '自助者天助之',
      icon: 'BookOpen',
      href: '/courses?type=zikao',
      gradient: 'from-blue-500 to-blue-600',
      hoverGradient: 'from-blue-400 to-blue-500',
      shadow: 'shadow-blue-200',
      sort: 1,
      status: 'active',
    },
    {
      title: '成人高考',
      subtitle: '成就学员梦想',
      icon: 'GraduationCap',
      href: '/courses?type=chengkao',
      gradient: 'from-green-500 to-green-600',
      hoverGradient: 'from-green-400 to-green-500',
      shadow: 'shadow-green-200',
      sort: 2,
      status: 'active',
    },
    {
      title: '开放大学',
      subtitle: '构建终身学堂',
      icon: 'Globe',
      href: '/courses?type=kaifang',
      gradient: 'from-orange-500 to-orange-600',
      hoverGradient: 'from-orange-400 to-orange-500',
      shadow: 'shadow-orange-200',
      sort: 3,
      status: 'active',
    },
  ];

  // 首页卡片为 3 张结构（已移除"职业证书"），将历史"职业证书"卡片下线
  await prisma.homeCard.updateMany({
    where: { title: '职业证书' },
    data: { status: 'inactive' },
  });

  for (const card of homeCardData) {
    const existing = await prisma.homeCard.findFirst({ where: { title: card.title } });
    if (!existing) {
      await prisma.homeCard.create({ data: card });
    } else {
      await prisma.homeCard.update({ where: { id: existing.id }, data: card });
    }
  }

  // ============================================
  // Phase 3.2: 创建默认AI配置
  // ============================================
  const existingAIConfig = await prisma.aIConfig.findFirst({
    where: { name: 'ModelScope Qwen' }
  });
  if (!existingAIConfig) {
    await prisma.aIConfig.create({
      data: {
        name: 'ModelScope Qwen',
        apiEndpoint: 'https://api-inference.modelscope.cn/v1',
        apiKey: 'sk-请替换为您的API密钥',
        model: 'qwen2.5-7b-instruct',
        systemPrompt: '你是弘道经理学院的AI课程顾问，专业解答学历提升相关问题。请简洁、准确地回答用户关于自学考试、成人高考、开放大学等问题。',
        greeting: '您好，我是弘道经理学院在线客服。请简短告诉我您最关心的1-2个问题（例：学费多少、哪家院校、多久能毕业），我直接给您答案，不绕弯。',
        isActive: true,
        temperature: 0.7,
        maxTokens: 1000,
        rateLimit: 60,
        dailyQuota: 1000,
      },
    });
    console.log('📌 AI配置: 已创建默认ModelScope Qwen配置');
  }

  console.log('✅ 种子数据创建成功！');
  console.log('📌 HomeCards: 3张服务卡片（自学考试/成人高考/开放大学）');
  console.log('📌 管理员账号：admin / admin123');
  console.log('📌 角色：SuperAdmin / Editor / Viewer');
  console.log('📌 导航：9个一级菜单');
  console.log('📌 分类：7个课程分类 + 5个文章分类');
  console.log('📌 模板：4个页面模板');
  console.log('📌 后台菜单：仪表盘+6个一级直出菜单+3个分组菜单（内容管理/招生管理/系统管理）');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
