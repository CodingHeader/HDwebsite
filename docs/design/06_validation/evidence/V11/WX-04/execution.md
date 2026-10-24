# V11-WX-04 执行证据（2026-10-24）

**现状盘点（审计声明核实为真）**：① freepublish/get 轮询返回 failed 时仍 return ok:true（只 warn）；② website 渠道 publishToWebsite 无条件 article.create → 重发重复建稿。
**改动**：① poll.status==="failed" → ok:false + errMsg（草稿 mediaId 保留）；② website.ts 先查 ContentChannel(website,itemId) 的 externalId，命中则 update 既有文章（标题/正文/摘要/封面/状态），未命中才新建。
**验收**：单测 3 断言（重发走 update 不 create、首发布走 create、失败回写）全绿；全量 1766 绿。
