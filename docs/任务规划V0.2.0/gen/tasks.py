# -*- coding: utf-8 -*-
"""剩余任务的唯一数据源。任务卡、任务索引、DAG 与所有权检查都由 gen.py 从这里生成。"""

COMMON_FORBID = [
    "src/app/(web)/**、src/components/web/**、public/**、src/app/globals.css（除本卡显式放行的行）",
    "prisma/schema.prisma、prisma/migrations/**（Wave 0 之后全程冻结）",
    "src/contracts/**（Wave 0 之后冻结；需要改 → 停止该子项，提交《契约变更请求》给集成者）",
    "package.json 的 dependencies/devDependencies、package-lock.json（Wave 0 之后冻结；删依赖在 W2-03 统一做）",
    "vitest.config.ts、playwright.config.ts、tests/e2e/playwright.config.ts、tests/a11y/playwright.config.ts（Wave 0 之后冻结）",
    "其他执行线拥有的路径（见 07-所有权矩阵.md）",
    "真实环境文件 .env / .env.local / .env.*.local（.env.example 除外）、prisma/*.db、backups/、data/、任何密钥",
]
GATE = "npm run lint && npm run typecheck && npm test && npm run build"
VIS = "npm run test:visual"
E2E = "npm run test:e2e"

LANES = {
    "Z": dict(name="Wave 0 契约与解阻", branch="upgrade（直接提交）", agent="Agent-Contract"),
    "A": dict(name="执行线 A 管理端组件库", branch="lane/a-manager-ui", agent="Agent-UI"),
    "E": dict(name="执行线 E 管理端页面与功能", branch="lane/e-manager-pages", agent="Agent-App"),
    "B": dict(name="执行线 B API 与响应平台", branch="lane/b-api-platform", agent="Agent-API"),
    "C": dict(name="执行线 C AI 与知识库", branch="lane/c-ai-kb", agent="Agent-AI"),
    "D": dict(name="执行线 D 运维·性能·配置·存储·资源", branch="lane/d-ops", agent="Agent-Ops"),
    "W": dict(name="Wave 2 集成与终审", branch="upgrade（集成者）", agent="Agent-Guard/集成者"),
}

# 每条执行线在 Wave 1 拥有的路径（所有权矩阵的唯一源；gen.py 会做机械重叠检查）
OWNERSHIP = {
    "A": [
        "src/components/manager/**",
        "src/components/ui/dialog.tsx", "src/components/ui/label.tsx",
        "src/components/ui/checkbox.tsx", "src/components/ui/scroll-area.tsx", "src/components/ui/select.tsx",
        "src/components/ui/switch.tsx", "src/components/ui/table.tsx", "src/components/ui/tabs.tsx",
        "tests/e2e/a-*.spec.ts",
        "docs/design/06_validation/evidence/W1-A/**",
        "docs/design/03_solution/decisions/ADR-033-*.md",
    ],
    "E": [
        "src/app/manager/**",
        "src/components/manager/crud-specs.tsx", "src/components/manager/resource-meta/**",
        "src/app/api/home-blocks/**",
        "prisma/seed.ts",
        "tests/e2e/crud-article.spec.ts", "tests/e2e/collect-publish.spec.ts", "tests/e2e/auth.spec.ts",
        "tests/e2e/apply-chat.spec.ts", "tests/e2e/e-*.spec.ts", "tests/a11y/*.spec.ts",
        "tests/e2e/global-setup.ts", "tests/e2e/fixtures/**",
        "docs/design/06_validation/evidence/W1-E/**",
    ],
    "B": [
        "src/lib/settings.ts", "src/lib/api-handler.ts", "src/lib/api-response.ts", "src/lib/auth.ts",
        "src/lib/api-auth.ts", "src/lib/wechat.ts", "src/lib/notify-gateway.ts", "src/lib/publish-executor.ts",
        "src/lib/content-workflow.ts", "src/lib/channels/**",
        "src/app/api/route.ts", "src/app/api/apply/**", "src/app/api/articles/**", "src/app/api/auth/**",
        "src/app/api/health/**", "src/app/api/users/**", "src/app/api/roles/**", "src/app/api/settings/**",
        "src/app/api/manager-menus/**", "src/app/api/manager/**", "src/app/api/user-actions/**",
        "src/app/api/wechat/**", "src/app/api/publish-jobs/**", "src/app/api/notify-*/**",
        "src/app/api/content-items/**", "src/app/api/logs/**",
        "src/lib/crud-resources/system.ts", "src/lib/crud-resources/content.ts",
        "src/lib/__tests__/lane-b/**", "src/lib/__tests__/api-contract/**",
        "src/lib/__tests__/notify-before-publish.test.ts", "src/lib/__tests__/publish-state-machine.test.ts",
        "src/lib/__tests__/content-review.test.ts", "src/lib/__tests__/auth-permission.test.ts",
        "src/lib/__tests__/wechat-chat.test.ts",
        "tests/e2e/b-*.spec.ts", "src/lib/__tests__/w0-structure.test.ts",
                "docs/design/06_validation/evidence/W1-B/**", "docs/design/03_solution/decisions/ADR-030-*.md",
    ],
    "C": [
        "src/lib/llm/**", "src/lib/llm-gateway.ts", "src/lib/coze.ts", "src/lib/kb/**", "src/lib/kb-adapter.ts",
        "src/lib/kb-sync.ts", "src/lib/chat-service.ts",
        "src/app/api/llm/**", "src/app/api/kb/**", "src/app/api/knowledge/**", "src/app/api/knowledge-bases/**",
        "src/app/api/knowledge-files/**", "src/app/api/chat-scenes/**", "src/app/api/chat/**",
        "src/app/api/chat-history/**",
        "src/components/web/ChatWidget.tsx",
        "src/lib/crud-resources/kb-ai.ts",
        "src/lib/__tests__/lane-c/**", "src/lib/__tests__/collect-autokb.test.ts", "src/lib/__tests__/p06-followups.test.ts",
        "tests/e2e/c-*.spec.ts",
        "docs/design/06_validation/evidence/W1-C/**", "docs/design/03_solution/decisions/ADR-029-*.md",
    ],
    "D": [
        "scripts/**", "next.config.ts", "src/instrumentation.ts", "src/lib/env.ts", "src/lib/storage.ts",
        "src/lib/cache-tags.ts", "src/lib/jobs/**", "src/lib/crud.ts", "src/lib/collect-engine.ts",
        "src/lib/collect-test.ts", "src/lib/collect/**", "src/lib/block-registry.ts", "src/lib/settings-registry.ts",
        "src/lib/scheduler.ts", "src/config/**",
        "src/app/api/upload/**", "src/app/api/file/**", "src/app/api/media/**",
        "src/app/api/collect-sources/**", "src/app/api/collect-items/**", "src/app/api/collect-tasks/**",
        "src/lib/crud-resources/site.ts", "src/lib/crud-resources/collect.ts", "src/lib/crud-resources/media.ts",
        "src/app/(web)/**", "src/components/web/Footer.tsx", "src/components/web/data/**",
        "src/app/robots.ts", "src/app/sitemap.ts",
        "Dockerfile", "docker-compose.yml", ".dockerignore", "CLAUDE.md", ".env.example", ".gitignore",
        ".tmp-pa.html", "uploads/**",
        "src/lib/__tests__/lane-d/**", "src/lib/__tests__/scheduler-cron.test.ts",
        "src/lib/__tests__/settings-registry.test.ts", "src/lib/__tests__/block-registry.test.ts",
        "src/lib/__tests__/sqlite-busy-timeout.test.ts", "src/lib/__tests__/view-stats.test.ts",
        "tests/e2e/d-*.spec.ts",
        "docs/design/06_validation/evidence/W1-D/**",
        "docs/design/03_solution/decisions/ADR-031-*.md", "docs/design/03_solution/decisions/ADR-032-*.md",
    ],
}
EXCLUDE = {"A": ["src/components/manager/crud-specs.tsx", "src/components/manager/resource-meta/**"]}
# 显式例外：同一文件内只放行"纯数据片段"的不算所有权（无）。package.json scripts/engines 字段：仅 D 可改（不触碰 lock）。

T = []
def task(**k):
    k.setdefault("forbid", [])
    k.setdefault("blocks", [])
    k.setdefault("deps", [])
    k.setdefault("assume", [])
    T.append(k)

# ───────────────────────── Wave 0（串行，单写入者） ─────────────────────────
task(id="W0-01", lane="Z", wp="WP0.1 规则与计划落盘", slice="S0 治理刀",
     title="并行编排规则落盘（AGENTS.md §4 修订、P07~P15 提示词标注被取代、计划包入库）",
     req="用户 2026-10-13 指令（3~5 并行）；REQ-F-013；规划总指令 §7/§8",
     goal="仓库内规则与本规划一致：AGENTS.md 允许 W1 五线并行且写明冻结面；P07~P15 提示词文首加“已由 parallel-w1 取代”指引",
     inputs="本规划包全部文件；AGENTS.md；docs/design/04_planning/current-plan.md",
     outputs=["docs/design/04_planning/parallel-w1/**（本包原样复制）", "AGENTS.md（§4、§5、§8）", "docs/design/04_planning/review-prompts/P07~P15（仅文首插入取代说明）", "docs/design/04_planning/current-plan.md（文首追加 2026-10-13 裁决行）", "docs/design/03_solution/decisions/ADR-027-并行编排与契约冻结.md"],
     allow=["AGENTS.md", "docs/design/**"],
     steps=["复制规划包到 docs/design/04_planning/parallel-w1/", "AGENTS.md §4 改为：Wave0 串行冻结 → Wave1 五线并行（所有权矩阵）→ Wave2 集成；“推送只在 Final”改为：W0 独立校验 PASS 后推送 upgrade 与 tag w1-base，各线只推自己的 lane 分支（用户 2026-10-13 裁决 D8）；执行者 2 名（D11）", "P07~P15 每份提示词文首插入 3 行取代说明，正文不删", "写 ADR-027（决策、备选=继续串行、后果=冻结面与契约变更请求流程）"],
     accept=["`grep -c \"parallel-w1\" AGENTS.md` ≥ 1", "`for f in docs/design/04_planning/review-prompts/P0[7-9]*.md docs/design/04_planning/review-prompts/P1*.md; do grep -q \"已由 parallel-w1 取代\" \"$f\" || exit 1; done` exit 0", "`git show --name-only --format= <W0-01 的提交>` 只含 AGENTS.md 与 docs/design/**（W0-01 单独提交，不与 W0-02 同批）"],
     verify=["git show --name-only --format= HEAD | grep -vE '^(AGENTS.md|docs/design/)' && exit 1 || echo ok"],
     tier="haiku", tier_why="复制与模板化文字", size="小（<2h，单独提交）", escalate="AGENTS.md 规则与用户裁决冲突时 → opus",
     blocks=["W0-02"])

task(id="W0-02", lane="Z", wp="WP0.2 无行为变化的结构切分", slice="S0 治理刀",
     title="切分 crud-resources.ts 为按域文件、拆出客户端安全的 block-defs",
     req="并行纪律（所有权不相交）；ADR-024；A-ui §0.2-b",
     goal="crud-resources 按 system/content/site/collect/media/kb-ai 六个文件导出，index 聚合后 crudSpecs 键集合与切分前完全相同；BLOCK_REGISTRY 纯数据移至 src/config/block-defs.ts（不 import prisma）",
     inputs="src/lib/crud-resources.ts（440 行）；src/lib/block-registry.ts:10（import prisma）",
     outputs=["src/lib/crud-resources/{index,system,content,site,collect,media,kb-ai}.ts（新）", "src/lib/crud-resources.ts → 仅 `export * from \"./crud-resources/index\"`", "src/config/block-defs.ts（新）", "src/lib/block-registry.ts（改为从 block-defs 引入）", "src/lib/__tests__/w0-structure.test.ts（新）"],
     allow=["src/lib/crud-resources.ts", "src/lib/crud-resources/**", "src/config/block-defs.ts", "src/lib/block-registry.ts", "src/lib/__tests__/w0-structure.test.ts"],
     steps=["切分前导出 `Object.keys(crudSpecs).sort()` 快照写入测试", "按域移动 spec（只剪切粘贴，不改内容）", "抽出 BLOCK_REGISTRY 的 code/name/fields/默认顺序到 block-defs.ts", "跑全量门禁 + visual"],
     accept=["w0-structure.test.ts：每个按域文件导出的键集合 ⊇ 切分前快照（只断言“不丢”，允许各线新增资源）；该测试文件 W1 归 B 线维护", "`grep -n prisma src/config/block-defs.ts` 为空", "既有 210 例单测全部通过", "visual 46/46"],
     verify=[GATE, VIS],
     deps=["W0-01"], tier="sonnect", tier_why="机械搬迁，有快照守卫", size="小~中（0.5 天）", escalate="快照不一致且两次无法定位 → opus")

task(id="W0-03", lane="Z", wp="WP0.3 共享基座模块", slice="S0 治理刀",
     title="新增 json-field / http-client / cache-tags / storage 接口模块（默认实现=现有行为）",
     req="P08 目标 2；P10 写后失效；P14 存储根；规划总指令 §7.3（共享可变状态先冻结接口）",
     goal="四个模块的导出签名冻结且有单测；W0 默认实现零行为变化：uploadsDir()=<cwd>/uploads、backupsDir()=<cwd>/backups、kbDir()=<cwd>/data/kb、dataDir()=<cwd>/data（D-09 改为 DATA_DIR 实现）",
     inputs="A-ui §2.1-#3/#4；C-ops §3；B-domain §3.5",
     outputs=["src/lib/json-field.ts：parseJsonField<T>(s,fallback)、stringifyJsonField(v)", "src/lib/http-client.ts：httpFetch(url,{timeoutMs,retries,headers,logTag})、HttpError", "src/lib/cache-tags.ts：WEB_TAGS 常量 + invalidateWebContent(tags[])（W0 实现 = 调 revalidateTag，try/catch 静默）", "src/lib/storage.ts：dataDir()/uploadsDir()/backupsDir()/kbDir()/resolveInside(root,rel)", "src/lib/__tests__/w0-shared.test.ts"],
     allow=["src/lib/json-field.ts", "src/lib/http-client.ts", "src/lib/cache-tags.ts", "src/lib/storage.ts", "src/lib/__tests__/w0-shared.test.ts"],
     steps=["写先失败测试（json 往返/坏 JSON 回落；http 超时与重试 mock；resolveInside 拒绝 ../ 与绝对路径）", "实现最小代码", "不替换任何调用方（替换由各线完成）"],
     accept=["w0-shared.test.ts 全绿", "`grep -rn \"json-field\\|http-client\\|cache-tags\\|lib/storage\" src --include=*.ts -l` 只命中新文件与测试", "全量门禁通过"],
     verify=[GATE], deps=["W0-02"], tier="sonnect", tier_why="小模块+单测", size="中（0.5 天）", escalate="签名争议 → opus 仲裁并写入 ADR-027")

task(id="W0-04", lane="Z", wp="WP0.4 契约冻结", slice="S0 治理刀",
     title="契约②错误码与错误体冻结 + manager-fetch 透传 fieldErrors",
     req="P13 目标 1；REQ-NF-001；P06 已交付 data.fieldErrors；A-ui §0.2-d",
     goal="code 枚举 = {200,400,401,403,404,409,429,500,502,503}；api-response 提供 conflict/tooManyRequests/badGateway/serviceUnavailable；ApiHttpError 支持 409/429/502/503；400 继续使用 data.fieldErrors；created() 维持 code 200 + HTTP 201；managerFetch 抛出的 ApiError 带 fieldErrors 并按 409/429/502/503 给中文文案",
     inputs="src/contracts/common.ts:14-21,60-67；src/lib/api-response.ts；src/lib/api-handler.ts:24-33,161-169；src/lib/manager-fetch.ts:39-75",
     outputs=["src/contracts/common.ts", "src/lib/api-response.ts", "src/lib/api-handler.ts（仅 ApiHttpError 与 P2002→409 映射）", "src/lib/manager-fetch.ts", "src/components/manager/SchemaForm.tsx（仅 FieldSpec 增 visibleTo?: \"super\" 及隐藏逻辑，isSuper 取自现有会话；无现成来源则读 /api/auth/me）", "src/lib/__tests__/w0-errors.test.ts", "docs/design/03_solution/decisions/ADR-028-响应与错误体口径.md"],
     allow=["src/contracts/common.ts", "src/lib/api-response.ts", "src/lib/api-handler.ts", "src/lib/manager-fetch.ts", "src/components/manager/SchemaForm.tsx", "src/lib/__tests__/w0-errors.test.ts", "src/lib/__tests__/api-contract/with-api.test.ts", "docs/design/03_solution/decisions/ADR-028-*.md"],
     steps=["写 ADR-028：保留 data.fieldErrors（P06 已交付、前端将读取）；created() 维持 code 200（manager-fetch.ts:73 `body.code !== 200` 即抛错，改 code 会让全部创建操作在管理端报错）；P2002→409", "扩枚举与工厂，补测试", "manager-fetch：ApiError.fieldErrors；409/429/502/503 文案进 common.ts toastCopy"],
     accept=["w0-errors.test.ts：每个新工厂 HTTP 与 code 一致（created 除外并有断言）", "withApi 内抛 ApiHttpError(429) → HTTP 429 且 code 429", "P2002 → 409（既有 p03/with-api 测试若断言 400 则同步改并在 ADR 记录）", "managerFetch mock 400 带 fieldErrors → err.fieldErrors 深相等", "FieldSpec.visibleTo=\"super\" 的字段对非超管不渲染（组件或 e2e 断言）"],
     verify=[GATE], deps=["W0-03"], tier="opus", tier_why="冻结契约语义，影响五线", size="中（0.5~1 天）", escalate="改 P2002→409 导致 e2e 断言变化 → 在 ADR 写明并同步测试，仍失败 → fable 裁决",
     assume=["A-W0-1：保留 data.fieldErrors 不改为 details（K9，默认值，待用户确认 D6）", "A-W0-2：created() code=200/HTTP=201（K10，待用户确认 D7）"])

