# V13-UI-HUB-01：content-hub 原生控件清零（UI 设计与实现）

## 归属
- 切片：S3
- 缺口：**G11**
- 执行者：main-agent（**UI 设计与实现，用户点名自做的核心项**）
- 档位：高｜规模：中

## 目标
把 `src/app/manager/content-hub/page.tsx` 中 5 处原生控件替换为设计系统组件，使 REQ-F-015 §5 的自动验收条目归零，同时**不破坏既有 e2e 语义**（data-testid 与可访问名）。

## 现状取证（逐行）

| 行 | 控件 | 用途 |
|---|---|---|
| `:328` | `<button>` | 新建内容（`data-testid="hub-new"`） |
| `:388` | `<input>` | 编辑标题（`data-testid="hub-edit-title"`） |
| `:408` | `<input>` | 封面图 URL |
| `:432` | `<input type=radio>` | 审核通过（`data-testid="hub-review-approved"`） |
| `:436` | `<input type=radio>` | 审核驳回（`data-testid="hub-review-rejected"`） |

其余 `src/app/manager/**` 已 0 命中；`window.confirm`/`alert` 实测 **0 处**（唯一命中在 `__tests__/channel-states.test.tsx` 的 mock 数据字符串里，非产品代码）。

## 输出
- `src/app/manager/content-hub/page.tsx`（改用 `src/components/ui/**`）
- （若需要）`src/components/manager/**` 的复用件增强
- 证据

## Execution Steps
1. [ ] 清点 `src/components/ui/**` 现有件：Button / Input / RadioGroup / Field / Label 等，**优先复用，禁止新建重复件**
2. [ ] `:328` → 设计系统 `Button`（保留 `data-testid="hub-new"` 与可见文案"新建内容"）
3. [ ] `:388/:408` → `Input` + `Field`（保留 `data-testid`，补 `aria-label`）
4. [ ] `:432/:436` → `RadioGroup`（若组件库无 Radio，则在 `components/manager` 新增**一个**可复用 `RadioCardGroup`）
   - 保留 `data-testid="hub-review-approved" / "hub-review-rejected"`
   - **375px 下改为可点卡片语义**（增大命中区，`min-h-11`），并在证据中给出截图尺寸说明
5. [ ] 校验 `REQ-F-015 §5` 档位：`grep -rnE "<table|<input |<select|<button " src/app/manager` → **期望空输出**
6. [ ] 回归：`npx playwright test -c tests/e2e/playwright.config.ts tests/e2e/e-content-hub.spec.ts tests/e2e/hub-content.spec.ts`
7. [ ] 回归：`npm run lint && npm run typecheck && npm test && npm run build`（串行）+ 全量 e2e
8. [ ] 视觉自检：管理端为 `[data-theme="manager"]` 作用域，**不得**影响前台令牌

## 验收标准
- [ ] `grep -rnE "<table|<input |<select|<button " src/app/manager` **空输出**
- [ ] 5 个 `data-testid` 全部保留且 e2e 通过
- [ ] 375px 下审核单选项可点（命中区 ≥ 44px 高）
- [ ] 未新增重复组件（新件 ≤ 1 个，且有明确复用点）
- [ ] 前台文件 0 改动（`git diff --name-only` 不含 `(web)` / `components/web` / `globals.css` / `public`）

## 验证命令
```bash
grep -rnE "<table|<input |<select|<button " src/app/manager
npx playwright test -c tests/e2e/playwright.config.ts tests/e2e/e-content-hub.spec.ts tests/e2e/hub-content.spec.ts
npm run lint && npm run typecheck && npm test && npm run build
git diff --name-only | grep -E "\(web\)|components/web|globals.css|public" || echo "前台 0 改动 ✓"
```

## 证据路径
`docs/design/06_validation/evidence/V13/UI-HUB-01/execution.md`

## 允许修改
- `src/app/manager/content-hub/page.tsx`
- `src/components/manager/**`（仅新增/增强可复用控件）
- `docs/design/06_validation/evidence/V13/UI-HUB-01/**`

## 禁止修改
- `src/components/web/**`、`src/app/(web)/**`、`public/**`、`src/app/globals.css`
- `src/contracts/**`、`prisma/**`、`package.json`

## 依赖与阻塞
- Depends on：V13-BASE-01
- 阻塞条件：若设计系统缺 Radio 且新增会被判"重复造件" → 先上报，由用户裁定放在 `ui/**` 还是 `manager/**`

## 升级条件
连续 2 次 FAIL → 熔断，退回"只替换 3 处图文控件，radio 记 backlog"。
