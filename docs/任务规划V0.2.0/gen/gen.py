# -*- coding: utf-8 -*-
import re, os, sys, json, fnmatch
from collections import defaultdict
sys.path.insert(0, os.path.dirname(__file__))
from tasks import T, LANES, OWNERSHIP, COMMON_FORBID, EXCLUDE

OUT = sys.argv[1]
REPO_FILES = [l.strip() for l in open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "files.txt"), encoding="utf-8") if l.strip()]
os.makedirs(f"{OUT}/tasks", exist_ok=True)
ids = {t["id"]: t for t in T}

# ── 反向依赖
rev = defaultdict(list)
for t in T:
    for d in t["deps"]:
        if d not in ids:
            raise SystemExit(f"未知依赖 {d} in {t['id']}")
        rev[d].append(t["id"])

def days(t):
    s = t["size"]
    if "<2h" in s: return 0.25
    m = re.findall(r"(\d+(?:\.\d+)?)(?:~(\d+(?:\.\d+)?))?\s*天", s)
    if m:
        a, b = m[0]
        return float(b or a)
    return {"小": 0.5, "中": 1, "大": 2}.get(s[0], 1)

# ── 拓扑 + 环检测
indeg = {k: len(v["deps"]) for k, v in ids.items()}
order, q = [], [k for k, v in indeg.items() if v == 0]
while q:
    q.sort(); n = q.pop(0); order.append(n)
    for m in rev[n]:
        indeg[m] -= 1
        if indeg[m] == 0: q.append(m)
cycle = len(order) != len(ids)
# 最长路径（关键路径，按天）
dist, prev = {}, {}
for n in order:
    best, bp = 0.0, None
    for d in ids[n]["deps"]:
        if dist[d] > best: best, bp = dist[d], d
    dist[n] = best + days(ids[n]); prev[n] = bp
end = max(dist, key=dist.get)
crit = []
x = end
while x: crit.append(x); x = prev[x]
crit.reverse()
# 资源约束排程：每条线（含 W0、W2）只有 1 名执行者；按“剩余最长路径”优先的列表调度
succ = rev
tail = {}
for n in reversed(order):
    tail[n] = days(ids[n]) + max([tail[m] for m in succ[n]] or [0])
finish, free = {}, defaultdict(float)
done = set(); pending = set(ids)
while pending:
    ready = [n for n in pending if all(d in done for d in ids[n]["deps"])]
    ready.sort(key=lambda n: (-tail[n], n))
    n = ready[0]
    L = ids[n]["lane"]
    st = max([finish[d] for d in ids[n]["deps"]] + [free[L]])
    finish[n] = st + days(ids[n]); free[L] = finish[n]
    done.add(n); pending.remove(n)
makespan = max(finish.values())
lane_finish = {L: max(finish[n] for n in ids if ids[n]["lane"] == L) for L in LANES}
def schedule(mp):
    fin, fr, dn, pd = {}, defaultdict(float), set(), set(ids)
    while pd:
        rd = sorted([n for n in pd if all(d in dn for d in ids[n]["deps"])], key=lambda n: (-tail[n], n))
        n = rd[0]; L = mp.get(ids[n]["lane"], ids[n]["lane"])
        st = max([fin[d] for d in ids[n]["deps"]] + [fr[L]]); fin[n] = st + days(ids[n]); fr[L] = fin[n]; dn.add(n); pd.remove(n)
    return max(fin.values()), dict(fr)
MODES = {"V0.3（推荐）：Hark=A 流+E 流（UI 核心，自做）+W2 集成终审，P1=W0+B，P2=C，P3=D+W2 后端段": {"Z": "P1", "B": "P1", "C": "P2", "D": "P3", "A": "Hark-A", "E": "Hark-E", "W": "Hark-A"},
         "4 名（V0.2 推荐）：P1=W0+B→C，P2=A+W2 主持，P3=E，P4=D": {"Z": "P1", "B": "P1", "C": "P1", "A": "P2", "W": "P2", "E": "P3", "D": "P4"},
         "2 名（已定）：X=A→E，Y=W0+B→C→D，W2 由 X 主持": {"A": "X", "E": "X", "W": "X", "Z": "Y", "B": "Y", "C": "Y", "D": "Y"},
         "3 名：UI=A→E，平台=B→C，运维=D": {"E": "A", "C": "B"},
         "5 名：A、E、B、C、D 各一人": {}}