task(id="W0-05", lane="Z", wp="WP0.4 契约冻结", slice="S0 治理刀",
     title="领域契约冻结：chat SSE、kinds、kb、notify quietHours、场景绑定、采集目标库、区块注册表 DTO、kbCoze 设置键",
     req="P09 目标；P12 目标 1/2/5/6/7；P13 目标 2；P07 #5/#7；ADR-024；ADR-025",
     goal="五条执行线所需的全部 DTO/枚举一次性落入 src/contracts/**（zod 唯一源），之后冻结",
     inputs="B-domain §1.2/§3.2；A-ui §1.1-#5/#7；src/contracts/resources.ts:217,220,259-263,274-290；ADR-025",
     outputs=["src/contracts/chat.ts（chatRequestSchema、chatSseEventSchema=meta|delta|done|error 判别联合）", "src/contracts/kinds.ts（CHANNEL_KINDS/LLM_KINDS/COLLECT_TYPES/KB_BACKENDS + 中文 label）", "src/contracts/kb.ts（KB_FILE_EXTS=docx|doc|md|markdown|txt、KB_MAX_FILE_BYTES=10MB、COZE_FILE_TYPE_MAP md/markdown→txt、knowledgeBase/knowledgeFile create/update、kbSearchRequest{query,tags?,baseIds?,topK?}（保留现有 tags 与中文提示）、KB_REJECT_MESSAGE 中文文案）", "src/contracts/resources.ts（notifyRule +quietHours；chatScene +providerIds/temperature/maxTokens/topP，baseIds 与 providerIds 接受 int 数组或 JSON 数组串、统一存为 JSON 数组串（旧的逗号分隔值由 C-07 读取时兼容）；collectSource +knowledgeBaseId；4 处枚举（:276、:303、:331、:404）改为从 kinds 派生）", "src/contracts/blocks.ts（blockRegistryItem DTO、homeBlocksResetRequest）", "src/contracts/index.ts", "src/lib/settings-registry.ts（仅新增 kbCozeProviderId、kbCozeSpaceId〔secret〕两键）", "src/lib/__tests__/w0-contracts.test.ts"],
     allow=["src/contracts/**", "src/lib/settings-registry.ts", "src/lib/__tests__/w0-contracts.test.ts", "src/lib/__tests__/settings-registry.test.ts"],
     steps=["逐项写 zod + 中文错误文案", "枚举改派生后跑全量测试确认零回归", "测试：每个 schema 合法/非法样例；KB 拒绝 pdf/png 扩展名；providerIds 去重与上限 10"],
     accept=["w0-contracts.test.ts 全绿", "`grep -rn 'z.enum(\\[\"website\",\"wechat\"\\])\\|z.enum(\\[\"openai\",\"coze\"\\])\\|z.enum(\\[\"html\",\"rss\"\\])' src/contracts` 为空", "契约自检 4 问（前端/后端/数据/错误码）在 ADR-027 附录逐条回答为“是”"],
     verify=[GATE], deps=["W0-04"], tier="opus", tier_why="冻结五线共享 DTO", size="中（1 天）", escalate="某线需要的字段无法确定 → 标 BLOCKING 并上报，不得猜")

task(id="W0-06", lane="Z", wp="WP0.5 唯一迁移 p12", slice="S0 治理刀",
     title="迁移 p12_knowledge_base + 回滚脚本 + 默认库种子",
     req="P12 目标 1/5/6；ADR-025；current-plan §5（p12 为第 7 位，最后一个迁移）",
     goal="新增 KnowledgeBase、KnowledgeFile 两表；Knowledge +baseId/fileId/chunkIndex；ChatScene +providerIds/temperature/maxTokens/topP；CollectSource +knowledgeBaseId；全部 Int? 无外键、仅 CREATE TABLE/ADD COLUMN/CREATE INDEX；seed 幂等创建“通用知识”“采集资讯”两库并回填 Knowledge.baseId",
     inputs="prisma/schema.prisma:563-614,776-801；P06 迁移审阅做法（P06-verify §3）",
     outputs=["prisma/schema.prisma", "prisma/migrations/<ts>_p12_knowledge_base/migration.sql", "prisma/rollback/p12.sql", "prisma/seed.ts（仅默认库与回填段）", "docs/design/06_validation/evidence/W0/migration-review.md"],
     allow=["prisma/schema.prisma", "prisma/migrations/**（仅新增 p12）", "prisma/rollback/p12.sql", "prisma/seed.ts", "docs/design/06_validation/evidence/W0/**"],
     steps=["`npx prisma migrate dev --create-only --name p12_knowledge_base` 生成后逐行审，出现 RedefineTables/DROP 即改 schema 去掉 relation", "在 p06 状态库副本上 deploy：行数不变、integrity_check=ok、foreign_key_check 空", "rollback 后 schema 与 p06 逐对象全等，再 deploy 可重放", "seed 两次幂等"],
     accept=["`grep -ciE 'DROP|RedefineTables|INSERT INTO \"new_' prisma/migrations/*p12*/migration.sql` = 0", "`npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script` 为空迁移", "副本行数对比表写入证据", "seed 连跑两次 KnowledgeBase 行数 = 2"],
     verify=["npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script", GATE],
     deps=["W0-05"], tier="opus", tier_why="不可逆数据变更", size="中（0.5~1 天）", escalate="必须加外键才能满足需求 → fable 裁决是否接受整表重建")

task(id="W0-07", lane="Z", wp="WP0.6 依赖与测试基建一次性到位", slice="S0 治理刀",
     title="一次性加入 W1 全部新依赖并配置测试收集",
     req="P07 TipTap/a11y；P12 docx 解析；P13 tests/contract；假设 A-5",
     goal="W1 期间任何线都不需要再改 package.json 依赖与 vitest/playwright 配置",
     inputs="origin/main package.json:49-56（@tiptap/* ^3.22.4）；A-ui §1.2；B-domain §1.3-#6",
     outputs=["package.json/package-lock.json：+@tiptap/react @tiptap/pm @tiptap/starter-kit @tiptap/extension-image @tiptap/extension-link @tiptap/extension-placeholder @tiptap/extension-text-align @tiptap/extension-underline（^3.22.4）、+mammoth、devDeps +jsdom +@testing-library/react +@testing-library/dom +@axe-core/playwright", "vitest.config.ts：include 增加 src/**/__tests__/**/*.test.tsx 与 tests/contract/**/*.test.ts；组件测试用文件头 `// @vitest-environment jsdom`", "tests/e2e/global-setup.ts 与 tests/e2e/fixtures/env.ts：预置 ENCRYPTION_KEY、APP_ORIGIN、DATA_DIR（临时目录）、HOSTNAME 的测试值，使 D-03 的生产启动校验在 e2e 下通过", "tests/a11y/playwright.config.ts（复用 e2e 的 webServer 设置）", "docs/design/06_validation/evidence/W0/deps.md（每个包的体积、许可证、用途、引入线）"],
     allow=["package.json", "package-lock.json", "vitest.config.ts", "tests/a11y/playwright.config.ts", "tests/e2e/global-setup.ts", "tests/e2e/fixtures/env.ts", "docs/design/06_validation/evidence/W0/**"],
     steps=["npm i 指定版本；记录 `npm ls` 关键行", "写 1 个 jsdom 冒烟测试与 1 个 tests/contract 占位测试验证收集", "全量门禁 + build"],
     accept=["`node -e \"const p=require('./package.json');const d={...p.dependencies,...p.devDependencies};['@tiptap/react','mammoth','jsdom','@axe-core/playwright','@testing-library/react'].forEach(k=>{if(!d[k])process.exit(1)})\"` exit 0", "jsdom 冒烟测试被 vitest 收集并通过", "build 通过；/manager 包体未变（新依赖尚未被引用）"],
     verify=[GATE], deps=["W0-06"], tier="sonnect", tier_why="依赖安装与配置", size="小（<2h，与 W0-08 同批）", escalate="TipTap 3 与 React 19 peer 冲突 → 上报，parity C6 保持 partial，不得静默降级")

task(id="W0-09", lane="Z", wp="WP0.6 依赖与测试基建一次性到位", slice="S0 治理刀",
     title="跨平台测试可移植性：去掉 shell grep 依赖、修复 Windows 下临时库删除 EPERM（DEF-X-01a/b）",
     req="规划总指令 §9.2（门禁可复现）；V0.2 校准 DEF-X-01a/b（执行者在 Windows 本机 npm test 必挂 1 文件）",
     goal="`npm test` 在 Linux 与 Windows（PowerShell，无 grep）下均 17+ 文件全过，且断言语义不变",
     inputs="src/lib/__tests__/wechat-chat.test.ts:79（execSync grep）；src/lib/__tests__/sqlite-busy-timeout.test.ts:15,81（rmSync 在 libsql 句柄未释放时 EPERM）；执行者 X 报告 DEF-X-01a/b",
     outputs=["src/lib/__tests__/wechat-chat.test.ts：用 node:fs 递归读取 src/lib 并以正则匹配替代 execSync(grep)，匹配集合与原 grep 等价", "src/lib/__tests__/sqlite-busy-timeout.test.ts：afterAll 先关闭 Prisma/libsql 客户端（$disconnect / close）再 rmSync；rmSync 加 maxRetries:5, retryDelay:100", "docs/design/06_validation/evidence/W0/W0-09/portability.md（Linux 与 Windows 两份 npm test 输出摘要）"],
     allow=["src/lib/__tests__/wechat-chat.test.ts", "src/lib/__tests__/sqlite-busy-timeout.test.ts", "docs/design/06_validation/evidence/W0/**"],
     steps=["先在改动前记录原 grep 的匹配行清单（Linux）作为等价性基准", "替换实现后对比匹配清单完全一致", "修 afterAll 释放顺序；在 Windows 本机连续跑 3 次 npm test 不出现 EPERM"],
     accept=["`grep -n \"execSync\" src/lib/__tests__/wechat-chat.test.ts` 为空", "替换前后匹配清单 diff 为空（证据入 portability.md）", "Windows 本机连续 3 次 `npm test` 全过（无 Windows 环境 → 记 UNKNOWN 并写原因，不得写 PASS）", "测试数不减少（≥210）"],
     verify=["npx vitest run src/lib/__tests__/wechat-chat.test.ts src/lib/__tests__/sqlite-busy-timeout.test.ts", GATE], deps=["W0-07"], tier="sonnect", tier_why="测试可移植性小修", size="小（<2h，与 W0-08 同批）", escalate="libsql 句柄无法显式关闭 → 改用每测独立 tmp 目录并在进程退出时清理，仍 EPERM 则上报 opus")

task(id="W0-08", lane="Z", wp="WP0.7 冻结与分发", slice="S0 治理刀",
     title="Wave 0 门禁、独立校验、打冻结标签并分发",
     req="规划总指令 §9.2/§9.3",
     goal="独立验证者给出 PASS；upgrade 上打 tag w1-base；五条线从该 tag 建分支",
     inputs="W0-01~07 全部提交",
     outputs=["docs/design/06_validation/evidence/W0/W0-verify.md", "git tag w1-base"],
     allow=["docs/design/06_validation/evidence/W0/**"],
     steps=["跑全量门禁 + visual + e2e", "独立验证者只看 `git diff bb2c0e5..HEAD` 与命令结果，输出 PASS/FAIL/UNKNOWN", "PASS 后 `git tag w1-base` 并推送 upgrade 与 tag（D8 已裁决）"],
     accept=["W0-verify.md 结论 PASS", "`git diff --name-only bb2c0e5..w1-base` 不含前台路径（src/app/(web)、src/components/web、public、globals.css）", "visual 46/46、e2e 8/8"],
     verify=[GATE, VIS, E2E], deps=["W0-07", "W0-09"], tier="opus", tier_why="冻结点 review", size="小", escalate="连续 2 次 FAIL → 熔断，重写对应 W0 卡")

# ───────────────────────── 执行线 A：管理端组件库 ─────────────────────────
A = "A"
task(id="A-01", lane=A, wp="WPA.1 设计系统基础件", slice="S-A1 管理端设计系统",
     title="管理端基础件（新目录，不动前台在用的 ui 文件）",
     req="REQ-F-015；P07 组件清单；P05-execution:105",
     goal="src/components/manager/ui/ 下提供 Button/IconButton/Input/Textarea/Select/Combobox/Checkbox/Switch/RadioGroup/DateTimeInput/FormField/Sheet/DropdownMenu/Tooltip/Popover/Badge/Card/Skeleton/Kbd/Separator，基于 @base-ui/react，令牌限 [data-theme=manager]；feedback/styles.ts 的 btnCls/inputCls 改为组件",
     inputs="A-ui §A.3/A.4；P02 设计系统节；src/components/manager/feedback/styles.ts",
     outputs=["src/components/manager/ui/**（新）", "src/components/manager/feedback/styles.ts", "src/components/manager/ui/__tests__/*.test.tsx", "docs/design/03_solution/decisions/ADR-033-管理端设计系统.md"],
     allow=["src/components/manager/**（不含 crud-specs.tsx 与 resource-meta/**，归 E 线）", "docs/design/03_solution/decisions/ADR-033-*.md", "docs/design/06_validation/evidence/W1-A/**"],
     forbid=["src/components/ui/button.tsx、input.tsx、textarea.tsx、label.tsx 的 className（前台 6 个文件 + 管理端登录页在用，与 origin/main 逐字一致）"],
     steps=["写 ADR-033（为何新建 manager/ui 而非改 ui/）", "逐件实现 + jsdom 测试（键盘可达、aria、disabled/loading）", "styles.ts 85 处引用逐步替换（可跨 A-06~A-08 完成）"],
     accept=["`git diff --stat w1-base -- src/components/ui/button.tsx src/components/ui/input.tsx src/components/ui/textarea.tsx src/components/ui/label.tsx` 为空", "组件测试全绿", "visual 46/46"],
     verify=["npx vitest run src/components/manager/ui", GATE, VIS],
     deps=["W0-08"], tier="sonnect", tier_why="组件实现", size="大（2 天）", escalate="base-ui 缺件 → opus 决定自实现或保留 radix 至 A-06")

task(id="A-02", lane=A, wp="WPA.2 数据表格", slice="S-A2 列表可排序筛选批量",
     title="DataTable：排序/筛选 chips/列显隐/密度/行选择+批量/每页条数/URL 同步/窄屏卡片",
     req="REQ-F-015；P07 #1；P05-verify:39（375 溢出）",
     goal="一个 DataTable 组件覆盖 25 个规格页与 6 个特殊页的表格需求；行操作保留直出按钮（兼容现有 e2e getByRole）",
     inputs="A-ui §1.1-#1、§1.3 E2E 选择器清单；CrudPage.tsx:53（PAGE_SIZE=10）",
     outputs=["src/components/manager/DataTable.tsx", "src/components/manager/Pagination.tsx", "src/components/manager/feedback/TableState.tsx", "src/components/manager/__tests__/data-table.test.tsx"],
     allow=["src/components/manager/**（不含 crud-specs.tsx 与 resource-meta/**，归 E 线）"],
     steps=["定义列规格类型（render: text/image/badge/boolean/date/relative-time/money/link）", "URL 同步 ?page&limit&keyword&sort&filters", "<768px 切卡片视图，操作列不截断", "组件测试 + 保留全部既有 data-testid"],
     accept=["data-table.test.tsx：排序、筛选、全选/批量回调、每页 10/20/50/100", "375 宽无横向滚动（E-08 responsive 用例）", "既有 e2e 8/8 不改选择器即通过"],
     verify=["npx vitest run src/components/manager/__tests__/data-table.test.tsx", GATE, E2E],
     deps=["A-01"], tier="sonnect", tier_why="组件实现", size="大（2 天）", escalate="某特殊页无法用 DataTable 表达 → opus 仲裁允许组合基础件")

task(id="A-03", lane=A, wp="WPA.3 表单体系", slice="S-A3 表单分区与字段级错误",
     title="ResourceForm + 字段件（Json/Secret/Relation/Tags/Image+MediaPicker/DateTime）+ 服务端 fieldErrors 标红",
     req="REQ-F-015；P07 #2；W0-04 fieldErrors",
     goal="表单支持 sections/折叠高级设置、Ctrl/⌘+S、未保存提示、远程关联搜索、媒体库选择；后端 400 的 data.fieldErrors 逐字段 aria-invalid",
     inputs="SchemaForm.tsx:13-15,97-113,146；manager-fetch ApiError.fieldErrors（W0-04）",
     outputs=["src/components/manager/ResourceForm.tsx", "src/components/manager/fields/**", "src/components/manager/SchemaForm.tsx（兼容层）", "src/components/manager/__tests__/resource-form.test.tsx", "tests/e2e/a-form-errors.spec.ts"],
     allow=["src/components/manager/**（不含 crud-specs.tsx 与 resource-meta/**，归 E 线）", "tests/e2e/a-*.spec.ts"],
     steps=["字段类型扩展且 FieldSpec 向后兼容", "MediaPicker 用 /api/media 列表 + /api/upload", "fieldErrors 映射测试"],
     accept=["resource-form.test.tsx：JsonField 非法 JSON 报错；mock 400 fieldErrors → 对应字段 aria-invalid=true", "e2e：提交非法 slug 后字段标红（A-03 自带 e2e 用例 tests/e2e/a-form-errors.spec.ts）"],
     verify=["npx vitest run src/components/manager/__tests__/resource-form.test.tsx", GATE],
     deps=["A-01"], tier="sonnect", tier_why="组件实现", size="大（2 天）", escalate="—")

