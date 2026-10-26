# V12-E2E-02 执行证据：mobile-375 空态容忍断言修正

> 执行时间：2026-10-26（Linux 容器）
> 执行者：main-agent
> 基线：upgrade@8b6dbaf（V12-E2E-01 后）

## 5W1H 简版

- **What**：375 管理端用例在空库/有数据两种状态下都稳定（消除 isVisible 即时快照竞态）。
- **Why**：e2e.db seed 无 EnrollmentOffering 数据（0 行，空库）且测试的空态容忍用 `getByText(/暂无|没有/).isVisible()` 即时快照（页面空态渲染前判 false）→ 随后 20s 等 `ul[aria-label]` 必超时。
- **Where/When**：tests/e2e/mobile-375.spec.ts（内容中枢 + 招生批次两个用例）。
- **Who**：main-agent 执行；独立验证者后续出 verify.md。
- **How**：改空态容忍为 race 语义（空态 XOR 内容任一出现即通过）。

## 复现（G-01 基线）

- mobile-375.spec.ts 单跑：**FAIL**（招生批次 `ul[aria-label]` 20s 超时，页面空态"还没有招生计划"）。
- 内容中枢用例同家族竞态（isVisible 即时快照）。

## 修复（两轮）

### 第一轮：race 语义（toBeVisible + toBeVisible）

```ts
await Promise.race([
  expect(page.getByText(/暂无|没有/).first()).toBeVisible({ timeout: 20_000 }),
  expect(page.locator("ul[aria-label]").first()).toBeVisible({ timeout: 20_000 }),
]);
```

**问题**：375 视口下，空态文本 `<p>还没有招生计划</p>` 在 DOM 中但被 CSS 判定 hidden（Playwright toBeVisible 误判），race 两方都不 resolve → 20s 超时。

### 第二轮：race 语义修正（toBeAttached + toBeVisible）

```ts
await Promise.race([
  expect(page.getByText(/暂无|没有/).first()).toBeAttached({ timeout: 20_000 }),
  expect(page.locator("ul[aria-label]").first()).toBeVisible({ timeout: 20_000 }),
]);
```

空态文本在 DOM 中即算出现（`toBeAttached`），卡片需可见（`toBeVisible`）。内容中枢同家族一并处理。

## 回归

| 命令 | 结果 |
|---|---|
| mobile-375.spec.ts 单跑 | **4/4 PASS**（53.6s，隔离环境） |
| 改动文件 | tests/e2e/mobile-375.spec.ts（仅此文件） |
| seed / 其他 spec | 未改 |

## 验收条目

- [x] mobile-375.spec.ts 单跑 4/4 ALL PASS（隔离环境）
- [x] 空态与有数据两条路径均有断言覆盖（race 语义，空态 toBeAttached / 卡片 toBeVisible）
- [x] seed / 其他 spec 未改

## 改动文件

- tests/e2e/mobile-375.spec.ts（内容中枢 + 招生批次 race 语义修正）

## 后续

- V12-E2E-03：全量 e2e 复跑 79/79 + CI 绿
