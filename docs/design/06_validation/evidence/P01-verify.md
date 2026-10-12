---
id: EVD-P01-VERIFY
type: evidence
title: P01 需求——独立校验报告
status: final
created: 2026-10-12
related: [PROMPT-P01, EVD-P01-EXECUTION, REQ-F-013, REQ-F-014, REQ-F-015, ADR-024, ADR-025]
---

# P01 独立校验报告

- 校验范围：`2cafee1..85ad47a`（branch `upgrade`，5 个提交：4896222、05e9a36、c7a5f8b、56beefd、85ad47a），只看 diff 与命令运行结果，未采信执行者证据。
- 标准：`docs/design/04_planning/review-prompts/P01-需求.md` 验收标准；`hdw-orchestration.md` 10:16 用户裁决（D1~D5）；`AGENTS.md`；规划总指令。
- 环境：node v22（EBADENGINE 警告），本地 `.env.local`、`prisma/dev.db` 存在（gitignored）。

## 总结论：**PASS**（无 FAIL；10 条非阻断观察见末节）

## 1. 路径边界

| 检查 | 结果 | 证据 |
| --- | --- | --- |
| 改动仅在 `docs/design/**`、`AGENTS.md` | PASS | `git -c core.quotepath=off diff --name-only 2cafee1..85ad47a \| grep -vE '^(docs/design/\|AGENTS.md$)'` → 空（35 个文件全部为文档） |
| 越界（目录内的所有权） | PASS（有理由） | `06_validation/evidence/P0-baseline.md` 被改（current-plan §9 写"禁止改他方向证据"）：只追加 P0-verify 勘误 #1/#2/#5 的注释，原值保留 → 理由成立。`review-prompts/P01` 自身加了"执行时更新"横幅并把 status 改为 done（原验收文字未删）；P02~P15 按用户裁决更新 → orchestration 要求如此 |
| 禁止路径 src/prisma/scripts/public/package*/配置 | PASS | 同上命令，无命中 |

## 2. 验收标准（P01 提示词）

| # | 标准 | 结果 | 证据 |
| --- | --- | --- | --- |
| 1 | `ls REQ-F-01{3,4,5}-*.md AGENTS.md ADR-024-*.md` 全部存在 | PASS | 5 个文件列出（另有 ADR-025） |
| 2 | `grep -c "P0[1-9]\|P1[0-5]" product-requirements.md` ≥ 14 | PASS | 输出 20；§6.1 M-1~M-14 每行都有方向与验证命令 |
| 3 | parity-matrix 每个 missing/partial 行带方向 | PASS | 提示词 python 片段：`rows without direction: 0`（57 行；汇总 present 16/replaced 9/partial 21/missing 11/dropped 0，我逐行复算一致） |
| 4 | `git diff --name-only HEAD~1` 只有文档 | PASS | HEAD~1 与整段 2cafee1..HEAD（quotepath=off）均为 "only docs"。注：不加 `-c core.quotepath=off` 时中文路径带引号，会被误判（观察 O1） |
| 5 | （人工）ADR-024 状态 proposed、未替用户裁决 | PASS（按用户裁决调整，理由成立） | ADR-024 为 `accepted`、`supersedes: [ADR-012]`，并写明来源是 2026-10-12 用户裁决（orchestration 10:16："U-B2 -> restore homepage block config + ElementConfig, overriding ADR-012"）。保持 proposed 反而会违背有约束力的裁决；"不替用户裁决"的本意已满足 |
| 6 | 输出：REQ-F-013/014/015 沿用 front matter，含用户故事/验收/MUST/关联 | PASS | 三份文件 front matter 有 id/status/priority MUST/related；REQ-F-014 §5 第 1 条 = `npm run test:visual`（P02 建立） |
| 7 | 输出：product-requirements §1/§4/§6 | PASS | §1 增 012~015；§4 改为前台 15 路由 + 2 个 news 重定向页（与 `git ls-files 'src/app/(web)'` 的 14 个 page.tsx + not-found 相符）；§6/§6.1 追溯 |
| 8 | 输出：backlog 按方向列缺口并引用 parity 行号 | PASS | 脚本核对：32 个 missing/partial 行全部被 backlog 引用（漏 0） |
| 9 | 输出：assumptions A-1~A-7、risks R-P1~R-P7（+R-P8/R-P9） | PASS | assumptions.md、risks.md §2.1 |
| 10 | 输出：master-plan 加取代指引，§1/§3 口径更正，不删历史 | PASS | master-plan.md:14 取代横幅；§1 I3 更正块；§3 M-1 更正；§5 ADR-012 更正 |
| 11 | 输出：AGENTS.md（≤120 行；读取顺序/风格冻结/迁移所有权/禁止事项/完成定义/验证命令） | PASS | 83 行；§1~§7 覆盖全部要求项 |
| 12 | 输出：document-index 收录新文件 | PASS | REQ-F-013/014/015、parity-matrix、review-prompts、ADR-024/025、P0-verify/P01-execution、AGENTS.md 都已收录 |
| 13 | 证据路径 `evidence/P01/` | PASS | `evidence/P01/verify-output.md` + `evidence/P01-execution.md` |

