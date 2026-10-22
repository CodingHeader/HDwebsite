# V8-SEC-04：CI 安全审计门禁（官方源，防镜像假阴性）

## 归属
- 所属切片：S1
- 来源需求/证据：用户转述：npmmirror audit 404 被解析为 0 漏洞
- 执行者：P3

## 目标
CI 中 audit 显式走官方源，404/网络错误判失败而非通过

## 输入
- 文档：docs/V0.8-20261022/00-事实基线.md、02-契约增量.md、04-连续执行协议.md
- 契约：src/contracts/**（只读，唯一源 zod）
- 前置任务：V8-G-01
- 前置状态：前置卡在 state.json 中为 done 且 verify=PASS（V8-V-01 除外）

## 输出
- .github/workflows/**
- scripts/audit-gate.mjs
- docs/design/06_validation/evidence/V8/SEC-04/**

## Execution Steps
1. [ ] 新增 scripts/audit-gate.mjs：执行 npm audit --json --registry=https://registry.npmjs.org；stderr 含 404/ENOTFOUND 或 json 无 metadata → exit 2；critical>0 → exit 1；high>0 只告警
2. [ ] CI 加一步运行它（V8-Q1 未授权时 critical 允许列表读 scripts/audit-allow.json，空表=严格）
3. [ ] 负向验证：用 --registry=https://registry.npmmirror.com 跑一次，必须 exit 2

## 验收标准
- [ ] 官方源运行输出 vulnerabilities 计数
- [ ] 镜像源运行 exit=2（证据日志）
- [ ] workflow yaml 语法通过（actionlint 或 CI 实跑）

## 验证命令
```bash
node scripts/audit-gate.mjs; echo exit=$?; NPM_CONFIG_REGISTRY=https://registry.npmmirror.com node scripts/audit-gate.mjs; echo mirror_exit=$?
```

## 证据路径
docs/design/06_validation/evidence/V8/SEC-04/（execution.md + 命令原始输出；verify.md 由独立验证者写）

## 允许修改
- .github/workflows/**
- scripts/audit-gate.mjs
- docs/design/06_validation/evidence/V8/SEC-04/**

## 禁止修改
- docs/V0.7-20261019/**（历史只读）
- 其他卡的允许修改路径

## 依赖与阻塞
- Depends on：V8-G-01
- Blocks：V8-VIS-02, V8-V-01
- 阻塞条件：无（遇阻塞：state.json 标 blocked + 原因，立即转下一张就绪卡，不等待）

## 建议执行档位
sonnect　理由：原子实现，规则已在本卡写明

## 升级条件
无；同卡连续 2 次验收 FAIL → 停止改代码，升一档并重写任务书（熔断）

## 预估规模
小　约 0.5 人天　≥ 2 小时
