/**
 * 校区类型定义 - 全站统一接口
 * 与 schema.prisma Campus/CampusImage 模型对齐
 */

// 校区图片 - 与 Prisma CampusImage 模型对齐
export interface CampusImage {
  id: number;
  image: string;
  caption: string | null;
  sort: number;
}

// 校区 - 与 Prisma Campus 模型对齐
export interface Campus {
  id: number;
  name: string;
  address: string | null;
  sort: number;
  status: string;
  images: CampusImage[];
}

// 前端展示用简化类型（仅首页展示）
export interface CampusDisplayItem {
  id: number;
  title: string;
  image: string;
}
