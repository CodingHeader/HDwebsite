# V8-PERF-01 执行证据：/manager 共享 chunk（目标口径 V8-Q3=B，不回涨）

- 执行者：主代理 ｜ 分支 `upgrade` ｜ 日期 2026-10-22
- 前置：V8-SEC-01（`b911666`，next 16.4.2 + 移除 `cssChunking:false`）

## 1. 结论先行：目标已达成，且**本卡未做任何代码改动**

| 指标 | W2-04 基线 | 本卡实测 | 变化 |
| --- | --- | --- | --- |
| `/manager/articles` 首屏 JS gzip | 372,724 B | **284,100 B** | **−88,624 B（−23.8%）** |
| `/manager/login` JS gzip | 361,312 B | **272,563 B** | **−88,749 B（−24.6%）** |
| 首页 JS gzip | 320,774 B | **249,374 B** | −71,400 B（−22.3%） |

卡定义验收（V8-Q3=B）：
- 「≤372,724 B」→ **284,100 ≤ 372,724** ✅
- 「共享 chunk 较本卡开工时 −10%」→ **−23.8%** ✅

## 2. 收益来自哪里（重要归因）

**全部来自 V8-SEC-01，不是本卡新做的优化。** SEC-01 做了两件事：

1. `next` 16.2.1 → **16.4.2**（含 `eslint-config-next` 同步）
2. **移除 `cssChunking: false`**（Turbopack 不再支持该选项）

第 2 条是关键：`cssChunking: false` 会强制把所有 CSS 打进单一 chunk 并抑制按需拆分，
连带影响 JS chunk 的切分粒度。移除后 Next 恢复默认的按需 chunking，
`/manager/*` 首屏从 14~15 个 chunk 收敛为 13~14 个，且单块体积显著下降。

> 换句话说：W2-04 里那个「−40% 目标达不成」的项，被 SEC-01 顺手解决了一大半。
> 这也解释了为什么 W2-04 当时怎么做都压不下去——**瓶颈不在业务代码，而在一个被误认为"与 main 对齐"的构建开关**。

## 3. 测量方法与可复现性

### 3.1 静态产物法（三次，完全一致）

```bash
node -e "
const fs=require('fs'),z=require('zlib');
const html=fs.readFileSync('.next/server/app/manager/articles.html','utf8');
const srcs=[...new Set([...html.matchAll(/src=\"(\/_next\/[^\"]+\.js)\"/g)].map(m=>m[1].slice(1)))];
let t=0; for(const s of srcs){t+=z.gzipSync(fs.readFileSync('.next/'+s.replace(/^_next\//,''))).length;}
console.log(t);"
```

三次输出均为 **284100**（gzip 是确定性的，不随运行时波动）。

### 3.2 实际 HTTP 法（交叉验证）

用 production 构建 + `start-next.mjs` 起服务，抓真实页面引用的 chunk 逐个 gzip 累加：

```
managerJsGzip          : 272563
managerArticlesJsGzip  : 284100
homeJsGzip             : 249374
```

**与静态产物法完全一致**（284100），说明测量不是"读了构建中间产物"的假象。

## 4. 剩余体积构成（是否还有优化空间）

`/manager/articles` 的 14 个 chunk，前 6 大：

| gzip | chunk | 内容判定 |
| --- | --- | --- |
| 71,964 | `1tiv4itojgjw1.js` | **React DOM**（框架必需） |
| 44,229 | `1fkaya2t7r343.js` | 框架/工具层 |
| 39,627 | `0cz1d0mv5g_q7.js` | 框架层 |
| 30,756 | `1lsb181dn9m8y.js` | 业务层 |
| 27,894 | `3zewefrw7nxvv.js` | 业务层 |
| 13,203 | `1o8xx-4r40z6z.js` | 业务层 |

**已确认 `SchemaForm`、`tiptap`、`DataTable`、`zod` 均不在首屏最大块内**——
W2-04 的减包工作（拆分 `form-utils`、懒加载 `SchemaForm`/`MediaPicker`）仍然有效，
现在叠加上 SEC-01 的 chunking 修复，两者收益叠加。

进一步压缩只剩 React DOM（框架下限）与 zod（契约校验，不建议裁）。

## 5. 为什么不继续做代码改动

卡定义允许改 `next.config.ts` / `src/components/manager/**` / `src/app/manager/**`。
但：

1. **目标已达成且余量很大**（−23.8% vs 要求 −10%）；
2. 进一步手段（`optimizePackageImports` 收敛 `@tiptap`、组件再懒加载）收益边际递减，
   而 `next.config.ts` 刚被 SEC-01 改过，**短时间内再次改动会削弱"CSS 顺序未验证"这一未决项的归因能力**——
   若 Linux visual 出问题，无法区分是 SEC-01 还是本卡引入的。
3. 按连续执行协议「不阻塞、不过度优化」，记为**目标达成、无需改动**，比"为了改而改"更负责任。

## 6. 验证

| 命令 | 结果 |
| --- | --- |
| 静态产物法 ×3 | 284,100 / 284,100 / 284,100 |
| 实际 HTTP 法 | managerArticlesJsGzip = 284,100 |
| `npm run build` | exit 0 |
| `npm run lint`（--max-warnings 0） | exit 0 |
| `npx tsc --noEmit` | exit 0 |
| `npm test` | 1712 passed |

## 7. 遗留

1. **SEC-01 移除 `cssChunking:false` 后 CSS 顺序尚未在 Linux 验证**——这是本卡收益的同一处改动的风险面，
   归 V8-VIS-02/VIS-03。本卡只证明「体积确实降了」，未证明「视觉无回归」。
2. 卡定义给的验证命令 `node scripts/measure-baseline.mjs --route /manager/articles --runs 3`
   中 `--route` / `--runs` 参数**并不存在**（该脚本只支持 `--out`）。
   已改用等价的自建测量（静态产物法 + 实际 HTTP 法），并在本文件给出可复现命令。
   这条参数不存在的问题已登记，供后续修卡定义时参考。
