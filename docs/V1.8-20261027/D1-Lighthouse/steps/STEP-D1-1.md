# STEP-D1-1：跑 Lighthouse 并记录

## 第 1 步：确认环境

```bash
cd /e/Code/Demo/HDwebsite/hdwebsite_1011
# 是否有 Chrome
ls "/c/Program Files/Google/Chrome/Application/chrome.exe" 2>/dev/null && echo "有 Chrome"
# 是否已有 lighthouse
npx lighthouse --version 2>&1 | head -2
```

## 第 2 步：起服务（若未起）

```bash
DATABASE_URL="file:./prisma/e2e.db" JWT_SECRET="e2e-jwt-secret-0123456789abcdef-0123456789abcdef" \
ENCRYPTION_KEY="e2e-encryption-key-0123456789abcdef-0123456789abcdef" \
APP_ORIGIN="http://127.0.0.1:6791" PORT=6791 HOSTNAME=127.0.0.1 NODE_ENV=production \
npx next start -p 6791
```

## 第 3 步：跑（路径 A，不装依赖）

```bash
mkdir -p evidence/V18/D1

# desktop
npx -y lighthouse@12 http://127.0.0.1:6791 \
  --only-categories=performance \
  --preset=desktop \
  --output=json --output-path=./evidence/V18/D1/lighthouse-desktop.json \
  --chrome-flags="--headless --no-sandbox" --quiet

# mobile（默认就是 mobile 视口）
npx -y lighthouse@12 http://127.0.0.1:6791 \
  --only-categories=performance \
  --output=json --output-path=./evidence/V18/D1/lighthouse-mobile.json \
  --chrome-flags="--headless --no-sandbox" --quiet
```

**若 npx 下载失败** → 记 `UNKNOWN(npx 无法下载 lighthouse)`，写明需要什么。

## 第 4 步：提取关键指标

```bash
node -e "
for (const v of ['mobile','desktop']) {
  const j = require('./evidence/V18/D1/lighthouse-' + v + '.json');
  console.log('=== ' + v + ' ===');
  console.log('Performance:', Math.round(j.categories.performance.score * 100));
  for (const k of ['first-contentful-paint','largest-contentful-paint','total-blocking-time','cumulative-layout-shift','speed-index']) {
    console.log(' ', k.padEnd(28), j.audits[k]?.displayValue ?? '-');
  }
}
"
```

## 第 5 步：判定

| 分数 | 判定 |
|---|---|
| ≥90 | PASS（优秀） |
| 50~89 | PASS（记录数值，列为改进点） |
| <50 | FAIL（需优化） |
| 无法测量 | UNKNOWN（写原因） |

## 验收
- [ ] `lighthouse-mobile.json` 与 `lighthouse-desktop.json` 存在
- [ ] execution.md 记录 mobile + desktop 两个分数
- [ ] 记录 5 项核心指标（FCP/LCP/TBT/CLS/SI）
- [ ] 判定 + 依据
- [ ] `git diff --exit-code package.json` exit 0

## 常见坑

| 坑 | 防守 |
|---|---|
| 为了跑改 package.json | 用 npx -y，不改依赖 |
| 只跑 mobile | REQ 只要求 mobile，但 desktop 也有参考价值，两个都跑 |
| 把本机分数当 Linux 分数 | 注明"本机 win32 测量，CI 复核待定" |
