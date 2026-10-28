# D1 · Lighthouse 移动端

## 归属
- 阶段编号：D1
- 所属分组：D 环境受限
- 来源凭据：REQ-LEDGER UNKNOWN #9、`V1.4/06-验收体系.md`

## 目标
测量官网移动端 Performance 分数，关闭 `REQ-NF-001` 条目 1 的 `UNKNOWN`。

## 为什么它是 UNKNOWN（三级凭据）

### ① 代码位置
```bash
# 无 lighthouse 依赖
$ grep -n "lighthouse" package.json
（空）
```

### ② 实测证据
```bash
# CI 无该步骤
$ grep -n "lighthouse" .github/workflows/ci.yml
（空）

# REQ-LEDGER 明确记为 UNKNOWN
$ grep "Lighthouse" docs/design/06_validation/evidence/V14/REQ-LEDGER-01/requirements-ledger.md
| UNKNOWN | - | Lighthouse 移动端需 Linux CI+依赖变更（CCR） |
```

### ③ 规划落点
- `REQ-NF-001` 条目 1 的唯一未判定项
- `V1.7` 裁决 B3：保持 UNKNOWN 或走 CCR 装依赖

## 输入
- 前置阶段：**无**
- 前置状态：`package.json` 为冻结面（需 CCR）

## 输出
- 新增：`evidence/V18/D1/lighthouse.json`（原始报告）
- 新增：`evidence/V18/D1/execution.md`（分数 + 判定）

## 两条路径（选其一）

### 路径 A · 不装依赖，用 npx 临时跑（**优先**）

```bash
# 不写 package.json，用 npx 临时下载
npx -y lighthouse@12 http://127.0.0.1:6791 \
  --only-categories=performance \
  --preset=desktop \
  --output=json --output-path=./evidence/V18/D1/lighthouse.json \
  --chrome-flags="--headless --no-sandbox"
```

**优点**：不改 `package.json`，无需 CCR
**缺点**：需网络下载（约 30MB）；本机需有 Chrome

### 路径 B · 走 CCR 装依赖

仅当路径 A 失败时。需：
1. 写 CCR 申请
2. 批准后 `npm i -D lighthouse`
3. 加 CI 步骤

**不推荐**：为一个测量工具消耗 CCR 额度不划算。

## 关键：测什么

| 项 | 值 | 依据 |
|---|---|---|
| 目标 URL | `http://127.0.0.1:6791/`（首页） | 用户最常访问 |
| 预设 | desktop 与 mobile **都要** | REQ 只要求移动端，但 desktop 也有参考价值 |
| 类别 | performance（可加 accessibility/best-practices） | 只判 performance 即可 |

## 判定口径

| 分数 | 判定 | 依据 |
|---|---|---|
| ≥ 90 | PASS | 优秀 |
| 50~89 | PASS（记录数值） | 可接受，但记录为改进点 |
| < 50 | FAIL | 需优化 |
| 无法测量 | UNKNOWN | 写明原因（如无 Chrome / 下载失败） |

**注意**：**没有历史基线**。`V1.4/06-验收体系` 未记录 Performance 分数，故本卡测的是**首次基线**，不是"是否退化"。

## 验收标准
- [ ] 有 `lighthouse.json` 原始报告（可自动化）
- [ ] `execution.md` 记录 mobile 与 desktop 两个分数（人工）
- [ ] 写明判定（PASS/FAIL/UNKNOWN）与依据（人工）
- [ ] **未修改 `package.json`**（可自动化：`git diff --exit-code package.json`）
- [ ] 若 UNKNOWN，写明"需要什么环境"（人工）

## 验证命令
```bash
cd /e/Code/Demo/HDwebsite/hdwebsite_1011
git diff --exit-code package.json && echo "package.json 未变 ✓"
ls -la evidence/V18/D1/lighthouse.json
node -e "const j=require('./evidence/V18/D1/lighthouse.json');
console.log('Performance:', Math.round(j.categories.performance.score*100));
console.log('LCP:', j.audits['largest-contentful-paint'].displayValue);
console.log('TBT:', j.audits['total-blocking-time'].displayValue);"
```

## 证据路径
`evidence/V18/D1/`

## 允许修改
- `evidence/V18/D1/**`

## 禁止修改
- `package.json`（走路径 A 可避免）
- `src/**`、`next.config.ts`

## 依赖与阻塞
- Depends on：无
- Blocks：无
- 阻塞条件：若无 Chrome / npx 下载失败 → 记 `UNKNOWN(本机无 Chrome)`，**不阻塞其他阶段**

## 建议执行档位
`sonnect`　理由：跑一条命令 + 记录结果

## 升级条件
若测出 <50 → 升级 `opus`，需评估是否开优化阶段

## 预估规模
小（1h，含环境准备）

## 自我质疑

**质疑：只测首页够吗？**
→ 不够理想，但**首页是最有价值的单点**。若时间允许，可加 `/articles` 与 `/apply`。

**质疑：没有历史基线，测出来有什么用？**
→ 作用有二：
1. 把 `REQ-NF-001` 条目 1 从「UNKNOWN（无数据）」变成「PASS/FAIL（有数据）」
2. 建立首次基线，供后续对比

**质疑：本机 win32 测的结果可信吗？**
→ 部分可信。Lighthouse 的 TBT/LCP 在 win32 与 Linux 有差异，但**数量级一致**。若要求严格，可记「本机测量值」并注明「CI 复核待定」。
