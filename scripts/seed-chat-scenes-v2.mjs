#!/usr/bin/env node
/**
 * D4：为三个 ChatScene 写入差异化的 pageTitle/pageSubtitle/headerTip/sidebarTitle/processSteps/promiseList/contactCardTitle。
 * 同时保留/调整 greeting 与 systemPrompt，让 AI 回答也显著差异化。
 */
import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

const adapter = new PrismaLibSql({ url: "file:./prisma/dev.db" });
const prisma = new PrismaClient({ adapter });

const scenes = [
  {
    code: "apply",
    name: "在线报名全面咨询",
    description: "一级导航「在线报名」入口，面向有明确升学意向的访客，提供完整咨询",
    greeting:
      "您好！欢迎来到弘道教育在线报名中心。我是您的 AI 课程顾问，可以为您介绍自学考试、成人高考、开放大学三种学历提升方案。请问您目前的学历是？想要提升到什么层次呢？",
    systemPrompt:
      "你是四川弘道经理学院（弘道教育）的 AI 课程顾问，性格专业、耐心、热情。与访客对话时：\n1. 优先引导用户说出【现有学历 → 目标学历 → 兴趣专业 → 所在地区】四个关键信息；\n2. 根据用户画像，推荐最适合的学历提升方案（自考 / 成考 / 开放大学）；\n3. 涉及学费、报名时间、考试科目时，必须引用知识库的官方数据，避免编造；\n4. 在用户意向清晰后，引导留电话 132-1945-5550 或加微信 xgnedu，由人工顾问跟进；\n5. 回答使用清晰段落和要点，避免大段堆砌。",
    knowledgeTags: "zikao,chengkao,kaifang,fee,enrollment,brand,partners",
    starters: JSON.stringify([
      "自考和成考有什么区别？",
      "2026 年秋季报名还来得及吗？",
      "学费大概多少？",
      "有哪些合作院校？",
    ]),
    pageTitle: "在线报名",
    pageSubtitle: "AI 课程顾问为您定制学历提升方案，3 分钟摸清您的最优路径",
    headerTip: "AI 课程顾问在线为您服务",
    sidebarTitle: "报名流程",
    processSteps: JSON.stringify([
      { title: "在线咨询", desc: "AI 快速评估您的情况" },
      { title: "顾问跟进", desc: "1 对 1 电话深入沟通" },
      { title: "方案确认", desc: "院校 / 专业 / 学费 / 周期" },
      { title: "正式报名", desc: "签约缴费 · 启动学习" },
    ]),
    promiseList: JSON.stringify([
      "24 小时内顾问响应",
      "院校官方助学点直连",
      "学费透明无隐形收费",
      "学信网终身可查",
    ]),
    contactCardTitle: "联系课程顾问",
  },
  {
    code: "float",
    name: "悬浮客服·商务转化",
    description: "右下角悬浮「在线客服」入口，访客还在页面浏览，话术要简短直接、快速转化",
    greeting:
      "您好，我是弘道教育在线客服。请简短告诉我您最关心的 1-2 个问题（例：学费多少、哪家院校、多久能毕业），我直接给您答案，不绕弯。",
    systemPrompt:
      "你是四川弘道经理学院（弘道教育）的悬浮在线客服，性格利落、效率优先。对话原则：\n1. 回答尽量简短，1-3 句话解决问题；\n2. 不主动长篇科普，除非用户明确要求详细；\n3. 每轮回答后抛出「需要顾问给您详细方案吗？留个电话 2 分钟内回电」的快速转化话术；\n4. 涉及学费、考试时间等敏感信息，严格以知识库为准；\n5. 对比明显偏概念性的问题（如「学历有没有用」）给出快问快答，然后引导到具体方案。",
    knowledgeTags: "fee,enrollment,brand,partners",
    starters: JSON.stringify([
      "学费多少？",
      "多久能毕业？",
      "靠谱吗？",
      "现在能报名吗？",
    ]),
    pageTitle: "在线客服",
    pageSubtitle: "专业顾问 2 分钟内响应，短平快解决您的学历提升疑问",
    headerTip: "短平快回答 · 留电话由顾问主动回访",
    sidebarTitle: "咨询热点",
    processSteps: JSON.stringify([
      { title: "告诉我您的起点", desc: "高中 / 大专 / 本科" },
      { title: "想要的终点", desc: "学历 / 职称 / 证书" },
      { title: "AI 智能匹配", desc: "基于 8 所合作院校资源" },
      { title: "电话深度沟通", desc: "留联系方式由顾问主动回访" },
    ]),
    promiseList: JSON.stringify([
      "2 分钟内响应",
      "专属顾问一对一",
      "信息严格保密",
      "不接受强制推销",
    ]),
    contactCardTitle: "马上联系顾问",
  },
  {
    code: "guide",
    name: "服务指南·政策解答",
    description: "从服务指南 6 宫格进入，访客想搞清楚流程 / 政策 / 费用细节",
    greeting:
      "您好，我是弘道教育的政策答疑专员。请直接告诉我您想了解的项目（例如：报考条件、报名费用、考试时间、免考英语、加分政策等），我会依据四川省教育厅最新政策为您解读。",
    systemPrompt:
      "你是四川弘道经理学院（弘道教育）的政策答疑专员，性格权威、严谨、条理分明。对话原则：\n1. 回答采用「政策依据 + 具体办理流程 + 温馨提示」三段式结构；\n2. 涉及时间节点（报名截止、考试日期）必须以知识库为准；\n3. 涉及的政策条款如无官方依据，明确提示「该细则以当地考办最终公告为准」；\n4. 尾声温和引导：如需一对一办理协助，可致电 132-1945-5550；\n5. 回答用列表或编号清晰结构化。",
    knowledgeTags: "zikao,chengkao,kaifang,fee,enrollment,process",
    starters: JSON.stringify([
      "自考报考条件？",
      "学费怎么交？",
      "2026 年考试时间？",
      "可以免考英语吗？",
    ]),
    pageTitle: "政策解答",
    pageSubtitle: "关于报名条件、学费、考试时间、免考政策的权威解读",
    headerTip: "政策类问题请直接提问，AI 依据官方政策作答",
    sidebarTitle: "办理流程",
    processSteps: JSON.stringify([
      { title: "查询政策", desc: "AI 检索最新学历政策" },
      { title: "确认资格", desc: "高中学历 / 18 周岁即可" },
      { title: "选择方案", desc: "自考 · 成考 · 开放大学" },
      { title: "办理手续", desc: "注册 · 缴费 · 开学" },
    ]),
    promiseList: JSON.stringify([
      "政策解读以教育部官方为准",
      "学信网终身可查",
      "国家承认学历",
      "院校官方助学点合作",
    ]),
    contactCardTitle: "服务支持",
  },
];

async function main() {
  for (const s of scenes) {
    const exist = await prisma.chatScene.findUnique({ where: { code: s.code } });
    if (exist) {
      await prisma.chatScene.update({ where: { id: exist.id }, data: { ...s, status: "active", sort: 10 } });
      console.log(`✓ 更新场景 ${s.code} (id=${exist.id})`);
    } else {
      const created = await prisma.chatScene.create({ data: { ...s, status: "active", sort: 10 } });
      console.log(`+ 创建场景 ${s.code} (id=${created.id})`);
    }
  }
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
