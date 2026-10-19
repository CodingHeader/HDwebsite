# -*- coding: utf-8 -*-
"""V0.7 任务卡生成器：单一数据源 -> tasks/*.md + 05-任务索引.md + 机械校验（无环/所有权重叠）。
运行：python3 docs/V0.7-20261019/gen_tasks.py"""
import os, itertools, fnmatch, json, re
D = os.path.dirname(os.path.abspath(__file__))
GATE = "npm run lint && npm run typecheck && npm test && npm run build"
FORBID_COMMON = ["src/app/(web)/**、src/components/web/**、public/**（前台风格冻结，REQ-F-014）",
                 "prisma/schema.prisma、prisma/migrations/**（V0.7 不开新迁移，见 04 号文档）",
                 ".env*、prisma/*.db、任何凭据文件"]

T = []
def t(id, name, slice_, req, goal, inp, out, steps, acc, cmd, allow, forbid, dep, tier, why, up, size, owner, contract="无变更（只读引用 src/contracts/**）", assume="无"):
    T.append(dict(id=id, name=name, slice=slice_, req=req, goal=goal, inp=inp, out=out, steps=steps, acc=acc,
                  cmd=cmd, allow=allow, forbid=forbid, dep=dep, tier=tier, why=why, up=up, size=size,
                  owner=owner, contract=contract, assume=assume))

# ---------------- S0 安全热修（Hark 自做，核心+高难） ----------------
t("V7-SEC-01", "角色写入越权收口（roles POST/PUT）", "S0", "REQ-NF 安全；V0.4/V0.6 遗留 E1/E2",
  "非超管调用 POST/PUT /api/roles 时：不能设置 isSuper=true、不能授予自身没有的权限、不能修改自己所属角色；违规一律 403 FORBIDDEN",
  ["证据：src/app/api/roles/[id]/route.ts:38-49（PUT 未校验 isSuper 与 permissions 子集）；roles/route.ts:49（POST 只校验 isSuper）",
   "契约：src/contracts/auth.ts permissionCatalog；src/contracts/common.ts 错误码 FORBIDDEN=403"],
  ["src/app/api/roles/route.ts", "src/app/api/roles/[id]/route.ts", "src/lib/authz/escalation.ts（新增纯函数 canGrant / assertNoEscalation）",
   "src/lib/__tests__/security/roles-escalation.test.ts"],
  ["先写失败用例：非超管 PUT 自身角色 isSuper=true / 授予 user:delete（自身无）/ POST 新角色带越权权限 → 期望 403",
   "实现 escalation.ts：permissions ⊆ caller.permissions（超管跳过）；isSuper 变更仅超管；目标角色 = 调用者当前角色 → 403",
   "两个路由在写库前调用；错误体沿用 common.ts 信封",
   "跑用例转绿 + 通用门禁；写证据"],
  ["roles-escalation.test.ts ≥6 用例全绿（含超管正常路径不回归）",
   "grep 确认 roles/[id]/route.ts 的 update 前存在 assertNoEscalation 调用",
   "通用门禁 exit 0"],
  [GATE, "npx vitest run src/lib/__tests__/security"],
  ["src/app/api/roles/**", "src/lib/authz/**", "src/lib/__tests__/security/roles-*"],
  FORBID_COMMON + ["src/contracts/**"], [], "opus", "安全边界语义，不可逆影响权限模型", "连续 2 次独立验收 FAIL → fable 复核权限模型", "中（约半天）", "Hark")

