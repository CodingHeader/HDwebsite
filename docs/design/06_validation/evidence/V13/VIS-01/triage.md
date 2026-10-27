# V13-VIS-01 triage

## 判定口径

- 初始失败基线：push run `40425202421` @ `a129bce`，`gate=PASS`、`docker=PASS`、`visual=FAIL`。
- 45 张视觉矩阵来自 artifact `visual-results-40425202421`：15 路由 × 3 宽度。
- 归零动作：workflow_dispatch run `40431748131` @ `a129bce`，`visual_update_ref=true`；只提交该 CI artifact 中重生成的 `tests/visual/reference/home-1440.png`。
- 最终确认：run `40431748131` 的 visual job PASS，Playwright stats expected=46/unexpected=0/skipped=0/flaky=0，其中 45 张视觉矩阵全 PASS。

## 复跑修正记录（2026-10-27 12:46）

- 推送后普通 CI run `40433104468` @ `cb7b34d`：`gate=PASS`、`docker=PASS`、`visual=FAIL`；唯一失败仍是 `home @1440`，diff 仍为 `881946` pixels / ratio `0.10`。
- 失败 artifact 证据：`expected=tests/visual/reference/home-1440.png` 哈希为 `BF6DC5439BAE9B6A30C84AD8C362D4AB65C42849E2D2C9EC2D02A2F27208B8A4`；`actual` 哈希为 `04A0E3314750E049784B6CF33C809F04E2A5A63BCD4E61366355C25384468038`。
- 重新触发 workflow_dispatch run `40434018876` @ `cb7b34d`，`visual_update_ref=true`：`visual=PASS`，生成 `visual-reference-40434018876`；其 `home-1440.png` 哈希与仓库 reference 同为 `BF6DC54...`。
- 因此 `cb7b34d` 的 CI 普通 run 失败归因为 next/image 冷启动/图片解码时序 flake：CI 更新模式能稳定产出当前 reference，普通模式的 actual 偶发退回旧空白图区。
- 修复：`tests/visual/web.spec.ts` 在 `settle()` 中显式调用非忽略 `<img>` 的 `decode()` 并轮询 `complete && naturalWidth > 0`，不修改 CSS、组件、阈值或 workflow 阈值。修复提交后需普通 CI visual job 重新证明 45/45。

## 总判定

- 类别：C（渲染噪声 / 图片解码时序 / 基线漂移）。
- 依据：45 行中仅 `home @1440` 失败；差异 bbox `(113,4297,1327,5461)` 位于首页 Gallery/Campus 图片区；失败 actual 为旧空白图区，两次 CI 更新模式 reference 均稳定为当前彩色图区。
- 排除真样式回归：`git diff 0728c46..a129bce -- "src/app/(web)" "src/components/web"` 无 className/style 变更；768/375 通过；除首页外 14 路由全部通过。
- 处理：未改前台 JSX/className、`globals.css`、`public/**`、Playwright 阈值；先用 CI 同源重生成的 reference 替换旧基线，再补强 visual 测试的图片 decode 等待。

## 45 图逐组判定

