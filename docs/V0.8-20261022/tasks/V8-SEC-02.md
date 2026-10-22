# V8-SEC-02：K10-A：sharp 0.34→0.35.5 + 运行时依赖其余 high 收口

## 归属
- 所属切片：S1
- 来源需求/证据：K10；用户转述 audit
- 执行者：P1

## 目标
运行时依赖（--omit=dev）high 清零或逐条登记不可修原因

## 输入
- 文档：docs/V0.8-20261022/00-事实基线.md、02-契约增量.md、04-连续执行协议.md
- 契约：src/contracts/**（只读，唯一源 zod）
- 前置任务：V8-SEC-01
- 前置状态：前置卡在 state.json 中为 done 且 verify=PASS（V8-V-01 除外）

## 输出
- package.json
- package-lock.json
- src/lib/storage/**
- docs/design/06_validation/evidence/V8/SEC-02/**

## Execution Steps
1. [ ] 前置同 V8-SEC-01（V8-Q1）
2. [ ] npm i sharp@0.35.5 --registry=https://registry.npmjs.org
3. [ ] 跑图片相关单测（upload/collect/media）并手测 1 张 PNG、1 张 JPEG 上传后 Content-Type 与缩略
4. [ ] 逐条处理 audit --omit=dev 剩余 high：可升则升（不跨 major 的直接升），跨 major 的登记到证据 residual.md

## 验收标准
- [ ] audit --omit=dev high=0 或 residual.md 逐条给出原因与上游 issue
- [ ] 上传 PNG 返回 image/png
- [ ] 门禁全绿

## 验证命令
```bash
npm audit --omit=dev --registry=https://registry.npmjs.org --json | node -e "const a=JSON.parse(require('fs').readFileSync(0));console.log(a.metadata.vulnerabilities)"; npm run lint && npm run typecheck && npm test && npm run build && npm run check:assets && npm run check:root
```

## 证据路径
docs/design/06_validation/evidence/V8/SEC-02/（execution.md + 命令原始输出；verify.md 由独立验证者写）

## 允许修改
- package.json
- package-lock.json
- src/lib/storage/**
- docs/design/06_validation/evidence/V8/SEC-02/**

## 禁止修改
- docs/V0.7-20261019/**（历史只读）
- 其他卡的允许修改路径

## 依赖与阻塞
- Depends on：V8-SEC-01
- Blocks：V8-SEC-03
- 阻塞条件：V8-Q1 未授权（遇阻塞：state.json 标 blocked + 原因，立即转下一张就绪卡，不等待）

## 建议执行档位
sonnect　理由：原子实现，规则已在本卡写明

## 升级条件
sharp 0.35 在 Linux/Windows 任一平台装不上；同卡连续 2 次验收 FAIL → 停止改代码，升一档并重写任务书（熔断）

## 预估规模
小　约 0.5 人天　≥ 2 小时