t("V7-SEC-02", "用户写入越权收口（users POST/PUT/DELETE）", "S0", "REQ-NF 安全；E3/E4/E5",
  "非超管不能：把用户（含自己）分配到超管角色或权限超出自己的角色；修改/重置超管账号；修改自己的 roleId；最后一名超管不能被改离超管角色",
  ["证据：src/app/api/users/route.ts:44-62（POST 直接写 roleId）；users/[id]/route.ts:36-50（PUT 只保护'停用最后超管'，roleId 与密码重置无校验）"],
  ["src/app/api/users/route.ts", "src/app/api/users/[id]/route.ts", "src/lib/__tests__/security/users-escalation.test.ts"],
  ["先写失败用例（≥8）：非超管 POST roleId=超管角色；PUT 自己 roleId；PUT 超管密码；PUT 最后超管 roleId→普通",
   "复用 V7-SEC-01 的 escalation.ts（只读引用，不改其签名）",
   "实现并转绿；门禁；证据"],
  ["users-escalation.test.ts ≥8 用例全绿", "超管正常建用户/改角色路径不回归（auth-permission.test.ts 全绿）", "通用门禁 exit 0"],
  [GATE, "npx vitest run src/lib/__tests__/security"],
  ["src/app/api/users/**", "src/lib/__tests__/security/users-*"],
  FORBID_COMMON + ["src/lib/authz/**（SEC-01 所有）", "src/contracts/**"], ["V7-SEC-01"], "opus", "账号接管级风险", "同上", "中", "Hark")

t("V7-SEC-03", "越权回归黑盒套件（独立编写，防自证）", "S0", "§9.3 防自证；E1~E5",
  "由非 SEC-01/02 执行者按本卡 5 条攻击路径独立写 HTTP 级用例，对 SEC 修复后的代码全部返回 403/400",
  ["本卡攻击路径清单 E1~E5（见 01-事实基线 §3）", "tests/contract 现有 harness"],
  ["src/lib/__tests__/security/escalation-blackbox.test.ts"],
  ["只读 diff 与契约，不读 SEC 实现细节", "每条路径一个用例 + 1 个超管正向用例", "运行并输出 PASS/FAIL"],
  ["5 条攻击用例全部被拒；正向用例通过", "不修改任何 src/app/** 文件"],
  ["npx vitest run src/lib/__tests__/security/escalation-blackbox.test.ts"],
  ["src/lib/__tests__/security/escalation-blackbox*"], FORBID_COMMON + ["src/app/**", "src/lib/authz/**"],
  ["V7-SEC-02"], "sonnect", "按清单写用例，无决策", "发现第 6 条路径 → 停，上报 Hark", "小（<半天）", "P2")

# ---------------- S1 测试卫生 ----------------
t("V7-T-01", "测试隔离：kb-coze 不再依赖 prisma/dev.db；docx 用例超时修复", "S1", "§9.2 自动测试可复现",
  "在未迁移/无 .env 的干净 Linux 检出上 npm test 599/599 通过",
  ["证据：evidence/V0.7-4cbd9c1-门禁.log（kb-coze 报 no such column Knowledge.baseId；kb-api docx 5s 超时，30s 下通过）", "src/lib/prisma.ts:18 默认 file:./prisma/dev.db"],
  ["src/lib/__tests__/lane-c/kb-coze.test.ts", "src/lib/__tests__/lane-c/kb-api.test.ts"],
  ["kb-coze 改用已有临时库夹具（与 kb-api 同款 createTestDb/迁移副本），或 vi.mock prisma",
   "docx 用例单独 testTimeout 20000 并预热 mammoth import（不改全局 vitest.config.ts）",
   "在 rm -f prisma/dev.db 后跑 npm test 验证"],
  ["干净检出 + 无 dev.db：npm test 全绿", "不改 vitest.config.ts、不改业务代码"],
  ["git stash -u; mv prisma/dev.db /tmp/ 2>/dev/null; npm test; mv /tmp/dev.db prisma/ 2>/dev/null"],
  ["src/lib/__tests__/lane-c/kb-coze.test.ts", "src/lib/__tests__/lane-c/kb-api.test.ts"], FORBID_COMMON + ["vitest.config.ts", "src/lib/**（非 __tests__）"],
  [], "sonnect", "局部测试改造", "需要改 vitest.config.ts → 写 CCR 停止", "小（<2h，已与 docx 修复合并成一张）", "P2")

