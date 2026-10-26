# STEP-S2：限频收口（P0 实现缺陷）

## 目标
消除"双源并存"限流，建立单一限流源 + 设置驱动，使后台配置真实生效。

## 卡
- `V13-RL-01`（main-agent，**高档**，中）

## 现状（取证）
| 通道 | 位置 | 阈值 | 粒度 | 可配置 |
|---|---|---|---|---|
| A | `src/app/api/chat/stream/route.ts:22`、`:74-78` | 硬编码 `10` | 按 IP | ❌ |
| B | `src/lib/llm/guard.ts:27`、`:149-153` | 默认 `20` | `scene:identifier` | ✅ |

## 执行步骤
1. **TDD 先写** `src/lib/__tests__/v13-rl-01.test.ts`：
   - 设置 = 2 → 第 3 次 429
   - 设置 = 100 → 连 10 次全 200
   - 同 `scene:identifier` 限流；**不同 identifier 互不影响**
   - 断言不存在按 IP 的独立限流通道
2. 删除 `stream/route.ts` 的 `RATE_LIMIT_PER_MINUTE` 与 IP 计数块
3. `guard.ts` 默认 `20 → 10`；`settings-registry.ts:162` 默认 `"20" → "10"`
4. 在该键加注释：`// V13-RL-01：默认 10（当前生效更严值）；10 vs 20 待 V13-Q2-01 用户裁决`
5. 确认公众号 `chatOnce` 走同一 guard 入口，行为不变
6. 串行门禁 + e2e

## 关键决策（不替用户裁决）
- 默认值取**当前已生效的更严值 10**（不放松风控）。
- 若用户裁决 20 → 仅改 1 常量 + 1 断言 + `REQ-F-009:38` 措辞。

## 完成判据
- [ ] `grep -rn "RATE_LIMIT_PER_MINUTE" src/` 无输出
- [ ] 设置键改动后行为真实变化（测试可证）
- [ ] 默认 10 且有注释标明待裁决
- [ ] 单测 + e2e 全绿（串行）

## 验证命令
```bash
grep -rn "RATE_LIMIT_PER_MINUTE" src/
grep -rn "rateLimitPerMin" src/lib/llm/guard.ts
npm run lint && npm run typecheck && npm test && npm run build
npm run test:e2e
```

## 证据落点
`evidence/V13/RL-01/execution.md`（须含"单一限流源已建立"的代码级证明：删除行 + 唯一调用点）
