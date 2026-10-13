/**
 * crudSpecs 聚合入口（W0-02）：按域拆分后在此合并；键集合与切分前完全一致（w0-structure.test.ts 守卫）。
 */
import type { CrudSpec } from "@/lib/crud";
import { systemSpecs } from "./system";
import { contentSpecs } from "./content";
import { siteSpecs } from "./site";
import { collectSpecs } from "./collect";
import { mediaSpecs } from "./media";
import { kbAiSpecs } from "./kb-ai";

export const crudSpecs: Record<string, CrudSpec> = {
  ...systemSpecs,
  ...contentSpecs,
  ...siteSpecs,
  ...collectSpecs,
  ...mediaSpecs,
  ...kbAiSpecs,
};

export type { CrudSpec };
