# V8-VIS-02 独立验证报告（V9-V-01）
- 验证者：子代理（与执行者上下文隔离；仅依据 diff + 可重跑命令）
- 验证日期：2026-10-23；代码基线：upgrade@f78cc1d
- **结论：PASS**

## 验证对象
- 卡定义：`docs/V0.8-20261022/tasks/V8-VIS-02.md`；提交 `f221a2b`（ci(V8-VIS-02)）
- 改动文件（git show --stat）：`.github/workflows/ci.yml`(+81/−2)、`docs/V0.8-20261022/state.json`(+3/−2)、`evidence/V8/VIS-02/execution.md`(+91)

## 逐条验收
| 验收条目（引自卡定义） | 结果 | 证据（命令输出摘录/文件路径） |
| --- | --- | --- |
| CI 实跑一次有结果（PASS 或带产物的 FAIL） | PASS | 执行时点本机无法跑 Linux 容器（execution.md §5 如实登记「未验证」）；**至本验证日已有真实 run**：run 39979767004 显示 visual job 的 Prepare DB 通过、Clean build 通过、Visual regression 41 fail——即「带产物的 FAIL」这一合法验收形态。41 个差异属 V8-VIS-03 分诊范围，不是本卡验收内容；本卡验收的是「CI 有 visual 作业并实跑出结果」这件事本身 |
| 产物可下载 | PASS（机制级） | workflow 中 `Upload visual diff artifacts` 步骤 `uses: actions/upload-artifact@v4` 且 `if: always()`（f221a2b diff 与 HEAD ci.yml:199-203 均确认），该 run 的 Visual regression 失败必然触发上传分支。本机无 gh CLI，未能做产物清单级/下载级确认（见受限项） |
| 主门禁 job 不受影响 | PASS | ci.yml 中 `gate` 与 `visual` 为相互独立 job；`visual` 设 `continue-on-error: true`（HEAD ci.yml:131 与 f221a2b diff 均确认），失败不阻断工作流门禁；gate 自身门禁在 HEAD=f78cc1d 本地全量通过（lint/tsc/1712 单测/build，2026-10-23），未单独重跑 CI 侧 gate |

## Execution Steps 核对（对 f221a2b diff 中新增行逐项验证）
| 步骤 | 结果 | 证据 |
| --- | --- | --- |
| 新增 job visual：官方 playwright 镜像 | 完成 | diff 新增 `visual:` + `image: mcr.microsoft.com/playwright:v1.59.1-jammy`；镜像版本与 lock 一致——重跑 `node -e` 读 package-lock：`@playwright/test = 1.59.1`，`grep -o` ci.yml：`playwright:v1.59.1-jammy` |
| 步骤：ci → migrate deploy → seed-visual → build → start → test:visual | 完成 | diff 新增行含：`npx prisma migrate deploy`、`npx tsx prisma/seed-visual.ts --check \|\| npx tsx prisma/seed-visual.ts`、`Clean build`（`rm -rf .next/cache/fetch-cache` 后 build）、`npx next start -p 6789`（轮询 /api/health）、`VISUAL_BASE_URL=… npx playwright test -c playwright.config.ts` |
| 失败时上传 test-results/ 产物 | 完成 | diff 新增 `Upload visual diff artifacts` + `actions/upload-artifact@v4` + `if: always()`（HEAD 版还含服务日志与 visual_update_ref 参照重生成产物，为后续卡增强） |
| continue-on-error: true，VIS-03 后改 false | 完成 | diff 与 HEAD ci.yml:131 均为 `continue-on-error: true   # V8-VIS-03 完成后改为 false`（尚未改 false，符合时序：VIS-03 未完成） |

## 允许修改路径核对
- 卡允许：`.github/workflows/**`、`evidence/V8/VIS-02/**` —— ci.yml 与 execution.md 均在范围内。
- **越界披露**：`state.json`（status done + note）——同 G-01/PERF-01 报告判定：连续执行协议 §1 步骤 7 / §3 授权认领者写 status，最小、不触冻结面；未单独 chore(state) 提交，过程瑕疵已登记。
- 禁止修改（docs/V0.7-20261019/**、他卡路径）：未触碰。

## 未重跑/受限项
- 本机无 gh CLI：未能直接查询 run 39979767004 的产物清单/下载链接与 gate job conclusion；「产物可下载」按 `if: always()` 机制 + run 已跑至 Visual regression 判定，gate 不受影响按 continue-on-error 机制 + 本地全量门禁判定。
- HEAD 的 ci.yml 在 f221a2b 之后又经 V9-CI-01 两次修复（fad1924/f78cc1d：migrate 时序、seed-visual 外键自足、npm ci --include=dev、docker job）——本报告对「job 存在/步骤/镜像/continue-on-error」的核对同时覆盖了 f221a2b diff 与 HEAD 现状，两者一致；run 39979767004 跑的是含这些修复的版本。
- `npm run build` 等重量级门禁未单独重跑，引用 2026-10-23 HEAD=f78cc1d 全量结果。

## 备注
- execution.md §3.1 的 clean build 论证（首页静态预渲染 + unstable_cache revalidate:false + seed 直写 DB 不触发 tag 失效 → 必须清 fetch-cache）与 diff 中 `rm -rf .next/cache/fetch-cache` 步骤对应；run 39979767004 的 Clean build 步骤实际通过，验证了该设计在 CI 可执行。
- 「Visual regression 41 fail」不构成对 VIS-02 的验收冲突：卡定义明确首跑大量 fail 属预期（execution.md §6 遗留 2），分诊归 V8-VIS-03；本卡只对「Linux visual 作业建立并实跑、失败有产物」负责。
