"use client";

import Link from "next/link";
import Image from "next/image";
import { MapPin, Phone, Mail, Clock } from "lucide-react";

interface FooterProps {
  schoolShortName?: string;
  siteLogo?: string;
  footerLogo?: string;
  footerSlogan?: string;
  footerDescription?: string;
  address?: string;
  contactPhone?: string;
  contactEmail?: string;
  icp?: string;
  workHours?: string;
}

const footerLinks = [
  {
    title: "快速导航",
    links: [
      { label: "首页", href: "/" },
      { label: "课程专业", href: "/courses" },
      { label: "新闻资讯", href: "/articles" },
      { label: "关于我们", href: "/about" },
    ],
  },
  {
    title: "学习资源",
    links: [
      { label: "学习中心", href: "/learning" },
      { label: "证书风采", href: "/gallery" },
      { label: "合作院校", href: "/partners" },
      { label: "学院风采", href: "/campus" },
    ],
  },
  {
    title: "帮助中心",
    links: [
      { label: "在线报名", href: "/apply" },
      { label: "联系我们", href: "/contact" },
      { label: "报名流程", href: "/about#process" },
      { label: "常见问题", href: "/about#faq" },
    ],
  },
];

export function Footer({
  schoolShortName = "弘道教育",
  siteLogo = "/images/logo.png",
  footerLogo = "",
  footerSlogan = "专注学历提升教育",
  footerDescription = "弘道教育致力于为社会人士提供优质的学历提升教育服务，助力学历提升，成就美好未来。",
  address = "成都市青羊区大石西路12号",
  contactPhone = "400-001-5729",
  contactEmail = "contact@hdaomanager.com",
  icp = "蜀ICP备XXXXXXXX号",
  workHours = "周一至周日 9:00-18:00"
}: FooterProps) {
  // 优先使用footerLogo，否则回退到siteLogo
  const displayLogo = footerLogo || siteLogo;
  return (
    <footer className="bg-[#da251d] text-white/80">
      {/* Main Footer */}
      <div className="mx-auto max-w-7xl px-4 pt-8 pb-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-5" style={{ alignItems: 'center' }}>
          {/* Brand Info - 从settings注入 */}
          <div className="lg:col-span-2">
            <div className="mb-3">
              <Image 
                src={displayLogo}
                alt={schoolShortName}
                width={180} 
                height={50} 
                className="h-10 w-auto object-contain mb-1"
              />
              <p className="text-sm text-white/70">{footerSlogan}</p>
            </div>
            <p className="text-sm text-white/70 mb-3 max-w-sm leading-relaxed">
              {footerDescription}
            </p>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-white/90" />
                <span>{address}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-white/90" />
                <span>{contactPhone}</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-white/90" />
                <span>{contactEmail}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-white/90" />
                <span>{workHours}</span>
              </div>
            </div>
          </div>

          {/* Link Columns - 垂直居中对齐 */}
          <div className="lg:col-span-3" style={{ gridColumn: 'span 3', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', alignItems: 'center' }}>
            {footerLinks.map((column) => (
              <div key={column.title}>
                <h4 className="text-sm font-semibold text-white mb-4">
                  {column.title}
                </h4>
                <ul className="space-y-2 text-sm">
                  {column.links.map((link) => (
                    <li key={`${column.title}-${link.label}-${link.href}`}>
                      <Link
                        href={link.href}
                        className="text-white/70 hover:text-white/90 transition-colors"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Bar - 从settings注入 */}
      <div className="border-t border-white/20">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-white/70">
            <p>© 2026 {schoolShortName} 版权所有</p>
            <p>{icp}</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
