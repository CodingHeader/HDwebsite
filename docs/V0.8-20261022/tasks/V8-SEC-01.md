# V8-SEC-01：K10-A：next 16.2.1→16.4.2（含 eslint-config-next 同步）

## 归属
- 所属切片：S1
- 来源需求/证据：K10；W2-03；用户转述 audit：next 需 16.4.2
- 执行者：Hark

## 目标
官方源 audit 中 next 相关 critical 清零，门禁与 e2e 全绿

## 输入
- 文档：docs/V0.8-20261022/00-事实基线.md、02-契约增量.md、04-连续执行协议.md
- 契约：src/contracts/**（只读，唯一源 zod）
- 前置任务：V8-G-01
- 前置状态：前置卡在 state.json 中为 done 且 verify=PASS（V8-V-01 除外）

## 输出
- package.json
- package-lock.json
- next.config.ts
- src/app/layout.tsx
- docs/design/06_validation/evidence/V8/SEC-01/**

## Execution Steps
1. [ ] 前置：读取 08-风险与待裁决 中 V8-Q1，未授权则本卡标 BLOCKED 并跳到下一张就绪卡（不等待）
2. [ ] npm i next@16.4.2 eslint-config-next@16.4.2 --registry=https://registry.npmjs.org
3. [ ] 按 next 16.3/16.4 变更说明逐条核对 next.config.ts、middleware/proxy、unstable_cache 用法；只做编译/运行所需的最小改动
4. [ ] 跑门禁 + test:e2e；对比升级前后 /manager/articles JS gzip 与首页热 TTFB（W2-04 口径）
5. [ ] 证据：audit 前后 json、门禁日志、两项指标

## 验收标准
- [ ] npm audit --omit=dev --registry=https://registry.npmjs.org 中 next 0 critical
- [ ] 门禁全绿
- [ ] test:e2e 通过数 ≥ 升级前
- [ ] /manager/articles JS gzip 不高于 372,724 B 的 105%
- [ ] CHANGELOG 记一行

## 验证命令
```bash
npm audit --omit=dev --registry=https://registry.npmjs.org; npm run lint && npm run typecheck && npm test && npm run build && npm run check:assets && npm run check:root && npm run test:e2e
```

## 证据路径
docs/design/06_validation/evidence/V8/SEC-01/（execution.md + 命令原始输出；verify.md 由独立验证者写）

## 允许修改
- package.json
- package-lock.json
- next.config.ts
- src/app/layout.tsx
- docs/design/06_validation/evidence/V8/SEC-01/**

## 禁止修改
- docs/V0.7-20261019/**（历史只读）
- 其他卡的允许修改路径

## 依赖与阻塞
- Depends on：V8-G-01
- Blocks：V8-SEC-02, V8-PERF-01, V8-REL-01
- 阻塞条件：V8-Q1 未授权（遇阻塞：state.json 标 blocked + 原因，立即转下一张就绪卡，不等待）

## 建议执行档位
opus　理由：安全/依赖/跨模块，决策不可逆

## 升级条件
需要改动 src/contracts 或迁移；或 e2e 新增失败 ≥3 条；同卡连续 2 次验收 FAIL → 停止改代码，升一档并重写任务书（熔断）

## 预估规模
中　约 1.0 人天　≥ 2 小时
