import { mkdir, writeFile } from 'fs/promises';
import path from 'path';

const apis = [
  // Articles
  {
    path: 'api/articles/route.ts',
    content: `import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { success, error } from "@/lib/api-response";

export async function GET(request: NextRequest) {
  try {
    const articles = await prisma.article.findMany({
      where: { status: "published" },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
    return NextResponse.json(success(articles));
  } catch (err) {
    return NextResponse.json(error("获取失败"), { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const article = await prisma.article.create({ data: body as any });
    return NextResponse.json(success(article, "创建成功"), { status: 201 });
  } catch (err) {
    return NextResponse.json(error("创建失败"), { status: 500 });
  }
}
`
  },
  {
    path: 'api/articles/[id]/route.ts',
    content: `import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { success, error } from "@/lib/api-response";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const article = await prisma.article.findUnique({ where: { id: parseInt(id) } });
    if (!article) return NextResponse.json(error("文章不存在"), { status: 404 });
    return NextResponse.json(success(article));
  } catch (err) {
    return NextResponse.json(error("获取失败"), { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const article = await prisma.article.update({ where: { id: parseInt(id) }, data: body as any });
    return NextResponse.json(success(article, "更新成功"));
  } catch (err) {
    return NextResponse.json(error("更新失败"), { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await prisma.article.delete({ where: { id: parseInt(id) } });
    return NextResponse.json(success(null, "删除成功"));
  } catch (err) {
    return NextResponse.json(error("删除失败"), { status: 500 });
  }
}
`
  },
  // Banners
  {
    path: 'api/banners/route.ts',
    content: `import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { success, error } from "@/lib/api-response";

export async function GET(request: NextRequest) {
  try {
    const banners = await prisma.banner.findMany({
      where: { status: "active" },
      orderBy: { sort: "asc" },
    });
    return NextResponse.json(success(banners));
  } catch (err) {
    return NextResponse.json(error("获取失败"), { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const banner = await prisma.banner.create({ data: body as any });
    return NextResponse.json(success(banner, "创建成功"), { status: 201 });
  } catch (err) {
    return NextResponse.json(error("创建失败"), { status: 500 });
  }
}
`
  },
  // Categories
  {
    path: 'api/categories/route.ts',
    content: `import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { success, error } from "@/lib/api-response";

export async function GET(request: NextRequest) {
  try {
    const categories = await prisma.category.findMany({ orderBy: { sort: "asc" } });
    return NextResponse.json(success(categories));
  } catch (err) {
    return NextResponse.json(error("获取失败"), { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const category = await prisma.category.create({ data: body as any });
    return NextResponse.json(success(category, "创建成功"), { status: 201 });
  } catch (err) {
    return NextResponse.json(error("创建失败"), { status: 500 });
  }
}
`
  },
  // Courses
  {
    path: 'api/courses/route.ts',
    content: `import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { success, error } from "@/lib/api-response";

export async function GET(request: NextRequest) {
  try {
    const courses = await prisma.course.findMany({ where: { status: "active" } });
    return NextResponse.json(success(courses));
  } catch (err) {
    return NextResponse.json(error("获取失败"), { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const course = await prisma.course.create({ data: body as any });
    return NextResponse.json(success(course, "创建成功"), { status: 201 });
  } catch (err) {
    return NextResponse.json(error("创建失败"), { status: 500 });
  }
}
`
  },
  // Users
  {
    path: 'api/users/route.ts',
    content: `import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { success, error } from "@/lib/api-response";

export async function GET(request: NextRequest) {
  try {
    const users = await prisma.user.findMany({ include: { role: true } });
    return NextResponse.json(success(users));
  } catch (err) {
    return NextResponse.json(error("获取失败"), { status: 500 });
  }
}
`
  },
  // Upload
  {
    path: 'api/upload/route.ts',
    content: `import { NextRequest, NextResponse } from "next/server";
import { success, error } from "@/lib/api-response";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    if (!file) return NextResponse.json(error("无文件"), { status: 400 });
    
    // Save file logic here
    return NextResponse.json(success({ url: "/uploads/" + file.name }, "上传成功"));
  } catch (err) {
    return NextResponse.json(error("上传失败"), { status: 500 });
  }
}
`
  },
  // Partners
  {
    path: 'api/partners/route.ts',
    content: `import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { success, error } from "@/lib/api-response";

export async function GET(request: NextRequest) {
  try {
    const partners = await prisma.partner.findMany({ where: { status: "active" } });
    return NextResponse.json(success(partners));
  } catch (err) {
    return NextResponse.json(error("获取失败"), { status: 500 });
  }
}
`
  },
  // Gallery
  {
    path: 'api/gallery/route.ts',
    content: `import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { success, error } from "@/lib/api-response";

export async function GET(request: NextRequest) {
  try {
    const items = await prisma.gallery.findMany({ where: { status: "active" } });
    return NextResponse.json(success(items));
  } catch (err) {
    return NextResponse.json(error("获取失败"), { status: 500 });
  }
}
`
  },
  // Students
  {
    path: 'api/students/route.ts',
    content: `import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { success, error } from "@/lib/api-response";

export async function GET(request: NextRequest) {
  try {
    const students = await prisma.student.findMany();
    return NextResponse.json(success(students));
  } catch (err) {
    return NextResponse.json(error("获取失败"), { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const student = await prisma.student.create({ data: body as any });
    return NextResponse.json(success(student, "创建成功"), { status: 201 });
  } catch (err) {
    return NextResponse.json(error("创建失败"), { status: 500 });
  }
}
`
  },
  // Campus
  {
    path: 'api/campus/route.ts',
    content: `import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { success, error } from "@/lib/api-response";

export async function GET(request: NextRequest) {
  try {
    const campuses = await prisma.campus.findMany({ where: { status: "active" } });
    return NextResponse.json(success(campuses));
  } catch (err) {
    return NextResponse.json(error("获取失败"), { status: 500 });
  }
}
`
  },
  // Tags
  {
    path: 'api/tags/route.ts',
    content: `import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { success, error } from "@/lib/api-response";

export async function GET(request: NextRequest) {
  try {
    const tags = await prisma.tag.findMany();
    return NextResponse.json(success(tags));
  } catch (err) {
    return NextResponse.json(error("获取失败"), { status: 500 });
  }
}
`
  },
  // News
  {
    path: 'api/news/route.ts',
    content: `import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { success, error } from "@/lib/api-response";

export async function GET(request: NextRequest) {
  try {
    const news = await prisma.news.findMany({ where: { status: "published" } });
    return NextResponse.json(success(news));
  } catch (err) {
    return NextResponse.json(error("获取失败"), { status: 500 });
  }
}
`
  },
  // Navigations
  {
    path: 'api/navigations/route.ts',
    content: `import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { success, error } from "@/lib/api-response";

export async function GET(request: NextRequest) {
  try {
    const navs = await prisma.navigation.findMany({ where: { status: "active" } });
    return NextResponse.json(success(navs));
  } catch (err) {
    return NextResponse.json(error("获取失败"), { status: 500 });
  }
}
`
  },
  // Roles
  {
    path: 'api/roles/route.ts',
    content: `import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { success, error } from "@/lib/api-response";

export async function GET(request: NextRequest) {
  try {
    const roles = await prisma.role.findMany();
    return NextResponse.json(success(roles));
  } catch (err) {
    return NextResponse.json(error("获取失败"), { status: 500 });
  }
}
`
  },
  // Knowledge
  {
    path: 'api/knowledge/route.ts',
    content: `import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { success, error } from "@/lib/api-response";

export async function GET(request: NextRequest) {
  try {
    const items = await prisma.knowledge.findMany({ where: { status: "active" } });
    return NextResponse.json(success(items));
  } catch (err) {
    return NextResponse.json(error("获取失败"), { status: 500 });
  }
}
`
  },
  // Service Guides
  {
    path: 'api/service-guides/route.ts',
    content: `import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { success, error } from "@/lib/api-response";

export async function GET(request: NextRequest) {
  try {
    const guides = await prisma.serviceGuide.findMany({ where: { status: "active" } });
    return NextResponse.json(success(guides));
  } catch (err) {
    return NextResponse.json(error("获取失败"), { status: 500 });
  }
}
`
  },
  // Hot Majors
  {
    path: 'api/hot-majors/route.ts',
    content: `import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { success, error } from "@/lib/api-response";

export async function GET(request: NextRequest) {
  try {
    const majors = await prisma.hotMajor.findMany({ where: { status: "active" } });
    return NextResponse.json(success(majors));
  } catch (err) {
    return NextResponse.json(error("获取失败"), { status: 500 });
  }
}
`
  },
  // Media
  {
    path: 'api/media/route.ts',
    content: `import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { success, error } from "@/lib/api-response";

export async function GET(request: NextRequest) {
  try {
    const media = await prisma.media.findMany();
    return NextResponse.json(success(media));
  } catch (err) {
    return NextResponse.json(error("获取失败"), { status: 500 });
  }
}
`
  },
  // Chat History
  {
    path: 'api/chat-history/route.ts',
    content: `import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { success, error } from "@/lib/api-response";

export async function GET(request: NextRequest) {
  try {
    const history = await prisma.aIChatHistory.findMany({ orderBy: { createdAt: "desc" } });
    return NextResponse.json(success(history));
  } catch (err) {
    return NextResponse.json(error("获取失败"), { status: 500 });
  }
}
`
  },
  // Chat Scenes
  {
    path: 'api/chat-scenes/route.ts',
    content: `import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { success, error } from "@/lib/api-response";

export async function GET(request: NextRequest) {
  try {
    const scenes = await prisma.chatScene.findMany({ where: { status: "active" } });
    return NextResponse.json(success(scenes));
  } catch (err) {
    return NextResponse.json(error("获取失败"), { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const scene = await prisma.chatScene.create({ data: body as any });
    return NextResponse.json(success(scene, "创建成功"), { status: 201 });
  } catch (err) {
    return NextResponse.json(error("创建失败"), { status: 500 });
  }
}
`
  },
  // Home Cards
  {
    path: 'api/home-cards/route.ts',
    content: `import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { success, error } from "@/lib/api-response";

export async function GET(request: NextRequest) {
  try {
    const cards = await prisma.homeCard.findMany({ where: { status: "active" } });
    return NextResponse.json(success(cards));
  } catch (err) {
    return NextResponse.json(error("获取失败"), { status: 500 });
  }
}
`
  },
  // Banners Settings
  {
    path: 'api/banners/settings/route.ts',
    content: `import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    for (const [key, value] of Object.entries(body)) {
      await prisma.setting.upsert({
        where: { key },
        update: { value: String(value), updatedAt: new Date() },
        create: { key, value: String(value), updatedAt: new Date() },
      });
    }
    return NextResponse.json({ code: 200, message: "保存成功" });
  } catch (err) {
    return NextResponse.json({ code: 500, message: "保存失败" }, { status: 500 });
  }
}
`
  },
  // Conversations [id]
  {
    path: 'api/conversations/[id]/route.ts',
    content: `import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { success, error } from "@/lib/api-response";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const conv = await prisma.conversation.findUnique({
      where: { id },
      include: { messages: true },
    });
    if (!conv) return NextResponse.json(error("对话不存在"), { status: 404 });
    return NextResponse.json(success(conv));
  } catch (err) {
    return NextResponse.json(error("获取失败"), { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await prisma.conversation.delete({ where: { id } });
    return NextResponse.json(success(null, "删除成功"));
  } catch (err) {
    return NextResponse.json(error("删除失败"), { status: 500 });
  }
}
`
  },
  // Auth logout
  {
    path: 'api/auth/logout/route.ts',
    content: `import { NextRequest, NextResponse } from "next/server";
import { success } from "@/lib/api-response";

export async function POST(request: NextRequest) {
  return NextResponse.json(success(null, "退出成功"));
}
`
  }
];

const baseDir = path.join(process.cwd(), 'src', 'app');

for (const api of apis) {
  const fullPath = path.join(baseDir, api.path);
  const dir = path.dirname(fullPath);
  
  await mkdir(dir, { recursive: true });
  await writeFile(fullPath, api.content, 'utf-8');
  console.log(`Created: ${api.path}`);
}

console.log('\nAll APIs created!');
