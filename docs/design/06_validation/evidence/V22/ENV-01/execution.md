---
id: V22-ENV-01
title: ENV-01 执行证据
status: done
module: execution
owner: designated-agent
created: 2026-10-29
task: ENV-01
---

# V22-ENV-01 执行证据：启动链路固化

> 执行时间：2026-10-29
> 执行者：designated-agent（执行助手）
> 起点：`upgrade@0fc84e3`
> 终点：见提交（本证据记录时未提交）

## 5W1H 简版

- **What**：把「env 校验」与「DB 迁移检测」前置到 `spawn next` 之前，保证缺条件时在监听端口之前退出。
- **Why**：V2.2 发现缺陷——`npm start` 的 FATAL 发生在 Next `instrumentation.ts` 内部（端口已监听但服务不可用，`Ready` 已打印），用户看到的是「能连但报错」；且 `dev.db` 0 字节时运行时才 `no such table: main.CronJob`。
- **Where**：`scripts/start-next.mjs`（新增前置门禁）、`scripts/check-db.mjs`（新建）。
- **Who**：designated-agent。
- **How**：`start-next.mjs` 在 `loadEnvConfig` 之后、`runBuildIfNeeded`/`spawn` 之前调用 `assertProductionEnv(process.env)`（复用 `src/lib/env.ts` 规则，Node v24 原生 strip-types 直接 import `.ts`，纯函数不引 Next 运行时）与 `checkDbReady(process.env)`；`check-db.mjs` 探测 `sqlite_master` 中 `CronJob`/`Setting`/`User` 三表，缺表打印 `npm run db:deploy && npm run db:seed` 并 exit 1。
- **What if**：若需改 `package.json` 的 `start` 语义或 `src/lib/env.ts` → 升级 `opus`（本卡未触发，两者均未改）。

## 一、改动内容

### 1.1 `scripts/start-next.mjs`（新增前置门禁）

在 `loadEnvConfig(...)` 之后、`runBuildIfNeeded()` 之前插入：

```js
// V22-ENV-01：前置门禁——env 校验 + DB 迁移检测，均在 spawn next 之前、监听端口之前。
assertProductionEnv(process.env);

const dbState = await checkDbReady(process.env);
if (!dbState.ok) {
  printDbGuidance(dbState.missing);
  process.exit(1);
}
```

顶部新增 import（Node v24 原生 strip-types 可直接 `import` `.ts`，`env.ts` 为纯函数、不依赖 Next 运行时）：

```js
import { assertProductionEnv } from "../src/lib/env.ts";
import { checkDbReady, printDbGuidance } from "./check-db.mjs";
```

**为什么这么复用**：`src/lib/env.ts` 的 `collectEnvIssues`/`assertProductionEnv` 是校验规则的唯一真源；直接 import 可避免在脚本里复制一份规则造成漂移。`env.ts` 零依赖、无副作用，满足「复用规则但不引 Next 运行时」。

### 1.2 `scripts/check-db.mjs`（新建）

- 导出 `REQUIRED_TABLES = ["CronJob","Setting","User"]`、`checkDbReady(env)`（异步）、`printDbGuidance(missing)`、`parseDbUrl(url)`。
- `file:` URL 用 `node:sqlite`（只读探测）；`libsql:`/`http:` 用 `@libsql/client`；纯路径按 cwd 解析。
- 直接运行（`node scripts/check-db.mjs`）作为独立门禁；缺表时打印可复制修复命令并 exit 1。
- 只读探测，不写库、不改数据。

## 二、验收逐条

| # | 验收标准 | 结果 | 证据 |
|---|---|---|---|
| A1 | 缺 `ENCRYPTION_KEY` 时 exit ≠ 0 且端口未监听 | **PASS** | 前台实测 `exit=1`，`netstat`/`Get-NetTCPConnection :6789` 无 Listen |
| A2 | DB 未迁移时 exit ≠ 0，输出含 `db:deploy` | **PASS** | `DATABASE_URL=file:./prisma/dev.db`（0 字节）→ exit ≠ 0，输出含 `npm run db:deploy && npm run db:seed` |
| A3 | 正常情形 200 | **PASS** | `DATABASE_URL=file:./prisma/e2e.db` 完整 env → HTTP 200 |
| A4 | 未改 `src/lib/env.ts` | **PASS** | `git status --short src/lib/env.ts` 为空（仅只读 import） |

## 三、实测记录

### 3.1 场景 1：缺 `ENCRYPTION_KEY`（生产）

```text
$ NODE_ENV=production PORT=6789 HOSTNAME=127.0.0.1 APP_ORIGIN=http://127.0.0.1:6789 \
  DATABASE_URL=file:./prisma/e2e.db node scripts/start-next.mjs
[env] FATAL: 以下环境变量缺失或不符合要求，拒绝生产启动（只列键名，不显示值）：
  - ENCRYPTION_KEY
exit=1
PASS port 6789 未监听
```

### 3.2 场景 2：DB 未迁移（`dev.db` 0 字节）

```text
$ DATABASE_URL=file:./prisma/dev.db ... node scripts/start-next.mjs
[check-db] 数据库未就绪：缺少表 CronJob, Setting, User
[check-db] 请先执行迁移与种子（本地开发，勿在生产手动执行）：
  npm run db:deploy && npm run db:seed
exit != 0；PASS port 未监听
```

### 3.3 场景 3：正常（`e2e.db` 已迁移）

```text
$ DATABASE_URL=file:./prisma/e2e.db ... node scripts/start-next.mjs
HTTP 200
```

> **说明**：场景 3 用 `e2e.db` 因本地 `dev.db` 为 0 字节（V2.2 缺陷 2，本卡已将其转为「监听前失败 + 修复指引」，实际修复即 `npm run db:deploy && npm run db:seed`）。

## 四、before-after.json

见同目录 `before-after.json`（记录三种情形的迁移前/后行为）。

## 五、UNKNOWN / 说明

- **无 UNKNOWN**。
- 本卡未执行 `db:deploy`/`db:seed`（只检测不修复；`dev.db` 0 字节的实际修复由运维/用户执行，命令已输出）。
- `node:sqlite` 为实验特性（运行时 `ExperimentalWarning`），但 Node v24 可用；已用 `{ readOnly: true }` 只读打开，无写入风险。

## 六、后续方向待办

- **ENV-02**（被本卡解锁）：`/api/health` 追加 `app`/`port` 字段 + `start-next.mjs` 启动日志打印身份块。
- `dev.db` 0 字节：`npm run db:deploy && npm run db:seed` 即可修复（ENV-01 已给出指引）。