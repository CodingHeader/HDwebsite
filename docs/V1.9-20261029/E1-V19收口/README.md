# E1 · V1.9 收口

## 归属

- 阶段编号：E1
- 分组：收口
- 来源：V1.9 全量收口（取代 V1.8 的 E1，因其依赖未含新修复卡）

## 目标

V1.9 7 卡终态确认 + **唯一一次全量门禁** + changelog + 双端同步。

## ⚠️ 相对 V1.8 E1 的修正

| 项 | V1.8 E1 | 本轮 |
|---|---|---|
| 依赖 | A1~A8/B1~B3/C1/C2/D1/D2（15 项） | **FIX-01/02/03 + B2 + B3 + D1-FIX（6 项）** |
| 范围 | V1.8 16 阶段 | V1.9 7 卡 |

V1.8 的 E1 未包含 B1 暴露的修复卡，若沿用会漏验 FIX-01/02/03。故本轮重定义。

## 输入

- 前置：**FIX-01、FIX-02、FIX-03、B2、B3、D1-FIX 全部 done**
- 检查：各卡 `state.json` 状态与 commits 齐备

## 输出

- `docs/V1.9-20261029/state.json` 全部 `done`
- `docs/V1.9-20261029/CHANGELOG.md`（V1.9 段）
- `docs/design/06_validation/evidence/V19/E1/execution.md`
- 双端 `origin/upgrade...HEAD = 0 0`

## 执行步骤

### 1 · 终态核对

```bash
cd "E:/Code/Demo/HDwebsite/hdwebsite_1011"
node -e "
const s=require('./docs/V1.9-20261029/state.json');
const bad=Object.entries(s).filter(([k,v])=>v.status!=='done');
if(bad.length){console.log('未完成:',bad.map(([k,v])=>k+'='+v.status));process.exit(1);}
console.log('全部 done:',Object.keys(s).length,'卡');
"
```

### 2 · 唯一一次全量门禁（串行，不得并行）

```bash
npm run lint && npm run typecheck && npm test && npm run build
```

**⚠️ `npm test` 必须加串行参数**，否则多 worker 抢 SQLite 会假红：

```bash
npm test -- --no-file-parallelism
```

已知预先存在问题（V1.8 已记录），非本轮引入。

### 3 · 视觉门禁

```bash
npm run test:visual
```

win32 本地像素差异**不采信**（Linux 基线字体差异），记 UNKNOWN，靠 CI 判定。

### 4 · E2E

```bash
npm run test:e2e
```

### 5 · 契约与冻结面复核

```bash
git diff 90eb97d..HEAD --stat -- src/contracts/ prisma/ package.json vitest.config.ts
# 期望：仅可能出现 FIX-03 的 src/lib/**（非冻结面）
git diff 90eb97d..HEAD -- 'src/app/(web)/**' 'src/components/web/**' --stat
# 期望：D1-FIX 仅新增尺寸/加载属性，className 值零变更
```

### 6 · changelog

写 `docs/V1.9-20261029/CHANGELOG.md`，含：
- 7 卡结果（含 B2/B3 的 PASS/FAIL/N-A 计数）
- 11 FAIL 修复情况（修好几个、留几个）
- UNKNOWN 项
- 与 V1.8 的差异总结

### 7 · 双端同步

```bash
git log --oneline -1
git rev-list --left-right --count origin/upgrade...HEAD   # 期望 0  0
```

## 核心判据

```
PASS = 全部卡 done
     ∧ 全量 4 项（lint/typecheck/test/build）exit 0
     ∧ 契约与冻结面复核无意外改动
     ∧ 双端 0 0
```

**「跑 ≠ 门禁」**：记录结果但不阻断。若某项失败，**记录原文 + 归因**，不阻断收口，但必须在 changelog 的 UNKNOWN 段写明。

## 允许修改

- `docs/V1.9-20261029/state.json`
- `docs/V1.9-20261029/CHANGELOG.md`
- `docs/design/06_validation/evidence/V19/E1/**`

## 禁止修改

- `src/**`、`tests/**`、`prisma/**`（本卡只收口不改码）
- `docs/V1.8-20261027/**`、`docs/design/06_validation/evidence/V18/**`
- 不得为「全绿」而跳过或注释掉失败用例

## 验证命令

```bash
# 终态
node -e "const s=require('./docs/V1.9-20261029/state.json');if(Object.values(s).some(v=>v.status!=='done'))process.exit(1);console.log('done')"

# 全量（串行）
npm run lint && npm run typecheck && npm test -- --no-file-parallelism && npm run build

# 冻结面
git diff 90eb97d..HEAD --stat -- src/contracts/ prisma/ package.json vitest.config.ts playwright.config.ts

# 双端
test "$(git rev-list --left-right --count origin/upgrade...HEAD | tr -d ' \t')" = "00" && echo "PASS 双端一致"
```

## 依赖与阻塞

- Depends on：FIX-01、FIX-02、FIX-03、B2、B3、D1-FIX
- 当前：**BLOCKED**

## 回报格式

```
【终态】7/7 done
【全量】lint n / typecheck n / test n 通过 / build n ｜ 逐条 exit code
【视觉】PASS 或 UNKNOWN（原因）
【E2E】n/ n
【冻结面】contracts/prisma/package.json 改动：无 / 有（说明）
【双端】0 0
【UNKNOWN】逐条
```
