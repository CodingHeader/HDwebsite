import { ApiResponse, PaginatedResponse } from "@/types";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "";

async function fetchApi<T>(
  url: string,
  options?: RequestInit
): Promise<ApiResponse<T>> {
  const response = await fetch(`${BASE_URL}${url}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  return response.json();
}

// 课程 API
export async function getCourses(params?: {
  category?: string;
  page?: number;
  limit?: number;
}) {
  const searchParams = new URLSearchParams();
  if (params?.category) searchParams.set("category", params.category);
  if (params?.page) searchParams.set("page", String(params.page));
  if (params?.limit) searchParams.set("limit", String(params.limit));

  const query = searchParams.toString();
  return fetchApi<PaginatedResponse<Course>>(`/api/courses${query ? `?${query}` : ""}`);
}

export async function getCourse(id: string) {
  return fetchApi<Course>(`/api/courses/${id}`);
}

// 新闻 API
export async function getNews(params?: {
  page?: number;
  limit?: number;
}) {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set("page", String(params.page));
  if (params?.limit) searchParams.set("limit", String(params.limit));

  const query = searchParams.toString();
  return fetchApi<PaginatedResponse<News>>(`/api/news${query ? `?${query}` : ""}`);
}

export async function getNewsDetail(id: string) {
  return fetchApi<News>(`/api/news/${id}`);
}

// 轮播图 API
export async function getBanners() {
  return fetchApi<Banner[]>("/api/banners");
}

// 分类 API
export async function getCategories() {
  return fetchApi<Category[]>("/api/categories");
}

// 学员报名 API
export async function createStudent(data: {
  name: string;
  phone: string;
  courseId: number;
  message?: string;
}) {
  return fetchApi("/api/students", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// 设置 API
export async function getSettings() {
  return fetchApi<Record<string, string | null>>("/api/settings");
}

import type { Course, News, Banner, Category } from "@/types";
