# TASK V14-VIS-STAB-01：visual 门禁稳定性证明

## 归属
- 所属切片：S4
- 来源需求：`AGENTS.md` §3「P02 起每个方向结束必须重跑 test:visual 且通过」；`REQ-F-014` 前台风格冻结
- 来源方案：V1.4 `04-垂直切片清单.md` S4

## 目标
证明 visual 门禁**不是靠 flake 过的**：连续 ≥2 次普通 CI run 的 visual job 全绿，否则继续收敛等待策略。

## 输入
- 文档：`docs/design/06_validation/evidence/V13/VIS-01/triage.md`
- 契约：无
- 前置任务：V14-BASE-01
- 前置状态：`8dc778b` 已加图片 decode 等待；run `40436760024` 单次绿

## 为什么需要它（证据链）

| run | commit | visual 结论 | 说明 |
|---|---|---|---|
| `40425202421` | `a129bce` | **FAIL** | 初始 45 图矩阵，home@1440 ratio 0.10 |
| `40431748131` | `a129bce` | PASS（`visual_update_ref=true`） | 重生成基线 |
| `40433104468` | `cb7b34d` | **FAIL** | 唯一失败仍是 home@1440，ratio 0.10 |
| `40436075724` | `8dc778b` | PASS | decode 等待修复后 |
| `40436760024` | `3e6a6b5` | PASS | 普通 CI 全绿 |

**关键矛盾**：同一基线在普通 run 中 **4 次里失败 1 次**（`40433104468`）。单次绿**不足以**证明门禁可信。
`triage.md` 已归因为「next/image 冷启动/解码时序 flake」，但**归因不等于已消除**。

## 输出
- 证据：`docs/design/06_validation/evidence/V14/VIS-STAB-01/stability.md`（≥2 次 run 记录）
- 若有代码改动：`tests/visual/web.spec.ts`（仅等待逻辑）

## Execution Steps
1. [ ] 记录当前基线：`git rev-parse --short HEAD`、`ls tests/visual/reference | wc -l`（期望 45）
2. [ ] 触发 **2 次独立普通 CI run**（非 `visual_update_ref`）：
   - 方式 A：向 `upgrade` 推两个空提交（`chore: visual stability probe`）触发
   - 方式 B：GitHub UI 手动 `workflow_dispatch`（`visual_update_ref=false`）两次
3. [ ] 每次记录：run id、commit、visual job 结论、`expected/unexpected/flaky` 计数
4. [ ] 若两次均 PASS → 稳定性得证，进第 6 步
5. [ ] 若任一次 FAIL：
   - 下载 artifact（若 403 则改用 run 日志中的 diff 数字）
   - 判定：仍是 home@1440 且 bbox 在 Gallery/Campus 图区 → 属同一 flake 家族
   - 收敛策略（按序尝试，**不得放宽阈值**）：
     a. 把 `waitForLoadedImages` 的轮询间隔从 200ms 降至 100ms，并**要求连续 2 次轮询都满足**才返回
     b. 截图前追加 `await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))))`
     c. 对 `next/image` 的 `srcset` 首帧加载补 `img.currentSrc` 非空校验
   - 每次改动后重跑 2 次普通 run 验证
6. [ ] 写 `stability.md`：≥2 次 run 表格 + 结论（稳定 / 已收敛 / 仍不稳）

## 验收标准
- [ ] 连续 **≥2 次普通 CI run** 的 visual job 均 PASS（可自动化：run 链接 + 结论）
- [ ] `stability.md` 含每次 run 的 id/commit/结论/计数（可自动化：文件存在且字段齐全）
- [ ] **未修改** `maxDiffPixelRatio`（必须仍为 0.01）（可自动化：`git diff playwright.config.ts` 为空）
- [ ] **未手工编辑**任何 `tests/visual/reference/*.png`（可自动化：`git log --oneline -- tests/visual/reference` 无本卡提交）
- [ ] 若发生收敛改动，改动仅限等待逻辑，不含断言/阈值（人工判断）
- [ ] 前台 `className` 变更 0 行（可自动化：`git diff <base>..HEAD -- "src/app/(web)" "src/components/web" | grep -c className`）

## 验证命令
```bash
git diff --exit-code playwright.config.ts
git log --oneline -5 -- tests/visual/reference
git diff 3e6a6b5..HEAD -U0 -- "src/app/(web)" "src/components/web" | grep -c className
# CI 侧
gh run list --workflow=ci.yml --limit 5 --json databaseId,conclusion,headSha
```

## 证据路径
`docs/design/06_validation/evidence/V14/VIS-STAB-01/stability.md`

## 允许修改
- `tests/visual/web.spec.ts`（**仅**等待/同步逻辑）
- `docs/design/06_validation/evidence/V14/VIS-STAB-01/**`

## 禁止修改
- `playwright.config.ts`（冻结；尤其 `maxDiffPixelRatio`）
- `tests/visual/reference/*.png`（只能经 CI `visual_update_ref` 重生成，本卡不做）
- 任何 `src/**`（尤其前台）
- `tests/visual/routes.ts`（路由清单不得增删）

## 依赖与阻塞
- Depends on：V14-BASE-01
- Blocks：无（但结论会被 V14-REL-01 引用）
- 阻塞条件：若 GitHub Actions 配额耗尽 → 标 `blocked`，等次日再跑；不得用本机 Windows 结果替代

## 建议执行档位
`opus`　理由：需判断 flake 根因；V1.3 曾在此误判为"真回归"，错判会导致改前台样式（违反冻结）。

## 升级条件
连续 2 次收敛尝试后仍 flake → 熔断，上报用户：选项 A 继续投入收敛 / 选项 B 接受 visual 为"非阻断告警"（需 ADR）。

## 预估规模
小（改动）～中（等 CI 时间）　代码改动 < 1 小时，CI 等待跨小时
