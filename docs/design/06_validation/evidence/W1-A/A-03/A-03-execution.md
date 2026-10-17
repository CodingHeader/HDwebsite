# A-03 执行记录：ResourceForm + 字段件 + fieldErrors 标红

分支 `lane/a-manager-ui`（自 w1-base-ccr-1，A-01/A-02 之后 + 合入 lane/e-manager-pages）。执行：本会话（Hark-A 角色）。

## 改动（全部在 allow 内）

- `src/components/manager/SchemaForm.tsx`：
  - FieldType 扩展 +`"relation"`（FieldSpec 向后兼容，纯加法）；`FieldSpec.relation?{path,labelKey?,valueKey?,params?}` 远程搜索配置
  - date/datetime 字段接入 A-01 的 `DateTimeInput` 组件（datetime-local 原生美化，替换裸 Input）
  - relation 渲染分支：有 relation 配置走 `RelationField`（远程搜索），否则回落 Input
- `src/components/manager/fields/RelationField.tsx`（新）：远程搜索关联选择——输入防抖 300ms 搜索 /api/{path}?keyword=&limit=20，role=combobox/listbox 下拉点选回填（值=valueKey 默认 id、显示=labelKey 默认 name/title）；替代原 limit=100 一次拉取
- `src/components/manager/FormDialog.tsx`：
  - 快捷键改 **Ctrl/⌘+S**（保留 Ctrl/⌘+Enter 别名；输入框内单 Enter 提交保持）
  - 浏览器级 beforeunload 未保存提示（dirty 时刷新/关标签提示；应用内关闭已有二次确认）
  - 头部注释同步
- 测试：`src/components/manager/__tests__/resource-form.test.tsx`（新，5 用例）：JsonField 非法 JSON 报错（validateRequired）、mapFieldErrors 按顶层键归并 + 渲染后 aria-invalid、relation 字段 combobox 渲染、normalizeFormValues（tags→数组/select 空删键/空串→null）、visibleTo=super 非超管不校验（W0-04 回归）
- e2e：`tests/e2e/a-form-errors.spec.ts`（新）：分类页提交非法 slug → 后端 400 fieldErrors → 字段 aria-invalid=true + field-error 文案可见
- MediaPicker：已是 /api/media 列表 + /api/upload（P07 成果，本卡确认未动）

## 验收结果

| 项 | 结果 |
|---|---|
| resource-form.test.tsx | 5/5 PASS（JsonField 非法 JSON 报错 ✅、fieldErrors → aria-invalid ✅） |
| e2e a-form-errors | **1 passed（704ms）**——提交非法 slug 后字段标红（e2e-a03.log；首跑失败系 slug 字段 label 实为"Slug（留空自动生成）"非"标识"，正则修正后全过） |
| 既有 e2e | 8/8 保持（前次全套 9 用例运行中 8 ok，新用例失败已修复） |
| 通用门禁 | lint 0 errors / typecheck / test / build 全 EXIT=0（gate-a03.log） |
| 越界检查 | SchemaForm/FormDialog/RelationField/测试 ⊆ allow ✅（crud-specs.tsx 与 resource-meta 未动） |
| ResourceForm 别名 | SchemaForm.tsx 的别名导出保留（DR-11：不拆文件避免双实现）✅ |

## 登记

- relation 为 opt-in 字段类型：E-01/E-05 迁移时由调用方在 FieldSpec 中声明（远程搜索替代一次拉取）。
- beforeunload 为浏览器级提示；应用内关闭路径已有 confirmDialog 二次确认（P05）。
