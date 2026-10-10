# 项目存储逻辑分析 - 发现与洞察

> **分析日期**: 2026-04-23  
> **分析师**: AI Agent  
> **范围**: 文件/图片/图标/文章存储逻辑

---

## 一、文件存储分析

### 1.1 当前架构

```
用户上传 → /api/upload → upload-service.ts → public/uploads/YYYYMM/文件名.jpg
                                      ↓
                                Media表记录
```

### 1.2 发现的问题

| 问题 | 严重程度 | 影响 | 位置 |
|------|---------|------|------|
| **无缩略图机制** | 高 | 大图直传消耗带宽，加载慢 | `upload-service.ts` |
| **文件路径硬编码** | 中 | 迁移困难，URL不灵活 | `prisma/schema.prisma` Media.url |
| **删除不同步** | 中 | 数据库记录删除但文件残留 | 无文件清理逻辑 |
| **无文件校验** | 低 | 依赖客户端校验，服务端二次校验不足 | `validateFileType` 仅检查MIME |
| **存储位置暴露** | 低 | 路径包含日期信息，可被预测 | `uploads/202504/xxx.jpg` |

### 1.3 最佳实践参考（来源：Next.js 2025指南）

> "Uploading files directly to your server and storing them locally ❌"
> 
> 现代应用应使用对象存储（S3, Cloudinary等），但用户明确要求**保持本地磁盘策略A**

**折中方案**: 本地存储 + 缩略图生成 + CDN回源

---

## 二、图片管理分析

### 2.1 当前状态

| 模块 | 图片存储方式 | 选择方式 | 缩略图 |
|------|-------------|---------|--------|
| Banner | URL字符串 | 手动输入 | 无 |
| Course | URL字符串 | 手动输入 | 无 |
| Article | coverImage URL | 手动输入 | 无 |
| Gallery | image URL | 手动输入 | 无 |

### 2.2 ImageField组件状态

- **组件存在**: `src/components/manager/ImageField.tsx`（已创建）
- **功能完整**: 支持上传/选择/URL三种方式 ✓
- **接入情况**: 未全面替换各管理页面

### 2.3 发现的问题

| 问题 | 严重程度 | 说明 |
|------|---------|------|
| **ImageField未普及** | 高 | Banner/课程/文章仍使用手动输入 |
| **无图片预览** | 中 | 管理页仅显示文件名，无视觉反馈 |
| **无懒加载** | 中 | 页面加载时全部图片同时请求 |
| **无占位图** | 低 | 图片加载时布局跳动（CLS） |

### 2.4 后台 ImageField 问题修复记录（2026-04-27）

#### 2.4.1 问题现象

| 问题 | 现象 | 根因 |
|------|------|------|
| 预览加载失败 | 编辑弹窗中已有图片显示“图片加载失败” | 历史媒体记录中存在指向不存在本地文件的 `/uploads/...` URL |
| 媒体库无图可用 | 点击“媒体库”后可用图片极少，且伴随失效项 | `/api/media` 返回了失效上传记录，且内置图片只扫描 `public/images` 根目录 |
| Tab 按钮严重变形 | “本地上传 / 媒体库 / 外部链接”被拉伸变形 | `Tabs` 根组件 horizontal 模式实际按 `flex-row` 渲染，导致列表与内容横向挤压 |

#### 2.4.2 修复动作

| 文件 | 修复内容 |
|------|----------|
| `src/components/ui/tabs.tsx` | 为 Tabs 根节点补充 `data-horizontal` / `data-vertical` 标记，恢复 horizontal 模式纵向堆叠布局 |
| `src/app/api/media/route.ts` | 过滤失效本地媒体记录；递归扫描 `public/images/**` 内置图片 |
| `src/components/manager/ImageField.tsx` | 预览失效时回退到重新选择入口；为三个 Tab 按钮增加稳定高度与间距 |

#### 2.4.3 验证结果

