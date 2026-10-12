"use client";

import { CrudPage } from "@/components/manager/CrudPage";
import { crudPageSpecs } from "@/components/manager/crud-specs";

/** 操作日志（只读；GET /api/logs，log:list） */
export default function Page() {
  return <CrudPage spec={crudPageSpecs["logs"]} />;
}
