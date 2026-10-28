# STEP-B3-1：M1 扩展 spec 采集 42 路由

## 目标
把 `mobile-375.spec.ts` 的路由覆盖从 3 → 42，采集 42 个 `scrollWidth` 数值。

## 现有实现（不要从零写）

**① 代码位置** `tests/e2e/mobile-375.spec.ts:55-64`
```js
test("375：整页无横向溢出（scrollWidth = 375）", async ({ page }) => {
  for (const path of ["/manager/articles", "/manager/content-hub", "/manager/enrollment-offerings"]) {
    await page.goto(path, { waitUntil: "load" });
    await page.waitForTimeout(500);
    const sw = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(sw, `${path} 横向溢出 scrollWidth=${sw}`).toBeLessThanOrEqual(375);
  }
});
```

**② 实测**
```bash
grep -c "/manager/" tests/e2e/mobile-375.spec.ts → 4（含 1 处其他）
find src/app/manager -name page.tsx | wc -l → 42
```
覆盖率 3/42 = 7.1%

**③ 落点**：只扩路由数组，不重写断言

## 执行步骤

### 1. 备份（防改坏）

```bash
cp tests/e2e/mobile-375.spec.ts /tmp/mobile-375.spec.ts.bak
```

### 2. 生成 42 条路由

```bash
cd /e/Code/Demo/HDwebsite/hdwebsite_1011
find src/app/manager -name page.tsx | sed 's|src/app||; s|/page.tsx||' | sort
```

`src/app/manager/page.tsx` → `/manager`（注意 sed 后为空串，需特判）

### 3. 替换路由数组

```js
const MANAGER_ROUTES = [
  "/manager",
  "/manager/articles",
  "/manager/banners",
  // ... 共 42 条
];
```

**保留原有 3 条**（在列表中即可，不必单独列出）。

### 4. **不得修改阈值**

```js
expect(sw, ...).toBeLessThanOrEqual(375);   // 这一行不许动
```

### 5. 运行采集

```bash
# 需先起服务（见 B1 环境准备）
npx playwright test tests/e2e/mobile-375.spec.ts --reporter=list
```

若本机 playwright 配置不可用，退化为临时脚本（放 `/tmp`，不入库）：

```js
const { chromium } = require('playwright');
const ROUTES = [...];  // 42 条
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 375, height: 812 } });
for (const r of ROUTES) {
  await p.goto('http://127.0.0.1:6791' + r, { waitUntil: 'load' });
  await p.waitForTimeout(500);
  const sw = await p.evaluate(() => document.documentElement.scrollWidth);
  console.log(r, sw);
}
```

### 6. 写 width-table.md

```markdown
| 页面 | scrollWidth | 判定 |
|---|---:|---|
| /manager | 375 | PASS |
| /manager/articles | 375 | PASS |
| /manager/xxx | 412 | FAIL |
```

## 验收
- [ ] spec 覆盖 42 路由
- [ ] `toBeLessThanOrEqual(375)` 未改（`git diff | grep "^\+.*toBeLessThanOrEqual"` 为空）
- [ ] `width-table.md` 42 条数值
- [ ] matrix 的 M1 列每格含数字

## 常见坑

| 坑 | 防守 |
|---|---|
| 为"全过"把阈值改 400 | 禁止；验收检查 diff |
| 只测 3 条就宣布完成 | 必须 42 条 |
| 空库下页面矮，溢出测不出 | 先 seed |
| 用 `document.body.scrollWidth` | 应用 `documentElement`（与原 spec 一致） |
