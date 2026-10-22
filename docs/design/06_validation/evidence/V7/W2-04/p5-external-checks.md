# P5 外部条件项核查（2026-10-22）

> 本文件处理计划中的 P5：visual 像素回归、K10 依赖安全、三方真实联调。
> 原则：能验证的给结论，不能验证的给可复现的 UNKNOWN，**不假装完成**。

## 1. visual 像素回归 —— 本机已实跑，判定 UNKNOWN（有硬证据）

### 1.1 实际执行

```bash
# 生产构建 + 启动（需补 D-03 要求的两个 env，值用测试值）
ENCRYPTION_KEY="visual-check-..." APP_ORIGIN="http://127.0.0.1:6789" npm run start
VISUAL_BASE_URL=http://127.0.0.1:6789 npx playwright test -c playwright.config.ts
```

结果：**19 passed / 26 failed**（1.4 分钟）。

### 1.2 失败原因：数据量不可比，不是视觉回归

失败断言全部是**图片尺寸不匹配**：

```
Expected 1440px by 5529px, received 1440px by 3389px   (home @1440)
Expected 1440px by 2696px, received 1440px by 1445px   (about @1440)
Expected 1440px by 1748px, received 1440px by 1445px   (×3 路由)
```

- 同一路由在 **1440/768/375 三种宽度下 receive 高度完全相同**（都是 1445px）→ 页面几乎没有内容。
- 查 dev.db 实测：`Article=0、Course=0、Banner=0、Campus=0、Gallery=0`（空库）。
- 跑 `npm run db:seed` 后：`Article=3、Banner=0、Course=0` —— **仍远少于参照图所依据的数据量**。

参照图（`tests/visual/reference/`，45 张）生成于 Linux/CI + main@94dbbbb **完整数据集**；
本机是 Windows + 空/极简 dev.db。**页面高度差 2140px 是数据量差异，不是样式回归。**

### 1.3 判定

**UNKNOWN（不可判定）**，理由有二，且都是硬条件而不是主观判断：

1. **数据不可比**：参照图依据完整数据，本机 DB 为空/仅 3 条 —— 这是主因（证据见 §1.2 高度数据）。
2. **跨平台渲染差异**：参照图在 Linux 生成，本机为 Windows，字体渲染/图片解码差异无法与真实样式差异分离。

**要得到有效结论，必须**：Linux 环境（CI 或 Docker）+ 与 main 一致的数据集。
本机两次尝试（dev 与 production 模式）都无法绕过。

> 对比：W2-05 / V7-UI-02 此前也判 UNKNOWN，本次是**首次实跑并拿到像素级证据**，
> 结论从"推测不可判"升级为"已证不可判（数据量差 2140px）"。

## 2. K10 依赖安全 —— 严重性被低估，已更正登记

### 2.1 一次重要的自我纠错

先前我跑 `npm audit --json` 得到 **0 漏洞**，差点据此宣布 K10 已失效。**这是错的**：

```bash
npm audit
# npm warn audit 404 Not Found - POST https://registry.npmmirror.com/-/npm/v1/security/advisories/bulk
# [NOT_IMPLEMENTED] /-/npm/v1/security/* not implemented yet
```

本机 registry 指向 **npmmirror（淘宝镜像）**，该镜像**不实现安全审计接口** → 返回 404，
而 `--json` 模式下被解析成"无漏洞"。**这是假阴性。**

### 2.2 用官方 registry 的真实结果

```bash
npm audit --registry=https://registry.npmjs.org --json
```

| 严重度 | 数量 | 主要包 | 修复版本 |
| --- | --- | --- | --- |
| **critical** | **3** | `next`、`vitest`、`tinypool` | next → **16.4.2**；vitest/tinypool → 5.0.5 |
| **high** | **7** | `@next/eslint-plugin-next`、`eslint-config-next`、`braces`、`fast-glob`、`micromatch`、`postcss`、`sharp` | 多数随 next 16.4.2；sharp → 0.35.5 |
| moderate | 4 | — | — |

当前 `next` 版本：**16.2.1**（W2-03 记录要求 16.4.2）。

### 2.3 与 W2-03 记录的差异

W2-03 记录 `critical 1（next）`；本次实测 **critical 3**（新增 `vitest` / `tinypool`）。
原因：vitest 5.0.5 是较新的公告，W2-03 执行时（2026-10-19）尚未收录。

### 2.4 为什么本轮不动

| 项 | 原因 |
| --- | --- |
| `next` 16.2.1 → 16.4.2 | 依赖属**冻结面**（AGENTS.md §4：f158501 后依赖只读，改动须 CCR + 用户批准）；且跨小版本需重跑 `test:visual`，而 visual 在本机 UNKNOWN（§1），升级后**无法验证视觉** |
| `vitest` 5.0.5 | 同上，且 vitest 配置本身也在冻结面 |
| `sharp` 0.35.5 | 跨主版本 |

**结论：登记为 BLOCKING 待裁决项，需用户决定是否授权依赖升级；授权后须在 Linux 环境完成 visual 回归才算闭环。**

## 3. 三方真实联调 —— UNKNOWN（凭证缺失，无变化）

| 集成 | 状态 | 说明 |
| --- | --- | --- |
| 微信公众号 API | UNKNOWN | 无 appid/appSecret；已用 mock 覆盖（`wechat-chat.test.ts`、`testAccount` mock） |
| SMTP 发信 | UNKNOWN | 无主机/账号；已用 nodemailer jsonTransport 覆盖（`notify-*.test.ts`） |
| Coze dataset | UNKNOWN | 无 PAT；已用 mock 覆盖（`lane-c/` 系列） |

按 AGENTS.md §2「完整实现，用 mock 测试，真实联调标 UNKNOWN」，此三项**符合既定口径**，非缺陷。

## 4. 本轮 P5 结论

| 项 | 之前状态 | 现在状态 |
| --- | --- | --- |
| visual 像素回归 | UNKNOWN（推测） | **UNKNOWN（已实跑并取得像素级证据：数据量差 2140px）** |
| K10 依赖安全 | 「1 critical」 | **3 critical / 7 high（官方 registry 实测）；并发现本机镜像 audit 假阴性** |
| 三方联调 | UNKNOWN | UNKNOWN（口径未变，符合 AGENTS.md §2） |

**没有一项被"假装完成"。** 其中 §2.1 的假阴性是一次实质性纠错——
若沿用镜像的 audit 结果，会得出"零漏洞"的错误结论。

## 5. 遗留（需用户裁决/外部条件）

1. **K10 依赖升级**：是否授权升 next 16.4.2 + vitest 5.0.5（修 3 critical）。授权后需 Linux 环境验证 visual。
2. **visual 基线**：需要 Linux CI + 与 main 一致的 seed 数据；建议在 CI 里跑而非本机。
3. 顺带建议：CI 中 `npm audit` 必须显式 `--registry=https://registry.npmjs.org`，否则镜像会返回假阴性。
