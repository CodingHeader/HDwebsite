# STEP-00（V0.6）：Wave 0.6 冻结面补丁（CCR-1）→ 打 w1-base-ccr-1 → Wave 1 开工

> 依据：`18-V0.6-W0过闸复核与统一规划.md`。本步骤取代 V0.5 的 STEP-00；V0.2~V0.5 的 STEP-00 只作历史记录。

## 进入条件
- [ ] `git ls-remote origin upgrade` = fb82885（或其后只有 docs 的提交）；`git rev-parse w1-base` = 0cb699b
- [ ] 远端没有任何 `lane/*` 分支（有 → 先按 18 号文件 U1 处理）
- [ ] 你已应用 V0.6 补丁（`git am 0001-*.patch 0002-*.patch 0003-*.patch`）并推送 upgrade——这一步同时完成 W0-12 的主体

## 步骤
| 序 | 卡 | 执行者 | 分支 | 可并行 | 产出 |
|---|---|---|---|---|---|
| 1 | W0-12 | P3（或你本人：git am 即完成） | `w0/docs` 或直接 upgrade | 与 2、3 并行（文件不交） | 文件名修复、V0.6 入库、AGENTS.md 对齐 |
| 2 | W0-10 | P1 | `w0/ccr-1` | 与 1、3 并行 | CCR-1 契约 + ADR-034 |
| 3 | W0-11 | P3 | `w0/test-infra` | 与 1、2 并行 | a11y 配置、env 预置、storageState、守卫修正 |
| 4 | W0-13 | Hark（参照机一步由你在本机执行） | upgrade | 等 1~3 全部 PASS | 补生成 courses-375、双环境门禁、tag `w1-base-ccr-1` |
| 5 | W1 开工 | P1=B、P2=C、P3=D、Hark=A‖E | `lane/*` 从 `w1-base-ccr-1` | 五线并行 | 见各线 STEP-1x |

## 退出条件（全部满足才算本步骤 Done）
- [ ] `git tag --points-at origin/upgrade` 含 `w1-base-ccr-1`
- [ ] `docs/design/06_validation/evidence/W0/W0-13/ccr-1-verify.md` 结论 PASS；visual 输出（Windows）与 e2e 输出（Linux）的 HEAD SHA 一致
- [ ] `git ls-files docs/V0.5-20261015 | wc -l` = 142，`git -c core.quotepath=false ls-files docs` 无乱码名（命令见 W0-12 验收第 1 条）
- [ ] `npx vitest run src/lib/__tests__/w0-contracts.test.ts` 含 CCR-1 用例且全绿

## 熔断
同一卡连续 2 次独立验证 FAIL → 停止改代码，重写任务卡或升级档位，交你裁决；不得换提示词硬撞第 3 次。

## 交付给各执行者的文件
- P1：`prompts/V0.6-Hark与三Agent/P1-完整提示词-契约与API平台线.md`
- P2：`prompts/V0.6-Hark与三Agent/P2-完整提示词-AI与知识库线.md`
- P3：`prompts/V0.6-Hark与三Agent/P3-完整提示词-运维性能线.md`
- Hark：`prompts/V0.6-Hark与三Agent/Hark-自执行计划-UI核心与集成终审.md`
- 独立验证者：`prompts/提示词-独立验证者.md`
