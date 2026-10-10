#!/usr/bin/env node
/**
 * 一次性通过本地 API 注入 3 个 ChatScene + 12 条 Knowledge
 *   用法：node scripts/seed-knowledge-scenes.mjs
 *   前提：npm run dev 已启动在 6789 端口，admin/admin123 可登录
 *
 * 该脚本属于一次性数据修复工具，验证完成后可删除。
 */

const BASE = "http://localhost:6789";

async function login() {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "admin", password: "admin123" }),
  });
  const json = await res.json();
  if (!res.ok || !json?.data?.token) {
    throw new Error(`login failed: ${JSON.stringify(json)}`);
  }
  return json.data.token;
}

async function req(token, method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }
  return { status: res.status, json };
}

const scenes = [
  {
    code: "apply",
    name: "在线报名全面咨询",
    description: "首页在线咨询 / /apply 入口：面向目标明确学员，全面介绍专业、费用、流程",
    greeting:
      "您好！我是弘道教育的 AI 课程顾问。请问您想咨询自学考试、成人高考还是开放大学？我会为您详细介绍报考条件、费用和流程。",
    systemPrompt:
      "【场景：全面咨询】在本场景中，学员主动进入在线报名页寻求系统化的升学方案。请先主动询问学员的目标专业、学历层次和预算，再结合弘道教育的专业矩阵、学费、学制给出对比建议，末尾邀请留下手机号以便 1v1 跟进。",
    knowledgeTags: "zikao,chengkao,kaifang,fee,enrollment,process",
    starters: JSON.stringify([
      "自考本科需要多少钱？",
      "成人高考报名流程是什么？",
      "开放大学几年可以拿证？",
    ]),
    sort: 10,
  },
  {
    code: "float",
    name: "悬浮客服-商务转化",
    description: "右下角悬浮在线客服入口：偏商务转化，话术更直接",
    greeting:
      "您好，我是弘道教育的在线客服，请问现在是想了解报名政策、校区地址，还是最新的优惠活动？",
    systemPrompt:
      "【场景：悬浮客服-商务转化】本场景下学员从悬浮入口进入，注意力短暂。请用 2-3 句话直接回答核心问题，并在每 2 轮对话后提醒拨打 132-1945-5550（杨校长）或留手机号获取专属报名方案；介绍优惠时可引用「2026年报名优惠方案」。",
    knowledgeTags: "fee,enrollment,contact,discount",
    starters: JSON.stringify([
      "最近有什么优惠活动？",
      "学校地址在哪里？",
      "怎么联系老师？",
    ]),
    sort: 20,
  },
  {
    code: "guide",
    name: "服务指南-政策解答",
    description: "服务指南 6 宫格入口：学员对政策/流程有具体疑问",
    greeting:
      "您好，欢迎使用弘道教育服务指南。请直接告诉我您关心的问题：报考条件、考试科目、加分政策、报名时间等，我都能帮您解答。",
    systemPrompt:
      "【场景：服务指南-政策解答】学员从服务指南进入，通常已有具体政策疑问。请基于知识库中「报考条件、考试科目、加分政策、报名时间、费用」优先回答；不要急于推销课程，先把政策讲清楚，再在末尾简短邀请扫码加老师了解细节。",
    knowledgeTags: "enrollment,exam,policy,fee,process",
    starters: JSON.stringify([
      "报考条件有哪些？",
      "统考有哪些科目？",
      "什么时候报名？",
    ]),
    sort: 30,
  },
];

