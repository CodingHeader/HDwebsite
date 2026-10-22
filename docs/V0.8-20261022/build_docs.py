#!/usr/bin/env python3
import json,os,re
H=os.path.dirname(os.path.abspath(__file__)); D=json.load(open(f"{H}/evidence/dag.json",encoding="utf-8"))
C=D["cards"]; by={c["id"]:c for c in C}
SL={"S0":"入口与执行协议","S1":"安全依赖收口（K10）","S2":"测试与守卫补洞","S3":"Linux 视觉回归闭环","S4":"后台性能","S5":"后台体验收尾（UI）","S6":"外部联调就绪与部署验证","S7":"独立验收与发布"}
def steps(i): 
    t=open(f"{H}/tasks/{i}.md",encoding="utf-8").read()
    return re.findall(r"^\d+\. \[ \] (.*)$",t.split("## Execution Steps")[1].split("##")[0],re.M)
# 03 大纲
o=["# 03 剩余可执行大纲（3 级：切片 → 原子任务 → 步骤）\n","> 序号规则：`切片.任务.步骤`；任务即任务卡，步骤即卡内 Execution Steps。\n"]
for si,(s,n) in enumerate(SL.items(),1):
    o.append(f"\n## {si}. {s} {n}\n")
    for ti,c in enumerate([c for c in C if c["slice"]==s],1):
        o.append(f"### {si}.{ti} {c['id']} {c['name']}（{c['owner']}·{c['tier']}·{c['days']}d；依赖：{', '.join(c['deps']) or '无'}）")
        for k,st in enumerate(steps(c["id"]),1): o.append(f"- {si}.{ti}.{k} {st}")
open(f"{H}/03-剩余可执行大纲.md","w",encoding="utf-8").write("\n".join(o)+"\n")
# 拓扑层（并行组）
lvl={}
def L(i): 
    if i not in lvl: lvl[i]=1+max([L(d) for d in by[i]["deps"]] or [0])
    return lvl[i]
for c in C: L(c["id"])
# 05 索引
r=["# 05 任务索引（18 张）\n","| 序 | 卡 | 名称 | 切片 | 执行者 | 档位 | 人天 | 依赖 | 并行层 |","|---|---|---|---|---|---|---|---|---|"]
for i,c in enumerate(sorted(C,key=lambda c:(lvl[c['id']],c['id'])),1):
    r.append(f"| {i} | [{c['id']}](tasks/{c['id']}.md) | {c['name']} | {c['slice']} | {c['owner']} | {c['tier']} | {c['days']} | {', '.join(c['deps']) or '—'} | L{lvl[c['id']]} |")
open(f"{H}/05-任务索引.md","w",encoding="utf-8").write("\n".join(r)+"\n")
# 06
g=["# 06 依赖 DAG · 所有权矩阵 · 档位与成本\n","## 1. 并行组（拓扑层；同层卡满足：无共享可变状态 ∧ 契约冻结且由 zod 机器校验 ∧ 允许路径不相交（gen_tasks.py 检测为 0） ∧ 本轮 0 迁移）\n"]
for k in sorted(set(lvl.values())):
    g.append(f"- **L{k}**："+"、".join(f"{i}({by[i]['owner']})" for i in sorted(x for x in lvl if lvl[x]==k)))