task(id="A-04", lane=A, wp="WPA.4 通用资源页", slice="S-A4 规格页统一",
     title="CrudPage 重写为 PageHeader + DataTable + ResourceForm（25 个规格页零改文件迁移）",
     req="REQ-F-015；基础目标“统一风格/标准组件/完整 CRUD”",
     goal="CrudPageSpec/RowAction 向后兼容；所有 data-testid 保留；CrudPage 内无原生 table/button/input",
     inputs="CrudPage.tsx（383 行）",
     outputs=["src/components/manager/CrudPage.tsx"],
     allow=["src/components/manager/**（不含 crud-specs.tsx 与 resource-meta/**，归 E 线）"],
     steps=["新实现 + 逐个打开 25 个规格页人工检查", "e2e 全量"],
     accept=["`grep -cE \"<(table|button|input|select|textarea)(\\s|>|$)\" src/components/manager/CrudPage.tsx` = 0", "e2e 8/8"],
     verify=[GATE, E2E], deps=["A-02", "A-03"], tier="sonnect", tier_why="组合", size="中（1 天）", escalate="—")

task(id="A-05", lane=A, wp="WPA.3 表单体系", slice="S-A5 富文本恢复",
     title="RichTextField（TipTap，动态导入）+ MarkdownField（编辑/预览）",
     req="REQ-F-013 parity C6；REQ-NF-001（包体）",
     goal="富文本恢复为 TipTap，提交前 sanitizeRichContent；RichTextField 用 next/dynamic 懒加载，/manager 首屏包体不因 TipTap 增长（相对 w1-base 测量 ≤ +2%）",
     inputs="origin/main components/manager/RichTextField.tsx、fields/RichTextEditor.tsx；src/lib/markdown.ts:59",
     outputs=["src/components/manager/fields/RichTextField.tsx", "src/components/manager/fields/MarkdownField.tsx"],
     allow=["src/components/manager/**（不含 crud-specs.tsx 与 resource-meta/**，归 E 线）", "tests/e2e/a-*.spec.ts"],
     steps=["移植 main 的编辑器工具栏（标题/加粗/斜体/下划线/列表/对齐/链接/图片走媒体库）", "next/dynamic(ssr:false) 包装", "Markdown 预览复用 MarkdownRenderer（只 import，不改前台文件）"],
     accept=["`grep -rn \"next/dynamic\" src/components/manager/fields/RichTextField.tsx` 命中", "e2e a-richtext.spec.ts：插入 <script> 保存后前台详情页不含 script 标签", "/manager JS gzip 相对 w1-base ≤ +2%（scripts/measure-baseline.mjs 由 D 线提供，W2-04 复核）"],
     verify=["npx playwright test -c tests/e2e/playwright.config.ts tests/e2e/a-richtext.spec.ts", GATE],
     deps=["A-03"], tier="sonnect", tier_why="移植", size="中（1.5 天）", escalate="TipTap 与 React19 运行时报错两次 → 上报，不降级为 textarea")

task(id="A-06", lane=A, wp="WPA.6 依赖收敛与质量", slice="S-A1 管理端设计系统",
     title="移除 @radix-ui 的代码引用（依赖删除在 W2-03）",
     req="P07 #6（radix 实际 7 处在用）",
     goal="FormDialog/DetailDialog/ConfirmDialog/AppShell/CommandPalette 改用 base-ui；ui/dialog.tsx 删除（零引用）；ui/label.tsx 改为原生 <label> 且 className 不变",
     inputs="A-ui §1.1-#6",
     outputs=["上述 7 个文件"],
     allow=["src/components/manager/**（不含 crud-specs.tsx 与 resource-meta/**，归 E 线）", "src/components/ui/dialog.tsx", "src/components/ui/label.tsx"],
     steps=["逐个替换并保留焦点陷阱/Esc/aria", "ui/label.tsx 渲染结果 HTML 对比（class 不变）"],
     accept=["`grep -rn \"@radix-ui\" src` 为空", "visual 46/46（前台 ApplyForm 引用 label，外观不变）", "e2e 8/8"],
     verify=["grep -rn '@radix-ui' src && exit 1 || echo ok", VIS, E2E],
     deps=["A-07"], tier="sonnect", tier_why="替换", size="中（1 天）", escalate="焦点管理回归两次 → opus")

task(id="A-07", lane=A, wp="WPA.5 组件发布点 M1", slice="S-A4 规格页统一",
     title="组件发布点 M1：A-01~A-04 独立校验后合入 upgrade 并打 tag w1-ui-kit",
     req="规划总指令 §7.1（契约冻结、所有权不相交）；本规划 06-依赖DAG与并行判定.md §2（唯一的线间中途合并点）",
     goal="E 线可在不等待 A 线全部完成的情况下消费 DataTable/ResourceForm/新 CrudPage；合并只含 A 所有路径",
     inputs="A-01~A-04 提交与证据",
     outputs=["upgrade 上的合并提交", "git tag w1-ui-kit", "docs/design/06_validation/evidence/W1-A/M1-verify.md"],
     allow=["src/components/manager/**（不含 crud-specs.tsx 与 resource-meta/**，归 E 线）", "src/components/ui/dialog.tsx", "src/components/ui/label.tsx", "src/components/ui/checkbox.tsx", "src/components/ui/scroll-area.tsx", "src/components/ui/select.tsx", "src/components/ui/switch.tsx", "src/components/ui/table.tsx", "src/components/ui/tabs.tsx", "tests/e2e/a-*.spec.ts", "docs/design/06_validation/evidence/W1-A/**", "docs/design/03_solution/decisions/ADR-033-*.md"],
     steps=["独立验证者只看 `git diff w1-base..lane/a-manager-ui` 与命令结果", "PASS 后合并到 upgrade（fast-forward 或 merge commit），打 tag", "E 线在开工 E-05 前执行 `git fetch --tags && git merge --no-ff w1-ui-kit`（无需实时通知，按 tag 是否存在判断）"],
     accept=["M1-verify.md 结论 PASS", "`git diff --name-only w1-base..w1-ui-kit` 全部属于 A 线所有权", "合并后 GATE、VIS、E2E 全绿"],
     verify=[GATE, VIS, E2E], deps=["A-04"], tier="opus", tier_why="中途合并点 review", size="小（<2h）", escalate="FAIL → A 线修复后重来；E 线 E-05/E-06 顺延，其余 E 卡不受影响")

task(id="A-08", lane=A, wp="WPA.6 依赖收敛与质量", slice="S-A6 组件可访问",
     title="组件层 a11y/响应式修复（响应 E-08 的“交 A-08”清单）",
     req="M-3；REQ-F-015",
     goal="E-08 清单中所有组件层问题修复后，tests/a11y 扫描 serious/critical = 0，e-responsive 与 e-components 全部通过",
     inputs="docs/design/06_validation/evidence/W1-E/a11y-report.md",
     outputs=["src/components/manager/**（A 所有部分）", "docs/design/06_validation/evidence/W1-A/a11y-fix.md"],
     allow=["src/components/manager/ui/**", "src/components/manager/fields/**", "src/components/manager/feedback/**", "src/components/manager/shell/**", "src/components/manager/__tests__/**", "src/components/manager/CrudPage.tsx", "src/components/manager/DataTable.tsx", "src/components/manager/ResourceForm.tsx", "src/components/manager/SchemaForm.tsx", "src/components/manager/FormDialog.tsx", "src/components/manager/DetailDialog.tsx", "src/components/manager/Pagination.tsx", "docs/design/06_validation/evidence/W1-A/**"],
     steps=["E 线分支合并本线最新代码后在 E 分支上复测（只读）", "逐条修复并回填清单"],
     accept=["`npx playwright test -c tests/a11y/playwright.config.ts` serious/critical = 0（在合入 A+E 的临时集成分支上）", "e-responsive、e-components 全部通过", "visual 46/46"],
     verify=["npx playwright test -c tests/a11y/playwright.config.ts", VIS, GATE], deps=["A-06", "E-08"], tier="sonnect", tier_why="修复", size="中（1 天）", escalate="axe 规则与设计冲突 → opus 裁决并记 ADR-033")


# ───────────────────────── 执行线 E：管理端页面与功能 ─────────────────────────
E = "E"
task(id="E-01", lane=E, wp="WPE.1 契约对齐与护栏", slice="S-E1 表单与契约一致",
     title="表单规格对齐冻结契约（承接项小修）+ 规格漂移护栏测试",
     req="REQ-F-015；P06-execution:109；P06-verify:92；P08 #2（真实漂移 11 资源）",
     goal="content-items 状态只剩 draft/pending_review/offline 且有“提交审核/审核”行操作；collect-sources 有 autoToKb、autoApprove（仅超管可见可改）、cron 留空=仅手动提示、knowledgeBaseId 选择；chat-scenes 有专属模型/优先级/参数/知识库；11 个资源缺失字段补齐或在白名单写明有意省略",
     inputs="A-ui §1.3、§3；src/components/manager/crud-specs.tsx；W0-05 契约",
     outputs=["src/components/manager/crud-specs.tsx", "src/app/manager/{content-hub,publish-jobs}/page.tsx", "src/components/manager/resource-meta/__tests__/spec-drift.test.ts"],
     allow=["src/components/manager/crud-specs.tsx", "src/components/manager/resource-meta/**", "src/app/manager/**"],
     steps=["先写 spec-drift.test.ts（读取契约 schema 的 shape 与 enum.options 和 crud-specs 比对）→ 记录失败", "逐资源补字段/改枚举，直到只剩白名单", "publish-jobs 去掉 limit=100 回填", "chat-scenes 的知识库与模型优先级改为多选，提交 int 数组（契约接受数组或 JSON 串）"],
     accept=["spec-drift.test.ts 通过且白名单每项附理由", "e2e collect-publish 通过", "非超管登录看不到 autoApprove 字段（e2e 或组件测试）"],
     verify=["npx vitest run src/components/manager/resource-meta/__tests__/spec-drift.test.ts", GATE, E2E],
     deps=["W0-08"], tier="sonnect", tier_why="规格修补", size="中（1 天）", escalate="会话中拿不到 isSuper → opus 判断是否需契约变更请求")

task(id="E-02", lane=E, wp="WPE.2 缺失管理页", slice="S-E2 通知规则可配置",
     title="通知规则页 + 菜单（含静默时段）",
     req="REQ-F-011；I8；P07 #5；W0-05 quietHours",
     goal="/manager/notify-rules 可查看 7 类事件规则，编辑启用/模板/收件人分组/静默时段并保存回读一致",
     inputs="api/notify-rules（GET withApi、PATCH）；seed.ts:164-172",
     outputs=["src/app/manager/notify-rules/page.tsx", "prisma/seed.ts（group-notify 下新增 1 条菜单，权限 notify:list）"],
     allow=["src/app/manager/**", "prisma/seed.ts", "tests/e2e/e-*.spec.ts"],
     steps=["页面 + e2e e-notify-rules.spec.ts", "seed 菜单段幂等"],
     accept=["e2e：切换 enabled 与 quietHours 保存后刷新回读一致", "seed 连跑两次菜单不重复"],
     verify=["npx playwright test -c tests/e2e/playwright.config.ts tests/e2e/e-notify-rules.spec.ts", GATE],
     deps=["W0-08"], tier="sonnect", tier_why="页面", size="中（0.75 天）", escalate="PATCH 不接受 quietHours（B 线未合并）→ 页面先完成，e2e 标 待其他员工完成，W2-05 复跑")

task(id="E-03", lane=E, wp="WPE.2 缺失管理页", slice="S-E3 首页区块可配置",
     title="ADR-024 三页：首页区块配置、页面模板、交互点配置 + 注册表/恢复默认端点 + 3 条菜单",
     req="REQ-F-013 parity C9/C10；ADR-024",
     goal="管理员可拖拽排序、启停首页区块、按 block-defs 的 fields 编辑；“恢复默认”= main 原样；禁用一个区块后前台不再渲染该 data-block，恢复默认后 visual 仍 46/46",
     inputs="src/config/block-defs.ts（W0-02）；api/{content-blocks,page-templates,template-blocks,element-configs}",
     outputs=["src/app/manager/{home-blocks,page-templates,element-configs}/page.tsx", "src/app/api/home-blocks/registry/route.ts（GET，withApi，block:list）", "src/app/api/home-blocks/reset/route.ts（POST，withApi，block:edit）", "prisma/seed.ts（3 条菜单）", "tests/e2e/e-home-blocks.spec.ts"],
     allow=["src/app/manager/**", "src/app/api/home-blocks/**", "prisma/seed.ts", "tests/e2e/e-*.spec.ts"],
     steps=["两个新端点用 withApi + W0 契约 blockRegistryItem/homeBlocksResetRequest", "页面 + 拖拽（键盘可替代：上移/下移按钮）", "e2e 禁用→前台不渲染→恢复默认"],
     accept=["e2e e-home-blocks.spec.ts 通过", "恢复默认后 `npm run test:visual` 46/46", "未登录访问 registry → 401，无 block 权限 → 403"],
     verify=["npx playwright test -c tests/e2e/playwright.config.ts tests/e2e/e-home-blocks.spec.ts", VIS, GATE],
     deps=["W0-08"], tier="sonnect", tier_why="页面+两个端点", size="大（2 天）", escalate="前台缓存（D-06）导致 5 秒内不可见 → W2 集成时由 D 线修 invalidate，E 线 e2e 加等待≤5s")

task(id="E-04", lane=E, wp="WPE.2 缺失管理页", slice="S-E4 知识库可管理",
     title="知识库管理页（库列表/详情/文件拖拽上传/进度/条目/检索测试）+ AI 场景表单分区 + 菜单",
     req="REQ-F-007；ADR-025；M-10/M-11",
     goal="管理员可新建/绑定 Coze 库、上传 Word/MD/TXT（PDF/图片在前端即拦截并显示后端同款中文提示）、看同步进度、做检索测试；场景表单分区：基础/模型与参数/知识库",
     inputs="W0-05 kb 契约；C 线端点（按契约开发，e2e 在 W2-05 合并后跑）",
     outputs=["src/app/manager/knowledge-bases/**", "src/app/manager/knowledge/page.tsx", "src/app/manager/chat-scenes/page.tsx", "src/components/manager/crud-specs.tsx", "prisma/seed.ts（知识库菜单）", "tests/e2e/e-knowledge.spec.ts"],
     allow=["src/app/manager/**", "src/components/manager/crud-specs.tsx", "src/components/manager/resource-meta/**", "prisma/seed.ts", "tests/e2e/e-*.spec.ts"],
     steps=["按契约开发；C 线未合并前用组件测试 mock", "e2e 写好但标注依赖 C-06"],
     accept=["组件测试：选择 .pdf/.png → 不发请求并显示 KB_REJECT_MESSAGE", "W2-05：e2e e-knowledge.spec.ts 通过（上传 .md → 条目数>0；上传 .pdf → 400 提示）"],
     verify=["npx vitest run src/components/manager", GATE],
     deps=["W0-08"], tier="sonnect", tier_why="页面", size="大（2 天）", escalate="契约不足以完成页面 → 契约变更请求，不得自定 DTO")

task(id="E-05", lane=E, wp="WPE.3 特殊页迁移", slice="S-E5 内容链页面统一",
     title="特殊页迁移 A：articles（接 PATCH 一键上下线）、publish-jobs、collect-items、content-hub",
     req="REQ-F-015；P03-execution:104（B3 文章 PATCH 前端未接）",
     goal="四页只用设计系统组件；文章列表行操作“上线/下线”调用 PATCH /api/articles/[id]",
     inputs="A-ui §A.1 行数；articles/[id]/route.ts:178",
     outputs=["src/app/manager/{articles,publish-jobs,collect-items,content-hub}/page.tsx"],
     allow=["src/app/manager/**", "src/components/manager/crud-specs.tsx", "src/components/manager/resource-meta/**", "tests/e2e/crud-article.spec.ts", "tests/e2e/collect-publish.spec.ts"],
     steps=["逐页替换，保留 testid", "crud-article.spec 增加“保存后重新 GET 断言持久化”（P05-verify:41）"],
     accept=["严格正则 `grep -rnE \"<(table|input|select|button|textarea)(\\s|>|$)\" src/app/manager/{articles,publish-jobs,collect-items,content-hub}` 为空", "e2e crud-article/collect-publish 通过"],
     verify=[GATE, E2E], deps=["A-07"], tier="sonnect", tier_why="页面迁移", size="大（2 天）", escalate="—")