mode_res = {k: schedule(v) for k, v in MODES.items()}
lane_days = defaultdict(float)
lane_chain = {}
for L in "ABCDE":
    # 线内关键链（只算线内依赖）
    ld, lp = {}, {}
    for n in order:
        if ids[n]["lane"] != L: continue
        best, bp = 0.0, None
        for d in ids[n]["deps"]:
            if ids[d]["lane"] == L and ld[d] > best: best, bp = ld[d], d
        ld[n] = best + days(ids[n]); lp[n] = bp
    e = max(ld, key=ld.get); ch = []; y = e
    while y: ch.append(y); y = lp[y]
    lane_chain[L] = (list(reversed(ch)), ld[e], sum(days(ids[n]) for n in ld))

# ── 所有权机械检查
def glob_re(p):
    p = p.split("（")[0].strip()
    r = ""; i = 0
    while i < len(p):
        if p[i:i+3] == "**/": r += "(?:.*/)?"; i += 3
        elif p[i:i+2] == "**": r += ".*"; i += 2
        elif p[i] == "*": r += "[^/]*"; i += 1
        elif p[i] in "{":
            j = p.index("}", i); r += "(?:" + "|".join(re.escape(x) for x in p[i+1:j].split(",")) + ")"; i = j + 1
        else: r += re.escape(p[i]); i += 1
    return re.compile("^" + r + "$")
own_re = {L: [(p, glob_re(p)) for p in ps] for L, ps in OWNERSHIP.items()}
exc_re = {L: [glob_re(p) for p in EXCLUDE.get(L, [])] for L in OWNERSHIP}
def owns(L, f):
    return any(r.match(f) for _, r in own_re[L]) and not any(r.match(f) for r in exc_re[L])
planned = set()
for t in T:
    for o in t["outputs"]:
        p = o.split("（")[0].split("：")[0].strip()
        if "/" in p or "." in p:
            for x in re.findall(r"[A-Za-z0-9_\-./()\[\]{},<>*]+", p):
                if "/" in x and "{" not in x and "<" not in x and "*" not in x:
                    planned.add(x)
universe = sorted(set(REPO_FILES) | planned)
overlaps, owned = [], defaultdict(list)
for f in universe:
    hit = [L for L in own_re if owns(L, f)]
    if len(hit) > 1: overlaps.append((f, hit))
    for L in hit: owned[L].append(f)
# 任务 allow ⊆ 本线所有权
EXC = {"package.json（仅 scripts 字段）"}
subset_violations = []
for t in T:
    L = t["lane"]
    if L not in OWNERSHIP: continue
    for a in t["allow"]:
        if a in EXC: continue
        ar = glob_re(a)
        cands = [f for f in universe if ar.match(f)] or [a.split("（")[0]]
        if "不含" in a:
            cands = [f for f in cands if not any(r.match(f) for r in exc_re[L])] or cands[:0]
        for f in cands:
            if not owns(L, f):
                subset_violations.append((t["id"], a, f)); break
frozen = [f for f in REPO_FILES if f.startswith(("src/", "prisma/", "tests/", "scripts/")) and not any(owns(L, f) for L in own_re)]

