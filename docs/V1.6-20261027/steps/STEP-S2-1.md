# STEP-S2-1：A 类 27 页五态批量核

## 目标
27 个走 `CrudPage` 的页面，用**一套判据**批量核五态，产出 135 格结论。

## 卡
`V15-UX-STATES-01`（main-agent，`opus`）

## 对应大纲
`03-执行单元分解.md` → L1-1 → L2-1.1 → L3-1.1.1 / 1.1.2 / 1.1.3

## 为什么先做这一批
27 页共用 `CrudPage.tsx` 这一个渲染器，判据可复用。投入产出比最高：一次判据设计覆盖 64% 页面。

## 环境准备（必做，顺序不可错）

```bash
cd /e/Code/Demo/HDwebsite/hdwebsite_1011

# 1) 数据：dev.db 已删，用 e2e.db
DATABASE_URL="file:./prisma/e2e.db" JWT_SECRET="e2e-jwt-secret-0123456789abcdef-0123456789abcdef" \
ENCRYPTION_KEY="e2e-encryption-key-0123456789abcdef-0123456789abcdef" npx tsx prisma/seed.ts
DATABASE_URL="file:./prisma/e2e.db" npx tsx prisma/seed-visual.ts

# 2) 构建（.next 当前 15:34，需确认新于 src）
DATABASE_URL="file:./prisma/e2e.db" JWT_SECRET="e2e-jwt-secret-0123456789abcdef-0123456789abcdef" \
ENCRYPTION_KEY="e2e-encryption-key-0123456789abcdef-0123456789abcdef" \
APP_ORIGIN="http://127.0.0.1:6791" npm run build

# 3) 起服务
DATABASE_URL="file:./prisma/e2e.db" JWT_SECRET="e2e-jwt-secret-0123456789abcdef-0123456789abcdef" \
ENCRYPTION_KEY="e2e-encryption-key-0123456789abcdef-0123456789abcdef" \
APP_ORIGIN="http://127.0.0.1:6791" PORT=6791 HOSTNAME=127.0.0.1 NODE_ENV=production \
npx next start -p 6791
```

**账号**（只登录一次，`LOGIN_RATE_LIMIT = 10/60s`）：
- `admin` / `admin123`（seed 默认）
- `e2e-viewer` / `viewer123`（无权限态用）

## 27 页清单（动态获取，勿硬编码）

```bash
for f in $(find src/app/manager -name page.tsx); do
  grep -q "CrudPage" "$f" && echo "$f"
done
```

## 分三批推进

### 批次 A1 · 标准列表页
含新建/编辑/删除的常规 CRUD 页（`banners`、`categories`、`courses` 等）。

每页 6 步：
1. 空态：搜索框输 `zzz-no-match-zzz` → 看是否有"无结果 + 下一步动作"
2. 加载态：DevTools Slow 3G → 刷新 → 看骨架屏
3. 错误态：DevTools 拦截 `/api/<resource>` → 500 → 看错误说明 + 重试
4. 无权限：`e2e-viewer` 登录 → 点新建 → 看 `Forbidden`
5. 成功态：admin 新建一条 → 看 toast 文案是否具体
6. 落 matrix

### 批次 A2 · 只读页
`logs`、`notify-records`、`publish-jobs`、`chat-history`、`collect-items`

- 1~4 同 A1
- 5 成功态记 `N-A(纯只读页)` + 依据（无新建/编辑按钮）

### 批次 A3 · 配置类
`roles`、`navigations`、`settings`、`home-blocks`

- 同 A1，但错误态要拦截**保存**接口而非列表接口

## 完成判据

- [ ] 27 页 × 5 态 = 135 格全部有结论
- [ ] 每格含"做了什么 + 看到什么"，≥10 字符
- [ ] 无"待核"
- [ ] 只读页成功态 N-A 有依据
- [ ] `git status --short src` 为空

## 常见坑

| 坑 | 防守 |
|---|---|
| 空库下"空态永远是空" → 误判 | 必须先 seed |
| 每页登录一次 → 第 11 页撞 429 | 只登录一次，token 复用 |
| 看到 `EmptyState` 组件就判 PASS | 必须运行时真正触达（历史坑 H4） |
| 错误态用"改代码让它报错" | 用 DevTools 拦截，不改代码 |
