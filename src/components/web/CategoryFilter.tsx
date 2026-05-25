"use client";

import Link from "next/link";

interface CategoryItem {
  id: number;
  name: string;
}

interface CategoryFilterProps {
  categories: CategoryItem[];
  currentCategory?: string | null;
}

export function CategoryFilter({ categories, currentCategory }: CategoryFilterProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <Link
        href="/courses"
        className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
          !currentCategory
            ? "bg-[#da251d] text-white"
            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
        }`}
      >
        全部
      </Link>
      {categories.map((category) => (
        <Link
          key={category.id}
          href={`/courses?category=${category.id}`}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
            currentCategory === String(category.id)
              ? "bg-[#da251d] text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          {category.name}
        </Link>
      ))}
    </div>
  );
}
