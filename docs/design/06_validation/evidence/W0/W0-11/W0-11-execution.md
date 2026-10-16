# W0-11 执行记录（测试基建补丁）

分支 w0/test-infra（自 5a987be，与 w0/ccr-1 同起点、文件不相交）。执行：本会话（P3 角色）。

## 改动（全部在 allow 内，9 文件）
- tests/a11y/playwright.config.ts（新）：复用 e2e 的 globalSetup 与端口约定，testDir=tests/a11y
- tests/a11y/smoke.spec.ts（新）：/manager/login axe 扫描 critical=0
- tests/e2e/global-setup.ts：spawn env 追加 ENCRYPTION_KEY/APP_ORIGIN/DATA_DIR（D-03 生产 env 校验所需的测试值）；prepareAccountsAndStates——幂等创建 e2e-viewer（admin API，已存在则放行）+ admin/viewer 各 UI 登录一次写 .cache/e2e/state-{admin,viewer}.json
- tests/e2e/fixtures/helpers.ts：adminState()/viewerState()（storageState 路径，不用 use 前缀防 react-hooks 误判）、pageToken()（从 localStorage hd-manager-auth 读 token，替代数据准备用登录调用）；loginUI 保留
- tests/e2e/{apply-chat,collect-publish,crud-article}.spec.ts：登录调用替换为 storageState 注入；apiToken(request) → pageToken(page)
- src/lib/__tests__/wechat-chat.test.ts：守卫正则修正（按 | 分段分别转义再拼装，修复整串转义把交替符 \| 的失效 bug）+ 2 条反证用例（正则交替语义 + fs 探针实现级）；walk 排除 __tests__（守卫只看业务代码）
- eslint.config.mjs：globalIgnores +.cache/**

## 验收结果
| 项 | 结果 |
|---|---|
| a11y --list | exit 0，列出 smoke.spec ✅ |
| Linux 连续 2 次 e2e | RUN1 8/8 (1.2m) + RUN2 8/8 (1.2m)，无"尝试过于频繁" ✅（e2e-testinfra.log） |
| wechat 反证用例 | 2 条新增全过；临时注入验证：修复前整串转义导致"只含电话"不命中（守卫失效复现），修复后命中 ✅ |
| lint 计数 | 含 .cache 临时文件树 = 18 warnings（= 干净树计数）✅ |
| 通用门禁 | lint/typecheck/test/build 全 EXIT=0（gate-testinfra.log） |
| 登录调用计数 | **DB 计数脚本因 bash 嵌套引号转义失败未取到**（登记缺口，W0-13 合并门禁时补）；已获替代证据：3 个 spec 的 loginUI/apiToken 调用已删除（代码 diff）+ 连续 2 次全过无 429（旧流程每运行 ~11 次登录必撞限流）|
| 越界检查 | git diff 暂存清单 9 文件 ⊆ allow ✅ |
