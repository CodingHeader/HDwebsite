import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export default async function ContactPage() {
  const s = await getSettings();
  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-3xl font-bold">联系我们</h1>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {[
          { label: "咨询热线", value: s.contactPhone },
          { label: "备用电话", value: s.contactPhone1 },
          { label: "座机", value: s.contactPhone2 },
          { label: "邮箱", value: s.contactEmail },
        ]
          .filter((r) => r.value)
          .map((r) => (
            <div key={r.label} className="rounded-lg border border-border bg-card p-5">
              <p className="text-sm text-muted">{r.label}</p>
              <p className="mt-1 text-lg font-semibold">{r.value}</p>
            </div>
          ))}
      </div>
      <div className="mt-6 rounded-lg border border-border bg-card p-5">
        <p className="text-sm text-muted">地址</p>
        <p className="mt-1">{s.address}</p>
        <p className="mt-2 text-sm text-muted">{s.workHours}</p>
      </div>
    </div>
  );
}
