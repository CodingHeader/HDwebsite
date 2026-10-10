import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

export function Breadcrumb({ items }: BreadcrumbProps) {
  return (
    <div className="bg-white border-b">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center text-sm text-gray-600">
          <Link href="/" className="hover:text-[#da251d] flex items-center gap-1">
            <Home className="w-3.5 h-3.5" />
            <span>首页</span>
          </Link>
          {items.map((item, index) => (
            <span key={index} className="flex items-center">
              <ChevronRight className="w-4 h-4 mx-2 text-gray-400" />
              {item.href && index < items.length - 1 ? (
                <Link href={item.href} className="hover:text-[#da251d]">
                  {item.label}
                </Link>
              ) : (
                <span className="text-gray-900 truncate max-w-[200px]">{item.label}</span>
              )}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
