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
      email: 'admin@xgnedu.cn',
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
    { parentId: null, level: 1, name: '学习中心', slug: 'learning', link: 'https://xgn.ynzk.net', linkType: 'external', target: '_blank', sort: 7 },
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
        content: '<p>弘道经理学院2026年春季专升本课程招生工作正式启动，欢迎广大专科毕业生咨询报名。</p><h3>招生专业</h3><ul><li>自考专升本：行政管理、汉语言文学、工商管理、会计</li><li>成考专升本：工商管理、计算机科学、学前教育、护理学</li></ul><h3>报名方式</h3><p>可通过学院官网在线报名，或拨打咨询热线：400-001-5729</p><p>学院地址：成都市青羊区大石西路12号</p>',
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
    { key: 'site.title', value: '弘道教育', type: 'string', group: 'basic' },
    { key: 'site.subtitle', value: '专注学历提升教育', type: 'string', group: 'basic' },
    { key: 'site.logo', value: '/images/logo.png', type: 'string', group: 'basic' },
    // 学校名称配置（用于全站统一显示）
    { key: 'schoolFullName', value: '四川弘道经理学院', type: 'string', group: 'school' },
    { key: 'schoolShortName', value: '弘道教育', type: 'string', group: 'school' },
    { key: 'schoolSlogan', value: '弘道致远，学以经世', type: 'string', group: 'school' },
    // 公司简介
    { key: 'companyIntro', value: '四川弘道经理学院（弘道教育）成立于2004年2月，是一家专注于学历提升、职业证书考试培训的成人教育机构。学校位于成都市青羊区大石西路12号，注册地址为成都市成华区双店路66号，总面积超过2000平米，学校教学及办公设施设备齐全，设有26间标准化教室和容纳上百人的多功能教室，共计300台教学及考试专用计算机。\n\n我校与时俱进、创新务实、团结奋进、诚信办学，经过十五年的教育积淀，形成了学历继续教育为主，兼顾非学历培训的面向全社会的办学特色。我校坚持致力于适应国家教育改革及社会发展需求，更好地服务继续教育事业，传播先进的继续教育理念、科学的继续教育教学、助学、培训方法以及前沿的继续教育思想。\n\n我校采用现场助学与在线学习相结合的自学考试助学方式，在各主考、主办院校的支持下，已经培养的成千上万的各类自学考试本专科毕业生。', type: 'text', group: 'school' },
    { key: 'yearsOfEstablishment', value: '26', type: 'string', group: 'school' },
    { key: 'totalGraduates', value: '11万', type: 'string', group: 'school' },
    // 联系方式
    { key: 'contact.phone1', value: '13219455550', type: 'string', group: 'contact' },
    { key: 'contact.phone2', value: '028-61675329', type: 'string', group: 'contact' },
    { key: 'contact.email', value: 'info@xgnedu.cn', type: 'string', group: 'contact' },
    { key: 'contact.address', value: '成都市青羊区大石西路12号', type: 'string', group: 'contact' },
    { key: 'contact.worktime', value: '周一至周日 9:00-18:00', type: 'string', group: 'contact' },
    // SEO设置
    { key: 'seo.title', value: '专升本_成人高考_自考_网络教育', type: 'string', group: 'seo' },
    { key: 'seo.keywords', value: '专升本,成人高考,自考,网络教育,学历提升', type: 'string', group: 'seo' },
    { key: 'seo.description', value: '弘道教育专注四川学历提升教育，提供自考、成考、开放大学多种学历提升方案', type: 'string', group: 'seo' },
    // 社交链接
    { key: 'social.wechat', value: 'xgnedu', type: 'string', group: 'social' },
    { key: 'social.weibo', value: 'https://weibo.com/xgnedu', type: 'string', group: 'social' },
    { key: 'social.douyin', value: 'xgnedu', type: 'string', group: 'social' },
    // ICP备案
    { key: 'site.icp', value: '蜀ICP备XXXXXXXX号', type: 'string', group: 'basic' },
    { key: 'site.copyright', value: '© 2026 弘道教育 版权所有', type: 'string', group: 'basic' },
    // FourCards 区块级配置
    { key: 'fourCards.showSection', value: 'true', type: 'boolean', group: 'fourCards' },
    { key: 'fourCards.bgColor', value: '#f8fafc', type: 'string', group: 'fourCards' },
    { key: 'fourCards.bgImage', value: '', type: 'string', group: 'fourCards' },
    { key: 'fourCards.containerAlign', value: 'center', type: 'string', group: 'fourCards' },
    // Banner 显隐控制配置
    { key: 'bannerShowContent', value: 'true', type: 'boolean', group: 'banner' },
    { key: 'bannerShowTitle', value: 'true', type: 'boolean', group: 'banner' },
    { key: 'bannerShowSubtitle', value: 'true', type: 'boolean', group: 'banner' },
    { key: 'bannerShowExtraBtn', value: 'false', type: 'boolean', group: 'banner' },
    { key: 'bannerExtraBtnText', value: '了解更多', type: 'string', group: 'banner' },
    { key: 'bannerExtraBtnLink', value: '/courses', type: 'string', group: 'banner' },
    { key: 'bannerOverlayColor', value: '#000000', type: 'string', group: 'banner' },
    { key: 'bannerOverlayOpacity', value: '40', type: 'string', group: 'banner' },
    { key: 'bannerTextAlign', value: 'center', type: 'string', group: 'banner' },
    { key: 'bannerTextVerticalAlign', value: 'middle', type: 'string', group: 'banner' },
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
    create: { code: 'content', label: '内容管理', icon: 'FolderOpen', level: 1, sort: 8 },
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

  // AI客服分组（折叠）
  const aiSmartMenu = await prisma.managerMenu.upsert({
    where: { code: 'ai-smart' },
    update: { label: 'AI客服', icon: 'Bot', level: 1, sort: 99 },
    create: { code: 'ai-smart', label: 'AI客服', icon: 'Bot', level: 1, sort: 99 },
  });

  const aiSmartSubMenus = [
    { code: 'model-configs', label: '模型配置', icon: 'Bot', path: '/manager/model-configs', sort: 1, permission: 'setting:list' },
    { code: 'knowledge', label: '知识库', icon: 'BookOpen', path: '/manager/knowledge', sort: 2, permission: 'setting:list' },
    { code: 'chat-scenes', label: '对话场景', icon: 'MessageSquare', path: '/manager/chat-scenes', sort: 3, permission: 'setting:list' },
  ];

  for (const menu of aiSmartSubMenus) {
    await prisma.managerMenu.upsert({
      where: { code: menu.code },
      update: {},
      create: { ...menu, parentId: aiSmartMenu.id, level: 2 } as SubMenuItem & { parentId: number; level: number },
    });
  }

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
    { code: 'campus', label: '学院风采', icon: 'MapPin', path: '/manager/campus', sort: 4, permission: 'campus:list' },
    { code: 'service-guides', label: '服务指南', icon: 'HelpCircle', path: '/manager/service-guides', sort: 5, permission: 'service:list' },
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
      showIcon: true,
      showTitle: true,
      showSubtitle: true,
      showArrow: true,
      showDecoration: true,
      textAlign: 'left',
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
      showIcon: true,
      showTitle: true,
      showSubtitle: true,
      showArrow: true,
      showDecoration: true,
      textAlign: 'left',
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
      showIcon: true,
      showTitle: true,
      showSubtitle: true,
      showArrow: true,
      showDecoration: true,
      textAlign: 'left',
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
  // Phase 2.5: 创建AI客服系统基线数据
  // ============================================

  // AIConfig: ModelScope Qwen3.5 配置
  const existingAIConfig = await prisma.aIConfig.findFirst({
    where: { name: 'ModelScope Qwen3.5' }
  });
  if (!existingAIConfig) {
    await prisma.aIConfig.create({
      data: {
        name: 'ModelScope Qwen3.5',
        apiEndpoint: 'https://api-inference.modelscope.cn/v1',
        apiKey: 'ms-c38ad95d-0b4b-4863-bb08-7d01ff1884f5',
        model: 'Qwen/Qwen3.5-35B-A3B',
        systemPrompt: `你是四川弘道经理学院（弘道教育）的AI客服，性格专业、耐心、热情。与访客对话时：
1. 优先引导用户说出【现有学历 → 目标学历 → 兴趣专业 → 所在地区】四个关键信息；
2. 根据用户画像，推荐最适合的学历提升方案（自考 / 成考 / 开放大学）；
3. 涉及学费、报名时间、考试科目时，必须引用知识库的官方数据，避免编造；
4. 在用户意向清晰后，引导留电话 132-1945-5550 或加微信 xgnedu，由人工顾问跟进；
5. 回答使用清晰段落和要点，避免大段堆砌。`,
        userPrompt: null,
        greeting: '您好！欢迎来到弘道教育。我是您的AI客服，可以为您介绍自学考试、成人高考、开放大学三种学历提升方案。请问您目前的学历是？想要提升到什么层次呢？',
        isActive: true,
        temperature: 0.7,
        maxTokens: 2000,
        rateLimit: 60,
        dailyQuota: 1000,
      }
    });
    console.log('🤖 AIConfig: ModelScope Qwen3.5 已创建');
  } else {
    // 确保激活状态
    await prisma.aIConfig.update({
      where: { id: existingAIConfig.id },
      data: { isActive: true }
    });
    console.log('🤖 AIConfig: ModelScope Qwen3.5 已更新为激活状态');
  }

  // Knowledge: 知识库基线数据
  const knowledgeData = [
    {
      title: '弘道教育简介',
      content: '四川弘道经理学院成立于1999年，是四川省教育厅批准设立的成人高等教育机构。学院专注于自学考试、成人高考、开放大学三大学历提升领域，累计服务学员超过10万人。学院与西南财经大学、四川大学等8所知名高校建立了合作关系，是官方授权的助学点。',
      tags: 'brand,partners,enrollment',
      source: 'local' as const,
      priority: 100,
      status: 'active' as const,
    },
    {
      title: '自学考试介绍',
      content: '自学考试（自考）是我国高等教育的重要组成部分，学习方式灵活，没有入学门槛。考生通过全部科目考试后即可申请毕业，学历证书国家承认，学信网可查。弘道教育提供自考全程辅导服务，包括教材、网课、模拟题库和考前冲刺。热门专业包括：工商管理、会计学、汉语言文学、法学等。',
      tags: 'zikao,enrollment,process',
      source: 'local' as const,
      priority: 90,
      status: 'active' as const,
    },
    {
      title: '成人高考介绍',
      content: '成人高考是成人高等教育入学考试，每年10月举行全国统一考试。考试科目根据层次不同：高起专考语文、数学、英语；专升本考政治、英语+专业课。录取分数线较低，25岁以上考生可加20分。学习形式有函授、业余、脱产三种，学制2.5-3年。',
      tags: 'chengkao,enrollment,exam,process',
      source: 'local' as const,
      priority: 90,
      status: 'active' as const,
    },
    {
      title: '开放大学介绍',
      content: '国家开放大学（原中央广播电视大学）是教育部直属高校，免试入学，春秋两季招生。采用线上线下结合的教学模式，适合工作繁忙的在职人员。学历国家承认，可用于考研、考公务员、评职称等。',
      tags: 'kaifang,enrollment,process',
      source: 'local' as const,
      priority: 90,
      status: 'active' as const,
    },
    {
      title: '2026年学费标准',
      content: '自学考试：全程辅导费6800-8800元（含教材、网课、题库）；成人高考：学费按学年缴纳，文科2200元/年，理科2400元/年，学制2.5年；开放大学：学费按学分收取，约80-100元/学分，专科总费用约7000-9000元，本科约8000-10000元。以上费用均含教材费，不含考试报名费。',
      tags: 'fee,zikao,chengkao,kaifang',
      source: 'local' as const,
      priority: 95,
      status: 'active' as const,
    },
    {
      title: '报名流程',
      content: '第一步：在线咨询或电话咨询，了解适合自己的学历提升方式；第二步：提交报名资料（身份证、毕业证复印件、2寸蓝底照片）；第三步：缴纳报名费（自考6800元起，成考200元预报名）；第四步：签订服务协议，领取教材和网课账号；第五步：班主任一对一跟进学习进度。整个流程约1-3个工作日完成。',
      tags: 'enrollment,process,zikao,chengkao,kaifang',
      source: 'local' as const,
      priority: 85,
      status: 'active' as const,
    },
    {
      title: '合作院校列表',
      content: '弘道教育与以下高校建立了官方合作关系：西南财经大学、四川大学、四川师范大学、成都理工大学、西南交通大学、西华大学、成都信息工程大学、四川农业大学。所有合作均为高校官方授权的助学点或教学点，学历证书由高校颁发，学信网终身可查。',
      tags: 'partners,brand,zikao,chengkao',
      source: 'local' as const,
      priority: 80,
      status: 'active' as const,
    },
    {
      title: '联系方式',
      content: '咨询热线：132-1945-5550（杨校长，微信同号）；在线咨询：官网右下角悬浮客服，或访问 /apply 页面；校区地址：成都市青羊区一环路西一段144号；官方微信公众号：xgnedu（弘道教育）。工作时间：周一至周日 9:00-21:00。',
      tags: 'contact,brand',
      source: 'local' as const,
      priority: 80,
      status: 'active' as const,
    },
    {
      title: '2026年报名优惠政策',
      content: '优惠政策一：两人同行各减500元；优惠政策二：老学员推荐新学员，双方各得300元学费抵扣；优惠政策三：应届毕业生凭毕业证再减300元；优惠政策四：一次性缴清全款享9折优惠。以上优惠可叠加使用，最高可省1500元。',
      tags: 'discount,fee,enrollment',
      source: 'local' as const,
      priority: 75,
      status: 'active' as const,
    },
  ];

  for (const k of knowledgeData) {
    const existing = await prisma.knowledge.findFirst({ where: { title: k.title } });
    if (!existing) {
      await prisma.knowledge.create({ data: k });
      console.log(`📚 Knowledge: ${k.title} 已创建`);
    } else {
      await prisma.knowledge.update({ where: { id: existing.id }, data: k });
      console.log(`📚 Knowledge: ${k.title} 已更新`);
    }
  }

  // ChatScene: 对话场景基线数据
  const chatSceneData = [
    {
      code: 'apply',
      name: '在线报名全面咨询',
      description: '一级导航「在线报名」入口，面向有明确升学意向的访客，提供完整咨询',
      greeting: '您好！欢迎来到弘道教育在线报名中心。我是您的AI客服，可以为您介绍自学考试、成人高考、开放大学三种学历提升方案。请问您目前的学历是？想要提升到什么层次呢？',
      systemPrompt: `你是四川弘道经理学院（弘道教育）的AI客服，性格专业、耐心、热情。与访客对话时：
1. 优先引导用户说出【现有学历 → 目标学历 → 兴趣专业 → 所在地区】四个关键信息；
2. 根据用户画像，推荐最适合的学历提升方案（自考 / 成考 / 开放大学）；
3. 涉及学费、报名时间、考试科目时，必须引用知识库的官方数据，避免编造；
4. 在用户意向清晰后，引导留电话 132-1945-5550 或加微信 xgnedu，由人工顾问跟进；
5. 回答使用清晰段落和要点，避免大段堆砌。`,
      knowledgeTags: 'zikao,chengkao,kaifang,fee,enrollment,brand,partners',
      starters: JSON.stringify([
        '自考和成考有什么区别？',
        '2026年秋季报名还来得及吗？',
        '学费大概多少？',
        '有哪些合作院校？',
      ]),
      pageTitle: '在线报名',
      pageSubtitle: 'AI客服为您定制学历提升方案，3分钟摸清您的最优路径',
      headerTip: 'AI客服在线为您服务',
      sidebarTitle: '报名流程',
      processSteps: JSON.stringify([
        { title: '在线咨询', desc: 'AI快速评估您的情况' },
        { title: '顾问跟进', desc: '1对1电话深入沟通' },
        { title: '方案确认', desc: '院校/专业/学费/周期' },
        { title: '正式报名', desc: '签约缴费·启动学习' },
      ]),
      promiseList: JSON.stringify([
        '24小时内顾问响应',
        '院校官方助学点直连',
        '学费透明无隐形收费',
        '学信网终身可查',
      ]),
      contactCardTitle: '联系课程顾问',
      useKnowledgeBase: true,
      status: 'active' as const,
      sort: 10,
    },
    {
      code: 'float',
      name: '悬浮客服·商务转化',
      description: '右下角悬浮「在线客服」入口，访客还在页面浏览，话术要简短直接、快速转化',
      greeting: '您好，我是弘道教育的AI客服。请简短告诉我您最关心的1-2个问题（例：学费多少、哪家院校、多久能毕业），我直接给您答案，不绕弯。',
      systemPrompt: `你是四川弘道经理学院（弘道教育）的AI客服，性格利落、效率优先。对话原则：
1. 回答尽量简短，1-3句话解决问题；
2. 不主动长篇科普，除非用户明确要求详细；
3. 每轮回答后抛出「需要顾问给您详细方案吗？留个电话2分钟内回电」的快速转化话术；
4. 涉及学费、考试时间等敏感信息，严格以知识库为准；
5. 对比明显偏概念性的问题（如「学历有没有用」）给出快问快答，然后引导到具体方案。`,
      knowledgeTags: 'fee,enrollment,brand,partners',
      starters: JSON.stringify([
        '学费多少？',
        '多久能毕业？',
        '靠谱吗？',
        '现在能报名吗？',
      ]),
      pageTitle: '在线客服',
      pageSubtitle: '专业顾问2分钟内响应，短平快解决您的学历提升疑问',
      headerTip: '短平快回答·留电话由顾问主动回访',
      sidebarTitle: '咨询热点',
      processSteps: JSON.stringify([
        { title: '告诉我您的起点', desc: '高中/大专/本科' },
        { title: '想要的终点', desc: '学历/职称/证书' },
        { title: 'AI智能匹配', desc: '基于8所合作院校资源' },
        { title: '电话深度沟通', desc: '留联系方式由顾问主动回访' },
      ]),
      promiseList: JSON.stringify([
        '2分钟内响应',
        '专属顾问一对一',
        '信息严格保密',
        '不接受强制推销',
      ]),
      contactCardTitle: '马上联系顾问',
      useKnowledgeBase: true,
      status: 'active' as const,
      sort: 20,
    },
    {
      code: 'guide',
      name: '服务指南·政策解答',
      description: '从服务指南6宫格进入，访客想搞清楚流程/政策/费用细节',
      greeting: '您好，我是弘道教育的AI客服。请直接告诉我您想了解的项目（例如：报考条件、报名费用、考试时间、免考英语、加分政策等），我会依据四川省教育厅最新政策为您解读。',
      systemPrompt: `你是四川弘道经理学院（弘道教育）的AI客服，性格权威、严谨、条理分明。对话原则：
1. 回答采用「政策依据+具体办理流程+温馨提示」三段式结构；
2. 涉及时间节点（报名截止、考试日期）必须以知识库为准；
3. 涉及的政策条款如无官方依据，明确提示「该细则以当地考办最终公告为准」；
4. 尾声温和引导：如需一对一办理协助，可致电132-1945-5550；
5. 回答用列表或编号清晰结构化。`,
      knowledgeTags: 'zikao,chengkao,kaifang,fee,enrollment,process',
      starters: JSON.stringify([
        '自考报考条件？',
        '学费怎么交？',
        '2026年考试时间？',
        '可以免考英语吗？',
      ]),
      pageTitle: '政策解答',
      pageSubtitle: '关于报名条件、学费、考试时间、免考政策的权威解读',
      headerTip: '政策类问题请直接提问，AI客服依据官方政策作答',
      sidebarTitle: '办理流程',
      processSteps: JSON.stringify([
        { title: '查询政策', desc: 'AI检索最新学历政策' },
        { title: '确认资格', desc: '高中学历/18周岁即可' },
        { title: '选择方案', desc: '自考·成考·开放大学' },
        { title: '办理手续', desc: '注册·缴费·开学' },
      ]),
      promiseList: JSON.stringify([
        '政策解读以教育部官方为准',
        '学信网终身可查',
        '国家承认学历',
        '院校官方助学点合作',
      ]),
      contactCardTitle: '服务支持',
      useKnowledgeBase: true,
      status: 'active' as const,
      sort: 30,
    },
  ];

  for (const s of chatSceneData) {
    const existing = await prisma.chatScene.findUnique({ where: { code: s.code } });
    if (!existing) {
      await prisma.chatScene.create({ data: s });
      console.log(`💬 ChatScene: ${s.code} 已创建`);
    } else {
      await prisma.chatScene.update({ where: { id: existing.id }, data: s });
      console.log(`💬 ChatScene: ${s.code} 已更新`);
    }
  }

  // 隐藏旧版 ai-config 菜单（如果存在）
  try {
    const oldMenu = await prisma.managerMenu.findUnique({ where: { code: 'ai-config' } });
    if (oldMenu) {
      await prisma.managerMenu.update({
        where: { code: 'ai-config' },
        data: { isVisible: false }
      });
      console.log('🔒 旧版 ai-config 菜单已隐藏');
    }
  } catch (e) {
    // 忽略错误
  }

  console.log('✅ 种子数据创建成功！');
  console.log('📌 HomeCards: 3张服务卡片（自学考试/成人高考/开放大学）');
  console.log('📌 管理员账号：admin / admin123');
  console.log('📌 角色：SuperAdmin / Editor / Viewer');
  console.log('📌 导航：9个一级菜单');
  console.log('📌 分类：7个课程分类 + 5个文章分类');
  console.log('📌 模板：4个页面模板');
  console.log('📌 后台菜单：仪表盘+6个一级直出菜单+3个分组菜单（内容管理/招生管理/系统管理）');
  console.log('🤖 AI客服系统：1个模型配置 + 9条知识库 + 3个对话场景');
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
