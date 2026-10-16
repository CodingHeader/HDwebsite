# -*- coding: utf-8 -*-
import os, sys, json
sys.path.insert(0, os.path.dirname(__file__))
from tasks import T, LANES, OWNERSHIP, EXCLUDE, COMMON_FORBID
OUT = sys.argv[1]
os.makedirs(f"{OUT}/prompts", exist_ok=True)
os.makedirs(f"{OUT}/steps", exist_ok=True)
chk = json.load(open(f"{OUT}/gen-check.json", encoding="utf-8"))

def days(t):
    import re
    s = t["size"]
    if "<2h" in s: return 0.25
    m = re.findall(r"(\d+(?:\.\d+)?)(?:~(\d+(?:\.\d+)?))?\s*天", s)
    if m: a, b = m[0]; return float(b or a)
    return {"小": 0.5, "中": 1, "大": 2}.get(s[0], 1)

ANALYSIS = """## 开工前的深度分析（必须写进证据目录的 `analysis.md`，每个工作包一次）

1. **5W1H 发散**：What（本卡要求什么、代码已有什么、缺什么、哪些只是别人声明未被证明）；Why（直接原因与根因，只改表面会留下什么）；Where/When（文件:行、执行阶段、必须先于/后于哪些卡）；Who（本线负责什么、哪些要别的线或集成者配合）；How（定位→方案→实现→验证→证据）；What if（配置缺失、依赖不可用、字段变化、端口占用、他线未完成、测试过但运行失败、前提不成立时怎么办）。
2. **苏格拉底追问**：每个重要结论回答——凭什么？证据是否来自 `w1-base` 之后的真实代码？有无反证？是否把现象当根因？漏了哪些异常路径？前提不成立还成立吗？还要跑什么命令确认？
3. **双向钢人论证**：为关键方案写最强支持理由与最强反对理由，标明哪些反对已被证据排除、哪些仍成立、哪些转交后续卡。
4. **终稿**：结论 + 代码证据 + 命令证据 + 前提 + 局限 + 未验证项 + 风险 + 下一步；无法确认的写 `已确认 / 部分确认 / 证据不足 / 待其他员工完成 / 存在缺陷 / 需要返工 / 暂不执行` 之一。
禁止根据猜测补全关键事实；禁止“最佳实践”“行业惯例”代替本项目证据；禁止“绝对正确”“一定成功”。"""

SECURITY = """## 安全铁律（不可违反）

1. 不在聊天、日志、文件名、计划、证据、提交信息中明文出现私钥、token、密码、API key 的值；提到时只写“推送凭据”“访问令牌”等泛称。
2. **推送凭据由用户在本机配置**（credential helper 或权限 600 的 `~/.git-credentials`）；你不接触、不搜索、不打印凭据，也不要求用户把凭据发给你。没有可用凭据就不推送，在汇报里写明。推送后若使用了临时凭据文件立即删除；remote URL 不得含凭据：`git remote get-url origin | grep -qE 'https://[^/]*@' && echo 含凭据 || echo 干净`（SSH 地址 git@github.com 属正常）。
3. 不提交 `.env*`、`prisma/*.db`、`backups/`、`data/`、运行时上传、任何密钥；本地 `.env.local` 只放测试用随机值。
4. 不读取、不迁移凭据类文件（如 main 的 `website_error/.token.txt`）。"""

COMMON_RULES = """## 通用纪律

- 仓库 `https://github.com/CodingHeader/HDwebsite`，前台视觉标准 = `origin/main@94dbbbb`（红色横幅轮播）。改动任何被前台引用的文件后必须跑 `npm run test:visual` 且 46/46。
- 先读 `AGENTS.md`（尤其 §3 前台风格冻结、§5 禁止事项），再读本线任务卡；Next.js 16 有破坏性变更，写代码前读 `node_modules/next/dist/docs/` 对应章节。
- **冻结面（Wave 1 全程只读）**：`src/contracts/**`、`prisma/schema.prisma` 与迁移、`package.json` 依赖段与锁文件、`vitest.config.ts`、全部 playwright 配置、其他线拥有的文件。需要改 → 停止该子项，写《契约变更请求》（`11-验收与审查规程.md` §4），继续做不受影响的卡。
- 小而聚焦的提交，信息前缀 `feat(<卡号>)` / `fix(<卡号>)` / `test(<卡号>)` / `docs(<卡号>)`；不改全局 git config。
- 每张卡结束必跑：`npm run lint && npm run typecheck && npm test && npm run build`（全部 exit 0）。
- 熔断：同一卡连续 2 次独立验收 FAIL → 停止改代码，写失败分析，交集成者。
- 环境：node 22 可用（engines >=24 的警告可忽略）；Playwright 缺系统库时 `sudo npx playwright install-deps chromium`，装不上就把相关验收记为 UNKNOWN，绝不记 PASS。本地需 `.env.local`（`JWT_SECRET` ≥32 位随机串，参照 `.env.example`）。"""

