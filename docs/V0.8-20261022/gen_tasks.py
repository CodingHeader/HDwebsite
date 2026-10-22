#!/usr/bin/env python3
"""V0.8 任务卡唯一源：生成 tasks/*.md、evidence/dag.json，并做环检测 + 所有权重叠检测。"""
import json, os, itertools, fnmatch
H = os.path.dirname(os.path.abspath(__file__))
G = "npm run lint && npm run typecheck && npm test && npm run build && npm run check:assets && npm run check:root"
FROZEN = ["src/contracts/**", "prisma/schema.prisma", "prisma/migrations/**"]
# id, 名称, 切片, 来源, 目标, 执行者, 档位, 规模天, deps, 允许修改, 步骤, 验收, 验证命令, 升级条件, 阻塞条件, 额外禁止
T = [
("V8-G-01","入口对齐 V0.8 + 连续执行协议落地","S0","AGENTS.md §读取顺序；V0.7 EXEC-round3 §9","AGENTS.md/CLAUDE.md 入口指向 V0.8 README 与 04-连续执行协议，state.json 可被执行者读写","P3","haiku",0.25,[],
 ["AGENTS.md","CLAUDE.md","docs/design/04_planning/current-plan.md"],
 ["AGENTS.md 读取顺序把 V0.7 换成 V0.8，并加一行『执行者按 docs/V0.8-20261022/04-连续执行协议.md 循环取卡』","CLAUDE.md 与 AGENTS.md 冲突段落删除，只保留指向 AGENTS.md 的一句","current-plan.md 顶部追加『2026-10-22 V0.8 入口』小节（3 行）"],
 ["grep -c 'V0.8-20261022' AGENTS.md ≥ 1","CLAUDE.md 不再含与 AGENTS.md 不同的分支/端口规则","门禁全绿"],
 "grep -n 'V0.8-20261022' AGENTS.md CLAUDE.md docs/design/04_planning/current-plan.md && "+G,"发现 AGENTS.md 规则与 V0.8 冲突需改语义","无",[]),
("V8-SEC-01","K10-A：next 16.2.1→16.4.2（含 eslint-config-next 同步）","S1","K10；W2-03；用户转述 audit：next 需 16.4.2","官方源 audit 中 next 相关 critical 清零，门禁与 e2e 全绿","Hark","opus",1.0,["V8-G-01"],
 ["package.json","package-lock.json","next.config.ts","src/app/layout.tsx","docs/design/06_validation/evidence/V8/SEC-01/**"],
 ["前置：读取 08-风险与待裁决 中 V8-Q1，未授权则本卡标 BLOCKED 并跳到下一张就绪卡（不等待）","npm i next@16.4.2 eslint-config-next@16.4.2 --registry=https://registry.npmjs.org","按 next 16.3/16.4 变更说明逐条核对 next.config.ts、middleware/proxy、unstable_cache 用法；只做编译/运行所需的最小改动","跑门禁 + test:e2e；对比升级前后 /manager/articles JS gzip 与首页热 TTFB（W2-04 口径）","证据：audit 前后 json、门禁日志、两项指标"],
 ["npm audit --omit=dev --registry=https://registry.npmjs.org 中 next 0 critical","门禁全绿","test:e2e 通过数 ≥ 升级前","/manager/articles JS gzip 不高于 372,724 B 的 105%","CHANGELOG 记一行"],
 "npm audit --omit=dev --registry=https://registry.npmjs.org; "+G+" && npm run test:e2e","需要改动 src/contracts 或迁移；或 e2e 新增失败 ≥3 条","V8-Q1 未授权",[]),
("V8-SEC-02","K10-A：sharp 0.34→0.35.5 + 运行时依赖其余 high 收口","S1","K10；用户转述 audit","运行时依赖（--omit=dev）high 清零或逐条登记不可修原因","P1","sonnect",0.5,["V8-SEC-01"],
 ["package.json","package-lock.json","src/lib/storage/**","docs/design/06_validation/evidence/V8/SEC-02/**"],
 ["前置同 V8-SEC-01（V8-Q1）","npm i sharp@0.35.5 --registry=https://registry.npmjs.org","跑图片相关单测（upload/collect/media）并手测 1 张 PNG、1 张 JPEG 上传后 Content-Type 与缩略","逐条处理 audit --omit=dev 剩余 high：可升则升（不跨 major 的直接升），跨 major 的登记到证据 residual.md"],
 ["audit --omit=dev high=0 或 residual.md 逐条给出原因与上游 issue","上传 PNG 返回 image/png","门禁全绿"],
 "npm audit --omit=dev --registry=https://registry.npmjs.org --json | node -e \"const a=JSON.parse(require('fs').readFileSync(0));console.log(a.metadata.vulnerabilities)\"; "+G,"sharp 0.35 在 Linux/Windows 任一平台装不上","V8-Q1 未授权",[]),
("V8-SEC-03","K10-A：vitest 3→5（含 tinypool）开发依赖升级","S1","K10；用户转述 audit：vitest+tinypool 需 5.0.5","全量依赖 audit critical=0，测试数不少于升级前","P2","opus",1.0,["V8-SEC-02"],
 ["package.json","package-lock.json","vitest.config.ts","docs/design/06_validation/evidence/V8/SEC-03/**"],
 ["前置同 V8-SEC-01（V8-Q1）；vitest.config.ts 属冻结面，本卡即 CCR，须在证据写 ccr.md","记录升级前 npm test 通过数 N0","npm i -D vitest@^5 @vitest/*@^5 --registry=https://registry.npmjs.org","按 vitest 4/5 迁移说明改 config（pool/environment 写法），不得改任何测试断言","跑 npm test 两次 + --sequence.shuffle 一次"],
 ["npm audit --registry=https://registry.npmjs.org critical=0","npm test 通过数 ≥ N0 且无新增 skip","shuffle 结果一致","ccr.md 存在"],
 "npm audit --registry=https://registry.npmjs.org; npm test && npx vitest run --sequence.shuffle && "+G,"需要改测试断言才能通过（说明行为变化，升 opus 复审）","V8-Q1 未授权",[]),
("V8-SEC-04","CI 安全审计门禁（官方源，防镜像假阴性）","S1","用户转述：npmmirror audit 404 被解析为 0 漏洞","CI 中 audit 显式走官方源，404/网络错误判失败而非通过","P3","sonnect",0.5,["V8-G-01"],
 [".github/workflows/**","scripts/audit-gate.mjs","docs/design/06_validation/evidence/V8/SEC-04/**"],
 ["新增 scripts/audit-gate.mjs：执行 npm audit --json --registry=https://registry.npmjs.org；stderr 含 404/ENOTFOUND 或 json 无 metadata → exit 2；critical>0 → exit 1；high>0 只告警","CI 加一步运行它（V8-Q1 未授权时 critical 允许列表读 scripts/audit-allow.json，空表=严格）","负向验证：用 --registry=https://registry.npmmirror.com 跑一次，必须 exit 2"],
 ["官方源运行输出 vulnerabilities 计数","镜像源运行 exit=2（证据日志）","workflow yaml 语法通过（actionlint 或 CI 实跑）"],
 "node scripts/audit-gate.mjs; echo exit=$?; NPM_CONFIG_REGISTRY=https://registry.npmmirror.com node scripts/audit-gate.mjs; echo mirror_exit=$?","无","无",[]),
("V8-T-01","撤除 3 条过期 e2e skip（C-06/B-06 已关闭）","S2","tests/e2e/e-knowledge.spec.ts:12,18；e-notify-rules.spec.ts:46","3 条用例恢复执行并通过","P2","sonnect",0.5,["V8-G-01"],
 ["tests/e2e/e-knowledge.spec.ts","tests/e2e/e-notify-rules.spec.ts","tests/e2e/fixtures/**","docs/design/06_validation/evidence/V8/T-01/**"],
 ["去掉 3 处 test.skip，按 C-06（.md 白名单、.pdf 拦截文案）与 B-06（quietHours PATCH 合并）真实契约修正断言","media 为空时的条件 skip（e-components:48）改为用例内自建 1 条素材","跑 test:e2e 两次"],
 ["grep -c 'test.skip(\"' tests/e2e/e-knowledge.spec.ts tests/e2e/e-notify-rules.spec.ts = 0","3 条用例 PASS（两次）","e-components 不再条件跳过"],
 "grep -n 'test.skip' tests/e2e/*.ts; npm run test:e2e -- e-knowledge e-notify-rules e-components","用例失败且根因在业务代码 → 登记缺陷交 Hark，不改业务代码","无",["src/**"]),
("V8-T-02","/chat/stream SSE 契约测试（清零最后 1 条契约 skip）","S2","用户转述：skip 仅剩 1 条 /chat/stream","契约套件 skip=0，SSE 首帧/错误帧/中断三场景有用例","P2","opus",0.75,["V8-G-01"],
 ["tests/contract/**","docs/design/06_validation/evidence/V8/T-02/**"],
 ["读 src/app/api/chat/stream/route.ts 与 src/contracts 中 chat 流事件定义","用 mock LLM provider（不出网）构造：正常 3 帧+done、provider 抛错→error 帧、客户端 abort→服务端停止写","删除该 skip"],
 ["npx vitest run tests/contract 无 skipped","3 场景各 ≥1 用例","默认与 shuffle 结果一致"],
 "npx vitest run tests/contract && npx vitest run tests/contract --sequence.shuffle","发现 SSE 实现与契约不符 → 登记缺陷交 Hark","无",["src/**"]),
("V8-T-03","lint warning 清零并设 --max-warnings 0","S2","本轮实测 54 warnings（838bb43；V0.7 时 36，上升 18）","npm run lint 0 error 0 warning，且脚本带 --max-warnings 0","P3","haiku",0.5,["V8-SEC-03","V8-T-04","V8-PERF-01","V8-UI-01","V8-VIS-03"],
 ["eslint.config.mjs","package.json#scripts.lint","src/**/*.ts","src/**/*.tsx"],
 ["npm run lint 导出 warning 清单","只做无行为变化的修正（未用变量、依赖数组补全需逐条确认不改语义；不确定的加带理由的 eslint-disable-next-line）","scripts.lint 加 --max-warnings 0"],
 ["npm run lint exit 0 且输出无 warning","门禁全绿","diff 中无业务逻辑变化（独立验证者抽查）"],
 G,"某条 warning 修正需要改行为","排在所有改 src 的卡之后（next 升级改变规则集；且 src/** 写权限与其他卡相交，只能串行收尾）",FROZEN),
("V8-T-04","非 withApi 路由 5 条核查：迁移或登记豁免","S2","实测 119 路由中 5 条未经 withApi/crud：upload、file/[...path]、wechat/callback、health、api 根","5 条路由逐条有结论：已迁移，或在 ADR 中写明豁免理由与等效防护","P1","opus",0.5,["V8-G-01"],
 ["src/app/api/upload/route.ts","src/app/api/file/[...path]/route.ts","src/app/api/wechat/callback/route.ts","src/app/api/health/route.ts","src/app/api/route.ts","docs/design/03_solution/decisions/ADR-037-withApi豁免清单.md"],
 ["逐条判断：流式/原始 body/签名校验是否与 withApi 冲突","可迁移的迁移（保持响应体与状态码不变）","不可迁移的：确认有鉴权（upload）、路径穿越防护（file）、签名校验（wechat）并各补 1 条负向用例","写 ADR-037"],
 ["grep -L 'withApi\\|crud' $(find src/app/api -name route.ts) 的输出 ⊆ ADR-037 豁免清单","file 路由 ../ 穿越返回 400/404","upload 未登录 401","wechat 错误签名拒绝"],
 "for f in $(find src/app/api -name route.ts); do grep -qE 'withApi|crud' $f || echo $f; done; "+G,"需要改 api-handler 本身","无",FROZEN),
("V8-VIS-01","与 main 等量的确定性 seed 数据集","S3","用户转述：dev.db 内容表全 0，visual 高度差 2140px","npx tsx prisma/seed-visual.ts 后 Article/Course/Banner/Campus/Gallery 行数与 main 参照一致","P1","sonnect",1.0,["V8-G-01"],
 ["prisma/seed-visual.ts","prisma/fixtures/visual/**","public/uploads/visual-fixtures/**","docs/design/06_validation/evidence/V8/VIS-01/**"],
 ["从 main（94dbbbb 工作树或其 dev.db；只读）统计各内容表行数与首页区块所需字段，写 counts.json","生成脱敏、固定内容的 fixtures（文本可用 main 公开页面文字，图片用 main 仓库内已有静态资源）","seed-visual.ts 幂等：先清空 5 张内容表再按 fixtures 写入，id 固定","记录 seed 后各表行数"],
 ["counts.json 与 seed 后行数逐表相等","连续执行两次 seed 结果一致（幂等）","不触碰 schema 与迁移"],
 "npx tsx prisma/seed-visual.ts && npx tsx prisma/seed-visual.ts && node -e \"\" && "+G,"main 侧数据不可得 → 登记 BLOCKING V8-Q4 并按 fixtures 估算数量继续（标注假设）","无",FROZEN),
("V8-VIS-02","Linux CI visual 作业（官方 playwright 镜像）","S3","W2-05/P5：visual 只在 Linux 有效","push 到 upgrade 时 CI 在 Linux 跑 test:visual，失败上传 diff 产物","P3","sonnect",0.5,["V8-VIS-01","V8-SEC-04"],
 [".github/workflows/**","docs/design/06_validation/evidence/V8/VIS-02/**"],
 ["新增 job visual：container mcr.microsoft.com/playwright:<与 lock 中 @playwright/test 同版本>-jammy","步骤：npm ci → prisma migrate deploy → npx tsx prisma/seed-visual.ts → build → start(:3000) → test:visual","失败时 actions/upload-artifact 上传 test-results/","该 job 先设 continue-on-error: true，V8-VIS-03 完成后改 false"],
 ["CI 实跑一次有结果（PASS 或带产物的 FAIL）","产物可下载","主门禁 job 不受影响"],
 "cat .github/workflows/*.yml | grep -n 'visual\\|playwright'","无","CI 权限不足 → 标 BLOCKED，登记给用户",[]),
("V8-VIS-03","visual 差异分诊与前台修复（红色横幅风格一致）","S3","REQ-F-014；D1 裁决：前台沿用 main 红色横幅轮播","Linux + seed 下 test:visual 全部通过，或每条残差有已裁决的豁免","Hark","opus",1.5,["V8-VIS-02"],
 ["src/app/(web)/**","src/components/web/**","src/styles/**","tests/visual/__screenshots__/**","docs/design/06_validation/evidence/V8/VIS-03/**"],
 ["下载 CI 产物，按路由×宽度建 diff 表：样式回归 / 数据差 / 合理演进 三类","样式回归：在 (web) 内修复，保持 main 外观","合理演进（upgrade 新增能力导致）：更新基线截图并在证据中逐张说明","把 VIS-02 的 continue-on-error 改 false（由本卡在证据中请求 P3 执行，避免跨所有权）"],
 ["CI visual 全绿","每张更新的基线截图有一行理由","首页 1440/768/375 三宽度高度互不相同（证明内容渲染）"],
 "npm run test:visual","残差需改 manager 设计系统组件 → 拆卡给 V8-UI-01","依赖 V8-VIS-02 有 CI 结果",FROZEN),
("V8-PERF-01","/manager 共享 chunk 再减（目标口径按 V8-Q3）","S4","W2-04：/manager JS gzip FAIL 1.016×；articles 372,724 B（−36.8%）","按 V8-Q3=B：/manager/articles 首屏 JS gzip 不回涨（≤372,724 B）且共享 chunk −10%","P1","opus",1.0,["V8-SEC-01"],
 ["next.config.ts","src/components/manager/**","src/app/manager/**","docs/design/06_validation/evidence/V8/PERF-01/**"],
 ["用 next build 产物 + source-map-explorer（npx，不加依赖）列出共享 chunk 前 10 模块","候选手段按收益排序：optimizePackageImports、图标按需、DnD/Markdown/图表组件懒加载、去掉值导入组件模块（同 form-utils 模式）","每个手段单独提交并测量 3 次取中位数","保持 sanitize 默认注入（安全优先，不得为减包移除）"],
 ["V8-Q3=B：/manager/articles ≤372,724 B 且共享 chunk 较本卡开工时 −10%（W2-04 同口径 3 次中位数）","门禁 + e2e 全绿","sanitizeRichContent 仍被默认调用（grep + 单测）"],
 "node scripts/measure-baseline.mjs --route /manager/articles --runs 3; "+G,"任何手段需要改契约或去掉安全层","依赖 V8-SEC-01（next 升级会改变 chunk）",FROZEN),
("V8-UI-01","管理端顶级体验收尾：空/错/无权限态全覆盖 + 视觉一致性","S5","REQ-F-015；D5 裁决；UX States 契约","22 个资源页的五种 UX 状态均由设计系统组件呈现，a11y 12/12 保持","Hark","opus",1.5,["V8-PERF-01","V8-T-01"],
 ["src/components/manager/**","src/app/manager/**","tests/e2e/ux-states.spec.ts","docs/design/06_validation/evidence/V8/UI-01/**"],
 ["以 resource-meta 为源，列出 22 资源 × 5 态矩阵，标出未用 EmptyState/ErrorState/Forbidden 组件的格子","统一补齐；无权限态从服务端 403 契约码驱动，不在前端猜权限","新增 ux-states.spec.ts：每资源用 route mock 断言 5 态各出现一次（仅读 testid）","axe 复扫 12 代表页"],
 ["矩阵 110 格全部有组件（证据表）","ux-states.spec 通过","a11y serious/critical=0","/manager/articles gzip 不回涨超过 2%"],
 "npm run test:e2e -- ux-states a11y; "+G,"需要新增契约错误码","无",FROZEN),
("V8-INT-01","微信/SMTP/Coze 凭证到位即测：冒烟脚本与操作手册","S6","D4 裁决：凭证不提供，真实联调 UNKNOWN","提供 3 个 dry-run 默认、--live 才出网的冒烟脚本，凭证到位后 10 分钟内可得结论","P1","sonnect",0.75,["V8-G-01"],
 ["scripts/smoke/**","docs/design/07_release/真实联调手册.md","docs/design/06_validation/evidence/V8/INT-01/**"],
 ["smoke/wechat.mjs：token→uploadimg→draft/add→freepublish（--live 前只打印请求）","smoke/smtp.mjs：连接+发 1 封到 SMOKE_TO","smoke/coze.mjs：建库→上传 1 个 .md→检索","全部读 env，缺键时列出缺哪些后 exit 3，不抛栈","手册写清所需 env、预期输出、失败对照表"],
 ["无凭证运行 3 个脚本均 exit 3 并列出缺失键","dry-run 输出请求摘要且不出网（断网下也能跑）","脚本中无硬编码密钥（CI secret scan 通过）"],
 "node scripts/smoke/wechat.mjs; node scripts/smoke/smtp.mjs; node scripts/smoke/coze.mjs; echo done","无","真实运行需凭证（V8-Q2），不阻塞本卡完成",[]),
("V8-REL-01","Docker 镜像 Linux 构建与冒烟（验证 D-08 声明）","S6","D-08 提交 023ab68；部署与恢复手册","CI 中 docker build 成功，容器内 /api/health 200，数据卷重启后数据保留","P3","sonnect",0.5,["V8-SEC-01","V8-VIS-02"],
 [".github/workflows/**","Dockerfile","docker-compose.yml","docs/design/06_validation/evidence/V8/REL-01/**"],
 ["CI 加 job docker：build → compose up → curl /api/health → 写 1 条文章 → compose restart → 再读","按手册执行一次 restore.mjs 还原演练"],
 ["health 200","重启后数据仍在","restore 演练日志存在"],
 "docker compose up -d --build && curl -fsS http://localhost:3000/api/health && docker compose restart && curl -fsS http://localhost:3000/api/health","镜像构建需要改业务代码","无 Docker 环境 → 只在 CI 跑",[]),
("V8-V-01","V0.8 全卡独立验收（只看 diff + 运行结果）","S7","AGENTS.md 完成定义；防自证","每张 V8 卡有 verify.md：PASS/FAIL/UNKNOWN 一词结论 + 命令输出","P2","opus",1.0,["V8-SEC-04","V8-T-01","V8-T-02","V8-T-03","V8-VIS-01","V8-INT-01","V8-REL-01"],
 ["docs/design/06_validation/evidence/V8/**/verify.md"],
 ["对每张卡：git show 该卡提交 → 核对允许修改路径 → 逐条跑验收命令","结论只写 PASS/FAIL/UNKNOWN + 证据路径","FAIL 写入 08-风险 的返工清单"],
 ["V8 卡 verify.md 数 = 已执行卡数","无验证者与执行者同一身份（见 state.json owner 字段）"],
 "ls docs/design/06_validation/evidence/V8/*/verify.md | wc -l","无","无",["src/**","tests/**"]),
("V8-REL-02","终审、changelog、双端同步与打包","S7","用户指令：完成后双端一致；无法连接则 zip","upgrade 本地=远端，changelog 与 parity 矩阵更新，生成 V0.8 交付包","Hark","opus",0.5,["V8-V-01"],
 ["docs/design/07_release/changelog.md","docs/design/02_requirements/parity-matrix.md","docs/V0.8-20261022/EXEC-*.md"],
 ["汇总 verify 结论；FAIL 未清零则不得宣布完成","git pull --rebase → 门禁 → push","git rev-list --left-right --count origin/upgrade...HEAD = 0 0","打 zip（docs/V0.8 + evidence/V8）"],
 ["双端 0 0","changelog 有 V0.8 段","parity 矩阵 missing=0 复核"],
 "git fetch && git rev-list --left-right --count origin/upgrade...HEAD","任何 FAIL 未返工","无",["src/**"]),
]
cards=[]
for t in T:
    (cid,name,sl,src,goal,who,tier,days,deps,allow,steps,acc,cmd,up,blk,deny)=t
    cards.append(dict(id=cid,name=name,slice=sl,source=src,goal=goal,owner=who,tier=tier,days=days,deps=deps,allow=allow,steps=steps,acc=acc,cmd=cmd,up=up,blk=blk,deny=deny))
