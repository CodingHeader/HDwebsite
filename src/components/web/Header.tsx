"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { Menu, X, Phone, Smartphone, GraduationCap } from "lucide-react";

interface HeaderProps {
  siteLogoIcon?: string;
  contactPhone1?: string;
  contactPhone2?: string;
}

/**
 * Layer 2: Header主区 (110px白底)
 * ├── [005] 左侧Logo区
 * │   ├── [006] 校徽图标 (可点击) → 002-001 跳转/
 * │   └── [007] 学校名称中英文 → 002-002 跳转/
 * ├── [008] 中间留白
 * └── [009] 右侧信息区
 *     ├── [010] 每日一练 (手机图标+文字) → 002-003 跳转/learning, 002-007 Hover放大
 *     ├── [011] 网校平台 (橙色人物图标+文字) → 002-004 跳转/learning, 002-008 Hover放大
 *     └── [012] 校长热线 (电话图标+2号码) → 002-005/002-006 tel:拨号
 *
 * 交互点: 8个
 */
export function Header({ 
  siteLogoIcon = "/images/logo_card.png",
  contactPhone1 = "139-0809-1091",
  contactPhone2 = "028-8532-9903"
}: HeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white shadow-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-[80px] items-center justify-between">
          {/* [005] 左侧Logo区 - 从settings注入 */}
          <Link
            href="/"
            className="flex items-center gap-3 group"
            data-interaction-id="002-001"
          >
            <Image
              src={siteLogoIcon}
              alt="弘道经理学院"
              width={240}
              height={46}
              className="object-contain"
              priority
            />
          </Link>

          {/* [009] 右侧信息区 */}
          <div className="hidden xl:flex items-center gap-6">
            {/* [010] 每日一练 */}
            <Link
              href="/learning"
              className="flex items-center gap-2 group"
              data-interaction-id="002-003"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 group-hover:scale-110 transition-transform duration-200">
                <Smartphone className="h-5 w-5 text-blue-600" />
              </div>
              <div className="text-sm">
                <p className="font-medium text-gray-900">每日一练</p>
                <p className="text-xs text-gray-500">移动学习</p>
              </div>
            </Link>

            {/* [011] 网校平台 */}
            <Link
              href="/learning"
              className="flex items-center gap-2 group"
              data-interaction-id="002-004"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-50 group-hover:scale-110 transition-transform duration-200">
                <GraduationCap className="h-5 w-5 text-orange-600" />
              </div>
              <div className="text-sm">
                <p className="font-medium text-gray-900">网校平台</p>
                <p className="text-xs text-gray-500">在线学习</p>
              </div>
            </Link>

            {/* [012] 校长热线 - 从settings注入 */}
            <div className="flex items-center gap-2 border-l pl-6 border-gray-200">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50">
                <Phone className="h-5 w-5 text-blue-600" />
              </div>
              <div className="text-sm">
                <p className="font-medium text-gray-900">校长热线</p>
                <div className="flex flex-col text-xs">
                  <a
                    href={`tel:${contactPhone1.replace(/-/g, "")}`}
                    className="text-blue-600 hover:underline font-semibold"
                    data-interaction-id="002-005"
                  >
                    {contactPhone1}
                  </a>
                  <a
                    href={`tel:${contactPhone2.replace(/-/g, "")}`}
                    className="text-blue-600 hover:underline font-semibold"
                    data-interaction-id="002-006"
                  >
                    {contactPhone2}
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Mobile Menu Button - 仅用于展开联系信息 */}
          <button
            className="lg:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-md"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Contact Info */}
      {isMenuOpen && (
        <div className="lg:hidden border-t bg-white">
          <div className="flex flex-col p-4 gap-2">
            <div className="flex items-center gap-2 px-4 py-3 text-[#da251d] border-t">
              <Phone className="h-5 w-5" />
              <div className="flex flex-col text-sm">
                <a href={`tel:${contactPhone1.replace(/-/g, "")}`} className="hover:underline">{contactPhone1}</a>
                <a href={`tel:${contactPhone2.replace(/-/g, "")}`} className="hover:underline">{contactPhone2}</a>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
