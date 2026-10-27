# STEP-S2：人工验收（本轮主体）

## 目标
把 42 页 × 3 项 = **126 个"待核"格**变成有判据的结论。

## 卡（三卡并行）
- `V15-UX-STATES-01`（main-agent，`opus`）
- `V15-KEYBOARD-01`（main-agent，`opus`）
- `V15-MOBILE-375-01`（main-agent，`opus`）

## 为什么是这三项
`REQ-F-015 §5` 的可验收量化（`V1.4/06-验收体系.md §四`）8 条中：
- Q1 PageHeader → S1 已证（实为 0 缺失）
- Q2 原生控件 → 已证 FAIL=0
- Q3 原生反馈 → 已证 FAIL=0
- Q8 令牌作用域 → S1 已登记例外
- **Q4 五态 / Q5 键盘 / Q6 375px → 三项全"待核"，本轮补**
- Q7 axe → CI 已跑（17 例）

## 为什么三卡可并行（机械依据）

| 规则 | 满足 | 依据 |
|---|---|---|
| ① 无共享可变状态 | ✅ | 各写 `evidence/V15/<卡号>/**` |
| ② 契约已冻结 | ✅ | 五态契约见 `02 §⑥` |
| ③ 所有权不相交 | ✅ | 三个目录互不相交 |
| ④ 不共用迁移号 | ✅ | 0 迁移 |

## 为什么由 main-agent 做（不是自证）

| 角色 | 谁 | 说明 |
|---|---|---|
| 写代码 | 外部助手 | V1.4 的 `src/**` 由外部助手完成（`f9854f7`、`49aaf04` 等） |
| 写验收标准 | 规划阶段 | `06 §四` 已写定，执行时不得改 |
| 判定 | main-agent | **是独立方**（未参与那些代码的编写） |

残余风险：仍在同一会话内，无法完全排除先验偏见（`08 §L5` 已登记）。

## 判据速查

### 五态（UX-STATES）
| 态 | 触达方式 | PASS 证据 |
|---|---|---|
| 空 | 筛到 0 条 | 空态文案 + 下一步动作 |
| 加载 | Slow 3G 刷新 | 骨架屏 |
| 错误 | 阻断 API | 说明 + 重试按钮 |
| 无权限 | VIEWER 访问 EDITOR 功能 | `Forbidden` |
| 成功 | 完成写操作 | 具体 toast 文案 |

### 键盘（KEYBOARD，按 `07 §B1` 方案 A 最小集）
- K1 Tab 顺序合理
- K2 主操作可聚焦并 Enter 触发
- K3 Esc 关弹窗（**须运行时验，不许只凭 grep**）
- K4 焦点可见

### 375px（MOBILE-375）
- M1 `scrollWidth ≤ 375`（须给具体数值）
- M2 核心操作可达
- M3 命中区 ≥44px
- M4 卡片模式（非表格横滚）

## 环境准备（三卡共用，务必先做）

```bash
cd /e/Code/Demo/HDwebsite/hdwebsite_1011
# 1) seed 两份数据
DATABASE_URL="file:./prisma/e2e.db" JWT_SECRET="e2e-jwt-secret-0123456789abcdef-0123456789abcdef" \
ENCRYPTION_KEY="e2e-encryption-key-0123456789abcdef-0123456789abcdef" \
APP_ORIGIN="http://127.0.0.1:6791" npx tsx prisma/seed.ts
DATABASE_URL="file:./prisma/e2e.db" npx tsx prisma/seed-visual.ts

# 2) 构建（若 .next 旧于 src）
npm run build

# 3) 起服务
DATABASE_URL="file:./prisma/e2e.db" JWT_SECRET="e2e-jwt-secret-0123456789abcdef-0123456789abcdef" \
ENCRYPTION_KEY="e2e-encryption-key-0123456789abcdef-0123456789abcdef" \
APP_ORIGIN="http://127.0.0.1:6791" PORT=6791 HOSTNAME=127.0.0.1 NODE_ENV=production \
npx next start -p 6791
```

> **为什么必须 seed**：V1.4 实测事故 —— 空库时首页高度 3389px vs 基线 6204px。不 seed 会导致"卡片模式不出现""空态永远成立"等误判。

## 最高风险：验收被"凑通过"

126 格工作量大，最容易出现：
```
| pages | PASS | PASS | PASS |   ← 裸结论，无判据
```

**防守（已写进三卡验收标准）**：
- 每格判据 ≥10 字符
- 无判据的 PASS 视为 FAIL
- `matrix.md` 出现"待核"即整卡 FAIL

## 完成判据
- [ ] 3 份 `matrix.md` 各 42 行，无空单元格、无"待核"
- [ ] 每格含判据文本
- [ ] **未改任何 `src/**`**（`git status --short src` 为空）
- [ ] 各卡汇总 PASS/FAIL/N-A 计数
