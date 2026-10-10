import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function proxy(request: NextRequest) {
  // 移除页面路由认证拦截，认证守卫完全交由客户端 layout.tsx 处理
  // API 路由本身已有 requireAuth 中间件保护
  return NextResponse.next();
}

export const config = {
  matcher: ['/manager/:path*'],
};
