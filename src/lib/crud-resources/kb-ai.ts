/*
 * crudSpecs · 知识库与 AI 域（W0-02 切分自 crud-resources.ts；仅搬迁，无行为变化）
 */
import type { CrudSpec } from "@/lib/crud";
import { chatSceneCreateSchema, knowledgeCreateSchema } from "@/contracts/resources";

export const kbAiSpecs: Record<string, CrudSpec> = {
  "chat-scenes": {
    model: "chatScene",
    permission: "setting",
    label: "AI 场景",
    searchFields: ["name", "code"],
    orderBy: [{ sort: "asc" }, { id: "asc" }],
    createSchema: chatSceneCreateSchema,
  },
  knowledge: {
    model: "knowledge",
    permission: "kb",
    label: "知识条目",
    searchFields: ["title", "content", "tags"],
    filters: { status: "string" },
    orderBy: [{ priority: "desc" }, { id: "desc" }],
    createSchema: knowledgeCreateSchema,
  },
};
