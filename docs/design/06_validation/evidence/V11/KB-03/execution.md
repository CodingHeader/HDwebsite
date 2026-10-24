# V11-KB-03 执行证据（2026-10-25）
**现状盘点（审计属实）**：/api/kb/test 返回 {local:{hits,error}, coze:{ok,answer,error}}；测试页读 res.hits/res.source——字段不存在 → 恒报「检索失败」。
**改动**：页面改读 res.local.hits 渲染；本地出错显式提示；Coze 应答/错误并入 toast 文案。
**验收**：类型对齐编译通过；页面逻辑与 API 契约一致（字段逐一核对）。
