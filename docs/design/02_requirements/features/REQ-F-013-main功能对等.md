---
id: REQ-F-013
type: requirement
title: main 功能全量对等（upgrade 必须包含 main 上的每一个功能）
status: accepted
priority: MUST
owner: 产品所有者
created: 2026-10-12
updated: 2026-10-12
source: 用户本轮原意（current-plan §3.1）；2026-10-12 用户裁决再次确认（"main 上的每个功能都要在 upgrade 存在"）
related: [PARITY-MATRIX, PLAN-CURRENT, ADR-024, ADR-012, ADR-001, ADR-022]
---

# REQ-F-013：main 功能全量对等

## 1. 基本信息

| 项 | 值 |
| --- | --- |
| 类型 / 状态 | functional / accepted |
| 优先级 | MUST（current-plan §3.2 M-1） |
| 对照基准 | `origin/main@94dbbbb`（旧站，A 仓口径：32 模型、前台 16 个 page.tsx、管理端 26 页、API 56 个 route.ts）；补充参照 main 首提交 `c6ff40b`（B 仓业务域：Major/EnrollmentOffering/media batch 等） |
| 事实清单 | `02_requirements/parity-matrix.md`（57 行，A~E 节） |

## 2. 背景

upgrade 为平行新仓重写（ADR-011）。P0 对等矩阵显示 upgrade 仍有 missing 9、partial 21、dropped-by-ADR 2（parity-matrix 汇总）。master-plan §3 M-1 曾声称"全部重建且行为对齐"，与代码不符（current-plan I1）。用户于 2026-10-12 再次确认：**main 上的每个功能都必须在 upgrade 存在**；ADR-012 裁剪的首页区块配置与 ElementConfig **恢复**（ADR-024 取代 ADR-012）。

### 用户故事

作为站点所有者，我想在切换到 upgrade 后不丢失旧站任何一项能力（页面、接口、后台功能、配置、部署件），以便切换零功能回退，并在此之上获得新增能力。

## 3. 需求描述

1. parity-matrix 中每一行的最终状态只能是 `present` 或 `replaced`（经 ADR 以等价或更强实现替代、功能覆盖）。
2. `dropped-by-ADR` 状态不再允许：C9 首页区块配置（block-registry + ContentBlock/PageTemplate/TemplateBlock）、C10 交互点配置 ElementConfig 按 ADR-024 恢复。
3. 每个 `missing`/`partial` 行都有唯一归属方向（P01~P15），由该方向在其验收中把状态改为 present/replaced。
4. `replaced` 行必须在 parity-matrix 中引用对应 ADR/SOL，且旧入口有兼容（重定向或等价端点），不得出现"旧链接 404"。

## 4. 范围

### In Scope
- 前台 15 个路由 + 2 个 news 重定向页的功能与内容（视觉另由 REQ-F-014 约束）。
- main 的全部 API 能力（含 articles PATCH、media PATCH/batch、chat-history、logs）。
- main 的全部管理端页面能力（含 chat-history、logs、富文本 TipTap、首页区块配置、交互点配置）。
- main 的设置键（68 键）、重定向（29 条）、静态资源 `public/**`（150 个）、部署件（Dockerfile/docker-compose/.dockerignore）、代理规则文件（AGENTS.md/CLAUDE.md）。
- main 的数据模型（含 ADR-024 恢复的 4 个模型与 Navigation.templateId / ElementConfig.navigationId 关联）。

### Out of Scope
- main 中的截图、日志、`website_error/` 副本等非功能性文件。
- `website_error/.token.txt` 等凭据文件（安全规则，不读不迁）。

## 5. 验收标准

- [x] （自动，最终于 P15 收口）parity-matrix 中 `missing`=0、`partial`=0、`dropped-by-ADR`=0：（证据：docs/design/02_requirements/parity-matrix.md）
  ```bash
  python3 - <<'PY'
  import re
  t=open("docs/design/02_requirements/parity-matrix.md").read()
  rows=[l for l in t.splitlines() if re.match(r"\| [A-E]\d+ \|",l)]
  bad=[l.split("|")[1].strip() for l in rows if re.search(r"\| *(missing|partial|dropped-by-ADR)",l)]
  print("open rows:",bad); assert not bad
  PY
  ```
- [x] （自动，P01 起每方向）每个 missing/partial 行带方向编号（P01 验证命令中的 python 片段）。（证据：docs/design/02_requirements/parity-matrix.md）
- [x] （自动）各方向在其验收中更新所负责行的状态，并附证据路径。（证据：docs/design/02_requirements/parity-matrix.md）
- [ ] （人工）独立验证者抽查 ≥10 行，main 证据与 upgrade 证据均可复现。

## 6. 方向归属（摘要，明细见 parity-matrix 与 backlog）

| 方向 | 负责行 |
| --- | --- |
| P01 | E2（AGENTS.md） |
| P02 | A1~A16（A6 与 P05 共担）、A19（恢复）、A3 |
| P03 | B3、B6（路径兼容决定）、B7、B8、B11、B12、C4/C5（页面） |
| P04 | C9/C10 数据模型恢复（迁移 p04）、D4 |
| P06 | C9/C10 注册表 + API + 首页按区块配置渲染（视觉不变） |
| P07 | C4/C5/C6、C9/C10 管理页 |
| P11 | A18、A22、E1、E3、E2（CLAUDE.md） |
| P15 | A19（治理）、最终 parity 收口 |

## 7. 关联

- parity-matrix.md、current-plan §3.2 M-1、ADR-024（取代 ADR-012）、ADR-001（News→Article）、ADR-022（B 仓补录）。
