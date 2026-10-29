# ADR-01 · 前台冻结例外追认 + 基线策略

## 归属

- 阶段编号：ADR-01
- 分组：治理（补登记）
- 来源：`88e72d69` 外部提交（用户 2026-10-29 移动端导航裁决）

## 目标

为 `88e72d69` 追认前台冻结例外，产出 **ADR-039**；并记录视觉基线 stale 的处置策略。

## 为什么需要它（三级凭据）

### ① 来源
REQ-F-014：

> 组件 JSX/className 与 main **逐字一致**；允许差异仅限 import 路径、类型、数据适配层、XSS 净化、Markdown 渲染、SEO/埋点。

用户 2026-10-29 裁决：修复移动端导航竖排与悬浮层遮挡。

### ② 实现
`88e72d69` 改动 5 文件：

```
prisma/seed.ts                          | 24 +++++----
public/site.webmanifest                 | 13 +++----
src/components/web/FloatingContact.tsx  | 30 +++++----
src/components/web/Navbar.tsx           |  4 ++--
src/components/web/data/home.ts         |  4 +++-
```

其中 3 个 `src/components/web/**` 文件**实质改写了 className 值**：

```diff
-<div className="fixed right-4 bottom-20 z-50 flex flex-col gap-3">
+<div className="fixed right-3 bottom-16 md:right-4 md:bottom-20 z-50 flex flex-col items-end md:items-stretch gap-2.5 md:gap-3">

-<span className="text-sm font-medium">在线客服</span>
+<span className="hidden md:inline text-sm font-medium">在线客服</span>

-          className="w-10 h-10 rounded-full bg-white/20 ..."
+          className="w-11 h-11 md:w-10 md:h-10 rounded-full bg-white/20 ..."
```

### ③ 验证
```bash
$ git merge-base --is-ancestor ad4cf70e 88e72d69 && echo "基线是祖先"
基线是 88e72d69 的祖先 → 基线落后于前台改动
```

视觉基线 `ad4cf70e`（10-27）早于前台改动 `88e72d69`（10-29）。

**缺口**：`docs/design/03_solution/decisions/` 下无对应 ADR，无据可依。

## 输入

- 前置：无
- 已证实：`88e72d69` 改动面、基线 stale
- 授权：用户 2026-10-29 裁决

## 输出

1. **`docs/design/03_solution/decisions/ADR-039-前台冻结例外-移动端导航与悬浮层.md`**
2. `docs/design/06_validation/evidence/V20/ADR-01/execution.md`

## 核心判据

**ADR 必须含以下 6 节**（缺一即 FAIL）：

| # | 节 | 内容要求 |
|---|---|---|
| 1 | `## 背景` | 用户遇到的移动端问题（竖排、遮挡），以及为何必须改 className |
| 2 | `## 决策` | 例外成立，列出受影响的 3 个文件 |
| 3 | `## 影响` | 桌面端渲染不变（仅 `md:` 前缀差异）；视觉基线需更新 |
| 4 | `## 边界` | **白名单 3 文件**；仅允许移动端响应式类；不可外推 |
| 5 | `## 不可外推` | 明确：本条不构成其他前台文件的例外依据，后续改动须重新裁决 |
| 6 | `## 后续` | 基线 stale 的处理策略（见下） |

**配套约束**：`src/**` 零改动（本卡纯文档）。

## ADR-039 的边界必须写清这 5 条

1. **文件白名单**：仅 `FloatingContact.tsx`、`Navbar.tsx`、`data/home.ts`
2. **改动性质**：仅移动端响应式类（`md:`/`hidden md:inline` 等）；桌面端渲染须与 main 一致
3. **理由**：用户 10-29 裁决的移动端遮挡/竖排
4. **不可外推**：不得据此认为其他前台文件可自由改 className
5. **后续任何前台改动**：须重新裁决

## 基线策略（ADR 的 `## 后续` 节要回答）

| 方案 | 做法 | 采纳 |
|---|---|---|
| A · 本轮重建基线 | `VISUAL_REF=1` 本地重建 | ❌ win32 字体不可信，会污染基线 |
| B · 交 CI 重建 | 在 Linux CI 跑 `--update-snapshots` 后提交 | ✅ **建议**，但需用户在 CI 侧操作 |
| C · 不重建 | 保持 stale，视觉 FAIL 一律 UNKNOWN | ❌ 基线会永久失效，后续所有视觉门禁成噪音 |

**建议 B**，但**本卡只记录策略，不执行重建**。实际重建另立卡或由用户在 CI 侧完成。

## 执行步骤

| 步 | 内容 |
|---|---|
| 1 | 读 `88e72d69` 完整 diff，确认所有 className 改动行 |
| 2 | 用 §"验证手段"的命令确认剩余差异是否都带 `md:` |
| 3 | 起草 ADR-039，含 6 节 |
| 4 | 若发现非 `md:` 的实质差异（如删了元素、改了颜色值），在 ADR 的 `## 影响` 中额外说明 |
| 5 | 写 evidence |

## 验证手段（确认「仅移动端」边界）

```bash
cd "E:/Code/Demo/HDwebsite/hdwebsite_1011"

# 1) 列出所有 className 差异，剔除含 md: 的行
git show 88e72d69 -- 'src/components/web/**' \
  | grep -E "^[-+].*className" \
  | grep -vE "md:|:md" > /tmp/adr01-rest.txt

echo "剩余非响应式差异行数: $(wc -l < /tmp/adr01-rest.txt)"
cat /tmp/adr01-rest.txt
```

**判读**：
- 剩余 0 行 → 纯移动端响应式，ADR 可按"最窄例外"写
- 剩余 >0 → 需逐行判断性质，并在 ADR 中说明（如 `w-10`→`w-11` 是移动端放大，属设计意图）

## 允许修改

- `docs/design/03_solution/decisions/ADR-039-*.md`（新建）
- `docs/design/06_validation/evidence/V20/ADR-01/**`
- `docs/V2.0-20261029/state.json`（回填本卡）

## 禁止修改

- `src/**`（本卡纯文档）
- `tests/**`、`prisma/**`
- `tests/visual/reference/**`（不重建基线）
- V1.8/V1.9 历史目录与其证据
- `88e72d69` 本身（已推送，不重写历史）

## 验证命令

```bash
# ADR 存在且含 6 节
test -f docs/design/03_solution/decisions/ADR-039-*.md && echo "PASS 文件存在"
grep -cE "^## (背景|决策|影响|边界|不可外推|后续)" docs/design/03_solution/decisions/ADR-039-*.md
# 期望 6

# src 零改动
test -z "$(git status --short src/)" && echo "PASS src 未动"

# 基线未动
git status --short tests/visual/reference/ | head   # 期望空
```

## 依赖与阻塞

- Depends on：无
- 当前：**READY**

## 注意事项

`prisma/seed.ts` 的改动（院校 13 家）**不属于冻结面**（AGENTS.md §4 冻结的是 `prisma/schema.prisma` 与迁移目录），但应在 ADR 的 `## 影响` 中记一笔，说明数据种子变更的理由，避免后续困惑。
