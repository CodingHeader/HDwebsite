# C-02 执行证据：KnowledgeBackend 接口与注册表（合并 P06 的 KbRemoteAdapter）

- 5W1H 简版：Who=执行线 C（lane/c-ai-kb）；What=`src/lib/kb/{types,registry,local}.ts` 统一后端接口 + 唯一注册表 + local 后端，`kb-sync.registerKbRemoteAdapter` 降级为薄包装；When=2026-10-17（北京时间）；Why=S-C2 知识库后端可扩展（ADR-029；P06-execution §8）；How=接口以纯 DTO 为界，local 包裹 searchLocal（行为不变），旧 API 名保留实现兼容。

## 改动文件
- `src/lib/kb/types.ts`（新）：`KnowledgeBackend` 接口（`name` / `search` / `pushEntry` / 可选 `pushDocument` / `removeDocument` / `getDocumentStatus`）+ 纯 DTO（`KbDocument`、`KbDocStatus`、`KbSearchOptions`、`KbBackendName`）——**不引用 prisma**。
- `src/lib/kb/registry.ts`（新）：**唯一注册表**——`registerKnowledgeBackend` / `getKnowledgeBackend(name?)`（默认 coze→local）/ `registeredBackends()` / `unregisterKnowledgeBackend` / `__clearKnowledgeBackends`；globalThis 存储（跨 HMR/多入口，同 C-01 llm 注册表纪律）。
- `src/lib/kb/local.ts`（新）：`localBackend`（`search` 委托 `searchLocal`，`pushEntry` 明确报错「本地无远端」）+ `ensureLocalBackend()`（幂等）；模块加载即注册。
- `src/lib/kb-sync.ts`（改）：`KbRemoteAdapter` 类型保留；`registerKbRemoteAdapter` / `getKbRemoteAdapter` 变为注册表**薄包装**（coze 后端；null → 注销）。
- `src/lib/__tests__/lane-c/kb-registry.test.ts`（新）：10 用例。

## 验收逐条
| 验收项 | 结果 | 证据 |
|---|---|---|
| collect-autokb.test.ts 不改断言即通过 | PASS | **4 passed**（未改测试文件任一行） |
| `grep -rn "registerKbRemoteAdapter\|registerKnowledgeBackend" src/lib` 只有一个注册表实现 | PASS | 唯一实现 = `src/lib/kb/registry.ts:21`；`kb/local.ts` 仅调用；`kb-sync.ts` 薄包装转调 |
| 通用门禁 4 项 exit 0 | PASS | lint=0、typecheck=0、vitest **373 passed**（+10 本卡）、build=0 |
| 越界检查 | PASS | `src/lib/kb/**`、`src/lib/kb-sync.ts`、`src/lib/__tests__/lane-c/**`，越界 0 |
| 接口写入 ADR-029（步骤 1） | PASS | ADR-029-LLM与知识库适配器注册表.md §3「影响」已载明 C-02 消费注册表与适配器接口；本卡实现与该节口径一致（统一注册表 + DTO 边界） |

## 设计口径（一周后复现）
- **唯一注册表**：local 与 coze 后端都注册到 `kb/registry.ts` 的单一 Map；`getKnowledgeBackend()` 不传名时 **coze 优先、回退 local**（远端优先、本地兜底）。
- **兼容策略**：P06 的 `registerKbRemoteAdapter` 语义（含 null 注销）由薄包装保持，故既有 `collect-autokb` 测试与 `processKbSyncQueue` 零改动。
- **DTO 边界**：`KbDocument` 由调用方从 `Knowledge` 行映射，实现方不接触 prisma —— C-04（Coze 客户端）/ C-06（KB API）据此实现，无需反向依赖数据层。

## 命令
```bash
npx vitest run src/lib/__tests__/collect-autokb.test.ts src/lib/__tests__/lane-c/kb-registry.test.ts  # 4 + 10 passed
grep -rn "registerKbRemoteAdapter\|registerKnowledgeBackend" src/lib    # 唯一实现 registry.ts
npm run lint && npm run typecheck && npm test && npm run build          # 全 exit 0
```

## UNKNOWN 及原因
- `pushDocument` / `getDocumentStatus` 的可选能力：实现方（C-04 Coze 客户端）尚未存在，接口已定形但无实现可用 → 本卡只验证接口形态与注册表语义。
- Coze 真实联调：dataset 凭证缺失（既定 UNKNOWN），C-04 起用 mock 覆盖。

## 后续方向待办
- C-04（依赖 C-02 + C-03，**均已满足**）：Coze 知识库客户端（建库/推文档 ≤10/批/进度/删除）。
- C-05：本地检索按库过滤 + bigram/关键词/标题加权（可消费 `localBackend`）。
