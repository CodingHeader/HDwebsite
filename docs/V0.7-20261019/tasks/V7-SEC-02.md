# V7-SEC-02：用户写入越权收口（users POST/PUT/DELETE）

> V0.7 新卡　执行者：Hark　分支：`upgrade`（单主线）　HEAD 基线 4cbd9c1

## 归属
- 所属切片：S0
- 来源需求：REQ-NF 安全；E3/E4/E5
- 来源方案：docs/V0.7-20261019/06-剩余可执行大纲体系.md

## 目标
非超管不能：把用户（含自己）分配到超管角色或权限超出自己的角色；修改/重置超管账号；修改自己的 roleId；最后一名超管不能被改离超管角色

## 输入
- 证据：src/app/api/users/route.ts:44-62（POST 直接写 roleId）；users/[id]/route.ts:36-50（PUT 只保护'停用最后超管'，roleId 与密码重置无校验）
- 契约：无变更（只读引用 src/contracts/**）
- 前置任务：V7-SEC-01
- 假设：无

## 输出（新增/修改）
- src/app/api/users/route.ts
- src/app/api/users/[id]/route.ts
- src/lib/__tests__/security/users-escalation.test.ts

## Execution Steps
1. [ ] 先写失败用例（≥8）：非超管 POST roleId=超管角色；PUT 自己 roleId；PUT 超管密码；PUT 最后超管 roleId→普通
2. [ ] 复用 V7-SEC-01 的 escalation.ts（只读引用，不改其签名）
3. [ ] 实现并转绿；门禁；证据
4. [ ] 提交 `feat|fix|docs(V7-SEC-02): <摘要>`，只含允许路径；写证据

## 验收标准
- [ ] users-escalation.test.ts ≥8 用例全绿
- [ ] 超管正常建用户/改角色路径不回归（auth-permission.test.ts 全绿）
- [ ] 通用门禁 exit 0
- [ ] 本卡提交触及文件 ⊆ 允许修改（`git diff --name-only <起点>..HEAD`）

## 验证命令
```bash
npm run lint && npm run typecheck && npm test && npm run build
npx vitest run src/lib/__tests__/security
```

## 证据路径
`docs/design/06_validation/evidence/V7/V7-SEC-02/`

## 允许修改
- src/app/api/users/**
- src/lib/__tests__/security/users-*

## 禁止修改
- src/app/(web)/**、src/components/web/**、public/**（前台风格冻结，REQ-F-014）
- prisma/schema.prisma、prisma/migrations/**（V0.7 不开新迁移，见 04 号文档）
- .env*、prisma/*.db、任何凭据文件
- src/lib/authz/**（SEC-01 所有）
- src/contracts/**

## 依赖与阻塞
- Depends on：V7-SEC-01
- Blocks：V7-SEC-03, V7-UI-02, B-02
- 阻塞条件：需要改冻结面（contracts/schema/依赖/测试配置）→ 停止并提交 CCR

## 建议执行档位
opus　理由：账号接管级风险

## 升级条件
同上；同一卡连续 2 次验收失败 → 熔断，禁止第 3 次硬撞

## 预估规模
中
