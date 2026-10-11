import { crudGet, crudDelete } from "@/lib/crud";
import { crudSpecs } from "@/lib/crud-resources";

const spec = crudSpecs["media"];
export const dynamic = "force-dynamic";

export const GET = crudGet(spec);
export const DELETE = crudDelete(spec);
