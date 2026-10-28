# E1 · V1.8 收口

## 归属
- 阶段编号：E1
- 所属分组：E 收口
- 来源凭据：`V1.5/tasks/V15-CLOSE-01.md`

## 目标
16 阶段全部终态、补 changelog V1.8 段、跑**唯一一次全量门禁**、推送并校验双端 0 0。

## 为什么它是唯一跑全量的阶段（三级凭据）

### ① 代码位置
```bash
# 本轮 16 阶段中，只有 8 个碰 src/**
A1 contracts/setting.ts      A2 lib/settings-registry.ts
A3 components/web/*.tsx      A4 app/(web)/*.tsx
A6 manager/ai-config/        A7 lib/image-exists.ts
C1 lib/showcase-guard.ts     C2 (白名单路由)
# 其余 8 个只写 docs/evidence
B1 B2 B3 D1 D2 E1 + A5（只读验证）+ A8（纯文档）
```

### ② 实测证据
```bash
# 全量命令实测耗时（V1.4 BASE-01 记录）
lint + typecheck + test + build ≈ 6~8 分钟
e2e 单轮 ≈ 3 分钟
```

### ③ 规划落点
- 8 个"只写文档"的阶段跑全量 = 24 分钟纯等待，边际收益为零
- 故全量集中在 E1 跑一次

## 输入
- 前置阶段：**A1~A8、B1~B3、C1、C2、D1、D2 全部完成**（或明确 blocked/UNKNOWN）
- 前置状态：各阶段 evidence 已写

## 输出
- 修改：`docs/V1.8-20261027/state.json`（16 阶段终态）
- 修改：`docs/design/07_release/changelog.md`（V1.8 段）
- 修改：`docs/design/02_requirements/parity-matrix.md`（复核，预期无状态变化）
- 新增：`evidence/V18/E1/execution.md`

## 执行步骤

| 步骤 | 内容 |
|---|---|
| STEP-E1-1 | 台账终态（16 阶段状态核对） |
| STEP-E1-2 | 全量门禁（串行 8 项） |
| STEP-E1-3 | changelog + parity 复核 |
| STEP-E1-4 | 推送 + 双端校验 |
| STEP-E1-Z | 收口体检 |

## STEP-E1-1 · 台账终态

```bash
cd /e/Code/Demo/HDwebsite/hdwebsite_1011
node -e "
const d=require('./docs/V1.8-20261027/state.json');
const bad=Object.entries(d).filter(([k,v])=>!['done','blocked','deferred','n-a'].includes(v.status));
console.log(bad.length ? '未终态: '+bad.map(x=>x[0]).join(',') : '16 阶段全终态');
for(const [k,v] of Object.entries(d)) console.log(' ', k.padEnd(6), v.status);
"
```

**期望**：全部 `done`，或 `blocked`/`deferred`/`n-a` 且有 `blocked_reason`。

## STEP-E1-2 · 全量门禁（必须串行）

```bash
# 串行（V1.3 教训：并行 build+test → Hook timed out in 10000ms）
npm run lint && npm run typecheck && npm test && npm run build
npm run check:assets && npm run check:root && npm run check:audit
node scripts/check-frozen.mjs
```

**为什么必须串行**：
- ① V1.3 实测：并行 `build` 与 `test` 产 `Hook timed out in 10000ms`（2 文件）
- ② 单跑/串行全绿
- ③ 假红会把后续判断引向错误方向

### 条件性门禁

| 门禁 | 何时跑 | 依据 |
|---|---|---|
| `test:visual` | A5 已跑；若 A5 后 `git status src` 非空则重跑 | A5 是视觉变更点 |
| `test:e2e` | 若 C2 改了 API 头可能影响断言 | C2 触及响应头 |

### win32 限制

```bash
grep -n "isWindows" next.config.ts
3:const isWindows = process.platform === "win32";
7:  output: isWindows ? undefined : "standalone",
```

- `test:visual` 本机必失败（基线 Linux 生成）→ 记 `UNKNOWN(需 Linux CI)`
- `test:e2e` 本机不可跑 → 记 `UNKNOWN(需 Linux CI)`
- **不得声称通过**

### BUILD_ID 新鲜度

```bash
stat -c '%y' .next/BUILD_ID
find src -type f \( -name "*.ts" -o -name "*.tsx" \) -printf '%TY-%Tm-%Td %TH:%TM\n' | sort -r | head -1
```
判：BUILD_ID 时间 > src 最新 mtime → `fresh`；否则 `stale`（结论作废）。

## STEP-E1-3 · changelog + parity

