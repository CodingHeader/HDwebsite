# W2-04 after.json 复测与目标判定 · 执行记录（阻塞）

- 执行者：主代理（opus 档位）· 分支：`upgrade` · 依赖：D-06/W2-03/V7-UI-01（均已满足）
- 卡定义：`docs/V0.7-20261019/tasks/W2-04.md`
- 允许修改：`docs/design/06_validation/evidence/V7/W2-04/**`、`src/app/manager/**`（仅 import）
- 禁止修改：其他一切路径（含 `scripts/`）

## 1. 执行过程

1. 确认依赖：D-06（`git log` 有 D-06 提交）、W2-03、V7-UI-01 均已完成（evidence/V7 目录存在）。
2. 跑 `node scripts/measure-baseline.mjs --out docs/design/06_validation/evidence/V7/W2-04/after.json`。
3. 结果（2026-10-21T02:04:33Z，sha `973a443`）：

```json
{
  "platform": "win32",
  "notes": [
    "win32 无 standalone（next.config.ts 有意关闭，E-12 同口径）→ standalone 启动未测",
    "npm start 未就绪：服务提前退出（code 1）"
  ],
  "startToReadyStandaloneMs": null
}
```

4. 除 `startToReadyNpmStartMs` 外，`homeTtfbColdMs` / `homeTtfbWarmMs` / `apiArticlesTtfbMs` / `homeJsGzip` / `managerJsGzip` / `managerArticlesJsGzip` **均未输出**——脚本在服务未就绪时中止后续测量，`after.json` 只有空骨架。

## 2. 根因（证据链）

- `scripts/measure-baseline.mjs:116` 只注入 `env = { ...process.env, DATABASE_URL: prismaUrl(dbFile), JWT_SECRET }`。
- 该脚本由 **D-01** 建立（before.json 于 D-01 期产出，`sha f158501`）。
- **D-03**（`src/lib/env.ts` 集中校验 + `instrumentation.ts` 生产强校验）合并后，`NODE_ENV=production` 启动时除 `JWT_SECRET`/`DATABASE_URL` 外还强校验 `ENCRYPTION_KEY`（≥32）与 `APP_ORIGIN`（`/^https?:\/\//`）——缺失即 `process.exit(1)`。
- 脚本未同步注入这两个键，导致 `start-next.mjs` 在生产模式启动即退出（code 1），后续 TTFB/JS gzip 测量全部跳过。
- 独立复核：手工以 `ENCRYPTION_KEY`+`APP_ORIGIN`+`DATABASE_URL` 启动 `npm run start` 后 `/` 返回 HTTP 200 且首页区块正常渲染（见 V7-UI-02 证据），确认 env 校验是唯一根因。

## 3. 阻塞判定

- **跨所有权缺陷**：`scripts/measure-baseline.mjs` 属 D-01 线；D-03 改动 `src/lib/env.ts`（D-03 允许路径内）但未同步更新该脚本。
- W2-04 允许路径**不含** `scripts/**`，不能在本卡内修脚本。
- 按项目规则"越界即 FAIL；发现问题退回对应线"→ **停止本卡，不越界修改**。
- 处理建议：由 D 线负责人（或契约员经 CCR）补 `ENCRYPTION_KEY`/`APP_ORIGIN` 注入（可复用 e2e `global-setup.ts` 的 `e2e-encryption-key-...` 模式），或升级档位到 opus 判定是否下调目标。

## 4. 未完成项（如实登记）

| 项 | 状态 |
|---|---|
| after.json 完整 8 指标 | **FAIL**（仅空骨架） |
| perf-compare.md PASS/FAIL 逐项 | **未产出**（无 after 数据） |
| /manager JS gzip ≤ before ×0.6 | **UNKNOWN**（无测量） |
| npm start Ready ≤10s | **UNKNOWN**（服务启动即退出） |
| 首页热 TTFB ≤ before ×1.1 | **UNKNOWN**（无测量） |

## 5. 结论

- **完成度：0%（阻塞）**
- **判定：BLOCKED**（跨所有权：D-03 env 强校验破坏 D-01 测量脚本，脚本不在本卡允许路径）
- 下一步：需 D 线补脚本或用户批准越界最小修复（仅向 `measure-baseline.mjs` 补 2 个 env 键）。

## 6. git 状态

- HEAD：`$(git rev-parse HEAD)`（本卡零代码提交，仅此证据文件）
- 本地领先 origin/upgrade 54+ 提交，远端 0 独有。