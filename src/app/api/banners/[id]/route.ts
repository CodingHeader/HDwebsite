import { crudGet, crudUpdate, crudDelete } from "@/lib/crud";
import { crudSpecs } from "@/lib/crud-resources";

const spec = crudSpecs["banners"];
export const dynamic = "force-dynamic";

export const GET = crudGet(spec);
export const PUT = crudUpdate(spec);
export const DELETE = crudDelete(spec);
