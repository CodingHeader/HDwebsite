# TASK WP4：文档口径修正（元缺陷）

## 归属
- 所属工作包：WP4
- 来源需求：验证机制的可信度（`AGENTS.md §6` 完成定义）
- 来源方案：`docs/V1.7-20261027/00-双基线事实对照.md` §九 D1/D2/D4

## 目标
修正 `parity-matrix` 的判据缺陷（「以文件存在代能力对等」），并补 ADR 记录，使未来的重构不再漏判同类问题。

## 输入
- 文档：`00-双基线事实对照.md` §九
- 契约：无
- 前置任务：**WP1 完成**（需引用完成后的能力清单作为证据）
- 前置状态：A1 行现为「11 个区块组件全部存在」→ `present`

## 输出
- 修改：`docs/design/02_requirements/parity-matrix.md`
- 新增：`docs/design/03_solution/decisions/ADR-034-首页区块组件能力对齐.md`
- 修改：`docs/V1.7-20261027/06-风险与待裁决.md`（登记 AIConfig 拆分无 ADR）

## Execution Steps
1. [ ] `STEP-4-1` 改 A1 行判据为能力清单 + 文件头加判据说明
2. [ ] `STEP-4-2` 写 ADR-034
3. [ ] 在 06 登记「AIConfig 拆分无 ADR / userPrompt 丢失」

## 验收标准
- [ ] A1 行含三项能力（组件存在 / props 对等 / 配置键存在），不再只写「存在」（人工判断）
- [ ] 文件头含判据说明：「present 须证明能力等价」（可自动化 grep）
- [ ] ADR-034 含三节：问题 / 决策 / 影响（可自动化 grep）
- [ ] 06 含 AIConfig 记录（可自动化 grep）
- [ ] **未改动其他 present 行的判定值**（可自动化 diff 检查）

## 验证命令
```bash
cd /e/Code/Demo/HDwebsite/hdwebsite_1011
sed -n '1,30p' docs/design/02_requirements/parity-matrix.md | grep -n "能力等价\|判据"
grep -n "A1 " docs/design/02_requirements/parity-matrix.md | head -2
ls docs/design/03_solution/decisions/ADR-034*.md
grep -n "AIConfig\|userPrompt" docs/V1.7-20261027/06-风险与待裁决.md | head -3
git diff --stat docs/design/02_requirements/parity-matrix.md
```

## 证据路径
`docs/design/06_validation/evidence/V17/WP4/`

## 允许修改
- `docs/design/02_requirements/parity-matrix.md`（仅 A1 行 + 文件头）
- `docs/design/03_solution/decisions/ADR-034*.md`（新增）
- `docs/V1.7-20261027/06-风险与待裁决.md`（追加）

## 禁止修改
- 其他 59 行 present 的判定值
- 任何 `src/**`、`tests/**`
- 需求文档正文（`features/*.md`）

## 依赖与阻塞
- Depends on：WP1（需其完成证据）
- Blocks：无
- 阻塞条件：若发现其他 present 行也有同类漏判 → **只登记不开修**（逐行复核是独立工作量），写进 06 待办

## 建议执行档位
`sonnect`　理由：改判据描述 + 写 ADR，无代码风险但需准确。

## 升级条件
若发现 >5 行 present 存在同类漏判 → 升级 `opus`，评估是否需要独立的「parity 全面复核」卡。

## 预估规模
小（2 小时）

## 为什么这是独立工作包

它不产生面向用户的功能，但**修的是验证机制本身**。

`parity-matrix` 是「功能对等」的唯一权威。它的判据一旦是「文件存在」，未来每次重构都会漏判「组件在但能力退化」——V1.7 发现的 9 个组件 props 丢失就是这么漏的（`00 §九 D1`）。

**不修它，这次修的 11 个键下次重构还会再丢一次。**
