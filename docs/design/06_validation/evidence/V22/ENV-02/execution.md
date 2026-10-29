---
id: V22-ENV-02
title: ENV-02 执行证据
status: done
module: execution
owner: designated-agent
created: 2026-10-29
task: ENV-02
---

# V22-ENV-02 执行证据：端口自证

> 执行时间：2026-10-29
> 执行者：designated-agent（执行助手）
> 起点：`upgrade@20d3e88`
> 终点：见提交（本证据记录时未提交）

## 5W1H 简版

- **What**：给 `/api/health` 增加应用自证标识（`app`/`port`），并在 `start-next.mjs` 启动日志打印身份块。
- **Why**：V2.2 发现根因——本机 3000 被 Aidean 占用、HDwebsite 在 6789，用户打开 3000 看到 Aidean 界面误以为 HDwebsite 被改坏；`/api/health` 无任何应用标识（`grep -c hdwebsite` = 0），一条 curl 无法确认打开的是哪个项目。
- **Where**：`src/app/api/health/route.ts`、`scripts/start-next.mjs`。
- **Who**：designated-agent。
- **How**：在 `success({...})` 的 data 中追加 `app: "hdwebsite"` 与 `port: productionPort()`（复用 `src/lib/env.ts` 的默认端口 6789）；不改已有 `status`/`db`/`time` 字段。`start-next.mjs` 在 spawn 后打印身份块（含 `弘道教育`、`hdwebsite`、端口）。
- **What if**：不改字段破坏既有消费方——本卡只追加，不删改；`withApi` 封装与公开探活语义不变。

## 一、改动内容

### 1.1 `src/app/api/health/route.ts`

```diff
 import { prisma } from "@/lib/prisma";
+import { productionPort } from "@/lib/env";
 ...
     return success({
       status: "ok",
       db: "up",
+      // V22-ENV-02：应用自证标识——一条 curl 即可确认打开的是 HDwebsite 而非其它项目
+      app: "hdwebsite",
+      port: productionPort(),
       time: new Date().toISOString(),
     });
```

### 1.2 `scripts/start-next.mjs`（spawn 后身份块）

```js
console.log("弘道教育 HDwebsite 启动中");
console.log("  应用标识: hdwebsite");
console.log("  端口: " + port + " | 环境: " + (process.env.NODE_ENV || "development"));
console.log("  数据库: " + resolvedDatabaseUrl);
```

## 二、验收逐条

| # | 验收标准 | 结果 | 证据 |
|---|---|---|---|
| A1 | `curl /api/health` 含 `"app":"hdwebsite"` | **PASS** | 响应 `data.app === "hdwebsite"` |
| A2 | 含 `"port":6789` | **PASS** | 响应 `data.port === 6789` |
| A3 | 已有字段未变 | **PASS** | `status`/`db`/`time` 三字段与改动前完全一致（仅追加 app/port） |
| A4 | 启动日志含 `弘道教育` 与 `6789` | **PASS** | 身份块含 `弘道教育 HDwebsite 启动中`、`端口: 6789` |

## 三、实测记录

### 3.1 `curl /api/health`（生产启动，完整 env）

```text
HTTP 200
{"code":200,"data":{"status":"ok","db":"up","app":"hdwebsite","port":6789,"time":"..."},"message":"操作成功"}
```

### 3.2 卡面断言脚本

```text
$ body | node -e "..."
PASS {"status":"ok","db":"up","app":"hdwebsite","port":6789,"time":"..."}
```

### 3.3 启动身份块（UTF-8 读取）

```text
弘道教育 HDwebsite 启动中
  应用标识: hdwebsite
  端口: 6789 | 环境: production
```

## 四、UNKNOWN / 说明

- **无 UNKNOWN**。
- `port` 来自 `productionPort()`（`process.env.PORT` 默认 6789），与实际 `next start -p` 端口同源；`start-next.mjs` 传入的 `PORT` 也取同一 `port` 变量，二者一致。
- 测试用 `e2e.db`（`dev.db` 仍 0 字节，ENV-01 已给出修复指引；与 ENV-02 无关）。

## 五、后续方向待办

- **PAR-02**：依赖 PAR-01（main-agent），前台零丢失复核。
- **E1**：依赖全部 8 卡（含 main-agent 的 AUD-01/AUD-02/PAR-01）。