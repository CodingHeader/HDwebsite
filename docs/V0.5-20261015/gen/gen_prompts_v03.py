# -*- coding: utf-8 -*-
"""V0.3：Hark 自做 UI 核心 + 3 名 Agent。生成 P1~P3 提示词与 Hark 自执行计划。
用法：python3 gen_prompts_4p.py <规划包目录>（须先跑 gen.py、gen_prompts.py）"""
import os, sys, copy, re, json
sys.path.insert(0, os.path.dirname(__file__))
OUT = sys.argv[1]
import gen_prompts_xy as XY          # 复用 card/table/owner_list/setup 等
from tasks import T, LANES, OWNERSHIP, EXCLUDE
GP = XY.GP
days = GP.days
ids = {t["id"]: copy.deepcopy(t) for t in T}   # 通用版本（不带 2 人模式覆盖）

BR = {"lane/a-manager-ui": "lane/a-manager-ui", "lane/e-manager-pages": "lane/e-manager-pages"}
def four(s):
    s = s.replace("五线", "五段（四人）").replace("通知集成者", "告知用户与集成者 P2").replace("交集成者", "交用户裁决")
    return s
XY.two = four
XY.ids = ids

DONE = {"W0-01": "已完成，X 独立验证 PASS（本地提交，未推送）", "W0-02": "已完成，X 独立验证 PASS（本地提交，未推送）",
        "W0-03": "已提交 `8b56426`（本地），**尚未独立验证**", "W0-04": "进行中：本机工作树有未提交改动（common.ts 错误码扩展、api-handler/api-response/manager-fetch、SchemaForm、ADR-028、w0-errors.test.ts）"}

P1_W0 = ["W0-01", "W0-02", "W0-03", "W0-R0", "W0-04", "W0-05", "W0-06", "W0-07", "W0-09", "W0-08"]
P1_B = ["B-01", "B-02", "B-04", "B-03", "B-05", "B-06", "B-07"]
P1_C = ["C-01", "C-03", "C-02", "C-04", "C-05", "C-06", "C-07", "C-08", "C-09", "C-10", "C-11", "C-12"]
P2_A = ["A-01", "A-02", "A-03", "A-04", "A-07", "A-05", "A-06", "A-08"]
P3_E = ["E-12", "E-01", "E-02", "E-03", "E-04", "E-05", "E-06", "E-09", "E-10", "E-11", "E-07", "E-08"]
P4_D = ["D-01", "D-02", "D-03", "D-04", "D-05", "D-06", "D-07", "D-08", "D-09", "D-10", "D-11", "D-12", "D-13"]
P2_W2 = ["W2-01", "W2-02", "W2-08", "W2-05", "W2-06", "W2-07"]
P4_W2 = ["W2-03", "W2-09", "W2-04"]
ALL = P1_W0 + P1_B + P1_C + P2_A + P3_E + P4_D + P2_W2 + P4_W2
H_A, H_E, H_W2 = P2_A, P3_E, P2_W2
assert sorted(ALL) == sorted(ids), set(ALL) ^ set(ids)
assert len(ALL) == len(set(ALL))
# 每人顺序内依赖先行；A-08 依赖 E-08（跨人）→ 只检查同人内
def check(order):
    seen = set()
    for n in order:
        for d in ids[n]["deps"]:
            assert d in seen or d not in order, (n, d)
        seen.add(n)
for o in [P1_W0 + P1_B, P1_C, P2_A, P3_E, P4_D, P2_W2, P4_W2]: check(o)

def table(order):
    rows = ["| 序 | 卡号 | 状态 | 任务 | 依赖 | 档位 | 人天 |", "|---|---|---|---|---|---|---|"]
    for i, n in enumerate(order, 1):
        t = ids[n]
        rows.append(f"| {i} | {n} | {DONE.get(n, '待开工').split('（')[0].split('：')[0]} | {t['title']} | {', '.join(t['deps']) or '—'} | {t['tier']} | {days(t)} |")
    return "\n".join(rows)

def cards(order, lane_ev):
    out = []
    for n in order:
        c = XY.card(ids[n], lane_ev(n))
        if n in DONE: c = c.replace(f"#### {n}　", f"#### {n}　〔V0.2 状态：{DONE[n]}〕", 1)
        out.append(c)
    return "\n\n".join(out)
