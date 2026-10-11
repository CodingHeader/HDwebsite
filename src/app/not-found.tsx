import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-24 text-center">
      <h1 className="text-2xl font-bold">页面不存在</h1>
      <p className="mt-3 text-muted">您访问的页面可能已被移动或删除。</p>
      <Link href="/" className="mt-6 inline-block rounded-md bg-primary px-5 py-2 text-primary-foreground">
        返回首页
      </Link>
    </div>
  );
}