- Tab 根节点运行时 `flexDirection` 已恢复为 `column`
- 三个 Tab 按钮高度恢复为 `40px`
- 媒体库无 `/uploads/...` 404 错误
- 媒体库可显示站内递归图片资源与有效上传资源
- 新上传图片可直接回填并在编辑弹窗中正常预览
- **选项A（2026-04-27）**：GET /api/media 已自动清理历史失效媒体记录（`prisma.media.deleteMany`）
- **选项B（2026-04-27）**：在 `dialog.tsx` 的 `DialogContent` 底层组件自动兜底注入不可见 `DialogPrimitive.Description`，一次性消除全部弹窗 a11y warning

### 2.4.4 production 模式异常根因与修复

| 问题 | 根因 | 修复 |
|------|------|------|
| `npm run start` 异常 | `.next` 目录残留 `BUILD_ID` 但 build/server/static 全空，`start-next.mjs` 误判已有 build 而跳过重建 | 清理 `.next` 目录并完整 rebuild |
| 新上传文件 production 404 | standalone 模式从 `.next/standalone/public/` 提供静态文件，上传文件保存在原始 `public/uploads/`，standalone 感知不到 | `next.config.ts` 添加 `/uploads/*` → `/api/file/*` rewrite，由 `src/app/api/file/[...path]/route.ts` 直接从原始目录读取文件 |

### 2.4.5 启动方式一致性验证

| 启动方式 | 预览加载 | 媒体库 | Tab 样式 | 新上传文件 | Dialog warning |
|----------|----------|--------|----------|------------|----------------|
| `npm run dev` | 正常 | 正常 | 正常 | 正常 | **0** |
| `npm run start` (= `node scripts/start-next.mjs`) | 正常 | 正常 | 正常 | 正常 | **0** |
| `node scripts/start-next.mjs` 直接 | 正常 | 正常 | 正常 | 正常 | **0** |

---

## 2.6 证书风采图片修复（2026-04-27）

### 问题根因
证书风采异常并非单一原因，而是**多层问题叠加**：
- 用户曾在后台把 `gallery.image` 改成 `/uploads/202604/...` 这类上传图片路径
- 这些上传文件的真实落点是 `public/uploads/YYYYMM`，而不是项目根 `uploads/`
- 部分历史上传文件后来确实丢失，导致前台图片 404
- `GET /api/media` 曾带有**读接口删库副作用**，打开媒体库时会删除缺失文件对应的 `media` 记录，进一步破坏排障证据
- 我在一次错误排障中又手工把 `gallery.image` 批量改回 `/images/gallery/cert-*.jpg`，导致管理员之前换过的图片被覆盖，页面重新显示旧图
- 项目脚本 `seed-xgnedu-content.mjs` / `relink-assets.mjs` 也存在覆盖 Gallery 图片配置的风险

### 修复方案
| 原子计划 | 执行内容 | 结果 |
|----------|---------|------|
| E1-1 | 追溯异常链：上传落点、文件残留、脚本覆盖、接口副作用 | ✅ 已确认根因链 |
| E2-1 | `GET /api/media` 去掉删库副作用，改为返回 `missing` | ✅ 已完成 |
| E2-2 | `gallery` 接口/后台/前台增加缺失态提示，不再静默空白 | ✅ 已完成 |
| E2-3 | `seed-xgnedu-content.mjs` / `relink-assets.mjs` 停止覆盖 Gallery 配置 | ✅ 已完成 |
| E3-1 | dev 模式验证 | ✅ 首页 8 张占位；后台 gallery 缺失提示正常；媒体页记录保留 |
| E3-2 | start 模式验证 | ✅ 与 dev 一致；服务重启后重新登录属正常鉴权行为 |

### 验证结果

| 模式 | 目标 | 结果 |
|------|------|------|
| `npm run dev` | 后台 gallery/媒体库能识别缺失文件，不自动覆盖配置 | ✅ 通过 |
| `npm run start` (=standalone) | 与 dev 一致，缺失态与资源解析一致 | ✅ 通过 |

### 统一逻辑

- **数据库中管理员配置的 `gallery.image` 是唯一事实来源**
- **文件丢失时只提示失效，不自动回退/覆盖为默认图**
- **读接口禁止修改数据库内容**
- **演示/种子脚本不得覆盖后台已经配置过的图片**
- **dev / start / standalone 统一使用 `public` 作为本地资源根目录**

