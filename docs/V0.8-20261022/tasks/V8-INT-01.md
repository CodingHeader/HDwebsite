# V8-INT-01：微信/SMTP/Coze 凭证到位即测：冒烟脚本与操作手册

## 归属
- 所属切片：S6
- 来源需求/证据：D4 裁决：凭证不提供，真实联调 UNKNOWN
- 执行者：P1

## 目标
提供 3 个 dry-run 默认、--live 才出网的冒烟脚本，凭证到位后 10 分钟内可得结论

## 输入
- 文档：docs/V0.8-20261022/00-事实基线.md、02-契约增量.md、04-连续执行协议.md
- 契约：src/contracts/**（只读，唯一源 zod）
- 前置任务：V8-G-01
- 前置状态：前置卡在 state.json 中为 done 且 verify=PASS（V8-V-01 除外）

## 输出
- scripts/smoke/**
- docs/design/07_release/真实联调手册.md
- docs/design/06_validation/evidence/V8/INT-01/**

## Execution Steps
1. [ ] smoke/wechat.mjs：token→uploadimg→draft/add→freepublish（--live 前只打印请求）
2. [ ] smoke/smtp.mjs：连接+发 1 封到 SMOKE_TO
3. [ ] smoke/coze.mjs：建库→上传 1 个 .md→检索
4. [ ] 全部读 env，缺键时列出缺哪些后 exit 3，不抛栈
5. [ ] 手册写清所需 env、预期输出、失败对照表

## 验收标准
- [ ] 无凭证运行 3 个脚本均 exit 3 并列出缺失键
- [ ] dry-run 输出请求摘要且不出网（断网下也能跑）
- [ ] 脚本中无硬编码密钥（CI secret scan 通过）

## 验证命令
```bash
node scripts/smoke/wechat.mjs; node scripts/smoke/smtp.mjs; node scripts/smoke/coze.mjs; echo done
```

## 证据路径
docs/design/06_validation/evidence/V8/INT-01/（execution.md + 命令原始输出；verify.md 由独立验证者写）

## 允许修改
- scripts/smoke/**
- docs/design/07_release/真实联调手册.md
- docs/design/06_validation/evidence/V8/INT-01/**

## 禁止修改
- docs/V0.7-20261019/**（历史只读）
- 其他卡的允许修改路径

## 依赖与阻塞
- Depends on：V8-G-01
- Blocks：V8-V-01
- 阻塞条件：真实运行需凭证（V8-Q2），不阻塞本卡完成（遇阻塞：state.json 标 blocked + 原因，立即转下一张就绪卡，不等待）

## 建议执行档位
sonnect　理由：原子实现，规则已在本卡写明

## 升级条件
无；同卡连续 2 次验收 FAIL → 停止改代码，升一档并重写任务书（熔断）

## 预估规模
中　约 0.75 人天　≥ 2 小时
