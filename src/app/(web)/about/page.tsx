import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export default async function AboutPage() {
  const s = await getSettings();
  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-3xl font-bold">关于我们</h1>
      <div className="mt-6 leading-8 text-muted">
        <p>{s.companyIntro}</p>
        <p className="mt-4">{s.companySlogan}</p>
      </div>
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {(s.statsText || "11年办学经验|10000+服务学员|98%通过率").split("|").map((item) => (
          <div key={item} className="rounded-lg border border-border bg-card p-6 text-center">
            <p className="text-xl font-bold text-primary">{item}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
