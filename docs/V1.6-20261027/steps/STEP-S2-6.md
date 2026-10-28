# STEP-S2-6：M2/M3/M4 人工逐页

## 目标
42 页 × 3 项 = 126 格结论（核心操作可达 / 命中区 / 卡片模式）。

## 卡
`V15-MOBILE-375-01`（main-agent，`opus`）

## 对应大纲
`03-执行单元分解.md` → L1-3 → L2-3.2 → L3-3.2.1 ~ 3.2.3

## 前置
`STEP-S2-5` 完成（M1 数值已采）。

## M2 · 核心操作可达

| 页型 | 验什么 | PASS |
|---|---|---|
| 列表页 | 搜索 + 新建 + 行操作 | 三项都能点到且生效 |
| 表单页 | 提交 + 取消 | 两项都能点到 |
| 只读页 | — | `N-A(无写操作)` + 依据 |

## M3 · 命中区 ≥44px

### 测量方法

```js
// DevTools console，选中元素后
const r = document.querySelector('selector').getBoundingClientRect();
console.log(r.width, r.height);
```

或批量：

```js
[...document.querySelectorAll('button, a[href]')]
  .filter(el => el.offsetParent !== null)
  .map(el => {
    const r = el.getBoundingClientRect();
    return { text: el.textContent.trim().slice(0, 20), w: Math.round(r.width), h: Math.round(r.height) };
  })
  .filter(x => x.w < 44 || x.h < 44);
```

### 判定

| 结果 | 判据 |
|---|---|
| PASS | ≥44×44 |
| FAIL | <44（记实测尺寸） |
| 允许接近 | 42×42 可记 PASS 但须注明实测值 |

## M4 · 卡片模式

### 判据

- 列表页在 375 下应切卡片（`DataTable.tsx:8`："行操作统一渲染为行内文字按钮（≥ md）/ 卡片底部按钮（< md）"）
- PASS：无表格横向滚动，内容可读
- FAIL：表格横向滚动

### 验证

```js
// 看是否有可见 table
document.querySelectorAll('table').length
// 看是否有卡片容器
document.querySelectorAll('[aria-label]').length
```

## 落 matrix

每格写具体内容：

```
M2: PASS：搜索"政策"有结果；新建打开弹窗；行操作"编辑"可用
M3: FAIL：行操作按钮实测 32×28，小于 44
M4: PASS：切卡片布局，无横向滚动
```

## 完成判据

- [ ] 42 页 × 3 项 = 126 格有结论
- [ ] M3 的 FAIL 格含实测尺寸
- [ ] 只读页 M2 记 N-A + 依据
- [ ] 无"待核"
- [ ] 未改 `src/**`

## 常见坑

| 坑 | 防守 |
|---|---|
| M3 用目测估尺寸 | 必须 `getBoundingClientRect()` |
| 把表单页也要求"M4 卡片模式" | 表单本纵向，M4 只对列表页适用 |
| M2 只点一下不验生效 | 要验"点到且生效" |
