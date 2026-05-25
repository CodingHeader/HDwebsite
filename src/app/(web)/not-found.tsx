import Link from "next/link";
import { Home, ArrowLeft, Search } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="text-8xl font-bold text-gray-200 mb-4">404</div>
        <h2 className="text-2xl font-bold text-gray-800 mb-3">页面未找到</h2>
        <p className="text-gray-600 mb-8">
          您访问的页面不存在或已被移除，请检查网址是否正确。
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#da251d] text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            <Home className="w-4 h-4" />
            返回首页
          </Link>
          <Link
            href="/courses"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Search className="w-4 h-4" />
            浏览课程
          </Link>
        </div>
      </div>
    </div>
  );
}
