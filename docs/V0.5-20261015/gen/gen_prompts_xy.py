# -*- coding: utf-8 -*-
"""2 名执行者模式（用户 2026-10-13 裁决 D11=2）：生成 X、Y 两份可独立下发的完整提示词。
用法：python3 gen_prompts_xy.py <规划包目录>（须先跑 gen.py 与 gen_prompts.py）"""
import os, sys, json, re
sys.path.insert(0, os.path.dirname(__file__))
from tasks import T, LANES, OWNERSHIP, EXCLUDE, COMMON_FORBID
OUT = sys.argv[1]
_argv = sys.argv[:]
import gen_prompts as GP  # 复用通用段落（gen_prompts 运行时会重写单线提示词，结果不变）
sys.argv = _argv
chk = json.load(open(f"{OUT}/gen-check.json", encoding="utf-8"))
import copy
ids = {t["id"]: copy.deepcopy(t) for t in T}
# 2 人模式覆盖（只作用于 X/Y 提示词；分卡 tasks/*.md 保持通用版本）
ids["A-07"].update(tier_why="检查点 review", title="A-07 检查点：A-01~A-04 由 Y 独立验证后在 lane/ui 打 tag w1-ui-kit（2 人模式不合入 upgrade）",
    wp="WPA.5 组件检查点", goal="E 线迁移特殊页（E-05/E-06）前，确认新组件 API 稳定且向后兼容",
    outputs=["git tag w1-ui-kit（打在 lane/ui 并推送该 tag）", "docs/design/06_validation/evidence/W1-A/A-07-checkpoint-verify.md"],
    steps=["推送 lane/ui，把 `w1-base..lane/ui` 作为验证请求交 Y（只看 diff 与命令结果）", "PASS 后 `git tag w1-ui-kit && git push origin w1-ui-kit`", "E-05/E-06 开工前确认 tag 存在；同一分支，无需 merge"],
    accept=["A-07 验证报告结论 PASS（已提交进证据目录）", "`git diff --name-only w1-base..w1-ui-kit` 全部属于 A 线所有权", "GATE、VIS、E2E 全绿"],
    escalate="FAIL → 在 lane/ui 修复后重发验证请求；E-05/E-06 顺延，E-01~E-04 不受影响")
ids["W2-01"].update(title="按 lane/backend → lane/ui 顺序合并两条执行线分支，逐次跑门禁",
    goal="两条执行线合入 upgrade，冲突为 0 或仅限证据文档；每次合并后全量门禁通过",
    inputs="origin/lane/backend、origin/lane/ui 与各卡 PASS 验证报告",
    steps=["每条分支合并前确认其全部卡验证报告 PASS 并做密钥扫描", "合并后 GATE+VIS+E2E", "合并完成立即推送 upgrade，通知 Y 从此拉 w2/backend"],
    accept=["`git log --merges --first-parent w1-base..upgrade` 含 2 次 Wave 1 合并（CCR 合并另计）", "每次合并后门禁全绿（日志入证据）"])
for k in ("W2-03", "W2-04"):
    ids[k]["title"] = ids[k]["title"].replace("（D 线负责人执行）", "（Y 在 w2/backend 执行，X 验证后合并）")
for k in ("W2-02", "W2-08", "W2-09", "W2-05", "W2-06", "W2-07"):
    ids[k]["title"] = ids[k]["title"].replace("（D 线负责人执行）", "")
days = GP.days

BR = {"lane/a-manager-ui": "lane/ui", "lane/e-manager-pages": "lane/ui", "lane/b-api-platform": "lane/backend",
      "lane/c-ai-kb": "lane/backend", "lane/d-ops": "lane/backend"}
def two(s):
    for a, b in BR.items(): s = s.replace(a, b)
    s = s.replace("五线", "两条执行线").replace("通知集成者", "告知用户与 X").replace("交集成者", "交用户裁决")
    return s

