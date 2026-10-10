# 9 大 UI / 数据 / AI 问题修复 - 三级原子化可执行方案

> **执行日期**: 2026-04-24  
> **指令**: `/gsd-discuss-phase`  
> **约束**: 6789 端口；中文；关联后台管理；不新建文档；骨架模块化

---

## 一、需求重述

用户列出 **9 个问题**，每一个都要 **关联后台配置**：

| # | 原始描述 | 诊断结论（findings.md） |
|---|---|---|
| 1 | `/apply?source=float` 无法完成对话 | 前端 fetch 无超时 + Modelscope 冷启动 40s 导致浏览器断开 |
| 2 | Banner 灰色 | DB image=`/uploads/banners/*.jpg` 不存在 → `<div style=url(...)>` 404 → 外层 `bg-gray-100` 透出灰底 |
| 3 | 主体变成「新概念学历教育」 | `Setting.schoolShortName=新概念学历教育`、`companyIntro` 也是 xgnedu 原文 |
| 4 | 服务指南无专属页 | `ServiceGuide.link` 只指向 `/about#xxx` 或 `/apply?source=guide`，没有独立页 |
| 5 | 各入口 AI 对话同质 | `apply/page.tsx` header / sidebar 全硬编码，scene 只改了打招呼 |
| 6 | 招生院校 logo 404 | `/images/partners/*.png` 物理文件缺失 |
| 7 | 热门专业图标丑 | 激烈渐变 + 单字，与 xgnedu 柔和风格不符 |
| 8 | 证书风采 404 | `/images/gallery/*.png` 缺失 |
| 9 | 校区分布 404 | `/images/campus/*.jpg` 缺失 |

**统一思路**：每个问题的修复都要拆成 **数据层 → API 层 → 前台 → 后台管理 → 种子数据 → 验证** 6 个粒度，确保任何值以后都能在后台改。

---

## 二、方案对比表（图片素材策略是焦点）

| 维度 | A 全抓 xgnedu 原图 | B 本地生成 SVG/PNG | C 混合策略（选定） |
|---|---|---|---|
| **法律风险** | 高（抓第三方品牌图片） | 低 | 仅取通用教室场景图（低） |
| **品牌统一** | 差（xgnedu 入侵） | 高 | 高 |
| **美学** | 不可控 | 中高（可精调） | 高 |
| **可替换性** | 后台可改 | 后台可改 | 后台可改 |
| **实现成本** | 中 | 中 | 中 |

**选定方案 C：
- 校图 / Banner 场景图 → 用 `picsum.photos` + 语义稳定 seed（教室、校园、手持证书，不涉品牌）或 `unsplash source`
- Partner 院校 logo → **本地生成 SVG**（渐变圆 + 院校中文简称），完全自建
- Gallery 证书 → **本地生成 SVG 证书模板**（国徽 + 院校名 + 证书类型）
- HotMajor 图标 → **本地生成 SVG**（低饱和度柔和色 + 单字 + 圆角）

---

## 三、三级原子化可执行方案

### Level 1 大计划 × 6

```
L1【1】品牌清洗        → settings 恢复弘道教育（解决 Q3）
L1【2】图片素材      → 生成 SVG/占位 + 写 DB（解决 Q2/Q6/Q8/Q9）
L1【3】实体扩展        → ChatScene / ServiceGuide 加字段
L1【4】场景差异化     → apply 页按 scene 渲染（解决 Q5）
L1【5】服务指南独立页 → /services/[slug] 页（解决 Q4）
L1【6】AI 可靠性     → timeout + fallback（解决 Q1）
L1【7】热门专业美化 → iconImage + CSS 调优（解决 Q7）
```

---

### Level 2 细分计划

#### L1【1】品牌清洗
- L2-1.1 清洗 settings，恢复 schoolShortName / schoolFullName / companyIntro / heroTitle等
- L2-1.2 验证 /about 不再出现“新概念”

