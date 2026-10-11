"use client";

export default function WebError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto max-w-4xl px-4 py-24 text-center">
      <h1 className="text-2xl font-bold">页面出错了</h1>
      <p className="mt-3 text-muted">抱歉，页面加载出现问题，请稍后重试。</p>
      <button
        onClick={reset}
        className="mt-6 rounded-md bg-primary px-5 py-2 text-primary-foreground"
      >
        重试
      </button>
    </div>
  );
}
