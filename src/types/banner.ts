export interface Banner {
  id: number;
  image: string;
  link: string | null;
  sort: number;
  status: string;
  createdAt: string;
}

export interface CreateBannerInput {
  image: string;
  link?: string;
  sort?: number;
  status?: string;
}

export interface UpdateBannerInput {
  image?: string;
  link?: string;
  sort?: number;
  status?: string;
}
