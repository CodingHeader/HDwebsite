/**
 * C-02：KnowledgeBackend **唯一注册表**（ADR-029）。
 * - `registerKnowledgeBackend(backend)`：注册（globalThis 存储，跨 HMR/多入口共享；同 C-01 的 llm 注册表纪律）
 * - `getKnowledgeBackend(name?)`：取指定后端；不传 name 取默认（coze 优先，回退 local）
 * - `registeredBackends()`：已注册后端名列表（供诊断/管理页展示）
 *
 * 与旧 API 的关系：`kb-sync.registerKbRemoteAdapter` 保留导出名，作为本注册表的**薄包装**（P06 兼容），
 * 保证 `collect-autokb.test.ts` 不改断言即通过。
 */
import type { KnowledgeBackend, KbBackendName } from "@/lib/kb/types";

type Store = { __hd_kb_backends__?: Map<KbBackendName, KnowledgeBackend> };
const g = globalThis as unknown as Store;

function store(): Map<KbBackendName, KnowledgeBackend> {
  if (!g.__hd_kb_backends__) g.__hd_kb_backends__ = new Map();
  return g.__hd_kb_backends__;
}

/** 注册（覆盖同名后端）；传 null 等价于清除该后端 */
export function registerKnowledgeBackend(backend: KnowledgeBackend | null): void {
  if (!backend) return;
  store().set(backend.name, backend);
}

/** 注销（测试/热重载用） */
export function unregisterKnowledgeBackend(name: KbBackendName): void {
  store().delete(name);
}

/** 取后端：指定 name 未注册返回 null；不指定则 coze 优先、回退 local */
export function getKnowledgeBackend(name?: KbBackendName): KnowledgeBackend | null {
  const m = store();
  if (name) return m.get(name) ?? null;
  return m.get("coze") ?? m.get("local") ?? null;
}

/** 已注册后端名（稳定顺序：local → coze） */
export function registeredBackends(): KbBackendName[] {
  const m = store();
  return (["local", "coze"] as KbBackendName[]).filter((n) => m.has(n));
}

/** 仅供测试清理 */
export function __clearKnowledgeBackends(): void {
  store().clear();
}
