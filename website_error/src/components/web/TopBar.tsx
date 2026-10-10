"use client";

import Link from "next/link";

interface TopBarProps {
  welcomeText?: string;
}

/**
 * Layer 1: TopBar (32px蓝底)
 * [001] 左侧: 学校名称欢迎语
 * [002] 右侧链接区
 *     ├── [003] 联系我们 (链接)
 *     └── [004] 关于我们 (链接)
 *
 * 交互点: 2个
 * - 001-001: 联系我们 → 跳转 /contact
 * - 001-002: 关于我们 → 跳转 /about
 */
export function TopBar({ welcomeText = "弘道教育 欢迎您!" }: TopBarProps) {
  return (
    <div className="w-full bg-[#da251d] text-white text-sm">
      <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12">
        <div className="flex h-8 items-center justify-between">
          {/* [001] 左侧欢迎语 - 从settings注入 */}
          <span className="text-white/90 text-xs md:text-sm truncate">
            {welcomeText}
          </span>

          {/* [002] 右侧链接区 */}
          <div className="flex items-center gap-4 text-xs md:text-sm">
            {/* [003] 联系我们 */}
            <Link
              href="/contact"
              className="text-white/90 hover:text-white transition-colors duration-200 hover:underline"
              data-interaction-id="001-001"
            >
              联系我们
            </Link>
            
            <span className="text-white/40">|</span>
            
            {/* [004] 关于我们 */}
            <Link
              href="/about"
              className="text-white/90 hover:text-white transition-colors duration-200 hover:underline"
              data-interaction-id="001-002"
            >
              关于我们
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
