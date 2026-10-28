/**
 * V1.8-COMPAT：/manager/ai-config 兼容入口 —— 旧站路径重定向到模型供应商管理
 * （原版 AIConfig 已由 LLMProvider 取代，ADR-023/ADR-005；旧链接/收藏可达）
 *
 * API 层已有对称兼容：src/app/api/ai-config/route.ts 以 307 映射到 /api/llm/providers。
 * 本页补页面层，避免「API 能通但页面 404」的不对称。
 */
import { redirect } from "next/navigation";

export default function AiConfigCompatPage() {
  redirect("/manager/llm-providers");
}