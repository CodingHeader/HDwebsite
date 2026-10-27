# TASK V14-UI-CONSIST-01：设计系统一致性抽检（12 页 × 8 项）

## 归属
- 所属切片：S3
- 来源需求：`REQ-F-015` §5（验收标准）、§6（方向归属）
- 来源方案：ADR-033（管理端设计系统）、V1.4 `04-垂直切片清单.md` S3

## 目标
把"管理端统一风格"从**声明**变成**逐页逐项有结论**：12 页 × 8 项矩阵，每格有 PASS/FAIL/N-A 与依据，FAIL 项就地修或开卡。

## 输入
- 文档：`REQ-F-015-管理端顶级体验.md`、`ADR-033-管理端设计系统.md`
- 契约：⑥ UX States（`uxStateSchema` / `toastCopy`）
- 前置任务：**V14-UI-HUB-01**（同碰 `src/components/manager/**`，必须串行）
- 前置状态：UI-HUB-01 已推送

## 输出
- 新增：`docs/design/06_validation/evidence/V14/UI-CONSIST-01/audit-matrix.md`
- 可能改动：`src/app/manager/**`（页面层就地修）、`src/components/manager/**`（影响 ≤3 页的组件层）
- 证据：`execution.md`

## 抽检的 8 项（每页逐项判定）

| # | 项 | 判定依据 |
|---|---|---|
| 1 | PageHeader 使用 | 有标题/描述/主操作位三要素 |
| 2 | DataTable 使用 | 排序/筛选/分页/批量（只读页允许无批量） |
| 3 | 五态覆盖 | 空/加载/错误/无权限/成功 均可渲染（或 N-A 有据） |
| 4 | 反馈 | 用 toast/ConfirmDialog，无原生 `alert/confirm` |
| 5 | 键盘可达 | 焦点陷阱、Esc 关闭、⌘/Ctrl+S 提交 |
| 6 | 375px 可用 | 核心操作可完成 |
| 7 | 字段级错误 | `aria-invalid` + 文案 |
| 8 | 令牌作用域 | 只用 `mgr-*` 令牌，无全局污染 |

## 抽检页面（12 个，实测存在的 page.tsx）
`/manager`、`articles`、`categories`、`media`、`content-hub`、`knowledge-bases`、`llm-providers`、`home-blocks`、`notify-rules`、`settings`、`logs`、`users`

## Execution Steps
1. [ ] 建 `audit-matrix.md` 表头：12 行（页）× 8 列（项）+ 结论列
2. [ ] 逐页逐项核对，填 `PASS` / `FAIL(具体现象)` / `N-A(依据)`
3. [ ] FAIL 分类：
   - **页面层**（可直接改 `src/app/manager/**`）→ 就地修
   - **组件层**（需改共享件）→ 评估影响页数；**≤3 页**就地修，**>3 页**单独开卡（不本卡强改）
4. [ ] 每处修复后跑相关 e2e 确认无回归
5. [ ] 四连门禁（**串行**）：`npm run lint && npm run typecheck && npm test && npm run build`
6. [ ] 全量 e2e 确认 79/79
7. [ ] 证据写矩阵 + 修复 diff 摘要 + 开卡清单

## 验收标准
- [ ] 矩阵 **12 页 × 8 项 = 96 格**，无空格（可自动化：统计表格行数）
- [ ] 每个 FAIL 有处置三选一：已修 / 已开卡（给卡号）/ 记 backlog（给理由）（人工判断）
- [ ] `grep -rn "window.confirm\|[^.]alert(" src/app/manager src/components/manager` → **0 命中**（可自动化）
- [ ] 前台文件 0 改动（可自动化）
- [ ] 四连门禁绿 + e2e 79/79（可自动化）

## 验证命令
```bash
grep -rn "window.confirm\|[^.]alert(" src/app/manager src/components/manager | wc -l
npm run lint && npm run typecheck && npm test && npm run build
npm run test:e2e
git diff --name-only | grep -E "\(web\)|components/web|globals.css|public" || echo "前台 0 改动 ✓"
```

## 证据路径
`docs/design/06_validation/evidence/V14/UI-CONSIST-01/{audit-matrix.md,execution.md}`

## 允许修改
- `src/app/manager/**`（**content-hub 除外**，那是 UI-HUB-01 的所有权）
- `src/components/manager/**`（仅影响 ≤3 页的组件层修复）
- `docs/design/06_validation/evidence/V14/UI-CONSIST-01/**`

## 禁止修改
- `src/components/ui/**` 的公开 API（如需改 → 单独开卡）
- `src/app/(web)/**`、`src/components/web/**`、`public/**`、`globals.css`
- `src/contracts/**`、`prisma/**`、`package.json`

## 依赖与阻塞
- Depends on：V14-UI-HUB-01
- Blocks：V14-REQ-LEDGER-01（其需引用本卡证据）
- 阻塞条件：若发现组件层 FAIL 影响 >3 页 → 不本卡改，开新卡并记入证据

## 建议执行档位
`sonnect`　理由：8 项判定标准已明确，属按清单核对 + 局部修复。

## 升级条件
连续 2 次 FAIL → 熔断，只交矩阵不做修复（矩阵本身即有验收价值）。

## 预估规模
中　（4~6 小时）
