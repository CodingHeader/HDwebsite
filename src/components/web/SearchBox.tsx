"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";

interface SearchBoxProps {
  defaultValue?: string;
  placeholder?: string;
  basePath?: string;
  extraParams?: Record<string, string>;
}

export function SearchBox({
  defaultValue = "",
  placeholder = "搜索课程...",
  basePath = "/courses",
  extraParams = {},
}: SearchBoxProps) {
  const router = useRouter();
  const [query, setQuery] = useState(defaultValue);

  const buildUrl = (q: string) => {
    const params = new URLSearchParams();
    if (q.trim()) {
      params.set("q", q.trim());
    }
    Object.entries(extraParams).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
    const search = params.toString();
    return search ? `${basePath}?${search}` : basePath;
  };

  const handleSearch = () => {
    router.push(buildUrl(query));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const handleClear = () => {
    setQuery("");
    router.push(buildUrl(""));
  };

  return (
    <div className="flex gap-2">
      <div className="relative flex-1">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#da251d]/50 focus:border-[#da251d] text-sm"
        />
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        {query && (
          <button
            onClick={handleClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
      <button
        onClick={handleSearch}
        className="px-4 py-2 bg-[#da251d] text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
      >
        搜索
      </button>
    </div>
  );
}
