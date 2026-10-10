import { prisma } from "@/lib/prisma";
import ApplyClient from "./ApplyClient";

export const dynamic = "force-dynamic";

/** 根据 URL `source` 参数推断场景 code */
function resolveSceneCode(src: string | undefined): string {
  if (!src) return "apply";
  if (src === "float") return "float";
  if (src === "guide") return "guide";
  // 专业类入口：major-business / major-tech / major-education / major-medicine 等
  if (src.startsWith("major-")) return src;
  return "apply";
}

interface ApplyPageProps {
  searchParams: Promise<{ source?: string }>;
}

export default async function ApplyPage({ searchParams }: ApplyPageProps) {
  const sp = await searchParams;
  const sceneCode = resolveSceneCode(sp?.source);

  // SSR 阶段直接从数据库拿 scene，避免客户端水合后闪烁
  const scene = await prisma.chatScene.findUnique({ where: { code: sceneCode } });

  return (
    <ApplyClient
      sceneCode={sceneCode}
      initialScene={scene}
    />
  );
}
