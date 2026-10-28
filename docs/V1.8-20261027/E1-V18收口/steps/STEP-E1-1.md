# STEP-E1-1：台账终态 + 全量门禁 + 收口

## 第 1 步：台账终态

```bash
cd /e/Code/Demo/HDwebsite/hdwebsite_1011
node -e "
const d=require('./docs/V1.8-20261027/state.json');
const ok=['done','blocked','deferred','n-a'];
const bad=Object.entries(d).filter(([k,v])=>!ok.includes(v.status));
console.log(bad.length ? '未终态: '+bad.map(x=>x[0]).join(',') : '16 阶段全终态');
for(const [k,v] of Object.entries(d)) console.log(' ', k.padEnd(4), v.status.padEnd(10), (v.commits||[]).length+' commits');
"
```

**要求**：
- 全部 `done`
- 或 `blocked` / `deferred` / `n-a` 且有 `blocked_reason`

## 第 2 步：全量门禁（唯一一次，必须串行）

```bash
npm run lint && npm run typecheck && npm test && npm run build
npm run check:assets && npm run check:root && npm run check:audit
node scripts/check-frozen.mjs
```

### 为什么必须串行

**② 实测凭据**：V1.3 记录 —— 并行跑 `build` 与 `test` 产 `Hook timed out in 10000ms`（2 文件假红）；单跑/串行全绿。

**③**：假红会把后续判断引向错误方向。

### 条件性门禁

| 门禁 | 何时跑 | 依据 |
|---|---|---|
| `npm run test:visual` | A5 跑过；若 A5 后 `git status src` 非空则重跑 | A5 是视觉变更点 |
| `npm run test:e2e` | 若 C2 改了响应头可能影响断言 | C2 触及 API 层 |

### win32 限制（必须诚实记录）

```bash
grep -n "isWindows" next.config.ts
# 3:const isWindows = process.platform === "win32";
# 7:  output: isWindows ? undefined : "standalone",
ls tests/visual/reference | wc -l    # 45 张，Linux 生成
```

→ `test:visual` / `test:e2e` 本机必失败或不可跑，记 `UNKNOWN(需 Linux CI)`，**不得声称通过**。

### BUILD_ID 新鲜度

```bash
stat -c '%y' .next/BUILD_ID
find src -type f \( -name "*.ts" -o -name "*.tsx" \) -printf '%TY-%Tm-%Td %TH:%TM\n' | sort -r | head -1
```
判：BUILD_ID 时间 > src 最新 mtime → `fresh`；否则 `stale`（e2e 结论作废）。

## 第 3 步：changelog V1.8 段

追加到 `docs/design/07_release/changelog.md` 顶部：

```markdown
## 2026-10-27（V1.8 全量剩余任务轮）

- **门禁变化**：无新增门禁步骤（按用户要求「不设门禁」，体检只记录不阻断）。
- **feat**：恢复 9 个首页区块组件的配置能力；新增 11 个配置键；
  `/manager/ai-config` 兼容重定向。
- **fix**：`localImageExists` 重复实现合入 `src/lib/image-exists.ts`；
  `parity-matrix` A1 判据由「组件存在」改为「能力等价」。
- **test**：五态 42 页（PASS {{X}} / FAIL {{Y}} / N-A {{Z}}）；
  键盘 42 页（PASS {{X}} / FAIL {{Y}} / N-A {{Z}}）；
  375px 42 页（PASS {{X}} / FAIL {{Y}} / N-A {{Z}}）；
  `mobile-375.spec.ts` 路由覆盖 3 → 42。
- **UNKNOWN**：Lighthouse 移动端（{{D1 结果}}）；部署演练（{{D2 结果}}）；
  真实微信 / SMTP / Coze 联调（凭证缺失）。
```

**{{X}}/{{Y}}/{{Z}} 必须是真实数字，不得抹平 FAIL。**

## 第 4 步：parity 复核

```bash
grep -E "present|replaced|partial|missing" docs/design/02_requirements/parity-matrix.md | head -6
```
记录四个数，与 V1.7 对比（预期 present 50 / replaced 7 / partial 0 / missing 0，无变化）。

## 第 5 步：推送

```bash
# 探代理
curl -s -o /dev/null -w "%{http_code}\n" --max-time 8 --proxy http://127.0.0.1:10808 https://github.com

git push origin upgrade
git fetch origin upgrade && git rev-list --left-right --count origin/upgrade...HEAD   # 期望 0 0
```

**凭据纪律**：token 不得写入命令参数、脚本、文件、日志或输出。

## 验收
- [ ] 16 阶段全终态
- [ ] 8 项门禁串行全 exit 0（附当次输出）
- [ ] changelog V1.8 段五类齐全，含真实 FAIL 数
- [ ] parity 四个数已记录
- [ ] 双端 `0 0`
- [ ] `git status --short src` 为空
- [ ] e2e/visual 若未跑，记 `UNKNOWN(需 Linux CI)`

## 常见坑

| 坑 | 防守 |
|---|---|
| 并行跑 build+test | 一律 `&&` 串行 |
| 把 blocked 改成 done 让台账好看 | 如实记录；收口价值是状态真实 |
| win32 结论冒充通过 | 记 UNKNOWN |
| changelog 抹平 FAIL | 如实写 |

## 自我质疑

**质疑：用户说「不设门禁」，为什么还跑全量？**
→ **跑 ≠ 门禁**。门禁是"不过就拦、阻断流程"；体检是"跑了记录下来"。用户要的是不当门禁用，不是不测。

**质疑：有 blocked 的阶段还能收口吗？**
→ 能。收口的价值是**状态真实**，不是状态好看。blocked 阶段在 changelog 的 UNKNOWN 段列明即可。
