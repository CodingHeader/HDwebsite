/*
 * crudSpecs · 知识库与 AI 域（W0-02 切分自 crud-resources.ts；仅搬迁，无行为变化）
 * C-07：chat-scenes 接线 jsonifyFields(["baseIds","providerIds"])——管理端按契约存 JSON 数组串；
 *       旧数据（逗号文本）由 chat-service.parseIdListField 兼容读取。
 */
import type { CrudSpec } from "@/lib/crud";
import { chatSceneCreateSchema, knowledgeCreateSchema } from "@/contracts/resources";
import { jsonifyArray } from "./shared";

export const kbAiSpecs: Record<string, CrudSpec> = {
  "chat-scenes": {
    model: "chatScene",
    permission: "setting",
    label: "AI 场景",
    searchFields: ["name", "code"],
    orderBy: [{ sort: "asc" }, { id: "asc" }],
    createSchema: chatSceneCreateSchema,
    ...jsonifyArray(["baseIds", "providerIds"]),
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
