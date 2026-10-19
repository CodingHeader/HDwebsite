# V7-SEC-03：越权回归黑盒套件（独立编写，防自证）

> V0.7 新卡　执行者：P2　分支：`upgrade`（单主线）　HEAD 基线 4cbd9c1

## 归属
- 所属切片：S0
- 来源需求：§9.3 防自证；E1~E5
- 来源方案：docs/V0.7-20261019/06-剩余可执行大纲体系.md

## 目标
由非 SEC-01/02 执行者按本卡 5 条攻击路径独立写 HTTP 级用例，对 SEC 修复后的代码全部返回 403/400

## 输入
- 本卡攻击路径清单 E1~E5（见 01-事实基线 §3）
- tests/contract 现有 harness
- 契约：无变更（只读引用 src/contracts/**）
- 前置任务：V7-SEC-02
- 假设：无

## 输出（新增/修改）
- src/lib/__tests__/security/escalation-blackbox.test.ts

## Execution Steps
1. [ ] 只读 diff 与契约，不读 SEC 实现细节
2. [ ] 每条路径一个用例 + 1 个超管正向用例
3. [ ] 运行并输出 PASS/FAIL
4. [ ] 提交 `feat|fix|docs(V7-SEC-03): <摘要>`，只含允许路径；写证据

## 验收标准
- [ ] 5 条攻击用例全部被拒；正向用例通过
- [ ] 不修改任何 src/app/** 文件
- [ ] 本卡提交触及文件 ⊆ 允许修改（`git diff --name-only <起点>..HEAD`）

## 验证命令
```bash
npx vitest run src/lib/__tests__/security/escalation-blackbox.test.ts
```

## 证据路径
`docs/design/06_validation/evidence/V7/V7-SEC-03/`

## 允许修改
- src/lib/__tests__/security/escalation-blackbox*

## 禁止修改
- src/app/(web)/**、src/components/web/**、public/**（前台风格冻结，REQ-F-014）
- prisma/schema.prisma、prisma/migrations/**（V0.7 不开新迁移，见 04 号文档）
- .env*、prisma/*.db、任何凭据文件
- src/app/**
- src/lib/authz/**

## 依赖与阻塞
- Depends on：V7-SEC-02
- Blocks：W2-05, W2-08
- 阻塞条件：需要改冻结面（contracts/schema/依赖/测试配置）→ 停止并提交 CCR

## 建议执行档位
sonnect　理由：按清单写用例，无决策

## 升级条件
发现第 6 条路径 → 停，上报 Hark；同一卡连续 2 次验收失败 → 熔断，禁止第 3 次硬撞

## 预估规模
小（<半天）
