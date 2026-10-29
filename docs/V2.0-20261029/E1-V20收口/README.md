# E1 · V2.0 收口

## 归属

- 阶段编号：E1
- 分组：收口
- 来源：V2.0 全量收口

## 目标

V2.0 5 卡终态确认 + 唯一一次全量门禁 + changelog + 双端同步。

## 输入

- 前置：**ADR-01、E2E-01、LCP-01、M3-01 全部 done**

## 输出

- `docs/V2.0-20261029/state.json` 全部 `done`
- `docs/V2.0-20261029/CHANGELOG.md`
- `docs/design/06_validation/evidence/V20/E1/execution.md`
- 双端 `origin/upgrade...HEAD = 0 0`

## 执行步骤

### 1 · 终态核对

```bash
cd "E:/Code/Demo/HDwebsite/hdwebsite_1011"
node -e "
const s=require('./docs/V2.0-20261029/state.json');
const bad=Object.entries(s).filter(([k,v])=>v.status!=='done');
if(bad.length){console.log('未完成:',bad.map(([k,v])=>k+'='+v.status));process.exit(1);}
console.log('全部 done:',Object.keys(s).length,'卡');
"
```

### 2 · 唯一一次全量门禁（**逐项记录，不用 `&&`**）

```bash
npm run lint        ; echo "lint exit=$?"
npm run typecheck   ; echo "typecheck exit=$?"
npm test -- --no-file-parallelism ; echo "test exit=$?"
npm run build       ; echo "build exit=$?"
npm run test:visual ; echo "visual exit=$?"
npm run test:e2e    ; echo "e2e exit=$?"
```

**判读口径**：即使整体返回非零，**只要 lint/typecheck/test/build 四项分别 exit 0 即算通过**。证据中须写清每条命令的独立结果。

### 3 · 冻结面复核

```bash
git diff 91ea5bb..HEAD --stat -- src/contracts/ prisma/ package.json vitest.config.ts playwright.config.ts
# 期望：空

git diff 91ea5bb..HEAD --stat -- 'src/app/(web)/**' 'src/components/web/**'
# 期望：空（本轮不应有前台改动；88e72d69 在基线之前）
```

### 4 · 验证 ADR-039 生效

```bash
test -f docs/design/03_solution/decisions/ADR-039-*.md && echo "PASS ADR-039 存在"
grep -cE "^## (背景|决策|影响|边界|不可外推|后续)" docs/design/03_solution/decisions/ADR-039-*.md
# 期望 6
```

### 5 · 验证 E2E 遗留归零

```bash
npx playwright test -c tests/e2e/playwright.config.ts hub-content
# 期望：全绿（原 2 FAIL 归零）
```

### 6 · 验证 M3 归零

```bash
node -e "
const v=require('./docs/design/06_validation/evidence/V20/M3-01/verify.json');
const f=(v.viewport375||[]).filter(x=>!x.pass);
console.log('375 未达标:',f.length);
const d=(v.viewport1440||[]).filter(x=>!x.unchanged);
console.log('1440 被改动:',d.length);
if(f.length||d.length)process.exit(1);
"
```

### 7 · changelog

写 `docs/V2.0-20261029/CHANGELOG.md`，含：
- 5 卡结果
- 4 项遗留的处置结论
- D-20-01 / D-20-02 的裁决结果
- UNKNOWN 项（含视觉基线 stale 是否仍在）
- 与 V1.9 的差异

### 8 · 双端同步

```bash
git rev-list --left-right --count origin/upgrade...HEAD   # 期望 0  0
```

## 核心判据

```
PASS = 5 卡 done
     ∧ lint/typecheck/test/build 四项分别 exit 0
     ∧ 冻结面无意外改动
     ∧ E2E 遗留归零 ∧ M3 遗留归零或已说明
     ∧ 双端 0 0
```

**「跑 ≠ 门禁」**：记录结果但不阻断。失败项须在 changelog 的 UNKNOWN 段写明原文与归因。

## 允许修改

- `docs/V2.0-20261029/state.json`
- `docs/V2.0-20261029/CHANGELOG.md`
- `docs/design/06_validation/evidence/V20/E1/**`

## 禁止修改

- `src/**`、`tests/**`、`prisma/**`（本卡只收口不改码）
- V1.8/V1.9 历史目录与其证据
- 不得为「全绿」而跳过或注释失败用例
- 不得本地重建视觉基线

## 验证命令

```bash
# 终态
node -e "const s=require('./docs/V2.0-20261029/state.json');if(Object.values(s).some(v=>v.status!=='done'))process.exit(1);console.log('done')"

# 全量（逐项）
npm run lint ; npm run typecheck ; npm test -- --no-file-parallelism ; npm run build

# 双端
test "$(git rev-list --left-right --count origin/upgrade...HEAD | tr -d ' \t')" = "00" && echo "PASS 双端一致"
```

## 依赖与阻塞

- Depends on：ADR-01、E2E-01、M3-01、LCP-01
- 当前：**BLOCKED**

## 回报格式

```
【终态】5/5 done
【全量】lint n / typecheck n / test n 通过 / build n ｜ 逐条 exit code
【visual】n PASS / n FAIL（归因）
【e2e】n PASS / n FAIL（hub-content 是否归零）
【M3】375 未达标 n / 1440 被改 n
【冻结面】contracts/prisma/package.json 改动：无/有
【ADR-039】存在 / 6 节齐全
【双端】0 0
【UNKNOWN】逐条
```