ev = lambda n: {"W0": "W0", "W2": "W2"}.get(n[:2], "W1-" + n[0])

chk = json.load(open(f"{OUT}/gen-check.json", encoding="utf-8"))
m4 = [v for k, v in chk["modes"].items() if k.startswith("V0.3")][0]

FACTS = f"""## 项目事实快照（V0.4 校准：2026-10-14 13:5x 已 `git fetch`，远端 upgrade 前进到 827646b；开工后以你自己的命令结果为准）

- 仓库：`https://github.com/CodingHeader/HDwebsite`（公开）。前台视觉标准 = `origin/main@94dbbbb`。
- 远端 `origin/upgrade` = **`827646b`**（2026-10-14 04:39 UTC 推送，父提交 bb2c0e5）：P07 管理端组件库检查点，**绕过 Wave 0 直接进 upgrade**，完成 A 线约 60%（manager/ui、DataTable、CrudPage/SchemaForm 重写、TipTap 字段、radix→base-ui、删除 7 个无引用暗色 ui/*、manager-fetch 透传 fieldErrors、block-registry-defs.ts）。提交信息自称 lint/typecheck/test 210/210/build/visual 46/46 通过、e2e 7/8。审计：`evidence/V0.4-827646b-检查点审计.md`；门禁复跑：`evidence/V0.4-827646b-门禁.log`。
- **用户本机** upgrade 仍是 bb2c0e5 + 4 个本地提交（HEAD `8b56426`，W0-01/02/03）+ W0-04 未提交现场 → 与远端**已分叉**，必须先做 W0-R0（变基到 827646b，禁止 reset --hard）。
- visual 46 = 15 路由 × 3 宽度共 45 张整页截图 + 1 个首页区块顺序断言（`tests/visual/web.spec.ts:44-65`）。
- **375 档截图宽 667px 不是缺陷**：那是 main 本身在 375 视口下的横向溢出，参照与实际一致（`docs/design/06_validation/evidence/P02/visual-diff.md:5`）。用户端 UI 风格冻结，**不得**“修”这个溢出，也不得重生成参照集。
- V0.3 需求缺口审计新增 7 张卡（B-07、C-10、C-11、C-12、E-09、E-10、E-11）并增补 W0-05/W0-06/C-08/D-04，共 68 张卡。
- Windows 本机两个测试不可移植（DEF-X-01a：`wechat-chat.test.ts:79` 调 shell grep；DEF-X-01b：`sqlite-busy-timeout.test.ts:81` rmSync EPERM）→ 新增卡 W0-09 修复。
- 管理端 `/manager` 36 页；`@radix-ui` 仍被 7 个文件引用；错误码只有 200/400/401/403/404/500（W0-04 正在扩展）。
- 性能基线：首页 JS gzip 227,007 B；`/manager` 345,853 B；standalone Ready 7.3s。
- 已定裁决：D6 保留 `data.fieldErrors`；D7 `created()` code 200 / HTTP 201；D8 Wave 0 PASS 后推送 upgrade 与 `w1-base`；D9 保留 `ApplyForm`；**V0.3 分工**：Hark 自做 UI 核心（A、E 两条线）与 Wave 2 集成终审；中等/简单任务由 3 名 Agent（P1、P2、P3）执行（见规划包 15 号文件）。
- **V0.5（2026-10-15）W0-08 门禁环境裁决**：远端 upgrade 仍为 827646b（用户本机 W0-01~08 未推送）。W0-08 改为双环境矩阵：visual 46/46 在参照机（用户本机 Windows，K5）取官方输出；e2e 8/8 在 Linux（GitHub Actions / 沙箱 / WSL2）对**同一 SHA** 取官方输出。否决：改 next.config.ts（D 线所有、且 start-next.mjs:20 同样有意关闭 win32 standalone，global-setup 另有 3 处 Windows 不可用代码，改了也跑不通）；等效像素替代官方输出；e2e 记 UNKNOWN 打 tag。tests/visual/reference/** 只能由 main@94dbbbb 重新生成，否则还原。新增 E-12（Hark：e2e global-setup 跨平台）与 D-13（P3：GitHub Actions Linux CI），共 71 张卡。详见 `17-V0.5-W0-08门禁环境裁决.md`。"""

