# D-01 独立验收报告

- 验证者：V7-V-BD（独立于原执行者；B-01=Agent-API，D-01/D-02=Agent-Ops）
- 验证方式：只看 `git show --stat adb64a9` diff + 运行命令结果
- 验证日期：2026-10-21

## 判定：PASS with caveat

measure-baseline.mjs 8 指标 + before.json 提交时 exit 0 且 JSON 含 8 键（现文件存在）。**caveat**：D-03 合并后该脚本未注入 ENCRYPTION_KEY/APP_ORIGIN 导致 npm start 启动即退出，W2-04 复测已登记阻塞（跨所有权，非 D-01 责任）。

## 关键证据

- 提交：`adb64a9`
- diff：`git show --stat adb64a9`（触及文件均属本卡允许路径）
- 门禁（2026-10-21 09:37 复核）：lint 0 errors / typecheck exit 0 / test 823 passed / build exit 0
- 单测：`npx vitest run src/lib/__tests__/lane-b/settings.test.ts src/lib/__tests__/lane-d/start-next-utils.test.ts`（B-01/D-02 专项）

## UNKNOWN / caveat

- **visual**：Windows 环境 UNKNOWN（留 Linux 实机 V7-UI-02）。
- **D-01/D-02 环境回归**：D-03 env 强校验（ENCRYPTION_KEY/APP_ORIGIN）破坏 measure-baseline 与 .env.local 最小启动场景；已登记到 W2-04 阻塞证据，需 D 线同步更新脚本或 D-03 卡补充。

## 是否允许进入下一阶段

- **B-01：允许**（PASS）。
- **D-01：允许**（提交时验收成立；回归归 D-03/W2-04）。
- **D-02：不单独放行**（原验收前提在当前 HEAD 已不成立；需先由 D 线或 D-03 卡处理 ENCRYPTION_KEY 环境要求，再复跑 login 200）。
