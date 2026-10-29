# B3 · 375px 验收（43 页 × M1~M4 = 172 格）

## 归属

- 阶段编号：B3
- 分组：B 验收闭环
- 来源：`docs/V1.8-20261027/B3-375px验收/`（本轮修正基数后重发）

## 目标

43 个管理端页面 × M1~M4 = **172 格**，M1 必须是**具体数值**，其余附判据。

## ⚠️ 相对 V1.8 卡片的修正

| 项 | V1.8 卡 | 本轮 |
|---|---|---|
| 页数 | 42 | **43** |
| 格数 | 168 | **172** |
| 依据 | 卡内写「42 ← 实际 42 页」 | `find src/app/manager -name page.tsx \| wc -l` → **43** |

**V1.8 卡内那句「42 ← 实际 42 页」是错的**，它把估算当成了实测结果。本轮已用命令核实为 43。

## 输入

- 前置：**B2 done**（键盘验收先行，因为 B3 的 M2「核心操作可达」依赖 K2 已确认可聚焦/可触发）

## 输出

- `docs/design/06_validation/evidence/V19/B3/matrix.md`（43 行 × M1~M4）
- `docs/design/06_validation/evidence/V19/B3/defects.md`
- `docs/design/06_validation/evidence/V19/B3/execution.md`
- `tests/e2e/mobile-375.spec.ts` 扩展至 43 路由

## 判据

| 项 | 触达动作 | PASS | FAIL |
|---|---|---|---|
| **M1** 无横向溢出 | 量 `documentElement.scrollWidth` | ≤ 375（**记数值**） | > 375（**记数值**） |
| **M2** 核心操作可达 | 列表：搜索+新建+行操作；表单：提交+取消 | 均可达且生效 | 任一项不可达 |
| **M3** 命中区 ≥44px | `getBoundingClientRect()` | ≥44×44 | <44（**记尺寸**） |
| **M4** 卡片模式 | 看列表是否切卡片 | 无表格横向滚动 | 表格横滚 |

**N-A**：纯只读页的 M2、表单页的 M4。

## 关键约束

### ① M1 必须给具体数值，不能只写 PASS

```
PASS 写法：scrollWidth = 375（恰好等于阈值）
FAIL 写法：scrollWidth = 412（超 37px）
```

### ② 阈值不得改

```bash
# 必须为 0 命中（改动即 FAIL）
git diff tests/e2e/mobile-375.spec.ts | grep "toBeLessThanOrEqual(375)"
```

### ③ 扩展 spec 而非重写

`tests/e2e/mobile-375.spec.ts:57-63` 已有现成 `scrollWidth` 断言，当前只覆盖 3/43 路由。**扩展路由数组即可，不改断言写法。**

## 执行步骤

| 步 | 内容 |
|---|---|
| STEP-B3-1 | 扩展 `mobile-375.spec.ts` 路由至 43 个（数组扩展，断言不动） |
| STEP-B3-2 | 跑 `mobile-375`，收集 M1 数值 |
| STEP-B3-3 | M2/M3/M4 逐页记录 |

## 验收标准

- [ ] `mobile-375.spec.ts` 覆盖 43 路由（可自动化）
- [ ] `toBeLessThanOrEqual(375)` 未被改（可自动化：`git diff` 检查该行）
- [ ] `matrix.md` 43 行 × M1~M4，无空、无「待核」（可自动化）
- [ ] M1 每格为**具体数值**（可自动化：正则校验含数字）
- [ ] 计数自洽：PASS + FAIL + N-A = **172**
- [ ] `src/**` 未改（可自动化）

## 验证命令

```bash
cd "E:/Code/Demo/HDwebsite/hdwebsite_1011"
B3="docs/design/06_validation/evidence/V19/B3"
test "$(grep -c '^| src/app/manager' $B3/matrix.md)" -eq 43
test "$(grep -c '待核' $B3/matrix.md)" -eq 0
git diff tests/e2e/mobile-375.spec.ts | grep -q "toBeLessThanOrEqual(375)" && echo "FAIL 阈值被改" || echo "PASS 阈值未动"
node -e "
const c=require('./$B3/cells.json');
if(c.length!==172) throw new Error('格数 '+c.length+' ≠ 172');
const m1=c.filter(x=>x.item==='M1');
const bad=m1.filter(x=>!(/[0-9]/.test(String(x.observed?.scrollWidth))));
if(bad.length) throw new Error('M1 缺数值 '+bad.length+' 格');
console.log('M1 数值齐全', m1.length);
"
test -z "$(git status --short src prisma)" && echo PASS || git status --short src prisma
```

## 允许修改

- `tests/e2e/mobile-375.spec.ts`（**仅扩展路由数组**，不改断言）
- `docs/design/06_validation/evidence/V19/B3/**`
- `.cache/v19-b3/**`

## 禁止修改

- `src/**`、`prisma/**`
- `tests/e2e/mobile-375.spec.ts` 的 `toBeLessThanOrEqual(375)` 行
- `tests/e2e/` 其余文件
- 历史 V1.8 与 V18 证据
- 不得把 43 页写成 42 页

## 依赖与阻塞

- Depends on：B2
- 当前：**BLOCKED**

## 环境

复用 `tests/e2e/global-setup.ts`。视口固定 375×812。
