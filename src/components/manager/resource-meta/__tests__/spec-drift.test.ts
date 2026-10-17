/**
 * E-01 spec-drift 护栏：crud-specs 的字段/枚举选项与冻结契约（src/contracts）一致性对照。
 * - 灰度纪律：先记录漂移（失败），逐资源修正后只剩"有意省略白名单"。
 * - 每个白名单项必须附理由（卡内步骤 1 的口径）。
 */
import { describe, expect, it } from "vitest";
import { crudPageSpecs as CRUD_SPECS } from "@/components/manager/crud-specs";
import { collectSourceCreateSchema, chatSceneCreateSchema } from "@/contracts/resources";

/** 冻结契约的 status 枚举真相源（resources.ts:259-261：draft/pending_review/offline） */
function enumOf(schema: { shape: Record<string, { options?: readonly string[] }> }, key: string): readonly string[] | undefined {
  const field = schema.shape[key];
  // zod enum 的 options（zod4：.options；防御性读取）
  return (field as { options?: readonly string[] } | undefined)?.options;
}

describe("E-01 spec-drift：content-items 状态枚举", () => {
  const spec = CRUD_SPECS["content-items"];
  it("spec 存在", () => {
    expect(spec).toBeDefined();
  });

  it("status 选项 ⊆ 冻结契约枚举（draft/pending_review/offline）", () => {
    const contractEnum = ["draft", "pending_review", "offline"];
    const options = (spec?.fields.find((f) => f.key === "status")?.options ?? []).map((o) => String(o.value));
    const drift = options.filter((o) => !contractEnum.includes(o));
    // 灰度：approved/published 的漂移应被记录（E-01 修正后此断言通过）
    expect(drift, `status 漂移项：${drift.join(",")}（冻结契约只接受 ${contractEnum.join("/")}）`).toHaveLength(0);
  });
});

describe("E-01 spec-drift：collect-sources 字段", () => {
  const spec = CRUD_SPECS["collect-sources"];
  it("spec 存在", () => {
    expect(spec).toBeDefined();
  });

  it("冻结契约字段（autoToKb/autoApprove/knowledgeBaseId）在 spec 中声明或列入白名单", () => {
    const contractKeys = ["autoToKb", "autoApprove", "knowledgeBaseId"];
    const specKeys = spec?.fields.map((f) => f.key) ?? [];
    const WHITELIST: Record<string, string> = {
      // 有意省略理由（E-01 步骤 2 口径）
    };
    const missing = contractKeys.filter((k) => !specKeys.includes(k) && !WHITELIST[k]);
    expect(missing, `collect-sources 缺失字段：${missing.join(",")}`).toHaveLength(0);
  });
});

describe("E-01 spec-drift：chat-scenes 字段", () => {
  const spec = CRUD_SPECS["chat-scenes"];
  it("spec 存在", () => {
    expect(spec).toBeDefined();
  });

  it("冻结契约字段（temperature/maxTokens/topP/llmProviderId）在 spec 中声明或白名单", () => {
    const contractKeys = ["temperature", "maxTokens", "topP", "llmProviderId"];
    const specKeys = spec?.fields.map((f) => f.key) ?? [];
    const WHITELIST: Record<string, string> = {};
    const missing = contractKeys.filter((k) => !specKeys.includes(k) && !WHITELIST[k]);
    expect(missing, `chat-scenes 缺失字段：${missing.join(",")}`).toHaveLength(0);
  });
});
