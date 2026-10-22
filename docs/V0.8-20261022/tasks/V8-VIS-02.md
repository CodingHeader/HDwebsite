# V8-VIS-02：Linux CI visual 作业（官方 playwright 镜像）

## 归属
- 所属切片：S3
- 来源需求/证据：W2-05/P5：visual 只在 Linux 有效
- 执行者：P3

## 目标
push 到 upgrade 时 CI 在 Linux 跑 test:visual，失败上传 diff 产物

## 输入
- 文档：docs/V0.8-20261022/00-事实基线.md、02-契约增量.md、04-连续执行协议.md
- 契约：src/contracts/**（只读，唯一源 zod）
- 前置任务：V8-VIS-01, V8-SEC-04
- 前置状态：前置卡在 state.json 中为 done 且 verify=PASS（V8-V-01 除外）

## 输出
- .github/workflows/**
- docs/design/06_validation/evidence/V8/VIS-02/**

## Execution Steps
1. [ ] 新增 job visual：container mcr.microsoft.com/playwright:<与 lock 中 @playwright/test 同版本>-jammy
2. [ ] 步骤：npm ci → prisma migrate deploy → npx tsx prisma/seed-visual.ts → build → start(:3000) → test:visual
3. [ ] 失败时 actions/upload-artifact 上传 test-results/
4. [ ] 该 job 先设 continue-on-error: true，V8-VIS-03 完成后改 false

## 验收标准
- [ ] CI 实跑一次有结果（PASS 或带产物的 FAIL）
- [ ] 产物可下载
- [ ] 主门禁 job 不受影响

## 验证命令
```bash
cat .github/workflows/*.yml | grep -n 'visual\|playwright'
```

## 证据路径
docs/design/06_validation/evidence/V8/VIS-02/（execution.md + 命令原始输出；verify.md 由独立验证者写）

## 允许修改
- .github/workflows/**
- docs/design/06_validation/evidence/V8/VIS-02/**

## 禁止修改
- docs/V0.7-20261019/**（历史只读）
- 其他卡的允许修改路径

## 依赖与阻塞
- Depends on：V8-VIS-01, V8-SEC-04
- Blocks：V8-VIS-03, V8-REL-01
- 阻塞条件：CI 权限不足 → 标 BLOCKED，登记给用户（遇阻塞：state.json 标 blocked + 原因，立即转下一张就绪卡，不等待）

## 建议执行档位
sonnect　理由：原子实现，规则已在本卡写明

## 升级条件
无；同卡连续 2 次验收 FAIL → 停止改代码，升一档并重写任务书（熔断）

## 预估规模
小　约 0.5 人天　≥ 2 小时
