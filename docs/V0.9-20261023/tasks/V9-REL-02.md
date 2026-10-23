# V9-REL-02：终审、changelog、双端同步与打包（承接 V8-REL-02）

## 归属
- 所属切片：S4
- 来源需求/证据：用户指令"完成后双端一致；无法连接则 zip"；V8-REL-02 原卡
- 执行者：主代理

## 目标
upgrade 本地=远端（0 0），changelog 与 parity 矩阵更新，生成 V0.8+V0.9 交付包

## 输入
- 文档：04-连续执行协议.md（收尾条件）、V9-V-01 的 verify 汇总
- 代码：docs/design/07_release/changelog.md、docs/design/02_requirements/parity-matrix.md（现状）

## 输出
- docs/design/07_release/changelog.md（补 V0.8/V0.9 段）
- docs/design/02_requirements/parity-matrix.md（missing=0 复核记录）
- docs/V0.9-20261023/EXEC-round1.md（终稿）+ EXEC-log.md
- 本地 zip 交付包（gitignored 路径 + SHA256 记录入 evidence）

## Execution Steps
1. [ ] 汇总 verify 结论；FAIL 未清零则不得宣布完成（blocked 的必须全是外部条件）
2. [ ] changelog 补 V0.8（18 卡）与 V0.9（CI 修复 + 收尾）两段
3. [ ] parity-matrix 复核：逐项核对 missing=0，把复核记录写入矩阵或 evidence
4. [ ] `git pull --rebase` → 全量门禁 → push → `git fetch && git rev-list --left-right --count origin/upgrade...HEAD` = 0 0
5. [ ] 打 zip（docs/V0.8 + docs/V0.9 + docs/design/06_validation/evidence/V8 + /V9），存 gitignored 路径，SHA256 写入证据

## 验收标准
- [ ] 双端 0 0
- [ ] changelog 有 V0.8 与 V0.9 段
- [ ] parity 矩阵 missing=0 复核有记录
- [ ] zip 生成且 SHA256 入证据
- [ ] EXEC-round1.md 终稿完整（5W1H 简版、改动文件、验收逐条结果、UNKNOWN 及原因）

## 验证命令
```bash
git fetch && git rev-list --left-right --count origin/upgrade...HEAD
npm run lint && npm run typecheck && npm test && npm run build
```

## 证据路径
docs/design/06_validation/evidence/V9/REL-02/（execution.md + 命令原始输出；verify.md 由独立验证者写）

## 允许修改
- docs/design/07_release/changelog.md
- docs/design/02_requirements/parity-matrix.md
- docs/V0.9-20261023/EXEC-*.md
- docs/design/06_validation/evidence/V9/REL-02/**

## 禁止修改
- src/**、tests/**、workflows、prisma/**（冻结）
- docs/V0.7-20261019/**、docs/V0.8-20261022/**（历史只读）
- 其他卡的允许修改路径

## 依赖与阻塞
- Depends on：V9-VIS-03、V9-V-01
- Blocks：无（终卡）
- 阻塞条件：无

## 建议执行档位
中　理由：机械收尾，但双端一致是硬验收

## 升级条件
任何 FAIL 未返工即禁推；同卡连续 2 次验收 FAIL → 熔断

## 预估规模
小　约 0.5 人天