def card(t, lane_name):
    d = lambda xs: "\n".join(f"  - {x}" for x in xs) if xs else "  - 无"
    num = lambda xs: "\n".join(f"  {i}. {x}" for i, x in enumerate(xs, 1))
    extra_forbid = [f for f in t.get("forbid", []) if f not in COMMON_FORBID]
    s = f"""#### {t['id']}　{t['title']}

- **工作包 / 切片**：{t['wp']}　/　{t['slice']}
- **来源需求**：{t['req']}
- **目标**：{t['goal']}
- **输入**：{t['inputs']}
- **依赖**：{', '.join(t['deps']) or '—'}　**档位**：{t['tier']}（{t['tier_why']}）　**规模**：{t['size']}（计划 {days(t)} 人天）
- **输出（新增/修改）**：
{d(t['outputs'])}
- **执行步骤**：
{num(t['steps'] + ['跑本卡验证命令与通用门禁，把命令、exit code、关键输出写入证据目录', f"提交：`git commit -m \"<feat|fix|test|docs>({t['id']}): <摘要>\"`（只含允许路径）"])}
- **验收标准**（全部满足；最后两条对每张卡都适用）：
{d(t['accept'] + ['通用门禁 `npm run lint && npm run typecheck && npm test && npm run build` 全部 exit 0', '`git log --first-parent --no-merges --name-only --format= <本卡起点>..HEAD | sort -u` 全部落在本卡“允许修改”内'])}
- **验证命令**：
```bash
{chr(10).join(t['verify'])}
```
- **允许修改**：
{d(t['allow'])}"""
    if extra_forbid: s += "\n- **本卡额外禁止**：\n" + d(extra_forbid)
    if t.get("assume"): s += "\n- **假设**：" + "；".join(t["assume"])
    s += f"\n- **升级/熔断**：{t['escalate']}；同一卡连续 2 次独立验收 FAIL → 停止改代码，写失败分析交用户裁决"
    s += f"\n- **证据目录**：`docs/design/06_validation/evidence/{lane_name}/{t['id']}/`"
    return two(s)

def ev(L): return {"Z": "W0", "W": "W2"}.get(L, "W1-" + L)

def owner_list(Ls):
    out = []
    for L in Ls:
        out.append(f"**{LANES[L]['name']}**")
        out += [f"- `{p}`" for p in OWNERSHIP[L]]
        if EXCLUDE.get(L): out.append("- 排除：" + "、".join(f"`{p}`" for p in EXCLUDE[L]))
        out.append("")
    return "\n".join(out)

def special(L):
    s = GP.LANE_INTRO[L]["special"].replace("## 本线特别规则", f"**{LANES[L]['name']} 的特别规则**")
    if L == "A":
        s = re.sub(r"- M1（A-07）：.*", "- A-07 检查点（2 人模式）：A-01~A-04 完成后把 `w1-base..lane/ui` 交给 Y 独立验证；PASS 后在 `lane/ui` 打 tag `w1-ui-kit` 并推送该 tag。**不合入 upgrade**（upgrade 在 Wave 2 之前不变）。E 线就在同一分支继续，不需要 merge。", s)
        s = s.replace("E 线在 M1 之前一直按旧 API 开发。", "（E 线在 2 人模式下排在 A-07 之后，可直接使用新组件；但兼容仍是硬约束，因为 36 个现有页面在 E-05/E-06 迁移前仍走旧 API。）")
    if L == "E":
        s = s.replace("- **M1 之前**（E-01~E-04）：只使用 w1-base 已有的组件 API（CrudPage、PageHeader、FormDialog、SchemaForm、feedback/*）。A 线保证这些 API 向后兼容，所以 M1 合入后你的页面自动升级，不需要返工。",
                      "- 2 人模式下 E 线全部排在 A-07 检查点之后：E-01~E-04 可以直接使用新组件（DataTable、ResourceForm、新 CrudPage），也可以沿用旧 API——两者都兼容。")
        s = s.replace("- **M1 之后**：`git merge --no-ff w1-ui-kit` 再开工 E-05/E-06。", "- E-05/E-06 开工条件：tag `w1-ui-kit` 已存在（A-07 检查点 PASS）。同一分支，无需 merge。")
    if L == "C":
        s = s.replace("（D 线所有）", "（D 线所有——也是你自己的 D 段，但必须在 D 段的卡里改，不得混进 C 卡的提交）")
    if L == "B":
        s = s.replace("`src/lib/jobs/**` 归 D 线，你只导出函数并写 CCR，单测直接调用验证。", "`src/lib/jobs/**` 归 D 段：B-06 只导出函数并单测直接调用；注册到 `notify.scan` 由 W2-08 统一做（不要在 D 段顺手改，避免越界口径混乱）。")
    return two(s)

def table(order):
    rows = ["| 序 | 卡号 | 任务 | 依赖 | 档位 | 人天 |", "|---|---|---|---|---|---|"]
    for i, n in enumerate(order, 1):
        t = ids[n]; rows.append(f"| {i} | {n} | {t['title']} | {', '.join(t['deps']) or '—'} | {t['tier']} | {days(t)} |")
    return "\n".join(rows)

