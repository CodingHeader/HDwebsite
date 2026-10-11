import { crudList, crudCreate } from "@/lib/crud";
import { crudSpecs } from "@/lib/crud-resources";

const spec = crudSpecs["collect-sources"];
export const dynamic = "force-dynamic";

export const GET = crudList(spec);
export const POST = crudCreate(spec);
