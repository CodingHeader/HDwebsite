/** Forbidden（契约⑥ forbidden）：当前账号无权访问本页 */
import Link from "next/link";
import { ShieldOff } from "lucide-react";
import { btnCls } from "./styles";

interface ForbiddenProps {
  message?: string;
}

export function Forbidden({ message }: ForbiddenProps) {
  return (
    <div
      data-testid="forbidden"
      role="alert"
      className="flex flex-col items-center justify-center px-6 py-20 text-center"
    >
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-mgr-subtle text-mgr-muted-fg" aria-hidden="true">
        <ShieldOff className="h-7 w-7" />
      </span>
      <h2 className="mt-5 text-[18px] font-semibold text-mgr-fg">没有访问权限</h2>
      <p className="mt-1.5 max-w-md text-[13px] text-mgr-muted-fg">
        {message || "当前账号没有查看此页面的权限。"}如需开通，请联系超级管理员在「角色管理」中授予相应权限。
      </p>
      <Link href="/manager" className={`${btnCls("secondary")} mt-6`}>
        返回仪表盘
      </Link>
    </div>
  );
}