FACTS = """## 项目事实快照（2026-10-13 实测；开工后以你自己的命令结果为准）

- 仓库：`https://github.com/CodingHeader/HDwebsite`（公开）。前台视觉标准 = `origin/main@94dbbbb`（红色横幅轮播）。
- 开发基线：`upgrade@bb2c0e51364aca4608d2a5832e31462b9c54ccf8`。P0~P06 已完成：visual 46/46、E2E 8/8、vitest 17 文件 210 测试。
- 基线门禁：`npm ci`、`npx prisma generate`、`npm run lint`（0 error / 21 warning）、`npm run typecheck`、`npm test`、`npm run build`（约 77s）全部 exit 0。
- 管理端：`/manager` 36 页 = 25 个 CrudPage 规格页 + 1 个 content-hub 包装页 + 10 个特殊页；页面层原生控件 46 处；`@radix-ui` 仍被 7 个文件引用。
- API：24 个路由未走 withApi/CRUD，另 2 个混合文件；错误码只有 200/400/401/403/404/500（限流目前返回 400，503 不存在）。
- 知识库：P06 已有 `kb-sync.ts` 注册入口但未注册 Coze；`ChatScene.baseIds` 字段已存在但后端未读取。
- 存储：standalone 构建后 `.next/standalone/uploads` ≈ 32M，运行后增至 ≈ 45M / 526 文件——运行时写进了构建目录。
- 性能基线：首页 JS gzip 227,007 B；`/manager` 345,853 B；`/manager/articles` 352,019 B；standalone Ready 7.3s；首页热 TTFB ≈ 33~42ms；文章列表 API TTFB ≈ 20~31ms。
- 已定裁决：D6 保留 `data.fieldErrors`；D7 `created()` 业务 code 200 / HTTP 201；D8 Wave 0 通过后推送 upgrade 与 tag `w1-base`；D9 保留前台死组件 `ApplyForm` 及其依赖；D11 执行者 2 名（X、Y）。"""

TEAM = """## 团队与协作方式（两人都按这一节执行）

| | 执行者 X（管理端 UI 线） | 执行者 Y（契约与后端平台线） |
|---|---|---|
| Wave 0 | 逐卡独立验证 Y 的 W0 提交，W0-08 给最终 PASS/FAIL | 契约员：W0-01~W0-08，直接提交在 upgrade |
| Wave 1 | 分支 `lane/ui`：A → A-07 检查点 → E → A-08 | 分支 `lane/backend`：B → C → D |
| 交叉验证 | 验证 Y 的每个工作包 | 验证 X 的每个工作包（含 A-07 检查点） |
| Wave 2 | 集成者：W2-01、W2-02、W2-08、W2-05、W2-06、W2-07 推送打包 | 分支 `w2/backend`：W2-03、W2-09、W2-04；做 W2-07 终审验证 |

1. **没有实时通信**。两人之间只有三种共享物：git 远端（分支与 tag）、本规划包、由用户转交的《验证请求》/《验证报告》文本。
2. **验证请求**（执行者在一个工作包完成、推送分支后发出，交用户转给对方）：
```text
验证请求 <线>/<工作包>
分支：<lane/ui | lane/backend | upgrade>　起点..终点：<commit>..<commit>
卡号：<列表>（验收标准与命令见我的提示词“任务卡”节，对方提示词里也有同一份规划包 tasks/）
已跑：lint/typecheck/test/build（exit 码）、visual、e2e、本卡命令
已知 UNKNOWN：<条目与原因>
```
3. **验证报告**由验证者按本提示词“独立验证者职责”节产出，交用户转回；被验证方把它原样提交进自己证据目录（`docs(<卡号>): verify report`）。验证者**不往对方分支提交**。
4. **等验证时不空等**：继续做依赖已满足的下一张卡。必须等 PASS 才能继续的硬闸门只有三个：`w1-base`（W0-08）、`w1-ui-kit`（A-07，挡 E-05/E-06）、Wave 2 进入条件。
5. 同一卡连续 2 次验证 FAIL → 熔断：停止改代码，写失败分析，交用户裁决。
6. 两人都需要改同一冻结面（契约、迁移、依赖、配置）→ 写《契约变更请求》交用户裁决；批准后由 Y 在 upgrade 上做最小提交并打 `w1-base-ccr-<n>`，双方 `git merge --no-ff` 该 tag。"""

