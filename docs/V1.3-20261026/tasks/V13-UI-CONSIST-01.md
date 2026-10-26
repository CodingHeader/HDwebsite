# V13-UI-CONSIST-01：设计系统一致性抽检（≥10 页）

## 归属
- 切片：S3
- 缺口：G11、REQ-F-015 §5/§6
- 执行者：P1
- 档位：中｜规模：中

## 目标
按 REQ-F-015 逐项核对 ≥10 个管理页的一致性，把"看起来统一"变成"逐项有结论"，并对就地的组件层不一致做最小修复。

## 输入
- `REQ-F-015-管理端顶级体验.md` §5（验收标准）、§6（方向归属）
- `ADR-033-管理端设计系统.md`
- `src/components/ui/**`、`src/components/manager/**`

## 输出
- `docs/design/06_validation/evidence/V13/UI-CONSIST-01/audit-matrix.md`（页 × 项 × 结论）
- 就地修复的组件层改动（如有）

## 抽检项（每页 8 项）
1. PageHeader 使用（标题/描述/主操作位）
2. DataTable 使用（排序/筛选/分页/批量）
3. 五态覆盖（空/加载/错误/无权限/成功）
4. 反馈（toast / ConfirmDialog，无原生 alert/confirm）
5. 键盘可达（焦点陷阱、Esc、⌘/Ctrl+S）
6. 375px 可用（核心操作可完成）
7. 字段级错误提示（aria-invalid + 文案）
8. 令牌作用域（`[data-theme="manager"]`，无全局污染）

## 抽检页面（≥10）
`/manager`、`articles`、`categories`、`media`、`content-hub`、`knowledge-bases`、`llm-providers`、`home-blocks`、`notify-rules`、`settings`、`logs`、`users`

## Execution Steps
1. [ ] 建立 `audit-matrix.md` 表头（页 × 8 项）
2. [ ] 逐页逐项核对，结论写 `PASS` / `FAIL(原因)` / `N-A(依据)`
3. [ ] FAIL 项分类：页面层（可直接改）/ 组件层（改共享件，需评估影响面）
4. [ ] 页面层 FAIL：就地修（只改 `src/app/manager/**`）
5. [ ] 组件层 FAIL：先评估影响页数，>3 页则单独开卡，不本卡强改
6. [ ] 回归：`npm run lint && npm run typecheck && npm test && npm run build` + 相关 e2e
7. [ ] 证据：矩阵表 + 修复 diff 摘要

## 验收标准
- [ ] 抽检 ≥10 页，8 项 × 页 全覆盖，无空格
- [ ] 每个 FAIL 有原因与处置（修/开卡/记 backlog）
- [ ] 未触碰前台任何文件
- [ ] 四连门禁绿

## 验证命令
```bash
grep -rn "window.confirm\|[^.]alert(" src/app/manager src/components/manager
npm run lint && npm run typecheck && npm test && npm run build
```

## 证据路径
`docs/design/06_validation/evidence/V13/UI-CONSIST-01/`

## 允许修改
- `src/app/manager/**`（页面层）
- `src/components/manager/**`（影响面 ≤3 页的组件层）
- 证据目录

## 禁止修改
- 前台任何文件；`src/components/ui/**` 的公开 API（如需改 → 单独开卡）

## 依赖与阻塞
- Depends on：V13-UI-HUB-01（避免同文件冲突）
- 阻塞条件：无

## 升级条件
连续 2 次 FAIL → 熔断，只交矩阵不做修复。
