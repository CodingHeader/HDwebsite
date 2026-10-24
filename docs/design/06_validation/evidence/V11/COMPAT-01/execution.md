# V11-COMPAT-01 执行证据：旧 API 入口兼容

## 5W1H 简版

- What：main@94dbbbb 的两个已废弃旧入口 `/api/ai-config**`、`/api/chat/completion` 不再裸 404，
  映射到现役端点（307 重定向 / 适配转发），不复活旧实现。
- Where：`src/app/api/ai-config/route.ts`、`src/app/api/ai-config/[id]/route.ts`（新增，307）、
  `src/app/api/chat/completion/route.ts`（新增，适配转发）、`src/lib/__tests__/v11-compat-old-api.test.ts`（9 例）。

## 现状盘点（main 对照 + upgrade 核实）

| 旧入口（main@94dbbbb） | 旧语义 | upgrade 现状 | 处置 |
| --- | --- | --- | --- |
| GET/POST `/api/ai-config` | 旧管理端 AIConfig 列表/新建（requireAuth + prisma.aIConfig） | AIConfig 表已废除；路由不存在（裸 404）；现役 = `/api/llm/providers`（LLMProvider CRUD，`llm:list` 权限） | 307 → `/api/llm/providers`（方法/请求体/查询串保留；鉴权与字段校验以现役契约为准，旧字段不复活） |
| GET/PUT/DELETE `/api/ai-config/[id]` | 旧 AIConfig 详情/更新/删除 | 同上 | 307 → `/api/llm/providers/[id]` |
| POST `/api/chat/completion` | 前台非流式聊天代理（AIConfig 直连上游 + 知识拼接；响应 `{reply, model, tokensUsed, responseTime, scene, knowledgeHit}` 信封） | 路由不存在；现役链路 = `/api/chat/stream`（SSE，chat-service 装配） | **适配转发**：旧请求体 `{messages, sceneCode?, sessionId?}` → 取最后一条 user 消息 → 现役唯一装配点 `chat-service#chatOnce` → 旧 JSON 信封响应 |

映射方式选择：`/api/ai-config` 走 307（Temporary：旧→新字段语义无逐字映射，307 让现役契约裁决；
方法与 body 由 307 语义保留）；`/api/chat/completion` 走适配转发（纯 307 到 `/api/chat/stream` 会把
SSE 响应写给期望 JSON 的旧客户端，且旧客户端无 V11-SEC-04 服务端会话 cookie，必然 400）。

## 前台引用核实

- upgrade 前台（`ApplyClient.tsx:217`、`ChatWidget.tsx`）已全部走 `/api/chat/stream`，无内部调用方依赖旧入口；
  旧入口兼容仅面向外部残留调用/收藏/脚本。

## 改动文件

- `src/app/api/ai-config/route.ts`（GET/POST → 307 `/api/llm/providers`，查询串透传）
- `src/app/api/ai-config/[id]/route.ts`（GET/PUT/DELETE → 307 `/api/llm/providers/<id>`）
- `src/app/api/chat/completion/route.ts`（适配转发 chatOnce；响应字段 `knowledgeHit` 恒 false、
  `tokensUsed` 恒 null——现役装配点/网关不对外暴露该两项（ADR-034 聚合口径），映射表登记）
- `src/lib/__tests__/v11-compat-old-api.test.ts`（新增，9 例）

## 验收逐条

| 验收标准 | 结果 | 证据 |
| --- | --- | --- |
| 旧入口不再裸 404（映射表逐条核） | PASS | 5 个 307 用例（GET/POST 列表 + GET/PUT/DELETE [id]，location 精确断言、查询串透传）+ 4 个适配转发用例（200 信封 / 400 校验 / 502 透传 / legacy- 会话隔离落库） |
| 现役端点行为不受影响 | PASS | `/api/chat/stream`、`/api/llm/providers` 零改动；全量 `src/lib/__tests__` 套件绿（含 lane-c 的 stream/lLMProvider 用例）；本套件内 `gatewayChat` 仅被 mock，不影响其他文件 |

## 命令输出摘录

```
npx vitest run src/lib/__tests__/v11-compat-old-api.test.ts
 Test Files  1 passed (1)
      Tests  9 passed (9)
```

## UNKNOWN

无。

## 后续方向待办

- 无。旧 AIConfig 字段（systemPrompt/userPrompt/greeting 等）如需数据迁移到 ChatScene/LLMProvider，
  属数据迁移范畴，本卡只做入口兼容（卡面"不复活死代码"）。
