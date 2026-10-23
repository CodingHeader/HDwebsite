# V9-CI-01 执行证据（2026-10-23）

## 5W1H 简版

- **What**：修复 CI 双 job 失败根因（gate Build 无库、visual seed 外键），新增 docker job 解除 V8-REL-01 阻塞。
- **Why**：CI 9 连败（00-事实基线 §2）；V0.8 剩余三卡全部依赖 CI 真实结果。
- **Where**：`.github/workflows/ci.yml`（gate + 新 docker job）、`prisma/seed-visual.ts`（外键自足）。
- **When**：2026-10-23，基线 c9bebe3 + 规划提交 fa49deb。
- **Who**：主代理执行；验证待子代理（V9-V-01）。
- **How**：见下"改动文件"与"复现命令"。

## 改动文件

| 文件 | 改动 |
|---|---|
| `.github/workflows/ci.yml` | ① gate job「Prisma generate」后新增 **Prepare build DB** 步（`npx prisma migrate deploy`，注释含因果链）；② 文件末新增 **docker** job（build → run（四键 e2e 占位 env）→ /api/health 探活 → cleanup） |
| `prisma/seed-visual.ts` | ① 新增 `ensureVisualAuthor()`（已有活跃用户→复用其 id；全新库→upsert super-admin 角色 + 建不可登录的锚点用户）；② 模块级 `AUTHOR_ID`，articles 工厂 `authorId: AUTHOR_ID`（原写死 `1` 依赖 seed.ts 的隐式契约移除）；③ main() 写模式在 createMany 前调用；④ 头注释补充例外声明 |

## 验收逐条结果

| 验收条目 | 结果 | 证据 |
|---|---|---|
| 本地 seed-visual 写模式成功且二次 --check 全 ✓（幂等） | **PASS** | 全新临时库 `prisma/v9-ci-check.db`：migrate deploy → seed（10/10 ✓，锚点用户 id=1）→ 重复写（✓）→ --check（✓）；复现了 CI 失败场景（全新库）并证明修复。原失败形态：`article.createMany() P2003`（CI run 39939994990 日志） |
| 本地全量门禁四连 exit 0 | **PASS** | `npm run lint` exit 0（--max-warnings 0）；`npx tsc --noEmit` exit 0；`npm test` **1712 passed / 72 files**；`npm run build` exit 0 |
| CI gate job 绿（Build 步通过） | 待 CI | 推送后轮询（见下） |
| CI visual job Prepare DB 步通过 | 待 CI | 同上（visual 测试本身允许 fail，归 VIS-03） |
| CI docker job 有明确结论 | 待 CI | 同上 |
| 全部输出含 run id 与可复现命令 | **PASS** | 本文件 + EXEC-round1 |

## 复现命令

```bash
# 1) 全新库复现 CI 场景 + 修复证明（临时库，用后即删）
rm -f prisma/v9-ci-check.db
DATABASE_URL="file:./prisma/v9-ci-check.db" npx prisma migrate deploy
DATABASE_URL="file:./prisma/v9-ci-check.db" npx tsx prisma/seed-visual.ts        # 10/10 ✓（修复前此处 P2003）
DATABASE_URL="file:./prisma/v9-ci-check.db" npx tsx prisma/seed-visual.ts        # 幂等 ✓
DATABASE_URL="file:./prisma/v9-ci-check.db" npx tsx prisma/seed-visual.ts --check # 10/10 ✓
rm -f prisma/v9-ci-check.db

# 2) 全量门禁
npm run lint && npx tsc --noEmit && npm test && npm run build

# 3) CI 结论（run id 见 EXEC-round1）
curl -s -H @~/.api-header "https://api.github.com/repos/CodingHeader/HDwebsite/actions/runs?branch=upgrade&per_page=1"
```

## 设计要点（为什么这样修）

1. **gate 加 migrate 而非给 settings 查询加 try/catch**：`no such table` 是环境条件不是单点缺陷；构建期 DB 不可用应 fail-fast，静默回退默认值会把"库挂了"伪装成"网站没内容"。与 visual job 的 Prepare DB 同口径。
2. **seed-visual 自足而非 workflow 补 `prisma db seed`**：seed.ts 会创建 ManagerMenu/Setting/多角色等额外数据，混入会改变页面高度、污染 visual 比对基线；且"隐式跨脚本依赖"正是本次事故根因。锚点用户 passwordHash 为固定占位串（对任何输入 bcrypt.compare 都不匹配=不可登录），不构成凭据。
3. **docker job 不推镜像**：无 registry 凭据需求，只验证 build + 启动 + 探活三件事，即 REL-01 blocked 的解除条件。
4. YAML 语法经 `python yaml.safe_load` 校验通过。

## UNKNOWN

- CI 三 job 结论：推送后轮询，结论回填 EXEC-round1.md §3（本文件不动，保持执行时点快照）。

## 第 2 次迭代（run 39978424632 取证后的修正，同卡熔断规则内：FAIL 1 次）

run 39978424632（fad1924）结果：**gate 修复被证实**（Prepare build DB → Build → 审计 → 密钥扫描全绿，E2E 进行中）；**visual Prepare DB 修复被证实**（seed 10/10 写入成功）。但暴露两个此前不可见的新失败点：

1. **visual job Clean build 失败**：`Cannot find module '@tailwindcss/postcss'`。
   根因：job 级 `NODE_ENV: production` 使 `npm ci` 跳过 devDependencies（Tailwind v4 的 PostCSS 插件是 devDep）。
   修复：Install 步改 `npm ci --include=dev`（含注释）。
2. **docker job Build image 失败**：`TS2307: Cannot find module '../../../../scripts/start-next-utils.mjs'`。
   根因：`.dockerignore` 整体排除 `scripts/`，而 `src/lib/__tests__/lane-d/start-next-utils.test.ts` import 了它，`next build` 的类型检查在容器内找不到模块。本地不复现（文件系统完整）。
   修复：取消 `scripts` 整体排除（builder 阶段需要；runner 阶段 COPY 为显式清单，scripts 不进最终镜像，零运行时成本）。已复核 src/ 无其他指向被排除目录的 import。

**所有权扩展声明（AGENTS §4 越界报备）**：本轮实际改动文件超出 V9-CI-01 原允许路径 —— `.dockerignore`（归 V8-REL-01 遗留物）与 visual job 的 Install 步（`.github/workflows/ci.yml` 内，已在原路径内）。理由：docker job 的结论是本卡验收标准之一，`.dockerignore` 缺陷直接阻断该结论，属 08-风险 V9-Q2 预案的"Dockerfile 相邻缺陷在熔断规则内修正"。state.json note 同步更新。