VERIFIER = two(open(f"{OUT}/prompts/提示词-独立验证者.md", encoding="utf-8").read())
VERIFIER = VERIFIER.replace("# 提示词：独立验证者（每条线、每个工作包都用它；必须是另一个会话，不能是执行者本人）", "## 独立验证者职责（验证对方时，切换到这个角色；用一个新的干净克隆，不在你自己的工作目录里验证）")
VERIFIER = VERIFIER.replace("合并进来的 M1 `w1-ui-kit` 与已批准 CCR 不计入", "合并进来的已批准 CCR 不计入")
VERIFIER = re.sub(r"^## ", "### ", VERIFIER.split("\n", 1)[1], flags=re.M)
VERIFIER = "## 独立验证者职责（验证对方时切换到这个角色；用新的干净克隆，不在自己的工作目录里验证）\n" + VERIFIER.replace("（由集成者给你）", "（来自对方的《验证请求》）").replace("或直接回给集成者", "或作为《验证报告》文本交用户转回").replace("由集成者决定是否放行", "由用户决定是否放行")

def setup(branch, base):
    return f"""```bash
git clone https://github.com/CodingHeader/HDwebsite.git && cd HDwebsite
git fetch --all --tags
{base}
npm ci && npx prisma generate
cp .env.example .env.local   # 只填测试用随机 JWT_SECRET（≥32 位）；不得提交
npm run lint && npm run typecheck && npm test && npm run build   # 先确认起点全绿，否则停止并汇报
```"""

X_ORDER_A = ["A-01", "A-02", "A-03", "A-04", "A-07", "A-05", "A-06"]
X_ORDER_E = ["E-12", "E-01", "E-02", "E-03", "E-04", "E-05", "E-06", "E-09", "E-10", "E-11", "E-07", "E-08", "A-08"]
X_W2 = ["W2-01", "W2-02", "W2-08", "W2-05", "W2-06", "W2-07"]
Y_W0 = ["W0-01","W0-02","W0-03","W0-R0","W0-04","W0-05","W0-06","W0-07","W0-09","W0-08"]
Y_B = ["B-01", "B-02", "B-04", "B-03", "B-05", "B-06", "B-07"]
Y_C = ["C-01", "C-03", "C-02", "C-04", "C-05", "C-06", "C-07", "C-08", "C-09", "C-10", "C-11", "C-12"]
Y_D = ["D-01", "D-02", "D-03", "D-04", "D-05", "D-06", "D-07", "D-08", "D-09", "D-10", "D-11", "D-12", "D-13"]
Y_W2 = ["W2-03", "W2-09", "W2-04"]
for grp in [X_ORDER_A + X_ORDER_E + X_W2 + Y_W0 + Y_B + Y_C + Y_D + Y_W2]:
    assert sorted(grp) == sorted(ids), set(ids) ^ set(grp)

def check_order(order):
    seen = set()
    for n in order:
        for d in ids[n]["deps"]:
            assert d in seen or d not in order, (n, d)
        seen.add(n)
for o in [X_ORDER_A + X_ORDER_E, Y_W0 + Y_B + Y_C + Y_D]: check_order(o)

m = chk["modes"]; mk2 = [v for k, v in m.items() if k.startswith("2")][0]

COMMON = two(GP.COMMON_RULES.replace("交集成者", "交用户裁决")) + "\n\n" + GP.ANALYSIS + "\n\n" + GP.SECURITY

def boundary(Ls, base="w1-base"):
    return f"""**越界检查（每次提交验证请求前自己先跑）**：
```bash
git log --first-parent --no-merges --name-only --format= {base}..HEAD | sort -u
```
输出的每个文件都必须落在下面“你的所有权”内（{' ∪ '.join(LANES[L]['name'] for L in Ls)}）；并且同一张卡的提交只碰该卡“允许修改”的路径（段与段之间不得混提交，例如 C 卡的提交不能改 D 段的文件）。"""

