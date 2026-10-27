# STEP-S3：收口发布

## 目标
V1.5 终态 + changelog V1.5 段 + 全量门禁跑一次 + 双端 0 0。

## 卡
- `V15-CLOSE-01`（外部助手，`haiku`）

## 为什么最后
`state.json` 的 `verify` 字段要引用各卡证据路径，changelog 要汇总各卡结论。前置未完成则无内容可写。

## 本轮唯一一次全量门禁

用户指令：拒绝全量回归，只在全部完成后跑一次。**这是那一次。**

```bash
# 必须串行（V1.3 实测：并行 build+test → Hook timed out）
npm run lint && npm run typecheck && npm test && npm run build
npm run check:assets && npm run check:root && npm run check:audit
node scripts/check-frozen.mjs
```

**不跑 `test:visual`** 的理由：本轮零 `src/app/(web)`、`src/components/web`、`public`、`globals.css` 改动。若 `git status --short src` 非空 → 立即 FAIL 并补跑。

**`test:e2e` 条件性**：仅当某卡意外改过 `src/**` 才跑。预期不跑。

## changelog V1.5 段结构（五类）

```markdown
## 2026-10-27（V1.5 验收闭环轮）

- **门禁变化**：无（本轮不新增门禁；审计脚本判定修正，PageHeader 误报 29→0）
- **feat**：无（本轮 0 功能新增，0 契约 / 0 迁移 / 0 新依赖）
- **fix**：无业务代码修复；审计脚本 PageHeader 间接识别（CrudPage）
- **test**：五态 42 页（PASS x / FAIL y / N-A z）；键盘 42 页（…）；375px 42 页（…）
- **UNKNOWN**：真实微信 / SMTP / Coze 联调（凭证缺失）；Lighthouse（需 CCR）
```

**必须如实写 FAIL 数**，不得为了"好看"抹平。

## 关键动作：关闭 V1.4 的 2 条流程类 UNKNOWN

`evidence/V14/REQ-LEDGER-01/requirements-ledger.md` 中：
- "独立验证者抽查≥10 行未执行" → 由本轮 S2 执行，引用 `evidence/V15/**`
- "独立验证者逐页人工核对未执行" → 同上

**只改 `docs/V1.4-20261027/state.json` 的 note/verify 字段**，不改需求文档 checkbox（那是 REQ-LEDGER 卡的所有权）。

## 推送

```bash
# 先探代理（今日实测失效过一次）
curl -s -o /dev/null -w "%{http_code}" --max-time 8 --proxy http://127.0.0.1:10808 https://github.com

git -c credential.helper=store -c credential.store.helper=manager push origin upgrade < /dev/null
git fetch origin upgrade && git rev-list --left-right --count origin/upgrade...HEAD   # 期望 0 0
```

**凭据纪律**：不得把 token 写入命令参数、脚本、文件、日志或输出。

## 常见坑

| 坑 | 防守 |
|---|---|
| 并行跑 build+test 产假红 | 一律串行 |
| 本地 `dev.db` 被截断导致 build 失败 | V1.4 已踩：`migrate + seed` 后通过，非代码缺陷 |
| 推送时代理挂了 | 先 `curl` 探；失败退直连；再失败出 zip |
| changelog 抹平 FAIL 数 | 如实记录，FAIL 即 FAIL |

## 完成判据
- [ ] 7 卡全 `done`
- [ ] 8 项门禁串行全 exit 0（粘当次输出）
- [ ] changelog V1.5 段五类齐全，含真实 FAIL 数
- [ ] 双端 `0 0`
- [ ] `git status --short src` 为空
