# STEP-S2-3：键盘共性验证（K3/K4）

## 目标
先用**一份结论**定性全站共性的两项（K3 Esc、K4 焦点可见），避免 42 页重复描述同一缺陷。

## 卡
`V15-KEYBOARD-01`（main-agent，`opus`）

## 对应大纲
`03-执行单元分解.md` → L1-2 → L2-2.1 → L3-2.1.1 / 2.1.2

## 为什么先做共性
K3 由 `Dialog` 组件决定，K4 由全局 CSS 决定。如果 Dialog 无 Esc，42 页会全 FAIL —— 那不是 42 个缺陷，是 1 个缺陷。

## K3 · Esc 关闭弹窗

### 第 1 步：静态确认（不能只看这一层就下结论）

```bash
cd /e/Code/Demo/HDwebsite/hdwebsite_1011
grep -nE "Escape|onKeyDown|key ===" src/components/manager/ui/dialog.tsx
grep -nE "Escape|onKeyDown|key ===" src/components/manager/FormDialog.tsx
grep -nE "Escape|onKeyDown|key ===" src/components/manager/feedback/ConfirmDialog.tsx
```

**已知**：`dialog.tsx` 98 行，grep 无命中（V1.6 规划时实测）。

### 第 2 步：全站 Escape 分布（判断是否有父级兜底）

```bash
grep -rn "Escape" src/components/manager src/app/manager --include=*.tsx
```

**已知命中 4 处**（均为局部控件，非 Dialog 本体）：
- `DataTable.tsx:366`（列菜单）
- `SearchInput.tsx:56`（清空搜索）
- `shell/UserMenu.tsx:32`（用户菜单）
- `ui/input.tsx:146`（清除输入）

### 第 3 步：运行时验证（**必须做，不可跳**）

1. 起服务（见 `STEP-S2-1` 环境准备）
2. 打开 `/manager/articles`
3. 点"新建"打开 FormDialog
4. 按 `Esc`
5. 记录：弹窗是否关闭？有无副作用（如数据丢失）？

**这一步的意义**：grep 只能证明"组件文件里没写 Esc"，不能证明"父级或全局监听没处理"。历史坑 H4 就是"把代码存在当功能可用"，反过来也不能"把 grep 没命中当功能不可用"。

### 第 4 步：写结论

`shared-components.md` 里记：

```markdown
## K3 · Esc 关闭弹窗

静态：dialog.tsx 无 Escape 处理；全站 4 处 Escape 均为局部控件
运行时：打开 articles 新建弹窗，按 Esc → {观察到什么}
结论：{42 页中哪些受影响}
影响面：{使用 Dialog/FormDialog 的页面数}
```

## K4 · 焦点可见

### 第 1 步：检查是否有 outline:none 无替代

```bash
grep -rn "outline-none\|outline: none" src/components/manager | head -20
```

### 第 2 步：抽查 5 类元素

| # | 元素 | 在哪验 |
|---|---|---|
| 1 | Button | `/manager/articles` 的"新建" |
| 2 | Input | 搜索框 |
| 3 | Select | 筛选下拉 |
| 4 | 链接 | 侧边栏菜单项 |
| 5 | 卡片操作 | 375 视口下的行操作按钮 |

逐个 Tab 到，看是否有可见 focus ring（截图留证）。

### 第 3 步：写结论

```markdown
## K4 · 焦点可见

outline:none 使用：{命中数与位置}
抽查 5 类：{逐项结果}
结论：{是否全站统一}
```

## 完成判据

- [ ] K3 有静态 + 运行时的双层证据（缺运行时则整卡 FAIL）
- [ ] K3 记录了"打开哪个弹窗、按 Esc 后看到什么"
- [ ] K4 有 5 类元素的抽查结果
- [ ] `shared-components.md` 写清"哪些页共用哪个容器"，供 S2-4 套用
- [ ] 未改 `src/**`

## 常见坑

| 坑 | 防守 |
|---|---|
| 只 grep 不运行时验 | 必须打开弹窗按一次 Esc |
| 把 42 页写成 42 条相同缺陷 | 共性缺陷写一次，matrix 里标"同 shared-components §K3" |
| 把 outline:none 直接判 FAIL | 要看是否用 box-shadow/ring 替代 |
