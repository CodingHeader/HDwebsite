"use client";

import { useState } from "react";

type CourseOption = { id: number; title: string };

export function ApplyForm({ courses }: { courses: CourseOption[] }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [courseId, setCourseId] = useState("");
  const [message, setMessage] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          phone,
          courseId: courseId ? Number(courseId) : null,
          message: message || null,
          sessionId: localStorage.getItem("hd_session_id") ?? undefined,
        }),
      });
      const body = (await res.json()) as { code: number; message: string };
      if (body.code === 200) {
        setDone(true);
        window.__hdTrack?.submit("apply", { courseId: courseId || null });
      } else {
        setError(body.message || "提交失败，请稍后重试");
      }
    } catch {
      setError("网络异常，请稍后重试");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 p-8 text-center">
        <p className="text-xl font-bold text-green-700">报名提交成功！</p>
        <p className="mt-2 text-sm text-green-700">招生老师将在工作时间尽快与您联系，请保持电话畅通。</p>
      </div>
    );
  }

  const inputCls = "w-full rounded-md border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40";

  return (
    <form onSubmit={submit} className="rounded-xl border border-border bg-card p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium">姓名 *</label>
          <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} required placeholder="您的姓名" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">电话 *</label>
          <input className={inputCls} value={phone} onChange={(e) => setPhone(e.target.value)} required placeholder="联系方式" type="tel" />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-sm font-medium">意向课程</label>
          <select className={inputCls} value={courseId} onChange={(e) => setCourseId(e.target.value)}>
            <option value="">请选择（可留空）</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>{c.title}</option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-sm font-medium">留言</label>
          <textarea className={inputCls} rows={3} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="想了解的层次/专业或其他问题" />
        </div>
      </div>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="mt-5 w-full rounded-md bg-primary py-3 font-semibold text-primary-foreground disabled:opacity-60"
      >
        {loading ? "提交中…" : "提交报名"}
      </button>
      <p className="mt-3 text-xs text-muted">提交即表示同意我们通过电话与您联系，您的信息仅用于报考服务。</p>
    </form>
  );
}