task(id="E-06", lane=E, wp="WPE.3 特殊页迁移", slice="S-E6 系统与 AI 页面统一",
     title="特殊页迁移 B：llm-providers、wechat-accounts、media（改名+批量接口）、chat-history、settings、仪表盘、login、logs 筛选、not-found",
     req="REQ-F-015；parity B7（媒体 PATCH）、B8（media/batch）、C4/C5",
     goal="/manager 全部页面严格正则计数 = 0；媒体库可改名、批量删除调 /api/media/batch；logs 可按模块/动作/时间筛选；login 改用 manager/ui（不再引用前台共享 ui/Input）",
     inputs="A-ui §1.2 按文件计数；media/page.tsx:74",
     outputs=["src/app/manager/{llm-providers,wechat-accounts,media,chat-history,settings,login,logs}/page.tsx", "src/app/manager/page.tsx", "src/app/manager/not-found.tsx（新）", "src/components/manager/crud-specs.tsx（logs filters）"],
     allow=["src/app/manager/**", "src/components/manager/crud-specs.tsx", "src/components/manager/resource-meta/**", "tests/e2e/auth.spec.ts", "tests/e2e/apply-chat.spec.ts"],
     steps=["逐页迁移", "settings 页按 registry 分组渲染，secret 用 SecretField"],
     accept=["`grep -rnE \"<(table|input|select|button|textarea)(\\s|>|$)\" src/app/manager` 为空", "e2e auth/apply-chat 通过", "`grep -rn \"components/ui/input\\|components/ui/label\" src/app/manager` 为空"],
     verify=[GATE, E2E], deps=["A-07"], tier="sonnect", tier_why="页面迁移", size="大（2 天）", escalate="—")

task(id="E-07", lane=E, wp="WPE.4 规格单源派生", slice="S-E7 规格从契约派生",
     title="管理端规格从契约派生（resource-meta + derive），crud-specs ≤ 200 行",
     req="P08 目标 1（以审计修正后的口径：契约→crud-specs）",
     goal="字段键与枚举 options 由 zod schema 派生（.shape / .options），手写只剩 label、控件提示与特殊行为；新资源（blocks、kb）纳入",
     inputs="A-ui §3（字段重合 156/漂移 25）；W0-05 冻结契约",
     outputs=["src/components/manager/resource-meta/**（新）", "src/components/manager/crud-specs.tsx", "src/components/manager/resource-meta/__tests__/derive.test.ts"],
     allow=["src/components/manager/crud-specs.tsx", "src/components/manager/resource-meta/**"],
     steps=["试点 3 个资源 → 全量", "spec-drift.test.ts 继续为绿"],
     accept=["`test $(wc -l < src/components/manager/crud-specs.tsx) -le 200`", "derive.test.ts 与 spec-drift.test.ts 全绿", "e2e 全量通过"],
     verify=["npx vitest run src/components/manager/resource-meta", GATE, E2E],
     deps=["E-05", "E-06", "E-03"], tier="sonnect", tier_why="重构", size="中（1.5 天）", escalate="zod 4 元数据不足 → 并列 meta 对象（仍在 resource-meta/），不得回到手写字段键")

task(id="E-08", lane=E, wp="WPE.5 质量门", slice="S-E8 可访问性与响应式",
     title="a11y 扫描、管理端响应式（375/768/1440）与组件 E2E",
     req="M-3（axe serious/critical=0、375 可用）；P13 目标 4",
     goal="tests/a11y/manager.spec.ts 覆盖 10 个代表页；tests/e2e/e-responsive.spec.ts 断言 scrollWidth ≤ innerWidth；e-components.spec.ts 覆盖排序/筛选/批量删除/字段标红",
     inputs="W0-07 的 @axe-core/playwright 与 tests/a11y/playwright.config.ts",
     outputs=["tests/a11y/manager.spec.ts", "tests/e2e/e-responsive.spec.ts", "tests/e2e/e-components.spec.ts", "docs/design/06_validation/evidence/W1-E/a11y-report.md"],
     allow=["tests/a11y/*.spec.ts", "tests/e2e/e-*.spec.ts", "src/components/manager/crud-specs.tsx", "src/components/manager/resource-meta/**", "src/app/manager/**", "docs/design/06_validation/evidence/W1-E/**"],
     steps=["写用例并运行", "页面层问题（E 所有路径）就地修复", "组件层问题（A 所有路径）逐条写入 a11y-report.md 的“交 A-08”清单，不越界修改", "截图存证"],
     accept=["三个用例文件存在且可运行", "页面层 serious/critical = 0；剩余项全部归属组件且已列入交 A-08 清单（含规则 id、页面、选择器）", "e-responsive、e-components 中不依赖组件修复的用例通过"],
     verify=["npx playwright test -c tests/a11y/playwright.config.ts", "npx playwright test -c tests/e2e/playwright.config.ts tests/e2e/e-responsive.spec.ts tests/e2e/e-components.spec.ts", VIS],
     deps=["E-07"], tier="opus", tier_why="可访问性审查（opus 券 1 次）+ sonnect 修复", size="中（1 天）", escalate="axe 规则与设计冲突 → opus 裁决并记 ADR-033")


# ───────────────────────── 执行线 B：API 与响应平台 ─────────────────────────
B = "B"
task(id="B-01", lane=B, wp="WPB.1 公共工具收敛", slice="S-B1 设置读取单一语义",
     title="settings 读取分为 getPublicSettings / getAllSettings（getSettings 保留为已弃用别名）",
     req="P08 #5（3 处 `getAllSettings as getSettings` 同名不同义）",
     goal="两个新名字语义清晰；前台 9 个文件零改动；B 线自有文件改用新名",
     inputs="src/lib/settings.ts:16,33",
     outputs=["src/lib/settings.ts", "src/lib/__tests__/lane-b/settings.test.ts"],
     allow=["src/lib/settings.ts", "src/lib/__tests__/lane-b/**", "src/app/api/settings/**", "src/app/api/wechat/**"],
     steps=["新增导出 + @deprecated 注释", "wechat/callback 删除未用 settings 变量（P06-verify:93）"],
     accept=["lane-b/settings.test.ts：公开读取不含 isPublic=false 键，全量读取包含", "visual 46/46（前台未改文件）"],
     verify=[GATE, VIS], deps=["W0-08"], tier="sonnect", tier_why="小重构", size="小（<2h，与 B-05 同批）", escalate="—")

task(id="B-02", lane=B, wp="WPB.2 路由统一包装", slice="S-B2 后台路由统一信封与异常告警",
     title="withApi 迁移 A：后台路由（users×2、roles×2、settings×3、manager-menus、wechat/accounts×2、articles/[id] 的 GET/PUT/DELETE）",
     req="P08 #6；P06-verify 承接（未走 withApi 的异常不发 system_error）",
     goal="上述路由全部经 withApi（鉴权/parseBody/错误映射/system_error），对外信封与状态码不变；roles 的 JSON.parse 改 json-field",
     inputs="A-ui §2.3 清单与行数",
     outputs=["对应 route.ts", "src/lib/__tests__/lane-b/routes-admin.test.ts"],
     allow=["src/app/api/users/**", "src/app/api/roles/**", "src/app/api/settings/**", "src/app/api/manager-menus/**", "src/app/api/wechat/**", "src/app/api/articles/**", "src/lib/__tests__/lane-b/**", "src/lib/__tests__/api-contract/**"],
     steps=["每迁一个路由先写 401/403/400/200 契约用例（复用 api-contract/harness.ts）", "迁移后用例不变即通过", "settings PUT 成功后调用 invalidateWebContent([WEB_TAGS.settings])"],
     accept=["`grep -rLE \"withApi|crudList|crudCreate|crudGet|crudUpdate|crudDelete\" src/app/api/{users,roles,settings,manager-menus,wechat/accounts} --include=route.ts` 为空", "articles/[id]/route.ts 中不存在未包装的 export async function", "routes-admin.test.ts 全绿；e2e auth/crud-article 通过"],
     verify=[GATE, E2E], deps=["B-01"], tier="sonnect", tier_why="模式化迁移", size="大（1.5 天）", escalate="某路由响应形状被前台依赖且迁移后变化 → 停止该路由并上报")

task(id="B-03", lane=B, wp="WPB.2 路由统一包装", slice="S-B3 公开与认证路由统一",
     title="withApi 迁移 B：apply、articles 列表、auth×4、user-actions、api 根；非 JSON 例外清单",
     req="P08 #6；P13 #3/#4",
     goal="仅剩协议例外（file、health、wechat/callback 的 XML/echostr）未走 withApi，并登记在证据 non-json-routes.md（W2-02 写入 tests/contract/rules.ts）；api 根改用 success()",
     inputs="A-ui §2.3；B-domain §1.3-#3/#4",
     outputs=["对应 route.ts", "docs/design/06_validation/evidence/W1-B/non-json-routes.md（协议例外清单与理由，W2-02 写入守卫）"],
     allow=["src/app/api/apply/**", "src/app/api/articles/**", "src/app/api/auth/**", "src/app/api/user-actions/**", "src/app/api/route.ts", "src/app/api/health/**", "src/app/api/wechat/**", "src/lib/__tests__/lane-b/**", "docs/design/06_validation/evidence/W1-B/**"],
     steps=["auth 路由保留 cookie 设置行为", "apply 保留限流与中文文案", "例外清单附理由"],
     accept=["`grep -rLE \"withApi|crudList|crudCreate|crudGet|crudUpdate|crudDelete\" src/app/api --include=route.ts` 只剩例外清单内文件（另含 D/C 线负责的 upload、llm/providers，见其卡）", "`grep -rn \"NextResponse.json(\" src/app/api | grep -v api-response` 为空", "e2e auth/apply-chat 通过"],
     verify=[GATE, E2E], deps=["B-02"], tier="sonnect", tier_why="模式化迁移", size="中（1 天）", escalate="—")

task(id="B-04", lane=B, wp="WPB.1 公共工具收敛", slice="S-B4 外呼与 JSON 统一",
     title="B 线自有文件改用 http-client 与 json-field（wechat、notify-gateway、auth）",
     req="P08 目标 2；A-ui §2.1-#3/#4",
     goal="wechat.ts 6 处 AbortSignal.timeout 改 httpFetch；auth.ts、notify-gateway.ts、wechat.ts 的 DB JSON 解析改 parseJsonField",
     inputs="A-ui §2.1-#3 文件:行清单",
     outputs=["src/lib/{wechat,notify-gateway,auth}.ts"],
     allow=["src/lib/wechat.ts", "src/lib/notify-gateway.ts", "src/lib/auth.ts", "src/lib/__tests__/lane-b/**", "src/lib/__tests__/wechat-chat.test.ts"],
     steps=["替换 + 既有 wechat-chat/notify 测试回归"],
     accept=["`grep -n \"AbortSignal.timeout\\|JSON.parse\" src/lib/wechat.ts src/lib/notify-gateway.ts src/lib/auth.ts` 为空", "wechat-chat.test.ts、notify-before-publish.test.ts 通过"],
     verify=[GATE], deps=["B-01"], tier="sonnect", tier_why="替换", size="小（0.5 天）", escalate="—")

task(id="B-05", lane=B, wp="WPB.3 发布渠道注册表", slice="S-B5 发布渠道可扩展",
     title="PublishChannel 注册表（website/wechat）+ 发布后写失效",
     req="P09 目标（发布渠道部分）；P10 写后失效",
     goal="publish-executor 只做状态机/审核门/提醒/退避，渠道实现 src/lib/channels/{website,wechat}.ts 经 getChannel(kind) 调用；网站发布成功后 invalidateWebContent([WEB_TAGS.articles, WEB_TAGS.home])；content-workflow 用 CHANNEL_KINDS",
     inputs="B-domain §2.1（publish-executor.ts:19-55,79-170）",
     outputs=["src/lib/channels/**", "src/lib/publish-executor.ts", "src/lib/content-workflow.ts", "docs/design/03_solution/decisions/ADR-030-发布渠道注册表.md"],
     allow=["src/lib/channels/**", "src/lib/publish-executor.ts", "src/lib/content-workflow.ts", "src/lib/__tests__/lane-b/**", "src/lib/__tests__/publish-state-machine.test.ts", "src/lib/__tests__/notify-before-publish.test.ts", "src/lib/__tests__/content-review.test.ts", "docs/design/03_solution/decisions/ADR-030-*.md"],
     steps=["先写 registries 测试（未知 kind → 明确错误）", "搬迁实现，行为等价"],
     accept=["`grep -n 'channel === \"' src/lib/publish-executor.ts src/lib/content-workflow.ts` 为空", "publish-state-machine/notify-before-publish/content-review 测试通过", "e2e collect-publish 通过"],
     verify=[GATE, E2E], deps=["B-04"], tier="opus", tier_why="架构接口（opus 券）+ sonnect 实现", size="中（0.5~1 天）", escalate="行为差异无法用现有测试定位 → 补测试后再继续")

task(id="B-06", lane=B, wp="WPB.4 通知可靠性", slice="S-B6 提醒更可靠",
     title="通知：静默时段生效、去重跨进程原子化并细化键、邮件堆栈脱敏、notify-rules PATCH 接收 quietHours",
     req="REQ-F-011；M-13；P06-verify:90（堆栈未脱敏；去重的串行化仅进程内）",
     goal="静默时段内事件只记录 NotifyRecord(status=deferred) 不发信、时段结束后补发；去重现状已按 NotifyRecord 查库（notify-gateway.ts:59-63），但串行化只在进程内（:39-48），两进程并发可能都通过检查 → 改为原子判定（单条 SQL 条件插入或唯一去重键列复用），并把去重键细化为 event + 路由/任务名 + 10 分钟窗；不得重写已有去重逻辑以外的部分；邮件正文中的 token/key/password 形态字串替换为 ***",
     inputs="src/lib/notify-gateway.ts:39-48,59-63；schema.prisma:876 quietHours；W0-05 契约",
     outputs=["src/lib/notify-gateway.ts", "src/app/api/notify-rules/**", "src/lib/__tests__/lane-b/notify.test.ts"],
     allow=["src/lib/notify-gateway.ts", "src/app/api/notify-*/**", "src/lib/__tests__/lane-b/**", "src/lib/__tests__/notify-before-publish.test.ts"],
     steps=["静默时段按 Asia/Shanghai 解释", "补发由已有 notify.scan 任务调用（jobs 属 D 线：只调用 notify-gateway 导出的 flushDeferred，若 jobs/index.ts 未注册 → 契约变更请求给 D 线，W2 合并）"],
     accept=["notify.test.ts：静默内不发、结束后补发；两个模拟进程 5 次异常只生成 1 条 system_error；正文不含 'hunter2'", "PATCH quietHours 后 GET 回读一致"],
     verify=[GATE], deps=["B-04"], tier="sonnect", tier_why="业务逻辑+测试", size="中（1 天）", escalate="需要新表/新列 → 停止（迁移已冻结），改用 NotifyRecord 现有列")

# ───────────────────────── 执行线 C：AI 与知识库 ─────────────────────────
C = "C"
task(id="C-01", lane=C, wp="WPC.1 LLM 适配器注册表", slice="S-C1 模型供应商可扩展",
     title="LLMProviderAdapter 注册表（openai/coze）+ providers 路由 withApi + 测试端点复用适配器",
     req="P09 目标（LLM 部分）；P08 #6（llm/providers×3 未包装）",
     goal="llm-gateway 只保留路由/熔断/统计；`kind === \"coze\"` 分支在 src/lib 与 src/app/api 中为 0；providers 三路由走 withApi；coze/llm-gateway 改用 http-client",
     inputs="B-domain §2.2；llm-gateway.ts:79-123,156,194；providers/[id]/test/route.ts:33-53；kb-adapter.ts:86",
     outputs=["src/lib/llm/{types,registry,openai,coze}.ts", "src/lib/llm-gateway.ts", "src/lib/coze.ts", "src/app/api/llm/**", "src/lib/kb-adapter.ts（仅 :86）", "docs/design/03_solution/decisions/ADR-029-LLM与知识库适配器注册表.md"],
     allow=["src/lib/llm/**", "src/lib/llm-gateway.ts", "src/lib/coze.ts", "src/app/api/llm/**", "src/lib/kb-adapter.ts", "src/lib/__tests__/lane-c/**", "docs/design/03_solution/decisions/ADR-029-*.md"],
     steps=["先写 registries 测试", "搬迁实现 + 去掉 `getAllSettings as getSettings` 别名", "providers 路由迁 withApi，密钥脱敏不变"],
     accept=["`grep -rn 'kind === \"coze\"' src/lib src/app/api` 为空", "`grep -n \"AbortSignal.timeout\" src/lib/coze.ts src/lib/llm-gateway.ts src/app/api/llm -r` 为空", "wechat-chat、p06-followups 测试通过"],
     verify=[GATE], deps=["W0-08"], tier="opus", tier_why="架构接口（opus 券）", size="中（1 天）", escalate="—")

task(id="C-02", lane=C, wp="WPC.2 知识库后端注册表", slice="S-C2 知识库后端可扩展",
     title="KnowledgeBackend 接口与注册表，合并 P06 的 KbRemoteAdapter",
     req="P09 目标（KB 部分）；P06-execution §8；B-domain §3.4",
     goal="KnowledgeBackend = search/pushDocument/removeDocument/getDocumentStatus/pushEntry，纯 DTO；registerKbRemoteAdapter 保留导出名作为薄包装；只有一个注册表",
     inputs="kb-sync.ts:12-28；kb-adapter.ts:28,84,106",
     outputs=["src/lib/kb/{types,registry,local}.ts", "src/lib/kb-adapter.ts（门面）", "src/lib/kb-sync.ts"],
     allow=["src/lib/kb/**", "src/lib/kb-adapter.ts", "src/lib/kb-sync.ts", "src/lib/__tests__/lane-c/**", "src/lib/__tests__/collect-autokb.test.ts"],
     steps=["接口写入 ADR-029", "local 后端包裹现有 searchLocal（行为不变）"],
     accept=["collect-autokb.test.ts 不改断言即通过", "`grep -rn \"registerKbRemoteAdapter\\|registerKnowledgeBackend\" src/lib` 只有一个注册表实现"],
     verify=[GATE], deps=["C-01"], tier="sonnect", tier_why="接口抽取", size="中（0.5~1 天）", escalate="—")

