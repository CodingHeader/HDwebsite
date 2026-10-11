import { crudList } from "@/lib/crud";
import { crudSpecs } from "@/lib/crud-resources";

export const dynamic = "force-dynamic";

export const GET = crudList(crudSpecs["user-actions"]);
