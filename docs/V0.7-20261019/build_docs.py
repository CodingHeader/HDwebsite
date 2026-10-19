# -*- coding: utf-8 -*-
"""由 tasks/*.md 生成 03/06/07/08 与执行者提示词，保证与任务卡一致。先跑 gen_tasks.py 再跑本脚本。"""
import json, re, os
from collections import Counter
D = os.path.dirname(os.path.abspath(__file__)); os.chdir(D)
g = json.load(open('evidence/gen-check.json', encoding='utf-8'))
N, O, TI, TT, SL = {}, {}, {}, {}, {}
for f in sorted(os.listdir('tasks')):
    b = open('tasks/' + f, encoding='utf-8').read(); k = f[:-3]
    TT[k] = b.splitlines()[0].split('：', 1)[1][:46]
    m = re.search(r"V0.7 依赖：([^。]*)。", b)
    if m:
        N[k] = [x.strip() for x in m.group(1).split(',') if x.strip() and x.strip() != '无']
        O[k] = re.search(r"执行者 (\S+?)；", b).group(1); TI[k] = re.search(r"建议档位 (\S+?)；", b).group(1)
    else:
        N[k] = [x.strip() for x in re.search(r"Depends on：(.*)", b).group(1).split(',') if x.strip() != '无']
        O[k] = re.search(r"执行者：(\S+)", b).group(1); TI[k] = re.search(r"## 建议执行档位\n(\S+)", b).group(1)
    SL[k] = re.search(r"所属切片：?\s*(S\d)", b).group(1)
LV = {}
def L_(k):
    if k not in LV: LV[k] = 1 + max([L_(d) for d in N[k]], default=-1)
    return LV[k]
