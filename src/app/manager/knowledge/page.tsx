"use client";

/**
 * 知识条目（本地兜底库）+ 知识库管理入口（E-04，ADR-025）：库级管理（Coze 绑定/文件上传/检索测试）在「知识库」页
 */
import Link from "next/link";
import { Database } from "lucide-react";
import { CrudPage } from "@/components/manager/CrudPage";
import { crudPageSpecs } from "@/components/manager/crud-specs";
import { btnCls } from "@/components/manager/feedback";

export default function Page() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Link href="/manager/knowledge-bases" className={btnCls("secondary")} data-testid="knowledge-bases-entry">
          <Database aria-hidden="true" />
          知识库管理（Coze 绑定 / 文件上传 / 检索测试）
        </Link>
      </div>
      <CrudPage spec={crudPageSpecs["knowledge"]} />
    </div>
  );
}
