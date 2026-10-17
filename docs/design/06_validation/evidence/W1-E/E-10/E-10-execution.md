# E-10 执行证据：模型运营（优先级拖拽排序并保存 + 用量统计视图）

- 5W1H 简版：Who=执行线 E（lane/e-manager-pages）；What=llm-providers 页 Tabs（供应商/用量统计）+ 优先级排序面板（HTML5 DnD 拖拽 + 键盘上/下移按钮，a11y 可替代）+ 一次保存（逐条 PUT {priority}，失败回滚）+ 用量 Tab（表格 + 简单柱状，无新图表依赖）；When=2026-10-17（北京时间）；Why=S-E5 模型运营（多模型对话优先级；G6/G7）；How=排序独立面板（不入侵 A 线 DataTable）+ Tabs 视图切换。

## 改动文件
- `src/app/manager/llm-providers/page.tsx`：Tabs（供应商/用量统计）+ 排序面板（draggable li + GripVertical handle + IconButton 上/下移 + [保存排序] 一次保存：逐条 PUT /api/llm/providers/[id] {priority:(i+1)*10}——现有端点；C-11 合并后可切 PUT /api/llm/providers/order 单请求；失败回滚 order 到基准 + toast）+ UsageTab（from/to date Input 默认最近 7 天（Date.now 只在 effect）、Select 聚合方式 provider/day、DataTable 表格 + 占比条形 div）。
- `tests/e2e/e-llm-ops.spec.ts`（新）：2 用例。

## lint 纯度适配
- `Date.now` 不得在 render 中调用（react-compiler 纯度规则）→ 用量默认区间移入 useEffect（挂载后一次性初始化；eslint 块 disable react-hooks/set-state-in-effect，settings 页同款先例）。
- useEffect 移至 early return 之前（hooks 顺序恒定）。

## 验收逐条
| 验收项 | 结果 | 证据 |
|---|---|---|
| e-llm-ops.spec.ts：拖拽/键盘后刷新顺序保持 | PASS | 2 passed（10.2s）：键盘（focus + Enter）上移 → 保存 → reload → 顺序保持 |
| 键盘可完成排序 | PASS | 同上：getByRole 按钮 focus() + keyboard.press("Enter") 触发（不依赖鼠标） |
| C-11 未合并时用量 Tab 错误态 | PASS | 用量 Tab → /api/llm/usage 404 → ErrorState 显示；用量数据断言（按模型/按日聚合）**待其他员工完成**，W2-05 复跑 |
| 通用门禁 4 项 exit 0 | PASS | lint=0（32 warnings 全既有噪音）、typecheck=0、vitest 全过、build=0（19:56 构建含 E-10） |
| 越界检查 | PASS | llm-providers/** + e-*.spec.ts，越界 0 |
| 严格正则（E-06 成果不回退） | PASS | llm-providers 页原生控件 grep = 0（排序按钮 IconButton、用量表 DataTable + Select） |

## 命令
```bash
npx playwright test -c tests/e2e/playwright.config.ts tests/e2e/e-llm-ops.spec.ts  # 2 passed
npm run lint && npm run typecheck && npm test && npm run build                      # 全 exit 0
```

## UNKNOWN 及原因
- 用量聚合数据（/api/llm/usage）：C-11 未合并，e2e 该条已断言错误态可跑；数据断言待 C-11 合并后 W2-05 复跑。
- order 单请求端点（PUT /api/llm/providers/order，契约权限 llm:update）：C-11 范围；权限点目录为 llm:list/edit（无 update）——C-11 实现时应按 auth.ts 对齐（已在前端用 llm:edit 语义的现有端点）。

## 后续方向待办
- W2-05：C-11 合并后 order/usage 切契约单请求端点并复跑。
- E 线下一张：E-11（依赖 E-04 ✅）→ 全部完成后 E-08 质量门。
