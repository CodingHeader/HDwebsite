# A-01 执行记录：管理端基础件（第一批次）

分支 `lane/a-manager-ui`（自 w1-base-ccr-1 = f158501）。执行：本会话（Hark-A 角色）。

## 改动（全部在 allow 内，3 文件 + ADR + 测试）

- `src/components/manager/ui/input.tsx`：+`DateTimeInput`（datetime-local 原生美化）、+`RadioGroup`（原生 radio 组：受控 value、onValueChange、disabled 项、fieldset/legend 无障碍、方向键原生切换）
- `src/components/manager/ui/misc.tsx`：+`Skeleton`（纯样式脉冲加载占位，契约⑥加载态，aria-hidden）
- `src/components/manager/ui/index.ts`：导出三个新基础件
- `src/components/manager/ui/__tests__/components.test.tsx`（新，6 用例 jsdom）：Button 点击/disabled、Input 受控+aria-invalid、DateTimeInput type、RadioGroup 受控/disabled/键盘、Skeleton aria-hidden、barrel 导入完整性
- `docs/design/03_solution/decisions/ADR-033-管理端设计系统.md`（新）：manager/ui 新建理由（前台冻结+令牌隔离+演进自由）、base-ui 1.9.0 取代 REQ-C-001 Radix（P-7）、组件清单与状态

## 已有基础确认（P07 检查点成果，未动）

manager/ui 已含 Button/IconButton/LinkButton、Input/Textarea/Select/Checkbox/Switch/SearchField、Label/FormField、Dialog/Drawer、Badge/Card/Kbd/Separator/SectionTitle/Tabs/HelpCallout——A-01 目标清单 12/20 项已由 P07 覆盖。

## 验收结果

| 项 | 结果 |
|---|---|
| 组件测试 | 6/6 PASS（jsdom） |
| 前台 6 个 ui 文件零改动 | `git diff --stat w1-base-ccr-1 -- src/components/ui/…` 空 ✅ |
| visual | **45/46**：失败集 ⊆ {courses@375} ✅，差异 26989px = 基线值不增加 ✅（visual-a01.log） |
| 通用门禁 | lint 0 errors / typecheck / test / build 全 EXIT=0（gate-a01.log） |
| 越界检查 | 3 个改动文件均在 manager/ui（allow）✅ |

## 待后续批次（登记）

- base-ui 浮层件：Combobox、DropdownMenu、Tooltip、Popover、Sheet（dialog-primitive 已是 base-ui 口径，浮层件待实现）
- styles.ts 的 btnCls/inputCls 剩余引用替换（37 处，跨 A-06~A-08）
- 已有部件的补充测试（Button 键盘可达/aria 逐件覆盖）