REPORT = """## 交付与汇报格式（每个工作包结束、全线结束各一次）

```text
线 <X> / 工作包 <WP> 汇报
- 起点..终点：<w1-base 或上次汇报的 commit>..<HEAD commit>
- 完成的卡：<卡号列表>
- 逐条验收：| 卡号 | 验收条目 | 命令 | exit | 结果 PASS/FAIL/UNKNOWN | 证据路径 |
- 越界检查：git log --first-parent --no-merges --name-only --format= <起点>..HEAD 是否全部在本线所有权内：是/否（否则列出）
- 契约变更请求：<CCR 编号或“无”>
- 未验证项与原因：
- 风险与给其他线的事项：
```
汇报只陈述可复现的事实；判定 PASS 的是独立验证者，不是你。"""

def ownership_block(L):
    s = "## 本线所有权（只能写这些路径；由 gen.py 机械校验，与其他线零重叠）\n\n" + "\n".join(f"- `{p}`" for p in OWNERSHIP[L])
    if EXCLUDE.get(L):
        s += "\n- 排除（归其他线）：" + "、".join(f"`{p}`" for p in EXCLUDE[L])
    return s

def task_table(L):
    rows = ["| 序 | 卡号 | 任务 | 依赖 | 档位 | 人天 | 关键验收 |", "|---|---|---|---|---|---|---|"]
    for i, t in enumerate([t for t in T if t["lane"] == L], 1):
        rows.append(f"| {i} | {t['id']} | {t['title']} | {', '.join(t['deps']) or '—'} | {t['tier']} | {days(t)} | {t['accept'][0]} |")
    return "\n".join(rows)

