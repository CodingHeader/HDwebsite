import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { success, error } from "@/lib/api-response";
import { z } from "zod";
import { authenticateRequest } from "@/lib/api-auth";
import {
  resolveCampusCaption,
  resolveCampusName,
} from "@/lib/showcase";

export const dynamic = "force-dynamic";

const campusSchema = z.object({
  name: z.string().min(1, "校区名称不能为空"),
  address: z.string().optional(),
  sort: z.number().default(0),
  status: z.enum(["active", "inactive"]).default("active"),
  images: z.array(z.object({
    image: z.string(),
    caption: z.string().nullable().optional(),
  })).optional(),
});

type CampusListRecord = {
  id: number;
  name: string;
  address: string | null;
  sort: number;
  status: string;
  createdAt: Date;
  images: {
    id: number;
    campusId: number;
    image: string;
    caption: string | null;
    sort: number;
    createdAt: Date;
  }[];
};

// GET /api/campus - 获取校区列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    const authHeader = request.headers.get("authorization");
    const auth = authHeader ? await authenticateRequest(request) : null;

    if (auth?.response) {
      return auth.response;
    }

    const where = authHeader ? (status ? { status } : {}) : { status: "active" };

    const campusList = await prisma.campus.findMany({
      where,
      include: {
        images: {
          orderBy: { sort: "asc" },
        },
      },
      orderBy: [{ sort: "asc" }, { id: "desc" }],
    });

    const normalizedCampusList = campusList.map((campus: CampusListRecord, campusIndex: number) => ({
      ...campus,
      name: resolveCampusName(campus.name, campusIndex),
      images: campus.images.map((image: CampusListRecord["images"][number], imageIndex: number) => ({
        ...image,
        caption: resolveCampusCaption(
          image.caption,
          campus.name,
          campusIndex,
          imageIndex,
        ),
      })),
    }));

    return NextResponse.json(success(normalizedCampusList));
  } catch (err) {
    console.error("Error fetching campus list:", err);
    return NextResponse.json(error("获取校区列表失败"), { status: 500 });
  }
}

// POST /api/campus - 创建校区
export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if (auth.response) {
      return auth.response;
    }

    const body = await request.json();
    const result = campusSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(error(result.error.issues[0].message), { status: 400 });
    }

    const { images, ...campusData } = result.data;

    const campus = await prisma.campus.create({
      data: {
        ...campusData,
        images: images && images.length > 0 ? {
          create: images.map((img, idx) => ({
            image: img.image,
            caption: img.caption || null,
            sort: idx,
          })),
        } : undefined,
      },
      include: {
        images: true,
      },
    });

    return NextResponse.json(success(campus, "创建成功"));
  } catch (err) {
    console.error("Error creating campus:", err);
    return NextResponse.json(error("创建失败"), { status: 500 });
  }
}
