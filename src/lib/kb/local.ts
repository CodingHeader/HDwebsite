/**
 * C-02：local 后端——包裹现有 `searchLocal`（行为**不变**，仅适配到 KnowledgeBackend 接口）。
 * - search：委托 kb-adapter.searchLocal（含 tags/take 语义）
 * - pushEntry：本地后端无"远端"，抛错提示（本地条目由 kb-sync 直接落库）
 * - 注册：模块加载时自动注册（幂等）；`ensureLocalBackend()` 供显式调用/测试
 */
import { searchLocal } from "@/lib/kb-adapter";
import type { KbHit } from "@/lib/kb-adapter";
import { registerKnowledgeBackend, getKnowledgeBackend } from "@/lib/kb/registry";
import type { KnowledgeBackend, KbSearchOptions } from "@/lib/kb/types";

export const localBackend: KnowledgeBackend = {
  name: "local",
  search: async (query: string, opts: KbSearchOptions = {}): Promise<KbHit[]> =>
    searchLocal(query, { tags: opts.tags, take: opts.take }),
  pushEntry: async () => {
    throw new Error("local 后端无远端推送能力：本地条目由 kb-sync.ingestCollectItem 直接落库");
  },
};

/** 确保 local 后端已注册（幂等；模块加载时已自动注册） */
export function ensureLocalBackend(): KnowledgeBackend {
  if (!getKnowledgeBackend("local")) registerKnowledgeBackend(localBackend);
  return getKnowledgeBackend("local")!;
}

// 模块加载即注册（由 kb-adapter / app 入口间接 import 时生效）
registerKnowledgeBackend(localBackend);
