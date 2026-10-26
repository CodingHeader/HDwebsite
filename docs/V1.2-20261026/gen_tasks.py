#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
V1.2 任务卡唯一源（gen_tasks.py，V1.1 先例）。
- 生成 docs/V1.2-20261026/tasks/*.md 与 steps/STEP-S*.md
- 内建检查：依赖环检测；所有卡字段完整性（16 字段）
用法：python gen_tasks.py
"""
import os

OUT = os.path.join(os.path.dirname(__file__))
TASKS = os.path.join(OUT, "tasks")
STEPS = os.path.join(OUT, "steps")
os.makedirs(TASKS, exist_ok=True)
os.makedirs(STEPS, exist_ok=True)

C = []
def card(**k): C.append(k)

# ───────────────────────── S0 ─────────────────────────
card(id="V12-G-01", slice="S0", owner="P2", title="门禁基线与现状盘点",
 goal="在 a04530c 上固化 V1.2 起点基线五连（lint/typecheck/test/build/check-root），盘点 e2e 79 例与 visual 46 例现状",
 deps=[], paths=["docs/design/06_validation/evidence/V12/G-01/**"],
 steps=["本地跑 lint/typecheck/test/build/check-root 五连并记录数值",
        "复跑 npm run test:e2e 记录通过/失败计数（预期 77/2，79 例）",
        "读取 .cache/visual/results.json 记录 46 例计数（预期 10/36）",
        "git rev-list 双端 0 0 固化快照，登记 e2e.db/visual 基线数据口径"],
 accept=["五连全绿（lint 0 / tsc / 单测不降 / build / check-root）",
         "e2e 与 visual 现状计数入证据（含失败清单）",
         "快照（a04530c + 双端 0 0）入 evidence"],
 verify="npm run lint && npx tsc --noEmit && npm test && npm run build && npm run check:root && npm run test:e2e",
 evidence="docs/design/06_validation/evidence/V12/G-01/", forbid=["src/**", "tests/**", "prisma/**", "docs/design/06_validation/evidence/V12/**（G-01 外）"],
 grade="低", size="小", source="V1.2 门禁归零轮 S0")

# ───────────────────────── S1 E2E ─────────────────────────
card(id="V12-E2E-01", slice="S1", owner="main-agent", title="apply-chat 会话签发竞态修复",
 goal="访客在 /apply 发送消息必收到 AI 流式回复（e2e 单跑稳定绿），消除多签发源竞态导致的 POST 400",
 deps=["V12-G-01"],
 paths=["src/app/api/chat/session/route.ts", "src/lib/chat-service.ts", "src/components/web/ChatWidget.tsx", "src/app/(web)/apply/ApplyClient.tsx", "src/lib/__tests__/**（v12 前缀测试）", "docs/design/06_validation/evidence/V12/E2E-01/**"],
 steps=["复现：单跑 tests/e2e/apply-chat.spec.ts 记录红（必现）",
        "服务端幂等签发：GET /api/chat/session 时若已有有效签名 cookie → 复用该 sessionId，不再生成新 id 覆盖（无有效 cookie 才签发）",
        "客户端收敛签发点：ApplyClient 与 ChatWidget 的 fetchOrReuseSessionId/ensureSessionId 收敛为共享 helper（模块级单例 promise，避免同页并发多次 GET）",
        "400 重试语义收紧：仅在服务端 cookie 确实失效时重签且串行化（防重试自指竞态）",
        "回归：apply-chat 单跑绿；SEC-04 会话劫持/签名校验单测仍绿；既有 chat 单测全绿"],
 accept=["apply-chat.spec.ts 单跑 PASS（MOCK_REPLY 可见，会话落库）",
         "trace 证明页面加载只有 0~1 次 GET /api/chat/session（无同键覆盖）",
         "SEC-04 会话校验单测不回归（篡改/过期/不匹配仍 400）",
         "lint/typecheck/单测全绿"],
 verify="npx playwright test -c tests/e2e/playwright.config.ts apply-chat && npx vitest run src/lib/__tests__ && npx tsc --noEmit",
 evidence="docs/design/06_validation/evidence/V12/E2E-01/", forbid=["src/contracts/**", "prisma/**", "package.json", "tests/e2e/mobile-375.spec.ts"],
 grade="高", size="中", source="V1.2 00 §3 根因取证（trace 4×GET session → 400）")

card(id="V12-E2E-02", slice="S1", owner="P2", title="mobile-375 空态容忍断言修正",
 goal="375 管理端用例在空库/有数据两种状态下都稳定（删除 isVisible 即时快照竞态）",
 deps=["V12-G-01"],
 paths=["tests/e2e/mobile-375.spec.ts", "tests/e2e/fixtures/helpers.ts（如涉）", "docs/design/06_validation/evidence/V12/E2E-02/**"],
 steps=["复现：单跑 tests/e2e/mobile-375.spec.ts 记录红（内容中枢/招生批次空态）",
        "把『空态文本 isVisible() 即时快照 + 否则等卡片』改为『等任一（空态 XOR 内容）出现』：Promise.race([expect(empty).toBeVisible().catch(ok), expect(cards).toBeVisible()]) 语义",
        "不改 seed（EnrollmentOffering 0 行是既有口径，避免撞 visual 基线数据面）；content-hub 同家族竞态一并修",
        "单跑 mobile-375 全绿；全量 e2e 联跑不回归"],
 accept=["mobile-375.spec.ts 单跑 4/4 ALL PASS（隔离环境）",
         "空态与有数据两条路径均有断言覆盖（代码注释说明双态）",
         "seed/其他 spec 未改"],
 verify="npx playwright test -c tests/e2e/playwright.config.ts mobile-375",
 evidence="docs/design/06_validation/evidence/V12/E2E-02/", forbid=["src/**", "prisma/**", "src/contracts/**", "tests/e2e/apply-chat.spec.ts"],
 grade="中", size="小", source="V1.2 00 §3 根因（isVisible 即时快照竞态）")

card(id="V12-E2E-03", slice="S1", owner="P1", title="全量 e2e 复跑与 CI 归零",
 goal="E2E-01/02 合并后全量 e2e 79/79 本地绿，推送后 CI Linux E2E job PASS",
 deps=["V12-E2E-01", "V12-E2E-02"],
 paths=["docs/design/06_validation/evidence/V12/E2E-03/**", "docs/V1.2-20261026/state.json", "docs/V1.2-20261026/EXEC-log.md"],
 steps=["git pull --ff-only origin upgrade 确认双端",
        "全量 npm run test:e2e，79/79 清零（失败登记不改动 E2E-01/02 已修路径）",
        "逐一核对 CI 日志用例数与本地一致（无法下载时以本地 + CI conclusion 为准登记 UNKNOWN）",
        "推送 upgrade，等 CI run conclusion PASS（gate job）"],
 accept=["本地全量 e2e 79/79 ALL PASS",
         "推送后 CI gate job（含 E2E Linux）PASS，run conclusion 记录入证据",
         "若 CI 仍 FAIL：附失败 job/step 名 + 归因，标 blocked 上报（不强行发包）"],
 verify="npm run test:e2e && git push origin upgrade && （CI run 结论）",
 evidence="docs/design/06_validation/evidence/V12/E2E-03/", forbid=["src/**", "tests/e2e/**", "prisma/**"],
 grade="中", size="中", source="V1.2 门禁归零（CI run 40281405584 gate FAIL）")

# ───────────────────────── S2 Visual ─────────────────────────
card(id="V12-VIS-01", slice="S2", owner="main-agent", title="Visual 基线漂移分诊与恢复",
 goal="对 36/46 失败逐组判定（真回归 vs 基线过期 vs 渲染噪声），据此修复或经 Linux CI 重生成基线，使 test:visual 门禁绿",
 deps=["V12-G-01"],
 paths=["docs/design/06_validation/evidence/V12/VIS-01/**", "docs/V1.2-20261026/state.json", "docs/V1.2-20261026/EXEC-log.md"],
 steps=["依据 .cache/visual/results.json + 断点文档（2026-10-26-breakpoint-resume.md 分诊表），为 36 例逐组标注：真回归候选 / 内容或高度过期 / 渲染噪声",
        "真回归候选 → 对照 main 基准确认并修复（修复走 src 对应文件 + 单测）",
        "过期/噪声 → 触发 Linux CI `workflow_dispatch visual_update_ref` 重生成参照（artifact 人工核对后提交）",
        "最终 test:visual 本地（若平台允许）或 CI visual job PASS",
        "derived doc：分诊表入证据，注明每组的判定依据"],
 accept=["分诊表覆盖全部 36 例（三分类，逐组一行依据）",
         "真回归（若有）已修并回归单测通过",
         "CI visual job conclusion PASS（重生成需 run 记录 + artifact 核对说明）"],
 verify="（本机不可判：Windows）CI visual job / workflow_dispatch visual_update_ref 记录",
 evidence="docs/design/06_validation/evidence/V12/VIS-01/", forbid=["src/contracts/**", "prisma/**", "tests/e2e/**"],
 grade="中", size="中", source="V1.2 00 §4 + 断点文档 visual 分诊")

# ───────────────────────── S3 收口 ─────────────────────────
card(id="V12-REL-01", slice="S3", owner="P1", title="台账收口与交付",
 goal="V1.1 REL-01 与 V1.2 全部 state 收口（done + verify 引用），EXEC 终稿回填，changelog/parity 核对，双端 0 0",
 deps=["V12-E2E-03", "V12-VIS-01"],
 paths=["docs/V1.1-20261024/state.json", "docs/V1.1-20261024/EXEC-round1.md", "docs/design/07_release/changelog.md", "docs/design/02_requirements/parity-matrix.md（如涉）", "docs/design/06_validation/evidence/V12/REL-01/**", "docs/V1.2-20261026/state.json", "docs/V1.2-20261026/EXEC-log.md"],
 steps=["核对 evidence/V11/REL-01 完整（execution + verify + release zip/sha 存在）",
        "V1.1 state REL-01 改 done（注明推送已完成、台账滞后）；V1.2 各卡 state 与 verify 对齐",
        "EXEC-round1.md 终稿回填（含断点恢复段与 UI-02 乱码段修正）；EXEC-log.md 写 V1.2 心跳",
        "changelog 补 V1.2 段；parity 复核（本轮无非实体变更则标注无变化）",
        "git fetch + rev-list 0 0；release zip（docs/V1.2 包）可选打包"],
 accept=["V1.1 & V1.2 state 全部 done/closed（Q2 除外）",
         "EXEC 终稿无 TODO 占位",
         "双端 0 0；changelog 有 V1.2 记录"],
 verify="git fetch && git rev-list --left-right --count origin/upgrade...HEAD",
 evidence="docs/design/06_validation/evidence/V12/REL-01/", forbid=["src/**", "tests/**", "prisma/**"],
 grade="低", size="小", source="V1.2 收口（F6：REL-01 台账未收口）")

# ───────────────────────── S4 待用户 ─────────────────────────
card(id="V12-Q2-01", slice="S4", owner="P2", title="LLM 聊天限频裁决执行（V11-Q2）",
 goal="按用户裁决把 /api/chat/stream 限频锁定为 10 或 20 次/分，契约测试对齐",
 deps=[], paths=["src/app/api/chat/stream/route.ts", "src/app/api/user-actions/route.ts（如涉）", "src/lib/__tests__/**（v12 q2 前缀）", "docs/design/06_validation/evidence/V12/Q2-01/**"],
 steps=["等待用户裁决（保持 10 / 改为 20）",
        "按裁决更新 RATE_LIMIT_PER_MINUTE，同步契约测试断言（若改 20 改测试；保持 10 则登记说明需求文档 20 的口径差异为文档修正项）",
        "限频单测与 apply/e2e 聊天路径回归"],
 accept=["限频常量与契约测试断言一致",
         "用户裁决原文入证据（含保持 10 的说明）"],
 verify="npx vitest run src/lib/__tests__ && npx tsc --noEmit",
 evidence="docs/design/06_validation/evidence/V12/Q2-01/", forbid=["src/contracts/**（若裁决要求改契约则走 CCR 通道）", "prisma/**", "package.json"],
 grade="低", size="小", source="V11-LLM-03 遗留 V11-Q2；状态 blocked 待用户")

# ───────────────────────── 生成 ─────────────────────────
FIELDS = ["归属", "目标", "输入", "输出", "Execution Steps", "验收标准", "验证命令", "证据路径", "允许修改", "禁止修改", "依赖与阻塞", "建议执行档位"]

def grade_line(g):
    return {"高": "高（决策不可逆 + 跨组件：main-agent 聚焦执行，独立 verify）",
            "中": "中（独立验证子代理出 verify）",
            "低": "低（常规验证即可）"}[g]

m = {s: [] for s in ("S0", "S1", "S2", "S3", "S4")}
for c in C:
    m[c["slice"]].append(c)

# 环检测（DAG 简单：仅检查不存在自依赖且 deps 均为已知卡）
known = {c["id"] for c in C}
for c in C:
    for d in c["deps"]:
        assert d in known, f"{c['id']} 依赖未知卡 {d}"
        assert d != c["id"], f"{c['id']} 自依赖"

for c in C:
    steps = "\n".join(f"{i+1}. [ ] {s}" for i, s in enumerate(c["steps"]))
    accept = "\n".join(f"- [ ] {a}" for a in c["accept"])
    deps = "；".join(c["deps"]) if c["deps"] else "无"
    size = c["size"]
    md = f"""# {c['id']}：{c['title']}

## 归属
- 所属切片：{c['slice']}
- 来源需求/证据：{c['source']}
- 执行者：{c['owner']}

## 目标
{c['goal']}

## 输入
- 文档：`docs/V1.2-20261026/00-事实基线.md`、`04-连续执行协议.md`
- 前置任务：{deps}

## 输出
- {'/'.join(c['paths'])}

## Execution Steps
{steps}

## 验收标准
{accept}

## 验证命令
```bash
{c['verify']}
```

## 证据路径
{c['evidence']}（execution.md + 命令原始输出；verify.md 由独立验证者写）

## 允许修改
- {'/'.join(c['paths'])}

## 禁止修改
- {'/'.join(c['forbid'])}

## 依赖与阻塞
- Depends on：{deps}
- 阻塞条件：遇外部条件 → state.json 标 blocked + 原因，转下一张就绪卡

## 建议执行档位
{grade_line(c['grade'])}　规模：{size}

## 升级条件
连续 2 次验收 FAIL → 停止改代码 → 重写任务卡 / 升档 / 标 blocked
"""
    with open(os.path.join(TASKS, c["id"] + ".md"), "w", encoding="utf-8") as f:
        f.write(md)

# steps 每切片一页
for sid, cards in m.items():
    lines = [f"# STEP {sid}"]
    for c in cards:
        lines += [
            "", f"## {c['id']} {c['title']}（{c['owner']}，{c['size']}）",
            f"目标：{c['goal']}",
            f"步骤：{c['steps'][0] if c['steps'] else ''}；…（详见 tasks/{c['id']}.md）",
            f"验收：{c['accept'][0] if c['accept'] else ''}",
        ]
    with open(os.path.join(STEPS, f"STEP-{sid}.md"), "w", encoding="utf-8") as f:
        f.write("\n".join(lines))

print(f"生成 {len(C)} 张卡：{', '.join(c['id'] for c in C)}")
print("环检测：PASS")