# ───────────── X
X = f"""# 执行者 X 完整提示词：管理端 UI 线（A 组件库 → E 页面与功能 → Wave 2 集成）

> 本文件可单独下发，自带全部任务卡、所有权、验收与验证规程。规划包同目录的 `tasks/*.md` 是同一份数据的分卡版本，两者一致；若与仓库真实代码冲突，以命令结果为准并停止汇报。

## 角色与使命

你是 **执行者 X**，一人承担三个角色：
1. **Wave 0 验证者**：Y 在 upgrade 上做契约冻结时，你逐卡独立验证；W0-08 由你判 PASS，Y 才能打 `w1-base`。
2. **管理端 UI 执行者**（Wave 1）：先在 `src/components/manager/**` 建成顶级管理端设计系统（基础件、DataTable、ResourceForm 与字段件、TipTap、重写 CrudPage 并保持兼容、移除 radix 代码引用），再让 36 个管理页统一、可用、与契约一致（补齐通知规则 / 首页区块配置 / 页面模板 / 交互点 / 知识库页面，迁移 10 个特殊页，规格从契约派生，a11y 与响应式），最后修组件层 a11y。
3. **Wave 2 集成者**：合并两条线、建守卫、全量回归、文档收口、推送 upgrade、打包。

**规模**：A 线 {len(X_ORDER_A)+1} 张卡 + E 线 8 张卡，计划 23 人天；Wave 2 主持 6 张卡。全项目计划约 **{mk2[0]} 人天**（资源约束调度）：第 0~5 天验证 W0 → 约第 5~28 天 A+E → 约第 29.5~{mk2[0]} 天 Wave 2。

**你必须守住的三条底线**：前台视觉与 `origin/main@94dbbbb` 逐像素一致（visual 46/46）；`src/components/ui/{{button,input,textarea,label}}.tsx` 的 className 一字不改；36 个现有管理页在迁移前不因组件改动而坏（CrudPageSpec / RowAction / FieldSpec / data-testid 全部向后兼容）。

{FACTS}

{TEAM}

## 阶段 0：Wave 0 期间（你只验证，不写代码）

- 按下文“独立验证者职责”逐卡验证 Y 的 W0-01~W0-08（分支 upgrade，起点 `bb2c0e5`）。
- W0 验证额外关注：W0-02/W0-03 是否“零行为变化”（只搬迁/新增，不替换调用方）；W0-04/W0-05 的契约是否与规划包 `02-契约冻结包.md` 字段名、取值、中文文案一致；W0-06 迁移是否含 DROP / RedefineTables / `INSERT INTO "new_`，rollback 是否可逆；W0-07 依赖是否一次加齐（TipTap 8 包 ^3.22.4、mammoth、jsdom、@testing-library/react、@testing-library/dom、@axe-core/playwright）；`git diff --name-only bb2c0e5..HEAD` 不含前台路径。
- W0-08 最终判定：GATE 全绿、visual 46/46、e2e 8/8、上述各项 PASS → 给出 `W0-verify` PASS。
- 空闲时间：通读 A/E 任务卡与 `02-契约冻结包.md`、审计证据 `evidence/A-ui-审计.md`，把 A-01 的分析（5W1H）写好草稿，等 `w1-base` 出现即开工。

## 阶段 1：Wave 1 启动

{setup('lane/ui', 'git checkout -b lane/ui w1-base     # 没有 w1-base tag 说明 Wave 0 未完成，停止')}

必读（按顺序）：`AGENTS.md`（§2 用户裁决、§3 前台风格冻结、§5 禁止事项、§6 完成定义）→ 规划包 `00`、`02`、`07`、`11` → 本提示词全部任务卡 → 审计证据 `evidence/A-ui-审计.md`。Next.js 16 有破坏性变更，写代码前读 `node_modules/next/dist/docs/` 对应章节。

## 你的所有权（Wave 1 只能写这些路径；与 Y 零重叠，已机械校验）

{owner_list(['A', 'E'])}
{boundary(['A', 'E'])}

## 段 A：管理端组件库（{len(X_ORDER_A)} 张，A-08 放在 E 段之后）

{special('A')}

执行顺序：
{table(X_ORDER_A)}

工作包与验证节奏：A-01（WPA.1）完成发验证请求 → A-02+A-03 完成发一次 → A-04 完成后**发 A-07 检查点验证请求**（范围 `w1-base..lane/ui`）→ Y 判 PASS 后打并推送 tag `w1-ui-kit` → A-05、A-06 各发一次。

### 段 A 任务卡

{(chr(10)*2).join(card(ids[n], ev('A')) for n in X_ORDER_A)}

## 段 E：管理端页面与功能（8 张）+ A-08

{special('E')}

执行顺序：
{table(X_ORDER_E)}

工作包与验证节奏：E-01（护栏）→ E-02+E-03+E-04（缺失管理页，可分三次发）→ E-05+E-06（特殊页迁移，需 `w1-ui-kit`）→ E-07（规格单源）→ E-08（质量门，产出“交 A-08”清单）→ A-08（修组件层问题，关闭清单）。

### 段 E 任务卡

{(chr(10)*2).join(card(ids[n], ev('E' if n.startswith('E') else 'A')) for n in X_ORDER_E)}

## Wave 1 结束条件（你这一侧）

- A、E 全部卡的验证报告为 PASS（UNKNOWN 只允许出现在无凭证/无 docker/Playwright 依赖装不上的条目并写明原因），已提交进 `evidence/W1-A/`、`evidence/W1-E/`。
- `lane/ui` 已推送；越界检查通过；GATE、visual 46/46、e2e 全绿；`/manager` 首屏包体相对 w1-base 增长 ≤ 2%。

## 阶段 2：Wave 2 集成（你主持）

**进入条件**（任一不满足就停止并汇报）：W0-verify PASS；A-07 检查点 PASS；`lane/ui`、`lane/backend` 每张卡都有 PASS 验证报告；裁决 D6~D9、D11 已写入 `docs/design/04_planning/current-plan.md` 文首裁决表（W0-01 已写，核对即可）。

**合并规程**（W2-01）：
```bash
git checkout upgrade && git pull --ff-only
for b in lane/backend lane/ui; do
  git diff upgrade...origin/$b | grep -nE "sk-[A-Za-z0-9]{{20,}}|ghp_[A-Za-z0-9]{{20,}}|github_pat_|-----BEGIN [A-Z ]*PRIVATE KEY" && {{ echo "密钥：$b"; break; }}
  git merge --no-ff "origin/$b" -m "merge($b): Wave 1 合入" || {{ echo "冲突：$b"; break; }}
  npm ci && npm run lint && npm run typecheck && npm test && npm run build && npm run test:visual && npm run test:e2e || {{ echo "门禁失败：$b"; break; }}
done
git push origin upgrade     # W2-01 合并完立即推送，Y 才能从合并后的 upgrade 拉 w2/backend
```
冲突只允许出现在证据文档；出现在代码文件说明所有权矩阵有缺陷 → 停止，交用户，不要手工“揉”代码。

**分工与顺序**：W2-01（你）→ 你做 W2-02、W2-08；同时 Y 在 `w2/backend` 做 W2-03 → W2-09 → W2-04 → 你验证 Y 的 W2 提交并 `git merge --no-ff origin/w2/backend` → 你做 W2-05 全量回归 → W2-06 文档 → W2-07：Y 做独立终审，PASS 后你推送并打包。你在 Wave 2 不替 Y 改依赖或脚本；发现某线业务问题退回该线在原 lane 分支修复、重新验证后再合并。

### Wave 2 任务卡（你负责的部分）

{(chr(10)*2).join(card(ids[n], 'W2') for n in X_W2)}

**终审额外检查**（交给 Y 一起验）：`git diff origin/main -- src/components/web 'src/app/(web)' public` 只含四类已登记差异（import 路径/类型、数据适配与缓存、兜底字面量、ChatWidget SSE 解析）；parity-matrix 中 missing+partial = 0 或逐条有裁决/UNKNOWN 理由；MUST 14 条每条有结论。

**推送**：
```bash
git push origin upgrade --follow-tags
git remote get-url origin | grep -qE 'https://[^/]*@' && echo "remote 含凭据，立即清理" || echo "remote 干净"
```
**打包**：`docs/design/04_planning/parallel-w1/`（规划包）+ `docs/design/06_validation/evidence/{{W0,W1-*,W2}}/` 打成 zip，附 final-verify 结论摘要。

{VERIFIER}

{COMMON}

## 汇报格式

工作包汇报（每个工作包一次，同时作为验证请求的附件）：
```text
X / <段 A|E|W2> / <工作包> 汇报
- 起点..终点：<commit>..<commit>（分支 lane/ui 或 upgrade）
- 完成的卡：<卡号>
- 逐条验收：| 卡号 | 验收条目 | 命令 | exit | 自测结果 | 证据路径 |
- 越界检查：是/否（否则列出文件）
- 契约变更请求：<编号或“无”>
- 未验证项与原因：
- 给 Y 或用户的事项：
```
Wave 2 汇报：合并 n/n 与每次门禁 / 守卫（契约测试覆盖、ESLint、check-assets、check-root）/ W2-03、W2-04、W2-06 结论 / 全量回归 / 终审 PASS·FAIL / MUST 14 条 PASS·UNKNOWN·FAIL 计数 / 推送 commit 与 remote 是否干净 / 未决。
汇报只写可复现事实；PASS 由验证者给出，不由你自己宣布。
"""

