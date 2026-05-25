export interface Course {
  id: number;
  title: string;
  description: string | null;
  price: number;
  duration: string | null;
  outline: string | null;
  cover: string | null;
  status: string;
  categoryId: number;
  category?: {
    id: number;
    name: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface CreateCourseInput {
  title: string;
  description?: string;
  price?: number;
  duration?: string;
  outline?: string;
  cover?: string;
  status?: string;
  categoryId: number;
}

export interface UpdateCourseInput {
  title?: string;
  description?: string;
  price?: number;
  duration?: string;
  outline?: string;
  cover?: string;
  status?: string;
  categoryId?: number;
}