task(id="C-03", lane=C, wp="WPC.3 文件管线", slice="S-C3 上传文件可解析",
     title="知识库文件管线纯函数：类型三重校验、docx 解析、切分",
     req="ADR-025 §2/§4；M-10",
     goal="扩展名+MIME+文件头三重校验，PDF(%PDF)与 PNG/JPEG/GIF/WEBP/BMP 文件头一律拒绝；docx 经 mammoth 转纯文本；.doc 无纯 JS 解析 → localParse=skipped；切分 ≤800 字、重叠 100 字",
     inputs="W0-05 kb 契约；W0-07 mammoth",
     outputs=["src/lib/kb/{filetype,parse,chunk}.ts", "src/lib/__tests__/lane-c/kb-file.test.ts（含 fixtures：最小 docx、伪装成 .txt 的 PDF、伪装成 .md 的 PNG）"],
     allow=["src/lib/kb/**", "src/lib/__tests__/lane-c/**"],
     steps=["fixtures 在测试中用 Buffer 构造，不提交二进制大文件"],
     accept=["kb-file.test.ts：伪装文件全部被拒且返回 KB_REJECT_MESSAGE；docx 抽出预期文本；切分边界与重叠正确", "`grep -rnE \"pdf-parse|pdfjs|tesseract\" package.json src/lib/kb` 为空"],
     verify=["npx vitest run src/lib/__tests__/lane-c/kb-file.test.ts", GATE], deps=["W0-08"], tier="sonnect", tier_why="纯函数", size="中（1 天）", escalate="mammoth 在 Node 22/24 报错 → 上报，docx 本地解析标 skipped（与 .doc 同处理），不换 PDF/OCR 库")

task(id="C-04", lane=C, wp="WPC.4 Coze 知识库", slice="S-C4 文件同步到 Coze",
     title="Coze 知识库客户端：建库/推文档(≤10/批)/进度/删除 + 错误映射 + 自注册",
     req="ADR-025 §3/§6/§7；R-P9",
     goal="POST {apiBase}/open_api/knowledge/document/create（Authorization: Bearer、Agw-Js-Conv: str、chunk_strategy 必传、format_type 0）；md/markdown → txt；4013 等权限错误 → 中文提示；后端在模块加载时 registerKnowledgeBackend('coze')，不改 instrumentation",
     inputs="ADR-025；src/lib/coze.ts:19 headers；settings kbCozeProviderId/kbCozeSpaceId",
     outputs=["src/lib/kb/coze.ts", "src/lib/coze.ts（抽请求工具）", "src/lib/__tests__/lane-c/kb-coze.test.ts"],
     allow=["src/lib/kb/**", "src/lib/coze.ts", "src/lib/kb-sync.ts", "src/lib/__tests__/lane-c/**"],
     steps=["实现前在 docs.coze.cn 核对当前接口并把 URL 与访问日期写进证据", "fetch 可注入，全部用 mock 测试"],
     accept=["kb-coze.test.ts：URL/Header/body 正确；11 个文件分 2 批；md→txt；4013 → 权限中文提示", "无凭证时 processKbSyncQueue 记录原因而非抛错"],
     verify=["npx vitest run src/lib/__tests__/lane-c/kb-coze.test.ts", GATE], deps=["C-02", "C-03"], tier="sonnect", tier_why="适配器实现", size="中（1~1.5 天）", escalate="Coze 文档与 ADR-025 记录不一致 → 以官方文档为准，写入证据并通知集成者更新 ADR-025",
     assume=["Coze 真实联调 = UNKNOWN（无凭证，D4/R-P5）"])

task(id="C-05", lane=C, wp="WPC.5 本地检索", slice="S-C5 本地兜底检索更准",
     title="本地检索：按库过滤 + bigram/关键词/标题加权打分 + LIKE 预筛 ≤500 + 命中率基线",
     req="P12 目标 4；M-10",
     goal="20 条中文问答 fixture 上 Top-3 命中率有前后对比数字（先测现状为基线，再改）；无基线不得声称提升",
     inputs="kb-adapter.ts:28-75（take:50、已有 bigram）",
     outputs=["src/lib/kb/local.ts", "src/lib/__tests__/lane-c/kb-search.test.ts", "src/lib/__tests__/lane-c/fixtures/kb-qa.json", "docs/design/06_validation/evidence/W1-C/kb-search-baseline.md"],
     allow=["src/lib/kb/**", "src/lib/kb-adapter.ts", "src/lib/__tests__/lane-c/**", "docs/design/06_validation/evidence/W1-C/**"],
     steps=["先跑旧算法记录命中率", "实现新算法", "记录新命中率"],
     accept=["kb-search.test.ts 通过且断言新命中率 ≥ 旧命中率", "证据含两次数字与 fixture 来源说明"],
     verify=["npx vitest run src/lib/__tests__/lane-c/kb-search.test.ts"], deps=["C-02"], tier="sonnect", tier_why="算法+测试", size="中（1 天）", escalate="新算法低于旧 → 保留旧算法并上报")

task(id="C-06", lane=C, wp="WPC.6 知识库 API", slice="S-C6 库与文件可管理",
     title="知识库 API：库 CRUD+同步、文件上传(≤10MB 三重校验)/列表/删除/重解析/进度、kb/test 扩 baseIds/topK",
     req="REQ-F-007；M-10；ADR-025 §2/§8",
     goal="上传 .pdf/.png/.jpg → 400 + KB_REJECT_MESSAGE；.md/.txt/.docx → 200 且 chunkCount>0；文件落 storage.kbDir()，不经 /api/file 公开；删除库/文件级联清理本地条目与磁盘文件并请求 Coze 删除",
     inputs="W0-05 kb 契约；W0-03 storage.kbDir()；crud-resources/kb-ai.ts",
     outputs=["src/app/api/knowledge-bases/**", "src/app/api/knowledge-files/**", "src/app/api/kb/test/route.ts", "src/lib/crud-resources/kb-ai.ts", "src/lib/__tests__/lane-c/kb-api.test.ts"],
     allow=["src/app/api/knowledge-bases/**", "src/app/api/knowledge-files/**", "src/app/api/kb/**", "src/app/api/knowledge/**", "src/lib/crud-resources/kb-ai.ts", "src/lib/kb/**", "src/lib/__tests__/lane-c/**"],
     steps=["全部路由 withApi；kb/test 内联 schema 移除，改用 contracts/kb.ts", "用 api-contract harness 写路由测试"],
     accept=["kb-api.test.ts：上述 400/200/级联/401/403 用例全绿", "`grep -n \"z.object\" src/app/api/kb/test/route.ts` 为空"],
     verify=["npx vitest run src/lib/__tests__/lane-c/kb-api.test.ts", GATE], deps=["C-04", "C-05"], tier="sonnect", tier_why="API 实现", size="大（1.5~2 天）", escalate="—")

task(id="C-07", lane=C, wp="WPC.7 场景装配与流式", slice="S-C7 场景可绑定模型/参数/知识库",
     title="场景绑定 providerIds/参数/baseIds；chat/stream 用 SSE 契约与 429；ChatWidget 仅解析改 safeParse",
     req="M-11/M-12；P13 目标 2；K12（providerIds > llmProviderId > 全局）",
     goal="场景 [B,A] → B 优先、B 失败回落 A、再回落全局 fallback；官网与公众号 messages 全等；限频返回 HTTP 429/code 429；SSE 事件由 chatSseEventSchema 构造与解析；Coze 路径显式拼接 system 与最近历史为首条 user 前缀（写入 ADR-029）",
     inputs="chat-service.ts:62-126；chat/stream/route.ts:11-15,37-39,62-96；ChatWidget.tsx:105-128；llm-gateway.ts:107,197",
     outputs=["src/lib/chat-service.ts", "src/lib/llm-gateway.ts", "src/app/api/chat/stream/route.ts", "src/components/web/ChatWidget.tsx（仅 :89-131 解析逻辑）", "src/lib/__tests__/lane-c/chat-scene.test.ts"],
     allow=["src/lib/chat-service.ts", "src/lib/llm-gateway.ts", "src/lib/llm/**", "src/app/api/chat/**", "src/components/web/ChatWidget.tsx", "src/lib/crud-resources/kb-ai.ts", "src/lib/__tests__/lane-c/**"],
     forbid=["ChatWidget.tsx 的 JSX 与 className（visual 门禁）"],
     steps=["先写场景路由测试", "改装配与透传", "ChatWidget 只替换解析函数"],
     accept=["chat-scene.test.ts 全绿（优先级、回落、两渠道 messages 全等、第 11 次请求 429、baseIds/providerIds 的 JSON 数组串与旧逗号文本都能解析）", "ChatWidget 解析单测：同一流内出现两条 error 事件（route.ts 的 catch 与 finally 都可能发）时只显示一条提示且不抛错", "e2e apply-chat 通过", "visual 46/46"],
     verify=["npx vitest run src/lib/__tests__/lane-c/chat-scene.test.ts", E2E, VIS], deps=["C-01", "C-05"], tier="sonnect", tier_why="业务装配", size="中（1 天）", escalate="Coze bot 侧必须配置提示词才能生效 → 标 UNKNOWN 并在后台提示")

task(id="C-08", lane=C, wp="WPC.8 采集入库", slice="S-C8 采集内容进指定库并推送",
     title="采集→目标库：ingestCollectItem 读取 CollectSource.knowledgeBaseId（默认“采集资讯”）并推送 Coze(txt)",
     req="REQ-F-006；M-8；ADR-025 §6",
     goal="不改 collect-engine.ts（D 线所有）即可让新采集条目带 baseId 并进入推送队列",
     inputs="kb-sync.ts:31-83",
     outputs=["src/lib/kb-sync.ts", "src/lib/__tests__/collect-autokb.test.ts（扩展断言）"],
     allow=["src/lib/kb-sync.ts", "src/lib/kb/**", "src/lib/__tests__/collect-autokb.test.ts", "src/lib/__tests__/lane-c/**"],
     steps=["ingestCollectItem 内部查 source.knowledgeBaseId", "mock Coze 断言收到 txt"],
     accept=["collect-autokb.test.ts：条目 baseId = 源指定库或默认库；mock Coze 收到 file_type=txt"],
     verify=["npx vitest run src/lib/__tests__/collect-autokb.test.ts", GATE], deps=["C-04"], tier="sonnect", tier_why="小改动", size="小（0.5 天）", escalate="—")

task(id="C-09", lane=C, wp="WPC.9 配额与限频", slice="S-C9 模型用量受控",
     title="LLM dailyQuota / rateLimit 生效，全部超限返回 503",
     req="P15 目标 2；REQ-NF-001",
     goal="当日（Asia/Shanghai 日界）LLMUsage.calls ≥ dailyQuota 的供应商被跳过；进程内每分钟滑窗 rateLimit；全部超限 → serviceUnavailable(503)；跳过原因记录",
     inputs="schema.prisma:507-508；llm-gateway.ts:54-77（日期用 UTC，需改口径）",
     outputs=["src/lib/llm/limits.ts", "src/lib/llm-gateway.ts", "src/app/api/chat/stream/route.ts（503 映射）", "src/lib/__tests__/lane-c/llm-limits.test.ts"],
     allow=["src/lib/llm/**", "src/lib/llm-gateway.ts", "src/app/api/chat/**", "src/lib/__tests__/lane-c/**"],
     steps=["日界口径写入 ADR-029", "测试用假时钟"],
     accept=["llm-limits.test.ts：配额满跳到下一个；滑窗第 N+1 次跳过；全部超限 503；北京时间 00:00 重置", "`grep -n \"dailyQuota\\|rateLimit\" src/lib/llm/limits.ts src/lib/llm-gateway.ts` ≥ 2 处"],
     verify=["npx vitest run src/lib/__tests__/lane-c/llm-limits.test.ts", GATE], deps=["C-07"], tier="sonnect", tier_why="逻辑+测试", size="中（0.5~1 天）", escalate="改日界影响既有熔断统计 → 两者同口径并在 ADR 记录")

# ───────────────────────── 执行线 D：运维 ─────────────────────────
D = "D"
task(id="D-01", lane=D, wp="WPD.1 基线测量", slice="S-D1 性能可测量",
     title="scripts/measure-baseline.mjs + 在 w1-base 上测 before.json",
     req="规划总指令 §9.1（无基线禁止优化）；P10",
     goal="一条命令输出 homeJsGzip、managerJsGzip、managerArticlesJsGzip、homeTtfbColdMs/WarmMs、apiArticlesTtfbMs、startToReadyMs（standalone server.js 与 npm start 两种）",
     inputs="本规划 08-基线指标.md 的手工测量方法与数值",
     outputs=["scripts/measure-baseline.mjs", "docs/design/06_validation/evidence/W1-D/before.json"],
     allow=["scripts/**", "docs/design/06_validation/evidence/W1-D/**"],
     steps=["脚本自带临时库（DATABASE_URL 指向 tmp）与临时 JWT_SECRET，不写仓库", "与 08-基线指标.md 数值对照，偏差 >15% 需说明"],
     accept=["`node scripts/measure-baseline.mjs --out docs/design/06_validation/evidence/W1-D/before.json` exit 0", "JSON 含上述 8 个键"],
     verify=["node scripts/measure-baseline.mjs --out /tmp/b.json && node -e \"const b=require('/tmp/b.json');['homeJsGzip','managerJsGzip','startToReadyMs'].forEach(k=>{if(!(k in b))process.exit(1)})\""],
     deps=["W0-08"], tier="sonnect", tier_why="脚本", size="中（0.5 天）", escalate="—")

task(id="D-02", lane=D, wp="WPD.2 启动与环境", slice="S-D2 重启快且读得到 env",
     title="start-next：不再因数据库写入重建；按优先级加载 env 文件",
     req="P10 目标 2；P11 目标 1；I9；P0-baseline F1/F2",
     goal="只监视 src、public、prisma/schema.prisma、prisma/migrations、package*.json、next.config.ts、tsconfig.json；启动前用 @next/env loadEnvConfig 加载 .env.production.local > .env.local > .env.production > .env；已构建未改源码时 npm start → Ready ≤ 10s",
     inputs="start-next.mjs:21-30,45-48,98-103；start-next-utils.mjs:4-24",
     outputs=["scripts/start-next.mjs", "scripts/start-next-utils.mjs", "src/lib/__tests__/lane-d/start-next-utils.test.ts"],
     allow=["scripts/**", "src/lib/__tests__/lane-d/**"],
     steps=["抽纯函数 needsRebuild(entries, buildId)", "单测：touch prisma/dev.db 不触发；改 schema 触发"],
     accept=["start-next-utils.test.ts 通过", "实测：仅有 .env.local（含 JWT_SECRET）时 POST /api/auth/login 200；touch prisma/dev.db 后 npm start 日志无 next build 且 Ready ≤10s（写入证据）"],
     verify=["npx vitest run src/lib/__tests__/lane-d/start-next-utils.test.ts", GATE], deps=["D-01"], tier="sonnect", tier_why="脚本", size="中（0.5 天）", escalate="@next/env 在 standalone 不可用 → 在 start-next 内解析 env 文件（不新增依赖）")

task(id="D-03", lane=D, wp="WPD.2 启动与环境", slice="S-D2 重启快且读得到 env",
     title="src/lib/env.ts 集中校验 + instrumentation 启动校验 + .env.example 对齐",
     req="P11 目标；REQ-NF-002；C-ops §2（CRON_SECRET 0 引用）",
     goal="JWT_SECRET/ENCRYPTION_KEY ≥32、DATABASE_URL、APP_ORIGIN、DATA_DIR、HOSTNAME/PORT 由 zod 校验；生产缺失即退出并打印键名（不打印值）；CRON_SECRET 从 .env.example 移除并在 ADR-031 记录（无调用方）",
     inputs="jwt.ts:9-14；crypto.ts:10-15；instrumentation.ts:5-10",
     outputs=["src/lib/env.ts", "src/instrumentation.ts", ".env.example", "src/lib/__tests__/lane-d/env.test.ts"],
     allow=["src/lib/env.ts", "src/instrumentation.ts", ".env.example", "src/lib/__tests__/lane-d/**", "docs/design/03_solution/decisions/ADR-031-*.md"],
     steps=["env.ts 不在 import 时抛错（测试与构建期安全），由 instrumentation 调用 assertProductionEnv()"],
     accept=["env.test.ts：缺键 → 列出键名；值不出现在错误信息", "`grep -n CRON_SECRET .env.example` 为空", "`npm run test:e2e` 仍全绿（W0-07 已为 e2e 预置所需变量；若仍缺 → CCR 给 E 线）"],
     verify=["npx vitest run src/lib/__tests__/lane-d/env.test.ts", GATE, E2E], deps=["D-02"], tier="sonnect", tier_why="配置", size="小（0.5 天）", escalate="—",
     assume=["A-D-1：CRON_SECRET 为死键，删除（若用户需要外部 cron 触发 → 新需求另立）"])

