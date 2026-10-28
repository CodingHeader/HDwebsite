# STEP-S2-5：M1 横向溢出（扩展既有 spec）

## 目标
42 页在 375 视口下的 `scrollWidth` 实测值，42 条数字结论。

## 卡
`V15-MOBILE-375-01`（main-agent，`opus`）

## 对应大纲
`03-执行单元分解.md` → L1-3 → L2-3.1 → L3-3.1.1 / 3.1.2

## 关键事实：不要从零写脚本

`tests/e2e/mobile-375.spec.ts:57-63` **已有现成实现**：

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

**只覆盖 3 条路径**，而实际 42 页。任务是**扩清单，不是重写**。

## 执行步骤

### 1. 备份现状（防止改坏无法回退）

```bash
cd /e/Code/Demo/HDwebsite/hdwebsite_1011
cp tests/e2e/mobile-375.spec.ts /tmp/mobile-375.spec.ts.bak
```

### 2. 扩展路由清单

把硬编码的 3 条改为动态生成：

```js
// 从 src/app/manager/**/page.tsx 生成路由
const MANAGER_ROUTES = [
  "/manager",
  "/manager/articles",
  // ... 共 42 条
];
```

**保留原有 3 条**（向后兼容）。生成方式：

```bash
find src/app/manager -name page.tsx | sed 's|src/app||; s|/page.tsx||' | sort
```

### 3. **不得修改阈值**

```js
expect(sw, ...).toBeLessThanOrEqual(375);   // 这一行不许改
```

### 4. 运行并采集数值

```bash
VISUAL_BASE_URL=http://127.0.0.1:6791 npx playwright test tests/e2e/mobile-375.spec.ts --reporter=list
```

若本机 playwright 配置不可用，改用直接测量脚本（同 `STEP-S2-1` 起服务后）：

```js
// 临时脚本放 /tmp，不入库
const { chromium } = require('playwright');
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 375, height: 812 } });
for (const route of ROUTES) {
  await p.goto('http://127.0.0.1:6791' + route);
  const sw = await p.evaluate(() => document.documentElement.scrollWidth);
  console.log(route, sw);
}
```

### 5. 写 width-table.md

```markdown
| 页面 | scrollWidth | 判定 |
|---|---:|---|
| /manager | 375 | PASS |
| /manager/articles | 375 | PASS |
| /manager/xxx | 412 | FAIL |
```

## 完成判据

- [ ] `mobile-375.spec.ts` 覆盖 42 路由
- [ ] `toBeLessThanOrEqual(375)` 未被改（`git diff` 检查）
- [ ] width-table.md 有 42 条数值
- [ ] matrix.md 的 M1 列每格含数字
- [ ] 未改 `src/**`

## 常见坑

| 坑 | 防守 |
|---|---|
| 为"全部通过"把阈值改成 400 | 禁止改阈值（验收会检查 diff） |
| 只测 3 条就宣布完成 | 必须 42 条 |
| 空库下页面矮，溢出测不出 | 先 seed |
| 用 `document.body.scrollWidth` | 应用 `documentElement`（与既有 spec 一致） |