g.append(f"\n## 2. 关键路径（{D['critical_days']} 人天）\n\n`"+" → ".join(D["critical"])+"`\n")
g.append("必须串行的链：\n- 依赖冻结面：SEC-01 → SEC-02 → SEC-03（同改 package.json）\n- 视觉：VIS-01 → VIS-02 → VIS-03（数据 → CI → 修复）\n- 收尾：T-03 位于所有改 src 的卡之后（src/** 写权限）→ V-01 → REL-02\n")
g.append("**方案 B（Q1 不授权）**：SEC-01/02/03、PERF-01、UI-01、T-03、REL-01 标 blocked；其余 11 张卡照常推进（G-01、SEC-04、T-01、T-02、T-04、VIS-01、VIS-02、VIS-03、INT-01、V-01 的部分验收、REL-02 的同步部分）。\n\n环检测：gen_tasks.py 递归检测，0 环。\n")
g.append("## 3. 所有权矩阵（执行者 × 路径；gen_tasks.py 检测重叠 = 0）\n\n| 执行者 | 卡 | 允许路径 |\n|---|---|---|")
for c in C: g.append(f"| {c['owner']} | {c['id']} | "+"<br>".join(f"`{p}`" for p in c["allow"])+" |")
load={}; 
for c in C: load.setdefault(c["owner"],[0,0]); load[c["owner"]][0]+=1; load[c["owner"]][1]+=c["days"]
g.append("\n## 4. 负载\n\n| 执行者 | 卡数 | 人天 |\n|---|---|---|"+"".join(f"\n| {k} | {v[0]} | {v[1]} |" for k,v in load.items()))
g.append("\n\n## 5. 成本预算（按切片）\n\n| 切片 | 任务数 | haiku | sonnect | opus | fable |\n|---|---|---|---|---|---|")
for s in SL:
    cs=[c for c in C if c["slice"]==s]
    g.append(f"| {s} | {len(cs)} | "+" | ".join(str(sum(1 for c in cs if c['tier']==t)) for t in ("haiku","sonnect","opus","fable"))+" |")
g.append("\n券制度：opus 每切片 ≤3 次（卡本身占用计入）；fable 每切片 ≤1 次，仅限推翻冻结契约；超出需用户批准。熔断：同卡连续 2 次 FAIL → 停止改代码 → 升档并重写任务书。\n")
open(f"{H}/06-DAG-所有权-档位.md","w",encoding="utf-8").write("\n".join(g)+"\n")
# steps
os.makedirs(f"{H}/steps",exist_ok=True)
for si,(s,n) in enumerate(SL.items()):
    cs=[c for c in C if c["slice"]==s]
    t=[f"# STEP-{si} {s} {n}\n","## 进入条件",f"- 所含卡的依赖均为 done（见 state.json）\n","## 卡与执行者"]+[f"- [{c['id']}](../tasks/{c['id']}.md) {c['name']} — {c['owner']}/{c['tier']}" for c in cs]
    t+=["\n## 退出条件","- 本步骤所有卡 status ∈ {done, blocked(外部条件)}；done 的卡均有 execution.md","- 全量门禁绿","\n## 不阻塞说明","- 本步骤中任何一张卡 blocked，都不影响其他步骤中依赖已满足的卡（按 04 协议取下一张）"]
    open(f"{H}/steps/STEP-{si}-{s}.md","w",encoding="utf-8").write("\n".join(t)+"\n")
# prompts
os.makedirs(f"{H}/prompts",exist_ok=True)
for who in load:
    mine=[c['id'] for c in C if c['owner']==who]
    p=f"""# {who} 启动提示词（V0.8，复制即可用）

你是 HDwebsite 项目的执行者 **{who}**。仓库 https://github.com/CodingHeader/HDwebsite ，只用 `upgrade` 分支。禁止新建分支或 tag，禁止 force push，禁止合并 main。

1. 先读 `AGENTS.md`，再读 `docs/V0.8-20261022/04-连续执行协议.md`，并严格按其中 §1 主循环工作。
2. 你的卡：{', '.join(mine)}。只能认领 state.json 中 owner={who} 且 status=ready 的卡。
3. 每张卡只改「允许修改」中的路径。需要跨所有权时写 ccr-request.md 后继续，不要越界。
4. 遇到阻塞（未裁决、缺凭证、缺环境）：标 blocked，写明原因，**立刻取下一张卡**，绝不停下来等人。
5. 同一张卡连续 2 次验收失败 → 熔断，见协议 §1.7。
6. npm audit 必须加 `--registry=https://registry.npmjs.org`。
7. 每完成一张卡：提交 → `git pull --rebase` → 跑门禁 → push → 更新 state.json → 在 EXEC-log.md 写心跳。
8. 只有满足协议 §6 收尾条件才可以停止，并输出：已完成卡、blocked 卡及原因、双端 SHA。
"""
    if who=="P2": p+="\n另：你也是 V8-V-01 的独立验证者。验证他人的卡时只看 diff 和命令输出，结论只写 PASS / FAIL / UNKNOWN。\n"
    open(f"{H}/prompts/{who}-提示词.md","w",encoding="utf-8").write(p)
print("built",lvl)