#### L1【2】图片素材
- L2-2.1 写脚本生成 Banner×3、Partner×8、Gallery×8、Campus×6、HotMajor×8 共 33 张 SVG到 `public/images/seed/`
- L2-2.2 更新 DB 的 image / logo / iconImage 字段指向真实路径
- L2-2.3 后台图片字段 UI 确认可编辑（既存）

#### L1【3】实体扩展
- L2-3.1 ChatScene 增字段 pageTitle/pageSubtitle/headerTip/sidebarTitle/processSteps/promiseList/contactCardTitle
- L2-3.2 ServiceGuide 增字段 slug/subtitle/content（可点入独立页作章）
- L2-3.3 prisma migrate + 回写 schema

#### L1【4】场景差异化
- L2-4.1 apply 页 header/tip/sidebar 按 scene 渲染
- L2-4.2 后台 chat-scenes 页表单补字段
- L2-4.3 API 透传新字段
- L2-4.4 seed 3 场景完整差异化文案

#### L1【5】服务指南独立页
- L2-5.1 /services/[slug] 动态页
- L2-5.2 后台 service-guides 页增富文本编辑
- L2-5.3 seed 6 块 content
- L2-5.4 seed 将 link 改为 /services/{slug}

#### L1【6】AI 可靠性
- L2-6.1 /api/chat/completion 有 upstream timeout/重试
- L2-6.2 apply 页 fetch 30s AbortController
- L2-6.3 错误提示带电话/官方微信

#### L1【7】热门专业美化
- L2-7.1 给 8 个专业生成柔和 SVG 图标 iconImage
- L2-7.2 CourseSectionNew 微调卡片样式（阴影/边框/行距）

---

### Level 3 最小原子计划

| # | 原子 | 文件 | 作用 | 验收 |
|---|---|---|---|---|
| A1 | 清洗 settings 品牌字段 | `scripts/fix-brand-settings.mjs` | upsert 6 个 key | API 返回新值 |
| A2 | 验证 /about 无“新概念” | HTTP | grep HTML | 未命中 |
| B1 | 生成 SVG Banner×3 | `scripts/gen-seed-images.mjs` + `public/images/seed/banner/*.svg` | 三张标题不同 | 404 消失 |
| B2 | 生成 SVG Partner×8 | 同上，按 scu/xhu/... | 渐变圆 + 中文简称 | 404 消失 |
| B3 | 生成 SVG Gallery×8 | 同上 | 证书给定 | 404 消失 |
| B4 | 生成 SVG Campus×6 | 同上 | 2 校区各 3 张 | 404 消失 |
| B5 | 生成 SVG HotMajor×8 | 同上 | 柔和黑圆 | 404 消失 |
| B6 | DB UPDATE 指向 SVG | `scripts/relink-assets.mjs` | update 5 个表 | 页面显示图 |
| C1 | prisma 增 ChatScene 7 字段 | `prisma/schema.prisma` | migrate | client 新类型 |
| C2 | prisma 增 ServiceGuide 3 字段 | 同上 | migrate | 新类型 |
| D1 | chat-scenes API 支持新字段 | `src/app/api/chat-scenes/*/route.ts` | passthrough | curl 能 GET |
| D2 | 后台 chat-scenes 表单扩充 | `src/app/manager/chat-scenes/page.tsx` | 4 次框 | 能保存 |
| D3 | apply 页读取 scene 渲染 UI | `src/app/(web)/apply/page.tsx` | title/subtitle/steps/promise 从 scene | 3 场景不同 |
| D4 | seed 3 场景差异文案 | `scripts/seed-chat-scenes-v2.mjs` | update 3 条 | HTTP 有差异 |
| E1 | /services/[slug] 页 | `src/app/(web)/services/[slug]/page.tsx` | 读 ServiceGuide 渲染 | 200 |
| E2 | 后台 service-guides 增 content | `src/app/manager/service-guides/page.tsx` | 富文本 textarea | 可保存 |
| E3 | service-guides API 支持新字段 | `src/app/api/service-guides/*` | passthrough | curl |
| E4 | seed 6 服务指南 content + slug + link=/services/{slug} | `scripts/seed-service-guides-v2.mjs` | update | 页可访 |
| F1 | /api/chat/completion upstream timeout+重试 | `src/app/api/chat/completion/route.ts` | AbortController 45s | 独立错代码 |
| F2 | apply 页 fetch 30s timeout + fallback | `src/app/(web)/apply/page.tsx` | AbortController | 无挂起 |
| G1 | CourseSectionNew 卡片微调 | `src/components/web/CourseSectionNew.tsx` | 阴影/间距/icon 尺寸 | 截图更柔和 |
| V1 | 首页无 404 img | HTTP HEAD | 所有图 200 | 所有图 200 |
| V2 | /about 显弘道 | grep | 不包含“新概念” | 未命中 |
| V3 | /services/{6 slug} 200 | HTTP | 200 | 200 |
| V4 | 3 场景 AI 能回复 | POST /api/chat/completion | 200 + reply | 200 + 中文 |
| V5 | 3 场景 UI 不同 | HTTP HTML 比对 | title/step 文字不同 | 不同 |
| V6 | 更新 `.docs/模块功能详细描述.md` | 编辑 | 兕1 节 | 文档具备 |

