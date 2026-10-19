# V7-SEC-01：角色写入越权收口（roles POST/PUT）

> V0.7 新卡　执行者：Hark　分支：`upgrade`（单主线）　HEAD 基线 4cbd9c1

## 归属
- 所属切片：S0
- 来源需求：REQ-NF 安全；V0.4/V0.6 遗留 E1/E2
- 来源方案：docs/V0.7-20261019/06-剩余可执行大纲体系.md

## 目标
非超管调用 POST/PUT /api/roles 时：不能设置 isSuper=true、不能授予自身没有的权限、不能修改自己所属角色；违规一律 403 FORBIDDEN

## 输入
- 证据：src/app/api/roles/[id]/route.ts:38-49（PUT 未校验 isSuper 与 permissions 子集）；roles/route.ts:49（POST 只校验 isSuper）
- 契约：src/contracts/auth.ts permissionCatalog；src/contracts/common.ts 错误码 FORBIDDEN=403
- 契约：无变更（只读引用 src/contracts/**）
- 前置任务：无
- 假设：无

## 输出（新增/修改）
- src/app/api/roles/route.ts
- src/app/api/roles/[id]/route.ts
- src/lib/authz/escalation.ts（新增纯函数 canGrant / assertNoEscalation）
- src/lib/__tests__/security/roles-escalation.test.ts

## Execution Steps
1. [ ] 先写失败用例：非超管 PUT 自身角色 isSuper=true / 授予 user:delete（自身无）/ POST 新角色带越权权限 → 期望 403
2. [ ] 实现 escalation.ts：permissions ⊆ caller.permissions（超管跳过）；isSuper 变更仅超管；目标角色 = 调用者当前角色 → 403
3. [ ] 两个路由在写库前调用；错误体沿用 common.ts 信封
4. [ ] 跑用例转绿 + 通用门禁；写证据
5. [ ] 提交 `feat|fix|docs(V7-SEC-01): <摘要>`，只含允许路径；写证据

## 验收标准
- [ ] roles-escalation.test.ts ≥6 用例全绿（含超管正常路径不回归）
- [ ] grep 确认 roles/[id]/route.ts 的 update 前存在 assertNoEscalation 调用
- [ ] 通用门禁 exit 0
- [ ] 本卡提交触及文件 ⊆ 允许修改（`git diff --name-only <起点>..HEAD`）

## 验证命令
```bash
npm run lint && npm run typecheck && npm test && npm run build
npx vitest run src/lib/__tests__/security
```

## 证据路径
`docs/design/06_validation/evidence/V7/V7-SEC-01/`

## 允许修改
- src/app/api/roles/**
- src/lib/authz/**
- src/lib/__tests__/security/roles-*

## 禁止修改
- src/app/(web)/**、src/components/web/**、public/**（前台风格冻结，REQ-F-014）
- prisma/schema.prisma、prisma/migrations/**（V0.7 不开新迁移，见 04 号文档）
- .env*、prisma/*.db、任何凭据文件
- src/contracts/**

## 依赖与阻塞
- Depends on：无
- Blocks：V7-SEC-02
- 阻塞条件：需要改冻结面（contracts/schema/依赖/测试配置）→ 停止并提交 CCR

## 建议执行档位
opus　理由：安全边界语义，不可逆影响权限模型

## 升级条件
连续 2 次独立验收 FAIL → fable 复核权限模型；同一卡连续 2 次验收失败 → 熔断，禁止第 3 次硬撞

## 预估规模
中（约半天）