### 仍存问题

- 历史上传图片 `/uploads/202604/1777295566814-rkevmk.png`、`1777295618612-oy2m6x.png`、`1777295626338-cghkjc.png`、`1777295632807-7dbr0a.png` 在当前工作区中已无物理文件残留
- 因缺少原文件，**无法自动恢复你之前实际更换过的那批证书风采图片**
- 当前 `gallery` 已恢复为最后一次已知的后台配置 URL，因此前后台都正确显示“文件已丢失，请重新配置”状态

---

## 2.5 校区图片管理功能补全（2026-04-27）

### 问题
- `/manager/campus` 页面只有校区 CRUD，**无图片管理功能**
- API 层缺少 `DELETE /api/campus/[id]/images/[imageId]` 单张图片删除接口
- 各处 ImageField placeholder 未标注推荐尺寸

### 修复

| 原子计划 | 修改内容 | 涉及文件 |
|----------|---------|----------|
| A1-1 | 新建 DELETE/PUT 单张图片 API | `src/app/api/campus/[id]/images/[imageId]/route.ts` (新建) |
| A2-1+A3-1 | 校区管理页增加图片管理弹窗 + ImageField 集成 | `src/app/manager/campus/page.tsx` |
| B1-1 | 统一 ImageField placeholder 标注推荐尺寸 | banners/gallery/campus/partners/courses/news 各 page.tsx |

### 验证结果

| 验证项 | dev 模式 | production 模式 |
|--------|---------|-----------------|
| 校区列表"管理图片"按钮 | ✅ 3个按钮(图片/编辑/删除) | ✅ 一致 |
| 图片管理弹窗 | ✅ 标题+5张图+添加区 | ✅ 一致 |
| ImageField 选择器 | ✅ 3 Tab(上传/媒体库/URL) | ✅ 一致 |
| 前台校区分布 | ✅ 5张图 | ✅ 一致 |
| 前台证书风采 | ✅ 8张图 | ✅ 一致 |

### ImageField 尺寸规范

| 模块 | 推荐比例 | placeholder |
|------|---------|-------------|
| 轮播图 | 1920×600 | 点击选择轮播图片（建议 1920×600） |
| 证书风采 | 4:3 (800×600) | 点击选择证书图片（建议 4:3 比例，如 800×600） |
| 校区分布 | 16:9 (1920×1080) | 点击选择校区图片（建议 16:9） |
| 合作院校 | 正方形 200×200 | 点击选择院校Logo（建议正方形 200×200） |
| 课程封面 | 3:4 (600×800) | 点击选择课程封面（建议 3:4 比例，如 600×800） |
| 新闻封面 | 16:9 (800×450) | 点击选择封面图片（建议 16:9 比例，如 800×450） |

---

## 三、图标系统分析

### 3.1 当前状态

- **主要来源**: lucide-react
- **FourCards图标**: Shield, Award, UserCheck, FileCheck（硬编码）
- **自定义图标**: 无管理入口

### 3.2 发现的问题

| 问题 | 严重程度 | 说明 |
|------|---------|------|
| **图标与数据耦合** | 低 | icon名称硬编码在组件中 |
| **无图标选择器** | 低 | 后台无法动态更换图标 |
| **扩展性受限** | 低 | 新增图标需改代码 |

---

## 四、文章存储分析

### 4.1 当前架构

```
Article.content = "<p>富文本HTML</p><script>alert('xss')</script>"
```

### 4.2 发现的问题

| 问题 | 严重程度 | 说明 |
|------|---------|------|
| **XSS风险** | **严重** | HTML直存直出，存在注入风险 |
| **无结构化** | 高 | 纯HTML无法结构化查询 |
| **多端适配难** | 中 | HTML在小程序/APP渲染困难 |
| **版本控制** | 低 | 无历史版本，误删无法恢复 |

### 4.3 最佳实践参考

> Prisma建议: "富文本存储为JSON结构，使用Tiptap/Plate等编辑器"

**推荐方案**: Tiptap JSON格式存储 + 渲染时转HTML