ids={c["id"] for c in cards}
for c in cards:
    for d in c["deps"]: assert d in ids,(c["id"],d)
    c["blocks"]=[x["id"] for x in cards if c["id"] in x["deps"]]
# 环检测 + 关键路径
memo={}
def longest(i,stack=()):
    assert i not in stack, "环: "+"->".join(stack+(i,))
    if i in memo: return memo[i]
    c=next(x for x in cards if x["id"]==i)
    best=(0,[])
    for d in c["deps"]:
        l=longest(d,stack+(i,))
        if l[0]>best[0]: best=l
    memo[i]=(best[0]+c["days"],best[1]+[i]); return memo[i]
crit=max((longest(c["id"]) for c in cards),key=lambda x:x[0])
# 所有权重叠：同一路径模式被两张"可能同时运行"的卡持有（无祖先关系）
anc={}
def ancestors(i):
    if i in anc: return anc[i]
    c=next(x for x in cards if x["id"]==i); s=set()
    for d in c["deps"]: s|={d}|ancestors(d)
    anc[i]=s; return s
def pre(p): return p.split("#")[0].split("*")[0].rstrip("/")
def ov(a,b):
    pa,pb=pre(a),pre(b)
    if pa==pb or pa.startswith(pb+"/") or pb.startswith(pa+"/"): return True
    return a==b or fnmatch.fnmatch(a,b) or fnmatch.fnmatch(b,a) or a.rstrip("*/").startswith(b.rstrip("*/")+"/") or b.rstrip("*/").startswith(a.rstrip("*/")+"/")
