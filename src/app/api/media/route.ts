import { crudList } from "@/lib/crud";
import { crudSpecs } from "@/lib/crud-resources";
import { withMissingFiles } from "@/lib/crud-resources/media";

export const dynamic = "force-dynamic";

export const GET = async (request: Request, ctx?: unknown) => {
  const res = await crudList(crudSpecs["media"])(request, ctx as Parameters<ReturnType<typeof crudList>>[1]);
  if (res.status !== 200) return res;
  const body = (await res.json()) as { code: number; message: string; data?: { list?: Record<string, unknown>[] } };
  if (!body?.data?.list) return res;
  body.data.list = withMissingFiles(body.data.list as { id: number; url?: string | null }[]).map((row) => ({ ...row }) as Record<string, unknown>);
  return Response.json(body);
};