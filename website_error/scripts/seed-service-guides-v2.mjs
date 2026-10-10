#!/usr/bin/env node
/**
 * E4：给每个 ServiceGuide 填入 slug / subtitle / content，并把 link 改为 /services/{slug}
 */
import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

const adapter = new PrismaLibSql({ url: "file:./prisma/dev.db" });
const prisma = new PrismaClient({ adapter });

const guides = [
  {
    matchTitle: "报名流程",
    slug: "process",
    subtitle: "从咨询到正式入学的 5 个关键节点，看图就能走完",
    content: `<h2>弘道教育报名流程</h2>
<p>弘道教育整条报名链路高度数字化，<strong>纯线上办理 3 天即可完成，线下 1 对 1 咨询半天即可拍板</strong>。</p>

<h3>1. 资格确认</h3>
<ul>
  <li>年龄 ≥ 18 周岁</li>
  <li>持有高中 / 中专 / 同等学力毕业证</li>
  <li>报考本科需具备国家承认的大专学历</li>
</ul>

<h3>2. 院校专业选择</h3>
<p>弘道教育与四川大学、西华大学、成都理工大学、电子科技大学、西南财经大学、四川师范大学、四川农业大学、西南交通大学等 8 所本科院校建立官方校外学习中心合作，可按照您的职业规划选择最匹配的院校与专业组合。</p>

<h3>3. 缴费与注册</h3>
<p>确认方案后，当面 / 转账缴纳第一学年学费，由学校统一在四川省教育考试院注册报考信息。</p>

<h3>4. 学习与考试</h3>
<p>自考学员参加省统考（每年 4 月 / 10 月）+ 校考（由助学点组织）；成考学员 10 月参加全国统考，次年 3 月入学；开放大学学员全程线上学习。</p>

<h3>5. 毕业与学位申请</h3>
<p>修满学分、通过论文答辩（本科）即可申请毕业证，成绩优秀者可同步申请学士学位。<strong>全程 2-2.5 年可毕业</strong>。</p>

<p><em>👉 以上流程以当前招生批次为准，最新细节以教育考试院公告为准。如有疑问请致电 132-1945-5550。</em></p>`,
    icon: "FileText",
    sort: 1,
  },
  {
    matchTitle: "常见问题",
    slug: "faq",
    subtitle: "学历是否被承认、学费如何、能否免考英语等 Top 10 问题",
    content: `<h2>弘道教育常见问题 FAQ</h2>

<h3>Q1. 弘道教育的学历被国家承认吗？</h3>
<p>✅ 承认。弘道教育合作的 8 所院校均为公办本科，毕业证书由<strong>四川省教育厅监制</strong>，学信网（www.chsi.com.cn）终身可查。</p>

<h3>Q2. 自考 / 成考 / 开放大学我该怎么选？</h3>
<ul>
  <li><strong>自考</strong>：含金量最高，1.5 - 2 年可毕业，适合想快速拿证者</li>
  <li><strong>成考</strong>：基础最稳，2.5 年固定毕业，适合上班族</li>
  <li><strong>开放大学</strong>：最灵活，全程线上，适合异地、宝妈</li>
</ul>

<h3>Q3. 学费大概多少？</h3>
<p>自考 7000-9000 元 / 全程（分 2-3 年缴纳）；成考 6000-8000 元 / 全程；开放大学 8000-10000 元 / 全程。具体以院校当年公告为准。</p>

<h3>Q4. 可以免考英语吗？</h3>
<p>可以。以下情况免考英语（同时不影响学位申请）：</p>
<ul>
  <li>持大学英语四级 / 六级证书</li>
  <li>持 PETS-3 及以上证书</li>
  <li>年满 40 周岁</li>
  <li>毕业不申请学士学位</li>
</ul>

<h3>Q5. 考不过怎么办？</h3>
<p>弘道教育提供<strong>免费重修服务</strong>，至考过为止，不另收学费。每个科目提供 2 次免费补考机会，如仍未通过由顾问 1 对 1 辅导重点突破。</p>

<h3>Q6. 2026 年秋季还能报名吗？</h3>
<p>可以。自考秋季报名通常在 8 月中旬截止，成考秋季报名在 9 月初截止，<strong>请尽快联系顾问锁定名额</strong>。</p>

<p><em>👉 更多问题请在线咨询 AI 顾问，或拨打 132-1945-5550。</em></p>`,
    icon: "HelpCircle",
    sort: 2,
  },
  {
    matchTitle: "报名费用",
    slug: "fee",
    subtitle: "三大学历提升通道的学费 / 缴费方式 / 分期政策",
    content: `<h2>弘道教育学费明细</h2>

<h3>📚 自学考试（小自考）</h3>
<table>
<thead><tr><th>专业类别</th><th>学费总额</th><th>缴费方式</th></tr></thead>
<tbody>
<tr><td>文学 / 教育</td><td>7000 元 / 全程</td><td>分 2 次：入学 60% + 第二学年 40%</td></tr>
<tr><td>管理 / 经济</td><td>7800 元 / 全程</td><td>同上</td></tr>
<tr><td>计算机 / 工科</td><td>8600 元 / 全程</td><td>同上</td></tr>
<tr><td>医学 / 特殊专业</td><td>9800 元 / 全程</td><td>分 3 次缴纳</td></tr>
</tbody>
</table>

<h3>🎓 成人高考</h3>
<table>
<thead><tr><th>层次</th><th>学费 / 年</th><th>学制</th><th>总额</th></tr></thead>
<tbody>
<tr><td>专科起点本科</td><td>2800 元</td><td>2.5 年</td><td>7000 元</td></tr>
<tr><td>高中起点专科</td><td>2400 元</td><td>2.5 年</td><td>6000 元</td></tr>
<tr><td>高中起点本科</td><td>3200 元</td><td>5 年</td><td>16000 元</td></tr>
</tbody>
</table>

<h3>🌐 开放大学</h3>
<p>统一标准：<strong>8000 - 10000 元 / 全程（2.5 年）</strong>，按学年缴纳。</p>

<h3>💡 优惠政策</h3>
<ul>
  <li>两人同行 98 折</li>
  <li>退伍军人 95 折</li>
  <li>2026 秋季报名赠送考前冲刺资料包</li>
</ul>

<p><strong>学费承诺：</strong>弘道教育采用透明收费制度，学费一次性报价 <strong>无隐形费用</strong>，包括考试报名费、学位申请辅导、毕业论文答辩等所有服务。</p>

<p><em>👉 留下电话可获得个性化学费清单，拨打 132-1945-5550 或在线咨询。</em></p>`,
    icon: "DollarSign",
    sort: 3,
  },
  {
    matchTitle: "考试时间",
    slug: "exam",
    subtitle: "2026 年自考 / 成考 / 开放大学关键时间节点一表看懂",
    content: `<h2>2026 年弘道教育考试时间表</h2>

<h3>📅 自学考试（小自考）</h3>
<ul>
  <li><strong>上半年统考</strong>：4 月 12-13 日（已结束）</li>
  <li><strong>下半年统考</strong>：10 月 25-26 日（7 月 5 日报名截止）</li>
  <li><strong>校考时间</strong>：每年 6 月中旬、12 月中旬，由助学点组织</li>
</ul>

<h3>📅 成人高考</h3>
<ul>
  <li><strong>网上报名</strong>：9 月 1-10 日</li>
  <li><strong>现场确认</strong>：9 月 15-20 日</li>
  <li><strong>全国统考</strong>：10 月 18-19 日</li>
  <li><strong>录取结果</strong>：12 月中旬</li>
  <li><strong>正式入学</strong>：次年 3 月</li>
</ul>

<h3>📅 开放大学</h3>
<ul>
  <li><strong>春季招生</strong>：11-3 月（3 月入学）</li>
  <li><strong>秋季招生</strong>：5-9 月（9 月入学）</li>
  <li><strong>期末考试</strong>：每学期末，集中在就近学习中心完成</li>
</ul>

<h3>⏰ 学位英语</h3>
<p>四川省学位英语一年考两次：</p>
<ul>
  <li><strong>上半年</strong>：4 月第三个周日（2026/4/20）</li>
  <li><strong>下半年</strong>：11 月第一个周日（2026/11/2）</li>
</ul>

<p><em>⚠️ 以上时间以四川省教育考试院最终公告为准。弘道教育会提前 30 天通过短信 + 微信提醒每位学员。</em></p>`,
    icon: "Calendar",
    sort: 4,
  },
  {
    matchTitle: "联系我们",
    slug: "contact",
    subtitle: "校区地址 / 咨询热线 / 官方微信 / 在线客服全渠道",
    content: `<h2>联系弘道教育</h2>

<h3>📞 咨询热线</h3>
<ul>
  <li><strong>主热线</strong>：132-1945-5550（招生主任，7×12 小时在线）</li>
  <li><strong>教务热线</strong>：028-6167-5329（周一至周日 9:00-18:00）</li>
</ul>

<h3>📍 校区地址</h3>
<h4>大石西路总校</h4>
<p>成都市青羊区大石西路 12 号</p>
<ul>
  <li>地铁 4 号线「清江东路」B 口步行 500 米</li>
  <li>公交 27 / 34 / 504 路 「大石西路站」下车即到</li>
</ul>

<h4>双店路分校</h4>
<p>成都市成华区双店路 66 号</p>
<ul>
  <li>地铁 8 号线「双店路站」C 口步行 300 米</li>
  <li>公交 2 / 71 / 106 路 「双店路站」下车</li>
</ul>

<h3>💬 在线渠道</h3>
<ul>
  <li><strong>官网在线咨询</strong>：AI 客服 24 小时在线</li>
  <li><strong>官方微信</strong>：xgnedu（加好友可领取考前冲刺资料包）</li>
  <li><strong>邮箱</strong>：service@hongdaoedu.com</li>
</ul>

<h3>🕐 工作时间</h3>
<p>周一至周日 9:00-18:00（节假日正常接待）</p>

<p><em>👉 建议提前电话预约到访，可以更高效地获得 1 对 1 咨询。</em></p>`,
    icon: "Phone",
    sort: 5,
  },
  {
    matchTitle: "在线咨询",
    slug: "consult",
    subtitle: "通过 AI 智能客服快速获取学费 / 报名条件 / 院校对比",
    content: `<h2>在线咨询弘道教育 AI 顾问</h2>

<p>弘道教育在线咨询由<strong>基于 Modelscope Qwen 3.5 大模型</strong>定制训练的 AI 课程顾问提供，背靠 <strong>12 条官方政策知识库 + 8 所合作院校数据</strong>，可 24 小时回答您的学历提升疑问。</p>

<h3>🤖 AI 可以为您解决什么？</h3>
<ul>
  <li>判断最适合您的学历提升方案（自考 / 成考 / 开放大学）</li>
  <li>对比不同院校的优劣势与特色专业</li>
  <li>解读最新报名政策与考试时间</li>
  <li>初步估算学费与学制</li>
  <li>回答免考英语 / 免考科目等政策细节</li>
</ul>

<h3>💡 AI 的边界</h3>
<p>AI 可以秒答常见问题，<strong>但无法代替人工顾问</strong>办理具体的院校录取、合同签订、学位申请等事务。针对复杂场景（跨省报考、特殊加分政策、在职升学规划），建议：</p>
<ol>
  <li>AI 对话中留下您的<strong>电话</strong>或<strong>微信</strong></li>
  <li>顾问会在 <strong>2 分钟内</strong>与您取得联系</li>
  <li>转 1 对 1 电话 / 微信深度沟通</li>
</ol>

<h3>🎯 三种场景建议</h3>
<ul>
  <li><a href="/apply">/apply</a>（在线报名）：完整咨询场景，适合已有升学意向</li>
  <li><a href="/apply?source=float">/apply?source=float</a>（悬浮客服）：快问快答，适合浏览中</li>
  <li><a href="/apply?source=guide">/apply?source=guide</a>（政策解答）：权威解读，适合搞清楚政策</li>
</ul>

<p><strong>立即开始：</strong> <a href="/apply?source=guide">点此与 AI 顾问对话 →</a></p>`,
    icon: "MessageSquare",
    sort: 6,
  },
];

async function main() {
  // 先清理可能冲突的 slug，避免唯一约束报错
  await prisma.serviceGuide.updateMany({
    where: { slug: { in: guides.map(g => g.slug) } },
    data: { slug: null },
  });

  for (const g of guides) {
    try {
      const exist = await prisma.serviceGuide.findFirst({ where: { title: g.matchTitle } });
      const link = `/services/${g.slug}`;
      const data = {
        slug: g.slug,
        title: g.matchTitle,
        subtitle: g.subtitle,
        content: g.content,
        icon: g.icon,
        link,
        sort: g.sort,
        status: "active",
      };
      if (exist) {
        await prisma.serviceGuide.update({ where: { id: exist.id }, data });
        console.log(`✓ 更新 ${g.matchTitle} (slug=${g.slug})`);
      } else {
        await prisma.serviceGuide.create({ data });
        console.log(`+ 创建 ${g.matchTitle} (slug=${g.slug})`);
      }
    } catch (err) {
      console.error(`✗ ${g.matchTitle} 失败:`, err.message || err);
    }
  }
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