overlaps=[]
for a,b in itertools.combinations(cards,2):
    if a["id"] in ancestors(b["id"]) or b["id"] in ancestors(a["id"]): continue
    for p in a["allow"]:
        for q in b["allow"]:
            if ov(p.split("#")[0],q.split("#")[0]) and not (p.startswith("docs/design/06_validation/evidence/V8/") and p!=q):
                overlaps.append([a["id"],b["id"],p,q])
os.makedirs(f"{H}/tasks",exist_ok=True); os.makedirs(f"{H}/evidence",exist_ok=True)
for c in cards:
    deny=sorted(set(c["deny"]+["其他卡的允许修改路径","docs/V0.7-20261019/**（历史只读）"]))
    md=f"""# {c['id']}：{c['name']}

## 归属
- 所属切片：{c['slice']}
- 来源需求/证据：{c['source']}
- 执行者：{c['owner']}

## 目标
{c['goal']}

## 输入
- 文档：docs/V0.8-20261022/00-事实基线.md、02-契约增量.md、04-连续执行协议.md
- 契约：src/contracts/**（只读，唯一源 zod）
- 前置任务：{', '.join(c['deps']) or '无'}
- 前置状态：前置卡在 state.json 中为 done 且 verify=PASS（V8-V-01 除外）

## 输出
""" + "\n".join(f"- {p}" for p in c["allow"]) + "\n\n## Execution Steps\n" + "\n".join(f"{i}. [ ] {s}" for i,s in enumerate(c["steps"],1)) + "\n\n## 验收标准\n" + "\n".join(f"- [ ] {a}" for a in c["acc"]) + f"""

## 验证命令
```bash
{c['cmd']}
```

## 证据路径
docs/design/06_validation/evidence/V8/{c['id'].replace('V8-','')}/（execution.md + 命令原始输出；verify.md 由独立验证者写）

## 允许修改
""" + "\n".join(f"- {p}" for p in c["allow"]) + "\n\n## 禁止修改\n" + "\n".join(f"- {p}" for p in deny) + f"""

## 依赖与阻塞
- Depends on：{', '.join(c['deps']) or '无'}
- Blocks：{', '.join(c['blocks']) or '无'}
- 阻塞条件：{c['blk']}（遇阻塞：state.json 标 blocked + 原因，立即转下一张就绪卡，不等待）

## 建议执行档位
{c['tier']}　理由：{'安全/依赖/跨模块，决策不可逆' if c['tier']=='opus' else ('模板化、无领域规则' if c['tier']=='haiku' else '原子实现，规则已在本卡写明')}

## 升级条件
{c['up']}；同卡连续 2 次验收 FAIL → 停止改代码，升一档并重写任务书（熔断）

## 预估规模
{'小' if c['days']<=0.5 else ('中' if c['days']<=1 else '大')}　约 {c['days']} 人天　{'不足 2 小时，已并入同卡' if c['days']<0.25 else '≥ 2 小时'}
"""
    open(f"{H}/tasks/{c['id']}.md","w",encoding="utf-8").write(md)
json.dump(dict(cards=[{k:c[k] for k in ("id","name","slice","owner","tier","days","deps","blocks","allow")} for c in cards],critical=crit[1],critical_days=crit[0],overlaps=overlaps),open(f"{H}/evidence/dag.json","w",encoding="utf-8"),ensure_ascii=False,indent=1)
state={c["id"]:dict(status="ready" if not c["deps"] else "pending",owner=c["owner"],verify=None,blocked_reason=None,commits=[]) for c in cards}
if not os.path.exists(f"{H}/state.json"): json.dump(state,open(f"{H}/state.json","w",encoding="utf-8"),ensure_ascii=False,indent=1)
load={}
for c in cards: load[c["owner"]]=load.get(c["owner"],0)+c["days"]
print(json.dumps(dict(n=len(cards),critical=crit[1],days=crit[0],overlaps=len(overlaps),load=load),ensure_ascii=False))
for o in overlaps: print("OVERLAP",o)
