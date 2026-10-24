# V11-KB-04 执行证据（2026-10-25）
**现状盘点（审计属实）**：① local 检索只过滤 status=active——软删（回收站）文件的切片仍可检索（purge 已删切片，trash 漏）；② 采集拒绝分支注释明确"知识保留作参考"与"拒绝内容不得进客服检索"冲突；③ checkIngestFile 只有黑名单魔数（拒 pdf/png 伪装），无 docx/文本正向校验。
**改动**：① searchLocalWeighted 排除 fileId ∈ 已删文件集的切片；② collect-items 拒绝分支按 collectItemId 回链停用关联切片（status=disabled，可在知识库页手动恢复，注释同步改写）；③ 正向校验：docx/doc 须 PK\x03\x04（ZIP 容器），md/txt 须 UTF-8 可解码且无 NUL。
**验收**：v11-kb.test 7/7（伪造 docx 拒/真 docx 过/txt 伪装 PNG 拒/NUL 拒/正常 md 过/源码契约×2）。