# ---------------- S2 独立验收补齐 ----------------
for lane, cards, who, vdirs in [("A", "A-01~A-08", "P2", ["W1-A"]), ("C", "C-01~C-12", "P1", ["W1-C"]), ("E", "E-01~E-12", "P2", ["W1-E/E-0[1-7]", "W1-E/E-09", "W1-E/E-1*"]), ("BD", "B-01、D-01、D-02", "P2", ["W1-B/B-01", "W1-D/D-01", "W1-D/D-02"])]:
    t(f"V7-V-{lane}", f"W1-{lane} 线独立验收补登（{cards}）", "S2", "§9.3 防自证；AGENTS.md §6",
      f"对 {cards} 逐卡只看 diff + 运行结果给出 PASS/FAIL/UNKNOWN，写 <卡号>-verify.md",
      ["证据：34 张 W1 卡中仅 A-07、C-09 有独立验证记录（evidence/W1-*/ 下 grep '独立验证'）", "各卡验收标准：docs/V0.6-20261016/tasks/<卡号>.md"],
      [f"docs/design/06_validation/evidence/W1-*/<卡号>/<卡号>-verify.md"],
      ["git log --grep '<卡号>' 定位提交，git show --stat 核对允许路径", "逐条执行原卡验收命令（e2e/visual 需 Linux+浏览器，否则 UNKNOWN 并写原因）", "只输出 PASS/FAIL/UNKNOWN + 一行理由；FAIL 开返工卡 V7-RW-<卡号>，不自己修"],
      ["每张卡都有 verify.md", "验证者不是该卡原执行者（commit author/提示词归属核对）", "不改任何 src/**"],
      ["npx vitest run", "npm run test:e2e  # Linux"],
      [f"docs/design/06_validation/evidence/{v}/*-verify.md" if "/" in v else f"docs/design/06_validation/evidence/{v}/*/*-verify.md" for v in vdirs], ["src/**", "tests/**", "prisma/**"],
      ["V7-T-01"] if lane != "BD" else ["V7-T-01", "V7-V-A"], "sonnect" if lane != "E" else "opus", "按清单判定；E 线含 UI 体验判断用 opus" if lane == "E" else "按清单判定",
      "同一卡 2 次 UNKNOWN 因环境 → 交 V7-OPS-CI 环境后重跑", "中", who)

