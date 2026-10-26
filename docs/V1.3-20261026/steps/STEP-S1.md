# STEP-S1：测试基础设施可信化

## 目标
让三类质量守卫（e2e / a11y / visual）的结论**可信**：不测旧构建、不漏跑、不误判。

## 卡
| 卡 | 执行者 | 档位 | 状态 |
|---|---|---|---|
| `V13-E2E-FRESH-01` | main-agent | 中 | ✅ done |
| `V13-SEEDVIS-01` | P2 | 低 | ready |
| `V13-VIS-01` | main-agent | 高 | ready |
| `V13-GATE-A11Y-01` | main-agent | 中 | ready |

## 执行顺序（串行约束）
```
E2E-FRESH-01 ✅
   → SEEDVIS-01（先，因与 VIS 同碰 seed-visual.ts）
   → VIS-01（后）
GATE-A11Y-01 可与上面并行（文件不相交：ci.yml + tests/a11y/**）
```

## 各卡要点

### V13-E2E-FRESH-01（已完成）
- 新鲜度校验前移到 `if (!useStandalone) return null` 之前，win32 也校验。
- 验证：tsc / lint / e2e 79/79。

### V13-SEEDVIS-01
1. `--check` 改按种子 id 区间统计（Article: 9201~9225）
2. 非种子行（如本地 9226）仅提示，不判失败
3. 负向用例：种子区间内删 1 行 → 仍须 exit 1

### V13-VIS-01
1. 取 CI artifact（403 则走方案 B：`workflow_dispatch` + `visual_update_ref=true` 重生成）
2. 45 图三分法：A 真回归 / B 数据漂移 / C 渲染噪声，逐张写依据
3. A → 修代码（**禁改 className**）；B/C → CI 重生成基线
4. 重跑 visual 至 PASS

### V13-GATE-A11Y-01
1. CI 追加 a11y 步骤（**不改 package.json**，写全命令）
2. 新增 `tests/a11y/web.spec.ts` 覆盖前台 5 页
3. 前台只允许改 aria/role/label；必须改样式的记 `fixme` + 原因
4. 本地 ≥17 例全绿

## 完成判据
- [ ] e2e 结论附 BUILD_ID 时间戳（守卫已强制）
- [ ] `seed-visual --check` 本地脏库 exit 0、种子区间缺行 exit 1
- [ ] visual CI `visual` job PASS，45 图逐张有判定
- [ ] a11y 进 CI 且非 `continue-on-error`，用例 ≥17 全绿
- [ ] `git diff --exit-code package.json` 通过

## 验证命令
```bash
npx tsx prisma/seed-visual.ts --check
npx playwright test -c tests/a11y/playwright.config.ts
npm run build && npm run test:e2e    # 串行
```

## 证据落点
`evidence/V13/{SEEDVIS-01,VIS-01,GATE-A11Y-01}/`
