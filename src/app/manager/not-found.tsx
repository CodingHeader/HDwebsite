import Link from "next/link";

/**
 * 管理端 404（E-06，P02-execution:86 承接）：管理端布局内渲染（继承 [data-theme="manager"] 令牌）。
 */
export default function ManagerNotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-5xl font-bold text-mgr-primary">404</p>
      <h1 className="text-lg font-semibold text-mgr-fg">页面不存在或已被移除</h1>
      <p className="max-w-md text-[13px] text-mgr-muted-fg">请检查地址是否正确，或从左侧菜单进入对应功能页。</p>
      <Link
        href="/manager"
        className="inline-flex h-9 items-center rounded-mgr-control bg-mgr-primary px-4 text-[13px] font-medium text-mgr-primary-fg hover:bg-mgr-primary-hover"
      >
        返回仪表盘
      </Link>
    </div>
  );
}
