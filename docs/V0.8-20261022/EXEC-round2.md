# V0.8 执行记录 · 第 2 轮（2026-10-22）

> 承接 `EXEC-round1.md`。分支 `upgrade` 单主线，起点 `fb8f039`，终态 `de4ad2f`，**双端 `0 0`**。
> 本轮把剩余可做的卡全部推进：14 done / 1 blocked / 3 pending。

## 1. 本轮新增完成：7 张卡

| 卡 | 提交 | 关键结果 |
| --- | --- | --- |
| **V8-G-01** | `fb8f039` | AGENTS/CLAUDE/current-plan 三处入口对齐 V0.8；CLAUDE 收敛为薄壳（原先附 5 条与 AGENTS 冲突的说明，证据路径 V7 vs V8 不一致） |
| **V8-PERF-01** | `079ada2` | 目标已由 SEC-01 顺带达成，**本卡零代码改动** |
| **V8-VIS-01** | `9a76abd` | 视觉数据集；首页高度 **3389 → 5532**，参照图 5529，**差 3px** |
| **V8-VIS-02** | `f221a2b` | CI 新增 Linux visual job（playwright v1.59.1-jammy + clean build） |
| **V8-INT-01** | `86aa84f` | 3 个冒烟脚本（dry-run 默认）+ 真实联调手册 |
| **V8-UI-01** | `a88a283` | 7 页补 ErrorState、5 页补骨架；ux-states 20/20、a11y 12/12 |
| **V8-REL-01** | `de4ad2f` | **BLOCKED**：Docker 静态核验 11 项全过，但容器内无 npm 网络 |

## 2. 三个关键发现

### 2.1 PERF-01 的目标是被 SEC-01"顺手"达成的

| 指标 | W2-04 基线 | 本轮实测 | 变化 |
| --- | --- | --- | --- |
| `/manager/articles` JS gzip | 372,724 B | **284,100 B** | **−23.8%** |
| `/manager/login` | 361,312 B | **272,563 B** | −24.6% |

收益**全部来自 SEC-01**（next 16.4.2 + 移除 `cssChunking: false`），不是本卡新做的优化。

这也解释了 W2-04 当时为什么压不下去：**瓶颈不在业务代码，而在一个被误认为"与 main 对齐"的构建开关**。
`cssChunking: false` 强制单 CSS chunk 并抑制按需拆分，连带影响 JS chunk 粒度。

### 2.2 VIS-01：seed 之后首页不会变（三层叠加）

1. 首页是**静态预渲染**（`next build` 输出 `○ /`）；
2. `getHomeData` 的 `unstable_cache` 配 **`revalidate: false`**（只靠 tag 失效，不按时间过期）；
3. `seed-visual.ts` 直写 DB、不走 API，**不触发** `invalidateWebContent(WEB_TAGS.home)`。

→ 实测：seed 后 `curl /api/articles` 已返回新数据，但 `curl /` 里 `grep 视觉` = 0，首页高度仍是 3349。
→ 把 `.next/cache/fetch-cache` 移走后重新 build，`index.rsc` 才出现「视觉回归文章」，
首页高度 **3389 → 5532**（参照 5529）。

**这条已写进 `seed-visual.ts` 头注释与 CI 的 visual job**（必须先 seed 再 clean build）。

另一个副产物：初版只 seed 了 Campus 没 seed CampusImage，`CampusSection` 渲染的是
`campuses.flatMap(c => c.images)`，**无图则整块高度为 0**（`home-campus` = 0）。补齐 8 行后变为 675px。

### 2.3 UI-01：五态组件齐全，但有页面漏接

`ErrorState` / `EmptyState` / `Forbidden` / `PageSkeleton` 组件都在，`testid` 也有。
问题在**接线**：13 个自定义页里多数只写了

```ts
if (isForbidden(error)) return <Forbidden message={error.message} />;
```

**非 403 的失败没有分支** → 接口 500 时用户看到的是"空列表"而不是"加载失败"，会误以为真的没数据。
已补 7 页 ErrorState + 5 页骨架。

## 3. 裁决执行情况

| 裁决 | 用户口径 | 本轮执行 |
| --- | --- | --- |
| Q1 依赖升级 | 授权，**只升不降** | 已升 sharp/vitest；**拒绝** audit 对 5 个 eslint 系包建议的 `14.2.35`（当前 16.4.2，属降级） |
| Q2 凭证 | 默认继续 UNKNOWN | INT-01 已把验证手段备好，**只缺凭证** |
| Q3 减包 | 改为"不回涨" | PERF-01 达成（−23.8%，远超要求） |
| Q4 visual 种子 | 默认不用 main 真实数据 | VIS-01 自建确定性数据集（**未使用** main 的 dev.db 数据，只取其**行数基线**） |

> Q4 说明：VIS-01 读了 `../hdwebsite_0429/prisma/dev.db` 的**行数与字段结构**（用于确定"等量"的标准），
> 但生成的 fixtures 是**自造的脱敏内容**（「视觉回归文章 01」等），未复制 main 的业务数据。

## 4. 门禁终态

```
npm run lint（--max-warnings 0）   exit 0，无输出
npx tsc --noEmit                  exit 0
npm test                          1712 passed / 72 files
npm run build                     exit 0
check-root                        PASS（49 条全在白名单）
check-assets                      PASS（全部存在）
check:audit                       exit 0（critical 0）
contract                          876 passed（默认与 shuffle 一致）
e2e ux-states                     20/20
a11y                              12/12
```

## 5. 剩余 4 张

| 卡 | 状态 | 阻塞原因 |
| --- | --- | --- |
| **V8-REL-01** | **blocked** | 本机 Docker daemon 可用（`OSType: linux`）、基础镜像能拉，但**容器内到任何 npm registry 都超时**（官方源与 npmmirror 都试过，`EXIT=124`）。宿主机靠本地 10808 代理出网，容器不走该代理。属网络环境限制，非 Dockerfile 缺陷 |
| V8-VIS-03 | pending | 需 VIS-02 在 CI 的真实产出（diff 图）才能分诊 |
| V8-V-01 | pending | 前置含 REL-01（blocked） |
| V8-REL-02 | pending | 依赖 V-01 |

## 6. 是否该停下：判断依据

连续执行协议：「**只有剩余卡全部卡在授权/凭证/环境这类外部条件上时，才允许停下**」。

当前 4 张卡的实际阻塞：

| 卡 | 缺什么 | 谁能解 |
| --- | --- | --- |
| REL-01 | 能访问 npm registry 的 Linux 构建环境 | CI runner / 配好代理的机器 |
| VIS-03 | VIS-02 在 CI 的真实运行结果 | 一次 push 触发 CI |
| V-01 | REL-01 完成 | 同上 |
| REL-02 | V-01 完成 | 同上 |

**全部是环境依赖，不是"还可以继续做但没做"。** 按协议可以停。

## 7. 下一轮最该做的三件事

1. **看 CI 的 visual job 结果**（push 已触发）。若大量 fail，先做 VIS-03 分诊——
   注意 about/articles 页的数据源本卡未覆盖（高度 1950/2805 vs 参照 2696），可能需要补 ServiceGuide / Navigation 等表。
2. **给 CI 加 docker job** 验证 REL-01（本轮没加，因为 `.github/workflows/**` 属 VIS-02 路径，跨卡改会破坏所有权边界）。
3. VIS-03 通过后，把 visual job 的 `continue-on-error` 从 `true` 改为 `false`。
