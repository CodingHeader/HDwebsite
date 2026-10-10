import { mkdir, writeFile } from 'fs/promises';
import path from 'path';

// Define all missing APIs with simple implementations
const apis = [
  { path: 'api/categories/[id]/route.ts', methods: ['GET', 'PUT', 'DELETE'], model: 'category' },
  { path: 'api/courses/[id]/route.ts', methods: ['GET', 'PUT', 'DELETE'], model: 'course' },
  { path: 'api/gallery/[id]/route.ts', methods: ['GET', 'PUT', 'DELETE'], model: 'gallery' },
  { path: 'api/home-cards/[id]/route.ts', methods: ['GET', 'PUT', 'DELETE'], model: 'homeCard' },
  { path: 'api/hot-majors/[id]/route.ts', methods: ['GET', 'PUT', 'DELETE'], model: 'hotMajor' },
  { path: 'api/knowledge/[id]/route.ts', methods: ['GET', 'PUT', 'DELETE'], model: 'knowledge' },
  { path: 'api/media/[id]/route.ts', methods: ['GET', 'PUT', 'DELETE'], model: 'media' },
  { path: 'api/navigations/[id]/route.ts', methods: ['GET', 'PUT', 'DELETE'], model: 'navigation' },
  { path: 'api/news/[id]/route.ts', methods: ['GET', 'PUT', 'DELETE'], model: 'news' },
  { path: 'api/partners/[id]/route.ts', methods: ['GET', 'PUT', 'DELETE'], model: 'partner' },
  { path: 'api/roles/[id]/route.ts', methods: ['GET', 'PUT', 'DELETE'], model: 'role' },
  { path: 'api/service-guides/[id]/route.ts', methods: ['GET', 'PUT', 'DELETE'], model: 'serviceGuide' },
  { path: 'api/settings/[id]/route.ts', methods: ['GET', 'PUT', 'DELETE'], model: 'setting' },
  { path: 'api/students/[id]/route.ts', methods: ['GET', 'PUT', 'DELETE'], model: 'student' },
  { path: 'api/tags/[id]/route.ts', methods: ['GET', 'PUT', 'DELETE'], model: 'tag' },
  { path: 'api/users/[id]/route.ts', methods: ['GET', 'PUT', 'DELETE'], model: 'user' },
  { path: 'api/chat-scenes/[id]/route.ts', methods: ['GET', 'PUT', 'DELETE'], model: 'chatScene' },
  { path: 'api/chat-history/[id]/route.ts', methods: ['GET', 'PUT', 'DELETE'], model: 'aIChatHistory' },
];

function generateRouteContent(model, methods) {
  const imports = `import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { success, error } from "@/lib/api-response";`;

  const getMethod = methods.includes('GET') ? `
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const item = await prisma.${model}.findUnique({ where: { id: parseInt(id) } });
    if (!item) return NextResponse.json(error("记录不存在"), { status: 404 });
    return NextResponse.json(success(item));
  } catch (err) {
    return NextResponse.json(error("获取失败"), { status: 500 });
  }
}` : '';

  const putMethod = methods.includes('PUT') ? `
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const item = await prisma.${model}.update({ where: { id: parseInt(id) }, data: body as any });
    return NextResponse.json(success(item, "更新成功"));
  } catch (err) {
    return NextResponse.json(error("更新失败"), { status: 500 });
  }
}` : '';

  const deleteMethod = methods.includes('DELETE') ? `
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await prisma.${model}.delete({ where: { id: parseInt(id) } });
    return NextResponse.json(success(null, "删除成功"));
  } catch (err) {
    return NextResponse.json(error("删除失败"), { status: 500 });
  }
}` : '';

  return [imports, getMethod, putMethod, deleteMethod].filter(Boolean).join('\n');
}

const baseDir = path.join(process.cwd(), 'src', 'app');

for (const api of apis) {
  const fullPath = path.join(baseDir, api.path);
  const dir = path.dirname(fullPath);
  
  await mkdir(dir, { recursive: true });
  const content = generateRouteContent(api.model, api.methods);
  await writeFile(fullPath, content, 'utf-8');
  console.log(`Created: ${api.path}`);
}

console.log('\nAll missing APIs created!');
