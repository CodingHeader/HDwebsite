# STEP-00 · V0.3 裁决与续跑（立即执行）

**目标**：完成 Wave 0，推送 `w1-base`，Hark（A 流、E 流）与 P1/P2/P3 同日开工。取代 V0.2 的 STEP-00。

| 序 | 动作 | 执行者 | 完成判据 |
|---|---|---|---|
| 0.1 | 裁决 K1/K2/K3、D13/D14/D15（不答复按默认） | 用户 | 裁决写入 `docs/design/04_planning/current-plan.md` 文首（由 P1 在 W0-05 提交时同步） |
| 0.2 | 下发三份提示词 | 用户 | P1/P2/P3 确认收到 |
| 0.3 | 推送只读分支 `w0/staging`（K2 方案 A） | P1 | `git ls-remote origin w0/staging` 有值；upgrade 未动 |
| 0.4 | 验 W0-03 | Hark | 验证报告 PASS |
| 0.5 | W0-04 现场对卡、补齐、单次提交 | P1 | 本卡命令 exit 0；Hark PASS |
| 0.6 | W0-05（含 G 系列 DTO）→ W0-06（含 deletedAt/tags/collectItemId）→ W0-07 → W0-09 | P1 | 各卡 Hark PASS |
| 0.7 | W0-08 全量门禁 + 判定 | P1 跑 / Hark 判 | GATE、visual 46/46、e2e 8/8 → W0-verify PASS |
| 0.8 | 推送 upgrade 与 `w1-base` | P1 | remote URL 无凭据 |
| 0.9 | 五条分支开工 | Hark ×2、P1、P2、P3 | 各自首个验证请求发出 |

**熔断**：任一卡连续 2 次 FAIL → 停止，重写卡交用户。
**不做**：重生成视觉参照集；G8（D14 未批准前）。
