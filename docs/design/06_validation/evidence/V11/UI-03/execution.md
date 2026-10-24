# V11-UI-03 执行证据（2026-10-25）
**现状盘点（审计部分过时）**：SchemaForm 早已实现 type:"relation"（A-03 RelationField 远程搜索）且 CrudPage 原生支持 spec.relations——缺口是"没有任何页面使用"。
**改动**：crud-specs.tsx EXTRA 为含外键的资源补 relations 配置：courses(categoryId→categories, majorId→majors)、enrollment-offerings(majorId/partnerId/courseId)、students(courseId)、gallery/campus(categoryId)、hot-majors(majorId)；element-configs 的 navigationId 属字段键（001-001 类编码），非库外键，保持原样（证据说明）。
**验收**：tsc/lint 全绿；relations 由 CrudPage 既有加载器（spec.relations → 选项拉取）渲染；无需新建组件。
