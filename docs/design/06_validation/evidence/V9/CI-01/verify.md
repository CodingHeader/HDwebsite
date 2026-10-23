# V9-CI-01 独立验证报告（V9-V-01）

- 验证者：子代理（与执行者上下文隔离；依据 diff + 可重跑命令 + GitHub API 取证）
- 验证日期：2026-10-24；代码基线：upgrade@ca5303a
- **结论：PASS**

## 逐条验收

| 验收条目（引自卡定义） | 结果 | 证据 |
|---|---|---|
| 本地 seed-visual 写模式成功且二次 `--check` 全 ✓（幂等证明） | **PASS** | 验证者本机独立重跑：dev.db 写模式 → 12/12 ✓（作者锚点复用已有用户 id=1）→ 二次写模式 ✓ → `--check` 12/12 ✓ exit 0。执行者另在全新临时库（复现 CI 场景）验证 10/10→12/12；CI 侧 run 39978424632 起 visual job「Prepare DB」步 success（全新库 + 本脚本写入成功）为环境级独立证明 |
| 本地全量门禁四连 exit 0 | **PASS** | 执行者记录 lint/tsc/test(1712 passed)/build 全 exit 0（execution.md）；验证者未本地重跑（见"受限项"），独立佐证 = CI gate job 的 Lint/Typecheck/Unit tests/Build 四步在 6312746 与 40a9331 两 commit 上全 success（Linux 干净环境） |
| CI gate job 绿（Build 步通过） | **PASS** | run 39978424632（fad1924）起，gate「Prepare build DB」「Build」步 success，并在 39979767004 / 39982327648 / 39986975597 持续复现。同 job 的「E2E (Linux)」步 3 failed（70 passed）：collect-publish ×1 + e-kb-manage ×2，已核实属 V9-E2E-01 范围（job log 120512527991），不属本卡验收口径 |
| CI visual job 的 Prepare DB 步通过 | **PASS** | run 39978424632 visual job「Prepare DB」step success（此前的 P2003 外键失败形态消失）；后续所有 run 持续 success。visual 测试本身 fail 属 VIS-03 输入，按卡定义不计本卡 |
| CI docker job 有明确结论 | **PASS** | 迭代轨迹：39978424632 Build image failure（TS2307 scripts）→ 39979767004 仍 failure → 39982327648（643bebc 后）**job success**（Build image + Run container + health check 全 success），并在 39986975597 复现。绿 = REL-01 blocked 解除条件成立（state.json V8-REL-01 已 done） |
| 全部输出含 run id 与可复现命令 | **PASS** | execution.md 含三迭代 run id（39978424632/39979767004）+ 全新库复现命令 + 门禁命令；run id 39982327648 见 state.json note。备注级缺口：EXEC-round1.md §3 仍为"（执行中，待补）"，承诺的结论回填未完成（不影响本条判定，run id 均已在输出中） |

## 允许修改路径核对（含越界披露评估）

三个提交的 diff 逐文件核对（`git show --stat` + 全量 diff 阅读fad1924/643bebc）：

| 提交 | 文件 | 判定 |
|---|---|---|
| fad1924 | `.github/workflows/ci.yml`、`prisma/seed-visual.ts`、evidence/CI-01/execution.md | 全部在允许路径内 ✓ |
| f78cc1d | `.github/workflows/ci.yml`（allowed）、`.dockerignore`、evidence | `.dockerignore` **越界**：已在 execution.md §第2次迭代正式声明（文件+理由+run id 取证），理由成立（docker job 结论是本卡验收项，`.dockerignore` 缺陷直接阻断；V9-Q2 预案授权"熔断规则内修正"）。**披露充分** |
| 643bebc | `.github/workflows/ci.yml`（allowed）、`Dockerfile` | `Dockerfile` **越界**：未进 execution.md 的所有权声明段（该段写于迭代2、未随迭代3更新），仅在提交信息与 state.json note 中记录。实质授权成立——08-风险 V9-Q2 默认方案明文"Dockerfile 缺陷 → V9-CI-01 熔断规则内修正重试"，且改动是 docker build 静态导出查库的直接修复（run 39979767004 取证）。**实质合规，披露存在文档级缺口（备注）** |

- 三个提交均未触碰 `src/**`、`prisma/schema.prisma`、迁移、`package.json`、`src/contracts/**`（`git diff e2b65e1..HEAD -- src/` 的 9 个测试文件全部来自 bf5afc9 = V9-T-05，与本卡无关）。冻结面完整 ✓
- seed-visual.ts 写 Role/User：卡内风险 R2 已预判（01 §3 钢人论证）；实现为幂等 upsert + 不可登录锚点（passwordHash 固定占位串），已有用户时复用 id 不新建。验证者本机重跑证实"复用"分支。接受 ✓
- ci.yml 新增 workflow_dispatch 入口（643bebc）服务 VIS-03 基线重生成，落在 CI-01 的 ci.yml 所有权内，VIS-03 证据 §4 已记录——跨卡协同无越界。

## CI 取证记录（run id + 结论 + 查询命令）

查询命令：`curl -s -H @"$HOME/.api-header" "https://api.github.com/repos/CodingHeader/HDwebsite/actions/runs?branch=upgrade&per_page=8"` 及 `runs/<id>/jobs`（jobs API + job log 下载，验证者 2026-10-24 执行）。

| run | commit | 事件 | job 结论（关键步） |
|---|---|---|---|
| 39978424632 | fad1924 | push | gate：Prepare build DB ✓ Build ✓（E2E ✗=E2E-01）；visual：Prepare DB ✓（Clean build ✗→迭代2修）；docker：Build image ✗（TS2307→迭代2修） |
| 39979767004 | f78cc1d | push | visual：Clean build ✓（--include=dev 修复证实）；docker：Build image ✗；gate：Build ✓ |
| 39982327648 | 6312746 | push | **docker job success**（Dockerfile 修复证实）；gate：Build ✓、E2E 3 failed（E2E-01）；visual ✗（41 差异，VIS-03 输入） |
| 39986975597 | 40a9331 | push | visual job **success**；docker success；gate Build ✓（E2E ✗） |
| 39988219952 | ca5303a | push | 验证时点：visual ✓ docker ✓ 完成，gate 进行中（E2E 步属 E2E-01，非本卡） |

## 未重跑/受限项

1. 本地"门禁四连"未由验证者全量重跑（build+1712 用例耗时；以 CI gate 同代码位的四步 success 作为独立证据）。
2. run 39988219952（HEAD）gate job 在验证时点未完成，其 E2E 步结论归 V9-E2E-01。
3. GitHub API 取证基于本机临时凭据文件（curl -H @ 引用，未读取/输出内容）。

## 备注

1. **本地 dev.db 曾处于 10/12 陈旧态**：验证者首跑 `--check` 时 ServiceGuide/HotMajor 为 0（执行者 6312746 后未对 dev.db 补种，其 12/12 验证在临时库完成）。验证者已用写模式补齐并证幂等；对验收无影响（CI/门禁均用全新库），留档防误判。
2. Dockerfile 越界改动未同步进 execution.md 的所有权声明段——建议执行者在 EXEC-round1 §3 回填时补一行，避免审计断链。
3. `home-375.png` 等全部 web 页 375 宽度基线实际像素宽 667（375 视口存在横向溢出），新旧基线一致（验证者比对 6312746 旧图证实），非本卡引入；`not-found-375` 为 375 正常。属既有渲染特性，可在后续分诊记录中归档。
