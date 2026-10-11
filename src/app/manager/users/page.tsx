"use client";

import { CrudPage } from "@/components/manager/CrudPage";
import { crudPageSpecs } from "@/components/manager/crud-specs";

export default function Page() {
  return <CrudPage spec={crudPageSpecs["users"]} />;
}
