# V13-VIS-01 execution

## 本地改动

- `tests/visual/reference/home-1440.png`：来自 CI workflow_dispatch `40431748131` 的 `visual-reference` artifact。
- `tests/visual/web.spec.ts`：在 `settle()` 中显式 `img.decode()` 非忽略图片并轮询 `complete && naturalWidth > 0`，用于消除普通 CI 中 `home @1440` 偶发空白图区。
- `docs/design/06_validation/evidence/V13/VIS-01/triage.md`：保留 45 图逐组判定，并补普通 CI 复跑失败与哈希证据。

## CI 取证

| run | 事件 | commit | 结论 | 说明 |
|---|---|---|---|---|
| 40425202421 | push | a129bce | gate PASS / docker PASS / visual FAIL | 初始失败；仅 `home @1440` 失败，ratio 0.10，881946 pixels |
| 40431748131 | workflow_dispatch `visual_update_ref=true` | a129bce | visual PASS | 重生成 `home-1440.png`，提交为 `ad4cf70` |
| 40433104468 | push | cb7b34d | gate PASS / docker PASS / visual FAIL | 普通 CI 仍仅 `home @1440` 失败；diff 仍为 881946 pixels / ratio 0.10 |
| 40434018876 | workflow_dispatch `visual_update_ref=true` | cb7b34d | visual PASS | 再次重生成 `home-1440.png`，与仓库 reference 哈希一致 |
| 40436075724 | push | 8dc778b | gate PASS / docker PASS / visual PASS | decode 等待修复后普通 CI visual 全绿 |

## 哈希证据

| 文件 | SHA-256 |
|---|---|
| `tests/visual/reference/home-1440.png` @ `cb7b34d` | `BF6DC5439BAE9B6A30C84AD8C362D4AB65C42849E2D2C9EC2D02A2F27208B8A4` |
| `visual-reference-40434018876/home-1440.png` | `BF6DC5439BAE9B6A30C84AD8C362D4AB65C42849E2D2C9EC2D02A2F27208B8A4` |
| `visual-results-40433104468/home-1440-actual.png` | `04A0E3314750E049784B6CF33C809F04E2A5A63BCD4E61366355C25384468038` |
| `visual-results-40433104468/home-1440-expected.png` | `BF6DC5439BAE9B6A30C84AD8C362D4AB65C42849E2D2C9EC2D02A2F27208B8A4` |

## 本地校验

- `npx tsc --noEmit`：PASS
- `npm run lint`：PASS
- `npx playwright test tests/visual --list`：PASS（46 tests）
- CI run `40436075724`：PASS（gate / docker / visual）

## 收口确认

- 修复提交已推送到 `upgrade`。
- 普通 CI run `40436075724` 已证明 gate / docker / visual 三 job PASS，`V13-VIS-01` 可标为 done。