## 3. 有约束力的决定与一致性

| 检查 | 结果 | 证据 |
| --- | --- | --- |
| D1 红色横幅轮播（前台外观不变） | PASS | REQ-F-014 §1/§3（`--primary: #da251d`、TopBanner+Banner）；`git show origin/main:src/app/globals.css` :70 `--primary: #da251d` 已核实；current-plan D1/M-2；AGENTS.md §2/§3；P02 目标 1 + `grep '--primary: #da251d'` 验收 |
| D2 对等 + ADR-024 取代 ADR-012 | PASS | REQ-F-013 §3.2（不允许 dropped-by-ADR）；ADR-024 accepted/supersedes；ADR-012 状态 → superseded by ADR-024（原文保留）；parity C9/C10 → missing（P04/P06/P07）；current-plan K1/U-B2/§5/§8/§9；P02（data-block 锚点）、P04（4 表 + seed，仅加法）、P06（registry + API + page.tsx 组合层）、P07（3 个管理页）、P15（ADR-012 不得作为删除依据） |
| D3 Coze；只收 .docx/.doc/.md/.markdown/.txt；拒 PDF/图片 | PASS | ADR-025 决策 + 第 2 条（扩展名 + MIME + 文件头三重校验，拒 `%PDF`/image/*，返回 400）；REQ-F-007 更新；REQ-F-006 更新；current-plan D3/K4/U-B3/M-10/§5 p12；P12 全文重写（白名单、伪装 pdf/图片测试、`grep pdf-parse\|pdfjs\|tesseract` 守卫、禁止 PDF/OCR 依赖）；P13/P14/P15 同口径。全仓 grep 无文件把 PDF/图片/HTML 列为允许上传（只剩 12-知识库设计.md 的旧写法，见 O3） |
| D4 微信/SMTP 无凭证 → mock，真实联调 UNKNOWN | PASS | current-plan D4、U-B1/U-B4、M-9/M-13、R-P5；AGENTS.md §2；P02~P15 横幅 |
| D5 管理端顶级体验 | PASS | REQ-F-015（验收可执行：grep/axe/375px E2E/401-403）；current-plan D5/M-3；AGENTS.md §2；P02/P05/P07/P13 引用 REQ-F-015 |
| P02~P15 横幅一致 | PASS | 14 份提示词横幅逐字相同（md5 287957d1），都含红色轮播、ADR-024、Coze 白名单、mock/UNKNOWN |
| 未知登记册 | PASS | current-plan §3.4：U-B1~U-B4 全部标为已裁决，并写明残留 UNKNOWN；原条件方案折叠保留；§12 "待裁决：无" |
| ADR 改号 026/027 | PASS | P04 → `ADR-026-ViewStats处置`、P09 → `ADR-027-适配器注册表`；backlog BL-P04-2 = ADR-026；P01-execution 同口径。`git grep` 显示 HEAD 上已没有 ADR-025=ViewStats 或 ADR-026=注册表 的旧引用；decisions/ 目录最大编号 = 025 |
| AGENTS.md 与规范/决定一致 | PASS | 读取顺序（规划总指令→current-plan→提示词）、迁移只允许 P04/P06/P12 各 1 个（迁移名与 current-plan §5 一致）、完成定义原样引用 §9.2、禁止事项与通用约束一致 |
| 未提交密钥 | PASS | diff 新增行密钥正则扫描（sk-/ghp_/pat_/AKIA/私钥/api_key=/password=/token=）无命中；`admin123` 是文档中已有的 seed 默认值（P0 前 10 个文件已有），不是新增密钥 |
| 前台外观、main 功能对等未被削弱 | PASS | 本阶段只改文档；需求反而更严（dropped-by-ADR=0） |

## 4. 命令复跑（校验者本机）

| 命令 | 结果 |
| --- | --- |
| `npm run lint` | exit 0；0 error / 25 warning（与 P0 基线相同） |
| `npm run typecheck` | exit 0 |
| `npm test` | exit 0；6 个测试文件，33/33 通过 |
| `npm run build` | exit 0；编译 27.2s，生成 37/37 个静态页；1 条已知 Turbopack 警告 `⨯ cssChunking` |
| `test:visual` / `test:e2e` | N/A（package.json 里还没有，分别由 P02/P05 建立） |
| `git status --porcelain`（跑完测试/构建后） | 空，跟踪文件没有变化 |

## 5. 抽查（事实与回归）

| # | 抽查 | 结果 | 证据 |
| --- | --- | --- | --- |
| S1 | ADR-024 引用的 main schema 行号 | PASS | `origin/main:prisma/schema.prisma`：PageTemplate :334、ContentBlock :369、TemplateBlock :407、ElementConfig :565、Navigation.templateId :101-102、elements :129、ElementConfig.navigationId :573 |
| S2 | main block-registry 为 192 行，含 8 个 home-* 区块 | PASS | `wc -l` = 192；codes：banner/topbar/stats/intro/courses/news/cta/partners |
| S3 | main seed :451-485 有 4 个模板 + 4 个区块 | PASS | list/article/partner-grid/course-list；home-banner/news-list/sidebar-hot/course-recommend |
| S4 | Coze 文本知识库本地文件类型 = pdf/txt/doc/docx（不含 md）、每次 ≤10、需 Agw-Js-Conv、需 createDocument 权限 | PASS | 实际打开 https://docs.coze.cn/developer_guides_create_knowledge_files.md 核实 → md→txt 映射合理 |
| S5 | current-plan 勘误：API 87 / manager 34 | PASS | `git ls-files src/app/api \| grep -c /route.ts$` = 87；manager page.tsx = 34 |
| S6 | M-5 行号 wechat.ts:118 | PASS | `src/lib/wechat.ts:118` 含 `400-001-5729` |
| S7 | REQ-F-014 背景：upgrade 当前为蓝色 | PASS | `src/app/globals.css:7 --primary: #1d4ed8` |
| S8 | main 有 AGENTS.md + CLAUDE.md（`@AGENTS.md`），对应 parity E2 | PASS | `git ls-tree origin/main`；CLAUDE.md 由 P11 负责（BL-P11-4） |

## 6. 观察（非阻断，建议后续方向处理）

- O1 P01 提示词第 4 条验收命令（以及其他提示词里同类的 `git diff --name-only … | grep -vE '^docs/…'`）遇到中文路径时，git 默认 quotepath 会给路径加引号，导致误报（执行者首跑就出现 FAIL，加 `-c core.quotepath=off` 后才通过）。建议后续命令统一用 `git -c core.quotepath=off diff --name-only`。
- O2 执行者在 P01 提示词中加了"执行时更新"横幅，调整了第 6 步和人工验收 #5 的口径。原文保留，裁决来源可追溯，但以后修改验收标准，最好由编排方而不是执行者来做。
- O3 `docs/design/12-知识库设计.md:53/:70` 还写着 format html、"导入（md/txt/docx）"，是旧口径（已被 REQ-F-007 更新段和 ADR-025 取代）。不在 P01 输出清单内，建议 P12 同步更新该设计文档。
- O4 ADR-025 第 21 行只给了 dataset 创建的 `format_type`，document/create 的 body 没写 `format_type`（Coze 文档标为必选）。P12 提示词目标 3 已包含 `format_type:0`，实现不受影响，可顺手补进 ADR-025。
- O5 拒绝提示文案只写了"Markdown（.md）"，白名单还含 `.markdown`。属文案问题。
- O6 AGENTS.md §8 写证据放在 `evidence/PXX-execution.md`，各提示词通用约束写的是 `evidence/<方向编号>/`。两处可以并存，但建议 AGENTS.md 把两处都写明。
- O7 P02~P15 横幅没有列出 D5（管理端顶级体验）。不过 P02/P05/P07/P13 都引用了 REQ-F-015，AGENTS.md §2 也有，不构成遗漏。
- O8 P04 的"仅加法"守卫只 grep `drop column|delete from`。SQLite 给 Navigation 加列时可能生成 RedefineTables（DROP TABLE + INSERT…SELECT），守卫不会报错。提示词正文已要求人工审 SQL，P04 的验证者应逐行检查。
- O9 REQ-F-013 写"前台 15 路由"，§1 又写"前台 16 个 page.tsx"（main 口径，含 news 重定向）。两者口径不同，但各自都说明了，不矛盾。
- O10 构建耗时：本次编译 27s，P0 记录的 92s/119s 指整体构建，不是同一个指标。P10 立项时应统一测量口径。

## 7. FAIL 修复清单

无。
