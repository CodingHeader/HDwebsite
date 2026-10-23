# V8-SEC-04 独立验证报告（V9-V-01）

- 验证者：子代理（与执行者上下文隔离；仅依据 diff + 可重跑命令）
- 验证日期：2026-10-23；代码基线：upgrade@fad1924；被验证提交：698bb33
- **结论：PASS**

## 逐条验收

| 验收条目（引自卡定义） | 结果 | 证据 |
| --- | --- | --- |
| 官方源运行输出 vulnerabilities 计数 | **PASS** | 本验证者 2026-10-23 独立重跑 `npm run check:audit` → `== 安全审计门禁（registry: https://registry.npmjs.org）==` + `统计：critical 0 / high 0 / moderate 0 / low 0 / total 0`，exit 0。脚本第 27 行 REGISTRY 常量硬编码官方源，不读本机 .npmrc（代码核验） |
| 镜像源运行 exit=2（证据日志） | **PASS（目标达成，偏差已披露）** | 卡面写 exit=2，实现为 exit=1（脚本头仅定义 0/1 两档）。本验证者以仓库外临时副本（仅替换 REGISTRY 常量，未改仓库任何文件）复现负向路径：npmmirror → `✗ 审计结果缺少 metadata.vulnerabilities —— registry 未返回审计数据（假阴性）`，**mirror_exit=1**。非零即令 CI 失败，「404/网络错误判失败而非通过」的卡目标完全达成；偏差在 execution.md §2.1/§5.1 已如实披露 |
| workflow yaml 语法通过（actionlint 或 CI 实跑） | **PASS** | CI 实跑证据：V9-CI-01 execution.md 记录 run 39978424632（fad1924）gate job 全绿且明确含「审计」步（Prepare build DB → Build → 审计 → 密钥扫描）；ci.yml 的 Security audit gate 步骤在真实 Linux runner 上执行成功 |

## 允许修改路径核对

`git show --name-status 698bb33`：
- 允许路径内：`.github/workflows/ci.yml`（新增 Security audit gate 步 + 注释）、`scripts/audit-gate.mjs`（新增）、evidence/V8/SEC-04/**、state.json（协议文件）。
- **清单外（2 项，需报备评估）**：
  1. `scripts/_npm-exec.mjs`（新增）——跨平台 npm 调用助手（Windows spawn EINVAL/DEP0190 规避），为主脚本的必要配套；卡允许路径只写了 `scripts/audit-gate.mjs` 单文件。
  2. `package.json`（新增 `check:audit` 脚本并串入 `check` 链，共 2 行）——CI 步骤 `npm run check:audit` 的必要载体。
  - 评估：两处均为门禁可运行的最小配套，零依赖变更、未触冻结面；但 execution.md 开头把允许路径自述为「`scripts/**`、`package.json`(scripts)」，宽于卡定义且**未按 AGENTS §4 以「越界」名义登记**。判 finding（范围自扩未报备），不足以阻断——功能面已双向独立验证。
- 未创建 `scripts/audit-allow.json`（卡规定 Q1 未授权时才需要；Q1=A 已授权，且实现改为内置「降级建议拒绝」逻辑，口径一致）。

## 未重跑/受限项

- CI e2e job 终态、visual job（continue-on-error=true，待 VIS-03）不在本卡验收范围，未取证。
- `node scripts/audit-gate.mjs` 与 `npm run check:audit` 在本机等价复跑（前者即后者本体）；未测 `--verbose` 分支。

## 备注

1. 两处与卡面字面的**安全方向性偏差**（均为收紧而非放宽，判定不阻断）：
   - high 由卡面「只告警」改为 BLOCKING（Q1 降级建议除外）——更严格；
   - 接口异常/假阴性 exit 2→1——同为非零，CI 判失败等价。
2. 「降级建议」识别逻辑经坑 2 修正（fixAvailable 指向父包时用该包当前版本比较），本验证者审读 isDowngradeFix/compareSemver 实现与注释案例一致；今日官方源已 0 high，该分支当前无输入。
3. 门禁依赖 registry.npmjs.org 直连——CI 若走内网镜像会按「假阴性」失败，属刻意设计（宁可红不假绿），execution.md §6 已登记。
4. 今日实测：官方源全量 audit 0/0/0/0，执行时尚存的 5 high（降级建议）与 3 moderate 已全部随上游消失。
