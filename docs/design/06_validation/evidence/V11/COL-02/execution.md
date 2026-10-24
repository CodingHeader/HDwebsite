# V11-COL-02 执行证据（2026-10-24）

## 5W1H 简版

- **What**：① 采集源 cron 门控关系在管理端明示（轻方案）；② 图片转存从「默认入知识库」键解绑为独立设置键 `collectTransferImages`；③ Dockerfile/compose/.env.example 加 `TZ=Asia/Shanghai`。
- **Why**：V1.1 审计 §采集.3/4/5——源级 cron 实际受系统任务 collect.run 检查频率门控而 UI 未说明；引擎把图片转存挂在 `collectDefaultKnowledge`（其唯一读取点，名实不符）下；容器无时区设置。
- **Where**：`src/lib/settings-registry.ts`、`src/lib/collect-engine.ts`、`src/components/manager/resource-meta/specs.ts`（越界，见下）、Dockerfile、docker-compose.yml、.env.example、`src/lib/__tests__/v11-col-02.test.ts`（新）、`src/lib/__tests__/v11-kb.test.ts`（lint 顺手修，见下）。

## 现状盘点（代码为准）

- **cron 门控**：seed `collect.run` cron=`0 4 * * *`（prisma/seed.ts:369，冻结面）；调度器仅在该 cron 到期时执行 collect.run handler，handler 内逐源 `isDue(源.cron, 源.lastRunAt)`。故源级 cron 的评估时点 = collect.run 的触发时点：默认每天 04:00 检查一次，源写 `0 * * * *` 也只在 04:00 被检查并执行。CronJob 行无管理界面（src/app 无任何 CronJob/scheduler 引用），无法从 UI 调门控频率。
- **开关耦合**：`collect-engine.ts:285`（原）`if (contentMd && settings.collectDefaultKnowledge !== "false")` 才转存图片——全仓库 `collectDefaultKnowledge` 唯一读取点即此处（grep src + tests + e2e 复核）；真正控制入库的是源级 `autoToKb`。即「默认入知识库」开关实际只控图片转存。
- **时区**：Dockerfile / docker-compose.yml / .env.example 均无 TZ。

## 取舍说明（卡面允许二选一）

**选择轻方案：管理端文案明示门控关系**，不实现「源启用即按自身 cron」。依据：
- 实现重方案需让 collect.run 每分钟被调度——门控行在 DB（seed 写死 `0 4 * * *`，prisma/** 冻结禁止改 seed/迁移），只能靠启动时代码改写 DB 数据或改调度器结构，均超出本卡「低」档位且引入隐式行为变更；
- 现有 per-source `isDue` 逻辑本身正确，门控语义一句话可说清；文案落在采集源表单 cron 字段帮助文本，用户在配置处即时可见。

## 改动清单

| 文件 | 改动 |
|---|---|
| src/lib/settings-registry.ts | +`collectTransferImages`（"图片转存本地"，默认 "true"，boolean，isPublic=false，description 写明与 autoToKb 互不影响）；−`collectDefaultKnowledge`（解绑后无任何读取点，保留即成「说谎的开关」，违背 REQ-F-015；DB 遗留行无害） |
| src/lib/collect-engine.ts | 图片转存条件改读 `settings.collectTransferImages !== "false"`（默认开，保持现网默认行为不变） |
| src/components/manager/resource-meta/specs.ts | **越界说明**：采集源 cron 字段 help 文案改写，明示「源级计划由系统任务 collect.run 的检查频率门控；该任务为每分钟时源计划才逐源独立生效；默认 0 4 * * * 即每天 04:00 检查并执行到期的源」。理由：卡面轻方案的落点即管理端文案，而该文案唯一来源是 resource-meta specs（src/components/**，不在卡面允许列表）；改动仅 1 个 help 字符串，无逻辑 |
| Dockerfile | runner 阶段 `ENV TZ=Asia/Shanghai`（node:slim 自带 tzdata，实测生效无需额外安装） |
| docker-compose.yml | app 与 migrate 两服务 environment 加 `TZ=Asia/Shanghai` |
| .env.example | +`# TZ=Asia/Shanghai` 注释项（说明部署件已内置） |
| src/lib/__tests__/v11-col-02.test.ts | 新增 5 断言（见下） |
| src/lib/__tests__/v11-kb.test.ts | **跨卡顺手修**：移除未使用的 `vi` import（存量 lint warning，属 `src/lib/__tests__/*` 允许路径；纯 import 清理，无断言改动）。注：该 warning 由 5d11882 提交带入，基线 lint 本就不净 |

**行为变更说明**：解绑后，原先设 `collectDefaultKnowledge=false` 的站点图片将开始转存（新键默认 true）——这正是解绑语义（两开关独立）；默认配置下行为完全不变。

## 验收逐条结果

| 条目 | 结果 | 证据 |
|---|---|---|
| 源 cron 行为与其 UI 提示一致 | **PASS** | 轻方案：代码语义未改，help 文案逐句对应真实行为（gate=cron 检查频率；留空=仅手动；到期源在检查时点执行），文案回归断言含 "collect.run"/"门控"/"留空表示仅手动执行" |
| 两开关互不影响（单测） | **PASS** | 2×2 行为断言（真实引擎 + 本地 mock 服务器 + 临时库 + 1x1 PNG）：① autoToKb=true & 转存默认开 → 转存（/uploads/collect/*.png + Media 记录）且入知识库；② collectTransferImages=false & autoToKb=true → 保留原链不入盘、仍入知识库；③ autoToKb=false → 仍转存、不入库（旧实现此场景会漏转） |
| 容器内 date 为 CST | **PASS（等价验证）+ UNKNOWN（完整镜像）** | 见下 |

## 时区验证细节

- `docker run --rm -e TZ=Asia/Shanghai node:24.14.1-slim date` → `Sat Oct 24 23:28:11 CST 2026`（base image 自带 tzdata，TZ 生效）
- `docker run --rm -e TZ=Asia/Shanghai node:24.14.1-slim node -e ...` → `Asia/Shanghai Sat Oct 24 2026 23:28:12 GMT+0800 (China Standard Time)`（Node 层同样生效——调度 cron 判定即走该路径）
- Dockerfile 改动即 runner 阶段一行 `ENV TZ=Asia/Shanghai`，`docker compose config` 校验通过
- **UNKNOWN（记录）**：完整镜像 `docker build --target runner` 两次均在依赖阶段 `npm ci` 处失败（npm 自身错误 "Exit handler never called!"，本机 docker 内 npm registry 网络问题，与本卡 Dockerfile 改动无关；同错误在未含本卡改动的构建上同样出现）。按熔断纪律停止重试，交 CI docker job 复验：`docker build --target runner -t tmp . && docker run --rm tmp date`（期望 CST）。

## 验证命令输出摘录

```
$ npx vitest run src/lib/__tests__/v11-col-02.test.ts
 Test Files  1 passed (1)
      Tests  5 passed (5)

$ npx vitest run src/lib/__tests__   （卡面门禁）
 Test Files  78 passed (78)
      Tests  855 passed (855)

$ npm run lint        # 0 error 0 warning（含顺手修的 v11-kb 存量 warning）
$ npm run typecheck   # 无错误
$ npm run build       # ✓ Compiled successfully
$ docker compose config --quiet && echo COMPOSE_CONFIG_OK   # COMPOSE_CONFIG_OK
```
