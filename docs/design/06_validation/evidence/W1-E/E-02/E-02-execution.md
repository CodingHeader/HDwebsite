# E-02 执行证据：通知规则页 + 菜单（含静默时段）

- 5W1H 简版：Who=执行线 E（lane/e-manager-pages）；What=/manager/notify-rules 页面（7 类事件规则查看+编辑）+ seed 菜单登记；When=2026-10-15（北京时间）；Where=src/app/manager/notify-rules/page.tsx、prisma/seed.ts、tests/e2e/e-notify-rules.spec.ts；Why=S-E2 通知规则可配置（REQ-F-011/W0-05 quietHours）；How=DataTable+FormDialog 组合层，PATCH /api/notify-rules/[id] 保存后 reload 回读。

## 改动文件
- `src/app/manager/notify-rules/page.tsx`（新增）：五态（Forbidden/Error/骨架）+ DataTable（事件中文映射/启用 Badge/模板/收件人分组/静默时段）+ FormDialog（Switch 启用 + Select 模板（含"不指定"）+ 收件人分组（逗号分隔 tags，与 notify-recipients 约定一致）+ 静默时段两个 time input + 清除）；提交 quietHours: {start,end} 或 null。
- `prisma/seed.ts`：group-notify 下新增 notify-rules 菜单（sort 0，permission notify:list）；P-2 同批补 collect-tasks 菜单（group-ai sort 8，permission collect:list；main 无此菜单，页面已存在）。
- `tests/e2e/e-notify-rules.spec.ts`（新增）：2 用例。

## 验收逐条
| 验收项 | 结果 | 证据 |
|---|---|---|
| e2e：切换 enabled 保存后刷新回读一致 | PASS | run2：1 passed（15.2s）——启用状态翻转 + 分组 "publish, ops" 回读 |
| e2e：quietHours 保存回读一致 | **待其他员工完成**（skip） | DR-24：`[id]/route.ts` PATCH data 不含 quietHours（B-06 未合并），保存回读不变；用例已写并 skip，W2-05 复跑取消 |
| seed 连跑两次菜单不重复 | PASS | e2e 连跑 2 次（global-setup 各 seed 1 次）后 ManagerMenu：notify-rules=1、collect-tasks=1、NotifyRule=7 |
| seed 连跑两次 collect-tasks 恰 1 条 | PASS | 同上 collect-tasks=1 |
| 通用门禁 lint/typecheck/test/build 全 exit 0 | PASS | lint=0（28 warnings 全既有噪音）、typecheck=0、vitest 28 files/366 tests passed、build exit=0 |
| 越界检查（first-parent 口径，本卡 diff） | PASS | `git diff --name-only` 全落在允许路径（3 文件），越界 0 |

## 命令
```bash
npx playwright test -c tests/e2e/playwright.config.ts tests/e2e/e-notify-rules.spec.ts  # run1 fail→run2 1 passed
npm run lint && npm run typecheck && npm test && npm run build                            # 全 exit 0
```

## 首跑失败与修复（不熔断）
- run1：刷新后断言用 `getByRole("switch")`——表格启用列实为 Badge（switch 在编辑弹窗内）导致 3.0m 超时。修正为 Badge 文本翻转断言后 run2 全过。1 次失败，未触发熔断线。

## UNKNOWN 及原因
- quietHours 端到端回读：PATCH 丢弃（DR-24），待 B-06 合并后 W2-05 复跑（e2e skip 已注明）。
- 规则级静默优先于全局 notifyQuietHours 的生效逻辑：B-06 范围。

## 后续方向待办
- W2-05：B-06 合并后取消 `tests/e2e/e-notify-rules.spec.ts` 的 skip 并复跑。
- E 线下一张：按 tasks/ 顺序推进。
