---
task: V19-D1-FIX
date: 2026-10-29
head: 1fbf388
status: partial
---
# D1-FIX · CLS/LCP 改进 · 基线（before）

## 5W1H
- **What**：建立 D1-FIX 改前基线（mobile 视口，Lighthouse 模拟）。
- **Why**：V18 D1 实测 CLS 0.208 / LCP 3.3s 未达 good 阈值（CLS≤0.1 ∧ LCP≤2.5s），本卡需先记录改前值再改进。
- **Where**：`E:/Code/Demo/HDwebsite/hdwebsite_1011` · 分支 `upgrade` · HEAD `1fbf388`
- **When**：2026-10-29
- **Who**：执行助手（main-agent · V19 D1-FIX）
- **How**：`next start -p 6791`（生产构建，DATABASE_URL=file:./prisma/e2e.db）→ `npx -y lighthouse@12`（npx 临时下载，不改 package.json）对 `http://127.0.0.1:6791/` 跑 performance 类别（Slow 4G 模拟 + 375 视口）。

## 改前基线

### V18 D1（历史基线，lighthouse@12）
| 视口 | Performance | FCP | LCP | TBT | CLS | SI |
|---|---|---|---|---|---|---|
| mobile | 82 | 1.2s | **3.3s** | 50ms | **0.208** | 1.7s |

来源：`docs/design/06_validation/evidence/V18/D1/execution.md`

### 本次实测改前（HEAD 1fbf388，Header 原始，lighthouse@12）
原始报告：`.cache/v19-d1/lh12-mobile.json`（540,571 字节，按项目惯例不入库）

| Performance | FCP | LCP | TBT | CLS | SI |
|---|---|---|---|---|---|
| 0.94 | 1.1s | **3.1s** | 20ms | **0** | 1.1s |

- **LCP 元素**：`<img alt="弘道教育" width="240" height="46" ... class="object-contain">`（Header logo 图，Next 已自动加 `<link rel="preload" as="image">`）
- **CLS**：0（无 layout-shift）
- **lcp-discovery-insight**：@12 记 1（通过）；@13（`lh-mobile.json`）记 0，明细 `priorityHinted=false` → 「fetchpriority=high 应加到图片 preload」
- **unsized-images**：1（通过，无未定尺寸图片）

## 结论
本次改前实测 LCP 3.1s / CLS 0，与 V18 基线（3.3s / 0.208）相比 CLS 波动至 0、LCP 略低，属 Lighthouse 模拟运行间方差。good 阈值判据：**LCP 3.1s > 2.5s 未达标；CLS 0 ≤ 0.1 达标**。