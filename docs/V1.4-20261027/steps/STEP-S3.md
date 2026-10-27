# STEP-S3：设计系统一致性抽检

## 目标
12 个管理页 × 8 项 = 96 格逐项判定，FAIL 就地修或开卡。

## 卡
- `V14-UI-CONSIST-01`（P1，`sonnect`，中）
- **必须串行在 `V14-UI-HUB-01` 之后**（同碰 `src/components/manager/**`）

## 8 个抽检项
| # | 项 | 判定依据 |
|---|---|---|
| 1 | PageHeader | 标题/描述/主操作三要素 |
| 2 | DataTable | 排序/筛选/分页/批量（只读页允许无批量） |
| 3 | 五态覆盖 | 空/加载/错误/无权限/成功 |
| 4 | 反馈 | toast/ConfirmDialog，无原生 alert/confirm |
| 5 | 键盘可达 | 焦点陷阱/Esc/⌘+S |
| 6 | 375px 可用 | 核心操作可完成 |
| 7 | 字段级错误 | `aria-invalid` + 文案 |
| 8 | 令牌作用域 | 只用 `mgr-*`，无全局污染 |

## 12 个抽检页面
`/manager`、`articles`、`categories`、`media`、`content-hub`、`knowledge-bases`、`llm-providers`、`home-blocks`、`notify-rules`、`settings`、`logs`、`users`

## 执行步骤
1. 建 `audit-matrix.md`：12 行 × 8 列 + 结论列
2. 逐页逐项填 `PASS` / `FAIL(现象)` / `N-A(依据)`
3. FAIL 分类：页面层（就地修）/ 组件层（影响 ≤3 页就地修，>3 页开卡）
4. 每处修复后跑相关 e2e
5. 四连门禁（串行）+ 全量 e2e
6. 证据写矩阵 + 修复摘要 + 开卡清单

## 完成判据
- [ ] 96 格无空格
- [ ] 每个 FAIL 有处置（已修/开卡/backlog + 理由）
- [ ] `grep -rn "window.confirm\|[^.]alert(" src/app/manager src/components/manager` → 0
- [ ] 前台 0 改动
- [ ] 四连门禁绿 + e2e 79/79

## 验证命令
```bash
grep -rn "window.confirm\|[^.]alert(" src/app/manager src/components/manager | wc -l
npm run lint && npm run typecheck && npm test && npm run build
npm run test:e2e
```

## 证据落点
`evidence/V14/UI-CONSIST-01/{audit-matrix.md,execution.md}`
