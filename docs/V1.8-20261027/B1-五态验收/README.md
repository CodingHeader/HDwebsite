# B1 · 五态验收

## 归属
- 阶段编号：B1
- 所属分组：B 验收闭环（承接 V1.5/V1.6 `V15-UX-STATES-01`）
- 来源凭据：`docs/V1.5-20261027/tasks/V15-UX-STATES-01.md`、`docs/V1.6-20261027/03-执行单元分解.md L1-1`

## 目标
42 页 × 5 态 = **210 格**，每格判 `PASS` / `FAIL(现象)` / `N-A(依据)`，附「做了什么 + 看到什么」，无「待核」。

## 为什么需要它（三级凭据）

### ① 代码位置
```ts
// 五态组件齐备（8 个）
src/components/manager/feedback/{EmptyState,ErrorState,PageSkeleton,TableSkeleton,TableState,Forbidden,Toaster}.tsx + toast.ts
// CrudPage 内部提供五态
src/components/manager/CrudPage.tsx:333  if (isForbidden(error)) return <Forbidden message={error.message} />;
```

### ② 实测证据
```bash
# 42 页，其中 27 页走 CrudPage
$ find src/app/manager -name page.tsx | wc -l
42
$ for f in $(find src/app/manager -name page.tsx); do grep -q CrudPage "$f" && echo x; done | wc -l
27

# 但审计矩阵 42 行的五态列全是"待核"
$ grep "^| src/app/manager" docs/design/06_validation/evidence/V14/UI-CONSIST-01/audit-matrix.md | grep -c "待核"
42
```

### ③ 规划落点
- REQ-LEDGER 的 2 条 UNKNOWN（"独立验证者逐页人工核对未执行"）由本卡关闭
- 产出 `evidence/V18/B1/matrix.md`

## 输入
- 前置阶段：**A2**（审计矩阵需可信 —— PageHeader/令牌已由 V1.5 修正）
- 前置状态：`audit-matrix.md` 的 PageHeader 缺失 = 0

## 输出
- 新增：`evidence/V18/B1/matrix.md`（42 行 × 5 态 + 判据列）
- 新增：`evidence/V18/B1/defects.md`（FAIL 清单）
- 新增：`evidence/V18/B1/execution.md`

## 核心判据（严格，不得放宽）

| 态 | 触达动作 | PASS 最小证据 | FAIL 判定 |
|---|---|---|---|
| 空 | 搜索框输 `zzz-no-match-zzz` | 空态文案 + **下一步动作**（如"新建"按钮） | 白屏 / 无动作 |
| 加载 | DevTools Slow 3G 刷新 | 骨架屏可见 | 白屏或闪烁 |
| 错误 | 拦截 `/api/<resource>` 返回 500 | 错误说明 + **重试按钮** | 无提示 / 页面崩 |
| 无权限 | `e2e-viewer` 登录点写操作 | `Forbidden` 组件 | 静默失败 / 500 |
| 成功 | 完成一次写操作 | **具体** toast 文案 | "操作成功"泛词 / 无提示 |

### N-A 的合法条件（预置，避免纠结）

| 页面 | N-A 范围 | 依据 |
|---|---|---|
| `news` | **5 态全 N-A** | 文件仅 2 个 import + `redirect("/manager/articles")`，无 UI |
| `login` | 空态/加载态 N-A | 登录页非列表范式 |
| `logs` / `notify-records` / `publish-jobs` / `chat-history` / `collect-items` | 成功态 N-A | 纯只读页，无写操作 |
| `manager`（仪表盘） | 成功态 N-A | 只读统计 |

## 执行步骤（分 5 批，降低认知负担）

| 步骤 | 批次 | 页数 | 说明 |
|---|---|---|---|
| STEP-B1-1 | A 类·标准列表页 | ~18 | 走 CrudPage，共用判据 |
| STEP-B1-2 | A 类·只读页 | ~5 | 成功态 N-A |
| STEP-B1-3 | A 类·配置页 | ~4 | 错误态拦保存接口 |
| STEP-B1-4 | B 类·15 页逐页 | 15 | 自定义实现，各有分支 |
| STEP-B1-Z | 体检 | — | 42 行无空 |

## 分批的机械依据

**① 为什么分 A/B 类**
```bash
# A 类共用 CrudPage 渲染器 → 五态行为一致 → 判据可复用
# B 类自定义 → 各有分支 → 逐页判
27 A / 15 B（实测）
```

**② 为什么 A 类还要分 3 批**
- 标准列表页有完整 CRUD（5 态全可触达）
- 只读页无写操作（成功态 N-A）
- 配置页错误态要拦保存而非列表接口（触达方式不同）

## 验收标准
- [ ] `matrix.md` 42 行 × 5 态，**无空单元格、无"待核"**（可自动化 grep）
- [ ] 每格判据 ≥10 字符且含具体动作（可自动化长度 + 抽样人工）
- [ ] `news` 5 态全 N-A 且有依据（可自动化）
- [ ] 只读页成功态 N-A 有依据（可自动化）
- [ ] `defects.md` 每个 FAIL 含现象 + 复现步骤（人工）
- [ ] 计数自洽：PASS + FAIL + N-A = **210**（可自动化）
- [ ] 未改 `src/**`（可自动化）

## 验证命令
```bash
cd /e/Code/Demo/HDwebsite/hdwebsite_1011
grep -c "^| src/app/manager" evidence/V18/B1/matrix.md    # 期望 42
grep -c "待核" evidence/V18/B1/matrix.md                  # 期望 0
git status --short src                                    # 期望空
```

## 证据路径
`evidence/V18/B1/`

## 允许修改
- `evidence/V18/B1/**`
- `.cache/**`（临时截图）

## 禁止修改
- `src/**`、`tests/**`、`prisma/**`
- `evidence/V14/**`（V1.4 的审计矩阵只读）
- 不得为"通过"降判据

## 依赖与阻塞
- Depends on：A2
- Blocks：E1
- 阻塞条件：环境起不来且 40 分钟未解决 → 标 `blocked`，**不得用静态 grep 冒充运行时验证**

## 建议执行档位
`opus`　理由：210 格验收判断，判错会放行真缺陷。

## 升级条件
若 A 类 27 页出现系统性缺陷（如全部缺错误态重试）→ 升级上报，评估是否开修复阶段

## 预估规模
大（6~8h）

## 自我质疑

**质疑：210 格人工判定，会不会为了快点完而"凑 PASS"？**
→ 这是本卡最大风险。三道防守：
1. 每格必须写「做了什么 + 看到什么」，≥10 字符
2. 无判据的 PASS 一律视为 FAIL
3. 抽样 10 格由他人复核（A8 提到的独立验证原则）

**质疑：新环境空库下"空态永远成立"，会误判吗？**
→ 会。**必须先 seed**（`prisma/seed.ts` + `seed-visual.ts`）。V1.4 实测：空库首页高度 3389 vs 6204，数据缺失会让判定失真。

**质疑：`e2e-viewer` 账号撞了登录限流怎么办？**
→ `LOGIN_RATE_LIMIT = 10 / 60s`（`api/auth/login/route.ts:16`）。**全程只登录一次，token 复用**。
