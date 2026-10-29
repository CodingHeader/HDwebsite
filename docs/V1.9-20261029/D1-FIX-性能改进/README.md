# D1-FIX · CLS/LCP 改进

## 归属

- 阶段编号：D1-FIX
- 分组：D 质量改进
- 来源：D1 Lighthouse 基线（`docs/design/06_validation/evidence/V18/D1/`）

## ⚠️ V1.8 台账的缺口

`docs/V1.8-20261027/state.json` 有这张卡（`dir: "D1-FIX-性能改进"`、`depends_on: ["A5"]`），但**目录不存在**——V1.8 只登记未写卡。本轮补齐。

## 目标

把首页移动端 CLS 与 LCP 改进到 good 阈值内。

## 为什么需要它（三级凭据）

### ① 来源
Web Vitals good 阈值：**CLS ≤ 0.1**、**LCP ≤ 2.5s**

### ② 实现
N/A（尚未定位到具体元素，需先测）

### ③ 验证（实测基线）

| 视口 | Performance | FCP | LCP | TBT | CLS | SI |
|---|---|---|---|---|---|---|
| mobile | 82 | 1.2s | **3.3s** | 50ms | **0.208** | 1.7s |

来源：`docs/design/06_validation/evidence/V18/D1/`

**两项未达标**：

| 指标 | 实测 | good 阈值 | 差距 |
|---|---|---|---|
| CLS | 0.208 | ≤ 0.1 | 超 **108%** |
| LCP | 3.3s | ≤ 2.5s | 超 **0.8s** |

> ⚠️ D1 卡判 PASS 仅代表「基线已建立、UNKNOWN 关闭」，**不代表达标**。本卡是改进项。

## 输入

- 前置：B3 done
- 基线：上述数值
- 环境：Lighthouse 可用（不可用则记 UNKNOWN）

## 输出

- 改进后的代码（具体位置视归因而定）
- 证据：`docs/design/06_validation/evidence/V19/D1-FIX/`
  - `baseline.md`：改前数值（复用 D1）
  - `after.md`：改后数值
  - `attribution.md`：CLS/LCP 归因分析

## 核心判据

```
PASS = CLS ≤ 0.1  ∧  LCP ≤ 2.5s      （mobile 视口）
```

**改后必须重测并贴数值，不接受「应该会变好」。**

## 执行步骤

| 步 | 内容 |
|---|---|
| 1 | 先做**归因**：用 Lighthouse 的「诊断」定位 CLS 的 shift 元素、LCP 的最大元素 |
| 2 | 按归因选手段（见下表），**先做一项、测一次**，避免多点同时改无法归因 |
| 3 | 每轮记录 before/after 数值 |
| 4 | 收敛到 good 阈值或说明为何不可达 |

### 候选手段（按归因选择，不是全做）

| 指标 | 常见成因 | 手段 |
|---|---|---|
| **CLS** | 图片/iframe 无固定尺寸 | 给 `width/height` 或 `aspect-ratio` 占位 |
| **CLS** | 字体切换导致回流 | `font-display: swap` + 预加载，或 `size-adjust` |
| **CLS** | 首屏动态插入内容（如公告条、轮播） | 预留固定高度，或延迟到首屏后渲染 |
| **LCP** | 首屏大图未预加载 | `<link rel="preload">` 或 `fetchpriority="high"` |
| **LCP** | 图片未优化 | 压缩、改 WebP/AVIF、响应式尺寸 |
| **LCP** | 关键 CSS 阻塞 | 内联关键样式 |
| **LCP** | 服务端响应慢 | N/A（本地测量，非网络问题） |

### ⚠️ 前台风格冻结的约束

首页在 `src/app/(web)/**` 与 `src/components/web/**`，**属 REQ-F-014 冻结面**。

**允许**：加 `width/height`、`aspect-ratio`、`loading`、`fetchpriority`、`preload` —— 这些不改视觉呈现。

**禁止**：
- 改任何既有 `className` 的**值**
- 改布局结构、删减元素
- 改字体家族或 `lang`

**若某项改进必须改视觉** → 停手，写进 `05-风险与待裁决.md`，交规划者裁决，**不得自行改**。

## 允许修改

- `src/app/(web)/**`、`src/components/web/**`（**仅限**新增尺寸/加载属性，不改 className 值）
- `src/app/layout.tsx`（**仅限** `<link rel="preload">` 类新增，不改字体配置）
- `docs/design/06_validation/evidence/V19/D1-FIX/**`
- `.cache/v19-d1/**`

## 禁止修改

- `src/contracts/**`、`prisma/**`、`package.json`
- 既有 `className` 的任何值
- 视觉基线图与阈值
- 历史 V18 证据

## 验证命令

```bash
cd "E:/Code/Demo/HDwebsite/hdwebsite_1011"

# 1) 前台 className 零变更（关键门禁）
git diff -U0 -- 'src/app/(web)/**' 'src/components/web/**' \
  | grep -E '^\+.*className=' && echo "FAIL 改了 className" || echo "PASS className 未变"

# 2) Lighthouse 可用性
npx lighthouse --version 2>/dev/null || echo "UNKNOWN: Lighthouse 不可用"

# 3) 构建可通过
npm run build
```

## UNKNOWN 情形

**若 Lighthouse 不可用** → 记 UNKNOWN，**不得冒充 PASS**，也不得用其它指标（如 bundle 大小）替代 LCP/CLS。

## 依赖与阻塞

- Depends on：B3
- 当前：**BLOCKED**
- 潜在阻塞：CLS 归因可能指向冻结面（如轮播 banner 的动态高度），需裁决

## 预期结论（诚实预判）

CLS 0.208 → 0.1 是**降低 52%**，LCP 3.3s → 2.5s 是**降低 24%**。

- **LCP 可行性较高**：预加载 + 图片优化通常能拿到 20~30%
- **CLS 可行性中等**：需准确归因；若是轮播 banner 引起，而 banner 结构属冻结面，可能**无法在不动视觉的前提下解决**

若最终不可达，**如实记录为 UNKNOWN/PARTIAL**，说明卡在哪，不虚报 PASS。
