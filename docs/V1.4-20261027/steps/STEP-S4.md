# STEP-S4：visual 门禁稳定性证明

## 目标
证明 visual 门禁不是靠 flake 过的：连续 ≥2 次普通 CI run 全绿。

## 卡
- `V14-VIS-STAB-01`（main-agent，`opus`，小～中）

## 为什么必须做（证据链）

| run | commit | visual | 说明 |
|---|---|---|---|
| `40425202421` | `a129bce` | FAIL | 初始矩阵，home@1440 ratio 0.10 |
| `40431748131` | `a129bce` | PASS | 重生成基线后 |
| `40433104468` | `cb7b34d` | **FAIL** | 同一失败，ratio 0.10 |
| `40436075724` | `8dc778b` | PASS | decode 等待修复后 |
| `40436760024` | `3e6a6b5` | PASS | 普通 CI 全绿 |

**4 次普通 run 失败 1 次** → 单次绿不足以证明门禁可信。

## 执行步骤
1. 记当前基线：HEAD、`ls tests/visual/reference | wc -l`（期望 45）
2. 触发 **2 次独立普通 CI run**（非 `visual_update_ref`）
   - 方式 A：推两个空提交 `chore: visual stability probe`
   - 方式 B：GitHub UI 手动 `workflow_dispatch`（`visual_update_ref=false`）两次
3. 每次记：run id、commit、visual 结论、`expected/unexpected/flaky` 计数
4. 两次均 PASS → 稳定性得证
5. 若任一次 FAIL：
   - 下载 artifact（403 则用 run 日志的 diff 数字）
   - 判定是否仍为 home@1440 且 bbox 在 Gallery/Campus 区 → 同一 flake 家族
   - 收敛策略按序（**禁放宽阈值**）：
     a. `waitForLoadedImages` 轮询 200ms→100ms，且要求**连续 2 次**满足才返回
     b. 截图前追加双 `requestAnimationFrame` 等待
     c. 校验 `img.currentSrc` 非空
   - 每次改动后重跑 2 次验证
6. 写 `stability.md`

## 完成判据
- [ ] 连续 ≥2 次普通 run 的 visual 均 PASS
- [ ] `stability.md` 字段齐全
- [ ] `git diff --exit-code playwright.config.ts` 通过（阈值未动）
- [ ] 未手工编辑 `reference/*.png`
- [ ] 前台 `className` 变更 0 行

## 验证命令
```bash
git diff --exit-code playwright.config.ts
git log --oneline -5 -- tests/visual/reference
git diff 3e6a6b5..HEAD -U0 -- "src/app/(web)" "src/components/web" | grep -c className
gh run list --workflow=ci.yml --limit 5 --json databaseId,conclusion,headSha
```

## 关键约束
- 只允许改 `tests/visual/web.spec.ts` 的**等待逻辑**
- 禁改 `playwright.config.ts`、`routes.ts`、`reference/*.png`
- 不得用本机 Windows 结果替代 CI 结论

## 证据落点
`evidence/V14/VIS-STAB-01/stability.md`