# ── 任务卡
def bullets(xs): return "\n".join(f"- {x}" for x in xs) if xs else "- 无"
for t in T:
    L = LANES[t["lane"]]
    ev = f"docs/design/06_validation/evidence/{'W0' if t['lane']=='Z' else ('W2' if t['lane']=='W' else 'W1-'+t['lane'])}/{t['id']}/"
    if t["lane"] == "Z":
        forbid = t["forbid"] + ["本卡“允许修改”以外的任何路径（Wave 0 串行，每张卡只碰自己的文件）", "src/app/(web)/**、src/components/web/**、public/**、src/app/globals.css", "真实环境文件 .env / .env.local（.env.example 除外）、prisma/*.db、backups/、data/、任何密钥"]
    elif t["lane"] == "W":
        forbid = t["forbid"] + ["本卡“允许修改”以外的任何路径", "替任何执行线补业务代码（发现问题退回对应线）", "src/contracts/**、prisma/**（Wave 2 不再改契约与表；确需改动须用户批准）", "真实环境文件 .env / .env.local（.env.example 除外）、prisma/*.db、backups/、data/、任何密钥"]
    else:
        forbid = t["forbid"] + COMMON_FORBID
    card = f"""# {t['id']}：{t['title']}

> 执行线：{L['name']}　分支：`{L['branch']}`　所有者：{L['agent']}　工作包：{t['wp']}

## 归属
- 所属切片：{t['slice']}
- 来源需求：{t['req']}
- 来源方案：本规划包 04-剩余任务大纲体系.md、07-所有权矩阵.md；ADR 见各卡输出

## 目标
{t['goal']}

## 输入
- 文档/证据：{t['inputs']}
- 契约：`src/contracts/**`（以 tag `w1-base` 为准，Wave 1 冻结）
- 前置任务：{', '.join(t['deps']) or '无'}
- 前置状态：{'Wave 0 已打 tag w1-base 且 W0-verify=PASS' if t['lane'] in 'ABCDE' else ('上一张 W0 卡已提交' if t['lane']=='Z' else '四线独立校验均 PASS')}

## 输出（新增/修改）
{bullets(t['outputs'])}

## Execution Steps
""" + "\n".join(f"{i}. [ ] {s}" for i, s in enumerate(t["steps"], 1)) + f"""
{len(t['steps'])+1}. [ ] 跑本卡验证命令与通用门禁，结果写入证据目录
{len(t['steps'])+2}. [ ] 提交：`git commit -m "<feat|fix|docs>({t['id']}): <摘要>"`（只含允许路径）

## 验收标准
{chr(10).join('- [ ] ' + a for a in t['accept'])}
- [ ] 通用门禁 `npm run lint && npm run typecheck && npm test && npm run build` 全部 exit 0
- [ ] `git log --first-parent --no-merges --name-only --format= <本卡起点>..HEAD | sort -u` 全部落在“允许修改”内（`--first-parent` 只沿本线主干、排除合并带入的他线提交——M1 的 w1-ui-kit、已批准 CCR 都不计入；本线合入他线一律 `git merge --no-ff`；独立验证者用同一口径）

## 验证命令
```bash
{chr(10).join(t['verify'])}
```

## 证据路径
`{ev}`（命令、输出摘要、截图；一周后的人无需追问即可复现）

## 允许修改
{bullets(t['allow'])}

## 禁止修改
{bullets(forbid)}

## 依赖与阻塞
- Depends on：{', '.join(t['deps']) or '无'}
- Blocks：{', '.join(sorted(rev[t['id']])) or '无'}
- 阻塞条件：需要改冻结面（契约/迁移/依赖/他线文件）→ 停止该子项，写《契约变更请求》（见 11-验收与审查规程.md §4）
- 假设：{('；'.join(t['assume'])) if t['assume'] else '无'}

## 建议执行档位
{t['tier']}　理由：{t['tier_why']}

## 升级条件
{t['escalate']}；同一卡连续 2 次独立验收 FAIL → 熔断（停止改代码，重写本卡/升级档位/标 blocked）

## 预估规模
{t['size']}（计划值 {days(t)} 人天）
"""
    open(f"{OUT}/tasks/{t['id']}.md", "w", encoding="utf-8").write(card)

# ── 任务索引
rows = ["| ID | 执行线 | 工作包 | 任务 | 依赖 | 档位 | 人天 |", "|---|---|---|---|---|---|---|"]
for t in T:
    rows.append(f"| [{t['id']}](tasks/{t['id']}.md) | {t['lane']} | {t['wp']} | {t['title']} | {', '.join(t['deps']) or '—'} | {t['tier']} | {days(t)} |")
open(f"{OUT}/05-任务索引.md", "w", encoding="utf-8").write("# 任务索引（由 gen/tasks.py 生成，共 %d 张卡）\n\n" % len(T) + "\n".join(rows) + "\n")

# ── 档位统计
tiers = defaultdict(lambda: defaultdict(int))
for t in T:
    for k in ("haiku", "sonnect", "opus", "fable"):
        if t["tier"].startswith(k) or (k in t["tier"] and k == "opus" and "opus" in t["tier"]):
            tiers[t["lane"]][k] += 1
            break

