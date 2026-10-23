# V8-SEC-03 独立验证报告（V9-V-01）

- 验证者：子代理（与执行者上下文隔离；仅依据 diff + 可重跑命令）
- 验证日期：2026-10-23；代码基线：upgrade@fad1924；被验证提交：49a2052
- **结论：FAIL**

> 安全目标（critical 2→0）已达成且无升级回归；FAIL 仅因验收项「shuffle 结果一致」被独立复现推翻，且卡规定的 shuffle 执行步骤无证据。归因与修复建议见 §备注——该缺陷先于本卡存在，不应由执行者重跑本卡闭合。

## 逐条验收

| 验收条目（引自卡定义） | 结果 | 证据 |
| --- | --- | --- |
| `npm audit` 官方源 critical=0 | **PASS** | 本验证者 2026-10-23 重跑 `npm run check:audit`（强制官方源）→ `统计：critical 0 / high 0 / moderate 0 / low 0 / total 0`，exit 0（较执行时的 critical 0/high 5（降级建议）/moderate 3 进一步全清零）。lockfile 核对：vitest ^3.2.4→^5.0.5；**tinypool 在 package-lock.json 出现 0 次**（vitest 5 已不再依赖该包，漏洞随包消失——execution.md §4 写「tinypool 随之到 5.0.5」表述不准，实为移除，安全结论不变） |
| npm test 通过数 ≥ N0 且无新增 skip | **PASS** | 本验证者独立重跑 `npx vitest run`（默认序）→ **72 files / 1712 tests 全 passed**，与 N0=1712 一致；被改测试文件 diff（llm-registry.test.ts）仅删一个空转 mock，无 skip、无断言改动（逐行核对） |
| `--sequence.shuffle` 结果一致 | **FAIL** | 执行者未提供任何 shuffle 运行证据（execution.md §6 门禁表无此行，卡 Execution Steps 第 5 步要求「跑 npm test 两次 + --sequence.shuffle 一次」）。本验证者独立复现两次全量 shuffle：第 1 次 8 failed（7 文件）、第 2 次 20 failed（7 文件），失败集随随机序波动。失败文件：api-contract/p03-endpoints、collect-autokb、lane-b/notify、content-review、lane-d/collect、lane-b/routes-admin、block-registry |
| ccr.md 存在 | **未满足（实质豁免）** | evidence/V8/SEC-03/ 仅 execution.md，无 ccr.md。但 `git log -- vitest.config.ts` 显示该文件最后改动为 W0-07（61efd4a），本卡及其后 V8 均未触碰冻结面——CCR 实际未触发，验收字面未达成、实质无违规 |

## 允许修改路径核对

`git show --name-status 49a2052`：package.json、package-lock.json、evidence/V8/SEC-03/**、state.json（协议文件）均在允许/协议范围。
**清单外**：`src/lib/__tests__/lane-c/llm-registry.test.ts`（卡允许清单为 package.json/lock/vitest.config.ts/evidence）。核减理由评估：diff 仅为删除嵌套在 it() 内、实现为 `return real` 的空转 vi.mock 并留注释（逐行核对属实，非改断言、非加 skip）；执行者在 execution.md §3.1 披露了文件、原因与「零行为影响」论证但未标注「越界」字样。按 B-02 验证先例（披露充分的最小越界=findings 不阻断），本项判 finding；但因 shuffle 项 FAIL，卡整体仍 FAIL。

## 未重跑/受限项

- lint/tsc/build 未单独重跑（引用 HEAD=fad1924 当日门禁 + CI run 39978424632 gate 绿）。
- 未在 49a2052 提交点原样复跑 shuffle（工作区不可切换/检出）；以 HEAD 复现 + 失败文件全部早于 V8 + vitest 3 对照实验代替归因（见下）。

## 备注（归因与修复路由——重要）

1. **shuffle 失败是先于 V8 的用例内顺序耦合，非 vitest 5 升级引入**：7 个失败文件中 6 个单独 `--sequence.shuffle` 运行即失败（p03-endpoints 2F/26P、collect-autokb 3F/3P、lane-b/notify 1F/8P、content-review 2F/8P、routes-admin 3F/37P、block-registry 1F/16P）→ 耦合在文件内部，与文件间执行顺序无关。
2. **决定性对照**：经 npx 缓存运行**升级前版本** `npx -y vitest@3.2.7 run --sequence.shuffle src/lib/__tests__/lane-b/routes-admin.test.ts`（未改仓库任何文件）→ **同样失败**（1 failed | 39 passed）。即 shuffle 不一致在 vitest 3 下已存在；B-02 验证报告（W1 期）早已把 routes-admin 的「roles DELETE 依赖 victim 用户」登记为 P3 顺序耦合。升级本身无回归（默认序 1712 前后一致）。
3. **修复路由建议**：不应重跑本卡；应另开「测试顺序自洽」卡（为 routes-admin/collect-autokb/content-review/p03-endpoints/notify/block-registry 等补用例内隔离，或按文件显式声明执行顺序），修复范围在测试文件属各文件归属卡。
4. 执行证据缺口：execution.md 未含 shuffle 输出，属执行步骤漏做且未申报；本报告如实记 FAIL。
5. tinypool 表述纠偏：lockfile 已无该包（安全结果更优），后续引用应写「已随 vitest 5 移除」。
