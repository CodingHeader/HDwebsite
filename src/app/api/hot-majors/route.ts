import { crudList, crudCreate } from "@/lib/crud";
import { crudSpecs } from "@/lib/crud-resources";

const spec = crudSpecs["hot-majors"];
export const dynamic = "force-dynamic";

export const GET = crudList(spec);
export const POST = crudCreate(spec);
