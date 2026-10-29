# B2 · 键盘验收（43 页 × K1~K4 = 172 格）

## 归属

- 阶段编号：B2
- 分组：B 验收闭环
- 来源：`docs/V1.8-20261027/B2-键盘验收/`（本轮修正基数后重发）

## 目标

43 个管理端页面 × K1~K4 = **172 格**，每格判 `PASS` / `FAIL(现象)` / `N-A(依据)`，附具体按键与观察结果。

## ⚠️ 相对 V1.8 卡片的修正

| 项 | V1.8 卡 | 本轮 |
|---|---|---|
| 页数 | 42 | **43** |
| 格数 | 168 | **172** |
| 依据 | 未给命令 | `find src/app/manager -name page.tsx \| wc -l` → 43 |

第 43 页是 `/manager/ai-config`（`c0a9665` 引入）。V1.8 卡写就于 `5859ac0` 时它还不存在。

## 输入

- 前置：**FIX-01 / FIX-02 / FIX-03 全部 done**
- 理由：空态无可聚焦元素时 K1/K2 测不了；带 11 个已知缺陷验收会污染 FAIL 统计

## 输出

- `docs/design/06_validation/evidence/V19/B2/matrix.md`（43 行 × K1~K4）
- `docs/design/06_validation/evidence/V19/B2/defects.md`
- `docs/design/06_validation/evidence/V19/B2/execution.md`

## 判据（V1.7 §B1 最小集，**不得自行扩为完整集**）

| 项 | 触达动作 | PASS | FAIL |
|---|---|---|---|
| **K1** Tab 顺序 | 从首元素 Tab 到末元素 | 顺序符合视觉，无跳跃/回跳 | 有跳跃 |
| **K2** 主操作可聚焦 | Tab 到"新建/保存"，按 Enter | 焦点可见 + 触发成功 | 不可达 / 不触发 |
| **K3** Esc 关弹窗 | 打开弹窗按 Esc | 关闭无副作用 | 不关闭 |
| **K4** 焦点可见 | 逐个 Tab 观察 focus ring | 目视可见 | `outline:none` 无替代 |

## 执行步骤（先共性，后逐页）

| 步 | 内容 | 覆盖 | 依据 |
|---|---|---|---|
| STEP-B2-1 | K3 静态 + **运行时**验证 | 43 页（Dialog 共享组件，一次定性） | 一次定性覆盖面 |
| STEP-B2-2 | K4 抽查 5 类元素 | 全局 | 焦点样式是全局的 |
| STEP-B2-3 | K1/K2 逐页 | 43 页 | 依赖各页结构 |
| STEP-B2-Z | 体检 | — | 43 行无空 |

## 关键要求：K3 必须运行时验证

`dialog.tsx` 可能无 `onKeyDown Esc` 命中（grep 为 0），但可能有父级兜底（`@base-ui/react` 的 Dialog 自带）。

**必须实际打开一个弹窗按 Esc 并记录**：「打开哪个弹窗、按 Esc 后看到什么」。缺此项整卡 FAIL。

## N-A 合法条件

| 页 | N-A 范围 | 依据 |
|---|---|---|
| `ai-config` | K1~K4 全 | 纯 `redirect`，无 UI |
| `news` | K1~K4 全 | 纯 `redirect`，无 UI |
| `login` | K1 | 单表单页，无列表 Tab 序列语义 |

其余页面 K1~K4 全须实测。

## 验收标准

- [ ] `matrix.md` 43 行 × K1~K4，无空、无「待核」（可自动化）
- [ ] 每格判据 ≥10 字符（可自动化）
- [ ] **K3 有运行时验证记录**（人工，缺此项整卡 FAIL）
- [ ] 计数自洽：PASS + FAIL + N-A = **172**
- [ ] 未改 `src/**`（可自动化）
- [ ] `git status --short src tests prisma` 为空

## 验证命令

```bash
cd "E:/Code/Demo/HDwebsite/hdwebsite_1011"
B2="docs/design/06_validation/evidence/V19/B2"
test "$(grep -c '^| src/app/manager' $B2/matrix.md)" -eq 43
test "$(grep -c '待核' $B2/matrix.md)" -eq 0
node -e "
const c=require('./$B2/cells.json');
const n=c.reduce((a,x)=>(a[x.status]=(a[x.status]||0)+1,a),{});
console.log(n);
if(c.length!==172) throw new Error('格数 '+c.length+' ≠ 172');
"
test -z "$(git status --short src tests prisma)" && echo PASS || git status --short src tests prisma
```

## 允许修改

- `docs/design/06_validation/evidence/V19/B2/**`
- `.cache/v19-b2/**`（临时截图、脚本）

## 禁止修改

- `src/**`、`tests/**`、`prisma/**`
- `docs/V1.8-20261027/**`、`docs/design/06_validation/evidence/V1*/**`
- 不得为通过降判据
- 不得把 43 页写成 42 页

## 依赖与阻塞

- Depends on：FIX-01、FIX-02、FIX-03
- 当前：**BLOCKED**

## 环境

复用 `tests/e2e/global-setup.ts`（自动建 `e2e.db` + seed + 起 6791 + 写 `storageState`）。**登录 ≤2 次**（`LOGIN_RATE_LIMIT = 10/60s`）。