---

## 三、执行串行顺序

```
A1 → A2
B1-B5 (并行) → B6 → V1
C1 → C2 → D1 → D2 → D3 → D4 → V4/V5
E1 → E2 → E3 → E4 → V3
F1 → F2 → (V4)
G1
V6
```

<!--- DEPRECATED BELOW --->

#### 此处以下历史存档，已废弃

图片缩略图生成服务（历史）

| 属性 | 内容 |
|------|------|
| **目标描述** | 上传图片时自动生成缩略图，减少带宽消耗 |
| **执行步骤** | 1. 安装sharp库<br>2. 修改upload-service.ts添加缩略图生成<br>3. Media表添加thumbnailUrl字段<br>4. 更新API返回缩略图URL |
| **涉及文件** | `src/lib/upload-service.ts`<br>`prisma/schema.prisma`<br>`src/app/api/upload/route.ts` |
| **作用** | 自动生成100x100、300x200、800x600三种尺寸缩略图 |
| **编辑操作** | 1. npm install sharp<br>2. 修改uploadFile函数，保存后调用sharp生成缩略图<br>3. 更新Media模型添加thumbnailUrl字段<br>4. 运行prisma migrate |
| **执行顺序** | 1 |
| **验收标准** | 上传图片后，Media表thumbnailUrl字段有值，可访问缩略图 |

---

#### 【原子任务1.2.1】统一ImageField组件

| 属性 | 内容 |
|------|------|
| **目标描述** | 统一所有图片选择入口，支持上传/选择/URL三种方式 |
| **执行步骤** | 1. 检查现有ImageField组件<br>2. 替换Banner/课程/文章封面的图片输入<br>3. 验证各模块图片上传功能 |
| **涉及文件** | `src/components/manager/ImageField.tsx`<br>`src/app/manager/banners/page.tsx`<br>`src/app/manager/courses/page.tsx`<br>`src/app/manager/articles/page.tsx` |
| **作用** | 统一图片管理体验，支持从媒体库选择 |
| **编辑操作** | 1. 检查ImageField组件功能完整性<br>2. 在各管理页面替换原有图片输入方式<br>3. 测试图片选择流程 |
| **执行顺序** | 2 |
| **验收标准** | Banner/课程/文章管理页均使用ImageField组件，支持三种选择方式 |

---

#### 【原子任务1.3.1】图片懒加载+占位图