LANE_INTRO = {
"Z": dict(role="你是 **Agent-Contract（契约员）**，Wave 0 唯一写入者。你的产出是其余五条线唯一共享的东西：冻结的契约、唯一的迁移、共享模块签名、一次性加好的依赖。你做错一处，五条线都会返工。",
  mission="把 upgrade 从 bb2c0e5 推进到可并行的冻结点 tag `w1-base`：规则落盘 → 结构切分 → 共享基座 → 错误码契约 → 领域契约 → p12 迁移 → 依赖与测试基建 → 门禁与独立校验。",
  setup="""```bash
git clone https://github.com/CodingHeader/HDwebsite.git && cd HDwebsite
git checkout upgrade && git log -1 --format=%H   # 必须是 bb2c0e51364aca4608d2a5832e31462b9c54ccf8，否则停止并汇报
npm ci && npx prisma generate
cp .env.example .env.local   # 只填测试用随机 JWT_SECRET（≥32 位），不得提交
npm run lint && npm run typecheck && npm test && npm run build   # 基线：0 error / 210 tests / build ok
```""",
  special="""## 本线特别规则

- 你直接在 `upgrade` 上提交，**严格按 W0-01 → W0-08 串行**，每张卡一个或数个提交。
- W0-02 与 W0-03 必须“零行为变化”：只搬迁/新增，不替换任何调用方（替换是各线的任务）。
- W0-04/W0-05 的目标形态已写在 `02-契约冻结包.md`（字段名、取值、中文文案都已定）。你只能补注释与类型导出；发现目标形态与真实代码冲突 → 停止并汇报，不得自行改语义。
- W0-06 迁移：`--create-only` 生成后逐行审，出现 DROP / RedefineTables / `INSERT INTO "new_` 就改 schema 去掉 relation；在 p06 状态库副本上验证行数、integrity_check、foreign_key_check，rollback 可逆。
- W0-07 一次性加入全部新依赖（TipTap 8 包 ^3.22.4、mammoth、jsdom、@testing-library/react、@testing-library/dom、@axe-core/playwright），Wave 1 期间任何线不再动依赖。
- W0-08：独立验证者 PASS 后打 `git tag w1-base`，**推送 upgrade 与 tag**（用户 2026-10-13 裁决 D8；凭据按安全铁律由用户本机配置）。""",
  scope="你的所有权：W0 各卡“允许修改”所列路径（含 `src/contracts/**`、`prisma/**`、`package.json`、`vitest.config.ts`、`AGENTS.md`、`docs/design/**` 等），仅在 Wave 0 内有效；`w1-base` 打出后你的写权限全部收回。"),
"A": dict(role="你是 **Agent-UI（管理端组件库）**。你的组件将被 E 线 36 个管理页消费；你不改页面，页面归 E 线。",
  mission="在 `src/components/manager/**` 内建成顶级管理端设计系统：基础件、DataTable、ResourceForm 与字段件、TipTap 富文本、重写 CrudPage（向后兼容）、移除 radix 代码引用、修复组件层 a11y。A-01~A-04 完成后经独立校验在 M1（A-07）合入 upgrade，供 E 线使用。",
  setup=None,
  special="""## 本线特别规则

- `src/components/ui/{button,input,textarea,label}.tsx` 的 className **一个字都不能动**（与 origin/main 逐字一致，前台 6 个文件 + 管理端登录页在用）。新基础件放 `src/components/manager/ui/`。`ui/label.tsx` 只允许在 A-06 改为原生 `<label>` 且 className 不变。
- 设计令牌只能落在 `[data-theme="manager"]` 作用域；你不得修改 `src/app/globals.css`（需要新令牌 → 契约变更请求）。
- **向后兼容是硬约束**：`CrudPageSpec`、`RowAction`、`FieldSpec`、全部现有 `data-testid`、行操作直出按钮（现有 E2E 用 `getByRole("button",{name:"试抓"})` 定位）都要保留。E 线在 M1 之前一直按旧 API 开发。
- RichTextField 必须 `next/dynamic` 懒加载；/manager 首屏包体相对 w1-base 增长 ≤ 2%。
- 你可以读 E 线分支复测，但不得写 `src/app/manager/**`、`crud-specs.tsx`、`resource-meta/**`。
- M1（A-07）：A-01~A-04 全部 PASS 后由独立验证者复核 `git diff w1-base..lane/a-manager-ui`，PASS 后合入 upgrade 并打 `w1-ui-kit`，然后通知 E 线 `git merge --no-ff w1-ui-kit`。""",
  scope=None),
"E": dict(role="你是 **Agent-App（管理端页面与功能）**。你拥有全部管理页、表单规格与菜单 seed；组件由 A 线提供。",
  mission="让管理端每个页面都统一、可用、与契约一致：先修规格漂移并补齐缺失页面（通知规则、首页区块配置/页面模板/交互点、知识库），M1 后把 10 个特殊页迁到新组件，再把规格改为从契约派生，最后做 a11y 与响应式扫描。",
  setup=None,
  special="""## 本线特别规则

- **M1 之前**（E-01~E-04）：只使用 w1-base 已有的组件 API（CrudPage、PageHeader、FormDialog、SchemaForm、feedback/*）。A 线保证这些 API 向后兼容，所以 M1 合入后你的页面自动升级，不需要返工。
- **M1 之后**：`git merge --no-ff w1-ui-kit` 再开工 E-05/E-06。页面层不得写原生 `<table|input|select|button|textarea>`（验收用严格正则）。
- 新增菜单只改 `prisma/seed.ts` 的菜单段，必须幂等（连跑两次不重复）。
- E-04 知识库页按 `02-契约冻结包.md` 的端点与 schema 开发；C 线端点未合并前用组件测试 mock，e2e 写好、在 W2-05 跑。
- E-08 只修页面层问题；组件层问题写入 `evidence/W1-E/a11y-report.md` 的“交 A-08”清单（规则 id、页面、选择器），不得越界修改组件。
- 现有 4 个 E2E spec（crud-article、collect-publish、auth、apply-chat）归你维护；新增用例文件名以 `e-` 开头。""",
  scope=None),
"B": dict(role="你是 **Agent-API（API 与响应平台）**。你负责路由统一包装、响应契约落地、设置读取、发布渠道注册表与通知可靠性。",
  mission="把 B 线拥有的手写路由全部迁入 withApi（只留登记在案的协议例外），收敛 settings/外呼/JSON 工具，把发布渠道抽成注册表，让通知的静默时段生效、去重跨进程原子化、邮件堆栈脱敏。",
  setup=None,
  special="""## 本线特别规则

- 迁移路由时**响应形状与状态码不得改变**（除 W0 已冻结的错误码语义）。每迁一个路由，先写 401/403/400/200 用例（复用 `src/lib/__tests__/api-contract/harness.ts`），迁移后用例不改即通过。
- `getSettings` 保留为 @deprecated 别名，前台 9 个文件零改动。
- 写操作后的前台失效只调用 W0 冻结的 `invalidateWebContent([WEB_TAGS.x])`，不自己实现缓存（cache-tags.ts 归 D 线）。
- B-06 需要 `notify.scan` 调用 `flushDeferred()`：`src/lib/jobs/**` 归 D 线，你只导出函数并写 CCR，单测直接调用验证。
- 全路由契约测试（tests/contract）与 ESLint 边界规则属于“守卫”，按规划总指令 §8.1 不与实现并行，放在 Wave 2（W2-02、W2-08）；你在 B-03 把协议例外清单写入 `evidence/W1-B/non-json-routes.md`，供 W2-02 使用。
- `src/lib/__tests__/w0-structure.test.ts` 在 Wave 1 归你维护（它只断言资源键“不丢”，其他线新增资源不会让它失败）。""",
  scope=None),
"C": dict(role="你是 **Agent-AI（AI 与知识库）**。你负责 LLM/知识库适配器、Coze 知识库集成、文件管线、本地检索、知识库 API、场景装配与 SSE、模型配额。",
  mission="让知识库真正可用（库/文件/条目/检索，Word/Markdown/TXT 进、PDF/图片拒），把 Coze 作为可注册的后端，让官网与公众号客服按场景使用多模型优先级、参数与知识库，并让模型配额/限频生效。",
  setup=None,
  special="""## 本线特别规则

- 知识库上传白名单只有 `.docx/.doc/.md/.markdown/.txt`；扩展名 + MIME + 文件头三重校验；**严禁**引入任何 PDF/图片解析或 OCR 依赖，严禁放宽白名单（ADR-025，用户裁决 D3）。
- 只有一个知识库注册表：P06 的 `registerKbRemoteAdapter` 保留导出名，作为新注册表的薄包装；Coze 后端在模块加载时自注册，**不改 `src/instrumentation.ts`**（D 线所有）。
- 采集入库不改 `collect-engine.ts`（D 线所有）：`ingestCollectItem` 内部读取 `CollectSource.knowledgeBaseId`。
- `ChatWidget.tsx` 只允许替换 SSE 解析逻辑（约 :89-131），JSX 与 className 不动，visual 46/46。
- 场景模型顺序：`providerIds` 非空 → 否则 `llmProviderId` → 否则全局 default→priority→fallback（K12），测试要覆盖回落。
- 日界一律 Asia/Shanghai；Coze 真实联调无凭证 → mock 测试，验收记 UNKNOWN。实现 Coze 接口前先核对 docs.coze.cn 当前文档，把 URL 与访问日期写入证据。""",
  scope=None),
"D": dict(role="你是 **Agent-Ops（运维：性能·配置·存储·资源）**。你负责启动脚本、环境校验、设置对等、前台缓存、部署件、存储根、备份、上传迁出 git 与采集解析。",
  mission="让服务重启快且读得到 env、生产配置可校验、设置键与 main 对等、首页有缓存且改动 5 秒可见、上传/备份/知识库文件不再写进构建目录、运行时文件迁出 git、采集可扩展且图片受控。",
  setup=None,
  special="""## 本线特别规则

- **先测量再优化**：D-01 的 before.json 是 D-06 与 W2-04 的唯一基数（参考 `09-基线指标.md`，偏差 >15% 要说明）。
- 前台文件（`src/app/(web)/**`、`Footer.tsx`、`components/web/data/**`、robots、sitemap）你只能做三类改动：`dynamic/revalidate` 导出与数据函数调用、缓存包装与查询并行化、兜底字面量 → `BRAND_DEFAULTS`。JSX 与 className 不动，每次都跑 visual。
- `storage.ts` / `cache-tags.ts` 的**导出签名**在 W0 冻结（B、C 线在调用），你只改实现。
- 迁出 uploads 前先导出、计数与 `git ls-files uploads` 一致才 `git rm -r --cached`，磁盘文件不删。`public/uploads/202604/**` 的 20 个文件默认保留。
- `package.json`（含 scripts）在 Wave 1 冻结；check-assets/check-root 脚本接入与依赖删除在 Wave 2（W2-09、W2-03）。
- Docker 不可用时 D-08 的构建验收记 UNKNOWN。""",
  scope=None),
}

