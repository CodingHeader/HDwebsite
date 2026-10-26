# STEP-S3：管理端 UI 深耕（核心/高难度，主代理自做）

## 目标
把 REQ-F-015 的"统一风格、标准组件、交互可用"从声明变成逐项有结论；消灭管理端原生控件残留。

## 卡
| 卡 | 执行者 | 档位 | 顺序 |
|---|---|---|---|
| `V13-UI-HUB-01` | main-agent | 高 | 先 |
| `V13-UI-CONSIST-01` | P1 | 中 | 后（避免同文件冲突） |

## V13-UI-HUB-01 要点

### 现状（逐行取证）
| 行 | 控件 | 用途 |
|---|---|---|
| `:328` | `<button>` | 新建内容（`hub-new`） |
| `:388` | `<input>` | 编辑标题（`hub-edit-title`） |
| `:408` | `<input>` | 封面图 URL |
| `:432` | `<input type=radio>` | 审核通过（`hub-review-approved`） |
| `:436` | `<input type=radio>` | 审核驳回（`hub-review-rejected`） |

### 步骤
1. 清点 `src/components/ui/**`，**优先复用**，禁止重复造件
2. `:328` → `Button`；`:388/:408` → `Input` + `Field`（补 `aria-label`）
3. `:432/:436` → `RadioGroup`；若无则在 `components/manager` 新增**至多 1 个** `RadioCardGroup`
   - 保留 testid；375px 下命中区 `min-h-11`（≥44px）
4. 校验：`grep -rnE "<table|<input |<select|<button " src/app/manager` → **空输出**
5. 回归 `e-content-hub.spec.ts` + `hub-content.spec.ts` + 全量 e2e

### 禁止
- 触碰前台任何文件（`(web)` / `components/web` / `globals.css` / `public`）
- 改动 5 个 `data-testid`（e2e 依赖）
- 新增重复组件（≤1 个新件且须有复用点）

## V13-UI-CONSIST-01 要点
- 12 页 × 8 项矩阵（PageHeader / DataTable / 五态 / 反馈 / 键盘 / 375px / 字段错误 / 令牌作用域）
- 页面层 FAIL 就地修；组件层影响 >3 页 → 单独开卡
- 输出 `audit-matrix.md`

## 完成判据
- [ ] `grep -rnE "<table|<input |<select|<button " src/app/manager` 空输出
- [ ] 5 个 testid 保留，e2e 全绿
- [ ] 375px 审核单选项命中区 ≥44px
- [ ] 抽检 ≥10 页 × 8 项无空格，每个 FAIL 有处置
- [ ] 前台 0 改动

## 验证命令
```bash
grep -rnE "<table|<input |<select|<button " src/app/manager
npx playwright test -c tests/e2e/playwright.config.ts tests/e2e/e-content-hub.spec.ts tests/e2e/hub-content.spec.ts
npm run lint && npm run typecheck && npm test && npm run build
git diff --name-only | grep -E "\(web\)|components/web|globals.css|public" || echo "前台 0 改动 ✓"
```

## 证据落点
`evidence/V13/{UI-HUB-01,UI-CONSIST-01}/`
