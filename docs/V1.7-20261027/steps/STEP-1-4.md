# STEP-1-4：默认态回归验证（WP1-ST4）

## 目标
证明「补齐配置能力后，默认渲染与原版/改动前完全一致」。

## 卡
WP1-ST4（`sonnect`，约 1.5h）

## 为什么这是 WP1 最关键的一步
`REQ-F-014` 前台风格冻结。补 props 是**新增能力**，但只要默认值走偏，前台视觉就会变 —— 那就不是「恢复能力」，是「破坏冻结」。

## 四道验证

### 1. 静态：className 值零变更

```bash
cd /e/Code/Demo/HDwebsite/hdwebsite_1011
git diff -U0 -- "src/app/(web)" src/components/web \
  | grep -oE 'className="[^"]*"' | sort | uniq -c | awk '$1 % 2 == 1'
```

**期望：输出为空**（className 的值没变）。

> ⚠️ 不要用 `grep -c className` —— V1.4 已实证：加 `aria-hidden` 时整行被 `+`/`-` 复制会返回假阳性 2。

### 2. 静态：基线图与阈值未动

```bash
git status --short tests/visual/reference   # 期望空
git diff --exit-code playwright.config.ts   # 期望 exit 0
npx playwright test tests/visual --list | tail -1   # 期望 46 tests
```

### 3. 动态：视觉回归

```bash
# 需先 seed + build + 起服务
DATABASE_URL="file:./prisma/e2e.db" JWT_SECRET="e2e-jwt-secret-0123456789abcdef-0123456789abcdef" \
ENCRYPTION_KEY="e2e-encryption-key-0123456789abcdef-0123456789abcdef" npx tsx prisma/seed.ts
DATABASE_URL="file:./prisma/e2e.db" npx tsx prisma/seed-visual.ts

DATABASE_URL="file:./prisma/e2e.db" JWT_SECRET="e2e-jwt-secret-0123456789abcdef-0123456789abcdef" \
ENCRYPTION_KEY="e2e-encryption-key-0123456789abcdef-0123456789abcdef" \
APP_ORIGIN="http://127.0.0.1:6791" npm run build

# 起服务后
VISUAL_BASE_URL=http://127.0.0.1:6791 npx playwright test tests/visual
```

**结果处理**：
- 全绿 → PASS
- 失败 → **先查是不是自己改动导致**（对比 diff 图的路由/区块）
- **禁止**重建基线图掩盖

**win32 限制**：基线图在 Linux 生成，本机必然有字体差异。
→ 本机记 `UNKNOWN(需 Linux CI)`，**不得声称通过**。

### 4. 功能：管理端表单可见 + 前台生效

**管理端**：打开 `/manager/settings`
- [ ] `cards` 分组见 4 项（四宫格启停/背景色/背景图/对齐）
- [ ] `topbar` 见 1 项
- [ ] `stats` 见 1 项
- [ ] `banner` 见 3 项
- [ ] `contact` 见 `wechatQrCode`（渲染为上传控件，因 type=image）
- [ ] `display` 见 `showImageOverlays`

**前台生效**（抽 2 项验证闭环）：
- [ ] 改 `showImageOverlays` 为关闭 → `/campus` 遮罩消失
- [ ] 改 `fourCardsContainerAlign` 为 left → 首页四宫格左对齐

**改完必须还原**（`git status` 不应有 Setting 数据文件变更；若改的是 DB 需重置）。

## 完成判据

- [ ] className 值零变更（输出空）
- [ ] 基线图/阈值/用例数三项未动
- [ ] 视觉回归全绿 或 明确记 `UNKNOWN(需 Linux CI)`
- [ ] 11 个新键在管理端可见
- [ ] 2 项前台闭环验证通过
- [ ] 全量门禁串行通过（见下）

## 全量门禁（本轮唯一一次）

```bash
# 必须串行（V1.3 教训：并行 build+test → Hook timed out）
npm run lint && npm run typecheck && npm test && npm run build
npm run check:assets && npm run check:root && npm run check:audit
node scripts/check-frozen.mjs
```

记录 BUILD_ID 与 src 最新 mtime 关系（fresh/stale）。

## 常见坑

| 坑 | 防守 |
|---|---|
| 视觉失败就重建基线 | 明令禁止；先定位是否自己引入 |
| 本机 win32 记成 PASS | 必须 `UNKNOWN(需 Linux CI)` |
| 改了 DB 里的设置值没还原 | 用 seed 重建或记下原值 |
| 并行跑 build+test | 串行 |