TEAM = f"""## 团队与协作方式（全员按这一节执行）

| | P1 契约与 API 平台 | P2 AI 与知识库 | P3 运维与性能 | Hark（UI 核心 + 集成终审） |
|---|---|---|---|---|
| Wave 0 | 续做 W0-04→05→06→07→09→08（用户本机 upgrade） | 只读预研 C 线 | 只读预研 D 线 | **W0 验证者**（需 P1 推送 `w0/staging` 只读分支，见待裁决 K2） |
| Wave 1 | `lane/b-api-platform`：B（7 张） | `lane/c-ai-kb`：C（12 张） | `lane/d-ops`：D（12 张） | `lane/a-manager-ui`：A（8 张）‖ `lane/e-manager-pages`：E（11 张），两条流并行 |
| 被谁验证 | P3 | P1 | P2 | P1（B 完成后空闲）+ Hark 的独立子代理复核 |
| Wave 2 验证 | — | — | Hark 验后端段 | W2-01~W2-06 由 P1 验证；W2-07 终审由 P2 + Hark 独立子代理复核，用户最终确认后推送 |
| Wave 2 | 回归协助 | 回归协助 | `w2/backend`：W2-03、W2-09、W2-04 | 集成者 + 终审：W2-01、W2-02、W2-08、W2-05、W2-06、W2-07 |

计划日历工期 **{m4[0]} 天**（资源约束调度：P1 {m4[1]['P1']} / P2 {m4[1]['P2']} / P3 {m4[1]['P3']} / Hark-A {m4[1]['Hark-A']} / Hark-E {m4[1]['Hark-E']}）。关键路径：W0 → A-01→A-02→A-04→A-07 → E-05→E-07→E-08 → A-08 → Wave 2。

1. **没有实时通信**。共享物只有：git（远端分支与 tag）、本规划包、由用户转交的《验证请求》/《验证报告》。
2. Wave 0 期间仓库在用户本机；验证者用只读 worktree，或从 P1 推送的 `w0/staging` 只读分支检出（不是 upgrade，不违反 D8）。
3. **验证请求**格式：
```text
验证请求 <执行者>/<段>/<工作包>
分支：<branch>　起点..终点：<commit>..<commit>
卡号：<列表>（验收标准与命令见各自提示词的任务卡节）
已跑：lint/typecheck/test/build（exit）、visual、e2e、本卡命令
已知 UNKNOWN：<条目与原因>
```
4. 验证者只看 diff 与命令结果，输出 PASS/FAIL/UNKNOWN；不往对方分支提交。被验证方把报告原样提交进自己证据目录。
5. 等验证时继续做依赖已满足的下一张卡。硬闸门：`w1-base`（W0-08）、`w1-ui-kit`（A-07，挡 E-05/E-06）、Wave 2 进入条件。
6. 同一卡连续 2 次验证 FAIL → 熔断：停止改代码，写失败分析，交用户裁决。
7. 需要改冻结面（契约、迁移、依赖、配置）→《契约变更请求》交用户；批准后由 P1 在 upgrade 最小提交并打 `w1-base-ccr-<n>`。
8. **跨线页面依赖**：E-10 依赖 C-11 的 API、E-11 依赖 C-12 的 API、E-09 依赖 B-07 的渠道状态与多渠道发布 API、E-10 的排序 API 也在 C-11——页面只按 W0-05 冻结 DTO 开发，对方未合并时该 e2e 条目记“待其他员工完成”，W2-05 复跑。"""

VER = four(open(f"{OUT}/prompts/提示词-独立验证者.md", encoding="utf-8").read())
VER = re.sub(r"^## ", "### ", VER.split("\n", 1)[1], flags=re.M)
VER = "## 独立验证者职责（验证别人时切换到这个角色；用新的干净 worktree/克隆）\n" + VER.replace("（由集成者给你）", "（来自对方的《验证请求》）").replace("或直接回给集成者", "或作为《验证报告》交用户转回")
COMMON = four(GP.COMMON_RULES.replace("交集成者", "交用户裁决")) + "\n\n" + GP.ANALYSIS + "\n\n" + GP.SECURITY

