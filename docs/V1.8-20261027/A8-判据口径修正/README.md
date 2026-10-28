# A8 · 判据口径修正（元缺陷）

## 归属
- 阶段编号：A8
- 所属分组：A 能力对等（承接 V1.7 WP4）
- 来源凭据：`V1.7/00-双基线事实对照.md §九 D1/D2`、`08-管理层裁决.md`

## 目标
修正 `parity-matrix` 的判据缺陷 —— 它用「文件存在」冒充「能力等价」，导致 V1.7 一次漏判 9 个组件 + 8 个键。**同时补 ADR 记录无记录的裁撤。**

## 为什么需要它（三级凭据）

### ① 代码位置
```
docs/design/02_requirements/parity-matrix.md:50
| A1 | 首页 11 区块 | ... | **present** |
理由栏写：「**11 个区块组件全部存在**」
```

### ② 实测证据
```bash
$ sed -n '50p' docs/design/02_requirements/parity-matrix.md | grep -o "全部存在"
全部存在

# 但实测 9 个组件中 8 个丢了 props
$ for c in NewsCenter CampusSection CourseSectionNew CompanyIntro CertificateGallery PartnerUniversities; do
    echo -n "$c: "; grep -c showOverlay "src/components/web/$c.tsx"; done
NewsCenter:0  CampusSection:0  CourseSectionNew:0
CompanyIntro:0  CertificateGallery:0  PartnerUniversities:0

# 且无任何 ADR 记录这次裁撤
$ grep -rln "showOverlay\|props.*裁\|能力.*撤" docs/design/03_solution/decisions/*.md
（空）
```

### ③ 规划落点
- 不修 → **下次重构还会再丢一次**，且同样不会被矩阵发现
- 本卡是「修验证机制」，不是文书工作

## 输入
- 前置阶段：**A5**（需引用 A5 的「能力已恢复」证据）
- 前置状态：A1~A5 完成

## 输出
- 修改：`docs/design/02_requirements/parity-matrix.md`（A1 行 + 文件头判据说明）
- 新增：`docs/design/03_solution/decisions/ADR-034-首页区块组件能力对齐.md`
- 修改：`docs/V1.7-20261027/06-风险与待裁决.md`（登记 AIConfig 拆分）

## 原子步骤

### STEP-A8-1 · 改 A1 行判据

**改前**（`:50`）：理由栏 = 「11 个区块组件全部存在」

**改后**：理由栏改为三项能力清单
```
- 11 个区块组件存在（文件级）
- 9 个组件 props 与原版对等（A3 恢复，含 showOverlay/showContent/bgImage 等）
- 8 组配置键存在且前台可消费（A2 注册 + A4 接线，A5 已验证默认态不变）
```

### STEP-A8-2 · 文件头加判据说明

在 `parity-matrix.md` 的状态口径段（`:17` 附近）追加：

```markdown
> **判据强化（V1.8）**：`present` 必须证明「**能力等价**」，不得以「文件存在」代证。
> 具体须核对：① 组件/props 是否齐全 ② 配置项是否可消费 ③ 行为是否可复现。
> 反例：V1.7 发现首页 9 个组件虽全部存在，但 8 个丢失 `showOverlay` 等 props，
> 旧口径下仍判 present —— 这是判据缺陷，已修正。
```

### STEP-A8-3 · 写 ADR-034

```markdown
---
id: ADR-034
title: 首页区块组件能力对齐（props 恢复）
status: accepted
date: 2026-10-27
---

# ADR-034：首页区块组件能力对齐

## 背景
upgrade 分支重构时，9 个首页区块组件的 props 被裁撤（8 个丢 showOverlay，
TopBanner/StatsBanner 丢背景图注入，FourCards 丢 7 个卡片字段），
且**无 ADR、无 changelog 记录**。parity-matrix 因以「文件存在」为判据，未发现。

## 决策
恢复与原版对等的 props 与配置键，默认值与原版一致，保证默认渲染零变化。

## 影响
- 新增 11 个配置键（A2）
- 10 个组件加 props（A3）
- 5 个入口文件接线（A4）
- 默认态经 A5 四道验证确认不变
- 风险：若默认值写错会导致前台视觉变化（已用 A5 拦截）
```

