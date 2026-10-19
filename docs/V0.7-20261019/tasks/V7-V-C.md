# V7-V-C：W1-C 线独立验收补登（C-01~C-12）

> V0.7 新卡　执行者：P1　分支：`upgrade`（单主线）　HEAD 基线 4cbd9c1

## 归属
- 所属切片：S2
- 来源需求：§9.3 防自证；AGENTS.md §6
- 来源方案：docs/V0.7-20261019/06-剩余可执行大纲体系.md

## 目标
对 C-01~C-12 逐卡只看 diff + 运行结果给出 PASS/FAIL/UNKNOWN，写 <卡号>-verify.md

## 输入
- 证据：34 张 W1 卡中仅 A-07、C-09 有独立验证记录（evidence/W1-*/ 下 grep '独立验证'）
- 各卡验收标准：docs/V0.6-20261016/tasks/<卡号>.md
- 契约：无变更（只读引用 src/contracts/**）
- 前置任务：V7-T-01
- 假设：无

## 输出（新增/修改）
- docs/design/06_validation/evidence/W1-*/<卡号>/<卡号>-verify.md

## Execution Steps
1. [ ] git log --grep '<卡号>' 定位提交，git show --stat 核对允许路径
2. [ ] 逐条执行原卡验收命令（e2e/visual 需 Linux+浏览器，否则 UNKNOWN 并写原因）
3. [ ] 只输出 PASS/FAIL/UNKNOWN + 一行理由；FAIL 开返工卡 V7-RW-<卡号>，不自己修
4. [ ] 提交 `feat|fix|docs(V7-V-C): <摘要>`，只含允许路径；写证据

## 验收标准
- [ ] 每张卡都有 verify.md
- [ ] 验证者不是该卡原执行者（commit author/提示词归属核对）
- [ ] 不改任何 src/**
- [ ] 本卡提交触及文件 ⊆ 允许修改（`git diff --name-only <起点>..HEAD`）

## 验证命令
```bash
npx vitest run
npm run test:e2e  # Linux
```

## 证据路径
`docs/design/06_validation/evidence/V7/V7-V-C/`

## 允许修改
- docs/design/06_validation/evidence/W1-C/*/*-verify.md

## 禁止修改
- src/**
- tests/**
- prisma/**

## 依赖与阻塞
- Depends on：V7-T-01
- Blocks：W2-06, W2-07
- 阻塞条件：需要改冻结面（contracts/schema/依赖/测试配置）→ 停止并提交 CCR

## 建议执行档位
sonnect　理由：按清单判定

## 升级条件
同一卡 2 次 UNKNOWN 因环境 → 交 V7-OPS-CI 环境后重跑；同一卡连续 2 次验收失败 → 熔断，禁止第 3 次硬撞

## 预估规模
中
