/**
 * main 原主导航静态菜单（移植自 main `src/components/web/Navbar.tsx`，P02）。
 * 纯数据模块：供客户端 Navbar 兜底与服务端 data/navigation.ts 合并使用（不可放在 "use client" 模块里被服务端读取）。
 */
// 二级菜单数据 - 关于我们 (3项, 9交互点)
const aboutSubmenu = [
  { id: "SUB-002-001", label: "学校简介", href: "/about/intro" },
  { id: "SUB-002-002", label: "公司动态", href: "/about/news" },
  { id: "SUB-002-003", label: "名师推荐", href: "/about/teachers" },
];

// 二级菜单数据 - 学历提升 (3项, 9交互点) - 已剔除考研
const educationSubmenu = [
  { id: "003-010", label: "自学考试", href: "/courses/self-study" },
  { id: "003-011", label: "成人高考", href: "/courses/adult-exam" },
  { id: "003-012", label: "开放大学", href: "/courses/open-university" },
];

const universitySubmenu = [
  { id: "003-014", label: "四川大学", href: "/partners/sichuan-university" },
  { id: "003-015", label: "西华大学", href: "/partners/xihua" },
  { id: "003-016", label: "成都理工大学", href: "/partners/chengdu-tech" },
  { id: "003-017", label: "电子科技大学", href: "/partners/uestc" },
  { id: "003-018", label: "西南财经大学", href: "/partners/swufe" },
  { id: "003-019", label: "四川师范大学", href: "/partners/sicnu" },
  { id: "003-020", label: "内江师范学院", href: "/partners/neijiang" },
  { id: "003-021", label: "四川农业大学", href: "/partners/sau" },
  { id: "003-022", label: "成都大学", href: "/partners/chengdu-university" },
  { id: "003-023", label: "西南交通大学", href: "/partners/swjtu" },
  { id: "003-024", label: "成都信息工程大学", href: "/partners/cuit" },
  { id: "003-025", label: "成都师范学院", href: "/partners/chengdu-normal" },
  { id: "003-026", label: "西华师范大学", href: "/partners/chnu" },
];

const majorSubmenu = [
  { id: "003-027", label: "经管类", href: "/courses/business" },
  { id: "003-028", label: "理工类", href: "/courses/technology" },
  { id: "003-029", label: "文史类", href: "/courses/humanities" },
  { id: "003-030", label: "教育类", href: "/courses/education" },
  { id: "003-031", label: "医学类", href: "/courses/medicine" },
  { id: "003-032", label: "法学类", href: "/courses/law" },
  { id: "003-033", label: "艺术类", href: "/courses/art" },
  { id: "003-034", label: "其他类", href: "/courses/other" },
];

// 二级菜单数据 - 资讯中心 (10项, 30交互点) - 重构对齐克隆网站
const newsSubmenu = [
  { id: "SUB-006-001", label: "自学考试", href: "/news/self-study" },
  { id: "SUB-006-002", label: "成人高考", href: "/news/adult-exam" },
  { id: "SUB-006-003", label: "政策通知", href: "/news/policy" },
  { id: "SUB-006-004", label: "经验分享", href: "/news/experience" },
  { id: "SUB-006-005", label: "自考助学", href: "/news/self-help" },
  { id: "SUB-006-006", label: "自考资讯", href: "/news/self-info" },
  { id: "SUB-006-007", label: "成考指南", href: "/news/adult-guide" },
  { id: "SUB-006-008", label: "成考资讯", href: "/news/adult-info" },
  { id: "SUB-006-009", label: "成考干货", href: "/news/adult-tips" },
  { id: "SUB-006-010", label: "成考政策", href: "/news/adult-policy" },
];

export interface NavItem {
  id: string;
  label: string;
  href: string;
  submenu?: { id: string; label: string; href: string }[];
}

/** main 原静态菜单：DB 无导航数据时的兜底，同时为 DB 一级菜单补齐尚未录入的二级菜单（见 data/navigation.ts） */
export const defaultNavItems: NavItem[] = [
  { id: "NAV-001", label: "网站首页", href: "/" },
  { id: "NAV-002", label: "关于我们", href: "/about", submenu: aboutSubmenu },
  { id: "NAV-003", label: "学历提升", href: "/courses", submenu: educationSubmenu },
  { id: "NAV-004", label: "热门院校", href: "/partners", submenu: universitySubmenu },
  { id: "NAV-005", label: "热门专业", href: "/courses", submenu: majorSubmenu },
  { id: "NAV-006", label: "资讯中心", href: "/news", submenu: newsSubmenu },
  { id: "NAV-007", label: "学习中心", href: "/learning" },
  { id: "NAV-008", label: "党建专栏", href: "/party" },
  { id: "NAV-009", label: "联系我们", href: "/contact" },
];