task(id="D-04", lane=D, wp="WPD.3 设置对等", slice="S-D3 设置键与 main 对等",
     title="设置键对等 16 键 + 默认值单一来源 + 修正 3 个不存在的默认资源路径",
     req="REQ-F-013 parity A22；P11 #4；C-ops §4-#1",
     goal="registry 补 advantage1~4、banner*×6、card*Subtitle×3、homeCards、siteLogoIcon、statsLabel；前台冻结默认值以 setting-defaults.ts 为准、registry 从其导入（单一来源）；placeholder.svg/favicon.ico/banner-bg.jpg 默认值改为仓库内存在的文件",
     inputs="settings-registry.ts:36-49；src/components/web/data/setting-defaults.ts；scripts/migrate-setting-keys.mjs:13-31",
     outputs=["src/lib/settings-registry.ts", "src/components/web/data/setting-defaults.ts（仅导出形态，不改值）", "scripts/migrate-setting-keys.mjs", "src/lib/__tests__/settings-registry.test.ts", "src/lib/__tests__/lane-d/settings-parity.test.ts"],
     allow=["src/lib/settings-registry.ts", "src/components/web/data/**", "scripts/**", "src/lib/__tests__/settings-registry.test.ts", "src/lib/__tests__/lane-d/**"],
     steps=["settings-parity fixture = main 的键清单（从 origin/main 提取，写入 fixture）", "默认资源路径存在性断言"],
     accept=["settings-parity.test.ts：main 键全部存在；每个 /images/* 默认值文件存在", "visual 46/46"],
     verify=[GATE, VIS], deps=["W0-08"], tier="sonnect", tier_why="对等补齐", size="中（1 天）", escalate="某 main 键语义不明 → 列入证据待确认，不臆造默认值")

task(id="D-05", lane=D, wp="WPD.3 设置对等", slice="S-D4 前台无硬编码品牌",
     title="前台电话/域名兜底统一读 BRAND_DEFAULTS（仅替换字面量）",
     req="M-5；P06-verify:91；K13",
     goal="除 src/config/brand.ts 与 setting-defaults.ts 外 src 中无 400-001-5729 / 132-1945-5550 / hd1994 字面量（共 3 组，现 400 号与域名 13 处/11 文件，132 号 16 处/9 文件，执行前重新盘点）；不改 JSX 结构与 className",
     inputs="C-ops §2 的 13 处/11 文件清单",
     outputs=["src/app/(web)/{about,campus,contact,courses/[id]}/page.tsx", "src/components/web/Footer.tsx", "src/components/web/data/home.ts", "src/app/robots.ts", "src/app/sitemap.ts"],
     allow=["src/app/(web)/**", "src/components/web/Footer.tsx", "src/components/web/data/**", "src/app/robots.ts", "src/app/sitemap.ts"],
     forbid=["上述文件中除兜底字面量与 import 外的任何改动"],
     steps=["逐文件替换 + 每文件 diff 自查只含字面量与 import"],
     accept=["`grep -rnE \"400-001-5729|132-1945-5550|hd1994\" src --exclude-dir=__tests__ | grep -v \"src/config/brand.ts\\|setting-defaults.ts\"` 为空", "visual 46/46", "人工审 `git diff w1-base -- 'src/app/(web)' src/components/web src/app/robots.ts src/app/sitemap.ts`：每个文件只有兜底字面量所在行被替换，外加至多 1 行 import；无 JSX 结构或 className 变化"],
     verify=[VIS, GATE], deps=["D-04"], tier="sonnect", tier_why="字面量替换", size="小（<2h，与 D-04 同批）", escalate="—")

task(id="D-06", lane=D, wp="WPD.4 前台缓存", slice="S-D5 首页更快且改动 5 秒可见",
     title="前台缓存：去掉 (web) 的 force-dynamic，首页数据与区块配置 unstable_cache + 标签失效",
     req="P10 目标 3；ADR-024（区块配置随首页缓存）",
     goal="getHomeData 与 resolveHomeBlocks 以 WEB_TAGS 缓存；cache-tags 正式实现；crud 工厂写操作按资源映射失效；后台改动后前台 ≤5s 可见（e2e）；首页热 TTFB 不劣于 before.json",
     inputs="C-ops §1-#3（11 处 force-dynamic、home.ts:95-123 三批串行、layout.tsx:13）",
     outputs=["src/app/(web)/**（仅 dynamic/revalidate 导出与数据函数调用）", "src/components/web/data/home.ts（仅缓存包装与查询并行化）", "src/lib/block-registry.ts", "src/lib/cache-tags.ts", "src/lib/crud.ts", "tests/e2e/d-cache.spec.ts"],
     allow=["src/app/(web)/**", "src/components/web/data/**", "src/lib/block-registry.ts", "src/lib/cache-tags.ts", "src/lib/crud.ts", "src/lib/crud-resources/site.ts", "tests/e2e/d-*.spec.ts", "src/lib/__tests__/lane-d/**", "src/lib/__tests__/block-registry.test.ts"],
     forbid=["(web) 页面 JSX/className"],
     steps=["资源→标签映射表放 cache-tags.ts", "e2e：后台改 Banner 标题 → 5 秒内前台可见"],
     accept=["`grep -rn \"force-dynamic\" \"src/app/(web)\"` 仅剩证据中列明理由的页（如 apply）", "d-cache.spec.ts 通过", "visual 46/46", "after.json 首页热 TTFB ≤ before ×1.1"],
     verify=["npx playwright test -c tests/e2e/playwright.config.ts tests/e2e/d-cache.spec.ts", VIS, GATE], deps=["D-01"], tier="sonnect", tier_why="缓存实现（opus 券 1 次审查）", size="大（1.5~2 天）", escalate="缓存导致后台改动前台不可见两轮未修 → 回退该页为动态并上报")

task(id="D-07", lane=D, wp="WPD.5 配置收尾", slice="S-D6 部署件齐全",
     title="next.config 清理（cssChunking、过期注释）+ redirects 回归测试 + jobs 注释",
     req="P11 #6；P08 #7；I11",
     goal="构建无 cssChunking 告警；29 条 redirects 有测试守住与 main 一致",
     inputs="next.config.ts:9-12,28；jobs/index.ts:3-6",
     outputs=["next.config.ts", "src/lib/jobs/index.ts（仅注释）", "src/lib/__tests__/lane-d/redirects.test.ts"],
     allow=["next.config.ts", "src/lib/jobs/**", "src/lib/__tests__/lane-d/**"],
     steps=["redirects 测试读取 next.config 与 fixture（从 origin/main 提取）逐条比对"],
     accept=["redirects.test.ts 通过", "`npm run build 2>&1 | grep -ci cssChunking` = 0", "`grep -n \"当前为预留\\|后续切片注册\" next.config.ts src/lib/jobs/index.ts` 为空"],
     verify=[GATE], deps=["D-02"], tier="haiku", tier_why="清理", size="小（<2h，与 D-08 同批）", escalate="—")

task(id="D-08", lane=D, wp="WPD.5 配置收尾", slice="S-D6 部署件齐全",
     title="Docker 部署件 + CLAUDE.md",
     req="parity E1/E2；REQ-NF-004",
     goal="Dockerfile（node 24、standalone、非 root）、docker-compose.yml（卷：DATA_DIR、数据库）、.dockerignore、CLAUDE.md（内容 @AGENTS.md）；健康检查打 /api/health",
     inputs="origin/main 的 Dockerfile/Dockerfile.dev/docker-compose.yml/.dockerignore/CLAUDE.md",
     outputs=["Dockerfile", "docker-compose.yml", ".dockerignore", "CLAUDE.md"],
     allow=["Dockerfile", "docker-compose.yml", ".dockerignore", "CLAUDE.md"],
     steps=["以 main 为蓝本改 standalone 与 DATA_DIR"],
     accept=["`test -f CLAUDE.md && test -f Dockerfile`", "`command -v docker && docker build -t hdwebsite:w1 .` 成功；无 docker → 标 UNKNOWN（不计 PASS）"],
     verify=["command -v docker && docker build -t hdwebsite:w1 . || echo UNKNOWN"], deps=["D-03"], tier="sonnect", tier_why="部署件", size="小（0.5 天）", escalate="—")

task(id="D-09", lane=D, wp="WPD.6 存储根", slice="S-D7 上传与备份不再写进构建目录",
     title="storage.ts 正式实现 DATA_DIR；upload/file/collect-engine/backup 改用；standalone 不再携带 uploads",
     req="P14 目标 1；I14（已复测：构建后 .next/standalone/uploads=32M，运行后增至 45M/526 个文件——运行时写入构建目录；server.js:6 chdir）",
     goal="所有上传/备份/知识库文件路径与 cwd 无关；collect-engine 不再 import '@/app/api/upload/route'；upload 路由迁 withApi；outputFileTracingExcludes 排除 uploads",
     inputs="upload/route.ts:25；file/[...path]/route.ts:7,22-26；collect-engine.ts:19,113-122；backup.ts:45",
     outputs=["src/lib/storage.ts", "src/app/api/upload/**", "src/app/api/file/**", "src/lib/collect-engine.ts（仅路径）", "src/lib/jobs/backup.ts（仅路径）", "next.config.ts（仅 tracing 排除）", "src/lib/__tests__/lane-d/storage.test.ts"],
     allow=["src/lib/storage.ts", "src/app/api/upload/**", "src/app/api/file/**", "src/lib/collect-engine.ts", "src/lib/jobs/**", "next.config.ts", "src/lib/env.ts", ".env.example", "src/lib/__tests__/lane-d/**", "docs/design/03_solution/decisions/ADR-031-*.md"],
     steps=["storage.test.ts 含 chdir 用例与穿越用例", "build 后检查 standalone 目录"],
     accept=["`grep -rn 'process.cwd(), \"uploads\"\\|process.cwd(), \"backups\"' src` 为空", "`grep -rn \"@/app/\" src/lib` 为空", "`npm run build && test ! -d .next/standalone/uploads`", "storage.test.ts 通过"],
     verify=["npx vitest run src/lib/__tests__/lane-d/storage.test.ts", "npm run build && test ! -d .next/standalone/uploads", GATE], deps=["D-03"], tier="sonnect", tier_why="存储改造（opus 券审查）", size="中（1 天）", escalate="tracing 排除后运行时找不到文件 → 回退排除项并上报")

task(id="D-10", lane=D, wp="WPD.6 存储根", slice="S-D8 数据可备份可迁出",
     title="备份含 uploads 与 kb；运行时文件迁出 git（导出→.gitignore→git rm --cached）",
     req="P14 目标 2/3/5；R-P6",
     goal="备份产物含 db + uploads + kb（tar.gz），保留 14 份；仓库 git ls-files uploads = 0 且磁盘文件保留；public/uploads 20 个文件处置写入证据（默认保留，因前台可能引用）",
     inputs="backup.ts:11,33-62；C-ops §3（413 文件，32M）",
     outputs=["src/lib/jobs/backup.ts", "scripts/migrate-uploads-to-data-dir.mjs", ".gitignore", "uploads/**（仅 git rm --cached）", "src/lib/__tests__/lane-d/backup.test.ts"],
     allow=["src/lib/jobs/**", "scripts/**", ".gitignore", "uploads/**", "src/lib/__tests__/lane-d/**"],
     steps=["迁移脚本 dry-run 默认，报告计数", "计数与 git ls-files 一致才执行 git rm --cached"],
     accept=["迁移脚本报告 413", "`test \"$(git ls-files uploads | wc -l)\" -eq 0`", "backup.test.ts：归档含三类、第 15 份删除最旧"],
     verify=["npx vitest run src/lib/__tests__/lane-d/backup.test.ts", GATE], deps=["D-09"], tier="sonnect", tier_why="脚本+测试", size="中（1 天）", escalate="计数不一致 → 停止，不执行 git rm --cached")

task(id="D-11", lane=D, wp="WPD.6 存储根", slice="S-D8 数据可备份可迁出",
     title="删除媒体清理文件（单删/批删含缩略图）+ 孤儿扫描脚本",
     req="P14 目标 4；C-ops §3-#4",
     goal="crud.ts 新增 afterDelete 钩子；media 单删与 /api/media/batch 删除对应原图与 thumb/small/medium；scan-orphan-uploads.mjs 默认 dry-run",
     inputs="media/[id]/route.ts:13；media/batch/route.ts:31-32；crud.ts:41,43",
     outputs=["src/lib/crud.ts", "src/lib/crud-resources/media.ts", "src/app/api/media/**", "scripts/scan-orphan-uploads.mjs", "src/lib/__tests__/lane-d/media-delete.test.ts"],
     allow=["src/lib/crud.ts", "src/lib/crud-resources/media.ts", "src/app/api/media/**", "src/lib/storage.ts", "scripts/**", "src/lib/__tests__/lane-d/**"],
     steps=["钩子失败不回滚 DB 删除，只记日志"],
     accept=["media-delete.test.ts：单删/批删后 4 个文件均不存在", "`node scripts/scan-orphan-uploads.mjs; echo $?` = 0"],
     verify=["npx vitest run src/lib/__tests__/lane-d/media-delete.test.ts", GATE], deps=["D-09"], tier="sonnect", tier_why="逻辑", size="中（0.75 天）", escalate="—")

task(id="D-12", lane=D, wp="WPD.7 采集", slice="S-D9 采集可扩展且图片受控",
     title="CollectParser 注册表（html/rss）+ 采集图片流式限长、白名单单一来源 + http-client/json-field",
     req="P09 目标（采集部分）；P15 目标 4",
     goal="collect-engine 与 collect-test 都经 getParser(type)；图片读取超过上限立即中止；上传与采集共用 storage.ts 的类型白名单与上限常量",
     inputs="collect-engine.ts:102-202；collect-test.ts:37；upload/route.ts:16-24",
     outputs=["src/lib/collect/**", "src/lib/collect-engine.ts", "src/lib/collect-test.ts", "src/lib/storage.ts（常量）", "src/app/api/upload/route.ts（引用常量）", "docs/design/03_solution/decisions/ADR-032-采集解析注册表.md", "src/lib/__tests__/lane-d/collect.test.ts"],
     allow=["src/lib/collect/**", "src/lib/collect-engine.ts", "src/lib/collect-test.ts", "src/lib/storage.ts", "src/app/api/upload/**", "src/app/api/collect-*/**", "src/lib/crud-resources/collect.ts", "src/lib/__tests__/lane-d/**", "docs/design/03_solution/decisions/ADR-032-*.md"],
     steps=["先写测试（rss/html fixture、超大图片中止）", "搬迁"],
     accept=["`grep -rn 'type === \"rss\"' src/lib` 为空", "`grep -c \"image/jpeg\" src/lib/collect-engine.ts src/app/api/upload/route.ts` 均为 0", "collect-autokb（C 线文件，只读回归）与 e2e collect-publish 通过"],
     verify=["npx vitest run src/lib/__tests__/lane-d/collect.test.ts", E2E, GATE], deps=["D-09"], tier="sonnect", tier_why="搬迁", size="中（1 天）", escalate="—")

# W2-01 依赖 Wave 1 全部汇点（无线内后继的卡），保证所有 W1 卡 PASS 后才集成
_W1 = [t for t in T if t["lane"] in "AEBCD"]
_has_succ = {d for t in _W1 for d in t["deps"]}
W1_SINKS = [t["id"] for t in _W1 if t["id"] not in _has_succ]

# ───────────────────────── Wave 2：集成与终审 ─────────────────────────
W = "W"
task(id="W2-01", lane=W, wp="WP2.1 合并", slice="S-W 集成",
     title="按 D → B → C → A → E 顺序合并五线分支，逐次跑门禁",
     req="规划总指令 §7.3；§9.2",
     goal="五线合入 upgrade，冲突为 0 或仅限证据文档；每次合并后全量门禁通过",
     inputs="五线分支与各自独立校验 PASS 报告",
     outputs=["upgrade 合并提交", "docs/design/06_validation/evidence/W2/merge-log.md"],
     allow=["（合并本身）", "docs/design/06_validation/evidence/W2/**"],
     steps=["每线合并前确认其 verify 报告 PASS", "合并后 GATE+VIS+E2E"],
     accept=["`git log --merges w1-base..upgrade` 含 5 次合并（M1 另计）", "每次合并后门禁全绿（日志入证据）"],
     verify=[GATE, VIS, E2E], deps=W1_SINKS, tier="opus", tier_why="跨线集成仲裁", size="中（1 天）", escalate="出现非证据文件冲突 → 说明所有权矩阵有缺陷，回到规划修正")

task(id="W2-02", lane=W, wp="WP2.2 守卫建设（Guard，不与实现并行）", slice="S-W 集成",
     title="全路由契约测试自动发现（tests/contract），覆盖合并后全部路由（守卫角色执行）",
     req="P13 目标 3；M-4",
     goal="遍历 src/app/api/**/route.ts 导出的方法，每个方法必须在 rules.ts 有规则（未登录/非法参数/合法参数），断言信封与状态码；缺规则即失败",
     inputs="src/lib/__tests__/api-contract/harness.ts；W0-04 错误码",
     outputs=["tests/contract/routes.test.ts", "tests/contract/rules.ts", "docs/design/06_validation/evidence/W2/contract-coverage.md"],
     allow=["tests/contract/**", "src/lib/__tests__/api-contract/**", "docs/design/06_validation/evidence/W2/**"],
     steps=["在合并后的 upgrade 上对全部路由建规则（含 knowledge-bases、knowledge-files、home-blocks、media、upload；知识库上传 PDF/图片 400 用例必须在列）", "NON_JSON_ROUTES 取自 evidence/W1-B/non-json-routes.md"],
     accept=["`npx vitest run tests/contract` 通过", "覆盖率报告：发现的方法 100% 有规则（合并后口径），skip ≤ 5 且每条有理由"],
     verify=["npx vitest run tests/contract", GATE], deps=["W2-01"], tier="sonnect", tier_why="测试工程", size="大（2 天）", escalate="某路由无法构造合法请求 → 规则标 skip 并写理由，skip ≤ 5")

