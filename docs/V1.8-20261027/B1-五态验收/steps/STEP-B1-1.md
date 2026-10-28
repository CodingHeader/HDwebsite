# STEP-B1-1：A 类五态批量核（27 页）

## 目标
27 个走 `CrudPage` 的页面，用一套判据批量核五态，产出 135 格。

## 为什么能批量

**① 代码位置**
```tsx
// src/components/manager/CrudPage.tsx
:333  if (isForbidden(error)) return <Forbidden message={error.message} />;
:370  <PageHeader title={spec.title} description={spec.description} actions={createBtn} />
// 文件头 :1-10 声明五态：骨架 / 空（带下一步）/ 错误 + 重试 / 无权限 / Toast
```

**② 实测**
```bash
find src/app/manager -name page.tsx | wc -l → 42
for f in $(find src/app/manager -name page.tsx); do grep -q CrudPage "$f" && echo x; done | wc -l → 27
```

**③ 落点**：27 页共用同一渲染器 → 五态行为一致 → 判据可复用

## 环境准备（必做，顺序不可错）

```bash
cd /e/Code/Demo/HDwebsite/hdwebsite_1011

# 1) 数据（dev.db 已删，用 e2e.db）
DATABASE_URL="file:./prisma/e2e.db" JWT_SECRET="e2e-jwt-secret-0123456789abcdef-0123456789abcdef" \
ENCRYPTION_KEY="e2e-encryption-key-0123456789abcdef-0123456789abcdef" npx tsx prisma/seed.ts
DATABASE_URL="file:./prisma/e2e.db" npx tsx prisma/seed-visual.ts

# 2) build（.next 需新于 src）
DATABASE_URL="file:./prisma/e2e.db" JWT_SECRET="..." ENCRYPTION_KEY="..." \
APP_ORIGIN="http://127.0.0.1:6791" npm run build

# 3) 起服务
DATABASE_URL="file:./prisma/e2e.db" JWT_SECRET="..." ENCRYPTION_KEY="..." \
APP_ORIGIN="http://127.0.0.1:6791" PORT=6791 HOSTNAME=127.0.0.1 NODE_ENV=production \
npx next start -p 6791
```

**账号**（只登录一次，`LOGIN_RATE_LIMIT = 10/60s`）：
- `admin` / `admin123`（seed 默认）
- `e2e-viewer` / `viewer123`（无权限态用）

## 分三批

### 批次 A1 · 标准列表页（有完整 CRUD）

每页 6 步：

| # | 态 | 动作 | 记什么 |
|---|---|---|---|
| 1 | 空 | 搜索框输 `zzz-no-match-zzz` | 是否出现"无结果 + 下一步动作" |
| 2 | 加载 | DevTools Slow 3G 刷新 | 是否有骨架屏 |
| 3 | 错误 | DevTools 拦 `/api/<resource>` → 500 | 是否有说明 + 重试 |
| 4 | 无权限 | `e2e-viewer` 登录点新建 | 是否 `Forbidden` |
| 5 | 成功 | admin 新建一条 | toast 文案是否具体 |
| 6 | 落表 | 写入 matrix.md | 每格写"做了什么 + 看到什么" |

### 批次 A2 · 只读页（5 页）

`logs`、`notify-records`、`publish-jobs`、`chat-history`、`collect-items`

- 1~4 同 A1
- 5 成功态记 `N-A(纯只读页，无写操作)` + 依据（`grep -c "新建\|编辑" <file>` → 0）

### 批次 A3 · 配置类（4 页）

`roles`、`navigations`、`settings`、`home-blocks`

- 同 A1，但**错误态要拦保存接口**而非列表接口

## 落表格式

```markdown
| 页面 | 空态 | 加载态 | 错误态 | 无权限 | 成功态 |
|---|---|---|---|---|---|
| articles | PASS：搜 zzz → "没有匹配结果"+新建按钮 | PASS：Slow3G → 3行骨架 | PASS：拦 /api/articles 500 → "加载失败"+重试 | PASS：viewer 点新建 → Forbidden | PASS：新建"t1"→"文章已创建" |
```

**反例（判 FAIL）**：`| articles | PASS | PASS | PASS | PASS | PASS |`（无判据）

## 验收
- [ ] 27 页 × 5 态 = 135 格有结论
- [ ] 每格判据 ≥10 字符
- [ ] 无"待核"
- [ ] 只读页成功态 N-A 有依据
- [ ] `git status --short src` 为空

## 常见坑

| 坑 | 防守 |
|---|---|
| 空库下"空态永远成立" | 必须 seed |
| 每页登录一次 → 第 11 页 429 | 只登录一次复用 token |
| 看到 EmptyState 组件就判 PASS | 必须运行时真触达（H4 坑） |
| 错误态用改代码实现 | 用 DevTools 拦截，不改代码 |