for L in ["Z", "A", "E", "B", "C", "D"]:
    li = LANE_INTRO[L]; lane = LANES[L]
    ts = [t for t in T if t["lane"] == L]
    total = sum(days(t) for t in ts)
    setup = li["setup"] or f"""```bash
git clone https://github.com/CodingHeader/HDwebsite.git && cd HDwebsite
git fetch --tags && git checkout -b {lane['branch']} w1-base     # 必须从冻结点建分支；没有该 tag 说明 Wave 0 未完成，停止
npm ci && npx prisma generate
cp .env.example .env.local   # 只填测试用随机 JWT_SECRET（≥32 位），不得提交
npm run lint && npm run typecheck && npm test && npm run build   # 先确认基线全绿再动手
```
（2 名执行者模式：分支名以《执行者说明》为准——UI 线 `lane/ui`、后端线 `lane/backend`，替换本节及全文中的分支名。）"""
    scope = li["scope"] or ownership_block(L)
    p = f"""# 提示词：{lane['name']}（{lane['agent']}）

> 直接把本文件全文交给执行该线的开发 CLI。它与其他线**不能实时通信**，唯一共享物是 tag `w1-base` 上冻结的契约与本规划包。任务卡全文：规划包 `tasks/<卡号>.md`（W0-01 后也入库于 `docs/design/04_planning/parallel-w1/tasks/`）。

## 角色与使命

{li['role']}

**使命**：{li['mission']}

**规模**：{len(ts)} 张卡，计划 {total} 人天；线内关键链 {' → '.join(chk['lane_chain'][L]['chain']) if L in chk['lane_chain'] else '串行全部'}。分支：`{lane['branch']}`。

## 启动

{setup}

## 必读（按顺序）

1. `AGENTS.md`（§2 用户裁决、§3 前台风格冻结、§5 禁止事项、§6 完成定义）
2. 规划包 `00-规划快照与事实基线.md`、`02-契约冻结包.md`、`07-所有权矩阵.md`、`11-验收与审查规程.md`
3. 本线全部任务卡 `tasks/{'W0' if L=='Z' else L}-*.md`
4. 审计证据（只读参考）：`evidence/A-ui-审计.md`、`evidence/B-domain-审计.md`、`evidence/C-ops-审计.md`

{scope}

## 任务清单（执行顺序 = 表中顺序，遵守“依赖”列）

{task_table(L)}

每张卡的输入、输出文件、Execution Steps、全部验收标准、验证命令、证据路径、允许/禁止修改、升级条件都在任务卡里，**以任务卡为准**；本提示词与任务卡冲突时停止并汇报。

{li['special']}

{COMMON_RULES}

{ANALYSIS}

## 验收条件（本线整体）

- 本线每张卡的 `<卡号>-verify.md` 由独立验证者给出 PASS（UNKNOWN 只允许出现在无凭证/无 docker 的条目，并写明原因）。
- `git log --first-parent --no-merges --name-only --format= {'bb2c0e5' if L=='Z' else 'w1-base'}..HEAD | sort -u` 全部落在本线所有权内（越界一处即整线 FAIL；`--first-parent` 排除合并带入的 M1/CCR 提交，因此合入他线时必须 `git merge --no-ff`）。
- 通用门禁全绿；涉及前台引用文件时 visual 46/46；涉及页面/接口时 e2e 全绿。
- 证据目录完整：`docs/design/06_validation/evidence/{'W0' if L=='Z' else 'W1-'+L}/`（analysis.md、每卡命令输出摘要、截图/日志路径、CCR）。

{SECURITY}

{REPORT}
"""
    name = {"Z": "W0-契约员", "A": "A-管理端组件库", "E": "E-管理端页面与功能", "B": "B-API与响应平台", "C": "C-AI与知识库", "D": "D-运维性能配置存储资源"}[L]
    open(f"{OUT}/prompts/提示词-{name}.md", "w", encoding="utf-8").write(p)