def boundary(Ls, base="w1-base"):
    return f"""**越界检查（每次发验证请求前先跑）**：
```bash
git log --first-parent --no-merges --name-only --format= {base}..HEAD | sort -u
```
每个文件都必须落在下面“你的所有权”内（{' ∪ '.join(LANES[L]['name'] for L in Ls)}）；同一张卡的提交只碰该卡“允许修改”的路径。"""

def special(L): return four(GP.LANE_INTRO[L]["special"].replace("## 本线特别规则", f"**{LANES[L]['name']} 的特别规则**"))

REPORT = """## 汇报格式（每个工作包一次，同时作为验证请求附件）
```text
<P?> / <段> / <工作包> 汇报
- 起点..终点：<commit>..<commit>（分支）
- 完成的卡：<卡号>
- 逐条验收：| 卡号 | 验收条目 | 命令 | exit | 自测结果 | 证据路径 |
- 越界检查：是/否（否则列出文件）
- 契约变更请求：<编号或“无”>
- 未验证项与原因：
```
只写可复现事实；PASS 由验证者给出，不由自己宣布。"""

def doc(title, role, body):
    return f"""# {title}

> V0.3（2026-10-14）Hark + 3 Agent 并行模式。本文件可单独下发，自带全部任务卡全文、所有权、验收与验证规程；规划包 `tasks/*.md` 是同一份数据的分卡版本。与真实代码冲突时以命令结果为准并停止汇报。

## 角色与使命

{role}

**三条底线**：前台视觉与 `origin/main@94dbbbb` 逐像素一致（visual 46/46，375 档 667 宽属 main 原样）；`src/components/ui/{{button,input,textarea,label}}.tsx` className 一字不改；36 个现有管理页在迁移前不因组件改动而坏。

{FACTS}

{TEAM}

{body}

{VER}

{COMMON}

{REPORT}
"""

W0_START = """## 阶段 0：Wave 0 续跑（在用户本机仓库 `hdwebsite_1011`，分支 upgrade）

```bash
git status --short          # 必须看到 W0-04 的未提交现场；与下表不符 → 停止汇报
git fetch origin && git log --oneline origin/upgrade..HEAD   # 期望 4 个本地提交（W0-01/02/03）；随后执行 W0-R0 变基
```
1. **W0-04 续做**：先把现有未提交改动与 W0-04 卡逐条对照（错误码 10 值、fieldErrors 透传、SchemaForm 权限字段、ADR-028、`w0-errors.test.ts`），缺的补齐，多的移出；跑本卡验证命令后**一次提交**。不得 `git stash drop` / `reset --hard` 丢弃现场。
2. 每张 W0 卡提交后发验证请求给 P2；W0-03 的验证请求现在就发（范围 `<W0-02 提交>..8b56426`）。
3. 顺序：W0-04 → W0-05 → W0-06 → W0-07 → W0-09 → W0-08。W0-08 PASS（P2 判定）后：`git tag w1-base && git push origin upgrade w1-base`，并告知用户。"""


P1 = doc("P1 完整提示词：契约与 API 平台线（Wave 0 续跑 → B API 与响应平台）",
 """你是 **P1**：
1. **Wave 0 契约员**：续做 W0-04（本机未提交现场）→ W0-05（含 V0.3 增补的 G 系列 DTO）→ W0-06（含 V0.3 增补列）→ W0-07 → W0-09 → W0-08 冻结并推送 `w1-base`。
2. **B 线**（`lane/b-api-platform`）：旁路路由收口 withApi、限流 429/503、settings 拆分、PublishChannel、通知静默时段、公众号发布闭环（B-07 新卡）。
3. **CCR 落地人**；B 完成后担任 **Hark 的 A/E 线验证者** 与 **P2 的 C 线验证者**。""",
 f"""{W0_START}

### Wave 0 任务卡

{table(P1_W0)}

{cards(P1_W0, ev)}

## 阶段 1：B 线

{XY.setup('lane/b-api-platform', 'git checkout -b lane/b-api-platform w1-base   # 无 w1-base tag → Wave 0 未完成，停止')}

## 你的所有权

{XY.owner_list(['B'])}
{boundary(['B'])}

{special('B')}

{table(P1_B)}

{cards(P1_B, ev)}""")

