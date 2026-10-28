# STEP-S3-3：changelog + 推送

## 目标
补 changelog V1.5 段、parity 复核、推送并校验双端 0 0。

## 卡
`V15-CLOSE-01`（外部助手，`haiku`）

## 对应大纲
`03-执行单元分解.md` → L1-4 → L2-4.3

## changelog V1.5 段结构（五类）

追加到 `docs/design/07_release/changelog.md` 顶部（V1.4 段之上）：

```markdown
## 2026-10-27（V1.5 验收闭环轮）

- **门禁变化**：审计脚本 `PageHeader` 判定修正（29 误报 → 0 真值，保留负向检出）；
  无新增门禁步骤。
- **feat**：无（本轮 0 功能新增，0 契约 / 0 迁移 / 0 新依赖）。
- **fix**：无业务代码修复；`scripts/audit-manager-ui.mjs` 增加 `CrudPage` 间接识别。
- **test**：五态 42 页（PASS {{X}} / FAIL {{Y}} / N-A {{Z}}）；
  键盘 42 页（PASS {{X}} / FAIL {{Y}} / N-A {{Z}}）；
  375px 42 页（PASS {{X}} / FAIL {{Y}} / N-A {{Z}}）；
  `mobile-375.spec.ts` 路由覆盖 3 → 42。
- **UNKNOWN**：Lighthouse 移动端（需 Linux CI + 依赖变更需 CCR）；
  真实微信 / SMTP / Coze 联调（凭证缺失）；
  部署演练（NF-004）；首个真实采集源（F-002）。
```

**{{X}}/{{Y}}/{{Z}} 必须填真实数字**，不得抹平 FAIL。

## parity 复核对

1. 读 `docs/design/02_requirements/parity-matrix.md`
2. 记录四个数：present / replaced / partial / missing
3. 预期：与 V1.4 一致（50 / 7 / 0 / 0），因本轮不动功能
4. 把结论写进 evidence

## 推送

```bash
cd /e/Code/Demo/HDwebsite/hdwebsite_1011

# 1) 先探代理（今日实测失效过 1 次）
curl -s -o /dev/null -w "%{http_code}\n" --max-time 8 --proxy http://127.0.0.1:10808 https://github.com

# 2) 推送（凭据由 credential helper 提供，不写入任何文件/命令）
git push origin upgrade

# 3) 校验
git fetch origin upgrade
git rev-list --left-right --count origin/upgrade...HEAD   # 期望 0 0
```

**凭据纪律**：token 不得写入命令参数、脚本、文件、日志或输出。若用环境变量注入，用后清理。

## 完成判据

- [ ] changelog V1.5 段存在，五类齐全
- [ ] 三组 test 数字是真实值，非占位
- [ ] parity 四个数已记录，结论写明
- [ ] 双端 `0 0`
- [ ] `git status --short src` 为空
- [ ] evidence/V15/CLOSE-01/execution.md 已写

## 常见坑

| 坑 | 防守 |
|---|---|
| 抹平 FAIL 数 | 如实写，FAIL 即 FAIL |
| 忘改 changelog front matter `updated` | 一并改为收口日期 |
| 推送失败就放弃 | 探代理 → 退直连 → 再失败出 zip |
| 把 token 写进命令 | 只走 credential helper 或环境变量 |
