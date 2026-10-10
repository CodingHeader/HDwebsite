"use client";

import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";

interface Partner {
  id: number;
  name: string;
  logo: string;
  website: string | null;
}

interface PartnerUniversitiesProps {
  partners: Partner[];
}

export function PartnerUniversities({ partners }: PartnerUniversitiesProps) {
  return (
    <section className="bg-white py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold text-gray-900">招生院校</h2>
          <p className="text-gray-500">985/211热门名校供您选择</p>
        </div>

        {/* Partners Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-6">
          {partners.map((partner) => (
            <div
              key={partner.id}
              className="bg-white border rounded-lg p-4 flex flex-col items-center hover:shadow-lg transition-shadow"
            >
              {/* Logo */}
              <div className="relative w-20 h-20 rounded-full overflow-hidden bg-gray-50 mb-3 flex items-center justify-center">
                {partner.logo ? (
                  <Image
                    src={partner.logo}
                    alt={partner.name}
                    fill
                    sizes="80px"
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white font-bold text-lg">
                    {partner.name.charAt(0)}
                  </div>
                )}
              </div>

              {/* Name */}
              <h3 className="text-sm font-medium text-gray-900 text-center mb-3 line-clamp-1">
                {partner.name}
              </h3>

              {/* Buttons */}
              <div className="w-full space-y-2">
                <Link href="/apply" className="block">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-xs bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
                  >
                    立即咨询
                  </Button>
                </Link>
                <Link href="/courses" className="block">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-xs"
                  >
                    查看详情
                  </Button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