P2 = doc("P2 完整提示词：AI 与知识库线（C）",
 """你是 **P2**：多模型网关（优先级/默认/兜底）、知识库后端注册表与 Coze 客户端、文件管线、本地检索、知识库 API 与“其他管理”API（C-12）、场景绑定、采集入库双向关联、额度限流、客服风控（C-10）、用量统计 API（C-11）。

你的工作由 **P1** 验证；你负责验证 **P3 的 D 线**。C-01 与 C-12 为 opus 档（架构/高难度），开工前写 ADR-029 草案交 Hark 审阅（用户转交）。""",
 f"""## 阶段 0：Wave 0 期间（只读预研）

通读任务卡、`02-契约冻结包.md`、`evidence/B-domain-审计.md`、`evidence/V0.3-需求缺口审计.md`；起草 C-01 的 ADR-029（不提交）。

## 阶段 1：C 线

{XY.setup('lane/c-ai-kb', 'git checkout -b lane/c-ai-kb w1-base')}

## 你的所有权

{XY.owner_list(['C'])}
{boundary(['C'])}

{special('C')}

{table(P1_C)}

{cards(P1_C, ev)}""")

P3 = doc("P3 完整提示词：运维、性能、配置、存储与资源线（D）+ Wave 2 后端段",
 """你是 **P3**：性能基线脚本、env 单源校验、上传目录移出构建产物、设置键对等（含 V0.3 chatGuard 三键）、前台缓存与失效、Docker 部署件、备份、媒体清理、采集解析器注册表；Wave 2 在 `w2/backend` 做 W2-03、W2-09、W2-04。

你的工作由 **P2** 验证；你负责验证 **P1 的 B 线**。""",
 f"""## 阶段 0：Wave 0 期间（只读预研）

通读任务卡与 `evidence/C-ops-审计.md`、`09-基线指标.md`；起草 D-01 基线测量方案（不提交）。

## 阶段 1：D 线

{XY.setup('lane/d-ops', 'git checkout -b lane/d-ops w1-base')}

## 你的所有权

{XY.owner_list(['D'])}
{boundary(['D'])}

{special('D')}

{table(P4_D)}

{cards(P4_D, ev)}

## 阶段 2：Wave 2 后端段（W2-01 合并并推送后）

`git checkout -b w2/backend origin/upgrade`，依次 W2-03 → W2-09 → W2-04，交 Hark 验证并合并。

{table(P4_W2)}

{cards(P4_W2, ev)}""")

