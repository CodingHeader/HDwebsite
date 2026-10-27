# TASK V14-UI-HUB-01：content-hub 原生控件清零（UI 设计与实现）

## 归属
- 所属切片：S2
- 来源需求：`REQ-F-015-管理端顶级体验.md` §3.2「标准组件」、§5 自动验收第 2 条
- 来源方案：ADR-033（管理端设计系统）、V1.4 `04-垂直切片清单.md` S2

## 目标
把 `src/app/manager/content-hub/page.tsx` 中 **5 处原生控件**替换为设计系统组件，使 `REQ-F-015 §5` 的自动验收条目归零，同时不破坏既有 e2e 语义。

## 输入
- 文档：`docs/design/02_requirements/features/REQ-F-015-管理端顶级体验.md`
- 契约：⑥ UX States（`src/contracts/common.ts` 的 `uxStateSchema` / `toastCopy`）
- 前置任务：V14-BASE-01
- 前置状态：基线门禁全绿

## 输出
- 修改：`src/app/manager/content-hub/page.tsx`
- 可能新增：`src/components/manager/RadioCardGroup.tsx`（**至多 1 个**新件）
- 证据：`docs/design/06_validation/evidence/V14/UI-HUB-01/execution.md`

## 现状（逐行，实测）

| 行 | 控件 | 用途 | 必须保留的属性 |
|---|---|---|---|
| `:328` | `<button type="button">` | 新建内容 | `data-testid="hub-new"`、文案"新建内容" |
| `:388` | `<input>` | 编辑标题 | `data-testid="hub-edit-title"` |
| `:408` | `<input>` | 封面图 URL | 无 testid（补 `aria-label`） |
| `:432` | `<input type="radio">` | 审核通过 | `data-testid="hub-review-approved"` |
| `:436` | `<input type="radio">` | 审核驳回 | `data-testid="hub-review-rejected"` |

> 其余 `src/app/manager/**` 已 0 命中；`window.confirm`/`alert(` 实测 0 处（唯一命中在 `__tests__/channel-states.test.tsx` 的 mock 字符串）。

## Execution Steps
1. [ ] 清点 `src/components/ui/**` 与 `src/components/manager/**` 现有件（Button / Input / Field / RadioGroup / Badge…），**优先复用**
2. [ ] `:328` → 设计系统 `Button`（保留 `data-testid` 与可见文案）
3. [ ] `:388`、`:408` → `Input` + `Field`（保留 `data-testid`；补 `aria-label`）
4. [ ] `:432`、`:436` → 单选组
   - 若库中无 Radio：在 `src/components/manager/` 新增**一个** `RadioCardGroup`（可复用，不得为一次性内联）
   - **375px 下改为可点卡片语义**，命中区高度 ≥44px（`min-h-11`）
   - 保留两个 `data-testid`
5. [ ] 校验：`grep -rnE "<table|<input |<select|<button " src/app/manager` → **必须空输出**
6. [ ] 回归：`npx playwright test -c tests/e2e/playwright.config.ts tests/e2e/e-content-hub.spec.ts tests/e2e/hub-content.spec.ts`
7. [ ] 全量：`npm run build` 后 `npm run test:e2e`（需先 build，守卫会拦陈旧构建）
8. [ ] 四连门禁：`npm run lint && npm run typecheck && npm test && npm run build`（**串行**）

## 验收标准
- [ ] `grep -rnE "<table|<input |<select|<button " src/app/manager` **空输出**（可自动化）
- [ ] 5 个 `data-testid` 全部保留，`e-content-hub` + `hub-content` e2e 全绿（可自动化）
- [ ] 375px 下审核单选项可点，命中区 ≥44px（人工判断：截图 + 尺寸说明）
- [ ] 新增组件 ≤1 个，且有明确复用点（人工判断：说明哪些页面可复用）
- [ ] 前台 0 改动：`git diff --name-only | grep -E "\(web\)|components/web|globals.css|public"` 无输出（可自动化）
- [ ] 全量 e2e 79/79（可自动化）

## 验证命令
```bash
grep -rnE "<table|<input |<select|<button " src/app/manager
npx playwright test -c tests/e2e/playwright.config.ts tests/e2e/e-content-hub.spec.ts tests/e2e/hub-content.spec.ts
npm run lint && npm run typecheck && npm test && npm run build
npm run test:e2e
git diff --name-only | grep -E "\(web\)|components/web|globals.css|public" || echo "前台 0 改动 ✓"
```

## 证据路径
`docs/design/06_validation/evidence/V14/UI-HUB-01/execution.md`

## 允许修改
- `src/app/manager/content-hub/page.tsx`
- `src/components/manager/**`（**仅新增/增强可复用控件**）
- `docs/design/06_validation/evidence/V14/UI-HUB-01/**`

## 禁止修改
- `src/app/(web)/**`、`src/components/web/**`、`public/**`、`src/app/globals.css`（REQ-F-014 冻结）
- `src/contracts/**`、`prisma/**`、`package.json`
- 5 个 `data-testid` 的名字（e2e 依赖）
- `tests/e2e/**`（不得改测试迁就实现）

## 依赖与阻塞
- Depends on：V14-BASE-01
- Blocks：V14-UI-CONSIST-01
- 阻塞条件：若设计系统缺 Radio 且新增会被判"重复造件"→ 先上报，由用户裁定放在 `ui/**` 还是 `manager/**`

## 建议执行档位
`opus`　理由：唯一需要**设计判断**的卡（375px 单选语义、命中区、复用边界），且影响 e2e 稳定性。

## 升级条件
连续 2 次验收 FAIL → 熔断；降级方案：只替换 3 处图文控件，radio 记 backlog 并写明理由。

## 预估规模
中～大　（4~6 小时；含 e2e 回归等待）
