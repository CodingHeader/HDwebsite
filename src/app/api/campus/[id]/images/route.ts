import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { success, error } from "@/lib/api-response";
import { z } from "zod";

const campusImageSchema = z.object({
  image: z.string().min(1, "图片不能为空"),
  caption: z.string().optional(),
  sort: z.number().default(0),
});

// GET /api/campus/[id]/images - 获取校区图片列表
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const images = await prisma.campusImage.findMany({
      where: { campusId: parseInt(id) },
      orderBy: [{ sort: "asc" }, { id: "desc" }],
    });

    return NextResponse.json(success(images));
  } catch (err) {
    console.error("Error fetching campus images:", err);
    return NextResponse.json(error("获取图片列表失败"), { status: 500 });
  }
}

// POST /api/campus/[id]/images - 添加校区图片
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const result = campusImageSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(error(result.error.issues[0].message), { status: 400 });
    }

    const image = await prisma.campusImage.create({
      data: {
        ...result.data,
        campusId: parseInt(id),
      },
    });

    return NextResponse.json(success(image, "添加成功"));
  } catch (err) {
    console.error("Error creating campus image:", err);
    return NextResponse.json(error("添加失败"), { status: 500 });
  }
}
