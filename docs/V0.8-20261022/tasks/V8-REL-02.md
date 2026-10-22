# V8-REL-02：终审、changelog、双端同步与打包

## 归属
- 所属切片：S7
- 来源需求/证据：用户指令：完成后双端一致；无法连接则 zip
- 执行者：Hark

## 目标
upgrade 本地=远端，changelog 与 parity 矩阵更新，生成 V0.8 交付包

## 输入
- 文档：docs/V0.8-20261022/00-事实基线.md、02-契约增量.md、04-连续执行协议.md
- 契约：src/contracts/**（只读，唯一源 zod）
- 前置任务：V8-V-01
- 前置状态：前置卡在 state.json 中为 done 且 verify=PASS（V8-V-01 除外）

## 输出
- docs/design/07_release/changelog.md
- docs/design/02_requirements/parity-matrix.md
- docs/V0.8-20261022/EXEC-*.md

## Execution Steps
1. [ ] 汇总 verify 结论；FAIL 未清零则不得宣布完成
2. [ ] git pull --rebase → 门禁 → push
3. [ ] git rev-list --left-right --count origin/upgrade...HEAD = 0 0
4. [ ] 打 zip（docs/V0.8 + evidence/V8）

## 验收标准
- [ ] 双端 0 0
- [ ] changelog 有 V0.8 段
- [ ] parity 矩阵 missing=0 复核

## 验证命令
```bash
git fetch && git rev-list --left-right --count origin/upgrade...HEAD
```

## 证据路径
docs/design/06_validation/evidence/V8/REL-02/（execution.md + 命令原始输出；verify.md 由独立验证者写）

## 允许修改
- docs/design/07_release/changelog.md
- docs/design/02_requirements/parity-matrix.md
- docs/V0.8-20261022/EXEC-*.md

## 禁止修改
- docs/V0.7-20261019/**（历史只读）
- src/**
- 其他卡的允许修改路径

## 依赖与阻塞
- Depends on：V8-V-01
- Blocks：无
- 阻塞条件：无（遇阻塞：state.json 标 blocked + 原因，立即转下一张就绪卡，不等待）

## 建议执行档位
opus　理由：安全/依赖/跨模块，决策不可逆

## 升级条件
任何 FAIL 未返工；同卡连续 2 次验收 FAIL → 停止改代码，升一档并重写任务书（熔断）

## 预估规模
小　约 0.5 人天　≥ 2 小时