### STEP-A8-4 · 登记 AIConfig 拆分缺口

在 `docs/V1.7-20261027/06-风险与待裁决.md` 追加：
```markdown
## 八、补充登记（V1.8/A8）

| 项 | 事实 | 处置 |
|---|---|---|
| AIConfig → LLMProvider 拆分 | 无 ADR 记录；`userPrompt` 字段丢失（V1.7 裁决 1 已证为死字段） | 记为「变更未记录」，不补 ADR（因拆分为合理重构） |
```

### STEP-A8-Z · 体检

| # | 项 | 命令 | 期望 |
|---|---|---|---|
| 1 | A1 行含能力清单 | `sed -n '50p' parity-matrix.md \| grep -c "能力等价\|props"` | ≥1 |
| 2 | 文件头有判据说明 | `grep -c "不得以「文件存在」代证\|能力等价" parity-matrix.md` | ≥1 |
| 3 | ADR-034 存在 | `ls docs/design/03_solution/decisions/ADR-034*.md` | 存在 |
| 4 | ADR 三节齐全 | `grep -cE "^## (背景\|决策\|影响)"` | 3 |
| 5 | 其他 present 行未改 | `git diff --stat parity-matrix.md` | 只增行 |
| 6 | 未改 src | `git status --short src` | 空 |

## 验收标准
- [ ] A1 行判据含三项能力（可自动化 grep）
- [ ] 文件头有「present 须证明能力等价」（可自动化）
- [ ] ADR-034 含背景/决策/影响三节（可自动化）
- [ ] 06 文档含 AIConfig 登记（可自动化）
- [ ] 未改动其他 present 行（可自动化 diff）
- [ ] 未改 `src/**`（可自动化）

## 验证命令
```bash
cd /e/Code/Demo/HDwebsite/hdwebsite_1011
sed -n '45,55p' docs/design/02_requirements/parity-matrix.md
grep -c "能力等价" docs/design/02_requirements/parity-matrix.md
ls docs/design/03_solution/decisions/ADR-034*.md
grep -cE "^## (背景|决策|影响)" docs/design/03_solution/decisions/ADR-034*.md
git diff --stat docs/design/02_requirements/parity-matrix.md
git status --short src
```

## 证据路径
`evidence/V18/A8/execution.md`

## 允许修改
- `docs/design/02_requirements/parity-matrix.md`（A1 行 + 文件头）
- `docs/design/03_solution/decisions/ADR-034*.md`（新增）
- `docs/V1.7-20261027/06-风险与待裁决.md`（追加）

## 禁止修改
- 其他 59 行 present 的判定值
- 任何 `src/**`、`tests/**`
- 需求文档正文

## 依赖与阻塞
- Depends on：A5
- Blocks：无（E1 不依赖它）
- 阻塞条件：若发现 >5 行 present 有同类漏判 → **只登记不开修**，写进待办

## 建议执行档位
`sonnect`　理由：改判据描述 + 写 ADR，无代码风险。

## 升级条件
若发现 >5 行同类漏判 → 升级 `opus`，评估是否需独立的「parity 全面复核」阶段

## 预估规模
小（2h）

## 自我质疑

**质疑：改一段判据描述，值 2 小时吗？**
→ 值。因为它影响**未来每次重构**。
- ① 不修：下次重构同样丢 props，矩阵同样看不见
- ② 修了：判据明确要求核 props/配置/行为
- ③ 这不是修一次缺陷，是修**发现缺陷的机制**

**质疑：为什么不顺便把其余 59 行也复核一遍？**
→ 那是独立的大工作量（每行都要回原版对照）。**本轮只修已发现的最严重一处（A1），其余登记待办。** 不宣称「矩阵已完全可信」。
