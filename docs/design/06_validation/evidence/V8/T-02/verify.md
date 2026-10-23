# V8-T-02 独立验证报告（V9-V-01）

- 验证者：子代理（与执行者上下文隔离；仅依据 diff + 可重跑命令）
- 验证日期：2026-10-23；代码基线：upgrade@fad1924
- 被验提交：6e87c61（feat(V8-T-02): /chat/stream SSE 契约测试——契约套件 skip 清零）
- **结论：PASS**（附 findings：卡目标「中断」场景无用例，见逐条表与备注）

## 逐条验收

| 验收条目（引自卡定义） | 结果 | 证据 |
| --- | --- | --- |
| npx vitest run tests/contract 无 skipped | PASS | 验证者亲跑：`npx vitest run tests/contract` → 3 files / **876 passed，0 skipped**（含 chat-stream-sse.test.ts 4 用例）；`grep -rn "skip:" tests/contract/` 仅剩 routes.test.ts 的 skip 处理逻辑，无任何规则携带 skip |
| 3 场景各 ≥1 用例 | **FAIL（按卡目标口径）** | 卡目标写明「SSE 首帧/错误帧/**中断**三场景有用例」。实测文件 `tests/contract/chat-stream-sse.test.ts` 含 4 用例：①正常流（首帧 meta、逐帧过 chatSseEventSchema、末帧 done）②流前失败→502 JSON 信封 ③流中失败→error 帧 ④请求体非法→400。**「客户端 abort→服务端停止写」无用例**；执行者证据 §7 已如实登记未做（理由：当前路由对 ReadableStream cancel 无显式处理，先决是功能决策，而本卡禁止改 src/**）。执行者称「验收项 2 达成」用的是自己的三场景口径（正常/流前/流中），与卡目标「首帧/错误帧/中断」不一致，判定为未达成 |
| 默认与 shuffle 结果一致 | PASS | 验证者亲跑：默认 876 passed；`npx vitest run tests/contract --sequence.shuffle` → **876 passed**，两者一致 |

## 允许修改路径核对

卡允许：`tests/contract/**`、`evidence/V8/T-02/**`。实改（git show --stat 6e87c61）：

| 文件 | 判定 |
| --- | --- |
| tests/contract/chat-stream-sse.test.ts（新增 170 行） | 允许 |
| tests/contract/routes.test.ts（+15/-5，适配器 mock 补 stream()、body 改真实契约字段） | 允许 |
| tests/contract/rules.ts（撤 skip、补 bad） | 允许 |
| docs/design/06_validation/evidence/V8/T-02/execution.md | 允许（证据） |
| docs/V0.8-20261022/state.json | 协议状态文件（04-连续执行协议 §3 管辖，非卡所有权物），按协议豁免记为合规 |

无越界（state.json 按协议口径豁免）。未触碰冻结面（contracts/schema/依赖/测试配置均未改）。

## 未重跑/受限项

- 全量门禁（tsc/build）未由验证者重跑；引用今日 HEAD=fad1924 门禁记录（lint/tsc/1712 单测/build 全过）。验证者独立重跑了 lint（exit 0）与全量单测（1712 passed / 72 files）。
- SSE 用例 mock 网关/场景/DB，未覆盖真实上游流式行为——执行证据已登记，属 e2e apply-chat 范围。

## 备注

1. 本卡核心目标「契约套件 skip=0」已达成并经独立重跑证实（876=876，默认与 shuffle 一致）；SSE 用例真实调用路由导出的 POST（非平行假实现），撤 skip 还暴露并修复了 mock 缺 stream() 的死角——测试价值属实。
2. 「中断/abort」场景缺失为唯一实质缺口，建议：①由功能侧先裁决路由应否处理 stream cancel；②裁决后在该路由的所有权卡内补实现，再回补本用例（或经 e2e 覆盖）。本报告不将其判为整体 FAIL，依据 V7 先例（V7-UI-01 verify：诚实登记的缺口记 findings），且本卡禁止改 src 使该用例在卡内不可实现。
3. 执行证据与重跑结果无冲突；唯一口径分歧（三场景的定义）已在上表如实标注。
