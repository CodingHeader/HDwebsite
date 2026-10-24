# STEP S2（公众号发布）

## V11-WX-01 发布前置：封面与摘要生成链（Hark，中）
目标：内容中枢/采集审核入库时生成封面与摘要，公众号草稿 thumb_media_id 有稳定来源
步骤：核实草稿 API 对 thumb_media_id 的必填性（微信文档口径写入证据）；入库/审核通过钩子：无封面取正文首图或生成占位封面；摘要取正文截断（既有口径）；单测：无封面文章入库后 cover 非空
验收：新建/采集入库的内容 cover 与 summary 字段必有值；既有内容不回填破坏（幂等）

## V11-WX-02 正文站内图转存 uploadimg（Hark，中）
目标：发布前把正文里 /uploads 站内图经素材 uploadimg 转存并替换为微信 URL，公众号不裂图
步骤：发布前解析正文 <img src="/uploads/..."> 列表，逐张 uploadimg（复用 B-07 既有转存），替换 URL；幂等：已替换过的微信 URL 跳过；失败标记渠道错误；mock 测试覆盖替换与幂等
验收：mock 发布后正文不含 /uploads 引用；重复发布不重复转存

## V11-WX-03 发布模式与请求参数修正（Hark，中）
目标：去除 freepublishEnabled 强制门槛；请求 accountId 生效；「仅草稿箱」模式可达
步骤：发布模式判定改为按渠道配置/请求显式选择 draft_only | draft_and_publish；任务请求的 accountId 覆盖默认值并校验存在性；mock 测试：仅草稿箱模式走 draft 提交且不调 freepublish
验收：无 freepublishEnabled 也可建任务并发布到草稿箱；accountId 传错返回明确 4xx 而非忽略

## V11-WX-04 发布状态如实回写与重发幂等（Hark，中）
目标：freepublish/get 查得失败态回写 failed；官网渠道重发不重复建文章
步骤：freepublish/get 轮询结果失败/审核不通过 → job 状态 failed + 错误详情（不再恒 published）；website 渠道发布按 externalId/标题+渠道 upsert 幂等；mock 测试：失败回写、重发去重
验收：mock 失败态 job=failed 且错误可见；同任务重发官网不产生第二篇文章