# ---------------- S3 B 线剩余（承接 V0.6 卡，前提重校准） ----------------
carry = [
 ("B-02", "S3", ["V7-SEC-02"], "P1", "sonnect", "users/roles 两组路由与 SEC 卡同文件：必须在 SEC-02 合入后开工（所有权串行）"),
 ("B-03", "S3", ["B-02"], "P1", "sonnect", "实测仍未包装：apply、articles、auth×4、route.ts 根；非 JSON 例外：file、upload、health、wechat/callback"),
 ("B-04", "S3", ["B-03"], "P1", "sonnect", "无漂移"),
 ("B-05", "S3", ["B-04"], "P1", "opus", "src/lib/publish 不存在（实测），注册表从零建；涉及发布语义"),
 ("B-06", "S3", ["B-04"], "P1", "sonnect", "实测 src/lib 无 quietHours 生效逻辑；E-02 页面已能配置，后端未消费"),
 ("B-07", "S3", ["B-05"], "P1", "opus", "实测 src/lib 无 uploadimg；依赖 B-05 注册表"),
 ("D-03", "S4", [], "P3", "sonnect", "src/lib/env.ts 不存在"),
 ("D-04", "S4", ["D-03"], "P3", "sonnect", "无漂移"),
 ("D-05", "S4", ["D-04"], "P3", "haiku", "仅字面量替换"),
 ("D-06", "S4", ["D-04"], "P3", "opus", "(web) 仍 force-dynamic（about/apply/campus 等），无 unstable_cache；动前台缓存但不改像素，visual 必跑"),
 ("D-07", "S4", [], "P3", "sonnect", "无漂移"),
 ("D-08", "S4", ["D-03"], "P3", "sonnect", "Dockerfile/compose/CLAUDE.md 均不存在；K9-4 未裁决：只作开发/备选部署件"),
 ("D-09", "S4", ["D-03"], "P3", "opus", "storage.ts 存在但只有注释占位（第 5 行），DATA_DIR 未实现；影响上传/备份路径"),
 ("D-10", "S4", ["D-09"], "P3", "sonnect", "无漂移"),
 ("D-11", "S4", ["D-09"], "P3", "sonnect", "orphan 扫描脚本不存在"),
 ("D-12", "S4", ["D-09"], "P3", "sonnect", "src/lib/collect/parsers 不存在"),
 ("D-13", "S4", ["V7-T-01"], "P3", "sonnect", ".github/workflows 不存在；分支触发改为仅 upgrade（lane 已废止，2026-10-17 用户指令）"),
 ("D-14", "S4", ["D-08", "D-10"], "P3", "sonnect", "docs/deploy 不存在"),
 ("D-15", "S4", [], "P3", "haiku", "实测无 application/ld+json"),
 ("W2-02", "S5", ["B-03"], "P1", "sonnect", "tests/contract 已存在，需覆盖 119 个路由"),
 ("W2-03", "S5", [], "P2", "opus", "实测 npm audit --omit=dev：critical 1 / high 6 / moderate 3（与 V0.6 的 3/11 不同，以本次为准）"),
 ("W2-04", "S5", ["D-06", "W2-03", "V7-UI-01"], "P3", "sonnect", "before.json 在 evidence/W1-D/"),
 ("W2-05", "S5", ["V7-SEC-03", "B-07", "D-12", "V7-UI-02", "V7-UI-01"], "Hark", "opus", "Linux 全量 e2e + visual 46/46"),
 ("W2-06", "S5", ["W2-05", "V7-V-A", "V7-V-C", "V7-V-E", "V7-V-BD"], "Hark", "opus", "MUST 逐条终态"),
 ("W2-08", "S5", ["W2-02", "V7-T-01", "V7-SEC-03", "D-15", "D-12", "D-11", "D-10", "D-14", "D-07", "D-06"], "P1", "sonnect", "src/lib/__tests__/** 全目录所有权 → 必须排在所有写测试的卡之后（机械串行）"),
 ("W2-09", "S5", ["W2-03"], "P3", "haiku", ".tmp-pa.html 仍在根目录；check-assets/check-root 脚本不存在"),
 ("W2-07", "S5", ["W2-06", "W2-08", "W2-09", "W2-04", "D-14", "V7-V-A", "V7-V-C", "V7-V-E", "V7-V-BD"], "Hark", "opus", "W2-01 已由 4cbd9c1 完成（集成+分支收敛），本卡只剩终审→推送→打包"),
]
CARRY = {c[0]: c for c in carry}

# ---------------- S6 UI 核心（Hark 自做） ----------------
t("V7-UI-01", "发布中枢 UI 对接 PublishChannel 结果（渠道级状态/重试/外链）", "S6", "REQ-F-015 管理端顶级体验；B-05/B-07",
  "E-09 内容中枢在 B-05 注册表落地后展示每个渠道的真实结果（成功外链/失败原因/可重试），五态齐全",
  ["src/app/manager/**/content-items（E-09 产物）", "B-05 输出的 publish 结果 DTO（src/contracts/content-hub.ts，已冻结字段）"],
  ["src/app/manager/content-items/**", "src/components/manager/publish/**", "tests/e2e/e-content-hub.spec.ts"],
  ["以契约字段写 UI 适配层（不新增 DTO）", "渠道行：状态 Badge + 外链 + 重试按钮（幂等键沿用契约）", "空/加载/错误/无权限/成功五态", "375/768/1440 无溢出；a11y serious=0"],
  ["e-content-hub.spec.ts 新增重试/失败态用例通过（Linux）", "a11y 扫描该页 serious/critical=0", "通用门禁 exit 0"],
  [GATE, "npm run test:e2e -- e-content-hub"],
  ["src/app/manager/content-items/**", "src/components/manager/publish/**", "tests/e2e/e-content-hub.spec.ts"],
  FORBID_COMMON + ["src/components/manager/ui/**（A 线基础件，只读）", "src/contracts/**"], ["B-07"], "opus", "核心 UI + 跨线集成", "契约字段不足 → CCR 停", "中", "Hark")

