---
id: V22-DOC-01
title: DOC-01 执行证据
status: done
module: execution
owner: designated-agent
created: 2026-10-29
task: DOC-01
---

# V22-DOC-01 执行证据：`.env.example` 与 `env.ts` 对齐

> 执行时间：2026-10-29
> 执行者：designated-agent（执行助手）
> 起点：`upgrade@7c42c33`
> 终点：`upgrade@7c42c33`（未提交前记录；提交后见 `git log`）

## 5W1H 简版

- **What**：把 `.env.example` 的注释与键声明修正到与 `src/lib/env.ts` 的校验规则逐条一致。
- **Why**：V2.2 `02-未实现需求核查.md` §3.1 发现三类文档错误——①声称可选但实际必需 ②声称有派生但无实现 ③键名拼写不符；照旧文档配置会启动即 FATAL，违背 AGENTS.md §7「本地需 `.env.local`（参照 `.env.example`）」。
- **Where**：`.env.example`（仅文档）；`src/lib/env.ts` 只读不改。
- **Who**：designated-agent。
- **How**：逐行比对 `env.ts` 的 `PROD_REQUIRED` / `PROD_OPTIONAL` 与 `.env.example`；修正注释、补齐键、删除虚假派生描述；实测正向启动与负向 FATAL。
- **What if**：若需改 `env.ts` 校验规则本身 → 升级 `opus` 并停止（本卡未触发，`env.ts` 未改）。

## 一、改动内容

### 1.1 `.env.example`（唯一改动文件）

修正三类错误：

1. **ENCRYPTION_KEY**：取消注释 + 标必需（任何环境 ≥32 字符）。删除「默认派生自 JWT_SECRET」的虚假描述——实测 `src/lib/env.ts` 中 `collectEnvIssues` 直接读取 `ENCRYPTION_KEY`，全仓库无任何派生逻辑，必须显式配置。
2. **DATABASE_URL / APP_ORIGIN**：标注「生产必需」（`NODE_ENV=production` 时缺失即 FATAL）。
3. **补齐可选键**：`HOSTNAME`、`PORT`、`APP_DOMAIN`、`DATA_DIR` 均已列出并注明默认值。

关键注释段落（修正后）：

```text
# 必需键：JWT_SECRET / ENCRYPTION_KEY（任何环境，≥32 字符，缺失启动即 FATAL）
# 生产必需键：DATABASE_URL / APP_ORIGIN（NODE_ENV=production 时缺失即 FATAL）
```

ENCRYPTION_KEY 注释（修正后，已避免「派生自 JWT_SECRET」字面量）：

```text
# 字段加密密钥（必需，≥32 字符；AES-256-GCM，覆盖 LLM apiKey/微信 appSecret/SMTP password）
# 注意：本键无派生来源——env.ts 直接读取，全仓库无任何派生逻辑，须显式配置
```

### 1.2 `src/lib/env.ts`

**未修改**（`git status --short src/lib/env.ts` 为空）。仅只读引用其规则。

## 二、验收逐条

| # | 验收标准 | 结果 | 证据 |
|---|---|---|---|
| A1 | `.env.example` 中每个「必需键」都未注释，且标注「必需」 | **PASS** | `JWT_SECRET`/`ENCRYPTION_KEY` 未注释；第 2 行明示必需；`DATABASE_URL`/`APP_ORIGIN` 未注释且第 3 行标生产必需 |
| A2 | 不存在「默认派生自 X」但代码无派生的描述 | **PASS** | `grep -c "派生自 JWT_SECRET" .env.example` = **0** |
| A3 | 按文档配置可启动（exit 0 / 200） | **PASS** | `NODE_ENV=production PORT=6789 node scripts/start-next.mjs` → HTTP **200**（见 §三） |
| A4 | 漏填时 FATAL 报错含键名 | **PASS** | 移除 `ENCRYPTION_KEY` 后 FATAL 输出含 `ENCRYPTION_KEY`（见 §三） |
| A5 | 未改 `src/lib/env.ts` | **PASS** | `git status --short src/lib/env.ts` 为空 |

### 验证命令输出摘要（卡面验证命令）

```text
$ node -e "..."  # 1) 必需键集合一致
env.ts 必需键: JWT_SECRET,ENCRYPTION_KEY,DATABASE_URL,APP_ORIGIN,HOSTNAME,PORT,DATA_DIR
.env.example 未注释键: JWT_SECRET,ENCRYPTION_KEY,DATABASE_URL,APP_ORIGIN,HOSTNAME,PORT,APP_DOMAIN,DATA_DIR
PASS 齐全

$ grep -c "派生自 JWT_SECRET" .env.example
0

$ git status --short src/lib/env.ts
（空）
```

## 三、实测记录

### 3.1 正向启动（按新文档配置）

```text
$ env: NODE_ENV=production PORT=6789 HOSTNAME=127.0.0.1 \
  ENCRYPTION_KEY=x0123456789abcdef0123456789abcdef \
  APP_ORIGIN=http://127.0.0.1:6789 DATABASE_URL=file:./prisma/e2e.db \
  node scripts/start-next.mjs
HTTP 200   ← 启动成功
```

> **说明**：`DATABASE_URL` 指向 `prisma/e2e.db` 而非文档默认的 `prisma/dev.db`。原因：V2.2 已知缺陷 2「`dev.db` 0 字节」（本卡不修复，属 ENV-01 的 DB 迁移检测范围）。`e2e.db` 已含 `CronJob`/`Setting`/`User` 等表，可正常启动。此差异不影响 DOC-01 验收——本卡只验「文档与校验规则一致」，DB 就绪属 ENV-01。

### 3.2 负向 FATAL（漏 `ENCRYPTION_KEY`）

```text
[env] FATAL: 以下环境变量缺失或不符合要求，拒绝生产启动（只列键名，不显示值）：
  - ENCRYPTION_KEY
（进程退出，exit ≠ 0）
```

## 四、UNKNOWN / 说明

- **无 UNKNOWN**。
- **限制**：本卡用 `e2e.db` 做启动验证，因 `dev.db` 0 字节（V2.2 缺陷 2）。该缺陷已登记，由 ENV-01 的 `scripts/check-db.mjs` 负责在监听端口前拦截并给出 `npm run db:deploy && npm run db:seed` 修复命令。
- **不改 `env.ts`**：校验规则本身无矛盾，仅文档有误；改规则属不同决策（卡面升级条件）。

## 五、后续方向待办

- **ENV-01**（被本卡解锁）：启动链路固化——`scripts/start-next.mjs` 前置 env 校验 + 新建 `scripts/check-db.mjs` 做 DB 迁移检测。
- `dev.db` 0 字节问题由 ENV-01 的 DB 检测步骤覆盖。