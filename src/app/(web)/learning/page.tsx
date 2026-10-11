import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export default async function LearningPage() {
  const s = await getSettings();
  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-3xl font-bold">学历提升</h1>
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {["自考", "成人高考", "开放大学"].map((item) => (
          <a key={item} href="/apply" className="rounded-xl border border-border bg-card p-8 text-center hover:border-primary">
            <p className="text-xl font-bold">{item}</p>
            <p className="mt-2 text-sm text-muted">点击咨询 →</p>
          </a>
        ))}
      </div>
      <p className="mt-8 leading-7 text-muted">{s.companyIntro}</p>
    </div>
  );
}