json.dump(dict(
    cycle=cycle, order=order, critical=crit, critical_days=dist[end],
    lane_chain={k: dict(chain=v[0], chain_days=v[1], total_days=v[2]) for k, v in lane_chain.items()},
    overlaps=overlaps, subset_violations=subset_violations,
    owned_counts={k: len(v) for k, v in owned.items()}, frozen_count=len(frozen), frozen_sample=frozen[:400],
    tiers={k: dict(v) for k, v in tiers.items()}, n=len(T), makespan=makespan, lane_finish=lane_finish, modes={k: v for k, v in mode_res.items()}, start_finish={n: [round(finish[n]-days(ids[n]),2), round(finish[n],2)] for n in ids},
    lane_days={L: sum(days(t) for t in T if t["lane"] == L) for L in LANES},
), open(f"{OUT}/gen-check.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print("tasks", len(T), "cycle", cycle, "overlaps", len(overlaps), "subset_violations", len(subset_violations))
print("critical", crit, dist[end], "makespan(1人/线)", makespan, lane_finish)
for L, v in lane_chain.items(): print(L, v[1], v[2], v[0])
for o in overlaps[:20]: print("OVERLAP", o)
for s in subset_violations[:30]: print("SUBSET", s)

# ── 04 大纲体系（WBS：Wave → 执行线 → 工作包 → 原子任务 → 执行步骤）
WAVE = {"Z": "1. Wave 0 契约冻结与解阻（串行，单写入者）", "A": "2. Wave 1 五线并行", "E": "2. Wave 1 五线并行", "B": "2. Wave 1 五线并行", "C": "2. Wave 1 五线并行", "D": "2. Wave 1 五线并行", "W": "3. Wave 2 集成与终审（串行）"}
lane_order = ["Z", "A", "E", "B", "C", "D", "W"]
lines = ["# 剩余任务大纲体系（五级：Wave → 执行线 → 工作包 → 原子任务 → 执行步骤）", "",
         "> 由 gen/tasks.py 生成，与任务卡同源。编号规则：`波次.执行线.工作包.任务.步骤`。每个原子任务 ≤2 人天、可独立验收；步骤是“怎么做”，任务是“交付什么”。", ""]
lane_no = {"Z": "1.1", "A": "2.1", "E": "2.2", "B": "2.3", "C": "2.4", "D": "2.5", "W": "3.1"}
last_wave = None
for L in lane_order:
    w = WAVE[L]
    if w != last_wave:
        lines += [f"## {w}", ""]; last_wave = w
    lines += [f"### {lane_no[L]} {LANES[L]['name']}（分支 `{LANES[L]['branch']}`，所有者 {LANES[L]['agent']}）", ""]
    wps = []
    for t in T:
        if t["lane"] == L and t["wp"] not in wps: wps.append(t["wp"])
    for wi, wp in enumerate(wps, 1):
        lines.append(f"#### {lane_no[L]}.{wi} {wp}")
        ts = [t for t in T if t["lane"] == L and t["wp"] == wp]
        for ti, t in enumerate(ts, 1):
            n = f"{lane_no[L]}.{wi}.{ti}"
            lines.append(f"- **{n} [{t['id']}](tasks/{t['id']}.md) {t['title']}**（{t['tier']}，{days(t)} 人天，依赖：{', '.join(t['deps']) or '无'}）")
            lines.append(f"  - 交付：{t['goal']}")
            for si, s in enumerate(t["steps"], 1):
                lines.append(f"  - {n}.{si} {s}")
            lines.append(f"  - {n}.{len(t['steps'])+1} 验收：" + "；".join(t["accept"]))
        lines.append("")
open(f"{OUT}/04-剩余任务大纲体系.md", "w", encoding="utf-8").write("\n".join(lines) + "\n")

# ── 07 所有权矩阵
ol = ["# 所有权矩阵（Wave 1；由 gen/tasks.py 的 OWNERSHIP 生成并机械校验）", "",
      f"- 校验对象：upgrade@bb2c0e5 已跟踪文件 {len(REPO_FILES)} 个 ∪ 任务卡计划新增文件 {len(planned)} 个",
      f"- **重叠：{len(overlaps)} 处**；任务“允许修改”越出本线所有权：**{len(subset_violations)} 处**；环：{'有' if cycle else '无'}",
      f"- 未被任何执行线拥有、因而在 Wave 1 冻结的 src/prisma/tests/scripts 文件：{len(frozen)} 个（含前台在用的 `src/components/ui/{{button,input,textarea,label}}.tsx`、20 个纯 CRUD 工厂路由目录、src/contracts/**、prisma/schema.prisma 与迁移）",
      "- 无字段级例外：`package.json`（含 scripts）与锁文件在 Wave 1 全部冻结；脚本接入与依赖删除在 Wave 2（W2-03、W2-09）。", ""]
ol += ["| 执行线 | 拥有路径（glob） | 排除 | 命中文件数 |", "|---|---|---|---|"]
for L in ["A", "E", "B", "C", "D"]:
    ol.append(f"| {L} {LANES[L]['name']} | " + "<br>".join(f"`{p}`" for p in OWNERSHIP[L]) + " | " + ("<br>".join(f"`{p}`" for p in EXCLUDE.get(L, [])) or "—") + f" | {len(owned[L])} |")
ol += ["", "## 冻结文件（节选，完整清单见 gen-check.json 的 frozen_sample）", ""]
ol += [f"- `{f}`" for f in frozen[:60]]
open(f"{OUT}/07-所有权矩阵.md", "w", encoding="utf-8").write("\n".join(ol) + "\n")

# ── 08 档位与预算
tl = ["# 档位分配与成本预算", "", "默认档 = opus（规划总指令 §8.2）；实现类原子任务降为 sonnect 须在卡内写理由，见各卡“建议执行档位”。", "",
      "| 执行线 | 任务数 | haiku | sonnect | opus | fable | 计划人天 | 线内关键链（人天） |", "|---|---|---|---|---|---|---|---|"]
for L in lane_order:
    ts = [t for t in T if t["lane"] == L]
    c = tiers.get(L, {})
    ch = f"{lane_chain[L][1]}" if L in lane_chain else "—"
    tl.append(f"| {L} {LANES[L]['name']} | {len(ts)} | {c.get('haiku',0)} | {c.get('sonnect',0)} | {c.get('opus',0)} | 0 | {sum(days(t) for t in ts)} | {ch} |")
tl += ["", f"依赖关键路径（人力无限）：{' → '.join(crit)}，{dist[end]} 人天；**资源约束工期（每线 1 人）：{makespan} 人天**（以此为准）。各线完成时点：" + "，".join(f"{k} {v}" for k, v in lane_finish.items()), "",
       "执行者模式工期（资源约束调度）：" + "；".join(f"{k} → {v[0]} 人天" for k, v in mode_res.items()), "", "券制度：opus 每执行线 ≤3 次（契约审 / 卡住升级 / 高风险 review）；fable 每执行线 ≤1 次（仅改需求或已冻结契约）；超出需用户批准。", "",
       "熔断：同一任务连续 2 次独立验收 FAIL → 停止改代码 → 重写任务卡 / 升级档位 / 标 blocked；禁止换提示词硬撞第 3 次。"]
open(f"{OUT}/08-档位与成本预算.md", "w", encoding="utf-8").write("\n".join(tl) + "\n")

# ── 06 DAG（生成部分）
dl = ["## 生成部分：拓扑序、关键路径、线内关键链", "", f"- 环检测：{'有环！' if cycle else '无环'}（Kahn 拓扑排序 {len(order)}/{len(ids)} 个节点全部出队）",
      f"- 依赖关键路径（假设人力无限）：{' → '.join(crit)}（{dist[end]} 人天）", f"- **资源约束工期（每条线 1 名执行者，按剩余最长路径优先调度）：{makespan} 人天**；各线完成时点：" + "，".join(f"{k} {v}" for k, v in lane_finish.items())]
for L in "ABCDE":
    dl.append(f"- 线 {L} 关键链：{' → '.join(lane_chain[L][0])}（{lane_chain[L][1]} 人天；线内合计 {lane_chain[L][2]} 人天）")
dl += ["", "### 依赖边（全部）", "", "```text"]
for t in T:
    for d in t["deps"]:
        dl.append(f"{d} --> {t['id']}")
dl += ["```", "", "### 拓扑序", "", "```text", " → ".join(order), "```"]
open(f"{OUT}/06-依赖DAG与并行判定.md", "w", encoding="utf-8").write(open(os.path.join(os.path.dirname(__file__), "06-head.md"), encoding="utf-8").read() + "\n".join(dl) + "\n")

# ── 03a 垂直切片清单（每个切片 = 一个端到端可演示行为）
sl = ["# 03a 垂直切片清单（含排序与理由）", "",
      "> 由 gen/tasks.py 的 slice 字段生成。按规划总指令 §5，切片是“结束时比上一刀多出的可演示行为”，执行线只是所有权划分。",
      "> 说明（反证结论）：Wave 1 按层分线后，知识库、通知等跨层功能要到 Wave 2 合并后才能端到端演示；每条线在本线内用 mock/契约测试演示到本层为止，**完整演示点在 W2-05**。", "",
      "| 刀 | 切片（可演示行为） | 组成卡 | 最早可演示 | 排序理由 |", "|---|---|---|---|---|"]
from collections import OrderedDict
groups = OrderedDict()
for t in T:
    groups.setdefault(t["slice"], []).append(t["id"])
why = {"S0 治理刀": "冻结点：没有它五线无法并行（§7.1）", "S-W 集成": "收口：守卫、全量回归与终审"}
for i, (k, v) in enumerate(groups.items(), 1):
    lanes = {ids[x]["lane"] for x in v}
    demo = "W0-08" if "Z" in lanes else ("W2-05" if "W" in lanes else f"{v[-1]} 独立验证后（本线分支）；端到端在 W2-05")
    sl.append(f"| {i} | {k} | {', '.join(v)} | {demo} | {why.get(k, '按依赖与价值：先解阻、后体验；同线内先接口后页面')} |")
open(f"{OUT}/03a-垂直切片清单.md", "w", encoding="utf-8").write("\n".join(sl) + "\n")
