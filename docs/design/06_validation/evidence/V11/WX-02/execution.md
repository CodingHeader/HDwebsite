# V11-WX-02 执行证据（2026-10-24）

**现状盘点（审计声明核实为真）**：rewriteWechatImages 过滤器 `new URL(u)` 对相对路径抛错 → 被当作"已可访问"跳过——站内 /uploads 图全部不转存。
**改动**：rewriteWechatImages 增 origin 参数（addDraft 传 appOrigin()），相对路径先补全再判域名。
**验收**：单测 2 断言——传 origin 时站内图进入转存 fetch 队列、微信域名图跳过；旧签名（无 origin）保持兼容。全量 1766 绿。