t("V7-UI-02", "管理端 Linux 实机 e2e/visual 回归 + E-08 证据补登", "S6", "AGENTS.md §7；W2 记录 §6 UNKNOWN",
  "在 Linux（Docker/CI）对 HEAD 跑 test:e2e 全量与 test:visual 46/46，补 evidence/W1-E/E-08/",
  ["W2 记录 §6：e2e/visual 自 Wave 2 后未跑", "evidence/W1-E 缺 E-08 目录（实测）"],
  ["docs/design/06_validation/evidence/W1-E/E-08/**", "docs/design/06_validation/evidence/V7/V7-UI-02/**"],
  ["npx playwright install chromium（CI 或 Docker）", "跑 e2e + visual，失败逐条归因到卡号", "失败只开返工卡，不在本卡改业务代码"],
  ["e2e 结果与 visual 46/46（或失败集 ⊆ {courses@375} 已登记偏差）写入证据，附 git rev-parse HEAD"],
  ["npm run test:e2e && npm run test:visual"],
  ["docs/design/06_validation/evidence/W1-E/E-08/**", "docs/design/06_validation/evidence/V7/V7-UI-02/**"], ["src/**"],
  ["V7-SEC-02", "V7-T-01"], "opus", "UI 体验最终判断属 Hark", "浏览器环境 2 次起不来 → 等 D-13 CI", "中", "Hark")

t("V7-G-01", "AGENTS.md 与入口文档对齐单主线（lane 废止）", "S1", "2026-10-17 用户指令：只保留 main+upgrade",
  "AGENTS.md §4/§5/§8 不再引用 lane 分支与 V0.6 入口，改指 docs/V0.7-20261019/README.md；推送规则改为'upgrade 单主线 + 每卡独立验收后推送'",
  ["证据：AGENTS.md §4 仍写五条 lane 并行；4cbd9c1 记录'不再新建 lane 分支'"],
  ["AGENTS.md"], ["只替换 §4 编排段、§5 推送规则、§8 证据分桶（W1-* 保留，新增 V7/）", "不改 §2/§3/§6"],
  ["grep -c 'lane/' AGENTS.md = 0（历史引用除外需注明'已废止'）", "入口指向 V0.7"],
  ["grep -n 'lane/\\|V0.7' AGENTS.md"], ["AGENTS.md"], ["src/**", "docs/V0.*/**"], [], "haiku", "文本替换", "涉及规则语义变化 → opus", "小", "P3")

# ---------------- 输出 ----------------
def carry_card(cid, slice_, dep, owner, tier, note):
    src = os.path.join(D, "..", "V0.6-20261016", "tasks", f"{cid}.md")
    body = open(src, encoding="utf-8").read()
    body = body.replace("lane/b-api-platform", "upgrade").replace("lane/d-ops", "upgrade")
    body = re.sub(r"docs/design/06_validation/evidence/W1-[BD]/\*\*", f"docs/design/06_validation/evidence/V7/{cid}/**", body)
    body = body.replace("docs/design/06_validation/evidence/W2/**", f"docs/design/06_validation/evidence/V7/{cid}/**")
    if cid == "W2-06":
        body = body.replace("## 允许修改\n- docs/design/**", "## 允许修改\n- docs/design/02_requirements/parity-matrix.md\n- docs/design/04_planning/current-plan.md\n- docs/design/04_planning/roadmap.md\n- docs/design/CHANGELOG.md\n- docs/design/06_validation/evidence/V7/W2-06/**")
    body = re.sub(r"docs/design/06_validation/evidence/W1-[BD]/"+cid+r"/", f"docs/design/06_validation/evidence/V7/{cid}/", body)
    head = (f"> **V0.7 重校准（2026-10-19，HEAD 4cbd9c1）**：所属切片 {slice_}；执行者 {owner}；建议档位 {tier}；"
            f"V0.7 依赖：{', '.join(dep) or '无'}。\n> 实测前提：{note}。\n> 分支：lane 已废止，直接在 `upgrade` 上小提交；"
            f"开工前 `git pull --ff-only`；证据目录改为 `docs/design/06_validation/evidence/V7/{cid}/`。\n\n")
    if cid == "D-13":
        body = body.replace("- [ ] workflow 中不出现任何真实密钥或 .env 内容", "- [ ] workflow 中不出现任何真实密钥或 .env 内容\n- [ ] （V0.7 追加）workflow 含密钥扫描步骤：`git grep -nE '(sk-[A-Za-z0-9]{20,}|ghp_[A-Za-z0-9]{30,}|github_pat_|AKIA[0-9A-Z]{16})' -- ':!docs/**'`（排除规划文档自身的正则示例） 有输出即失败；不新增依赖")
    lines = body.split("\n", 1)
    return lines[0] + "\n\n" + head + lines[1]

