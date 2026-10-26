# 执行助手提示词（EXECUTOR）— HDwebsite V1.3

> 用途：把这段提示词整段交给下一个执行 Agent，它即可在无上下文的情况下独立开工。
> 版本：V1.3 · 生成于 2026-10-26 · 基线 `upgrade@f0c1cab`

---

## 提示词正文（复制以下全部内容）

```
【项目】HDwebsite（弘道教育官网 + 管理后台）
【仓库】https://github.com/CodingHeader/HDwebsite
【账号】CodingHeader
【分支】upgrade（★禁止新建分支★，禁止 force push，禁止跨所有权大提交）
【本地目录】E:\Code\Demo\HDwebsite\hdwebsite_1011
【技术栈】Next.js 16 + React 19 + Prisma 7(libsql/SQLite) + Tailwind v4 + zod 4

────────────────────────────────
一、开工前必做（顺序不可颠倒）
────────────────────────────────
1. git fetch origin upgrade && git pull --ff-only origin upgrade
   然后必须核对：git rev-list --left-right --count origin/upgrade...HEAD  → 必须 0 0
2. 读 AGENTS.md（仓库根，唯一规则入口）
3. 读本轮入口：docs/V1.3-20261026/README.md
4. 读 docs/V1.3-20261026/state.json → 取 status=ready 且 depends_on 全部 done 的卡
5. 读该卡定义：docs/V1.3-20261026/tasks/<卡号>.md
6. 读执行协议：docs/V1.3-20261026/05-连续执行协议.md

────────────────────────────────
二、当前进度（2026-10-26 收口，勿重复已完成工作）
────────────────────────────────
已完成：
- V13-E2E-FRESH-01  构建新鲜度守卫平台无关化（commit 748aed1）
- V13-RL-01         限流单源化 + 设置驱动（commit 7d05654）
- V13-Q2-01         用户裁决「每分钟 10 次」已落地（commit 7d05654）

待办（9 张 ready 卡）：
- V13-BASE-01        基线固化（P2，低，先做）
- V13-SEEDVIS-01     seed-visual --check 口径（P2，低）
- V13-VIS-01         visual 红灯归因（main-agent，高）
- V13-GATE-A11Y-01   a11y 接入 CI（main-agent，中）
- V13-UI-HUB-01      content-hub 原生控件清零（main-agent，高，UI 设计与实现）
- V13-UI-CONSIST-01  设计系统一致性抽检 ≥10 页（P1，中）
- V13-PERF-01        性能四条判定（P1，中）
- V13-REQ-01         102 条需求验收逐条判定（P2，大，必须最后做）
- V13-REL-01         台账收口（P1，低，最后做）

────────────────────────────────
三、三条铁律（都有实测教训，违反即返工）
────────────────────────────────
1. 【禁止并行跑 build 与 test】
   实测并行会造出 Hook timed out 假失败（kb-api / llm-usage），
   单跑与串行全量均全绿。门禁必须串行。

2. 【e2e 证据必须附 BUILD_ID 时间戳】
   实测：BUILD_ID 17:54 < src 18:13 → e2e 报 apply-chat 失败；
   rebuild 后同一源码 79/79 全绿。
   V13-E2E-FRESH-01 已在 tests/e2e/global-setup.ts 加硬校验：
   src 比 BUILD_ID 新会直接抛错。改完代码先 npm run build 再跑 e2e。

3. 【visual 只在 Linux CI 判定】
   Windows 字体渲染差异无法与真实样式差异分离；本机跑 visual 结果不计证据。
   基线重生成只能走 CI：workflow_dispatch + visual_update_ref=true，
   禁止手工编辑 tests/visual/reference/*.png。

────────────────────────────────
四、每卡工作循环
────────────────────────────────
1. 领卡：改 state.json 为 in_progress
2. 执行：只在 tasks/<卡号>.md 的「允许修改」路径内写入，越界即 FAIL
3. 界内门禁（串行）：npm run lint && npm run typecheck && npm test && npm run build
4. 卡内验证命令：tasks/<卡号>.md 的「验证命令」节
5. 写证据：docs/design/06_validation/evidence/V13/<卡号>/execution.md
   必含：5W1H 简版、改动文件、验收逐条结果、命令原始输出摘要、BUILD_ID 时间戳、UNKNOWN 及原因
6. commit：前缀 feat/fix/test/docs/chore(V13-XXX)，小而聚焦
7. push：git push origin upgrade；被拒只 rebase，禁 force
8. 心跳：state.json 改 done + commits + note；EXEC-log 追加一行
9. 回到 1

────────────────────────────────
五、绝对禁止
────────────────────────────────
- 新建分支（用户明令，重复三次强调）
- 修改 src/contracts/**、prisma/schema.prisma、迁移、package.json 依赖（冻结面）
  唯一例外：需要新 script 时不要改 package.json，CI 里写全命令
- 任何前台视觉变更（REQ-F-014 冻结）：src/app/(web)/**、src/components/web/**、
  public/**、globals.css 的 web 令牌
- 替用户裁决 MUST 冲突（遇到就写进 evidence 并标 blocked）
- 把 token/密钥写进任何文件、日志、commit message
- 手工改 tests/visual/reference/*.png
- 为"将来可能需要"提前抽象

────────────────────────────────
六、判定与熔断
────────────────────────────────
- 完成定义：所有权内 diff 符合任务 ∧ 验收逐条有结果(PASS/FAIL/UNKNOWN) ∧
  证据可复现 ∧ 门禁全绿 ∧ 未改冻结面
- 同一张卡连续 2 次 FAIL → 停止改代码，重写卡/升档/标 blocked
- 遇外部条件（凭证/权限/网络）→ state 标 blocked + 原因，转下一张，不停工
- 只有剩余卡全部 blocked 才允许停下，并输出 zip 规划包

────────────────────────────────
七、当前已知的 UNKNOWN（不要重复排查，直接沿用结论）
────────────────────────────────
- visual CI 红灯：基线 0728c46 之后 33 提交，但前台 className 变更 0 行 →
  倾向基线/数据漂移；CI artifact 匿名下载 401/403 需 admin。判定方法见 tasks/V13-VIS-01.md 方案 B。
- 真实微信/SMTP/Coze 联调：凭证缺失，AGENTS.md §2 已授权 mock + 标 UNKNOWN，不排卡。
- 多实例下限频跨进程一致性：现状进程内滑窗，REQ-C-003 禁 Redis，本轮不处理。
- 本地 seed-visual --check 失败：本地 dev.db 有 1 条人工残留（id 9226 '测试文章'），
  非种子缺陷；V13-SEEDVIS-01 收敛口径。

────────────────────────────────
八、验证命令速查
────────────────────────────────
npm run lint && npm run typecheck && npm test && npm run build   # 串行！
npm run check:assets && npm run check:root && npm run check:audit
npm run test:e2e                                                 # 需先 build
npx playwright test -c tests/a11y/playwright.config.ts           # 12 例
npx tsx prisma/seed-visual.ts --check
python -c "import os,time;print(time.ctime(os.path.getmtime('.next/BUILD_ID')))"

────────────────────────────────
九、当前基线数值（2026-10-26 实测，用于比对变化）
────────────────────────────────
源码 .ts/.tsx          475 个
API 路由               126 个
前台页面               16 个
管理端页面             42 个
Prisma 模型            48 个
迁移目录               8 个
Setting 键             85 个
单测                   91 文件 / 1859 用例   ← 全绿
e2e                    79 用例                ← 全绿
a11y                   12 用例                ← 全绿（但未接入 CI）
visual                 46 用例                ← CI FAIL（待 V13-VIS-01）
CI gate(Linux)         success @f0c1cab
CI docker              success
CI visual              failure

────────────────────────────────
十、开工第一句
────────────────────────────────
先执行：
  git fetch origin upgrade && git pull --ff-only origin upgrade
  git rev-list --left-right --count origin/upgrade...HEAD
  cat docs/V1.3-20261026/state.json
然后从 V13-BASE-01 开始按 DAG 取卡。
```

---

## 附：本提示词对应的实际状态

| 项 | 值 |
|---|---|
| 生成基线 | `upgrade@f0c1cab` |
| 与远端关系 | 0 0 |
| 已完成卡 | 3（E2E-FRESH-01、RL-01、Q2-01） |
| 待办卡 | 9（全部 ready，无 blocked） |
| CI 结论 | gate success / docker success / visual failure |

## 附：为什么提示词里反复强调"不新建分支"

用户原话三次强调「禁止新建分支」。V0.7 起本项目已是 `upgrade` 单主线，
历史上 Wave 1 的 5 条 lane 分支已在 `4cbd9c1` 全部删除。新建分支会造成
集成冲突与所有权越界（`827646b` 的教训），故写入硬禁止。
