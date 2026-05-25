#!/usr/bin/env node
/**
 * 参照 https://www.xgnedu.cn/ 结构补全本项目 CMS 各模块数据
 *   - articles (学校新闻)
 *   - partners (合作院校 logo 卡)
 *   - campus (校区 + 轮播图)
 *   - hotMajor (热门专业)
 *   - gallery (证书/校园风采)
 *   - serviceGuide (服务指南 6 宫格)
 *
 * 幂等：按 title / name / slug 去重 upsert。
 */
import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

const adapter = new PrismaLibSql({ url: "file:./prisma/dev.db" });
const prisma = new PrismaClient({ adapter });

async function ensureCategory(slug, name, type) {
  const exist = await prisma.category.findFirst({ where: { slug } });
  if (exist) return exist;
  return prisma.category.create({
    data: { slug, name, type, sort: 0, isNav: false, isVisible: true },
  });
}

async function main() {
  // ========== 1. serviceGuide 6 宫格 ==========
  const serviceGuides = [
    { title: "报名流程", icon: "FileText", link: "/about#process", sort: 1 },
    { title: "常见问题", icon: "HelpCircle", link: "/about#faq", sort: 2 },
    { title: "报名费用", icon: "DollarSign", link: "/apply?source=guide", sort: 3 },
    { title: "考试时间", icon: "Calendar", link: "/apply?source=guide", sort: 4 },
    { title: "联系我们", icon: "Phone", link: "/about#contact", sort: 5 },
    { title: "在线咨询", icon: "MessageSquare", link: "/apply?source=guide", sort: 6 },
  ];
  for (const g of serviceGuides) {
    const e = await prisma.serviceGuide.findFirst({ where: { title: g.title } });
    if (e) await prisma.serviceGuide.update({ where: { id: e.id }, data: { ...g, status: "active" } });
    else await prisma.serviceGuide.create({ data: { ...g, status: "active" } });
  }

  // ========== 2. partners 合作院校 ==========
  const partners = [
    { name: "四川大学", logo: "/images/partners/scu.png", website: "https://www.scu.edu.cn", sort: 1 },
    { name: "西华大学", logo: "/images/partners/xhu.png", website: "https://www.xhu.edu.cn", sort: 2 },
    { name: "成都理工大学", logo: "/images/partners/cdut.png", website: "https://www.cdut.edu.cn", sort: 3 },
    { name: "电子科技大学", logo: "/images/partners/uestc.png", website: "https://www.uestc.edu.cn", sort: 4 },
    { name: "西南财经大学", logo: "/images/partners/swufe.png", website: "https://www.swufe.edu.cn", sort: 5 },
    { name: "四川师范大学", logo: "/images/partners/sicnu.png", website: "https://www.sicnu.edu.cn", sort: 6 },
    { name: "四川农业大学", logo: "/images/partners/sicau.png", website: "https://www.sicau.edu.cn", sort: 7 },
    { name: "西南交通大学", logo: "/images/partners/swjtu.png", website: "https://www.swjtu.edu.cn", sort: 8 },
  ];
  for (const p of partners) {
    const e = await prisma.partner.findFirst({ where: { name: p.name } });
    if (e) await prisma.partner.update({ where: { id: e.id }, data: { ...p, status: "active" } });
    else await prisma.partner.create({ data: { ...p, status: "active" } });
  }

  // ========== 3. campus 校区 ==========
  const campuses = [
    {
      name: "大石西路总校",
      address: "成都市青羊区大石西路12号",
      sort: 1,
      images: ["/images/campus/campus-main-1.jpg", "/images/campus/campus-main-2.jpg"],
    },
    {
      name: "双店路分校",
      address: "成都市成华区双店路66号",
      sort: 2,
      images: ["/images/campus/campus-branch-1.jpg"],
    },
  ];
  for (const c of campuses) {
    const { images, ...campusData } = c;
    const e = await prisma.campus.findFirst({ where: { name: c.name } });
    const campus = e
      ? await prisma.campus.update({ where: { id: e.id }, data: { ...campusData, status: "active" } })
      : await prisma.campus.create({ data: { ...campusData, status: "active" } });
    // 重置校区图片
    await prisma.campusImage.deleteMany({ where: { campusId: campus.id } });
    for (let i = 0; i < images.length; i++) {
      await prisma.campusImage.create({
        data: { campusId: campus.id, image: images[i], caption: c.name, sort: i },
      });
    }
  }

  // ========== 4. hotMajor 热门专业 ==========
  const hotMajors = [
    { title: "汉语言文学", subtitle: "自考·本科", description: "统考仅 4 门，文科首选，适合教师、公务员。", duration: "2年", iconType: "text", iconColor: "from-blue-500 to-blue-600", link: "/apply?source=guide&major=hywx", sort: 1 },
    { title: "学前教育",   subtitle: "自考·本科", description: "市场需求大，考教师资格证优势明显。",       duration: "2年", iconType: "text", iconColor: "from-emerald-500 to-emerald-600", link: "/apply?source=guide&major=xqjy", sort: 2 },
    { title: "会计学",     subtitle: "成考·本科", description: "财务/审计方向，就业面广。",               duration: "2.5年", iconType: "text", iconColor: "from-amber-500 to-amber-600", link: "/apply?source=guide&major=kj", sort: 3 },
    { title: "工商管理",   subtitle: "自考·本科", description: "管理学经典专业，晋升加薪利器。",           duration: "2年", iconType: "text", iconColor: "from-red-500 to-red-600", link: "/apply?source=guide&major=gsgl", sort: 4 },
    { title: "计算机科学与技术", subtitle: "成考·本科", description: "互联网热门专业，就业薪资高。",        duration: "2.5年", iconType: "text", iconColor: "from-cyan-500 to-cyan-600", link: "/apply?source=guide&major=jsjkx", sort: 5 },
    { title: "法学",       subtitle: "自考·本科", description: "司考/考公首选，逻辑思维养成。",             duration: "2年", iconType: "text", iconColor: "from-purple-500 to-purple-600", link: "/apply?source=guide&major=fx", sort: 6 },
    { title: "心理学",     subtitle: "自考·本科", description: "新增专业，统考仅 7 门，免考英语。",         duration: "2年", iconType: "text", iconColor: "from-orange-500 to-orange-600", link: "/apply?source=guide&major=xlx", sort: 7 },
    { title: "金融学",     subtitle: "自考·本科", description: "财经方向，银行/证券等行业认可。",           duration: "2年", iconType: "text", iconColor: "from-green-500 to-green-600", link: "/apply?source=guide&major=jrx", sort: 8 },
  ];
  for (const m of hotMajors) {
    const e = await prisma.hotMajor.findFirst({ where: { title: m.title } });
    if (e) await prisma.hotMajor.update({ where: { id: e.id }, data: { ...m, status: "active" } });
    else await prisma.hotMajor.create({ data: { ...m, status: "active" } });
  }

  // ========== 5. gallery 证书/校园风采 ==========
  const galleryItems = [
    { title: "四川师范大学自考毕业证",     image: "/images/gallery/cert-1.jpg", category: "certificate", sort: 1 },
    { title: "西华师范大学自考学位证",     image: "/images/gallery/cert-2.jpg", category: "certificate", sort: 2 },
    { title: "电子科技大学自考毕业证",     image: "/images/gallery/cert-3.jpg", category: "certificate", sort: 3 },
    { title: "四川农业大学自考毕业证",     image: "/images/gallery/cert-4.jpg", category: "certificate", sort: 4 },
    { title: "西南交通大学自考学位证",     image: "/images/gallery/cert-5.jpg", category: "certificate", sort: 5 },
    { title: "成都大学自考毕业证",        image: "/images/gallery/cert-6.jpg", category: "certificate", sort: 6 },
    { title: "教师资格证",               image: "/images/gallery/cert-7.jpg", category: "certificate", sort: 7 },
    { title: "心理咨询师证",             image: "/images/gallery/cert-8.jpg", category: "certificate", sort: 8 },
  ];
  for (const g of galleryItems) {
    const e = await prisma.gallery.findFirst({ where: { title: g.title } });
    if (e) await prisma.gallery.update({ where: { id: e.id }, data: { status: "active" } });
    else await prisma.gallery.create({ data: { ...g, status: "active" } });
  }

  // ========== 6. articles 新闻资讯（xgnedu 风格） ==========
  const catPolicy = await ensureCategory("policy", "政策解读", "article");
  const catExam = await ensureCategory("exam", "考试通知", "article");
  const catGuide = await ensureCategory("guide", "备考指南", "article");
  const catQa = await ensureCategory("qa", "自考问答", "article");

  const articles = [
    { title: "四川小自考新增心理学本科专业！统考仅 7 门，西华师大 / 川师官方助学点可报", slug: "xinlixue-new-major", categoryId: catPolicy.id, summary: "2026 年四川小自考新增心理学本科专业，统考仅 7 门，可免考英语。", isTop: true },
    { title: "西华师范大学自考正规助学点 —— 弘道教育", slug: "xhsf-assistance-point", categoryId: catPolicy.id, summary: "弘道教育作为西华师范大学官方公示的自考助学点，提供统考+校考一站式服务。" },
    { title: "四川师范大学自考官方助学点公告", slug: "scnu-assistance-point", categoryId: catPolicy.id, summary: "四川师范大学确认弘道教育为官方助学点，提供完整的小自考助学服务。" },
    { title: "电子科技大学自考新增工业工程专业，工科性价比天花板", slug: "uestc-industrial-eng", categoryId: catPolicy.id, summary: "工业工程专业统考仅 5 门，适合男生报考，薪资可观。" },
    { title: "四川师范大学 2026 年上半年学位英语考试报名开启", slug: "scnu-degree-english-2026", categoryId: catExam.id, summary: "即日起启动 2026 上半年学位英语注册报考，报名截止 2026-05-10。" },
    { title: "四川农业大学 254 批次自考第二年学费催收通知", slug: "sicau-fee-notice-254", categoryId: catExam.id, summary: "254 批次及之前批次学员请于 2026-05-01 前完成第二年学费缴纳。" },
    { title: "西南科技大学 254 批次自考第二年学费催收通知", slug: "swust-fee-notice-254", categoryId: catExam.id, summary: "西南科技大学 254 批次学员学费催收提醒，请按期缴纳。" },
    { title: "四川大学自考 254 批次第二年学费正式通知", slug: "scu-fee-notice-254", categoryId: catExam.id, summary: "四川大学自考第二年学费通知已发布，请学员按时查收。" },
    { title: "四川省 2026 年上半年中小学教师资格考试成绩即将发布", slug: "teacher-cert-2026-1", categoryId: catExam.id, summary: "教资笔试成绩预计 2026-04-30 发布，合格线预测。" },
    { title: "四川小自考本科可免考英语申请学位的院校有哪些？", slug: "degree-english-exempt", categoryId: catGuide.id, summary: "详细列出四川小自考可免考英语即可申请学位的高校名单与条件。" },
    { title: "别再误解成人学历了：证有用，没用的从不是它", slug: "adult-education-usefulness", categoryId: catGuide.id, summary: "从职业晋升、考证、落户等角度解析成人学历的真实价值。" },
    { title: "四川有哪些正规自考网站和机构？认准官方助学点", slug: "official-assistance-list", categoryId: catGuide.id, summary: "手把手教你识别官方助学点，避开报名陷阱。" },
    { title: "成人高考没学位证可以考研吗？", slug: "adult-postgrad-without-degree", categoryId: catGuide.id, summary: "成考本科无学位证亦可以同等学力报考研究生，条件详解。" },
    { title: "自考大专没有高中档案政审能过吗？", slug: "zikao-diploma-background-check", categoryId: catGuide.id, summary: "自考报名对高中档案的要求说明，以及政审实际流程。" },
    // === 自考问答 (qa) ===
    { title: "小自考和大自考有什么区别？哪个更适合在职人员？", slug: "zikao-vs-xiaozikao", categoryId: catQa.id, summary: "大自考全部统考，小自考统考+校考结合，在职人员选小自考更高效。", isTop: true },
    { title: "自考学历能考公务员吗？会不会被歧视？", slug: "zikao-gongwuyuan", categoryId: catQa.id, summary: "自考学历国家承认、学信网可查，符合报考条件的岗位均可报考。" },
    { title: "自考没考完可以转专业或转省份吗？", slug: "zikao-transfer", categoryId: catQa.id, summary: "已通过的公共课成绩可跨省互认，专业课按转入省份要求执行。" },
    { title: "自考单科成绩有效期是多久？会过期吗？", slug: "zikao-score-validity", categoryId: catQa.id, summary: "四川省自考成绩长期有效，无需担心过期问题，可安心备考。" },
    { title: "自考毕业论文答辩难不难？通过率多少？", slug: "zikao-thesis-defense", categoryId: catQa.id, summary: "弘道教育提供论文指导服务，往年通过率超过95%。" },
  ];

  // 文章需要 author，找 admin 用户
  const admin = await prisma.user.findFirst({ where: { username: "admin" } });
  if (!admin) throw new Error("未找到 admin 用户，请先跑 seed");
  for (const a of articles) {
    const e = await prisma.article.findFirst({ where: { slug: a.slug } });
    const content = `<p>${a.summary}</p><p>更多详情请拨打 132-1945-5550 咨询或到校面谈。</p>`;
    const { summary, isTop, ...rest } = a;
    const data = {
      ...rest,
      content,
      excerpt: summary,
      status: "published",
      publishedAt: new Date(),
      viewCount: Math.floor(Math.random() * 500) + 50,
      isTop: !!isTop,
      authorId: admin.id,
    };
    if (e) await prisma.article.update({ where: { id: e.id }, data });
    else await prisma.article.create({ data });
  }

  // ========== 汇总 ==========
  const counts = {
    serviceGuide: await prisma.serviceGuide.count(),
    partner: await prisma.partner.count(),
    campus: await prisma.campus.count(),
    hotMajor: await prisma.hotMajor.count(),
    gallery: await prisma.gallery.count(),
    article: await prisma.article.count(),
    aIConfig: await prisma.aIConfig.count(),
    knowledge: await prisma.knowledge.count(),
    chatScene: await prisma.chatScene.count(),
  };
  console.log("✅ 内容填充完成，各模块计数：");
  for (const [k, v] of Object.entries(counts)) {
    console.log(`  ${k.padEnd(14)} = ${v}`);
  }
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
