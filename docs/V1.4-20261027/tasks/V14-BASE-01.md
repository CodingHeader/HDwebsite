# TASK V14-BASE-01：基线固化与一致性复核

## 归属
- 所属切片：S0
- 来源需求：AGENTS.md §6 完成定义
- 来源方案：V1.4 `00-规划快照与事实基线.md`

## 目标
在 `upgrade@3e6a6b5` 上固化一份可复现基线（七道门禁 + BUILD_ID 时间戳 + 用例计数 + 双端 0 0），供后续每卡比对。

## 输入
- 文档：`docs/V1.4-20261027/00-规划快照与事实基线.md`
- 契约：无（只读卡）
- 前置任务：无
- 前置状态：双端 `0 0`

## 输出
- `docs/design/06_validation/evidence/V14/BASE-01/execution.md`

## Execution Steps
1. [ ] `git fetch origin upgrade && git pull --ff-only`；记 `git rev-parse --short HEAD` 与 `git rev-list --left-right --count origin/upgrade...HEAD`（必须 `0 0`）
2. [ ] **串行**跑：`npm run lint` → `npm run typecheck` → `npm test` → `npm run build` → `npm run check:assets` → `npm run check:root` → `npm run check:audit`
   - ⚠️ 禁止把 `build` 与 `test` 并行（V13 实测会产生 `Hook timed out` 假红）
3. [ ] 记录 `stat .next/BUILD_ID` mtime 与 `src` 最新 mtime，写进证据（新鲜度凭证）
4. [ ] `npm run test:e2e`（期望 79），记 passed/failed
5. [ ] `npx playwright test -c tests/a11y/playwright.config.ts`（期望 12），记计数
6. [ ] visual 只记录最近一次 CI run 结论（本机不跑，Windows 不可判）
7. [ ] 核对 V1.3 台账中的数字，与本轮实测不一致处**逐条列出**（已知至少 1 处：迁移目录数）

## 验收标准
- [ ] 七道门禁逐条有 PASS/FAIL + 命令原文
- [ ] 证据含 `BUILD_ID` mtime 与 `src` 最新 mtime 两个 ISO 时间戳
- [ ] e2e / a11y / visual-CI 三项计数入档
- [ ] 双端 `0 0` 快照入档
- [ ] 与 V1.3 台账的不一致项已逐条列出（无则写"无"）

## 验证命令
```bash
git rev-list --left-right --count origin/upgrade...HEAD
npm run lint && npm run typecheck && npm test && npm run build
npm run check:assets && npm run check:root && npm run check:audit
npm run test:e2e
npx playwright test -c tests/a11y/playwright.config.ts
python -c "import os,time;print('BUILD_ID',time.ctime(os.path.getmtime('.next/BUILD_ID')))"
```

## 证据路径
`docs/design/06_validation/evidence/V14/BASE-01/execution.md`

## 允许修改
- `docs/design/06_validation/evidence/V14/BASE-01/**`

## 禁止修改
- `src/**`、`prisma/**`、`package.json`、任何配置、任何测试

## 依赖与阻塞
- Depends on：无
- Blocks：V14-UI-HUB-01、V14-A11Y-01、V14-PERF-01、V14-VIS-STAB-01
- 阻塞条件：无（只读卡）

## 建议执行档位
`haiku`　理由：只跑命令 + 记数值，无决策。

## 升级条件
若出现非预期失败（如 e2e 非 79）→ 立即升 `opus`，先判"真失败 vs 陈旧构建"（比对 BUILD_ID 与 src mtime）。

## 预估规模
小　（< 1 小时，主要是 e2e 等待）