| 属性 | 内容 |
|------|------|
| **目标描述** | 优化图片加载性能，减少CLS（累积布局偏移） |
| **执行步骤** | 1. 封装LazyImage组件<br>2. 使用next/image自动优化<br>3. 添加blur占位图效果 |
| **涉及文件** | `src/components/web/LazyImage.tsx`<br>`src/components/web/CourseCard.tsx`<br>`src/components/web/NewsCard.tsx`<br>`src/components/web/Banner.tsx` |
| **作用** | 图片进入视口才加载，显示模糊占位图过渡 |
| **编辑操作** | 1. 创建LazyImage组件封装next/image<br>2. 在CourseCard替换img标签<br>3. 在NewsCard替换img标签<br>4. 在Banner替换img标签 |
| **执行顺序** | 3 |
| **验收标准** | 页面图片懒加载工作，有blur占位图效果，Network面板显示按需加载 |

---

#### 【原子任务2.1.1】创建HomeCard独立数据表

| 属性 | 内容 |
|------|------|
| **目标描述** | 将FourCards从JSON字段改为独立数据库表 |
| **执行步骤** | 1. 修改schema.prisma添加HomeCard模型<br>2. 运行prisma migrate<br>3. 创建API路由CRUD |
| **涉及文件** | `prisma/schema.prisma`<br>`src/app/api/home-cards/route.ts`<br>`src/app/api/home-cards/[id]/route.ts` |
| **作用** | 每张卡片独立记录，支持单独编辑、排序、启用/禁用 |
| **编辑操作** | 1. 添加HomeCard模型（id, icon, title, subtitle, sort, isActive, createdAt, updatedAt）<br>2. npx prisma migrate dev --name add_home_card<br>3. 创建API路由支持GET/POST/PUT/DELETE |
| **执行顺序** | 4 |
| **验收标准** | HomeCard表创建成功，API可正常CRUD |

---

#### 【原子任务2.2.1】迁移JSON数据到独立表

| 属性 | 内容 |
|------|------|
| **目标描述** | 将现有homeCards JSON数据迁移到HomeCard表 |
| **执行步骤** | 1. 读取settings.homeCards<br>2. 插入到HomeCard表<br>3. 可选：保留或删除原JSON字段 |
| **涉及文件** | `prisma/seed.ts`<br>`src/lib/migrate-homecards.ts`（临时脚本） |
| **作用** | 数据平滑迁移，不丢失现有配置 |
| **编辑操作** | 1. 创建迁移脚本读取JSON并插入表<br>2. 运行脚本执行迁移<br>3. 验证数据完整性 |
| **执行顺序** | 5 |
| **验收标准** | HomeCard表中有4条记录，与原JSON内容一致 |

---

#### 【原子任务2.3.1】更新前端组件读取逻辑

| 属性 | 内容 |
|------|------|
| **目标描述** | FourCards组件从独立表读取数据 |
| **执行步骤** | 1. 修改FourCards组件<br>2. 从API获取HomeCard列表<br>3. 支持动态排序和启用控制 |
| **涉及文件** | `src/components/web/FourCards.tsx`<br>`src/app/(web)/page.tsx` |
| **作用** | 卡片内容后台可管理，实时生效 |
| **编辑操作** | 1. 修改FourCards为async组件<br>2. 调用API获取HomeCard列表<br>3. 过滤isActive=true，按sort排序<br>4. 修改page.tsx传递数据 |
| **执行顺序** | 6 |
| **验收标准** | 首页FourCards显示数据库中的卡片，后台修改后刷新生效 |

---

#### 【原子任务3.1.1】Tiptap编辑器输出JSON结构

