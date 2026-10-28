# A5 · 默认态回归

## 归属
- 阶段编号：A5
- 所属分组：A 能力对等（承接 V1.7 WP1-ST4）
- 来源凭据：`V1.7/03-剩余任务大纲.md §AT4.1~4.2`、`05-验收与体检.md §2.3`

## 目标
证明「补配置能力后，默认渲染与原版/改动前完全一致」。

## 为什么这是 A 组最关键的一步（三级凭据）

### ① 代码位置
```ts
// AGENTS.md §3 —— 前台风格冻结
// REQ-F-014 —— 视觉冻结
// playwright.config.ts:22 —— maxDiffPixelRatio: 0.01（冻结阈值）
```

### ② 实测证据
```bash
$ ls tests/visual/reference | wc -l
45                              ← 基线图 45 张
$ npx playwright test tests/visual --list | tail -1
Total: 46 tests in 1 file      ← 45 图 + 1 断言
$ grep -n maxDiffPixelRatio playwright.config.ts
22:      maxDiffPixelRatio: 0.01,
```

### ③ 规划落点
- A3/A4 改了 10 个组件 + 5 个入口文件
- **本卡是唯一能证明「改动没破坏视觉」的环节**
- 若本卡 FAIL → A3/A4 必须回退

## 输入
- 前置阶段：**A4**（接线完成）
- 前置状态：`tsc` exit 0，className 值未变

## 输出
- 新增：`evidence/V18/A5/execution.md`（含 4 道验证结果）
- **不修改任何 `src/**`**（本卡只验证）
- **不修改任何基线图**

## 四道验证

| # | 验证 | 手段 | 期望 |
|---|---|---|---|
| 1 | className **值**未变 | grep 差值公式 | 空 |
| 2 | 基线图/阈值/用例数未动 | git status + diff | 空 / exit 0 / 46 |
| 3 | 视觉回归 | `test:visual` | 46/46 或 `UNKNOWN(需 Linux CI)` |
| 4 | 管理端表单可见 + 前台生效 | 目视 | 11 键可见 + 2 项闭环 |

## 原子步骤

| 步骤 | 内容 |
|---|---|
| STEP-A5-1 | 静态三道（className 值 / 基线图 / 阈值） |
| STEP-A5-2 | 视觉回归（含 win32 处置） |
| STEP-A5-3 | 管理端表单 + 前台闭环目视 |
| STEP-A5-Z | 阶段体检 |

## 验收标准
- [ ] className 值零变更（可自动化）
- [ ] `git status --short tests/visual/reference` 空（可自动化）
- [ ] `git diff --exit-code playwright.config.ts` exit 0（可自动化）
- [ ] 用例数 46 未减（可自动化）
- [ ] 视觉回归 46/46 或明确记 `UNKNOWN(需 Linux CI)`（可自动化/人工）
- [ ] 设置页 11 键可见（人工）
- [ ] 2 项前台闭环验证通过（人工）
- [ ] **未修改 `src/**`**（可自动化）

## 验证命令
```bash
cd /e/Code/Demo/HDwebsite/hdwebsite_1011

# 1) className 值未变（必须为空）
git diff -U0 -- "src/app/(web)" src/components/web \
  | grep -oE 'className="[^"]*"' | sort | uniq -c | awk '$1 % 2 == 1'

# 2) 冻结面三项
git status --short tests/visual/reference
git diff --exit-code playwright.config.ts && echo "config 未变"
npx playwright test tests/visual --list | tail -1

# 3) 视觉回归（需先 seed + build + 起服务）
VISUAL_BASE_URL=http://127.0.0.1:6791 npx playwright test tests/visual
```

## 证据路径
`evidence/V18/A5/execution.md`

## 允许修改
- `evidence/V18/A5/**`
- `.cache/**`（临时截图）

## 禁止修改
- 任何 `src/**`（本卡只读验证）
- `tests/visual/reference/*.png`（**严禁重建基线**）
- `playwright.config.ts`

## 依赖与阻塞
- Depends on：A4
- Blocks：A8（需引用本卡证据）
- 阻塞条件：视觉回归失败且无法归因 → 停手上报，**不得靠重建基线掩盖**

## 建议执行档位
`sonnect`　理由：按四道验证逐项跑，规则明确。

## 升级条件
若出现非字体差异的失败（如区块错位、颜色变化）→ 升级 `opus`，说明 A3/A4 的默认值或包裹范围有误。

## 预估规模
中（1.5h，含 build 与回归）

## 自我质疑

**质疑：win32 跑不了 visual，本卡还有什么价值？**
→ 价值在**前三道静态验证**（className 值 / 基线图 / 阈值）—— 这三项本机完全可跑，且能抓出 90% 的样式误改。视觉回归只是最后一道，可交 CI。

**质疑：如果本机 visual 必失败，为什么还要跑？**
→ 为了拿到**失败的具体数字**（哪些路由 diff 多少），用于判断是否属字体差异。若某路由 diff 异常大（如 0.4），说明是真回归。