task(id="W2-08", lane=W, wp="WP2.2 守卫建设（Guard，不与实现并行）", slice="S-W 集成",
     title="ESLint 边界规则（直接 error）+ 13-响应设计文档同步 + CCR 积压收尾（含 notify.scan 调用 flushDeferred）",
     req="规划总指令 §9.4（架构边界检查）；P08 目标（禁止重复 DTO）",
     goal="eslint no-restricted-imports：src/lib 禁止 import '@/app/**'（D-09 已消除 collect-engine 反向依赖）、路由内禁止定义请求体 zod（error）；Wave 1 登记的 CCR 全部落地或关闭，其中 B-06 需要的 notify.scan → flushDeferred() 在 src/lib/jobs/index.ts 注册并有单测",
     inputs="eslint.config.mjs（18 行）；C-ops §3（collect-engine.ts:19 反向依赖）",
     outputs=["eslint.config.mjs", "docs/design/13-响应设计.md", "src/lib/jobs/index.ts（仅 notify.scan 注册）", "docs/design/06_validation/evidence/W2/ccr-closure.md"],
     allow=["eslint.config.mjs", "docs/design/13-响应设计.md", "src/lib/jobs/index.ts", "src/lib/__tests__/**", "docs/design/06_validation/evidence/W2/**"],
     steps=["新增规则（error）并修复/退回违规", "文档改为 W0 冻结口径", "逐条处理 CCR 积压并记录"],
     accept=["`npm run lint` 0 error（含新规则）", "ccr-closure.md 中每条 CCR 状态为已落地/已关闭", "notify.scan 调用 flushDeferred 的单测通过", "文档错误码表与 src/contracts/common.ts 一致（脚本比对或人工逐条）"],
     verify=["npm run lint"], deps=["W2-01"], tier="sonnect", tier_why="守卫与收尾", size="小（0.5 天）", escalate="—")

task(id="W2-09", lane=W, wp="WP2.2 守卫建设（Guard，不与实现并行）", slice="S-W 集成",
     title="check-assets + check-root + 删除 .tmp-pa.html + 接入 npm run check",
     req="P15 目标 1/3；规划总指令 §9.4（根目录污染检查）",
     goal="源码、Setting 默认值、DB 内容中的 /images/*、/uploads/* 引用全部存在（含 public/uploads 来源）；根目录白名单守卫；package.json 仅改 scripts 字段",
     inputs="C-ops §4（14 个根文件、两份 playwright 配置）",
     outputs=["scripts/check-assets.mjs", "scripts/check-root.mjs", ".tmp-pa.html（删除）", "package.json（仅 scripts.check / scripts.check:assets / scripts.check:root）"],
     allow=["scripts/**", ".tmp-pa.html", "package.json（仅 scripts 字段）", "docs/design/06_validation/evidence/W2/**"],
     steps=["DB 扫描用临时库或 DATABASE_URL"],
     accept=["`node scripts/check-assets.mjs && node scripts/check-root.mjs && test ! -e .tmp-pa.html`", "本卡提交中 package-lock.json 无变化"],
     verify=["node scripts/check-assets.mjs && node scripts/check-root.mjs", GATE], deps=["W2-03"], tier="sonnect", tier_why="脚本", size="中（0.75 天）", escalate="发现 main 视觉依赖文件缺失 → 从 origin/main 恢复（属前台资源，需在证据列明），不得用占位图")

task(id="W2-03", lane=W, wp="WP2.3 依赖收口", slice="S-W 集成",
     title="依赖删除与归类（D 线负责人执行）",
     req="P15 目标 3；P07 #6",
     goal="删除 @radix-ui/react-dialog、@radix-ui/react-label；@types/nodemailer 移入 devDependencies；react-hook-form/@hookform/resolvers 按 D9 裁决处理（默认保留）",
     inputs="A-06 结果；C-ops §4 依赖表",
     outputs=["package.json", "package-lock.json"],
     allow=["package.json", "package-lock.json", "src/components/web/ApplyForm.tsx（仅当 D9=删除）"],
     steps=["npm uninstall/npm i -D", "全量门禁"],
     accept=["`grep -n \"@radix-ui\" package.json` 为空", "`node -e \"process.exit(require('./package.json').dependencies['@types/nodemailer']?1:0)\"`", "build + visual 通过"],
     verify=[GATE, VIS], deps=["W2-01"], tier="haiku", tier_why="依赖整理", size="小（<2h）", escalate="—")

task(id="W2-04", lane=W, wp="WP2.4 性能复测", slice="S-W 集成",
     title="after.json 复测与目标判定（D 线负责人执行）",
     req="P10 目标；§11 基线",
     goal="/manager JS gzip ≤ before ×0.6 或证据说明差距来源与下一步；npm start Ready ≤10s；首页热 TTFB ≤ before ×1.1",
     inputs="D-01 before.json",
     outputs=["docs/design/06_validation/evidence/W2/after.json", "docs/design/06_validation/evidence/W2/perf-compare.md"],
     allow=["docs/design/06_validation/evidence/W2/**", "src/app/manager/**（仅 import 方式，需 E 线负责人确认）"],
     steps=["同环境测三次取中位数"],
     accept=["perf-compare.md 每项给出 PASS/FAIL 与数字"],
     verify=["node scripts/measure-baseline.mjs --out docs/design/06_validation/evidence/W2/after.json"], deps=["W2-03"], tier="sonnect", tier_why="测量", size="小（0.5 天）", escalate="/manager 未达 -40% → opus 判定是否下调目标（须用户批准）")

task(id="W2-05", lane=W, wp="WP2.5 全量验收", slice="S-W 集成",
     title="全量回归：e2e（含 e-knowledge、e-home-blocks、e-notify-rules、e-components、e-responsive、a-richtext、d-cache）、visual、a11y、responsive、contract",
     req="M-1~M-14；基础目标 5 条",
     goal="全部测试在合并后的 upgrade 上一次跑通并留日志",
     inputs="W2-01~04",
     outputs=["docs/design/06_validation/evidence/W2/full-run.md"],
     allow=["docs/design/06_validation/evidence/W2/**"],
     steps=["按 11-验收与审查规程.md §6 的守卫顺序跑"],
     accept=["GATE、VIS、E2E、a11y、contract 全部 exit 0", "失败项有归属线与复修记录"],
     verify=[GATE, VIS, E2E, "npx playwright test -c tests/a11y/playwright.config.ts", "npx vitest run tests/contract"], deps=["W2-02", "W2-04", "W2-08", "W2-09"], tier="sonnect", tier_why="执行", size="中（1 天）", escalate="同一失败两次 → 熔断，回到对应线")

task(id="W2-06", lane=W, wp="WP2.6 文档收口", slice="S-W 集成",
     title="parity-matrix 终态、current-plan/roadmap/changelog 同步、MUST 逐条结论",
     req="M-1；规划总指令 §2.3（文档与代码一致）",
     goal="parity-matrix 每行状态与证据为合并后真实状态（现矩阵仍停留在 P01 统计：present 17/partial 24/missing 3）；MUST 表逐条 PASS/FAIL/UNKNOWN",
     inputs="全部证据",
     outputs=["docs/design/02_requirements/parity-matrix.md", "docs/design/04_planning/current-plan.md", "docs/design/04_planning/roadmap.md", "docs/design/07_release/changelog.md"],
     allow=["docs/design/**"],
     steps=["逐行复核，不确定的标 UNKNOWN"],
     accept=["parity-matrix 中 missing+partial = 0，或每条剩余行附裁决/UNKNOWN 理由（人工逐条）", "MUST 表 14 条全部有结论"],
     verify=["test \"$(grep -cE '\\| *(missing|partial) *\\|' docs/design/02_requirements/parity-matrix.md || true)\" -eq 0 || echo '存在 missing/partial：逐条核对是否附裁决或 UNKNOWN 理由'"], deps=["W2-05"], tier="haiku", tier_why="文档", size="小（0.5 天）", escalate="—")

task(id="W2-07", lane=W, wp="WP2.7 终审与交付", slice="S-W 集成",
     title="独立终审 → 推送 upgrade → 打包",
     req="规划总指令 §9.3；AGENTS.md §8",
     goal="独立审查者只看 `git diff bb2c0e5..upgrade` 与运行结果给出 PASS；推送使用临时凭据且 remote URL 无凭据残留",
     inputs="W2-06",
     outputs=["docs/design/06_validation/evidence/W2/final-verify.md"],
     allow=["docs/design/06_validation/evidence/W2/**"],
     steps=["审查 → 推送 → `git remote -v` 无凭据 → 删除临时凭据文件"],
     accept=["final-verify.md 结论 PASS", "`git remote get-url origin` 不含 '@'", "临时凭据文件不存在"],
     verify=["git remote get-url origin | grep -q @ && exit 1 || echo ok"], deps=["W2-06"], tier="opus", tier_why="终审", size="小", escalate="FAIL → 回到对应线；连续 2 次 → 熔断上报用户")

# ───────────── V0.3（2026-10-14）：需求缺口 G1~G10 补卡（证据：evidence/V0.3-需求缺口审计.md）
_by = {t["id"]: t for t in T}
_by["W0-05"]["steps"].append("V0.3 增补：同批冻结 G 系列 DTO——`/api/llm/usage`（groupBy=provider|day，返回 {key,calls,promptTokens,completionTokens,costCent}[]）、LLMProvider 批量排序 `PATCH /api/llm/providers/order {ids:number[]}`、知识库管理扩展（标签、批量启停、导出、回收站列表/恢复/彻底删除、库统计、条目在线编辑、单库重建切片）、内容中枢渠道状态视图 DTO、客服风控设置键 `chatGuard.rateLimitPerUserPerMin`/`chatGuard.sensitiveWords`/`chatGuard.blacklist`")
_by["W0-05"]["accept"].append("V0.3 增补的 G 系列 DTO 全部以 zod 落在 src/contracts/**，并有 parse 冒烟测试")
_by["W0-06"]["steps"].append("V0.3 增补（G9/G10，D13 默认=并入本迁移）：KnowledgeFile 增加 deletedAt（回收站软删）、tags（JSON 字符串，默认 '[]'）、collectItemId（可空，指向 CollectItem，ON DELETE SET NULL）及索引 (knowledgeBaseId, deletedAt)；仅 ADD COLUMN / CREATE INDEX")
_by["W0-06"]["accept"].append("迁移 SQL 不含 DROP / RedefineTables；KnowledgeFile 含 deletedAt、tags、collectItemId 三列")
_by["C-08"]["accept"].append("V0.3（G10）：入库生成的 KnowledgeFile.collectItemId 指回来源 CollectItem，双向可查（单测断言）")
_by["D-04"]["outputs"].append("V0.3（G5）：settings-registry 增加 chatGuard.rateLimitPerUserPerMin（默认 20）、chatGuard.sensitiveWords（默认空数组 JSON）、chatGuard.blacklist（默认空数组 JSON），键名以 W0-05 冻结为准")

task(id="B-07", lane="B", wp="WPB.4 发布渠道", slice="S-B4 公众号发布闭环",
     title="公众号图文发布闭环：正文外链图转存微信（uploadimg）、发布结果回写 externalUrl（freepublish/get）、发布间隔 ≥60s",
     req="基本设计(4) 自动发布公众号文章；需求缺口 G2/G3/G4",
     goal="一篇含外链图片的文章经公众号发布后，正文图片均为微信域名，ContentChannel.externalUrl 写入文章链接，两次发布间隔 ≥60s",
     inputs="src/lib/wechat.ts:183（注释称已保证间隔但未实现）；src/lib/publish-executor.ts；`grep -rn uploadimg src` 为空；ContentChannel.externalUrl 永远为空",
     outputs=["src/lib/wechat.ts：uploadContentImage()（media/uploadimg）、getPublishResult()（freepublish/get）", "src/lib/publish-executor.ts：发布前替换正文 <img src> 为微信 URL；发布后轮询结果写 externalUrl；同账号发布节流 ≥60s（持久化上次发布时间，跨进程有效）", "src/lib/__tests__/lane-b/wechat-publish.test.ts（fetch 打桩）"],
     allow=["src/lib/wechat.ts", "src/lib/publish-executor.ts", "src/lib/channels/**", "src/lib/__tests__/lane-b/**", "docs/design/06_validation/evidence/W1-B/**"],
     steps=["先写失败测试：外链图替换、externalUrl 回写、60s 节流三条", "实现 uploadimg（≤1MB jpg/png，超限先压缩或跳过并记 warning）", "freepublish/get 轮询（最多 5 次、指数退避），失败标记发布任务 warning 不回滚", "节流读写上次发布时间（DB 字段或 Setting，不新增迁移）"],
     accept=["`grep -n \"uploadimg\" src/lib/wechat.ts` 有命中", "wechat-publish.test.ts 三条断言通过", "无真实公众号凭证时 e2e 记 UNKNOWN（不得写 PASS）", "publish-state-machine.test.ts 回归通过"],
     verify=["npx vitest run src/lib/__tests__/lane-b/wechat-publish.test.ts", "GATE"], deps=["B-05"], tier="sonnect", tier_why="外部 API 适配与单测", size="大（1.5 天）", escalate="微信接口返回结构与文档不符 → 上报，保持 warning 降级，不阻塞官网发布")

task(id="C-10", lane="C", wp="WPC.4 对话与场景", slice="S-C4 客服风控",
     title="AI 客服风控：按用户限频、敏感词过滤、黑名单（官网与公众号同一入口）",
     req="基本设计(8) 官网与公众号 AI 客服；需求缺口 G5",
     goal="同一用户超过每分钟阈值返回 429 文案；命中敏感词返回固定兜底回复且不调用模型；黑名单用户直接拒绝；三项对 /api/chat/stream 与公众号客服回调都生效",
     inputs="`grep -rni blacklist src` 为空；src/lib/chat-service.ts（官网与公众号共用）；W0-05 冻结的 chatGuard.* 键",
     outputs=["src/lib/llm/guard.ts（纯函数 + 进程内滑动窗口，键=场景+用户标识）", "src/lib/chat-service.ts：调用模型前接入 guard", "src/lib/__tests__/lane-c/chat-guard.test.ts"],
     allow=["src/lib/llm/**", "src/lib/chat-service.ts", "src/lib/__tests__/lane-c/**", "docs/design/06_validation/evidence/W1-C/**"],
     steps=["失败测试：限频、敏感词、黑名单各 2 例（官网 SSE、公众号文本）", "实现 guard，设置键缺失时用代码内默认值", "chat-service 统一接入，返回错误码走契约②（429）"],
     accept=["chat-guard.test.ts 通过", "命中敏感词时 llm-gateway 调用次数为 0（spy 断言）", "wechat-chat.test.ts 回归通过"],
     verify=["npx vitest run src/lib/__tests__/lane-c/chat-guard.test.ts", "GATE"], deps=["C-07"], tier="sonnect", tier_why="纯函数 + 接入", size="中（1 天）", escalate="多实例部署需要共享限频 → 记 ADR，进程内实现保留，不在本卡引入 Redis")

task(id="C-11", lane="C", wp="WPC.1 模型网关", slice="S-C1 多模型路由",
     title="大模型用量统计 API：按模型、按日聚合 LLMUsage",
     req="基本设计(9)/(10) 多模型与余额提醒的运营依据；需求缺口 G6（LLMUsage 只写不读）",
     goal="GET /api/llm/usage?groupBy=provider|day&from&to 返回 W0-05 冻结的 DTO，需 llm:list 权限",
     inputs="prisma LLMUsage 模型；W0-05 usage DTO",
     outputs=["src/app/api/llm/usage/route.ts（withApi）", "src/lib/__tests__/lane-c/llm-usage.test.ts"],
     allow=["src/app/api/llm/**", "src/lib/llm/**", "src/lib/__tests__/lane-c/**", "docs/design/06_validation/evidence/W1-C/**"],
     steps=["失败测试：两种 groupBy、时间窗、无权限 403", "实现 groupBy 聚合（Prisma groupBy）", "日期按 Asia/Shanghai 归日"],
     accept=["llm-usage.test.ts 通过", "响应通过 W0-05 zod schema parse", "无权限返回 403 且体符合契约②"],
     verify=["npx vitest run src/lib/__tests__/lane-c/llm-usage.test.ts", "GATE"], deps=["C-01"], tier="sonnect", tier_why="只读聚合接口", size="小（0.5 天）", escalate="—")

