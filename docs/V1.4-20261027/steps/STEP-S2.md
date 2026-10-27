# STEP-S2：content-hub 原生控件清零（UI 设计与实现 · 关键路径起点）

## 目标
把 `src/app/manager/content-hub/page.tsx` 的 5 处原生控件替换为设计系统组件，使 `REQ-F-015 §5` 自动验收条目归零。

## 卡
- `V14-UI-HUB-01`（**main-agent 自做**，`opus`，中～大）

## 为什么是关键路径
它既是唯一需要**设计判断**的卡（高不确定性，先做以尽早暴露风险），又阻塞 `V14-UI-CONSIST-01`，而后者结论被 `V14-REQ-LEDGER-01` 引用。

## 现状（逐行实测）

| 行 | 控件 | 用途 | 必须保留 |
|---|---|---|---|
| `:328` | `<button>` | 新建内容 | `data-testid="hub-new"`、文案"新建内容" |
| `:388` | `<input>` | 编辑标题 | `data-testid="hub-edit-title"` |
| `:408` | `<input>` | 封面图 URL | 补 `aria-label` |
| `:432` | `<input type=radio>` | 审核通过 | `data-testid="hub-review-approved"` |
| `:436` | `<input type=radio>` | 审核驳回 | `data-testid="hub-review-rejected"` |

## 执行步骤
1. 清点 `src/components/ui/**` 与 `src/components/manager/**`，**优先复用**
2. `:328` → `Button`（保留 testid 与文案）
3. `:388`、`:408` → `Input` + `Field`（保留 testid，补 `aria-label`）
4. `:432`、`:436` → 单选组
   - 若无 Radio 组件：在 `src/components/manager/` 新增**至多 1 个** `RadioCardGroup`（可复用）
   - **375px 下改可点卡片语义**，命中区高度 ≥44px（`min-h-11`）
   - 保留两个 testid
5. 校验 `grep -rnE "<table|<input |<select|<button " src/app/manager` → **必须空输出**
6. 回归 `e-content-hub.spec.ts` + `hub-content.spec.ts`
7. `npm run build` 后全量 `npm run test:e2e`（期望 79/79）
8. 四连门禁（串行）

## 完成判据
- [ ] `grep` 空输出
- [ ] 5 个 `data-testid` 保留，两个 e2e spec 全绿
- [ ] 375px 审核项可点，命中区 ≥44px
- [ ] 新增组件 ≤1 个且有复用点说明
- [ ] 前台 0 改动
- [ ] 全量 e2e 79/79

## 关键约束
- **不得改 e2e 测试迁就实现**（改测试 = 掩盖缺陷）
- 不得触碰前台任何文件（REQ-F-014）

## 验证命令
```bash
grep -rnE "<table|<input |<select|<button " src/app/manager
npx playwright test -c tests/e2e/playwright.config.ts tests/e2e/e-content-hub.spec.ts tests/e2e/hub-content.spec.ts
npm run lint && npm run typecheck && npm test && npm run build
npm run test:e2e
git diff --name-only | grep -E "\(web\)|components/web|globals.css|public" || echo "前台 0 改动 ✓"
```

## 证据落点
`docs/design/06_validation/evidence/V14/UI-HUB-01/execution.md`
