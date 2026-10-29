# HDwebsite V2.2 · 未实现需求核查与统一规划

**基线**：`upgrade@79df243`，`origin/upgrade...HEAD = 0 0`（双端已同步）
**规划日期**：2026-10-29
**定位**：核查「哪些需求真的没实现」，并把 V2.1 未执行的 7 张卡 + 本轮新发现的缺陷统一编排。

---

## 一、三条必须先说清的结论

### ① 我上一轮错了一处，执行者的纠正是对的

我在 V2.1 里写「visual 基线差异只有 `88e72d69` 有影响」。实测：

```bash
$ git log --oneline ad4cf70e..5f92871 --no-merges -- "src/app/(web)/" "src/components/web/" | wc -l
7
```

**7 个提交**改过前台，不是 1 个：

| 提交 | 内容 | 对基线的影响 |
|---|---|---|
| `88e72d69` | 手机端导航竖排 + 悬浮层遮挡 + 院校 13 家 | 10 个页面 `-375` |
| `296f7a8e` | V18/A4 首页接线 11 键透传 | `home` 三视口 |
| `6851b015` | V18/A3 9 组件 props 恢复 | `home` |
| `646b5135` | V18/A4 还原 FloatingContact overflow-hidden | 375 |
| `69acba52` | V18/A5 Banner 按钮接线 | `home` |
| `221d2bc5` | V18/A7+C1 数据层复用与守卫 | 数据变化 |
| `49aaf043` | V14-A11Y-01 纯无视觉 | 无 |

执行者提交的 `79df243` 实测只含 **13 张 PNG、0 个非基线文件**，与「13 张变化、0 缺删」一致。

**我的错误性质**：只看了 `88e72d69` 一个提交就下结论，没有做区间 `git log`。这是**归因不完整**，不是数据错误——但足以误导后续判断（若照我的说法，只更新 375 图会漏掉 `home` 三视口）。

### ② V2.1 的 7 张卡一张都没执行

```bash
$ node -e "读取 docs/V2.1-20261029/state.json"
{"ready":7}
```

目标实测：

| 卡 | 目标 | 实测 | 结论 |
|---|---|---|---|
| ENV-01 | `dev.db` 已初始化 | **0 字节** | 未达成 |
| ENV-02 | `/api/health` 含 `app` 标识 | `grep -c hdwebsite` = **0** | 未达成 |
| AUD-01 | `evidence/V21/AUD-01/audit.json` | **文件不存在** | 未执行 |
| AUD-02 | FourCards 归因 | `absolute inset-0 bg-cover bg-center` **仍在** | 未执行 |
| PAR-01 | `evidence/V21/PAR-01/parity.json` | **文件不存在** | 未执行 |
| PAR-02 | 零丢失清单 | 未产出 | 未执行 |
| E1 | 收口 | 未开始 | 未执行 |

`docs/design/06_validation/evidence/V21/` **整个目录不存在**。

**判读**：V2.1 是「规划已交付、执行未启动」。V2.2 不重复发明，**继承 7 卡 + 补本轮新发现**。

### ③ 本轮新发现一个真缺陷：`.env.example` 与 `env.ts` 自相矛盾

这是「按文档配置必然启动失败」的问题，属**需求未被正确实现**。

```bash
# .env.example 第 5-6 行
# 字段加密密钥（AES-256-GCM，…；默认派生自 JWT_SECRET）
# ENCRYPTION_KEY=          ← 被注释掉，且声称"默认派生"

# src/lib/env.ts 第 41-49 行
// JWT_SECRET / ENCRYPTION_KEY：任何环境都要求
for (const key of ["JWT_SECRET", "ENCRYPTION_KEY"] as const) {
  const v = env[key];
  if (!v) { issues.push(key); }          // ← 缺失即失败
  else if (v.length < 32) { issues.push(`${key}(长度<32)`); }
}
```

**矛盾点三条**：

| # | `.env.example` 的表述 | `env.ts` 的实际行为 |
|---|---|---|
| 1 | `ENCRYPTION_KEY` **注释掉**=可选 | **任何环境**缺失即 FATAL |
| 2 | 「默认派生自 JWT_SECRET」 | 代码里**没有**任何派生逻辑，直接读 `env.ENCRYPTION_KEY` |
| 3 | `DATABASE_URL`/`APP_ORIGIN` 也注释掉 | 生产环境（`isProd`）**必须**提供 |

**实测佐证**（V2.1 期间已复现）：

```
[env] FATAL: 以下环境变量缺失或不符合要求，拒绝生产启动（只列键名，不显示值）：
  - ENCRYPTION_KEY
  - APP_ORIGIN
```

而当前 `.env.local` 只有 `JWT_SECRET` 一个键 → **照 `.env.example` 配完仍然起不来**。

---

## 二、需求实现度的真实结论

### 2.1 parity 台账的声明

```bash
$ grep -A6 "^| 状态 | 数量" docs/design/02_requirements/parity-matrix.md
present  50  （A1~A22 + B1~B17 + C1~C11 + D1~D4 + E1~E3 = 57 行中）
replaced  7  （B4、B9、B10、C2、C3、D2、D3，经 ADR 替代）
partial   0
missing   0
UNKNOWN   1  （真实微信/SMTP/Coze 联调，凭证缺失）
```

F 节 11 项新增需求：**present 11 / partial 0**。

### 2.2 我的独立抽验（有限但真实）

对台账中出现的路径做存在性抽验：

