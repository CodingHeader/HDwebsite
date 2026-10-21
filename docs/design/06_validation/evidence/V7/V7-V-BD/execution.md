# V7-V-BD W1-BD 线独立验收补登 · 执行证据

- 执行者：主代理（opus 档位）· 分支：`upgrade` · 依赖：V7-T-01（已完成）、V7-V-A（已完成）
- 卡定义：`docs/V0.7-20261019/tasks/V7-V-BD.md`；切片 S2
- 允许修改：`docs/design/06_validation/evidence/W1-B/*/*-verify.md`、`docs/design/06_validation/evidence/W1-D/*/*-verify.md`

## 1. 目标

对 B-01、D-01、D-02 逐卡只看 diff + 运行结果给出 PASS/FAIL/UNKNOWN，写 `<卡号>-verify.md`。

## 2. 执行过程

1. 定位提交：B-01 `4ff6911`、D-01 `adb64a9`、D-02 `93db352`。
2. `git show --stat` 逐卡核对 diff 触及文件 ⊆ 各卡允许修改路径。
3. 逐条执行原卡验收命令（只读 + 测试）。
4. 生成 `<卡号>-verify.md`（3 份）。

## 3. 独立复核结果

| 卡 | 判定 | 关键证据 |
|---|---|---|
| B-01 | PASS | settings 读取单一语义落地；lane-b/settings.test.ts 60 行；diff 在允许路径内；门禁全绿 |
| D-01 | PASS with caveat | measure-baseline.mjs 8 指标 + before.json 提交时 exit 0；**caveat**：D-03 后脚本缺 ENCRYPTION_KEY/APP_ORIGIN 注入，W2-04 复测阻塞 |
| D-02 | FAIL（前提已不成立） | start-next-utils.test.ts 通过；但验收原要求"仅有 .env.local 时 login 200"在 D-03 后不成立（ENCRYPTION_KEY/APP_ORIGIN 强校验 FATAL） |

## 4. 验证者独立性

- B-01 原执行者 Agent-API；D-01/D-02 原执行者 Agent-Ops。
- V7-V-BD 验证者为主代理（独立上下文复核），非原执行者。

## 5. UNKNOWN / 待处理

- **visual**：Windows 环境 UNKNOWN（留 Linux 实机 V7-UI-02）。
- **D-02 回归**：需 D 线或 D-03 卡补 ENCRYPTION_KEY 环境要求（start-next / measure-baseline 同步注入），再复跑 login 200 与 Ready ≤10s。
- **D-01 脚本**：同样需补 ENCRYPTION_KEY/APP_ORIGIN 注入（见 W2-04 阻塞证据）。

## 6. 结论

- **完成度：100%（审计产出）+ 2 项 cross-ownership 待 D 线处理**
- **判定：PASS with findings**（B-01 PASS；D-01 PASS-with-caveat；D-02 FAIL 前提不成立，归 D-03）
- **阻塞**：D-02 复跑需 D 线配合；不阻塞 B-01 与其他卡。

## 7. git 状态

- HEAD：`0ae414e`
- 本地领先 origin/upgrade 56+ 提交，远端 0 独有。