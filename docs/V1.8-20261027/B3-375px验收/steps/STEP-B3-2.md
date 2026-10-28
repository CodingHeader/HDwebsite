# STEP-B3-2：M2/M3/M4 人工 + 体检

## M2 · 核心操作可达

| 页型 | 验什么 | PASS |
|---|---|---|
| 列表页 | 搜索 + 新建 + 行操作 | 三项都能点到且生效 |
| 表单页 | 提交 + 取消 | 两项都能点到 |
| 只读页 | — | `N-A(无写操作)` + 依据 |

## M3 · 命中区 ≥44px

### 批量测量脚本（DevTools console）

```js
[...document.querySelectorAll('button, a[href]')]
  .filter(el => el.offsetParent !== null)
  .map(el => {
    const r = el.getBoundingClientRect();
    return { text: el.textContent.trim().slice(0, 20), w: Math.round(r.width), h: Math.round(r.height) };
  })
  .filter(x => x.w < 44 || x.h < 44);
```

输出即所有小于 44px 的元素。

### 判定

| 结果 | 判据 |
|---|---|
| PASS | ≥44×44 |
| FAIL | <44（**记实测尺寸**） |
| 允许接近 | 42×42 可记 PASS 但须注明实测值 |

## M4 · 卡片模式

### 判据
- 列表页在 375 下应切卡片（`DataTable.tsx:8` 声明）
- PASS：无表格横向滚动，内容可读
- FAIL：表格横向滚动

### 验证

```js
document.querySelectorAll('table').length   // 有无可见 table
document.querySelectorAll('[aria-label]').length  // 卡片容器
```

---

## 体检

| # | 项 | 命令 | 期望 |
|---|---|---|---|
| 1 | matrix 42 行 | `grep -c "^| src/app/manager" matrix.md` | 42 |
| 2 | 无待核 | `grep -c "待核" matrix.md` | 0 |
| 3 | M1 含数字 | `grep -cE "\| *[0-9]{3} *\|" matrix.md` | ≥42 |
| 4 | width-table 42 条 | `grep -c "^| /manager" width-table.md` | 42 |
| 5 | 阈值未改 | `git diff tests/e2e/mobile-375.spec.ts \| grep -E "^\+.*toBeLessThanOrEqual"` | 空 |
| 6 | 计数自洽 | PASS+FAIL+N-A | 168 |
| 7 | 未改 src | `git status --short src` | 空 |

## 常见坑

| 坑 | 防守 |
|---|---|
| M3 用目测估尺寸 | 必须 `getBoundingClientRect()` |
| 表单页也要求 M4 卡片模式 | 表单本纵向，M4 只对列表页适用 |
| M2 只点一下不验生效 | 要验"点到且生效" |
| width-table 与 matrix 数值不一致 | 两处必须同源（从同一批采集结果来） |
