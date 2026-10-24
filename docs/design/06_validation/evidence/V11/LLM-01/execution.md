# V11-LLM-01 执行证据：流式超时改「空闲超时」语义

## 5W1H 简版

- What：把流式路径的「整流 30s 截断」改为「相邻 chunk 间空闲超时 + 总时长上限防挂死」。
- Why：原实现把 `settings.llmTimeoutMs`（默认 30000）直接传给适配器 `httpFetch`，其 `AbortSignal.timeout`
  在整次请求（含响应体流）计时——总时长超过 30s 的长回复即使 chunks 持续产出也会被截断。
- Who/When：P2-b lane，V1.1 S6，2026-10-23。
- Where：`src/lib/llm-gateway.ts`（网关层包装；适配器/路由不改逻辑）。
- How：新增 `withStreamTimeouts()` 包装层（pull 驱动、保留背压）：每次 `reader.read()` 与空闲定时器
  竞速，chunk 到达即清零；适配器侧 timeout 改传「总时长上限」（300s）作硬截止。

## 现状盘点（读真实代码核实）

| 审计声明 | 代码核实（upgrade@0728c46 树） | 结论 |
| --- | --- | --- |
| 流式 30s 整流截断（§LLM.1） | `llm-gateway.ts` 旧 `gatewayChatStream` 将 `llmTimeoutMs`（默认 30000，settings-registry.ts:153）传给 `getAdapter().stream()` → `httpFetch` → `AbortSignal.timeout(30s)` 作用于整个响应体流 | **属实，已修** |

## 改动文件

- `src/lib/llm-gateway.ts`：
  - 新增常量 `STREAM_IDLE_TIMEOUT_MS = 30_000`、`STREAM_TOTAL_TIMEOUT_MS = 300_000`（导出供测试断言）。
  - 新增 `withStreamTimeouts(source, { idleMs, totalMs, onComplete? })`：空闲超时 + 总上限 + 完成回调
    （V11-LLM-02 复用）。剩余总时长不足一个空闲周期时，定时到点报「总时长超限」而非「空闲超时」（语义归因正确）。
  - `gatewayChatStream`：适配器 timeout 改传 `totalMs`；返回流经 `withStreamTimeouts` 包装；
    `idleMs = max(llmTimeoutMs, 30s)`（管理员配更长则顺延；配更短也不低于 30s 安全下限——思考型模型
    chunk 间隔可达分钟级，过激空闲阈值有误杀风险）。
- `src/lib/__tests__/v11-llm-01-stream-timeout.test.ts`（新增，6 例）。

未改动 `src/app/api/chat/stream/route.ts`：路由的 `reader.read()` 循环、catch → `recordGatewayFailure`、
finally 落库逻辑与包装层错误语义天然衔接（空闲/总上限切断 → error 帧 + 失败计数），无需改动。

## 语义说明（写入证据，对应 Execution Step 2）

- 空闲超时：相邻 chunk 间隔 > `max(llmTimeoutMs, 30s)` 才切断（默认 30s 无新 chunk 即断）。
- 总时长上限：自适配器建连起 300 秒硬截止，防真挂死占用连接；与空闲阈值独立。
- 已知取舍：响应头前的挂死（上游不回包）由适配器 timeout（=总上限 300s）兜底——相比旧 30s 转下一个
  供应商变慢，但换来「长回复不被整流截断」；卡面明确要求"总时长上限另设（如 5 分钟）防挂死"，属预期。
- 测试用时间压缩口径：用例内 idle=100ms/total=500ms 对应生产 30s/300s，比例一致，避免真实 60s mock 流。

## 验收逐条

| 验收标准 | 结果 | 证据 |
| --- | --- | --- |
| 长回复（mock 60s 流）完整送达 | PASS | 用例「长回复：chunks 持续到达且间隔 < idleMs 时，总时长超过 idleMs 也不截断」（时间压缩 40×20ms≈800ms > idle 100ms，完整收到 40 chunks） |
| 真挂死连接仍会被空闲超时切断 | PASS | 用例「真挂死连接：出数后停滞 → 切断并抛空闲超时错误」（收到 3 chunks 后 rejects /流式空闲超时/） |
| 总时长上限防挂死（Step 2） | PASS | 用例「总时长上限：chunk 间隔始终 < idleMs 但总时长超过 totalMs → 硬性切断」（rejects /总时长超过上限/） |
| 适配器收到总上限而非 30s（接线） | PASS | 用例「适配器收到 timeoutMs = 流式总时长上限」断言 `[300000]` |

## 命令输出摘录

```
npx vitest run src/lib/__tests__/v11-llm-01-stream-timeout.test.ts
 Test Files  1 passed (1)
      Tests  6 passed (6)
```

## UNKNOWN

无。

## 后续方向待办

- 无阻塞项。`settings.llmTimeoutMs` 的管理端文案仍为「模型调用超时（毫秒）」，现流式语义为空闲超时
  下限 + 非流式整流超时；文案微调属 P11（配置）范围，本卡未越界。
