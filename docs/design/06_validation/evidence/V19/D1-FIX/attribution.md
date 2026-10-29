---
task: V19-D1-FIX
date: 2026-10-29
head: 1fbf388
status: partial
---
# D1-FIX · CLS/LCP 归因分析

## 5W1H
- **What**：定位 CLS 的 shift 元素与 LCP 的最大元素，判断是否可在前台冻结面内改进。
- **Why**：核心判据需归因后才能选手段；冻结面（REQ-F-014）只允许加 width/height/aspect-ratio/loading/fetchpriority/preload，禁改 className 值。
- **Where**：首页 `http://127.0.0.1:6791/` · HEAD `1fbf388`
- **When**：2026-10-29
- **Who**：执行助手（main-agent · V19 D1-FIX）
- **How**：读 Lighthouse 的 `layout-shifts` / `largest-contentful-paint-element` / `lcp-discovery-insight` 明细 → 与真实浏览器（PerformanceObserver）对照 → 按归因试手段 → 记录敏感性。

## CLS 归因

### 模拟出现的 shift
| 运行 | shift score | 节点 |
|---|---|---|
| lh12-after | 0.2078 | `<footer class="bg-[#da251d] text-white/80">` |
| lh12-after2 | 0.2078 | `<footer class="bg-[#da251d] text-white/80">` |
| lh12-mobile（改前） | 0 | — |
| lh-mobile（@13） | 0 | — |

### 结论
1. **归因元素 = footer**（`bg-[#da251d]` 红色横幅底部），score 0.2078，占 CLS 0.208 的 99.9%。
2. **非图片/字体引起**：所有图片有固定尺寸（CourseCard/NewsCard `h-48`、PartnerUniversities `w-20 h-20`、CampusSection/CertificateGallery `aspect-[4/3]`、Banner `h-[400px]`），Lighthouse `unsized-images` score=1（通过）。
3. **真实浏览器 CLS = 0**（0 次 shift，375×812；Playwright Slow 4G 同样 0）。
4. **根因不可在冻结面内改**：footer 布局偏移属模拟运行方差（同一代码改前 0 / 改后 0.208 / @13 0），真实世界为 0；修复需改 footer 布局/结构，违反 REQ-F-014 冻结（禁改 className 值、禁改结构）。

## LCP 归因

### 模拟数据
- LCP 元素在 **logo `<img>`** 与 **footer `<p>`** 间漂移（运行间方差）。
- LCP breakdown 仅约 316ms（TTFB 8ms + 资源 70ms + render delay 290ms），但 LCP=3.1–3.3s —— 差值纯为 Slow 4G 网络模拟放大（带宽 ~1.6Mbps、RTT 150ms）。
- **真实无节流 LCP = 0.3s**；**真实浏览器 LCP = 136ms**（logo）。

### 候选手段与实测
| 手段 | 状态 | 结果 |
|---|---|---|
| logo 已 `<link rel="preload" as="image">`（Next 自动） | 已存在 | 请求 prio=Low（未加 fetchpriority） |
| `fetchpriority="high"`（lighthouse@13 `lcp-discovery-insight.priorityHinted=false` 建议） | **已试**：Header logo 加 `loading="eager"` + `fetchPriority="high"` | 模拟 LCP 3.1s→3.3s（未改善，模拟带宽为瓶颈非调度）；已还原 |
| 图片尺寸 `width/height` | 已存在 | 无 unsized-image 警告 |
| 图片优化/压缩 | N/A | logo 仅 19KB（66ms）/ logo.png 3KB（133ms），非瓶颈 |

### 结论
1. **LCP 模拟未达标是 Slow 4G 网络模型产物**，非应用真实瓶颈（真实 0.3s / 136ms，Performance 98）。
2. 允许手段（width/height/preload/fetchpriority）已存在或已试，**模拟下不敏感**（带宽受限，调度无感知）。
3. 进一步改进需改视觉/布局（冻结面禁止）或改用真实设备测量（非 Lighthouse 模拟）。

## 最终诚实判定

**PARTIAL**（不虚报 PASS）：
- **CLS**：真实 0（达标）；Lighthouse 模拟 0–0.208 波动，归因 footer（score 0.2078），非图片/字体，冻结面内无可改根因。
- **LCP**：真实 0.3s / 136ms（优秀）；Lighthouse 模拟 3.1–3.3s（Slow 4G 模型产物），`fetchpriority=high` 已试不敏感。

## 是否改冻结面
**否**。所有尝试均未改动视觉/布局；Header 试验已还原（`git checkout -- src/components/web/Header.tsx`），工作区 `src/**` 零 diff。