| 属性 | 内容 |
|------|------|
| **目标描述** | 富文本内容存储为结构化JSON，替代HTML字符串 |
| **执行步骤** | 1. 修改RichTextField组件<br>2. 输出Tiptap JSON格式<br>3. 修改Article表content字段类型 |
| **涉及文件** | `src/components/manager/RichTextField.tsx`<br>`prisma/schema.prisma` |
| **作用** | 结构化存储，支持多平台渲染，XSS防护 |
| **编辑操作** | 1. RichTextField添加onJsonChange回调<br>2. 修改content字段类型为Json?<br>3. 保留htmlContent字段兼容旧数据 |
| **执行顺序** | 7 |
| **验收标准** | 文章保存后，content字段存储JSON结构而非HTML字符串 |

---

#### 【原子任务3.2.1】文章渲染组件适配JSON

| 属性 | 内容 |
|------|------|
| **目标描述** | 文章详情页正确渲染Tiptap JSON内容 |
| **执行步骤** | 1. 创建ArticleRenderer组件<br>2. 将JSON渲染为HTML<br>3. 在文章详情页使用 |
| **涉及文件** | `src/components/web/ArticleRenderer.tsx`<br>`src/app/(web)/news/[id]/page.tsx` |
| **作用** | 安全渲染结构化内容，支持扩展 |
| **编辑操作** | 1. 安装@tiptap/react<br>2. 创建ArticleRenderer接收JSON渲染HTML<br>3. 修改新闻详情页使用新组件<br>4. 兼容旧HTML内容 |
| **执行顺序** | 8 |
| **验收标准** | 文章详情页正确显示内容，新JSON格式和旧HTML格式均兼容 |

---

#### 【原子任务3.3.1】XSS防护加固

| 属性 | 内容 |
|------|------|
| **目标描述** | 防止富文本XSS攻击，过滤危险标签和属性 |
| **执行步骤** | 1. 安装DOMPurify<br>2. 在API层过滤输入<br>3. 在渲染层再次过滤 |
| **涉及文件** | `src/lib/xss-filter.ts`（新建）<br>`src/app/api/articles/route.ts`<br>`src/components/web/ArticleRenderer.tsx` |
| **作用** | 双层防护，确保输出安全 |
| **编辑操作** | 1. npm install isomorphic-dompurify<br>2. 创建xss-filter.ts封装DOMPurify<br>3. API层过滤保存内容<br>4. 渲染层过滤输出内容 |
| **执行顺序** | 9 |
| **验收标准** | 包含script标签的内容被过滤，正常内容正常显示 |

---

## 四、执行优先级与依赖关系

```
【批次1】基础架构（顺序执行）
  1.1.1 缩略图生成服务
  1.2.1 统一ImageField组件  
  1.3.1 图片懒加载
      ↓
【批次2】FourCards改造（顺序执行）
  2.1.1 创建HomeCard表
  2.2.1 迁移JSON数据
  2.3.1 更新前端组件
      ↓
【批次3】文章安全化（顺序执行）
  3.1.1 Tiptap JSON输出
  3.2.1 文章渲染适配
  3.3.1 XSS防护加固
```

---

## 五、验收总标准

| 检查项 | 验收标准 |
|--------|---------|
| 文件存储 | 上传图片自动生成3种尺寸缩略图，API可获取 |
| 图片组件 | Banner/课程/文章均使用ImageField，支持媒体库选择 |
| 懒加载 | 页面图片按需加载，有blur占位效果 |
| FourCards | 后台可独立管理每张卡片，排序实时生效 |
| 文章存储 | 新文章存储为JSON，兼容旧HTML，XSS过滤生效 |

---

## 六、风险预案

| 风险 | 概率 | 预案 |
|------|------|------|
| 缩略图生成失败 | 低 | sharp库未安装，回退到原图 |
| 数据迁移丢失 | 低 | 迁移前备份，验证后删除旧数据 |
| 文章渲染异常 | 中 | 保持htmlContent字段兼容旧数据 |
| 6789端口冲突 | 中 | 启动前检测并清理 |

---

**当前状态**: 待执行
**下一步**: 执行批次1 - 基础架构优化
