export interface News {
  id: number;
  title: string;
  content: string | null;
  cover: string | null;
  views: number;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateNewsInput {
  title: string;
  content?: string;
  cover?: string;
  status?: string;
}

export interface UpdateNewsInput {
  title?: string;
  content?: string;
  cover?: string;
  status?: string;
}
