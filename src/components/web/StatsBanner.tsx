"use client";

import { CheckCircle } from "lucide-react";

interface StatsBannerProps {
  years: number;
  graduates: string;
  advantages: string[];
}

export function StatsBanner({ years, graduates, advantages }: StatsBannerProps) {
  return (
    <section className="py-6 md:py-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-r from-[#1a237e] via-[#283593] to-[#004d40] px-4 py-6 md:px-6 md:py-8">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-4 lg:gap-8">
            {/* 左侧统计数据 */}
            <div className="text-white text-center lg:text-left flex-shrink-0">
              <p className="text-xl md:text-2xl lg:text-[28px] font-bold leading-relaxed">
                办学
                <span className="text-[#ffeb3b] text-2xl md:text-3xl lg:text-4xl mx-1">{years}</span>
                年培养输送各类人才
                <span className="text-[#ffeb3b] text-2xl md:text-3xl lg:text-4xl mx-1">{graduates}</span>
                余人
              </p>
            </div>

            {/* 右侧优势标签 */}
            <div className="flex flex-wrap items-center justify-center lg:justify-end gap-3 md:gap-4">
              {advantages.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center gap-1.5 bg-white/10 backdrop-blur-sm px-3 py-1.5 rounded-full"
                >
                  <CheckCircle className="h-4 w-4 text-[#69f0ae] flex-shrink-0" />
                  <span className="text-white text-sm md:text-base font-medium whitespace-nowrap">
                    {item}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
