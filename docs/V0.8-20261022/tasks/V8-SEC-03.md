# V8-SEC-03：K10-A：vitest 3→5（含 tinypool）开发依赖升级

## 归属
- 所属切片：S1
- 来源需求/证据：K10；用户转述 audit：vitest+tinypool 需 5.0.5
- 执行者：P2

## 目标
全量依赖 audit critical=0，测试数不少于升级前

## 输入
- 文档：docs/V0.8-20261022/00-事实基线.md、02-契约增量.md、04-连续执行协议.md
- 契约：src/contracts/**（只读，唯一源 zod）
- 前置任务：V8-SEC-02
- 前置状态：前置卡在 state.json 中为 done 且 verify=PASS（V8-V-01 除外）

## 输出
- package.json
- package-lock.json
- vitest.config.ts
- docs/design/06_validation/evidence/V8/SEC-03/**

## Execution Steps
1. [ ] 前置同 V8-SEC-01（V8-Q1）；vitest.config.ts 属冻结面，本卡即 CCR，须在证据写 ccr.md
2. [ ] 记录升级前 npm test 通过数 N0
3. [ ] npm i -D vitest@^5 @vitest/*@^5 --registry=https://registry.npmjs.org
4. [ ] 按 vitest 4/5 迁移说明改 config（pool/environment 写法），不得改任何测试断言
5. [ ] 跑 npm test 两次 + --sequence.shuffle 一次

## 验收标准
- [ ] npm audit --registry=https://registry.npmjs.org critical=0
- [ ] npm test 通过数 ≥ N0 且无新增 skip
- [ ] shuffle 结果一致
- [ ] ccr.md 存在

## 验证命令
```bash
npm audit --registry=https://registry.npmjs.org; npm test && npx vitest run --sequence.shuffle && npm run lint && npm run typecheck && npm test && npm run build && npm run check:assets && npm run check:root
```

## 证据路径
docs/design/06_validation/evidence/V8/SEC-03/（execution.md + 命令原始输出；verify.md 由独立验证者写）

## 允许修改
- package.json
- package-lock.json
- vitest.config.ts
- docs/design/06_validation/evidence/V8/SEC-03/**

## 禁止修改
- docs/V0.7-20261019/**（历史只读）
- 其他卡的允许修改路径

## 依赖与阻塞
- Depends on：V8-SEC-02
- Blocks：V8-T-03
- 阻塞条件：V8-Q1 未授权（遇阻塞：state.json 标 blocked + 原因，立即转下一张就绪卡，不等待）

## 建议执行档位
opus　理由：安全/依赖/跨模块，决策不可逆

## 升级条件
需要改测试断言才能通过（说明行为变化，升 opus 复审）；同卡连续 2 次验收 FAIL → 停止改代码，升一档并重写任务书（熔断）

## 预估规模
中　约 1.0 人天　≥ 2 小时