# ───────────── Y
Y = f"""# 执行者 Y 完整提示词：契约与后端平台线（Wave 0 契约员 → B API 平台 → C AI 与知识库 → D 运维 → Wave 2 依赖与性能）

> 本文件可单独下发，自带全部任务卡、所有权、验收与验证规程。规划包同目录的 `tasks/*.md` 是同一份数据的分卡版本，两者一致；若与仓库真实代码冲突，以命令结果为准并停止汇报。

## 角色与使命

你是 **执行者 Y**，一人承担四个角色，按时间顺序：
1. **Wave 0 契约员**（唯一写入者）：把 upgrade 从 `bb2c0e5` 推进到可并行的冻结点 tag `w1-base`。你产出的契约、唯一迁移 p12、共享模块签名、一次性加齐的依赖，是两条线唯一的共享物——错一处两条线都返工。
2. **后端平台执行者**（Wave 1，分支 `lane/backend`）：B 把手写路由迁入 withApi、发布渠道注册表、通知可靠性；C 让知识库真正可用（Word/MD/TXT 进、PDF/图片拒）、Coze 后端、场景多模型、SSE、配额；D 让启动快、env 可校验、设置对等、前台缓存、存储根迁出构建目录、运行时文件迁出 git、采集可扩展。
3. **X 的独立验证者**：验证 X 的每个工作包，包括 A-07 检查点；Wave 2 做终审验证。
4. **Wave 2 收尾执行者**（分支 `w2/backend`）：依赖收口、资源/根目录守卫、性能复测。

**规模**：Wave 0 8 张卡 5 人天；B 6 张 5.25 人天 + C 9 张 10 人天 + D 12 张 9.25 人天 = 24.5 人天；Wave 2 3 张。全项目计划约 **{mk2[0]} 人天**：第 0~5 天 Wave 0 → 约第 5~29.5 天 B+C+D → Wave 2 配合 X。

**你必须守住的三条底线**：前台视觉与 `origin/main@94dbbbb` 逐像素一致（visual 46/46）；Wave 0 之后契约/迁移/依赖/测试配置冻结，你也不能“顺手”改；知识库只收 `.docx/.doc/.md/.markdown/.txt`，严禁引入 PDF/图片解析或 OCR。

{FACTS}

{TEAM}

## 阶段 0：Wave 0 契约员（直接提交在 upgrade）

{setup('upgrade', 'git checkout upgrade && git log -1 --format=%H   # 必须是 bb2c0e51364aca4608d2a5832e31462b9c54ccf8，否则停止并汇报')}

必读（按顺序）：`AGENTS.md` → 规划包 `00-规划快照与事实基线.md`、`01-需求基线复核.md`、`02-契约冻结包.md`、`03-数据模型与迁移编排.md`、`07-所有权矩阵.md`、`11-验收与审查规程.md` → 审计证据 `evidence/B-domain-审计.md`、`evidence/C-ops-审计.md`。

{GP.LANE_INTRO['Z']['special'].replace('## 本线特别规则', '**Wave 0 特别规则**')}
- 每张 W0 卡完成即推送 upgrade 并向 X 发验证请求（起点为上一张卡的终点）；X 判 PASS 才进入下一张依赖它的卡。
- 你在 Wave 0 的所有权：各 W0 卡“允许修改”所列路径（含 `src/contracts/**`、`prisma/**`、`package.json`、`vitest.config.ts`、`AGENTS.md`、`docs/design/**` 等）；**`w1-base` 打出后全部收回**。

{table(Y_W0)}

### Wave 0 任务卡

{(chr(10)*2).join(card(ids[n], 'W0') for n in Y_W0)}

**Wave 0 退出**：X 给出 W0-08 PASS → `git tag w1-base && git push origin upgrade w1-base` → 自查 remote URL 不含凭据。

## 阶段 1：Wave 1 启动

```bash
git fetch --all --tags && git checkout -b lane/backend w1-base
npm ci && npx prisma generate && npm run lint && npm run typecheck && npm test && npm run build
```

## 你的所有权（Wave 1 只能写这些路径；与 X 零重叠，已机械校验）

{owner_list(['B', 'C', 'D'])}
{boundary(['B', 'C', 'D'])}

## 段 B：API 与响应平台（6 张，5.25 人天）

{special('B')}

{table(Y_B)}

工作包与验证节奏：B-01+B-04（公共工具收敛）→ B-02、B-03（路由统一包装，各发一次）→ B-05（发布渠道注册表）→ B-06（通知可靠性）。

### 段 B 任务卡

{(chr(10)*2).join(card(ids[n], ev('B')) for n in Y_B)}

## 段 C：AI 与知识库（9 张，10 人天）

{special('C')}

{table(Y_C)}

工作包与验证节奏：C-01+C-02（注册表）→ C-03（文件管线）→ C-04（Coze）→ C-05（本地检索）→ C-06（知识库 API）→ C-07（场景与 SSE）→ C-08（采集入库）→ C-09（配额）。

### 段 C 任务卡

{(chr(10)*2).join(card(ids[n], ev('C')) for n in Y_C)}

## 段 D：运维·性能·配置·存储·资源（12 张，9.25 人天）

{special('D')}
- **D-01 的基线必须在 `w1-base` 上测**，不能在已含 B、C 改动的 HEAD 上测：
```bash
git worktree add ../hd-baseline w1-base && cd ../hd-baseline && npm ci && npx prisma generate
node <你在 lane/backend 写好的 scripts/measure-baseline.mjs 的路径> --out before.json   # 脚本先在 lane/backend 提交，再拷到 worktree 运行
cd - && git worktree remove ../hd-baseline
```
  before.json 与规划基线（首页 227,007 B、/manager 345,853 B、Ready 7.3s、TTFB 33~42ms）偏差 >15% 要在证据里解释。

{table(Y_D)}

工作包与验证节奏：D-01（基线）→ D-02+D-03（启动与环境）→ D-04+D-05（设置对等）→ D-06（前台缓存，必跑 visual）→ D-07+D-08（配置收尾、Docker）→ D-09（存储根）→ D-10+D-11（备份、迁出 git、媒体清理）→ D-12（采集）。

### 段 D 任务卡

{(chr(10)*2).join(card(ids[n], ev('D')) for n in Y_D)}

## Wave 1 结束条件（你这一侧）

- B、C、D 全部卡的验证报告为 PASS（UNKNOWN 仅限 Coze/微信/SMTP 无凭证联调、无 docker、Playwright 依赖装不上，并写明原因），已提交进 `evidence/W1-B/`、`evidence/W1-C/`、`evidence/W1-D/`。
- `lane/backend` 已推送；越界检查通过；GATE、visual 46/46、e2e 全绿；`git ls-files uploads` 为 0；知识库上传 PDF/图片 400 用例在列且通过。

## 阶段 2：Wave 2（X 主持，你负责依赖、守卫脚本、性能与终审验证）

1. 等 X 完成 W2-01 并推送合并后的 upgrade：`git fetch && git checkout -b w2/backend origin/upgrade`。
2. 按顺序做 W2-03 → W2-09 → W2-04（卡见下），每张完成推送 `w2/backend` 并向 X 发验证请求；X 验证 PASS 后由 X 合并。
3. W2-07：X 完成 W2-06 后，你在新的干净克隆上对 `bb2c0e5..upgrade` 做独立终审（按“独立验证者职责”），额外检查：前台 `git diff origin/main -- src/components/web 'src/app/(web)' public` 只含四类已登记差异；parity-matrix missing+partial = 0 或逐条有理由；MUST 14 条有结论。结论写成《验证报告》交用户转给 X，标题 `W2 final-verify`。

### Wave 2 任务卡（你负责的部分）

{(chr(10)*2).join(card(ids[n], 'W2') for n in Y_W2)}

{VERIFIER}

**你验证 X 时额外关注**：`src/components/ui/{{button,input,textarea,label}}.tsx` 的 `git diff --stat w1-base` 必须为空；页面层原生控件严格正则 `<(table|input|select|button|textarea)\\b` 在 `src/app/manager/**` 命中数只降不升；`/manager` 首屏 JS gzip 相对 w1-base 增长 ≤ 2%；现有 data-testid 与 `getByRole("button",{{name:"试抓"}})` 等 E2E 选择器未改即通过。A-07 检查点验证范围是 `w1-base..lane/ui`，PASS 后 X 才打 `w1-ui-kit`。

{COMMON}

## 汇报格式

```text
Y / <W0|段 B|C|D|W2> / <工作包> 汇报
- 起点..终点：<commit>..<commit>（分支 upgrade / lane/backend / w2/backend）
- 完成的卡：<卡号>
- 逐条验收：| 卡号 | 验收条目 | 命令 | exit | 自测结果 | 证据路径 |
- 越界检查：是/否（否则列出文件）
- 契约变更请求：<编号或“无”>
- 未验证项与原因（Coze/微信/SMTP/docker 等）：
- 给 X 或用户的事项：
```
汇报只写可复现事实；PASS 由验证者给出，不由你自己宣布。
"""

for name, body in [("执行者X-完整提示词-管理端UI线.md", X), ("执行者Y-完整提示词-契约与后端平台线.md", Y)]:
    open(f"{OUT}/prompts/{name}", "w", encoding="utf-8").write(body)
    print(name, len(body))
for old in ["执行者X说明-管理端UI线.md", "执行者Y说明-契约与后端平台线.md"]:
    p = f"{OUT}/prompts/{old}"
    if os.path.exists(p): os.remove(p)
