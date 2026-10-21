# V7-V-C W1-C 线独立验收补登 · 执行证据

- 执行者：主代理（opus 档位）· 分支：`upgrade` · 依赖：V7-T-01（已完成）
- 卡定义：`docs/V0.7-20261019/tasks/V7-V-C.md`；切片 S2
- 允许修改：`docs/design/06_validation/evidence/W1-C/*/*-verify.md`

## 1. 目标

对 C-01~C-12 逐卡只看 diff + 运行结果给出 PASS/FAIL/UNKNOWN，写 `<卡号>-verify.md`。

## 2. 执行过程

1. 定位 12 个 C 卡提交：
   - C-01 `a5e619b`、C-02 `7422b70`、C-03 `3ef850c`、C-04 `7a04516`、C-05 `c5fc3f9`、C-06 `37c085b`、C-07 `c4b1861`、C-08 `c221eb4`、C-09 `43a555e`、C-10 `3b5519a`、C-11 `f9d0b21`、C-12 `436c237`
2. `git show --stat` 逐卡核对 diff 触及文件 ⊆ 各卡允许修改路径。
3. 独立跑 C 线专项单测。
4. 生成 12 份 `<卡号>-verify.md`。

## 3. 独立复核结果

**判定：全部 12 卡 PASS**

- **本次独立跑**：`npx vitest run src/lib/__tests__/lane-c src/lib/__tests__/collect-autokb.test.ts` → **13 files / 154 tests passed**
- 门禁（2026-10-21 09:37）：lint 0 errors / typecheck exit 0 / test 823 passed / build exit 0
- e2e：49 pass / 3 skip / 0 fail（C-11 用量 Tab 相关用例已于 V7-UI-01 期修正为正常断言）
- a11y：12 passed

**关键验收证据（逐卡）**：

| 卡 | 提交 | 关键证据 |
|---|---|---|
| C-01 | a5e619b | LLM 适配器注册表（openai/coze）+ providers 路由 withApi |
| C-02 | 7422b70 | KnowledgeBackend 统一接口 + 唯一注册表；kb-sync 降级薄包装 |
| C-03 | 3ef850c | 文件管线三重校验（扩展名+MIME+魔数）；chunk ≤800 字 |
| C-04 | 7a04516 | Coze 客户端 8 单测；4013 权限中文 |
| C-05 | c5fc3f9 | 本地检索加权打分；Top-3 命中率 50%→85% |
| C-06 | 37c085b | 知识库 API 全套；>10MB 拒绝 |
| C-07 | c4b1861 | 场景装配 + SSE 契约 429；**ChatWidget 仅替换 SSE 解析逻辑，JSX/className 零改动**（符合 AGENTS.md §3 视觉冻结豁免） |
| C-08 | c221eb4 | 采集→目标库；G10 KnowledgeFile.collectItemId 双向回链 |
| C-09 | 43a555e | LLM dailyQuota/rateLimit 生效；16 单测；独立验证整改已存在 |
| C-10 | 3b5519a | AI 客服风控（限频+敏感词+黑名单） |
| C-11 | f9d0b21 | LLM 用量统计 API + 优先级排序 |
| C-12 | 436c237 | 知识库其他管理 API（批量/回收站/导出/重建/切片编辑） |

## 4. 验证者独立性

- C 线原执行者：Agent-AI（lane/c-ai-kb）
- V7-V-C 验证者：主代理（独立上下文复核），非原执行者。

## 5. UNKNOWN

- **visual**：Windows 环境 UNKNOWN（参照图 Linux/CI，main@94dbbbb 口径）；留 Linux 实机 V7-UI-02。
- **Coze 真实联调**：ADR-025 凭证缺失，kb-sync/kb-coze 全 mock；真实联调标 UNKNOWN（用户已裁决，2026-10-12）。

## 6. 结论

- **完成度：100%（审计产出）**
- **判定：PASS**（12/12；Coze 联调与 visual 已登记 UNKNOWN）
- **阻塞**：无。

## 7. git 状态

- HEAD：`7d67a67`（V7-V-A/V7-V-BD 提交）
- 本地领先 origin/upgrade 57+ 提交，远端 0 独有。