# A-05 执行记录：TipTap 懒加载返工 + MarkdownField

分支 `lane/a-manager-ui`（A-01~A-04 + M1 之后 + 合入 lane/d-ops 测量工具）。执行：本会话（Hark-A 角色）。

## 改动（全部在 allow 内，4 文件）

- `src/components/manager/fields/RichTextEditorCore.tsx`（新）：TipTap 编辑器主体（useEditor/StarterKit/Underline/Link/Image/TextAlign/Placeholder + 工具栏：标题/加粗/斜体/下划线/删除线/列表/引用/对齐/链接 promptDialog/图片媒体库/撤销重做）+ default export——从 RichTextField 整体迁出
- `src/components/manager/fields/RichTextField.tsx`：变为 **next/dynamic(ssr:false) wrapper**（loading 骨架占位，契约⑥加载态）——/manager 首屏包体不因 TipTap 增长
- `src/components/manager/SchemaForm.tsx`：RichTextField 改 **next/dynamic 导入**（去静态 import；loading Skeleton）——TipTap 推出全部 CRUD 页首屏包
- `tests/e2e/a-richtext.spec.ts`（新）：XSS 净化 e2e——articles 页（独立实现）新建 HTML 模式文章、richtext 输入正文、状态切发布、保存 → 前台详情页 script 计数=0
- MarkdownField：编辑/预览 + MarkdownRenderer（P07 成果，不含 TipTap，保持静态）——本卡未动

## 验收结果

| 项 | 结果 |
|---|---|
| `grep "next/dynamic" RichTextField.tsx` | 命中 ✅（dynamic wrapper） |
| `grep -E "^import .*RichTextField" SchemaForm.tsx` | 无命中 ✅（dynamic 导入） |
| /manager/articles 首屏 JS（gzip 求和） | **125120 B ≤ 359,059 B 验收线** ✅（基线 352019×1.02；827646b 实测 586879——dynamic 拆分后 −79%，TipTap 成功移出首屏包；after-a05.json） |
| e2e a-richtext | **1 passed（1.3s）**——提交非法 script 后前台详情 script=0（e2e-a05.log；首跑 3 次失败系 articles 页为独立实现：testid=article-create 非 crud-create、contentType 字段 label="内容类型"、表单默认 draft 需切发布——全部修正后全过） |
| 通用门禁 | lint 0 errors / typecheck / test / build 全 EXIT=0（gate-a05.log） |
| 越界检查 | RichTextEditorCore/RichTextField/SchemaForm/e2e ⊆ allow ✅（crud-specs.tsx 与 resource-meta 未动） |

## 登记

- 包体大幅下降（home 227705→126174 等）登记说明：A-05 dynamic 拆分 + D-02 启动改造后 build 产物结构变化，全部指标优于基线——W2-04 复核时以 after-a05.json 为 A-05 后值。
- articles 页为独立实现（非 CrudPage 规格页）——E-05 迁移时确认其形态（特殊页或迁 CrudPage 由 E 线卡内决定）。