```bash
$ for f in src/lib/wechat.ts src/lib/llm-gateway.ts src/lib/notify-gateway.ts \
           src/lib/collect-engine.ts src/components/web/ChatWidget.tsx \
           src/app/api/chat/stream/route.ts src/lib/kb/coze.ts src/lib/jobs/backup.ts
    do [ -e "$f" ] && echo "OK $f" || echo "MISS $f"; done
OK   src/lib/wechat.ts
OK   src/lib/llm-gateway.ts
OK   src/lib/notify-gateway.ts
OK   src/lib/collect-engine.ts
OK   src/components/web/ChatWidget.tsx
OK   src/app/api/chat/stream/route.ts
OK   src/lib/kb/coze.ts
OK   src/lib/jobs/backup.ts
```

**8/8 存在**。台账的主体声明可信。

### 2.3 但有一处抽验失败，需标注为待查

```bash
$ ls src/lib/notify/smtp.ts
MISS
```

台账 F11 说「notify-gateway：…」，未指定 `smtp.ts` 路径。实际 SMTP 实现应在：

```bash
$ grep -rln "nodemailer\|createTransport" src/lib/
src/lib/notify-gateway.ts
src/lib/__tests__/lane-b/notify.test.ts
src/lib/__tests__/notify-before-publish.test.ts
```

**判读**：SMTP 逻辑内联在 `notify-gateway.ts`，不是我猜的独立文件。**这是抽验方法问题，不是台账错误**——但说明「凭文件名推断文件存在性」不可靠，PAR-01 必须用 `git ls-files` 而非路径猜测。

### 2.4 结论：没有「功能性 missing」，但有「可运行性 missing」

| 维度 | 状态 | 依据 |
|---|---|---|
| 功能对等（main 有的功能） | **missing = 0**（台账声明 + 8/8 抽验） | parity-matrix |
| 新增需求（F1~F11） | **present 11/11** | parity-matrix F 节 |
| **可运行性**（能否照文档跑起来） | **未达成** | `dev.db` 0 字节 + `.env.example` 自相矛盾 |
| **环境自证**（能否确认打开的是本项目） | **未达成** | 无 `app` 标识 |
| **差异可追溯**（前台改动是否有据） | **部分** | FourCards 无 ADR |

**这就是本轮的核心判断**：项目不是"功能没做完"，而是**"做完了但跑不利索、说不清楚"**。用户感受到的"需求未被实现"，落在可运行性与可辨识性上，不在功能缺失上。

---

## 三、V2.2 的 8 张卡

| ID | 卡 | 来源 | 规模 | 档位 |
|---|---|---|---|---|
| **DOC-01** | `.env.example` 与 `env.ts` 对齐 | 本轮新发现 | 小 | sonnect |
| **ENV-01** | 启动链路（DB 初始化 + env 前置校验） | V2.1 继承 | 中 | sonnect |
| **ENV-02** | 端口自证（`/api/health` + 启动日志） | V2.1 继承 | 小 | haiku |
| **AUD-01** | 前台 className 差异全量审计（59 文件） | V2.1 继承 | 中 | opus |
| **AUD-02** | FourCards 结构性改写归因 | V2.1 继承 | 小 | opus |
| **PAR-01** | 功能对等独立复核（用 `git ls-files`，不猜路径） | V2.1 继承（方法修正） | 大 | opus |
| **PAR-02** | 前台页面/组件零丢失复核 | V2.1 继承 | 小 | sonnect |
| **E1** | V2.2 收口 | — | 小 | haiku |

**核心/高难度由我本人做**：AUD-01、AUD-02、PAR-01。
**发布后交其它 Agent**：DOC-01、ENV-01、ENV-02、PAR-02、E1。

---

## 四、目录结构

```text
docs/V2.2-20261029/
├── README.md                    ← 本文件
├── 00-规划快照与事实基线.md       ← 全部实测证据 + 事实分级
├── 01-自我纠错与台账可信度.md     ← 我上轮的错误 + parity 台账独立复核
├── 02-未实现需求核查.md           ← 三类"未实现"的逐项判定
├── 03-任务卡与依赖DAG.md          ← 8 卡 × 16 字段 + 机械并行判定
└── state.json                   ← 状态机
```

---

## 五、明确不做

| # | 不做 | 理由 |
|---|---|---|
| 1 | 不重做 V2.0（5/5 done） | 已完成 |
| 2 | 不重新发明 V2.1 的 7 卡 | 规划有效，只是未执行；继承即可 |
| 3 | 不改前台视觉 | REQ-F-014 冻结（除 ADR-039 已追认范围） |
| 4 | 不做全量回归 | 用户明确拒绝 |
| 5 | 不新建分支 | 用户三次强调 |
| 6 | 不改 `src/contracts/**`、`prisma/schema.prisma`、依赖 | AGENTS.md §4 冻结 |
| 7 | 不本地重建视觉基线 | win32 字体不可信；CI `workflow_dispatch` 是正规路径（已由 `79df243` 验证） |

---

## 六、当前唯一阻塞

**B-2 · 用户访问的 URL 仍未知**（`:3000` = Aidean，`:6789` = HDwebsite）。

这决定「移动端误判」的根因，但**不阻塞本规划其余 7 卡**——那些卡的目标（可运行性、可辨识性、差异可追溯）与 URL 无关。

**B-1（推送凭据）已解除**：`79df243` 已推送，双端 `0 0`。
**B-3（remote 归属）已由执行者确认**：`CodingHeader/HDwebsite` 有效（`upgrade=79df243`、`main=94dbbbb`）。
**B-4（视觉基线）已闭环**：CI run 111 重生成 → `79df243` 提交。
