# STEP-4-终审推送打包

> 执行者：Hark / P3　前置：STEP-3-发布闭环与存储　分支：upgrade（单主线）

## 动作
1. P3：W2-04 性能复测（对比 before.json）
2. Hark：W2-05 全量回归 → W2-06 MUST 逐条终态 → W2-07 独立终审、推送 upgrade、打包

## 本步完成判据
MUST M-1~M-15 逐条结论；e2e + visual 46/46；audit 无 critical/high

## 验证命令
```bash
npm run lint && npm run typecheck && npm test && npm run build && npm run test:e2e && npm run test:visual
```

## 规则
- 每张卡开工前 `git pull --ff-only origin upgrade`；完工小提交 → 推送；推送被拒只 rebase，禁止 force。
- 推送凭据不得写入 remote URL/文件/日志；临时凭据文件 600 权限，用完删除。
- 同一卡 2 次验收失败即熔断。
