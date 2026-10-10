export interface Student {
  id: number;
  name: string;
  phone: string;
  courseId: number;
  course?: {
    id: number;
    title: string;
  };
  message: string | null;
  status: string;
  createdAt: string;
}

export interface CreateStudentInput {
  name: string;
  phone: string;
  courseId: number;
  message?: string;
}

export interface UpdateStudentInput {
  status?: string;
}
