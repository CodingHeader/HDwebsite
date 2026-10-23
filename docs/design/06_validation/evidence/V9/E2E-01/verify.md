# V9-E2E-01 独立验证报告（V9-V-01）

- 验证者：子代理（与执行者上下文隔离；依据 diff + 本机重跑 + GitHub Actions API 取证）
- 验证日期：2026-10-24；代码基线：upgrade@ab1d1e0（验证时 HEAD，含被验提交 a455143）
- 被验提交：a455143（4 文件：tests/e2e/collect-publish.spec.ts、tests/e2e/e-kb-manage.spec.ts、src/app/api/knowledge-files/route.ts、evidence/V9/E2E-01/execution.md）
- **结论：PASS**

## 逐条验收

| 条目 | 结果 | 证据 |
|---|---|---|
| 本地 `npm run test:e2e` 全绿（73/73） | PASS | 验证者本机重跑（2026-10-24）：`73 passed (2.3m)`，exit 0，0 failed/flaky |
| CI run 中 E2E (Linux) 步全绿 | PASS | run **39990249476**（head_sha=a455143，即本卡执行提交）：gate job **success**，`E2E (Linux)` step **success**，job log 明文 `73 passed (2.4m)`（job 120539860995，actions API 取证） |
| 无用例删除/跳过；断言强度不放松 | PASS | diff 审查：无删例/无 skip/无 timeout 增大；改动全部为选择器收窄（+事件名 filter、confirm-dialog 改 testid 定位）与上传内容唯一化 |

## CI 取证说明

- run 39990249476 整体 workflow conclusion = **failure**，但逐 job 核查：**gate=success、docker=success，失败仅 visual job**（Visual regression 步）——该假红属 V9-VIS-03 范畴（next/image 优化器冷启动截图空白），已由后继提交 ab1d1e0 修复（其提交信息即引用本 run）。本卡验收对象是 gate job 的 E2E (Linux) 步，该步全绿。
- 同 gate job 内 Unit tests 步 `Tests 1712 passed (1712)`（Linux 交叉佐证 T-05）。
- 最新 run 39993351639（ab1d1e0）验证时刻仍 in_progress，未引用其结论。
- 修复前基线 run 39982327648（70 passed / 3 failed）与本卡"输入"记载一致。

## 所有权扩展核对（AGENTS §4 越界报备）

- `git show a455143 --stat`：改动 ⊆ tests/e2e/** + evidence/** + **src/app/api/knowledge-files/route.ts**。
- route.ts 超出卡面允许路径（tests/e2e/**），已在 execution.md"所有权扩展声明"一节报备：生产缺陷（回收站 trash=1 视图恒空）是本卡目标"E2E 全绿"的直接阻断项，属 e2e 门禁抓出的生产缺陷修复；契约面/迁移面零触碰。验证者认定**报备合规、修复必要**。
- **src/contracts/** 未触碰：`git show a455143 --name-only` 无 contracts 文件；`listQuerySchema` 未改，`trash` 与 `baseId` 同走 searchParams 直读，不触冻结契约面。

## route 修复正确性核对

读 `src/app/api/knowledge-files/route.ts` GET（工作区现行代码与 a455143 diff 一致）：

- `const isTrashView = url.searchParams.get("trash") === "1"`
- `const where = isTrashView ? { deletedAt: { not: null } } : { deletedAt: null }`
- trash=1 → 仅软删行（回收站视图）；默认 → 仅未删行。与验收要求逐字一致，默认行为不变。
- 回归证明：route 修复并入后，全量单测默认序 1 次 + shuffle 4 次全绿（72 files / 1712 tests，含 tests/contract/routes.test.ts 871 例契约套件）——契约面无回归。

## e2e spec diff 审查（三例）

1. **collect-publish.spec.ts:24**：行选择器追加 `.filter({ hasText: "before_publish_news" })`——按事件名收窄到目标行，断言意图与强度不变（仍 `toBeVisible` + `toContainText("before_publish_news")`）。
2. **e-kb-manage.spec.ts 确认框**：3 处 `getByRole("dialog")` → `getByTestId("confirm-dialog")`（ConfirmDialog 实为 role="alertdialog"；原选择器会被上传 toast 的 role="dialog" 抢占）——定位更精确，非回避断言。
3. **uploadMarkdown**：buffer 嵌入唯一文件名，规避服务端 baseId+sha256 去重（不排除软删行）跨用例碰撞——增强用例独立性，未放松任何断言。

## 命令输出摘录

```text
$ npm run test:e2e                                    # 本机重跑
  73 passed (2.3m)                                    exit 0

$ curl actions/runs/39990249476/jobs                  # API 取证
JOB: gate completed success
  step: E2E (Linux) success
JOB: visual completed failure                         # VIS-03 假红，非本卡
$ curl actions/jobs/120539860995/logs | grep passed
  Test Files  72 passed (72)
       Tests  1712 passed (1712)
  73 passed (2.4m)                                    # E2E (Linux)

$ git show a455143 --name-only | grep "^src/contracts/"   # 空 → 契约未触碰
```

## 备注

- 轻微偏差：execution.md 称"state.json note 同步"，但 `docs/V0.9-20261023/state.json` 的 V9-E2E-01 note 仍为"修复子代理运行中"，未见 route 修复与越界扩展记载——建议主代理回填（不影响本卡技术验收；越界报备的权威载体 execution.md 已完备）。
- 本机 e2e 复跑基于执行者遗留的 `.next` 构建（ab1d1e0 仅改 tests/visual/web.spec.ts，无 src 变更，构建对 e2e 仍有效）。
- 复现：`npm run build && npm run test:e2e`；CI 复核命令见卡定义验证命令。
