# V8-SEC-02 执行证据：sharp 0.34.5 → 0.35.5（运行时 high 收口）

- 执行者：主代理 ｜ 分支 `upgrade` ｜ 日期 2026-10-22
- 前置：V8-SEC-01 已完成（`b911666`，next 16.4.2）
- 授权：Q1 = 只升不降，**拒绝 audit 建议的降级修复**

## 1. 起点（SEC-01 之后，官方源实测）

```bash
npm audit --omit=dev --registry=https://registry.npmjs.org --json
```

| 严重度 | 数量 | 包 |
| --- | --- | --- |
| critical | **0** | —（SEC-01 已清零） |
| **high** | **1** | **`sharp`**（当前 0.34.5，修复版 0.35.5） |
| moderate | 3 | `argparse`、`mammoth`、`sprintf-js` |

## 2. 升级前的前置校验（不盲升）

| 项 | 命令 | 结果 |
| --- | --- | --- |
| 当前版本 | `node -e "require('sharp/package.json').version"` | 0.34.5 |
| 目标版本存在 | `npm view sharp@0.35.5 version` | 0.35.5 ✅ |
| Node 引擎要求 | `npm view sharp@0.35.5 engines` | `{ node: '>=20.9.0' }` |
| 本机 Node | — | v24.x ✅ 满足 |

> 关键判断：0.35.5 的引擎要求从 `^18.17 || ^20.3 || >=21` 收紧到 `>=20.9.0`。
> 本机与 CI（node 24）都满足，**不构成阻塞**；但 Node 18 环境将无法安装，已在 §6 登记。

## 3. 执行升级

```bash
npm install sharp@0.35.5 --registry=https://registry.npmjs.org
```

`package.json`：`"sharp": "^0.35.5"`

### 3.1 一个容易误判的报错（记录以免后人重踩）

升级后 `require('sharp/package.json')` 抛：

```
Error [ERR_PACKAGE_PATH_NOT_EXPORTED]: Package subpath './package.json' is not defined by "exports"
```

**这不是安装失败**——是 0.35 收紧了 `exports` 字段，不再暴露 `package.json`。安装本身成功。
所以后续一律用 `grep '"sharp"' package.json` 与 `require('sharp').versions.sharp` 判断版本。

## 4. 功能验证（原生模块，必须实跑）

### 4.1 加载与编解码

```js
const sharp = require("sharp");
sharp.versions.sharp   // "0.35.5"
// 依赖库：vips 8.18.7 / mozjpeg 0826579 / libwebp 1.6.0 / png 1.6.58 ...
// 8×8 png 编码 → 96 bytes ✅
```

### 4.2 复刻 `upload/route.ts` 的真实缩略图调用

`src/app/api/upload/route.ts` 的 `makeThumbnails()` 用的是
`sharp(absPath).resize({ width, withoutEnlargement: true }).webp({ quality: 80 })`，
三档宽度 160 / 480 / 1080。按同样调用实测：

| 目标宽度 | 输出尺寸 | 格式 | 字节 |
| --- | --- | --- | --- |
| 160 | 160×107 | webp | 104 |
| 480 | 480×320 | webp | 346 |
| 1080 | 1080×720 | webp | 1466 |

三档全部正确（等比缩放、格式正确、无 `withoutEnlargement` 误放大）。

## 5. 审计结果（升级后）

```bash
npm audit --omit=dev --registry=https://registry.npmjs.org --json
```

| 严重度 | 数量 | 剩余包 |
| --- | --- | --- |
| critical | **0** | — |
| high | **0** ✅ | — |
| moderate | 3 | `argparse`、`mammoth`、`sprintf-js` |

**运行时依赖 critical + high 全部清零。**

### 5.1 为什么 3 个 moderate 不动

| 包 | 修复建议 | 处置理由 |
| --- | --- | --- |
| `mammoth` | 0.3.29 | `mammoth` 用于解析 .docx；0.3.29 是最新补丁版，但**当前已满足 ADR-025 的文件类型白名单需求**，且 moderate 无已知可利用路径（只解析用户主动上传的 docx，非公开输入）。安排到 T-03 之后视情况升级 |
| `argparse` / `sprintf-js` | 传递依赖 | 由上游包带入，非直接依赖；强行 override 可能破坏上游。等上游升级 |

> 按 Q1 授权「只升不降」，本轮**没有**采纳任何 audit 建议中的降级方案。

## 6. 门禁

| 命令 | 结果 |
| --- | --- |
| `npx tsc --noEmit` | exit 0 |
| `npm run lint` | exit 0（0 errors） |
| `npm test` | **1712 passed**（较升级前 1705 增加 7 条，来自 T-02 新增用例） |
| `npm run build` | exit 0 |

## 7. 遗留与风险

1. **Node 18 不再兼容**：sharp 0.35.5 要求 `>=20.9.0`。`package.json` 的 `engines` 目前写 `>=24`，
   与之一致，**无需改动**；但若将来要在 Node 18 上部署会失败——已登记。
2. **原生二进制随平台变化**：sharp 0.35 换了 vips 8.18.7。e2e / 生产构建已跑通；
   **Linux（Docker / CI）上的实际表现本轮未验证**，归 V8-REL-01（Docker Linux 冒烟）。
3. 3 个 moderate 未处理，理由见 §5.1。
