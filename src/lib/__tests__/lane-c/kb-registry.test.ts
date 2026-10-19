/**
 * C-02 单测：KnowledgeBackend 统一注册表 + local 后端 + 旧 API 薄包装兼容。
 * - 唯一注册表语义：register/get/registeredBackends/unregister
 * - local 后端：search 委托 searchLocal（行为不变）、pushEntry 明确报错
 * - 兼容：registerKbRemoteAdapter 仍可用（包装到 coze 后端，collect-autokb 不变）
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  registerKnowledgeBackend,
  getKnowledgeBackend,
  registeredBackends,
  unregisterKnowledgeBackend,
  __clearKnowledgeBackends,
} from "@/lib/kb/registry";
import { ensureLocalBackend, localBackend } from "@/lib/kb/local";
import { registerKbRemoteAdapter, getKbRemoteAdapter } from "@/lib/kb-sync";
import type { KnowledgeBackend } from "@/lib/kb/types";

afterEach(() => {
  __clearKnowledgeBackends();
  registerKbRemoteAdapter(null);
});

function fakeBackend(name: "coze" | "local", tag: string): KnowledgeBackend {
  return {
    name,
    search: async () => [{ source: "coze", title: tag, content: tag }],
    pushEntry: async (doc) => ({ externalId: `${tag}-${doc.id}` }),
  };
}

describe("C-02 KnowledgeBackend 注册表", () => {
  it("注册后可取；未注册返回 null", () => {
    expect(getKnowledgeBackend("coze")).toBeNull();
    registerKnowledgeBackend(fakeBackend("coze", "a"));
    expect(getKnowledgeBackend("coze")?.name).toBe("coze");
  });

  it("默认后端优先级：coze → local", () => {
    registerKnowledgeBackend(fakeBackend("local", "L"));
    expect(getKnowledgeBackend()?.name).toBe("local"); // 只有 local
    registerKnowledgeBackend(fakeBackend("coze", "C"));
    expect(getKnowledgeBackend()?.name).toBe("coze"); // coze 优先
  });

  it("registeredBackends 稳定顺序 local → coze；unregister 生效", () => {
    registerKnowledgeBackend(fakeBackend("coze", "C"));
    registerKnowledgeBackend(fakeBackend("local", "L"));
    expect(registeredBackends()).toEqual(["local", "coze"]);
    unregisterKnowledgeBackend("coze");
    expect(registeredBackends()).toEqual(["local"]);
  });

  it("重复注册同名后端 → 覆盖（始终单实例）", () => {
    registerKnowledgeBackend(fakeBackend("coze", "old"));
    registerKnowledgeBackend(fakeBackend("coze", "new"));
    const b = getKnowledgeBackend("coze")!;
    expect(registeredBackends().filter((n) => n === "coze")).toHaveLength(1);
    return expect(b.pushEntry({ id: 1, title: "t", content: "c" })).resolves.toEqual({ externalId: "new-1" });
  });
});

describe("C-02 local 后端", () => {
  it("local 后端 search 委托 searchLocal（行为不变：查询空串返回 active 条目）", async () => {
    const spy = vi.spyOn(await import("@/lib/kb-adapter"), "searchLocal").mockResolvedValue([
      { source: "local", title: "命中", content: "内容" },
    ]);
    ensureLocalBackend();
    const hits = await localBackend.search("测试", { tags: ["t"], take: 3 });
    expect(spy).toHaveBeenCalledWith("测试", { tags: ["t"], take: 3 });
    expect(hits[0].title).toBe("命中");
    spy.mockRestore();
  });

  it("local 后端 pushEntry 明确报错（本地无远端）", async () => {
    await expect(localBackend.pushEntry({ id: 1, title: "t", content: "c" })).rejects.toThrow(/本地/);
  });

  it("ensureLocalBackend 幂等", () => {
    const a = ensureLocalBackend();
    const b = ensureLocalBackend();
    expect(a).toBe(b);
    expect(registeredBackends()).toContain("local");
  });
});

describe("C-02 旧 API 薄包装兼容（P06）", () => {
  it("registerKbRemoteAdapter → 注册为 coze 后端；getKbRemoteAdapter 可回读", async () => {
    const pushed: string[] = [];
    registerKbRemoteAdapter({
      name: "mock",
      push: async (k) => {
        pushed.push(k.title);
        return { externalId: `doc-${k.id}` };
      },
    });
    expect(registeredBackends()).toContain("coze");
    const adapter = getKbRemoteAdapter();
    expect(adapter).not.toBeNull();
    const r = await adapter!.push({ id: 7, title: "条目", content: "c" } as never);
    expect(r.externalId).toBe("doc-7");
    expect(pushed).toEqual(["条目"]);
  });

  it("registerKbRemoteAdapter(null) → 注销 coze（队列回到 skipped 语义）", () => {
    registerKbRemoteAdapter({ name: "m", push: async () => ({ externalId: "x" }) });
    registerKbRemoteAdapter(null);
    expect(getKbRemoteAdapter()).toBeNull();
    expect(registeredBackends()).not.toContain("coze");
  });

  it("remove 可选透传", async () => {
    const removed: string[] = [];
    registerKbRemoteAdapter({
      name: "m",
      push: async () => ({ externalId: "x" }),
      remove: async (k) => {
        removed.push(k.externalId ?? "");
      },
    });
    await getKbRemoteAdapter()!.remove!({ id: 1, externalId: "doc-9" } as never);
    expect(removed).toEqual(["doc-9"]);
  });
});