def card_md(c):
    L = [f"# {c['id']}：{c['name']}", "", f"> V0.7 新卡　执行者：{c['owner']}　分支：`upgrade`（单主线）　HEAD 基线 4cbd9c1", "",
         "## 归属", f"- 所属切片：{c['slice']}", f"- 来源需求：{c['req']}", "- 来源方案：docs/V0.7-20261019/06-剩余可执行大纲体系.md", "",
         "## 目标", c['goal'], "", "## 输入"] + [f"- {x}" for x in c['inp']] + [f"- 契约：{c['contract']}", f"- 前置任务：{', '.join(c['dep']) or '无'}", f"- 假设：{c['assume']}", "",
         "## 输出（新增/修改）"] + [f"- {x}" for x in c['out']] + ["", "## Execution Steps"] + [f"{i+1}. [ ] {s}" for i, s in enumerate(c['steps'])] + \
        [f"{len(c['steps'])+1}. [ ] 提交 `feat|fix|docs({c['id']}): <摘要>`，只含允许路径；写证据", "", "## 验收标准"] + [f"- [ ] {a}" for a in c['acc']] + \
        ["- [ ] 本卡提交触及文件 ⊆ 允许修改（`git diff --name-only <起点>..HEAD`）", "", "## 验证命令", "```bash"] + c['cmd'] + ["```", "",
         "## 证据路径", f"`docs/design/06_validation/evidence/V7/{c['id']}/`", "", "## 允许修改"] + [f"- {x}" for x in c['allow']] + ["", "## 禁止修改"] + [f"- {x}" for x in c['forbid']] + \
        ["", "## 依赖与阻塞", f"- Depends on：{', '.join(c['dep']) or '无'}", f"- Blocks：{', '.join(c.get('blocks', [])) or '无'}", "- 阻塞条件：需要改冻结面（contracts/schema/依赖/测试配置）→ 停止并提交 CCR", "",
         "## 建议执行档位", f"{c['tier']}　理由：{c['why']}", "", "## 升级条件", c['up'] + "；同一卡连续 2 次验收失败 → 熔断，禁止第 3 次硬撞", "", "## 预估规模", c['size'], ""]
    return "\n".join(L)

nodes = {c['id']: c['dep'] for c in T}
for cid, s, dep, o, tier, note in carry: nodes[cid] = dep
# blocks
blocks = {k: [] for k in nodes}
for k, ds in nodes.items():
    for d in ds:
        blocks.setdefault(d, []).append(k)
for c in T: c['blocks'] = blocks.get(c['id'], [])
# cycle check / topo
indeg = {k: 0 for k in nodes}
for k, ds in nodes.items():
    for d in ds:
        assert d in nodes, f"{k} 依赖未知 {d}"
        indeg[k] += 1
order, q = [], [k for k, v in indeg.items() if v == 0]
while q:
    n = q.pop(0); order.append(n)
    for b in blocks.get(n, []):
        indeg[b] -= 1
        if indeg[b] == 0: q.append(b)
assert len(order) == len(nodes), "存在环"
for c in T:
    open(os.path.join(D, "tasks", c['id'] + ".md"), "w", encoding="utf-8").write(card_md(c))
for cid, s, dep, o, tier, note in carry:
    open(os.path.join(D, "tasks", cid + ".md"), "w", encoding="utf-8").write(carry_card(cid, s, dep, o, tier, note))