H = doc("Hark 自执行计划：管理端 UI 核心（A 组件库 ‖ E 页面与功能）+ Wave 0 验证 + Wave 2 集成与终审",
 """**Hark** 自做核心与高难度任务，尤其是 UI 设计与实现：
1. **Wave 0 验证者**：逐卡验 P1 的 W0-03~W0-09，W0-08 给最终判定（前提：K2 只读分支可访问）。
2. **A 流**（`lane/a-manager-ui`）：管理端设计系统（令牌、基础件、DataTable、ResourceForm 与字段件、TipTap、CrudPage 重写并向后兼容、去 radix），A-07 = M1 合入 upgrade 并打 `w1-ui-kit`。
3. **E 流**（`lane/e-manager-pages`，与 A 流并行，由 Hark 的另一工作会话执行）：缺失管理页、特殊页迁移、内容中枢（E-09）、模型运营（E-10）、知识库其他管理（E-11）、规格单源、a11y/响应式质量门。
4. **Wave 2 集成者与终审**：合并五条分支、守卫、全量回归、文档收口、推送、打包。

**防自证**：Hark 的每个工作包由 P1 独立验证（用户转交），并由 Hark 另起的独立子代理只读复核；Hark 不判定自己的卡通过。
**执行前提**（任一不满足即按“前提与局限”降级）：K1 推送权限（vault 中 CodingHeader 的 GitHub 凭据）；K2 `w1-base` 已推送；K3 用户确认规划阶段结束、进入实现阶段。降级方式：Hark 在沙箱分支实现，以 `git bundle` + 补丁包交付，由用户在本机 `git fetch <bundle>` 推送。""",
 f"""## 管理端设计方向（Hark 的 UI 设计决策，A-01 落为 ADR-033）

- **不改用户端**：`src/components/ui/{{button,input,textarea,label}}.tsx` className 冻结；管理端令牌全部收在 `src/components/manager/**` 作用域内（`.mgr` 根类 + CSS 变量），不污染前台 globals。
- **信息密度与可理解性**：表格默认“舒适”密度，可切“紧凑”；筛选以 chips 呈现且同步 URL，刷新不丢；每个危险操作二次确认并说明影响范围；所有空态给“下一步”按钮。
- **五态统一**：空 / 加载（骨架屏）/ 错误（可重试 + 错误码中文）/ 无权限（说明所需权限点）/ 成功（toast + 行内高亮），严格按契约⑥。
- **键盘与可达性**：命令面板 ⌘K、表格行键盘导航、拖拽排序必须有按钮替代、焦点可见、对比度 ≥ 4.5:1（axe 0 critical）。
- **响应式**：375 / 768 / 1440 三档；窄屏表格转卡片列表，侧栏折叠为抽屉。
- **性能**：TipTap 动态导入；`/manager` 首屏 JS gzip 相对 w1-base 增长 ≤ 2%（D-01 基线为准）。

## 阶段 0：Wave 0 验证

- 验证顺序：W0-03（`8b56426`）→ W0-04 → … → W0-09 → W0-08。重点：零行为变化、契约字段与 `02-契约冻结包.md` 及 V0.3 增补一致、W0-06 无 DROP/RedefineTables 且含 deletedAt/tags/collectItemId、W0-09 等价性。
- 不得把“375 档 667 宽”判为缺陷。

## A 流

{XY.setup('lane/a-manager-ui', 'git checkout -b lane/a-manager-ui w1-base')}

{XY.owner_list(['A'])}
{boundary(['A'])}

{special('A')}

{table(H_A)}

{cards(H_A, ev)}

## E 流

{XY.setup('lane/e-manager-pages', 'git checkout -b lane/e-manager-pages w1-base')}

{XY.owner_list(['E'])}
{boundary(['E'])}

{special('E')}

{table(H_E)}

{cards(H_E, ev)}

## Wave 2：集成与终审

```bash
git checkout upgrade && git pull --ff-only
for b in lane/d-ops lane/b-api-platform lane/c-ai-kb lane/a-manager-ui lane/e-manager-pages; do
  git diff upgrade...origin/$b | grep -nE "sk-[A-Za-z0-9]{{20,}}|ghp_[A-Za-z0-9]{{20,}}|github_pat_|-----BEGIN [A-Z ]*PRIVATE KEY" && {{ echo "密钥：$b"; break; }}
  git merge --no-ff "origin/$b" -m "merge($b): Wave 1 合入" || {{ echo "冲突：$b"; break; }}
  npm ci && npm run lint && npm run typecheck && npm test && npm run build && npm run test:visual && npm run test:e2e || {{ echo "门禁失败：$b"; break; }}
done
```
（合并顺序与 W2-01 卡一致：D → B → C → A → E。）

{table(H_W2)}

{cards(H_W2, ev)}""")

d = f"{OUT}/prompts/V0.5-Hark与三Agent"
os.makedirs(d, exist_ok=True)
for name, txt in [("P1-完整提示词-契约与API平台线.md", P1), ("P2-完整提示词-AI与知识库线.md", P2),
                  ("P3-完整提示词-运维性能线.md", P3), ("Hark-自执行计划-UI核心与集成终审.md", H)]:
    open(f"{d}/{name}", "w", encoding="utf-8").write(txt); print(name, len(txt))
got = []
for txt in (P1, P2, P3, H): got += re.findall(r"^#### ([A-Z0-9]+-[A-Z0-9]+)", txt, flags=re.M)
assert sorted(got) == sorted(ids) and len(got) == len(set(got)), (set(ids) ^ set(got))
print("cards", len(got), "ok")
