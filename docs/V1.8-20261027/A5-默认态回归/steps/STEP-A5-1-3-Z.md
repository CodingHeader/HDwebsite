# STEP-A5-1~3 + A5-Z：四道验证与体检

## STEP-A5-1 · 静态三道

### 1) className 值未变

```bash
cd /e/Code/Demo/HDwebsite/hdwebsite_1011
git diff -U0 -- "src/app/(web)" src/components/web \
  | grep -oE 'className="[^"]*"' | sort | uniq -c | awk '$1 % 2 == 1'
```

**期望：输出为空。**

**为什么用这个公式**：
- ① V1.4 实测 `grep -c className` 返回 2（假阳性）
- ② 原因：加 `aria-hidden` 时整行被 `+`/`-` 复制，className 值本身未变
- ③ 只提取 `className="..."` 的**内容**，成对出现（+1/-1）的会被 `awk '$1%2==1'` 过滤掉，只剩真正变了的

### 2) 基线图状态

```bash
git status --short tests/visual/reference
```
**期望：空。** 有输出说明基线被改（可能是重建了），**必须回退**。

### 3) 阈值与用例数

```bash
git diff --exit-code playwright.config.ts && echo "config 未变"
npx playwright test tests/visual --list | tail -1   # 期望 Total: 46 tests
```

---

## STEP-A5-2 · 视觉回归

### 环境准备

```bash
# 1) 数据（dev.db 已删，用 e2e.db）
DATABASE_URL="file:./prisma/e2e.db" JWT_SECRET="e2e-jwt-secret-0123456789abcdef-0123456789abcdef" \
ENCRYPTION_KEY="e2e-encryption-key-0123456789abcdef-0123456789abcdef" npx tsx prisma/seed.ts
DATABASE_URL="file:./prisma/e2e.db" npx tsx prisma/seed-visual.ts

# 2) build
DATABASE_URL="file:./prisma/e2e.db" JWT_SECRET="e2e-jwt-secret-0123456789abcdef-0123456789abcdef" \
ENCRYPTION_KEY="e2e-encryption-key-0123456789abcdef-0123456789abcdef" \
APP_ORIGIN="http://127.0.0.1:6791" npm run build

# 3) 起服务
DATABASE_URL="file:./prisma/e2e.db" JWT_SECRET="e2e-jwt-secret-0123456789abcdef-0123456789abcdef" \
ENCRYPTION_KEY="e2e-encryption-key-0123456789abcdef-0123456789abcdef" \
APP_ORIGIN="http://127.0.0.1:6791" PORT=6791 HOSTNAME=127.0.0.1 NODE_ENV=production \
npx next start -p 6791
```

### 跑回归

```bash
VISUAL_BASE_URL=http://127.0.0.1:6791 npx playwright test tests/visual
```

### 结果三种处置

| 结果 | 处置 |
|---|---|
| 46/46 绿 | **PASS**。记录 run 与时间 |
| 部分失败，diff 小（<0.01 之外但 <0.02） | 判为 win32 字体差异 → 记 `UNKNOWN(需 Linux CI)`，记录每条的 diff 数值 |
| 部分失败，diff 大（>0.05） | **判为真回归** → 停手，回查 A3/A4 改了哪 |

**win32 限制的凭据**：
- ① `next.config.ts:7`：`output: isWindows ? undefined : "standalone"`
- ② 基线图 45 张在 Linux 生成
- ③ 故本机必有不一致，属环境差异

**严禁**：`npm run visual:reference` 重建基线。

---

## STEP-A5-3 · 管理端表单 + 前台闭环

### 管理端可见性

打开 `/manager/settings`，逐分组核对：

- [ ] `cards` 分组见 4 项：四宫格整体显示 / 背景色 / 背景图 / 内容对齐
- [ ] `topbar` 见 1 项：顶栏背景图
- [ ] `stats` 见 1 项：统计横幅背景图
- [ ] `banner` 见 3 项：显示第二按钮 / 第二按钮文字 / 第二按钮链接
- [ ] `contact` 见 `wechatQrCode`
- [ ] `display` 分组**出现**且含 1 项：显示图片遮罩

### 前台闭环（抽 2 项）

**闭环 1：`showImageOverlays`**
1. 管理端关闭 → 保存
2. 打开 `/campus`
3. 判：遮罩消失
4. **还原为开启**

**闭环 2：`fourCardsContainerAlign`**
1. 改成 `left` → 保存
2. 打开 `/`
3. 判：四宫格内容左对齐
4. **还原为 `center`**

---

## STEP-A5-Z · 阶段体检

| # | 项 | 结果 | 判据 |
|---|---|---|---|
| 1 | className 值未变 | 空/非空 | 非空即 FAIL |
| 2 | 基线图未动 | git status 空 | 有改动即 FAIL |
| 3 | 阈值未动 | exit 0 | 非 0 即 FAIL |
| 4 | 用例数 46 | 46 | 减少即 FAIL |
| 5 | 视觉回归 | 46/46 或 UNKNOWN | — |
| 6 | 11 键管理端可见 | 6/6 分组 | — |
| 7 | 2 项前台闭环 | 2/2 | — |
| 8 | 未改 src | git status src 空 | 本卡只读 |

### 自我质疑

**质疑：闭环验证改了 DB 里的设置值，会不会污染后续？**
→ 会。**必须还原**。若忘记还原，A8 与 B1~B3 会基于被改的数据做判断。

**处置**：闭环验证后跑 `git status` 确认无 Setting 数据文件变更；若有 DB 文件变更，用 seed 重建。

**质疑：本卡不改代码，为什么单列一个阶段？**
→ 因为它是**唯一能证明 A3/A4 没破坏视觉的环节**。若并入 A4，执行者可能跳过。

### 产出

`evidence/V18/A5/execution.md`：
```markdown
# A5 默认态回归

## 5W1H
...

## 四道验证
| # | 验证 | 结果 | 明细 |
|---|---|---|---|
| 1 | className 值 | PASS 空 | — |
| 2 | 基线/阈值/用例 | PASS | status 空, exit 0, 46 tests |
| 3 | 视觉回归 | UNKNOWN(需 Linux CI) | 本机 diff 见下表 |
| 4 | 表单+闭环 | PASS 6/6 + 2/2 | — |

## 本机 visual 失败明细（若 UNKNOWN）
| 路由 | diff ratio | 判定 |
|---|---|---|
| home@1440 | 0.008 | 字体差异，可忽略 |

## UNKNOWN
- test:visual 本机结论（需 Linux CI 复核）
```