task(id="C-12", lane="C", wp="WPC.3 知识库 API", slice="S-C3 知识库管理",
     title="知识库“其他管理”API：标签、批量启停、导出、回收站（软删/恢复/彻底删除）、库统计、条目在线编辑、单库重建切片",
     req="基本设计(6) 知识库管理（其他管理）；需求缺口 G9",
     goal="W0-05 冻结的知识库管理扩展端点全部可用，回收站基于 KnowledgeFile.deletedAt，彻底删除同步删除远端文档",
     inputs="W0-06 增补列 deletedAt/tags；C-06 知识库 API；C-04 Coze 删除接口",
     outputs=["src/app/api/knowledge-bases/[id]/{stats,export,rebuild}/route.ts", "src/app/api/knowledge-files/{batch,trash}/**", "src/lib/kb/manage.ts", "src/lib/__tests__/lane-c/kb-manage.test.ts"],
     allow=["src/app/api/knowledge-bases/**", "src/app/api/knowledge-files/**", "src/lib/kb/**", "src/lib/__tests__/lane-c/**", "docs/design/06_validation/evidence/W1-C/**"],
     steps=["失败测试：每个端点 1 正 1 反", "列表默认排除 deletedAt 非空；回收站仅列 deletedAt 非空", "导出为 zip（原文件 + manifest.json）", "重建切片走 C-03 管线，异步任务进度复用 C-06 进度契约"],
     accept=["kb-manage.test.ts 通过", "彻底删除后远端删除被调用（打桩断言）", "批量操作 ids ≤100，超出 400 带 fieldErrors", "全部响应通过 W0-05 schema parse"],
     verify=["npx vitest run src/lib/__tests__/lane-c/kb-manage.test.ts", "GATE"], deps=["C-06"], tier="opus", tier_why="多端点且涉及远端一致性（高难度）", size="大（2 天）", escalate="远端删除失败 → 本地保留 deletedAt 并标记 syncError，不得静默成功")

task(id="E-09", lane="E", wp="WPE.3 特殊页迁移", slice="S-E3 内容中枢",
     title="内容中枢统一管理：多渠道状态列、同时发布 / 定时发布入口、渠道预览 Tab",
     req="基本设计(1) 官网和公众号统一管理；需求缺口 G1",
     goal="在 content-hub 一屏看到每条内容在官网/公众号的状态，可一次选两个渠道立即或定时发布，并分 Tab 预览两端效果",
     inputs="src/app/manager/content-hub 现状只有“发官网”“发公众号”两个立即按钮；W0-05 渠道状态 DTO；publish-jobs API（定时字段以 W0-05 冻结为准）",
     outputs=["src/app/manager/content-hub/**", "tests/e2e/e-content-hub.spec.ts"],
     allow=["src/app/manager/content-hub/**", "tests/e2e/e-*.spec.ts", "docs/design/06_validation/evidence/W1-E/**"],
     steps=["用 A 线 DataTable 渲染渠道状态列（未发布/排期/发布中/已发布/失败）", "发布对话框：渠道多选 + 立即/定时（DateTime 字段）+ 发布前提醒说明", "预览 Tab：官网用前台 Markdown 渲染；公众号用简化样式预览", "五态（空/加载/错误/无权限/成功）按契约⑥"],
     accept=["e-content-hub.spec.ts：双渠道定时发布创建 2 个 publish-job", "无 publish 权限时发布按钮不可见", "a11y 扫描该页 0 critical"],
     verify=["npx playwright test tests/e2e/e-content-hub.spec.ts", "GATE"], deps=["E-05"], tier="opus", tier_why="核心交互页（Hark 自做）", size="大（1.5 天）", escalate="定时字段契约缺失 → 契约变更请求，不得自定 DTO")

task(id="E-10", lane="E", wp="WPE.3 特殊页迁移", slice="S-E5 模型运营",
     title="模型运营：优先级拖拽排序并保存 + 用量统计视图（按模型/按日）",
     req="基本设计(9) 多模型对话优先级；需求缺口 G6/G7",
     goal="在 llm-providers 页拖拽调整优先级，一次 PATCH 保存；用量 Tab 按模型/按日展示调用数与 token",
     inputs="W0-05 冻结的 order 与 usage DTO；E-06 迁移后的 llm-providers 页",
     outputs=["src/app/manager/llm-providers/**", "tests/e2e/e-llm-ops.spec.ts"],
     allow=["src/app/manager/llm-providers/**", "tests/e2e/e-*.spec.ts", "docs/design/06_validation/evidence/W1-E/**"],
     steps=["拖拽排序支持键盘（上/下移按钮）以满足 a11y", "保存失败回滚顺序并 toast", "用量 Tab：表格 + 简单柱状（不引入新图表依赖）"],
     accept=["e-llm-ops.spec.ts：拖拽后刷新顺序保持", "键盘可完成排序", "C-11 未合并时用量 Tab 显示错误态，e2e 该条记 待其他员工完成，W2-05 复跑"],
     verify=["npx playwright test tests/e2e/e-llm-ops.spec.ts", "GATE"], deps=["E-06"], tier="sonnect", tier_why="页面", size="中（1 天）", escalate="—")

task(id="E-11", lane="E", wp="WPE.2 缺失管理页", slice="S-E4 知识库管理",
     title="知识库“其他管理”页面：标签、批量启停、导出、回收站、库统计、条目在线编辑、单库重建",
     req="基本设计(6) 知识库管理；需求缺口 G9",
     goal="管理员在知识库页完成 C-12 提供的全部管理操作，且每个危险操作有二次确认",
     inputs="E-04 知识库管理页；W0-05 知识库管理扩展 DTO",
     outputs=["src/app/manager/knowledge/**", "tests/e2e/e-kb-manage.spec.ts"],
     allow=["src/app/manager/knowledge/**", "tests/e2e/e-*.spec.ts", "docs/design/06_validation/evidence/W1-E/**"],
     steps=["回收站 Tab：恢复 / 彻底删除（二次确认）", "批量启停、批量打标签走 DataTable 批量操作", "统计卡片 + 导出按钮 + 单库重建（进度轮询）", "在线编辑用 A-05 MarkdownField"],
     accept=["e-kb-manage.spec.ts：删除→回收站→恢复闭环", "彻底删除有确认对话框", "C-12 未合并时相关条目记 待其他员工完成，W2-05 复跑"],
     verify=["npx playwright test tests/e2e/e-kb-manage.spec.ts", "GATE"], deps=["E-04"], tier="opus", tier_why="复杂管理交互（Hark 自做）", size="大（2 天）", escalate="—")

_by2 = {t["id"]: t for t in T}
_by2["E-08"]["deps"] += ["E-09", "E-10", "E-11"]

# V0.3 独立校验修正（G1/G7/G10）
_b7 = _by2["B-07"]
_b7["title"] += "；内容中枢后端：渠道状态 DTO 与多渠道一次发布（G1）"
_b7["outputs"] += ["src/app/api/content-items/**：列表/详情返回 W0-05 冻结的渠道状态 DTO（每渠道 状态/排期时间/externalUrl/最近错误）", "src/app/api/publish-jobs/**：POST 支持 channels[] + 可选 scheduledAt，一次事务创建多条 PublishJob（G1）", "src/lib/__tests__/lane-b/content-hub-api.test.ts"]
_b7["allow"] += ["src/app/api/content-items/**", "src/app/api/publish-jobs/**"]
_b7["steps"].append("G1：先写失败测试（渠道状态 DTO parse、双渠道定时一次创建 2 条 job、任一渠道校验失败整体回滚）再实现")
_b7["accept"].append("content-hub-api.test.ts 通过；响应通过 W0-05 渠道状态 schema parse")
_b7["verify"].insert(1, "npx vitest run src/lib/__tests__/lane-b/content-hub-api.test.ts")
_b7["size"] = "大（2 天）"
_c11 = _by2["C-11"]
_c11["title"] += "；模型优先级批量排序 API（G7）"
_c11["outputs"] += ["src/app/api/llm/providers/order/route.ts：PATCH {ids:number[]}，事务内按序写 priority，需 llm:update", "src/lib/__tests__/lane-c/llm-order.test.ts"]
_c11["steps"].append("G7：失败测试覆盖 正常排序 / ids 不全或重复 400（fieldErrors）/ 无权限 403，再实现")
_c11["accept"] += ["llm-order.test.ts 通过", "`test -f src/app/api/llm/providers/order/route.ts`"]
_c11["verify"].insert(1, "npx vitest run src/lib/__tests__/lane-c/llm-order.test.ts")
_c11["size"] = "中（1 天）"
_e11 = _by2["E-11"]
_e11["steps"].append("G10：文件详情显示来源采集条目（collectItemId）并可跳转到采集条目页")
_e11["accept"].append("e-kb-manage.spec.ts：由采集入库的文件详情可跳转到来源采集条目")
_by2["E-09"]["deps"] = ["E-05"]
_by2["E-09"]["inputs"] += "；后端由 B-07 提供（跨线，按 W0-05 DTO 开发，B-07 未合并时 e2e 记 待其他员工完成，W2-05 复跑）"
_by2["E-10"]["inputs"] += "；后端由 C-11 提供（跨线，同上）"
_by2["E-11"]["inputs"] += "；后端由 C-12 提供（跨线，同上）"

# ───────────── V0.4（2026-10-14 13:5x）：远端 upgrade 前进到 827646b（P07 组件库检查点，绕过 Wave 0 直推）
# 证据：evidence/V0.4-827646b-检查点审计.md、evidence/V0.4-827646b-门禁.log
task(id="W0-R0", lane="Z", wp="WP0.0 基线重校准", slice="S0 治理刀",
     title="基线重校准：本地 W0-01~03 变基到 827646b、合并 block-defs 双份、复跑全量门禁并定位 crud-article e2e 失败、AGENTS.md 增加“禁止跨线大提交直进 upgrade”",
     req="规划总指令 §2.4 规划快照必须钉在确定状态；AGENTS.md 并行编排规则",
     goal="用户本机 upgrade = origin/upgrade(827646b) + W0-01~03（变基后），门禁全绿或失败项有根因证据，block 注册表只有一份定义",
     inputs="evidence/V0.4-827646b-检查点审计.md §冲突清单：src/lib/block-registry.ts 必冲突；src/config/block-defs.ts 与 src/lib/block-registry-defs.ts 语义重复；827646b 提交信息称 e2e 7/8（crud-article 搜索空态 beforeEach 登录超时）",
     outputs=["变基后的 W0-01/02/03 提交（同一 Change 说明，保留原 W0 编号）", "src/config/block-defs.ts 为唯一定义；并入 DEFAULT_HOME_BLOCK_ORDER/getBlockDefinition/getBlockDefaultProps；src/lib/block-registry-defs.ts 改为一行 re-export 或删除并改引用", "AGENTS.md §4 增加：禁止跨线大提交直接进 upgrade，必须走 lane 分支 + 独立验证", "docs/design/06_validation/evidence/W0/R0/（门禁日志、e2e 失败根因、变基冲突记录）"],
     allow=["AGENTS.md", "src/config/block-defs.ts", "src/lib/block-registry-defs.ts", "src/lib/block-registry.ts", "src/lib/crud-resources/**", "src/lib/crud-resources.ts", "docs/design/06_validation/evidence/W0/**"],
     steps=["本机：`git fetch origin && git branch backup/w0-local-<日期> && git rebase origin/upgrade`（禁止 reset --hard；W0-04 未提交现场先 `git stash push -u -m w0-04-wip`）", "解决 block-registry.ts 冲突，按 outputs 合并 block-defs 双份", "若本机 W0-04 现场与 827646b 的 manager-fetch.ts/SchemaForm.tsx/package.json 冲突 → 不 pop，按 W0-04 卡在新基线上重做，stash 仅作参考", "复跑 GATE + visual + e2e；crud-article 失败复跑 3 次，记录是否稳定复现与根因（环境慢 / 真实缺陷），真实缺陷交 A-04", "AGENTS.md 增加规则"],
     accept=["`git merge-base --is-ancestor origin/upgrade HEAD` exit 0", "`git grep -n \"BLOCK_REGISTRY\\s*[:=]\" src | wc -l` = 1", "GATE exit 0；visual 46/46", "e2e 8/8，或 crud-article 失败有可复现根因记录且已转交 A-04", "AGENTS.md 含“禁止跨线大提交”条款"],
     verify=["git merge-base --is-ancestor origin/upgrade HEAD && echo REBASED", "git grep -nE \"BLOCK_REGISTRY\\s*[:=]\" src", "GATE", "npm run test:visual && npm run test:e2e"], deps=["W0-03"], tier="opus", tier_why="变基 + 冲突裁决 + 失败根因判定，不可逆影响全部线", size="中（0.5~1 天）", escalate="变基冲突超出 block-defs/block-registry 两处 → 停止，交用户裁决")
_t4 = {t["id"]: t for t in T}
T.remove(_t4["W0-R0"]); T.insert([t["id"] for t in T].index("W0-04"), _t4["W0-R0"])
_t4["W0-04"]["deps"] = ["W0-R0"]
_t4["W0-04"]["inputs"] += "；V0.4：827646b 已让 manager-fetch 透传 fieldErrors（已满足部分），本卡只补错误码枚举、409/429/502/503 文案、P2002→409、visibleTo"
_t4["W0-02"]["inputs"] += "；V0.4：远端 827646b 另建了 src/lib/block-registry-defs.ts，合并规则见 W0-R0"
_t4["W0-07"]["steps"].insert(0, "V0.4：827646b 已加入 @tiptap/* 8 包（^3.31.4，以此为准）与 @axe-core/playwright，并提前移除 radix 两包；本卡只补 mammoth、jsdom、@testing-library/react、@testing-library/dom 与测试收集配置，不得回退 TipTap 版本")
_a5 = _t4["A-05"]
_a5["title"] += "（V0.4：返工——TipTap 改动态导入）"
_a5["inputs"] += "；V0.4 审计：SchemaForm.tsx:18 静态导入 RichTextField，CrudPage.tsx:15 静态导入 SchemaForm → TipTap 进入全部 CRUD 页首屏包"
_a5["steps"].insert(0, "V0.4 返工：RichTextField/MarkdownField 改 next/dynamic（ssr:false + Skeleton 占位），build 输出对比 D-01 基线的 /manager 首屏 JS")
_a5["accept"].append("`grep -nE \"^import .*RichTextField\" src/components/manager/SchemaForm.tsx` 无命中（只允许 dynamic 导入）")
for k, note in [("A-01", "缺 Combobox/RadioGroup/DateTimeInput/DropdownMenu/Tooltip/Popover/Skeleton；已有部件补测试"), ("A-02", "缺 URL 同步；排序仅当前页需改服务端排序；补测试"), ("A-03", "快捷键需为 Ctrl/⌘+S（现为 Ctrl/⌘+Enter）；关联字段需远程搜索（现 limit=100 一次拉取）；ResourceForm 未建"), ("A-04", "原生控件计数已 0；补测试与证据；承接 W0-R0 转交的 crud-article 失败（若为真实缺陷）"), ("A-06", "仅剩 2 处注释命中 @radix-ui，改注释文字即达标")]:
    _t4[k]["inputs"] += f"；V0.4 起点=827646b 部分完成：{note}"
_a7 = _t4["A-07"]
_a7["title"] = "组件发布点 M1（V0.4 改写为回溯式）：以 bb2c0e5..lane/a 全量 diff（含 827646b）独立校验 A-01~A-06 后打 tag w1-ui-kit"
_a7["steps"].insert(0, "V0.4：827646b 已直接在 upgrade 上，验证范围起点统一为 bb2c0e5，827646b 的内容同样逐条按 A 卡验收")
_t4["W2-03"]["inputs"] += "；V0.4：@radix-ui 两包已在 827646b 移除，lock 中残留条目来自 prisma studio 间接依赖，不属本项目"
for k in ("D-06", "E-03"):
    _t4[k]["inputs"] += "；V0.4：block-defs 唯一位置为 src/config/block-defs.ts（W0-R0 合并后），block-registry.ts 结构以 827646b+W0-R0 为准"
# V0.4 剩余规模（827646b 已完成部分，按审计估计，标注“估”）
for k, s in [("A-01", "中（剩余约 1 天，估）"), ("A-02", "中（剩余约 1 天，估）"), ("A-03", "中（剩余约 1.5 天，估）"), ("A-04", "小（剩余约 0.5 天，估）"), ("A-05", "中（返工约 1 天，估）"), ("A-06", "小（<2h，剩余仅注释与校验）")]:
    _t4[k]["size"] = s
# V0.4 门禁复跑结论（evidence/V0.4-827646b-门禁.log）
_r0 = _t4["W0-R0"]
_r0["inputs"] += "；门禁复跑已定位：e2e 失败根因=登录限流（src/app/api/auth/login/route.ts 同 IP 60s≤10 次，整套 E2E 11 处登录，第 8 个用例被挡）；视觉 35/46 在沙箱与对照组 bb2c0e5 完全一致，属字体渲染环境差异"
_r0["allow"] += ["tests/e2e/global-setup.ts", "tests/e2e/fixtures/**", "playwright.config.ts"]
_r0["steps"].insert(3, "E2E 改为 globalSetup 登录一次并复用 storageState（各 spec 的 beforeEach 不再调登录接口）；不得放宽生产限流")
_r0["accept"] = [a for a in _r0["accept"] if not a.startswith("e2e 8/8")] + ["e2e 8/8，且连续两次全套运行均无“尝试过于频繁”", "visual 46/46 在参照截图生成机（用户本机）上复跑通过；沙箱结果仅作参考"]
_a5["accept"].append("生产构建实测 /manager/articles 首屏 JS（gzip -9 全部脚本求和）≤ 359,059 B（基线 352,019 B ×1.02；827646b 实测 586,879 B，+66.7%）")
_a7["accept"].append("视觉门禁在参照机复跑；/manager/articles 首屏 JS 达 A-05 上限")
_t4["D-02"]["inputs"] += "；V0.4：build 出现 Turbopack NFT 警告（instrumentation.ts → src/lib/jobs/backup.ts 动态路径致全项目被追踪），一并处理或记入风险"
_r0["allow"] += ["tests/e2e/*.spec.ts（仅替换登录方式，不改断言）"]
