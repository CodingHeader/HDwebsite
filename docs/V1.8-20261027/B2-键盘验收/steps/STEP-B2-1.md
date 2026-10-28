# STEP-B2-1：K3/K4 共性验证

## 目标
用一份结论定性全站共性两项（K3 Esc、K4 焦点可见），避免 42 页重复描述同一缺陷。

## 为什么先做共性

**① 代码位置**
```tsx
// K3 由 Dialog 组件决定
src/components/manager/ui/dialog.tsx（98 行）
// K4 由全局焦点样式决定
src/components/manager/ui/{button,input}.tsx
```

**② 实测**
```bash
grep -nE "Escape|onKeyDown" src/components/manager/ui/dialog.tsx → 空
grep -rcE "FocusTrap|focus-trap" src/components/manager src/app/manager → 全 0
```

**③ 推断**：若 Dialog 无 Esc，42 页会全 FAIL —— **那是 1 个缺陷，不是 42 个**。

---

## K3 · Esc 关闭弹窗

### 第 1 步：静态确认

```bash
cd /e/Code/Demo/HDwebsite/hdwebsite_1011
for f in ui/dialog.tsx FormDialog.tsx feedback/ConfirmDialog.tsx; do
  echo "=== $f ==="; grep -nE "Escape|onKeyDown|key ===" "src/components/manager/$f" || echo "无"; done
```

**已知**：`dialog.tsx` 98 行无命中。

### 第 2 步：全站 Escape 分布（判断是否有父级兜底）

```bash
grep -rn "Escape" src/components/manager src/app/manager --include=*.tsx
```

**已知命中 4 处**（均局部控件，非 Dialog 本体）：
- `DataTable.tsx:366`（列菜单）
- `SearchInput.tsx:56`（清空搜索）
- `shell/UserMenu.tsx:32`（用户菜单）
- `ui/input.tsx:146`（清除输入）

### 第 3 步：运行时验证（**必做，不可跳**）

1. 起服务（见 B1 环境准备）
2. 打开 `/manager/articles`
3. 点"新建"打开 FormDialog
4. 按 `Esc`
5. 记录：弹窗是否关闭？有无副作用？

**为什么必须运行**：grep 只能证明"组件文件没写 Esc"，不能证明"父级或全局监听没处理"。H4 坑的正反两面。

### 第 4 步：写结论

`shared-components.md`：
```markdown
## K3 · Esc 关闭弹窗
- 静态：dialog.tsx 无 Escape；全站 4 处 Escape 均局部控件
- 运行时：打开 articles 新建弹窗 → 按 Esc → {观察到什么}
- 结论：{42 页中哪些受影响}
- 影响面：{使用 Dialog/FormDialog 的页面数}
```

---

## K4 · 焦点可见

### 第 1 步：检查 outline:none

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
| 5 | 卡片操作 | 375 视口下行操作按钮 |

逐个 Tab 到，看是否有可见 focus ring（截图留证）。

### 第 3 步：写结论

```markdown
## K4 · 焦点可见
- outline:none 使用：{命中数与位置}
- 抽查 5 类：{逐项结果}
- 结论：{是否全站统一}
```

---

## 验收
- [ ] K3 有静态 + 运行时双层证据（缺运行时则整卡 FAIL）
- [ ] K3 记录了"打开哪个弹窗、按 Esc 后看到什么"
- [ ] K4 有 5 类元素抽查结果
- [ ] `shared-components.md` 写清"哪些页共用哪个容器"

## 常见坑

| 坑 | 防守 |
|---|---|
| 只 grep 不运行时验 | 必须打开弹窗按一次 Esc |
| 42 页写 42 条相同缺陷 | 共性写一次，matrix 里标"同 shared-components §K3" |
| outline:none 直接判 FAIL | 看是否用 box-shadow/ring 替代 |
