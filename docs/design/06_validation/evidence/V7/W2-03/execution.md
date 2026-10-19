# W2-03 · 依赖归类与安全收口（部分）

> 执行者：P2　分支：`upgrade`　V0.7 依赖：无
> **状态**：**不阻塞部分已完成**；K10 BLOCKING 裁决项待用户决定。

## 一、实测 audit（2026-10-19，官方 registry）

### audit-before（原始）
| 严重度 | 数量 | 包 |
|---|---|---|
| critical | 1 | next (direct) → 需 16.4.2 |
| high | 6 | prisma (direct)、@prisma/config、deepmerge-ts、mysql2、postcss、sharp (direct) |
| moderate | 3 | argparse、mammoth (direct)、sprintf-js |
| low | 0 | — |

### audit-after（本次部分升级后）
| 严重度 | 数量 | 变化 |
|---|---|---|
| critical | 1 | next 仍待 16.4.2（K10） |
| high | 2 | prisma/@prisma/config/deepmerge-ts/mysql2 **已修复**；残留 postcss（靠 next 16.4.2 修）、sharp（需 0.35.5，跨主版本） |
| moderate | 3 | mammoth 系列（需 0.3.29，跨主版本） |
| low | 0 | — |

## 二、不阻塞部分已完成

| 项目 | 状态 | 证据 |
|---|---|---|
| `@types/nodemailer` 移入 devDependencies | PASS | `node -e "process.exit(require('./package.json').dependencies['@types/nodemailer']?1:0)"` EXIT=0 |
| `prisma` / `@prisma/client` / `@prisma/adapter-libsql` 升到 ^7.10.1（补丁号内安全修复） | PASS | package.json `^7.10.1`；`npx prisma generate` EXIT=0；`npm test` 666/666 全绿 |
| 通用门禁 | PASS | `npm test` 666/666、`tsc` 0、`eslint` 0、`npm run build` 0 |

## 三、BLOCKING K10 裁决项（须用户决定）

规划文档明确 K10 为 BLOCKING：
- **next 16.2.1 → 16.4.2**：修 1 critical（`next` advisory）+ 修 postcss（high）。跨小版本升级（16.2→16.4），回归风险需评估。
- **vitest 3.x → 5.x**：规划文档假设"需升主版本"，但实测 audit 未把 vitest 列为漏洞（不阻塞）。
- **sharp 0.34.5 → 0.35.5**：修 high，跨主版本。
- **mammoth 1.13 → 0.3.29**：修 moderate，**降主版本**（不推荐）。

### next RCE 严重度补充（子代理复审发现）
`audit-after.json` 中 next 的 advisory 聚合含多条 critical 源（source 1193676 / 1193732 / 1240609），涉及：
- Unauthenticated RCE on windows-hosted（本机为 win32，**直接命中**）
- Image Optimization AVIF RCE
- next/og ImageResponse RCE

`fixAvailable.version = 16.4.2`。**升级优先级高**，但跨小版本需评估前台视觉回归（REQ-F-014 冻结面），建议 K10 裁决材料中把此 RCE 风险显式列出。

### 未裁决前的默认策略
- 只做补丁号升级并记录残留（规划文档 §W2-03 明确"未裁决前只做补丁号升级并记录残留"）。
- 因此 next / sharp / mammoth 的升级全部推迟到 K10 裁决后。

## 四、执行过程中的问题与解决

1. **npmmirror 镜像不支持 audit 端点**：`npm audit` 直接 404。解决：临时 `--registry=https://registry.npmjs.org` 跑 audit，不改全局配置。
2. **`NODE_ENV=production` 导致 `npm ci` 自动 omit devDeps**：vitest 等 devDeps 全部丢失，测试跑不起来。解决：`NODE_ENV=development npm ci` 重装，恢复 node_modules；vitest 3.2.7 已回位。
3. **prisma 升级需重新 generate**：`npx prisma generate` 后测试恢复 666/666 全绿。

## 五、验收标准逐条核对

| # | 验收 | 结果 | 证据 |
|---|---|---|---|
| 1 | `@types/nodemailer` 不在 dependencies | PASS | node 检查 EXIT=0 |
| 2 | audit-after critical=0 或每条有 K10 记录 | **部分** | critical 1 条（next），已按 K10 默认策略**记录残留**，升级待裁决 |
| 3 | 通用门禁 exit 0 | PASS | `npm test` 666/666、`tsc` 0、`eslint` 0、`build` 0 |
| 4 | 提交文件 ⊆ 允许修改 | PASS | 仅 `package.json`、`package-lock.json`、evidence 目录 |
| 5 | 未触碰冻结面 | PASS | `src/contracts/**`、`prisma/**`、`vitest.config.ts`、前台 `(web)/**` 零改动 |

## 六、验证命令（2026-10-19 本地）
```bash
$ NODE_ENV=development npm ci --registry=https://registry.npmmirror.com
EXIT=0   # 必须 development，否则 omit devDeps
$ NODE_ENV=development npx prisma generate
EXIT=0
$ npm test
EXIT=0
 Test Files  49 passed (49)
      Tests  666 passed (666)
$ npx tsc --noEmit
EXIT=0
$ npm run build
EXIT=0
$ npm audit --registry=https://registry.npmjs.org --json
critical: 1 / high: 2 / moderate: 3 / low: 0
```

## 七、待办（K10 裁决后）
- next 16.2.1 → 16.4.2（修 critical + postcss high）
- sharp → 0.35.5（修 high，跨主版本，需评估 API 变化）
- mammoth 降主版本**不推荐**，建议保持 1.13 并记录 moderate 残留
- W2-09（check-assets + check-root + 删除 .tmp-pa.h）依赖 W2-03 完成