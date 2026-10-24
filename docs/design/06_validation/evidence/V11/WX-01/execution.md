# V11-WX-01 执行证据（2026-10-24）

**现状盘点**：collect autoApprove 入库已有 excerpt（markdownExcerpt）但**无封面**；内容中枢手工创建 coverImage/excerpt 均可不填；公众号 addDraft 缺 thumb_media_id（官方草稿必填）→ 发布必失败。
**改动**：`crud-resources/content.ts` 新增 deriveCoverImage/deriveExcerpt（正文首图 / 纯文本截断），content-items beforeCreate 派生补齐；collect-engine 采集入库同钩子；wechat.ts 发布前对存量无封面条目从正文兜底提取。
**验收**：单测 4 断言（HTML 首图 / markdown 首图 / 无图 null / 摘要剥标签）全绿；全量 1766 绿。K1 不涉及。
