# LCP-01 · LCP/CLS 测量口径裁定

## 归属

- 阶段编号：LCP-01
- 分组：遗留裁定
- 来源：V1.9 D1-FIX 的 PARTIAL 结论

## 目标

裁定 LCP 以哪个测量口径为准，使 PARTIAL 结论获得可复现的判定依据。**不改代码。**

## 为什么需要它（三级凭据）

### ① 来源
Web Vitals good 阈值：**LCP ≤ 2.5s**、**CLS ≤ 0.1**（针对真实用户）

### ② 实现
N/A —— 本卡不改代码

### ③ 验证（三口径实测）

| 口径 | LCP | CLS | 说明 |
|---|---:|---:|---|
| Lighthouse 模拟（Slow 4G + 375） | **3.1~3.3s** | 0.208 → **0** | 未达 good |
| 无节流 | 见 `after.md` | 0 | — |
| **真实浏览器（PerformanceObserver）** | **136ms** | **0** | 优秀 |

来源：`docs/design/06_validation/evidence/V19/D1-FIX/after.md:19-40`

## 关键矛盾（本卡要解决的）

### ① 差 24 倍

```
模拟 3.1~3.3s  vs  真实 136ms
```

**同一份构建、同一个页面，两个口径差 24 倍。**

### ② 模拟口径下 LCP 元素漂移

```
after.md:28  → 两轮 LCP 元素漂移：footer <p> ↔ logo <img>
after.md:28  → @13 复测 LCP 元素回到 logo <img>
```

**LCP 元素在两轮之间不稳定** —— 说明该指标在模拟环境下不具确定性。用它当门槛会产生随机 PASS/FAIL。

### ③ CLS 已解决

```
after.md:29 → CLS 0.208 单一 layout-shift，score=0.2078
节点 = <footer class="bg-[#da251d] text-white/80">
after.md:40 → 真实 CLS = 0（0 次 shift）
```

**CLS 已从 0.208 改进到 0**（模拟口径也归零）。**不再是遗留问题。**

## 输入

- 前置：无
- 已证实：三口径数值、LCP 元素漂移、CLS 已归零

## 输出

- `docs/design/06_validation/evidence/V20/LCP-01/verdict.md`：口径裁定书
- 更新 `docs/V2.0-20261029/05-风险与待裁决.md` 的 D-20-02 为已决

## 核心判据

```
PASS = verdict.md 明确「以哪个口径为准」
     ∧ 说明为何排除另一口径
     ∧ 给出该口径下的最终判定（PASS / PARTIAL / FAIL）
     ∧ src/** 零改动
```

## 已定裁定：方案 C（双口径并存，真实为准）

> 规划者已裁定（`05-风险与待裁决.md` §D-20-02）。执行者照此写 verdict.md，不需重新论证。

### 裁定内容

1. **判定口径：真实浏览器 PerformanceObserver**（LCP 136ms → **PASS**）
2. **模拟口径：仅作趋势记录，不作 PASS/FAIL 门槛**
3. **CLS：已达标**（真实 0；模拟 0.208 → 0），**关闭该遗留**

### 三条理由（须写入 verdict.md）

| # | 理由 |
|---|---|
| 1 | **Web Vitals 的定义就是真实用户指标**。Lighthouse 模拟是估算，用于 CI 缺真实流量时的替代，不是标准本身 |
| 2 | **本机测量不含网络**，Slow 4G 是人为注入（1.6Mbps/150ms RTT）。模拟值既不代表本地也不代表线上 |
| 3 | **模拟值不可复现**（LCP 元素漂移），拿它当门槛产生随机 PASS/FAIL |

### 保留模拟记录的理由

避免"以后没人知道曾经是 3.3s"。趋势可比对。

## 执行步骤

| 步 | 内容 |
|---|---|
| 1 | 复读 `evidence/V19/D1-FIX/{baseline,after,attribution}.md`，提取三口径数值 |
| 2 | 写 `verdict.md`，含：口径选择、三理由、两口径数值表、最终判定 |
| 3 | 明确写「本裁定不要求任何代码改动」及理由 |
| 4 | 更新 `05-风险与待裁决.md` 的 D-20-02 状态为已决 |

## verdict.md 必须回答的 5 个问题

1. **以哪个口径为准？** → 真实浏览器
2. **为什么排除模拟？** → 含人为注入、元素漂移、不可复现
3. **模拟值还有用吗？** → 有，作趋势记录
4. **CLS 是否已解决？** → 是，0.208 → 0
5. **是否需要改代码？** → 否，真实值已优；若真要优化，目标在 footer，属前台冻结面

## 允许修改

- `docs/design/06_validation/evidence/V20/LCP-01/**`（新建）
- `docs/V2.0-20261029/05-风险与待裁决.md`（D-20-02 状态）
- `docs/V2.0-20261029/state.json`（回填本卡）

## 禁止修改

- `src/**`（**本卡纯文档，禁止任何代码改动**）
- `tests/**`、`prisma/**`
- `tests/visual/reference/**`
- V1.9 的 D1-FIX 证据（历史只读）
- **不得为达模拟指标而改前台**（冻结面）

## 验证命令

```bash
cd "E:/Code/Demo/HDwebsite/hdwebsite_1011"

# 1) verdict 存在且回答 5 问
test -f docs/design/06_validation/evidence/V20/LCP-01/verdict.md && echo "PASS"
grep -cE "以.*为准|排除.*模拟|趋势|CLS.*0|不改代码" docs/design/06_validation/evidence/V20/LCP-01/verdict.md

# 2) src 零改动
test -z "$(git status --short src/)" && echo "PASS 未动代码"
```

## 依赖与阻塞

- Depends on：无
- 当前：**READY**

## 与 D1-FIX 的关系

D1-FIX 判 `done(PARTIAL)` 是**正确的**——它在执行时不知道哪个口径对。本卡补的是**判定依据**，不是推翻 D1-FIX 的工作。

LCP-01 完成后，D1-FIX 的实际结论应更新为：

```
CLS：PASS（0.208 → 0）
LCP：PASS（真实 136ms）
结论：达标（模拟口径 3.1~3.3s 仅作趋势记录）
```
