export interface Category {
  id: number;
  name: string;
  sort: number;
  createdAt: string;
  _count?: {
    courses: number;
  };
}

export interface CreateCategoryInput {
  name: string;
  sort?: number;
}

export interface UpdateCategoryInput {
  name?: string;
  sort?: number;
}