print("prompts ok")

# ── steps/：每个步骤一个计划文件
STEPS = [
 ("STEP-0-Wave0-契约冻结与解阻", "Z", "upgrade@bb2c0e5 门禁全绿；用户已答复 D8（或接受默认）", "W0-verify.md = PASS；tag w1-base 存在；`git diff --name-only bb2c0e5..w1-base` 不含前台路径；visual 46/46、e2e 8/8", "提示词-W0-契约员.md"),
 ("STEP-1A-管理端组件库", "A", "tag w1-base", "A 线全部卡 PASS；M1（w1-ui-kit）已合入 upgrade；A-08 关闭 E-08 清单", "提示词-A-管理端组件库.md"),
 ("STEP-1E-管理端页面与功能", "E", "tag w1-base（E-05/E-06 另需 w1-ui-kit）", "E 线全部卡 PASS；交 A-08 清单已移交", "提示词-E-管理端页面与功能.md"),
 ("STEP-1B-API与响应平台", "B", "tag w1-base", "B 线全部卡 PASS；B 线拥有的手写路由只剩登记在案的协议例外", "提示词-B-API与响应平台.md"),
 ("STEP-1C-AI与知识库", "C", "tag w1-base", "C 线全部卡 PASS；知识库上传 PDF/图片 400 用例在列且通过", "提示词-C-AI与知识库.md"),
 ("STEP-1D-运维性能配置存储资源", "D", "tag w1-base", "D 线全部卡 PASS；before.json 已入证据；git ls-files uploads = 0", "提示词-D-运维性能配置存储资源.md"),
 ("STEP-2-集成与终审", "W", "五线全部 PASS（A 线含 M1 与 A-08）", "final-verify.md = PASS；upgrade 已推送；remote URL 无凭据；规划包与证据已打包", "提示词-W2-集成与终审.md"),
]
for i, (name, L, entry, exit_, prompt) in enumerate(STEPS):
    ts = [t for t in T if t["lane"] == L]
    rows = ["| 序 | 卡号 | 任务 | 依赖 | 档位 | 人天 |", "|---|---|---|---|---|---|"]
    for j, t in enumerate(ts, 1):
        rows.append(f"| {j} | [{t['id']}](../tasks/{t['id']}.md) | {t['title']} | {', '.join(t['deps']) or '—'} | {t['tier']} | {days(t)} |")
    chain = chk["lane_chain"].get(L)
    par = "可与其他四条执行线同时进行（07-所有权矩阵.md：零重叠）" if L in "ABCDE" else ("必须最先完成，其余线全部等待本步骤" if L == "Z" else "必须最后执行，串行")
    body = f"""# {name}

- 执行线：{LANES[L]['name']}　分支：`{LANES[L]['branch']}`　所有者：{LANES[L]['agent']}
- 下发提示词：`prompts/{prompt}`
- 并行关系：{par}
- 计划：{len(ts)} 张卡 / {sum(days(t) for t in ts)} 人天{('；线内关键链 ' + ' → '.join(chain['chain']) + f'（{chain["chain_days"]} 人天）') if chain else ''}

## 进入条件
{entry}

## 退出条件（全部满足才算本步骤完成）
{exit_}

## 任务
{chr(10).join(rows)}

## 本步骤的审查方式
1. 每个工作包结束：执行者提交汇报（格式见提示词）→ 独立验证者用 `prompts/提示词-独立验证者.md` 输出 PASS/FAIL/UNKNOWN。
2. 本步骤结束：集成者（主审）抽查 3 张卡的证据能否在干净克隆上复现；任一不能复现 → 该卡 FAIL。
3. 连续 2 次 FAIL 的卡熔断，回到规划重写任务卡。

## 风险提示
见 `10-风险·未决·待裁决.md` 中归属为 {L if L in 'ABCDE' else ('W0' if L=='Z' else '集成者')} 的条目。
"""
    open(f"{OUT}/steps/{name}.md", "w", encoding="utf-8").write(body)
print("steps ok")