### changelog V1.8 段（五类结构）

```markdown
## 2026-10-27（V1.8 全量剩余任务轮）

- **门禁变化**：无新增门禁步骤（按用户要求「不设门禁」，体检只记录不阻断）。
- **feat**：恢复 9 个首页区块组件的配置能力（showOverlay/showContent/bgImage 等），
  新增 11 个配置键（fourCards* / topbarBgImage / statsBgImage / banner*ExtraBtn* /
  wechatQrCode / showImageOverlays）；`/manager/ai-config` 兼容重定向。
- **fix**：`localImageExists` 两处重复实现合入 `src/lib/image-exists.ts`；
  `parity-matrix` A1 判据由「组件存在」改为「能力等价」。
- **test**：五态 42 页（PASS {{X}} / FAIL {{Y}} / N-A {{Z}}）；
  键盘 42 页（…）；375px 42 页（…）；
  `mobile-375.spec.ts` 路由覆盖 3 → 42。
- **UNKNOWN**：Lighthouse 移动端（{{D1 结果}}）；部署演练（{{D2 结果}}）；
  真实微信 / SMTP / Coze 联调（凭证缺失）。
```

**{{X}}/{{Y}}/{{Z}} 必须填真实数字，不得抹平 FAIL。**

### parity 复核

```bash
grep -E "present|replaced|partial|missing" docs/design/02_requirements/parity-matrix.md | head -6
```
记录四个数，与 V1.7 对比（预期：present 50 / replaced 7 / partial 0 / missing 0，无变化）。

## STEP-E1-4 · 推送

```bash
# 先探代理
curl -s -o /dev/null -w "%{http_code}\n" --max-time 8 --proxy http://127.0.0.1:10808 https://github.com

git push origin upgrade
git fetch origin upgrade && git rev-list --left-right --count origin/upgrade...HEAD   # 期望 0 0
```

**凭据纪律**：token 不得写入命令参数、脚本、文件、日志或输出。

## 验收标准
- [ ] 16 阶段全终态（可自动化）
- [ ] 8 项门禁串行全 exit 0（附当次输出）（可自动化）
- [ ] changelog V1.8 段五类齐全，含真实 FAIL 数（可自动化 grep）
- [ ] parity 四个数已记录（人工）
- [ ] 双端 `0 0`（可自动化）
- [ ] `git status --short src` 为空（可自动化）
- [ ] e2e/visual 若未跑，记 `UNKNOWN(需 Linux CI)`（人工）

## 验证命令
```bash
cd /e/Code/Demo/HDwebsite/hdwebsite_1011
node -e "const d=require('./docs/V1.8-20261027/state.json');
const bad=Object.entries(d).filter(([k,v])=>!['done','blocked','deferred','n-a'].includes(v.status));
console.log(bad.length?bad.map(x=>x[0]):'16阶段全终态')"
grep -n "V1.8" docs/design/07_release/changelog.md | head -3
git fetch origin upgrade && git rev-list --left-right --count origin/upgrade...HEAD
git status --short src
```

## 证据路径
`evidence/V18/E1/execution.md`

## 允许修改
- `docs/V1.8-20261027/state.json`
- `docs/design/07_release/changelog.md`
- `docs/design/02_requirements/parity-matrix.md`
- `evidence/V18/E1/**`

## 禁止修改
- `src/**`（收口不改代码）
- 需求文档正文（checkbox）
- 其他阶段目录的内容

## 依赖与阻塞
- Depends on：全部 15 个阶段
- Blocks：无（终点）
- 阻塞条件：若有阶段 `blocked` → 收口时保留其状态并写明原因，**不阻塞本卡**

## 建议执行档位
`haiku`　理由：台账 + changelog + 跑命令，无判断

## 升级条件
门禁失败且 30 分钟内无法定位 → 升级 `opus` 判断是否既有噪音

## 预估规模
小（1h，含门禁 ~8 分钟）

## 自我质疑

**质疑：用户说「不设门禁」，为什么 E1 还要跑全量？**
→ **跑 ≠ 门禁**。
- 门禁 = 不过就拦、阻断合并
- 体检 = 跑了记录下来

用户要的是「不当门禁用」，不是「不测」。全量跑一次并记录，是尽责；不因此阻断任何流程。

**质疑：16 阶段里有 blocked 的，还能收口吗？**
→ 能，但要如实记录。
- ① `blocked` 阶段在 changelog 的 UNKNOWN 段列明
- ② 不得为了让「全 done」好看而把 blocked 改成 done
- ③ 收口的价值是「状态真实」，不是「状态好看」