for k in N: L_(k)
json.dump(dict(nodes=N, own=O, tier=TI, lvl=LV, title=TT, slice=SL), open('evidence/dag.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
SN = {"S0": "安全热修：权限不可越级（M-15）", "S1": "测试卫生与规则对齐（可复现门禁）", "S2": "W1 独立验收补登（防自证）", "S3": "API 平台收口与发布闭环（B 线余卡）", "S4": "运维·性能·配置·存储（D 线余卡）", "S5": "Wave 2 终审：契约测试/依赖/回归/打包", "S6": "管理端核心 UI 集成与实机回归（Hark）"}
DEMO = {"S0": "非超管尝试 E1~E5 全部被 403/400 拒绝，超管正常", "S1": "干净检出 npm test 全绿；AGENTS.md 指向 V0.7", "S2": "34 张 W1 卡各有 verify.md（PASS/FAIL/UNKNOWN）", "S3": "一篇内容勾选官网+公众号发布，渠道各自回写外链/失败原因，静默时段内不发邮件", "S4": "全新机按手册 30 分钟恢复；首页命中缓存；CI 在 PR 上跑全门禁", "S5": "全路由契约测试 + e2e/visual 全绿 + audit 无 critical/high → 推送打包", "S6": "内容中枢逐渠道查看结果并一键重试；Linux e2e/visual 证据齐"}
WHY = {"S0": "风险最高且与 B-02 同文件，必须最先", "S1": "解锁 CI 与所有验收的可复现性", "S2": "与 S0/S1 无共享文件，L1 即可并行", "S3": "依赖 S0（同文件串行），关键路径所在", "S4": "与 S3 所有权不相交，全程并行", "S5": "汇合点", "S6": "依赖 B-07 渠道结果"}
W = lambda k: 0.5 if TI[k] == 'haiku' else 1.0
# 03
L = ["# 03 · 垂直切片（V0.7）", "", "每刀都是端到端可演示行为；切片之间只通过冻结契约耦合。", "", "| 切片 | 名称 | 可演示行为 | 卡 | 排序理由 |", "|---|---|---|---|---|"]
for s in sorted(SN):
    L.append(f"| {s} | {SN[s]} | {DEMO[s]} | {'、'.join(sorted(k for k in N if SL[k] == s))} | {WHY[s]} |")
L += ["", "**步行骨架**：P01~P06 已跑通完整骨架（健康检查、鉴权写接口、迁移、前台调真实 API、统一错误体），V0.7 不重建；S0 是 V0.7 第一刀（最小闭环：鉴权写接口的越权拦截 + 黑盒用例 + 门禁）。", "", "小于 2 小时的改动已并卡：kb-coze 隔离 + docx 超时 → V7-T-01；B-01/D-01/D-02 验收 → V7-V-BD。"]
open('03-垂直切片.md', 'w', encoding='utf-8').write("\n".join(L) + "\n")
# 06
L = ["# 06 · 剩余可执行大纲体系（四级，带序号，可执行）", "", "> 级别：1 = 切片（交付）→ 2 = 原子任务（卡）→ 3 = 执行步骤 → 4 = 验收原子项。卡全文见 `tasks/<卡号>.md`；本大纲由任务卡生成（build_docs.py），二者一致。", ""]
for i, s in enumerate(sorted(SN), 1):
    L += [f"## {i}. {s} {SN[s]}", f"> 可演示：{DEMO[s]}"]
    for j, k in enumerate(sorted([k for k in N if SL[k] == s], key=lambda k: (LV[k], k)), 1):
        b = open(f'tasks/{k}.md', encoding='utf-8').read()
        L.append(f"### {i}.{j} {k} {TT[k]}（{O[k]}·{TI[k]}·L{LV[k]}；依赖 {', '.join(N[k]) or '无'}）")
        st = b.split("## Execution Steps", 1)[1].split("\n##", 1)[0]
        steps = [re.sub(r"^\d+\. \[ \] ", "", x.strip()) for x in st.strip().splitlines() if re.match(r"\d+\. \[", x.strip())]
        ac = b.split("## 验收标准", 1)[1].split("\n##", 1)[0]
        accs = [x.strip()[6:] for x in ac.strip().splitlines() if x.strip().startswith("- [ ]")]
        for m, stp in enumerate(steps, 1): L.append(f"- {i}.{j}.{m} {stp[:170]}")
        L.append(f"- {i}.{j}.{len(steps)+1} 验收")
        for n, a in enumerate(accs, 1): L.append(f"  - {i}.{j}.{len(steps)+1}.{n} {a[:170]}")
    L.append("")
open('06-剩余可执行大纲体系.md', 'w', encoding='utf-8').write("\n".join(L) + "\n")
# 07
lv = {}
for k, v in LV.items(): lv.setdefault(v, []).append(k)
q = Counter(); 
for k in N: q[O[k]] += W(k)
L = ["# 07 · 依赖 DAG 与并行判定", "", f"节点 {len(N)}；**环检测：无环**（gen_tasks.py 拓扑排序成功，`evidence/gen-check.json`）；**所有权重叠：0**（`evidence/ownership-overlap.json`）。", "",
     "## 1. 并行规则（机械判定）", "可并行 ⟺ 无依赖关系 ∧ 允许修改路径前缀不相交 ∧ 不同执行者（同一执行者按拓扑序串行，规则 R-SERIAL）∧ 均不改 `src/contracts/**`、`prisma/**`（V0.7 全卡禁止）。gen_tasks.py 对所有无依赖关系、不同执行者的卡对做路径前缀相交检查，结果 0。", "",
     "## 2. 层级（同层不同执行者可同时下发）", "", "| 层 | 卡（执行者/档位） |", "|---|---|"]
for v in sorted(lv): L.append(f"| L{v} | {'、'.join(f'{k}({O[k]}/{TI[k]})' for k in sorted(lv[v]))} |")
L += ["", "## 3. 边列表（A -> B 表示 B 依赖 A）", "```"] + [f"{d} -> {k}" for k in sorted(N) for d in N[k]] + ["```", "",
      f"## 4. 关键路径（依赖意义）", f"{' → '.join(g['critical'])}，权重和 {g['critical_days']} 人天（新卡 小0.5/中1，承接卡按 1）。", "",
      "## 5. 资源意义的工期（更真实）", "各执行者队列人天（haiku 卡按 0.5，其余按 1）：" + "；".join(f"{w} {q[w]}" for w in ["Hark", "P1", "P2", "P3"]) + "。",
      f"- P3 为资源瓶颈（{q['P3']} 人天），长于依赖关键路径。建议（V7-Q7）：P2 完成自身队列后接 D-12 与 D-15，届时由 Hark 把这两张卡挂到 P3 当前卡之后以保持所有权不相交。",
      "- 日历工期估算：约 12~14 天（不调整）或约 10~11 天（P2 分担后）。无历史吞吐数据，属估算，按周校准。", "",
      "## 6. 必须串行的链", "- 所有权串行：V7-SEC-01 → V7-SEC-02 → B-02（同改 users/roles）。", "- 发布链：B-04 → B-05 → B-07 → V7-UI-01 → W2-05 → W2-06 → W2-07。", "- 存储链：D-03 → D-09 → D-10/D-11/D-12 → D-14。", "- 测试目录全量所有权：W2-08 排在所有写测试的卡之后；W2-09 在 W2-03 之后（同改 package.json）。"]
open('07-依赖DAG与并行判定.md', 'w', encoding='utf-8').write("\n".join(L) + "\n")
# 08
ROLE = {"Hark": "核心与高难：安全热修、UI 集成、实机回归、终审推送打包", "P1": "API 平台线：B 余卡、契约测试、ESLint 边界；验收 C 线", "P2": "测试与独立验收：测试隔离、黑盒越权用例、A/E/B-D 验收、依赖安全", "P3": "运维性能线：D 余卡、AGENTS 对齐、根目录守卫、性能复测"}
L = ["# 08 · 所有权矩阵、档位分配与成本预算", "", "## 1. 执行者与职责", "", "| 执行者 | 角色 | 本版任务 |", "|---|---|---|"]
for w in ROLE: L.append(f"| {w} | {ROLE[w]} | {'、'.join(sorted(k for k in N if O[k] == w))} |")
L += ["", "同时写业务代码者 ≤3（Hark、P1、P3）；P2 只写测试、证据与依赖清单，符合规划总指令 §8.1。", "", "## 2. 所有权矩阵（路径 × 执行者；同一执行者的卡串行执行）", "", "| 路径 | Hark | P1 | P2 | P3 |", "|---|---|---|---|---|"]
rows = {}
for k in N:
    sec = open(f'tasks/{k}.md', encoding='utf-8').read().split("## 允许修改", 1)[1].split("\n##", 1)[0]
    for l in sec.strip().splitlines():
        if l.strip().startswith("-"): rows.setdefault(l.strip("- ").strip()[:80], {}).setdefault(O[k], []).append(k)
for p in sorted(rows): L.append(f"| `{p}` | " + " | ".join(','.join(rows[p].get(w, [])) or '—' for w in ROLE) + " |")
L += ["", "跨执行者共享同一路径的行均已由依赖边串行化（07 §6），机械复核重叠 0。", "", "## 3. 档位分配（默认 opus；sonnect 只做原子实现；haiku 只做文本/模板）", "", "| 档位 | 卡数 | 卡 |", "|---|---|---|"]
for t in ["opus", "sonnect", "haiku"]:
    ks = sorted(k for k in N if TI[k] == t); L.append(f"| {t} | {len(ks)} | {'、'.join(ks)} |")
L += ["| fable | 0 | 仅在需推翻冻结契约或改需求范围时启用，每切片 ≤1 次，需用户批准 |", "", "## 4. 成本预算（按切片）", "", "| 切片 | 任务数 | haiku | sonnect | opus | fable |", "|---|---|---|---|---|---|"]
for s in sorted(SN):
    ks = [k for k in N if SL[k] == s]; c = Counter(TI[k] for k in ks)
    L.append(f"| {s} | {len(ks)} | {c['haiku']} | {c['sonnect']} | {c['opus']} | 0 |")
L += ["", "**券制度**：opus 额外调用每切片 ≤3 次（切片前契约审 / 卡住升级 / 高风险 review）；fable 每切片 ≤1 次；超出需用户批准。", "**熔断**：同一卡连续 2 次验收失败 → 停止改代码，重写任务书 / 升级档位 / 标 blocked；禁止第 3 次硬撞。"]
open('08-所有权矩阵与档位成本.md', 'w', encoding='utf-8').write("\n".join(L) + "\n")
# prompts
for w in ROLE:
    ks = sorted([k for k in N if O[k] == w], key=lambda k: (LV[k], k))
    L = [f"# 执行者提示词 · {w}：{ROLE[w]}（V0.7）", "", f"你是 HDwebsite 项目的执行者 {w}。仓库 https://github.com/CodingHeader/HDwebsite ，分支 `upgrade`（单主线，lane 已废止）。", "",
         "## 开工前必读（顺序）", "1. AGENTS.md（§2 用户裁决、§3 前台冻结、§5 禁止事项、§6 完成定义）", "2. docs/V0.7-20261019/README.md、00-规划快照与事实基线.md、02-契约冻结包与数据模型.md、09-基线指标与验收规程.md", "3. 你的每张任务卡全文：docs/V0.7-20261019/tasks/<卡号>.md", "",
         "## 你的队列（按此顺序串行执行；依赖未完成则等待，不跳卡、不替别人做）", ""]
    L += [f"{n}. **{k}** {TT[k]}（档位 {TI[k]}；依赖 {', '.join(N[k]) or '无'}）" for n, k in enumerate(ks, 1)]
    L += ["", "## 纪律", "- 只改卡上「允许修改」路径；需要越界或改 `src/contracts/**`、`prisma/**`、依赖、测试配置 → 停止该子项，写《契约变更请求》交 Hark。", "- 不得根据猜测补全事实；缺信息标 BLOCKING 并上报。",
          "- 每张卡：开工前 `git pull --ff-only origin upgrade` → 按卡执行 → 跑卡上验证命令 → 写 `docs/design/06_validation/evidence/V7/<卡号>/<卡号>-execution.md` → 小提交 `feat|fix|docs(<卡号>): …` → `git pull --rebase` → 推送（禁止 force）。",
          "- 你不能判定自己的卡通过；独立验证者分配见 09 号文档 §3。", "- 同一卡 2 次验收失败：停止改代码，上报。", "- 任何输出、文件、remote URL 中都不得出现 token。"]
    open(f'prompts/{w}-提示词.md', 'w', encoding='utf-8').write("\n".join(L) + "\n")
print(json.dumps({w: q[w] for w in ROLE}, ensure_ascii=False))
