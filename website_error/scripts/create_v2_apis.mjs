import { mkdir, writeFile } from 'fs/promises';
import path from 'path';

const v2Apis = [
  {
    path: 'api/v2/blocks/route.ts',
    content: `import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { success } from "@/lib/api-response";

export async function GET(request: NextRequest) {
  const blocks = await prisma.contentBlock.findMany({ where: { status: "active" } });
  return NextResponse.json(success(blocks));
}
`
  },
  {
    path: 'api/v2/media/[id]/route.ts',
    content: `import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { success, error } from "@/lib/api-response";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const media = await prisma.media.findUnique({ where: { id: parseInt(id) } });
    if (!media) return NextResponse.json(error("媒体不存在"), { status: 404 });
    return NextResponse.json(success(media));
  } catch (err) {
    return NextResponse.json(error("获取失败"), { status: 500 });
  }
}
`
  },
  {
    path: 'api/v2/settings/route.ts',
    content: `import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { success } from "@/lib/api-response";

export async function GET(request: NextRequest) {
  const settings = await prisma.setting.findMany();
  const map = Object.fromEntries(settings.map(s => [s.key, s.value]));
  return NextResponse.json(success(map));
}
`
  },
  {
    path: 'api/v2/settings/registry/route.ts',
    content: `import { NextRequest, NextResponse } from "next/server";
import { success } from "@/lib/api-response";

export async function GET(request: NextRequest) {
  return NextResponse.json(success([]));
}
`
  }
];

const baseDir = path.join(process.cwd(), 'src', 'app');

for (const api of v2Apis) {
  const fullPath = path.join(baseDir, api.path);
  const dir = path.dirname(fullPath);
  
  await mkdir(dir, { recursive: true });
  await writeFile(fullPath, api.content, 'utf-8');
  console.log(`Created: ${api.path}`);
}

console.log('\nV2 APIs created!');