---

## 五、FourCards配置分析

### 5.1 当前状态

```typescript
// settings-registry.ts
{
  key: "homeCards",
  type: "json",
  defaultValue: JSON.stringify([
    { icon: "Shield", title: "正规可靠", subtitle: "..." },
    // ...
  ])
}
```

### 5.2 用户要求

**用户明确选择策略B**: 独立数据库表

### 5.3 对比分析

| 维度 | JSON字段（当前） | 独立表（用户要求） |
|------|-----------------|-------------------|
| 查询 | 需解析JSON | 直接查询 |
| 编辑 | 整体编辑 | 单条编辑 |
| 排序 | 调整JSON数组 | 修改sort字段 |
| 启用/禁用 | 删除/添加元素 | 修改isActive字段 |
| 扩展性 | 需改JSON结构 | 添加字段即可 |

---

## 2.7 ImageField 上传按钮无响应修复（2026-04-28）

### 问题描述
后台管理表单中使用 `ImageField` 组件选择图片时，**"本地上传" Tab 的点击上传区域无响应**，无法弹出文件选择器对话框。

### 根因分析

`ImageField.tsx` 中 `UploadTab` 组件的结构如下：

```jsx
<label
  onDrop={handleDrop}
  onDragOver={(e) => e.preventDefault()}
  className="..."
>
  <input
    type="file"
    accept={accept}
    onChange={handleFileChange}
    className="hidden"   // <-- 关键问题
  />
  {/* 点击提示文字 */}
</label>
```

问题原因：
1. `input` 使用了 `className="hidden"`（即 `display: none`）
2. `input` 被包裹在 `label` 内部，属于**隐式关联**
3. 在 HTML 规范中，如果 `input` 是 `display: none`，某些浏览器（特别是 WebKit/Safari）**不会将 `label` 的点击事件转发到 `input`**
4. 没有使用 `id` + `htmlFor` 的**显式关联**方式

### 修复方案

在 `label` 上添加 `htmlFor`，在 `input` 上添加对应的 `id`，建立显式关联：

```jsx
<label htmlFor="imagefield-file-upload" ...>
  <input id="imagefield-file-upload" type="file" className="hidden" ... />
</label>
```

### 验证结果

| 验证项 | dev 模式 | standalone 模式 | 结果 |
|--------|---------|----------------|------|
| ImageField UploadTab 点击触发文件选择器 | ✅ | ✅ | 通过 |
| 媒体库页面上传按钮触发文件选择器 | ✅ | ✅ | 通过 |
| 上传后文件正确保存到 `public/uploads/YYYYMM/` | ✅ | ✅ | 通过 |
| 上传后预览正常显示，无缺失态误报 | ✅ | ✅ | 通过 |

### 统一逻辑

- `ImageField` UploadTab：使用 `id` + `htmlFor` 显式关联触发文件选择
- `manager/media/page.tsx`：使用 `useRef` + `click()` 方式触发文件选择
- 两种方式都是有效的显式触发，核心逻辑统一为**"确保点击必然触发文件选择器"**

---

## 六、核心发现总结

### 🔴 严重问题
1. **文章XSS风险** - 富文本HTML直存，需立即改造为JSON结构

### 🟡 中等问题
2. **无缩略图机制** - 影响页面加载性能
3. **ImageField未普及** - 图片管理体验不一致
4. **FourCards非独立表** - 用户明确要求改造

### 🟢 低优先级
5. 图标硬编码
6. 无版本控制
7. 文件删除不同步

---

## 七、参考资源

| 来源 | URL | 关键洞察 |
|------|-----|---------|
| Next.js Image优化 | nextjs.org/docs/app/building-your-application/optimizing/images | 使用next/image自动优化 |
| File Uploads 2026 | medium.com/codetodeploy/file-uploads-images-media-handling-in-next-js-production | 避免本地存储，推荐对象存储 |
| Prisma JSON字段 | prisma.io/docs/orm/prisma-client/special-fields-and-types/working-with-json-fields | JSON vs 关系表的权衡 |

---

**最后更新**: 2026-04-23 15:05
