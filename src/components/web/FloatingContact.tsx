"use client";

import { WEB_SETTING_DEFAULTS } from "@/components/web/data/setting-defaults";
import { useState, useEffect } from "react";
import { MessageCircle, Phone, ArrowUp } from "lucide-react";

interface FloatingContactProps {
  phone?: string;
  /** V1.8/A4：微信二维码地址；空则浮层内显示占位文案（原版 layout.tsx:36→71 同款） */
  wechatQrCode?: string;
}

/**
 * Phase-1: 右侧悬浮联系组件 (Fixed Right)
 * 
 * 共20个交互点:
 * FLOAT-001~003: 在线客服 (蓝色#5b9bd5)
 * FLOAT-004~007: 官方微信 (绿色#7bc142) + 二维码浮层
 * FLOAT-008~011: 校长电话 (橙色#f5a623) + tel拨号
 * FLOAT-012~015: 回到顶部 (灰色#666) + 平滑滚动
 * FLOAT-016~020: Hover效果 (cursor: pointer, scale, 背景加深)
 */

export function FloatingContact({
  phone = WEB_SETTING_DEFAULTS.contactPhone1,
  wechatQrCode = "",
}: FloatingContactProps) {
  const [showWechat, setShowWechat] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);

  // 监听滚动显示回到顶部按钮
  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 300);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // 回到顶部
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="fixed right-3 bottom-16 md:right-4 md:bottom-20 z-50 flex flex-col items-end md:items-stretch gap-2.5 md:gap-3">
      {/* 移动端（<768px）收成纯图标胶囊，避免 132×192 的浮层压住正文与「立即咨询」按钮；
          桌面端（≥768px）保持 main 原样的「文字 + 圆形图标」胶囊 —— 1440/768 视觉基线零变化。 */}
      {/* [001~003] 在线客服 - 蓝色 - 统一跳转到 /apply AI 咨询页，source=float 区分入口 */}
      <a
        href="/apply?source=float"
        className="group flex items-center gap-3 bg-[#5b9bd5] hover:bg-[#4a8ac4] text-white rounded-full p-1 md:pl-4 md:pr-2 md:py-2 shadow-lg transition-all duration-300 hover:scale-105 cursor-pointer"
        data-interaction-id="FLOAT-001"
      >
        <span className="hidden md:inline text-sm font-medium">在线客服</span>
        <div 
          className="w-11 h-11 md:w-10 md:h-10 rounded-full bg-white/20 flex items-center justify-center group-hover:scale-110 transition-transform"
          data-interaction-id="FLOAT-002"
        >
          <MessageCircle className="w-5 h-5" />
        </div>
      </a>

      {/* [004~007] 官方微信 - 绿色 + 二维码浮层 */}
      <div className="relative">
        <button
          onClick={() => setShowWechat(!showWechat)}
          className="group flex items-center gap-3 bg-[#7bc142] hover:bg-[#6ab031] text-white rounded-full p-1 md:pl-4 md:pr-2 md:py-2 shadow-lg transition-all duration-300 hover:scale-105 cursor-pointer w-full"
          data-interaction-id="FLOAT-004"
        >
          <span className="hidden md:inline text-sm font-medium" data-interaction-id="FLOAT-006">官方微信</span>
          <div 
            className="w-11 h-11 md:w-10 md:h-10 rounded-full bg-white/20 flex items-center justify-center group-hover:scale-110 transition-transform"
            data-interaction-id="FLOAT-005"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 0 1 .213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 0 0 .167-.054l1.903-1.114a.864.864 0 0 1 .717-.098 10.16 10.16 0 0 0 2.837.403c.276 0 .543-.027.811-.05-.857-2.578.157-4.972 1.932-6.446 1.703-1.415 3.882-1.98 5.853-1.838-.576-3.583-4.196-6.348-8.596-6.348zM5.785 5.991c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178A1.17 1.17 0 0 1 4.623 7.17c0-.651.52-1.18 1.162-1.18zm5.813 0c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178 1.17 1.17 0 0 1-1.162-1.178c0-.651.52-1.18 1.162-1.18zm5.34 2.867c-1.797-.052-3.746.512-5.28 1.786-1.72 1.428-2.687 3.72-1.78 6.22.942 2.453 3.666 4.229 6.884 4.229.826 0 1.622-.12 2.361-.336a.722.722 0 0 1 .598.082l1.584.926a.272.272 0 0 0 .14.047c.134 0 .24-.111.24-.247 0-.06-.023-.12-.038-.177l-.327-1.233a.582.582 0 0 1-.023-.156.49.49 0 0 1 .201-.398C23.024 18.48 24 16.82 24 14.98c0-3.21-2.931-5.837-6.656-6.088V8.89c-.135-.01-.27-.027-.407-.03zm-2.53 3.274c.535 0 .969.44.969.982a.976.976 0 0 1-.969.983.976.976 0 0 1-.969-.983c0-.542.434-.982.97-.982zm4.844 0c.535 0 .969.44.969.982a.976.976 0 0 1-.969.983.976.976 0 0 1-.969-.983c0-.542.434-.982.969-.982z"/>
            </svg>
          </div>
        </button>

        {/* [007] 二维码浮层 */}
        {showWechat && (
          <div 
            className="absolute right-0 bottom-full mb-2 md:right-full md:bottom-0 md:mb-0 md:mr-3 bg-white rounded-lg shadow-xl p-3 w-48 border border-gray-200"
            data-interaction-id="FLOAT-007"
          >
            <p className="text-sm text-gray-600 mb-2 text-center">扫码添加微信</p>
            <div className="w-40 h-40 bg-gray-100 rounded-lg flex items-center justify-center">
              {wechatQrCode ? (
                // eslint-disable-next-line @next/next/no-img-element -- 用户上传的任意地址，与 ArticleContent 同理
                <img src={wechatQrCode} alt="微信二维码" className="w-full h-full object-contain" />
              ) : (
                <span className="text-xs text-gray-400">微信二维码</span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* [008~011] 校长电话 - 橙色 + tel拨号 - 从settings注入 */}
      <a
        href={`tel:${phone.replace(/-/g, "")}`}
        className="group flex items-center gap-3 bg-[#f5a623] hover:bg-[#e49513] text-white rounded-full p-1 md:pl-4 md:pr-2 md:py-2 shadow-lg transition-all duration-300 hover:scale-105 cursor-pointer"
        data-interaction-id="FLOAT-008"
      >
        <span className="hidden md:inline text-sm font-medium" data-interaction-id="FLOAT-010">校长电话</span>
        <div 
          className="w-11 h-11 md:w-10 md:h-10 rounded-full bg-white/20 flex items-center justify-center group-hover:scale-110 transition-transform"
          data-interaction-id="FLOAT-009"
        >
          <Phone className="w-5 h-5" />
        </div>
      </a>

      {/* [012~015] 回到顶部 - 灰色 + 平滑滚动 */}
      {showBackToTop && (
        <button
          onClick={scrollToTop}
          className="group flex items-center gap-3 bg-[#666666] hover:bg-[#555555] text-white rounded-full p-1 md:pl-4 md:pr-2 md:py-2 shadow-lg transition-all duration-300 hover:scale-105 cursor-pointer animate-in fade-in slide-in-from-bottom-2"
          data-interaction-id="FLOAT-012"
        >
          <span className="hidden md:inline text-sm font-medium" data-interaction-id="FLOAT-014">回到顶部</span>
          <div 
            className="w-11 h-11 md:w-10 md:h-10 rounded-full bg-white/20 flex items-center justify-center group-hover:-translate-y-1 transition-transform"
            data-interaction-id="FLOAT-013"
          >
            <ArrowUp className="w-5 h-5" />
          </div>
        </button>
      )}
    </div>
  );
}
