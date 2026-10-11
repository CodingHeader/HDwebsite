import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { ApplyForm } from "./ApplyForm";

export const dynamic = "force-dynamic";

export default async function ApplyPage() {
  const [scene, courses, settings] = await Promise.all([
    prisma.chatScene.findUnique({ where: { code: "apply" } }),
    prisma.course.findMany({ where: { status: "active" }, orderBy: { sort: "asc" }, select: { id: true, title: true } }),
    getSettings(),
  ]);
  const processSteps = (scene?.processSteps ?? "提交报名|老师回访|确认方案|签订协议|入学备考").split("|");

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="grid gap-10 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <h1 className="text-3xl font-bold">在线报名</h1>
          {scene?.pageTitle && <p className="mt-2 text-muted">{scene.pageSubtitle ?? scene.pageTitle}</p>}
          <ol className="mt-6 grid gap-3 sm:grid-cols-5">
            {processSteps.map((step, i) => (
              <li key={step} className="rounded-lg border border-border bg-card p-3 text-center text-sm">
                <span className="text-primary">{i + 1}.</span> {step}
              </li>
            ))}
          </ol>
          <div className="mt-8">
            <ApplyForm courses={courses} />
          </div>
        </div>
        <aside className="lg:col-span-2">
          <div className="rounded-xl border border-border bg-card p-6">
            <h2 className="text-lg font-bold">报考咨询</h2>
            {scene?.greeting && <p className="mt-2 text-sm text-muted">{scene.greeting}</p>}
            <p className="mt-4 text-sm text-muted">咨询热线</p>
            <p className="text-2xl font-bold text-primary">{settings.contactPhone}</p>
            <p className="mt-2 text-sm text-muted">{settings.workHours}</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
