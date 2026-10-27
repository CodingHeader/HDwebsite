# V13-VIS-01 triage

## 判定口径

- 失败基线：push run `40425202421` @ `a129bce`，`gate=PASS`、`docker=PASS`、`visual=FAIL`。
- 45 张视觉矩阵来自 artifact `visual-results-40425202421`：15 路由 × 3 宽度。
- 归零动作：workflow_dispatch run `40431748131` @ `a129bce`，`visual_update_ref=true`；只提交该 CI artifact 中重生成的 `tests/visual/reference/home-1440.png`。
- 最终确认：run `40431748131` 的 visual job PASS，Playwright stats expected=46/unexpected=0/skipped=0/flaky=0，其中 45 张视觉矩阵全 PASS。

## 总判定

- 类别：C（渲染噪声 / 基线漂移）。
- 依据：45 行中仅 `home @1440` 失败；差异 bbox `(113,4297,1327,5461)` 位于首页 Gallery/Campus 图片区；失败 actual 为彩色图片占位块，旧 reference 为空白图片区。
- 排除真样式回归：`git diff 0728c46..a129bce -- "src/app/(web)" "src/components/web"` 无 className/style 变更；768/375 通过；除首页外 14 路由全部通过。
- 处理：未改前台 JSX/className、`globals.css`、`public/**`、Playwright 配置或阈值；仅用 CI 同源重生成的 reference 替换旧基线。

## 45 图逐组判定

| # | route | viewport | failed_run | ratio | pixels | final_run | verdict | basis |
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
| 30 | home | 1440 | FAILED | 0.1 | 881946 | PASS | C 基线漂移 | Only failed row in push run; diff isolated to image content area; refreshed from CI reference artifact |
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
