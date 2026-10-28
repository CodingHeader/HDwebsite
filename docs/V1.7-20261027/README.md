# HDwebsite V1.7 规划：原版 vs 重构版穿透对比

**基线**：`upgrade@993ec44`（重构版）/ `hdwebsite_0429@c6ff40b`（原版）
**本版定位**：**能力对等复核轮**。首次以原版真实代码独立复核「功能对等 missing=0」的声明。

---

## 一、最重要的一句话

`parity-matrix.md` 把首页区块 A1 判为 **present**，理由是「11 个区块组件全部存在」。

**组件存在 ≠ 能力对等。** 实测：9 个区块组件中 **8 个丢失了 `showOverlay` 能力**，`TopBanner`/`StatsBanner` 丢失背景图注入，`FourCards` 丢失 7 个卡片展示字段，`wechatQrCode` 配置项整体消失（前台变成硬编码占位符）。

这些在矩阵里全是 `present`。

---

## 二、本轮三个发现

### 发现 1：组件存在但 props 能力被裁撤（系统性）

| 组件 | 原版 props | 新版 props | 丢失 |
|---|---|---|---|
| TopBanner | 5 | 2 | showContent, bgImage, showOverlay |
| StatsBanner | 5 | 3 | showContent, bgImage |
| FourCards | 6 + 7 卡片字段 | 2 | showSection, bgColor, bgImage, containerAlign + 7 个 CardData 字段 |
| NewsCenter | 2 | 1 | showOverlay |
| CampusSection | 3 | 2 | showOverlay |
| CourseSectionNew | 2 | 1 | showOverlay |
| CompanyIntro | 4 | 3 | showOverlay |
| CertificateGallery | 3 | 2 | showOverlay |
| PartnerUniversities | 2 | 1 | showOverlay |

**证据**：
```
原版 TopBanner.tsx:11 showOverlay?: boolean / :48 {showOverlay && (
原版 NewsCenter.tsx:18 showOverlay?: boolean / :63 {showOverlay && (
新版 TopBanner.tsx:6-9  interface TopBannerProps { noticeText; noticePhone }  ← 只 2 项
新版 NewsCenter.tsx:44  NewsCenter({ news }: NewsCenterProps)
```

### 发现 2：配置键整体消失，前台退化为硬编码

| 键 | 原版 | 新版 | 后果 |
|---|---|---|---|
| `wechatQrCode` | 有（`layout.tsx:36` 读 → `:71` 传入） | **0 处** | 浮动客服二维码变成写死的「微信二维码」文字占位（`FloatingContact.tsx:83`） |
| `showImageOverlays` | 有（`campus/page.tsx:38` 读） | **0 处** | 校区图片遮罩无法关闭 |
| `fourCardsBgImage` 等 4 项 | 有（`page.tsx:168-172` 消费） | **0 处** | 四宫格背景/对齐/启停不可配 |
| `topbarBgImage`/`statsBgImage` | 有（`page.tsx:134,140` 消费） | **0 处** | 顶栏/统计横幅背景图不可配 |
| `bannerExtraBtnText`/`Link`/`Show` | 有（`page.tsx:161-163` 消费） | **0 处** | Banner 第二按钮不可配 |

### 发现 3：两处管理端/数据能力断链

| 项 | 原版 | 新版 | 定性 |
|---|---|---|---|
| `/manager/ai-config` 页面 | 存在（`src/app/manager/ai-config/page.tsx`） | **无路由、无重定向**（API 层有 307，页面层断链） | 真缺口 |
| `AIConfig.userPrompt` | 有字段 + UI | **无承接**（`grep userPrompt src/` 空） | 真缺口 |
| `HomeCard.backgroundImage` | 有字段 | **无字段** | 真缺口 |

---

## 三、但必须辩证看：新版有 6 处显著强于原版

不能只列退化。以下均为实测：

| 维度 | 原版 | 新版 | 倍数 |
|---|---|---|---|
| Prisma 模型 | 34 | **48** | 1.41× |
| API 路由 | 60 | **126** | 2.10× |
| 管理端页面 | 27 | **42** | 1.56× |
| 测试文件 | 3 | **135** | **45×** |
| 缓存机制 | 无 | `cache-tags.ts`（unstable_cache + tag 失效） | 新增 |
| 存储抽象 | `public/uploads` 硬编码 | `DATA_DIR` 化（`storage.ts`） | 容器友好 |

新增能力域：采集（CollectSource/Item/Task）、发布（PublishJob/ContentChannel）、公众号（WechatAccount）、通知（NotifyRule/Recipient/Template/Record）、知识库（KnowledgeBase/File/chunk + Coze）、LLM 网关（Provider/Usage/优先级/兜底）。

**所以这不是「重构做砸了」，是「重构大幅超前，但在一处（前台配置化）上悄悄退化了」。**

---

## 四、剩余任务大纲（4 个工作包 / 12 个阶段 / 43 个原子步骤）

详见 `03-剩余任务大纲.md`。摘要：

| WP | 名称 | 目标 | 卡数 |
|---|---|---|---|
| WP1 | 前台配置化复原 | 恢复 9 组件 props + 6 组配置键 | 4 |
| WP2 | 管理端断链修复 | 仅 `/manager/ai-config` 重定向（userPrompt 已裁决取消） | 1 |
| WP3 | 复用去重与守卫 | localImageExists 去重 + showcase 过滤复原 | 2 |
| WP4 | 配置校验复原 | 逐键 zod 校验 | 1 |

**关键路径**：WP1-配置键 → WP1-组件 props → WP1-回归验证

---

## 五、读这个

| 文件 | 内容 |
|---|---|
| `00-双基线事实对照.md` | 两套代码的规模/技术栈/结构实测 |
| `01-13维度穿透分析.md` | **13 个维度逐维分析，每维带证据** |
| `02-能力退化清单与定级.md` | 退化项分级（P0/P1/P2）+ 判定依据 |
| `03-剩余任务大纲.md` | **三级以上大纲（本轮核心）** |
| `04-执行序列与所有权.md` | DAG + 所有权 + 档位 |
| `05-验收与体检.md` | 判据 + 阶段体检 |
| `06-风险与待裁决.md` | 待裁决 + 风险 |
| `07-自检与局限.md` | 自检 + 局限 |
| `08-管理层裁决.md` | **B1/B2 已定案 + 补充核实 C1/C2 + 优先级修订** |
| `09-执行方案总纲.md` | **单点入口：契约 / 分步计划 / 任务卡 / 依赖图 / 阶段体检（每要点三级凭据）** |

---

## 六、第一刀

**`STEP-1-1`：补齐 6 组配置键**（不碰组件）。

理由：配置键是数据层，组件是表现层。先补键不会破坏现有渲染（新键有默认值），而且它是后续组件改造的前置——没有键，组件加了 props 也无数据可传。
