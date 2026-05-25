import { NextResponse } from "next/server";
import { success } from "@/lib/api-response";

// GET /api - API根路径
export async function GET() {
  return NextResponse.json(
    success({
      name: "弘道经理学院专升本教育官网 API",
      version: "1.0.0",
      endpoints: {
        auth: {
          "POST /api/auth/login": "管理员登录",
          "GET /api/auth/me": "获取当前用户信息",
        },
        courses: {
          "GET /api/courses": "获取课程列表",
          "POST /api/courses": "创建课程",
          "GET /api/courses/:id": "获取课程详情",
          "PUT /api/courses/:id": "更新课程",
          "DELETE /api/courses/:id": "删除课程",
        },
        news: {
          "GET /api/news": "获取新闻列表",
          "POST /api/news": "创建新闻",
          "GET /api/news/:id": "获取新闻详情",
          "PUT /api/news/:id": "更新新闻",
          "DELETE /api/news/:id": "删除新闻",
        },
        students: {
          "GET /api/students": "获取学员列表",
          "POST /api/students": "提交报名",
          "GET /api/students/:id": "获取学员详情",
          "PUT /api/students/:id": "更新学员状态",
          "DELETE /api/students/:id": "删除学员",
        },
        banners: {
          "GET /api/banners": "获取轮播图列表",
          "POST /api/banners": "创建轮播图",
          "PUT /api/banners/:id": "更新轮播图",
          "DELETE /api/banners/:id": "删除轮播图",
        },
        categories: {
          "GET /api/categories": "获取分类列表",
          "POST /api/categories": "创建分类",
          "PUT /api/categories/:id": "更新分类",
          "DELETE /api/categories/:id": "删除分类",
        },
        settings: {
          "GET /api/settings": "获取所有设置",
          "POST /api/settings": "批量更新设置",
        },
        upload: {
          "POST /api/upload": "上传图片文件",
        },
      },
    }, "欢迎使用弘道经理学院专升本教育官网 API")
  );
}