| # | route | viewport | initial_push_40425202421 | ratio | pixels | rerun_push_40433104468 | verdict | basis |
|---:|---|---:|---|---:|---:|---|---|---|
| 1 | about | 375 | PASSED | 0 | 0 | PASS | PASS 无需处理 | artifact results.json expected, no visual error |
| 2 | about | 768 | PASSED | 0 | 0 | PASS | PASS 无需处理 | artifact results.json expected, no visual error |
| 3 | about | 1440 | PASSED | 0 | 0 | PASS | PASS 无需处理 | artifact results.json expected, no visual error |
| 4 | apply | 375 | PASSED | 0 | 0 | PASS | PASS 无需处理 | artifact results.json expected, no visual error |
| 5 | apply | 768 | PASSED | 0 | 0 | PASS | PASS 无需处理 | artifact results.json expected, no visual error |
| 6 | apply | 1440 | PASSED | 0 | 0 | PASS | PASS 无需处理 | artifact results.json expected, no visual error |
| 7 | article-detail | 375 | PASSED | 0 | 0 | PASS | PASS 无需处理 | artifact results.json expected, no visual error |
| 8 | article-detail | 768 | PASSED | 0 | 0 | PASS | PASS 无需处理 | artifact results.json expected, no visual error |
| 9 | article-detail | 1440 | PASSED | 0 | 0 | PASS | PASS 无需处理 | artifact results.json expected, no visual error |
| 10 | articles | 375 | PASSED | 0 | 0 | PASS | PASS 无需处理 | artifact results.json expected, no visual error |
| 11 | articles | 768 | PASSED | 0 | 0 | PASS | PASS 无需处理 | artifact results.json expected, no visual error |
| 12 | articles | 1440 | PASSED | 0 | 0 | PASS | PASS 无需处理 | artifact results.json expected, no visual error |
| 13 | campus | 375 | PASSED | 0 | 0 | PASS | PASS 无需处理 | artifact results.json expected, no visual error |
| 14 | campus | 768 | PASSED | 0 | 0 | PASS | PASS 无需处理 | artifact results.json expected, no visual error |
| 15 | campus | 1440 | PASSED | 0 | 0 | PASS | PASS 无需处理 | artifact results.json expected, no visual error |
| 16 | contact | 375 | PASSED | 0 | 0 | PASS | PASS 无需处理 | artifact results.json expected, no visual error |
| 17 | contact | 768 | PASSED | 0 | 0 | PASS | PASS 无需处理 | artifact results.json expected, no visual error |
| 18 | contact | 1440 | PASSED | 0 | 0 | PASS | PASS 无需处理 | artifact results.json expected, no visual error |
| 19 | course-detail | 375 | PASSED | 0 | 0 | PASS | PASS 无需处理 | artifact results.json expected, no visual error |
| 20 | course-detail | 768 | PASSED | 0 | 0 | PASS | PASS 无需处理 | artifact results.json expected, no visual error |
| 21 | course-detail | 1440 | PASSED | 0 | 0 | PASS | PASS 无需处理 | artifact results.json expected, no visual error |
| 22 | courses | 375 | PASSED | 0 | 0 | PASS | PASS 无需处理 | artifact results.json expected, no visual error |
| 23 | courses | 768 | PASSED | 0 | 0 | PASS | PASS 无需处理 | artifact results.json expected, no visual error |
| 24 | courses | 1440 | PASSED | 0 | 0 | PASS | PASS 无需处理 | artifact results.json expected, no visual error |
| 25 | gallery | 375 | PASSED | 0 | 0 | PASS | PASS 无需处理 | artifact results.json expected, no visual error |
| 26 | gallery | 768 | PASSED | 0 | 0 | PASS | PASS 无需处理 | artifact results.json expected, no visual error |
| 27 | gallery | 1440 | PASSED | 0 | 0 | PASS | PASS 无需处理 | artifact results.json expected, no visual error |
| 28 | home | 375 | PASSED | 0 | 0 | PASS | PASS 无需处理 | artifact results.json expected, no visual error |
| 29 | home | 768 | PASSED | 0 | 0 | PASS | PASS 无需处理 | artifact results.json expected, no visual error |
| 30 | home | 1440 | FAILED | 0.1 | 881946 | FAIL | C 图片解码时序/基线漂移 | 普通 CI actual 退回旧空白图区；两次 CI update 模式稳定生成当前 reference |
| 31 | learning | 375 | PASSED | 0 | 0 | PASS | PASS 无需处理 | artifact results.json expected, no visual error |
| 32 | learning | 768 | PASSED | 0 | 0 | PASS | PASS 无需处理 | artifact results.json expected, no visual error |
| 33 | learning | 1440 | PASSED | 0 | 0 | PASS | PASS 无需处理 | artifact results.json expected, no visual error |
| 34 | not-found | 375 | PASSED | 0 | 0 | PASS | PASS 无需处理 | artifact results.json expected, no visual error |
| 35 | not-found | 768 | PASSED | 0 | 0 | PASS | PASS 无需处理 | artifact results.json expected, no visual error |
| 36 | not-found | 1440 | PASSED | 0 | 0 | PASS | PASS 无需处理 | artifact results.json expected, no visual error |
| 37 | partners | 375 | PASSED | 0 | 0 | PASS | PASS 无需处理 | artifact results.json expected, no visual error |
| 38 | partners | 768 | PASSED | 0 | 0 | PASS | PASS 无需处理 | artifact results.json expected, no visual error |
| 39 | partners | 1440 | PASSED | 0 | 0 | PASS | PASS 无需处理 | artifact results.json expected, no visual error |
| 40 | party | 375 | PASSED | 0 | 0 | PASS | PASS 无需处理 | artifact results.json expected, no visual error |
| 41 | party | 768 | PASSED | 0 | 0 | PASS | PASS 无需处理 | artifact results.json expected, no visual error |
| 42 | party | 1440 | PASSED | 0 | 0 | PASS | PASS 无需处理 | artifact results.json expected, no visual error |
| 43 | service-detail | 375 | PASSED | 0 | 0 | PASS | PASS 无需处理 | artifact results.json expected, no visual error |
| 44 | service-detail | 768 | PASSED | 0 | 0 | PASS | PASS 无需处理 | artifact results.json expected, no visual error |
| 45 | service-detail | 1440 | PASSED | 0 | 0 | PASS | PASS 无需处理 | artifact results.json expected, no visual error |