# critical path by size weight
W = {"小": 0.5, "中": 1.0, "大": 2.0}
def w(k):
    c = next((x for x in T if x['id'] == k), None)
    return W.get(c['size'][0], 1.0) if c else 1.0
dist, prev = {}, {}
for n in order:
    best = max([(dist[d], d) for d in nodes[n]], default=(0, None))
    dist[n] = best[0] + w(n); prev[n] = best[1]
end = max(dist, key=dist.get); path = []
while end: path.append(end); end = prev[end]
path.reverse()
meta = dict(n=len(nodes), new=len(T), carry=len(carry), topo=order, critical=path, critical_days=max(dist.values()))
json.dump(meta, open(os.path.join(D, "evidence", "gen-check.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
# index
rows = []
for k in order:
    c = next((x for x in T if x['id'] == k), None)
    if c: rows.append(f"| {k} | {c['name']} | {c['slice']} | {c['owner']} | {c['tier']} | {', '.join(c['dep']) or '—'} | 待开工 |")
    else:
        cid, s, dep, o, tier, note = CARRY[k]
        title = open(os.path.join(D, "tasks", k + ".md"), encoding="utf-8").readline().strip("# \n").split("：", 1)[-1][:40]
        rows.append(f"| {k} | {title} | {s} | {o} | {tier} | {', '.join(dep) or '—'} | 承接 V0.6·待开工 |")
idx = ["# 05 · V0.7 任务索引（拓扑序，生成自 gen_tasks.py）", "", f"共 {len(nodes)} 张：新卡 {len(T)}，承接 V0.6 {len(carry)}；无环（拓扑排序成功）；关键路径 {' → '.join(path)}（权重和 {max(dist.values())} 人天，小=0.5/中=1/承接卡按 1 计）。", "",
       "已完成且不再出现在本索引：W0-01~W0-13、W0-R0、A-01~A-08、B-01、C-01~C-12、D-01、D-02、E-01~E-12、W2-01（以 4cbd9c1 为准；但除 A-07、C-09 外均**缺独立验收**，由 V7-V-* 补登，补登 FAIL 则重开）。", "",
       "| 卡号 | 名称 | 切片 | 执行者 | 档位 | 依赖 | 状态 |", "|---|---|---|---|---|---|---|"] + rows
open(os.path.join(D, "05-任务索引.md"), "w", encoding="utf-8").write("\n".join(idx) + "\n")
# ownership overlap check（同一时间可并行的写入路径）
own = {c['id']: c['allow'] for c in T}
for cid, *_ in carry:
    body = open(os.path.join(D, "tasks", cid + ".md"), encoding="utf-8").read()
    sec = body.split("## 允许修改", 1)[1].split("##", 1)[0]
    own[cid] = [l.strip("- ").strip() for l in sec.strip().splitlines() if l.strip().startswith("-")]
def anc(a):
    s, st = set(), list(nodes[a])
    while st:
        x = st.pop()
        if x not in s: s.add(x); st.extend(nodes[x])
    return s
A = {k: anc(k) for k in nodes}
OWN = {c['id']: c['owner'] for c in T}
OWN.update({c[0]: c[3] for c in carry})
conf = []
for a, b in itertools.combinations(nodes, 2):
    if a in A[b] or b in A[a]: continue  # 串行，不算重叠
    if OWN[a] == OWN[b]: continue  # 同一执行者按拓扑序串行执行自己的队列（规则 R-SERIAL）
    for pa in own[a]:
        for pb in own[b]:
            x, y = pa.split("（")[0].split("**")[0].rstrip("/*"), pb.split("（")[0].split("**")[0].rstrip("/*")
            if x and y and (x.startswith(y) or y.startswith(x)):
                conf.append((a, b, pa, pb))
json.dump(conf, open(os.path.join(D, "evidence", "ownership-overlap.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print(json.dumps(dict(n=len(nodes), critical=path, days=max(dist.values()), overlaps=len(conf)), ensure_ascii=False))
for c in conf[:40]: print(c)
