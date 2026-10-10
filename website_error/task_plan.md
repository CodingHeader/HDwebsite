# 后台菜单体系CRUD交互与数据持久化验证 - 任务计划

## 目标
验证三级原子化问题描述中的问题真实性，确认后执行修复，浏览器自动化验证修复结果。

## 问题验证结果

| Task | 描述 | 验证结果 | 处理 |
|------|------|----------|------|
| Task-1 | 文章管理"新增"按钮点击无Dialog弹窗 | ❌ 不成立 | Dialog正常弹出，无需修复 |
| Task-2 | 媒体管理编辑按钮点击超时 | ❌ 不成立 | 静态资源分类编辑按钮设计为disabled |
| Task-4 | 角色管理只读无CUD | ✅ 确认成立 | 已修复 |
| 图片缺失态 | 图片缺失态处理 | ✅ 已到位 | 无需修复 |

## Phase (已完成)

### Phase-1: 环境准备与问题验证 ✅
- 启动dev服务器(6789端口)
- 浏览器验证Task-1: 文章Dialog正常弹出，问题不成立
- 浏览器验证Task-2: 媒体编辑按钮对静态资源disabled，问题不成立
- 浏览器验证Task-4: 角色管理确实只有只读表格，问题成立

### Phase-2: 角色管理CUD功能修复 ✅
- 新建 `src/app/api/roles/[id]/route.ts` (GET/PUT/DELETE)
- 修改 `src/app/api/roles/route.ts` 添加POST方法
- 重写 `src/app/manager/roles/page.tsx` 添加CUD功能

### Phase-3: 图片缺失态检查 ✅
- ImageField/media/gallery均有missing处理，逻辑到位

### Phase-4: 浏览器自动化验证 ✅
- 新增角色: 创建"内容审核员"成功
- 编辑角色: 修改Viewer描述成功
- 删除角色: 删除"内容审核员"成功（测试数据已清理）
- SuperAdmin保护: 编辑/删除按钮disabled生效

### Phase-5: 文档更新 ✅
- 更新task_plan.md
- 更新.docs/专升本官网-目录结构.md (API路由表添加roles条目)
- 记忆已更新

## Footer对齐修复（新增）

### 问题描述
底部信息栏的企业介绍部分与右侧快速导航、学习资源、帮助中心不对齐。

### 根因分析
**Tailwind v4 JIT编译缺陷**：以下类名在源码中存在但未生成CSS规则，导致渲染HTML中类名丢失或CSS属性为`normal`：
| 类名 | 源码中 | CSS编译 | 影响 |
|------|--------|---------|------|
| `items-center` | ✅ | ❌ (`alignItems:"normal"`) | 主grid垂直对齐失效 |
| `lg:col-span-3` | ✅ | ❌ | wrapper div丢失列跨度 |
| `grid-cols-3` | ✅ | ❌ | 链接区3列布局失效 |
| `gap-4` | ✅ | ❌ | 链接区间距失效 |
| `items-start` | ✅ | ❌ | 链接区内部顶部对齐失效 |

**后果**：wrapper div失去所有样式 → 3个链接列变成主grid直接子元素(4个子元素而非2个) → 布局和对齐全部错误。

> 此问题与FourCards组件遇到的Tailwind v4 JIT编译问题属同一类型。

### 最终修复方案
使用**inline style**替代未编译的Tailwind类：

**修改文件**: `src/components/web/Footer.tsx`
```tsx
// 主grid: items-center → style={{ alignItems: 'center' }}
<div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-5" style={{ alignItems: 'center' }}>

// 链接区wrapper: 多个Tailwind类 → inline style
<div className="lg:col-span-3" style={{ gridColumn: 'span 3', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', alignItems: 'start' }}>
```

### 验证数据（rebuild后）
| 检查项 | 修复前 | 修复后 |
|--------|--------|--------|
| mainGrid `alignItems` | `"normal"` | `"center"` ✅ |
| mainGrid `childCount` | 4 (错误) | 2 (正确) ✅ |
| linksWrapper `display` | `"block"` | `"grid"` ✅ |
| linksWrapper `gridColumn` | `"auto"` | `"span 3"` ✅ |
| linksWrapper `gridTemplateColumns` | `"none"` | `"228px × 3"` ✅ |
| linksWrapper `gap` | `"normal"` | `"16px"` ✅ |
| **中心线差值** | - | **0px** ✅ |

### 后端配置支持
- **页脚Logo**: `footerLogo` (image类型) - 已支持后台配置
- **页脚标语**: `footerSlogan` (text类型) - 已支持后台配置
- **页脚描述**: `footerDescription` (textarea类型) - 已支持后台配置
- **配置路径**: `/manager/settings` → 站点信息分组

## 修改文件清单
1. **新建** `src/app/api/roles/[id]/route.ts` - GET/PUT/DELETE API
2. **修改** `src/app/api/roles/route.ts` - 添加POST方法
3. **重写** `src/app/manager/roles/page.tsx` - 添加完整CUD功能
4. **修改** `src/components/web/Footer.tsx` - inline style替代Tailwind v4未编译类，修复垂直居中对齐
