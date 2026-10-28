# B3 · 375px 验收

## 归属
- 阶段编号：B3
- 所属分组：B 验收闭环（承接 V1.5/V1.6 `V15-MOBILE-375-01`）
- 来源凭据：`docs/V1.5-20261027/tasks/V15-MOBILE-375-01.md`、`V1.6-20261027/00 §F1`

## 目标
42 页 × M1~M4 = **168 格**，M1 必须是具体数值，其余附判据。

## 为什么需要它（三级凭据）

### ① 代码位置
```js
// 已有 375 专用 spec，但只覆盖 3 个路由
tests/e2e/mobile-375.spec.ts:57-63
test("375：整页无横向溢出（scrollWidth = 375）", async ({ page }) => {
  for (const path of ["/manager/articles", "/manager/content-hub", "/manager/enrollment-offerings"]) {
    const sw = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(sw, `${path} 横向溢出 scrollWidth=${sw}`).toBeLessThanOrEqual(375);
  }
});
```

### ② 实测证据
```bash
$ grep -c "/manager/" tests/e2e/mobile-375.spec.ts
4                    ← 只有 4 处引用（3 个路由 + 1 个其他）
$ grep "^test(" tests/e2e/mobile-375.spec.ts | wc -l
4                    ← 4 个用例
$ find src/app/manager -name page.tsx | wc -l
42                   ← 实际 42 页
```

**覆盖率 3/42 = 7.1%。**

### ③ 规划落点
- M1 的断言写法**可直接复用**（`:61-62`）
- 只需扩展路由清单，不必从零写脚本

## 输入
- 前置阶段：**A2**
- 前置状态：同 B1

## 输出
- 修改：`tests/e2e/mobile-375.spec.ts`（**唯一允许碰 tests 的阶段**）
- 新增：`evidence/V18/B3/matrix.md`（42 × 4 + 判据）
- 新增：`evidence/V18/B3/width-table.md`（42 个 scrollWidth 数值）
- 新增：`evidence/V18/B3/execution.md`

## 判据

| 项 | 动作 | PASS | FAIL |
|---|---|---|---|
| **M1** 无横向溢出 | 量 `documentElement.scrollWidth` | ≤ 375 | > 375（**记数值**） |
| **M2** 核心操作可达 | 列表：搜索+新建+行操作；表单：提交+取消 | 均可达且生效 | 任一项不可达 |
| **M3** 命中区 ≥44px | `getBoundingClientRect()` | ≥44×44 | <44（**记尺寸**） |
| **M4** 卡片模式 | 看列表是否切卡片 | 无表格横向滚动 | 表格横滚 |

**N-A**：纯只读页的 M2、表单页的 M4。

## 执行步骤

| 步骤 | 内容 |
|---|---|
| STEP-B3-1 | 扩展 `mobile-375.spec.ts` 路由清单 3 → 42 |
| STEP-B3-2 | 采集 42 个 `scrollWidth` 数值 |
| STEP-B3-3 | M2/M3/M4 人工逐页 |
| STEP-B3-Z | 体检 |

## 扩展 spec 的硬约束

**① 代码位置**：`tests/e2e/mobile-375.spec.ts:57-63`

**② 实测**：现有断言 `toBeLessThanOrEqual(375)`

**③ 铁律**：
- ✅ 允许：扩展路由数组
- ❌ 禁止：改 `toBeLessThanOrEqual(375)` 阈值
- ❌ 禁止：改成 `skip`
- ❌ 禁止：改 `viewports`

**为什么**：改阈值是最容易的"通过"手段，也是最没有价值的。375 是硬指标。

## 验收标准
- [ ] `mobile-375.spec.ts` 覆盖 42 路由（可自动化）
- [ ] `toBeLessThanOrEqual(375)` 未被改（可自动化：`git diff` 检查该行）
- [ ] `matrix.md` 42 行 × M1~M4，无空、无"待核"（可自动化）
- [ ] **M1 每格含具体数字**（可自动化：正则 `[0-9]{3}`）
- [ ] `width-table.md` 42 条数值，与 matrix 一致（可自动化：行数比对）
- [ ] 未改 `src/**`（可自动化）
- [ ] 计数自洽：PASS + FAIL + N-A = **168**（可自动化）

## 验证命令
```bash
cd /e/Code/Demo/HDwebsite/hdwebsite_1011
grep -c "^| src/app/manager" evidence/V18/B3/matrix.md     # 42
grep -c "待核" evidence/V18/B3/matrix.md                   # 0
grep -cE "\| *[0-9]{3} *\|" evidence/V18/B3/matrix.md      # ≥42
git diff tests/e2e/mobile-375.spec.ts | grep -E "^\+.*toBeLessThanOrEqual"   # 应为空
git status --short src                                     # 空
```

## 证据路径
`evidence/V18/B3/`

## 允许修改
- `tests/e2e/mobile-375.spec.ts`（**仅路由清单**）
- `evidence/V18/B3/**`
- `.cache/**`

## 禁止修改
- `toBeLessThanOrEqual(375)` 阈值
- `src/**`（尤其 layout、断点、globals.css）
- `playwright.config.ts`、`tests/e2e/playwright.config.ts`

## 依赖与阻塞
- Depends on：A2
- Blocks：E1
- 阻塞条件：若 seed 失败致数据不稳 → 标 `blocked`，**不得在空库下判定**（V1.4 事故：高度 3389 vs 6204）

## 建议执行档位
`opus`　理由：唯一要改测试文件的阶段 + 42 页人工判定

## 升级条件
若 >10 页 M1 FAIL（横向溢出）→ 升级上报，通常意味共享布局缺陷

## 预估规模
大（5~6h）

## 自我质疑

**质疑：既然已有 spec 覆盖 3 个路由，为什么不直接说"375 已验收"？**
→ 因为 3/42 = 7.1% 的覆盖率不能代表全站。
- ① 现有 spec 只覆盖 articles/content-hub/enrollment-offerings
- ② 这 3 个恰好是结构最典型的（列表/自定义/带表格）
- ③ 但其余 39 个可能有各自的布局问题（如 `settings` 的分组表单、`knowledge-bases` 的 Tabs）

**质疑：M1 用 playwright 跑还是手工量？**
→ 优先 playwright（可重复、可 CI）。本机 win32 若 playwright 不可用，退化为 DevTools 手工量，但**必须记录 42 个真实数值**，不能写"无溢出"。
