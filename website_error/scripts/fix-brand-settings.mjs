#!/usr/bin/env node
/**
 * A1：清洗 Setting 表，恢复弘道教育品牌信息
 *   - schoolShortName / schoolFullName / companyIntro / bannerTitle / bannerSubtitle / about.*
 * 幂等：upsert。旧的 xgnedu 品牌文字将被覆盖。
 */
import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

const adapter = new PrismaLibSql({ url: "file:./prisma/dev.db" });
const prisma = new PrismaClient({ adapter });

const KV = {
  // 站点基础
  "site.title": "弘道教育",
  "site.subtitle": "专注学历提升教育",
  siteName: "弘道教育",
  siteDescription: "专注学历提升教育，助力人生进阶",

  // 学校品牌
  schoolShortName: "弘道教育",
  schoolFullName: "四川弘道经理学院",
  schoolSlogan: "弘道致远，学以经世",
  companySlogan: "弘道教育，成就每一位学员的进阶梦想",
  welcomeText: "弘道教育 欢迎您！",
  footerSlogan: "专注学历提升教育",
  footerDescription: "弘道教育致力于为社会人士提供优质的学历提升教育服务，助力学历提升、成就美好未来。",

  // 学校简介（完整版 - 四川弘道经理学院官方话术）
  companyIntro:
    "四川弘道经理学院（弘道教育）是经四川省教育主管部门依法批准成立的成人教育培训机构，专注服务于在职人员、社会青年的学历提升需求。学院立足成都，辐射全川，坚持以「弘道致远，学以经世」为办学理念，与四川大学、西华大学、成都理工大学、电子科技大学、西南财经大学、四川师范大学、四川农业大学、西南交通大学等 8 所以上省内知名本科院校建立长期校外学习中心合作。\n\n学院开设自学考试、成人高考、开放大学三大学历提升通道，专业覆盖文学、教育、管理、经济、工科、法学、医学等主流方向。累计服务学员超过 11 万人次，学历申请通过率长期稳定在 95% 以上，在四川学历教育领域形成了稳定的口碑与品牌影响力。",

  yearsOfEstablishment: "26",
  totalGraduates: "11万",

  // 联系方式
  contactPhone: "132-1945-5550",
  contactPhone1: "132-1945-5550",
  contactPhone2: "028-6167-5329",
  contactEmail: "service@hongdaoedu.com",
  address: "成都市青羊区大石西路12号",
  "contact.phone1": "132-1945-5550",
  "contact.phone2": "028-6167-5329",
  "contact.email": "service@hongdaoedu.com",
  "contact.address": "成都市青羊区大石西路12号",
  "contact.worktime": "周一至周日 9:00-18:00",

  // Banner / Hero
  bannerTitle: "弘道教育 · 专升本名校直通",
  bannerSubtitle: "自考·成考·开放大学，助力学历提升",
  bannerBtnText: "立即咨询",
  bannerBtnLink: "/apply",

  // SEO
  seoTitle: "弘道教育 - 四川学历提升 自考·成考·开放大学",
  "seo.title": "弘道教育 - 四川学历提升 自考·成考·开放大学",
  seoKeywords: "自考,成考,开放大学,学历提升,四川专升本,弘道教育",
  "seo.keywords": "自考,成考,开放大学,学历提升,四川专升本,弘道教育",
  seoDescription:
    "弘道教育专注四川学历提升教育，提供自考、成考、开放大学多种学历提升方案，合作四川大学、西华大学等 8 所以上院校。",
  "seo.description":
    "弘道教育专注四川学历提升教育，提供自考、成考、开放大学多种学历提升方案，合作四川大学、西华大学等 8 所以上院校。",

  // 顶部通知
  topNoticeText: "2026 年秋季自考 / 成考报名进行中，欢迎咨询",
  topNoticePhone: "132-1945-5550",

  "site.icp": "蜀ICP备2026XXXXXX号",
  "site.copyright": "© 2026 四川弘道经理学院（弘道教育） 版权所有",
};

async function main() {
  let ok = 0;
  for (const [key, value] of Object.entries(KV)) {
    const exist = await prisma.setting.findFirst({ where: { key } });
    if (exist) {
      await prisma.setting.update({ where: { id: exist.id }, data: { value } });
    } else {
      await prisma.setting.create({ data: { key, value, type: "text" } });
    }
    ok++;
  }
  console.log(`✅ 品牌 setting 已清洗 ${ok} 项`);
  const check = await prisma.setting.findMany({
    where: { key: { in: ["schoolShortName", "schoolFullName", "companyIntro"] } },
  });
  for (const s of check) {
    console.log(`  ${s.key} = ${s.value.slice(0, 60)}${s.value.length > 60 ? "…" : ""}`);
  }
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