const knowledge = [
  {
    title: "弘道教育简介",
    content:
      "四川弘道经理学院（弘道教育）成立于 2004 年 2 月，是专注学历提升、职业证书培训的成人教育机构，校址位于成都市青羊区大石西路 12 号。学校拥有 26 间标准化教室、300 台考试专用计算机，是多所高校的官方助学点。校长热线：132-1945-5550（杨校长）/ 028-6167-5329。",
    tags: "school,about,contact",
    priority: 100,
  },
  {
    title: "自学考试（小自考）政策",
    content:
      "四川小自考（应用型自考）由考生自学 + 学校助学结合，统考科目通常为 3-6 门、校考科目 10+ 门。统考每年 4 月与 10 月举行，校考每年 2 次。主要合作院校：四川师范大学、西华师范大学、四川农业大学、电子科技大学等。自考无入学考试，毕业快的 1.5 年可拿证。",
    tags: "zikao,exam,enrollment,process",
    priority: 90,
  },
  {
    title: "成人高考政策",
    content:
      "成人高考简称「成考」，每年 10 月举行统一入学考试，录取后通过网络或业余形式学习。学制通常 2.5 年，最低 121 分可被录取。报考学历层次包括高起专、高起本、专升本三种。弘道教育主要合作院校有四川师范大学、西华大学、成都理工大学等。",
    tags: "chengkao,exam,enrollment,process",
    priority: 90,
  },
  {
    title: "国家开放大学（电大）政策",
    content:
      "国家开放大学（前身为中央广播电视大学）采用线上学习 + 线下面授的形式，入学免统考，全年两次招生（春季 3 月、秋季 9 月）。学制 2.5 年，证书由国家开放大学统一颁发，教育部电子注册、学信网可查。适合时间不自由、想稳妥拿证的学员。",
    tags: "kaifang,enrollment,process",
    priority: 90,
  },
  {
    title: "学费一览",
    content:
      "弘道教育学费参考区间：小自考 3800-5800 元/年、成人高考 2400-3200 元/年、开放大学 3000-4000 元/年。具体收费以当年签约合同为准，支持分期。2026 年老学员推荐新学员可享受 300 元报名优惠。",
    tags: "fee,enrollment,discount",
    priority: 100,
  },
  {
    title: "报名条件",
    content:
      "①自考：不限学历、年龄、户籍，报读本科须在毕业前取得国家承认的专科学历；②成考：高起专/高起本需年满 18 周岁且具备高中文化；专升本须已取得国家承认的专科学历；③开放大学：报读专科须高中同等学历，报读本科须具备国家承认的专科学历。",
    tags: "enrollment,process,policy",
    priority: 85,
  },
  {
    title: "考试科目与加分政策",
    content:
      "①自考统考：公共课（中国近现代史纲要、马原）+ 专业课 3-8 门，校考为过程性考核加分（最高 45 分），成绩合并为最终成绩；②成考：高起专考语数外；专升本考政治、英语 + 专业综合；年满 25 周岁加 20 分，少数民族/烈属等另加分。",
    tags: "exam,policy,enrollment",
    priority: 85,
  },
  {
    title: "报名时间安排",
    content:
      "①自考：每年 2 次统考（4 月、10 月），一般提前 1-2 个月报名；②成考：每年 8 月底 9 月初网报，10 月底考试，12 月录取；③开放大学：春季 3 月、秋季 9 月报名，弘道教育支持常年预报名锁学位。",
    tags: "enrollment,exam,process",
    priority: 85,
  },
  {
    title: "报考流程（五步走）",
    content:
      "1. 电话或到校咨询 → 2. 选择适合的学历形式与专业 → 3. 填写报名表、缴纳报名费 → 4. 参加对应形式的入学/统考考试 → 5. 录取后正式入学、按期参加助学活动、最终申请毕业证/学位证。",
    tags: "process,enrollment",
    priority: 80,
  },
  {
    title: "合作院校与热门专业",
    content:
      "合作院校：四川大学、西华大学、成都理工大学、电子科技大学、西南财经大学、四川师范大学、四川农业大学、内江师范学院、成都大学、西南交通大学。热门专业：汉语言文学、工商管理、学前教育、会计学、金融学、法学、计算机科学与技术、工程管理、心理学、市场营销。",
    tags: "school,major,zikao,chengkao",
    priority: 80,
  },
  {
    title: "联系方式与校区",
    content:
      "校长热线：132-1945-5550（杨校长）；座机：028-6167-5329；邮箱：admin@hdedu.cn；地址：成都市青羊区大石西路 12 号。工作时间：周一至周日 9:00-18:00。支持到校面谈、电话、在线客服多种咨询渠道。",
    tags: "contact,school",
    priority: 75,
  },
  {
    title: "2026 年报名优惠方案",
    content:
      "2026 年春季老带新优惠：老学员介绍新学员报名，双方各可减免 300 元学费；团报 3 人及以上每人再减 200 元。助学资料电子版免费赠送，学位英语辅导可按优惠价 499 元/人参加。优惠时间：2026 年 3 月 1 日 - 2026 年 5 月 31 日。",
    tags: "discount,fee,enrollment",
    priority: 70,
  },
];

async function main() {
  const token = await login();
  console.log("✅ login ok");

  const existingScenes = await req(token, "GET", "/api/chat-scenes");
  const existingMap = new Map((existingScenes.json?.data || []).map((s) => [s.code, s.id]));

  for (const s of scenes) {
    const exId = existingMap.get(s.code);
    if (exId) {
      const r = await req(token, "PUT", `/api/chat-scenes/${exId}`, s);
      console.log(`  scene ${s.code}: updated (${r.status})`);
    } else {
      const r = await req(token, "POST", "/api/chat-scenes", s);
      console.log(`  scene ${s.code}: created (${r.status})`);
    }
  }

  const existingKnowledge = await req(token, "GET", "/api/knowledge");
  const knowledgeMap = new Map(
    (existingKnowledge.json?.data || []).map((k) => [k.title, k.id])
  );

  for (const k of knowledge) {
    const exId = knowledgeMap.get(k.title);
    if (exId) {
      const r = await req(token, "PUT", `/api/knowledge/${exId}`, k);
      console.log(`  knowledge ${k.title.slice(0, 20)}: updated (${r.status})`);
    } else {
      const r = await req(token, "POST", "/api/knowledge", k);
      console.log(`  knowledge ${k.title.slice(0, 20)}: created (${r.status})`);
    }
  }

  console.log("🎉 done");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
